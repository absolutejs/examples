import { type SavedIntake } from "../shared/demo";
import { type SavedVoiceIntegrationEvent } from "./integrationsPage";
import { type SavedVoiceOpsTask } from "./opsPage";
import { type SavedVoiceReviewArtifact } from "./reviewPage";
import { buildSavedIntake, resolveScenarioFromContext } from "./voiceFlow";
import {
  createVoiceAuditEvent,
  createVoiceAuditSinkDeliveryRecord,
  createVoiceDeliverySinkPair,
  createVoiceFileAssistantMemoryStore,
  createVoiceFileRuntimeStorage,
  createVoiceProductionReadinessProofRuntime,
  createVoiceTraceSinkDeliveryRecord,
  renderVoiceSessionsHTML,
  type StoredVoiceHandoffDelivery,
  type StoredVoiceTraceEvent,
  type VoiceSessionListItem,
  type VoiceSessionRecord,
  type VoiceTraceEventStore,
  type VoiceTraceSinkDeliveryRecord,
  voice,
  voiceGuardrailPolicyPresets,
} from "@absolutejs/voice";
import { resolve } from "node:path";
import { createJsonHandoffDeliveryStore, escapeHtml } from "./helpers";

const savedIntakes: SavedIntake[] = [];

const runtimeDirectory = process.env.VOICE_DEMO_RUNTIME_DIR
  ? resolve(process.env.VOICE_DEMO_RUNTIME_DIR)
  : resolve(import.meta.dir, "..", "..", ".voice-runtime", "voice-demo");

const runtimeStorage = createVoiceFileRuntimeStorage<
  VoiceSessionRecord,
  SavedVoiceReviewArtifact,
  SavedVoiceOpsTask,
  SavedVoiceIntegrationEvent
>({
  directory: runtimeDirectory,
});

const supportedDeliverySinkKinds = [
  "file",
  "webhook",
  "s3",
  "postgres",
  "sqlite",
] as const;

type DemoDeliverySinkKind = (typeof supportedDeliverySinkKinds)[number];

const resolveDeliverySinkKind = (
  value: string | undefined,
): DemoDeliverySinkKind =>
  supportedDeliverySinkKinds.includes(value as DemoDeliverySinkKind)
    ? (value as DemoDeliverySinkKind)
    : "file";

const titleCaseSinkKind = (value: string) =>
  value
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const deliverySinkMode = process.env.VOICE_DELIVERY_SINK ?? "file";

const deliverySinkKind = resolveDeliverySinkKind(
  deliverySinkMode.toLowerCase(),
);

