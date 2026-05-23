import type { SavedIntake } from "../types/domain";
import { type SavedVoiceIntegrationEvent } from "./integrationsPage";
import { type SavedVoiceOpsTask } from "./opsPage";
import { type SavedVoiceReviewArtifact } from "./reviewPage";
import { buildSavedIntake, resolveScenarioFromContext } from "./voiceFlow";
import {
  createVoiceAuditEvent,
  createVoiceAuditSinkDeliveryRecord,
  createVoiceDeliverySinkPair,
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
import {
  createVoiceDrizzleAssistantMemoryStore,
  createVoiceDrizzleHandoffDeliveryStore,
  createVoiceDrizzleRecordStore,
  createVoiceDrizzleRuntimeStorage,
} from "@absolutejs/voice/drizzle";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { db } from "../../db/client";
import { savedIntakesTable } from "../../db/schema";
import { escapeHtml } from "./helpers";

const runtimeStorage = createVoiceDrizzleRuntimeStorage<
  VoiceSessionRecord,
  SavedVoiceReviewArtifact,
  SavedVoiceOpsTask,
  SavedVoiceIntegrationEvent
>({
  db,
});

// The voice runtime reads and writes the live session on the per-audio-frame hot
// path (~3 store round-trips every 20ms). Hitting Neon directly there runs the
// pipeline 10-20x slower than real time, which starves STT and delays turn commit
// by ~80s. Serve the hot path from memory and persist to Neon write-behind: reads
// are instant, writes are coalesced (~250ms), and terminal sessions evict from the
// cache once durable so it stays bounded.
type SessionStore = typeof runtimeStorage.session;

const createCachedVoiceSessionStore = (inner: SessionStore): SessionStore => {
  const cache = new Map<string, VoiceSessionRecord>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const persist = (id: string) => {
    timers.delete(id);
    const session = cache.get(id);
    if (!session) {
      return;
    }
    void inner.set(id, session).catch(() => {});
    if (session.status === "completed" || session.status === "failed") {
      cache.delete(id);
    }
  };

  const schedulePersist = (id: string) => {
    if (timers.has(id)) {
      return;
    }
    timers.set(id, setTimeout(() => persist(id), 250));
  };

  return {
    get: async (id) => cache.get(id) ?? (await inner.get(id)),
    getOrCreate: async (id) => {
      const cached = cache.get(id);
      if (cached) {
        return cached;
      }
      const session = (await inner.get(id)) ?? (await inner.getOrCreate(id));
      cache.set(id, session);
      return session;
    },
    list: () => inner.list(),
    remove: async (id) => {
      const timer = timers.get(id);
      if (timer) {
        clearTimeout(timer);
        timers.delete(id);
      }
      cache.delete(id);
      await inner.remove(id);
    },
    set: async (id, value) => {
      cache.set(id, value);
      schedulePersist(id);
    },
  };
};

const sessionStore = createCachedVoiceSessionStore(runtimeStorage.session);

// The demo's captured intakes ("saved captures" in the UI), persisted to Neon
// and keyed by session id so re-persisting a session replaces its capture.
const savedIntakesStore = createVoiceDrizzleRecordStore<SavedIntake>({
  db,
  table: savedIntakesTable,
  decorate: (_id, value) => value,
  getSortAt: (value) => value.completedAt,
});

// Downloadable proof artifacts (proof-pack exports, screenshots, export
// archives) are regenerable files, not durable state, so they live in the OS
// temp dir instead of the project tree. All durable state is in Neon.
const runtimeDirectory = process.env.VOICE_DEMO_RUNTIME_DIR
  ? resolve(process.env.VOICE_DEMO_RUNTIME_DIR)
  : resolve(tmpdir(), "absolutejs-voice-demo");
mkdirSync(runtimeDirectory, { recursive: true });

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
          : `file://${runtimeDirectory}`;

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

const handoffDeliveryStore = createVoiceDrizzleHandoffDeliveryStore<
  StoredVoiceHandoffDelivery<unknown, VoiceSessionRecord, SavedIntake>
>({ db });

const memoryStore = createVoiceDrizzleAssistantMemoryStore({ db });

export {
  auditDeliverySinkId,
  auditDeliverySinkTarget,
  base64FromBytes,
  deliverySinkDescriptors,
  deliverySinkKind,
  deliverySinkTarget,
  demoGuardrailPolicies,
  demoIncidentSessionId,
  guardrailBlockedResult,
  handoffDeliveryStore,
  hiddenTraceTimelineSessionPattern,
  memoryStore,
  productionReadinessCacheMs,
  productionReadinessProofRuntime,
  productionReadinessTraceStore,
  rawDeliveryTraceStore,
  renderVoiceSessionsWithSupportActions,
  runtimeDirectory,
  runtimeStorage,
  s3DeliveryTarget,
  savedIntakesStore,
  sessionStore,
  traceDeliverySinkId,
  traceDeliverySinkTarget,
  voiceSupportArtifactRedaction,
};