const parseS3DeliveryTarget = (value: string | undefined) => {
  const fallback = {
    bucket: "absolutejs-voice-demo-deliveries",
    keyPrefix: "voice-demo",
    target: "s3://absolutejs-voice-demo-deliveries/voice-demo",
  };
  if (!value?.trim()) {
    return fallback;
  }

  const cleaned = value
    .trim()
    .replace(/^s3:\/\//, "")
    .replace(/^\/+|\/+$/g, "");
  const [bucket, ...prefixParts] = cleaned.split("/");
  if (!bucket) {
    return fallback;
  }

  const keyPrefix = prefixParts.join("/") || "voice-demo";
  return {
    bucket,
    keyPrefix,
    target: `s3://${bucket}/${keyPrefix}`,
  };
};

const s3DeliveryTarget = parseS3DeliveryTarget(
  process.env.VOICE_DELIVERY_S3_BUCKET,
);

const deliverySinkTarget =
  deliverySinkKind === "webhook"
    ? (process.env.VOICE_DELIVERY_WEBHOOK_URL ??
      "https://example.test/voice-delivery")
    : deliverySinkKind === "s3"
      ? s3DeliveryTarget.target
      : deliverySinkKind === "postgres"
        ? "postgres://VOICE_DATABASE_URL/voice_delivery"
        : deliverySinkKind === "sqlite"
          ? "sqlite://voice-demo.sqlite/voice_delivery"
          : "file://.voice-runtime/voice-demo";

const auditDeliverySinkTarget = `${deliverySinkTarget}/audit-deliveries`;

const traceDeliverySinkTarget = `${deliverySinkTarget}/trace-deliveries`;

const deliverySinkLabel = titleCaseSinkKind(deliverySinkKind);

const auditDeliverySinkId = `demo-${deliverySinkKind}-audit-sink`;

const traceDeliverySinkId = `demo-${deliverySinkKind}-trace-sink`;

const deliverySinkDescriptors = createVoiceDeliverySinkPair({
  auditHref: "/audit/deliveries",
  auditId: auditDeliverySinkId,
  auditLabel: `${deliverySinkLabel} audit sink`,
  description: `Demo ${deliverySinkKind} delivery sink selected by VOICE_DELIVERY_SINK.`,
  kind: deliverySinkKind,
  mode: deliverySinkKind,
  target: deliverySinkTarget,
  traceHref: "/traces/deliveries",
  traceId: traceDeliverySinkId,
  traceLabel: `${deliverySinkLabel} trace sink`,
});

const traceDeliveryRecordId = (event: StoredVoiceTraceEvent) =>
  `trace-export:${encodeURIComponent(event.id)}`;

const createDeliveredTraceDeliveryRecord = (
  event: StoredVoiceTraceEvent,
): VoiceTraceSinkDeliveryRecord => {
  const deliveredAt = Date.now();

  return createVoiceTraceSinkDeliveryRecord({
    deliveredAt,
    deliveryAttempts: 1,
    deliveryStatus: "delivered",
    events: [event],
    id: traceDeliveryRecordId(event),
    sinkDeliveries: {
      [traceDeliverySinkId]: {
        attempts: 1,
        deliveredAt,
        deliveredTo: traceDeliverySinkTarget,
        eventCount: 1,
        status: "delivered",
      },
    },
    updatedAt: deliveredAt,
  });
};

const recordAuditDeliveryForTraceExport = async (
  event: StoredVoiceTraceEvent,
) => {
  const deliveredAt = Date.now();
  const auditEvent = await runtimeStorage.audit.append(
    createVoiceAuditEvent({
      action: "trace.export.delivered",
      actor: {
        id: "absolutejs-voice-demo",
        kind: "system",
        name: "AbsoluteJS Voice Demo",
      },
      at: deliveredAt,
      metadata: {
        source: "runtime-trace-export",
      },
      outcome: "success",
      payload: {
        traceEventId: event.id,
        traceEventType: event.type,
      },
      resource: {
        id: event.id,
        type: "voice.trace",
      },
      sessionId: event.sessionId,
      traceId: event.traceId ?? event.id,
      type: "operator.action",
    }),
  );

  await runtimeStorage.auditDeliveries.set(
    `audit-export:${encodeURIComponent(auditEvent.id)}`,
    createVoiceAuditSinkDeliveryRecord({
      deliveredAt,
      deliveryAttempts: 1,
      deliveryStatus: "delivered",
      events: [auditEvent],
      id: `audit-export:${encodeURIComponent(auditEvent.id)}`,
      sinkDeliveries: {
        [auditDeliverySinkId]: {
          attempts: 1,
          deliveredAt,
          deliveredTo: auditDeliverySinkTarget,
          eventCount: 1,
          status: "delivered",
        },
      },
      updatedAt: deliveredAt,
    }),
  );
};

const rawDeliveryTraceStore: VoiceTraceEventStore = {
  append: async (event) => {
    const stored = await runtimeStorage.traces.append(event);
    await runtimeStorage.traceDeliveries.set(
      traceDeliveryRecordId(stored),
      createDeliveredTraceDeliveryRecord(stored),
    );
    await recordAuditDeliveryForTraceExport(stored);

    return stored;
  },
  get: (id) => runtimeStorage.traces.get(id),
  list: (filter) => runtimeStorage.traces.list(filter),
  remove: async (id) => {
    await runtimeStorage.traces.remove(id);
    await runtimeStorage.traceDeliveries.remove(
      `trace-export:${encodeURIComponent(id)}`,
    );
  },
};

const productionReadinessProofRuntime =
  createVoiceProductionReadinessProofRuntime({
    cacheMs: 10_000,
    traceMaxAgeMs: 30 * 60 * 1000,
  });

const configuredProductionReadinessCacheMs = Number(
  process.env.VOICE_PRODUCTION_READINESS_CACHE_MS ??
    productionReadinessProofRuntime.options.cacheMs,
);

const productionReadinessCacheMs =
  Number.isFinite(configuredProductionReadinessCacheMs) &&
  configuredProductionReadinessCacheMs >= 0
    ? configuredProductionReadinessCacheMs
    : productionReadinessProofRuntime.options.cacheMs;

const productionReadinessTraceStore = productionReadinessProofRuntime.store;

const hiddenTraceTimelineSessionPattern =
  /^(latency-proof-|phone-|provider-sim-|quality-routing-proof$|stt-contract-|stt-sim-|tts-contract-|tts-sim-)/;

const demoGuardrailPolicies = [voiceGuardrailPolicyPresets.supportSafeDefaults];

const guardrailBlockedResult = (
  session: VoiceSessionRecord,
  context: unknown,
  reason: string,
): {
  assistantText: string;
  escalate: { metadata: Record<string, unknown>; reason: string };
  result: SavedIntake;
} => ({
  assistantText:
    "I cannot safely complete that in the automated flow. I am routing this to a human specialist.",
  escalate: {
    metadata: {
      guardrail: true,
    },
    reason,
  },
  result: buildSavedIntake(session, resolveScenarioFromContext(context)),
});

const demoIncidentSessionId = "demo-incident-bundle";

const voiceSupportArtifactRedaction = {
  keys: ["apiKey", "authorization", "secret", "token"],
  redactEmails: true,
  redactPhoneNumbers: true,
};

const renderVoiceSessionsWithSupportActions = (
  sessions: VoiceSessionListItem[],
) => {
  let html = renderVoiceSessionsHTML(sessions);

  for (const session of sessions) {
    const sessionId = encodeURIComponent(session.sessionId);
    const supportLinks = `<p class="voice-session-support-actions"><a href="${escapeHtml(session.replayHref)}">Open replay</a> · <a href="/voice-operations/${sessionId}">Open operations record</a> · <a href="/voice-incidents/${sessionId}/markdown">Export incident bundle</a></p>`;
    html = html.replace(
      `<p><a href="${session.replayHref}">Open replay</a></p>`,
      supportLinks,
    );
  }

  return html;
};

const base64FromBytes = (bytes: ArrayBuffer | Uint8Array) =>
  Buffer.from(
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
  ).toString("base64");

const handoffDeliveryStore = createJsonHandoffDeliveryStore<
  StoredVoiceHandoffDelivery<unknown, VoiceSessionRecord, SavedIntake>
>(resolve(runtimeDirectory, "handoff-deliveries.json"));

const memoryStore = createVoiceFileAssistantMemoryStore({
  directory: resolve(runtimeDirectory, "memories"),
});

export {
  auditDeliverySinkId,
  auditDeliverySinkTarget,
  base64FromBytes,
  configuredProductionReadinessCacheMs,
  createDeliveredTraceDeliveryRecord,
  deliverySinkDescriptors,
  deliverySinkKind,
  deliverySinkLabel,
  deliverySinkMode,
  deliverySinkTarget,
  demoGuardrailPolicies,
  demoIncidentSessionId,
  guardrailBlockedResult,
  handoffDeliveryStore,
  hiddenTraceTimelineSessionPattern,
  memoryStore,
  parseS3DeliveryTarget,
  productionReadinessCacheMs,
  productionReadinessProofRuntime,
  productionReadinessTraceStore,
  rawDeliveryTraceStore,
  recordAuditDeliveryForTraceExport,
  renderVoiceSessionsWithSupportActions,
  resolveDeliverySinkKind,
  runtimeDirectory,
  runtimeStorage,
  s3DeliveryTarget,
  savedIntakes,
  supportedDeliverySinkKinds,
  titleCaseSinkKind,
  traceDeliveryRecordId,
  traceDeliverySinkId,
  traceDeliverySinkTarget,
  voiceSupportArtifactRedaction,
};
export type { DemoDeliverySinkKind };
