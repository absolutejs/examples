import {
  buildVoiceRealCallProfileEvidenceFromReconnectProofReports,
  createVoiceAuditEvent,
  createVoiceAuditSinkDeliveryRecord,
  createVoiceDeliveryRuntime,
  createVoiceDeliveryRuntimePresetConfig,
  createVoiceProofPackBuildContext,
  createVoiceTraceEvent,
  createVoiceTraceSinkDeliveryRecord,
  renderVoiceBargeInHTML,
  renderVoiceReconnectContractHTML,
  runVoiceReconnectContract,
  summarizeVoiceAuditSinkDeliveries,
  summarizeVoiceBargeIn,
  summarizeVoiceReconnectContractSnapshots,
  summarizeVoiceTraceSinkDeliveries,
  type StoredVoiceTraceEvent,
  type VoiceSessionRecord,
  type VoiceTraceEvent,
  voice,
} from "@absolutejs/voice";
import { getDemoReconnectContractSnapshots } from "./carrierHandoff";
import { createDemoLeaseCoordinator, escapeHtml } from "./helpers";
import { deliveryTraceStore, webhookSigningSecret } from "./providers";
import { loadProofPackSloThresholdProfile } from "./readinessReports";
import { realCallProfileEvidenceStore } from "./realCallEvidence";
import {
  auditDeliverySinkId,
  auditDeliverySinkTarget,
  deliverySinkKind,
  deliverySinkTarget,
  runtimeStorage,
  s3DeliveryTarget,
  traceDeliverySinkId,
  traceDeliverySinkTarget,
} from "./stores";

type ProofCallDisposition = Exclude<
  NonNullable<VoiceSessionRecord["call"]>["disposition"],
  undefined
>;

const createProofSession = (input: {
  assistantText: string;
  disposition: ProofCallDisposition;
  reason?: string;
  scenarioId: string;
  sessionId: string;
  target?: string;
  turns: readonly string[];
}): VoiceSessionRecord => {
  const startedAt = Date.now() - 3_000;
  const turnRecords = input.turns.map((text, index) => {
    const committedAt = startedAt + 600 + index * 500;
    const transcript = {
      confidence: 0.98,
      endedAtMs: committedAt - 120,
      id: `${input.sessionId}:transcript:${index}`,
      isFinal: true,
      startedAtMs: committedAt - 320,
      text,
      vendor: "absolutejs-proof",
    };

    return {
      assistantText:
        index === input.turns.length - 1 ? input.assistantText : "Captured.",
      committedAt,
      id: `${input.sessionId}:turn:${index}`,
      text,
      transcripts: [transcript],
    };
  });
  const transcripts = turnRecords.flatMap((turn) => turn.transcripts);
  const lifecycleType =
    input.disposition === "transferred"
      ? "transfer"
      : input.disposition === "escalated"
        ? "escalation"
        : input.disposition === "voicemail"
          ? "voicemail"
          : input.disposition === "no-answer"
            ? "no-answer"
            : "end";
  const endedAt = startedAt + 600 + input.turns.length * 500;

  return {
    call: {
      disposition: input.disposition,
      endedAt,
      events: [
        {
          at: startedAt,
          type: "start",
        },
        {
          at: endedAt,
          disposition: input.disposition,
          reason: input.reason,
          target: input.target,
          type: lifecycleType,
        },
      ],
      lastEventAt: endedAt,
      startedAt,
    },
    committedTurnIds: turnRecords.map((turn) => turn.id),
    createdAt: startedAt,
    currentTurn: {
      finalText: "",
      partialText: "",
      transcripts: [],
    },
    id: input.sessionId,
    lastActivityAt: endedAt,
    lastCommittedTurn: {
      committedAt: turnRecords.at(-1)?.committedAt ?? endedAt,
      signature: input.turns.at(-1) ?? "",
      text: input.turns.at(-1) ?? "",
      transcriptIds: [transcripts.at(-1)?.id ?? ""].filter(Boolean),
    },
    reconnect: {
      attempts: 0,
    },
    scenarioId: input.scenarioId,
    status: "completed",
    transcripts,
    turns: turnRecords,
  };
};

const seedDemoBargeInProof = async () => {
  const sessionId = "proof-barge-in-interruption";
  const traces = await runtimeStorage.traces.list({ sessionId });

  if (traces.some((trace) => trace.type === "client.barge_in")) {
    return;
  }

  const at = Date.now() - 650;
  await deliveryTraceStore.append({
    at,
    metadata: {
      proof: "barge-in-seed",
      source: "demo",
    },
    payload: {
      at,
      id: "barge-in-proof-seed",
      latencyMs: 92,
      reason: "readiness-seed",
      sessionId,
      status: "stopped",
      thresholdMs: 250,
    },
    sessionId,
    type: "client.barge_in",
  });
};

const seedDemoDeliveryProof = async () => {
  const at = Date.now() - 500;
  const auditEvent = createVoiceAuditEvent({
    action: "readiness.delivery.proof",
    actor: {
      id: "absolutejs-voice-demo",
      kind: "system",
      name: "AbsoluteJS Voice Demo",
    },
    at,
    id: "readiness-audit-delivery-proof:event",
    metadata: {
      proof: "delivery-readiness-seed",
      source: "demo",
    },
    outcome: "success",
    payload: {
      surface: "production-readiness",
    },
    resource: {
      id: "production-readiness",
      type: "voice.readiness",
    },
    sessionId: "readiness-delivery-proof",
    traceId: "readiness-audit-delivery-proof",
    type: "operator.action",
  });
  const traceEvent = createVoiceTraceEvent({
    at,
    id: "readiness-trace-delivery-proof:event",
    metadata: {
      proof: "delivery-readiness-seed",
      source: "demo",
    },
    payload: {
      surface: "production-readiness",
      status: "delivered",
    },
    sessionId: "readiness-delivery-proof",
    traceId: "readiness-trace-delivery-proof",
    type: "client.live_latency",
  });

  await Promise.all([
    runtimeStorage.audit.append(auditEvent),
    runtimeStorage.auditDeliveries.set(
      "readiness-audit-delivery-proof",
      createVoiceAuditSinkDeliveryRecord({
        deliveredAt: at,
        deliveryAttempts: 1,
        deliveryStatus: "delivered",
        events: [auditEvent],
        id: "readiness-audit-delivery-proof",
        sinkDeliveries: {
          [auditDeliverySinkId]: {
            attempts: 1,
            deliveredAt: at,
            deliveredTo: auditDeliverySinkTarget,
            eventCount: 1,
            status: "delivered",
          },
        },
        updatedAt: at,
      }),
    ),
    runtimeStorage.traceDeliveries.set(
      "readiness-trace-delivery-proof",
      createVoiceTraceSinkDeliveryRecord({
        deliveredAt: at,
        deliveryAttempts: 1,
        deliveryStatus: "delivered",
        events: [traceEvent],
        id: "readiness-trace-delivery-proof",
        sinkDeliveries: {
          [traceDeliverySinkId]: {
            attempts: 1,
            deliveredAt: at,
            deliveredTo: traceDeliverySinkTarget,
            eventCount: 1,
            status: "delivered",
          },
        },
        updatedAt: at,
      }),
    ),
  ]);
};

const createDemoAuditDeliveryWorker = () => ({
  drain: async () => {
    const result = {
      alreadyProcessed: 0,
      attempted: 0,
      deadLettered: 0,
      delivered: 0,
      failed: 0,
      skipped: 0,
    };
    const deliveries = await runtimeStorage.auditDeliveries.list();

    await Promise.all(
      deliveries.map(async (delivery) => {
        if (delivery.deliveryStatus === "delivered") {
          result.alreadyProcessed += 1;
          return;
        }

        const deliveredAt = Date.now();
        result.attempted += 1;
        result.delivered += 1;
        await runtimeStorage.auditDeliveries.set(delivery.id, {
          ...delivery,
          deliveredAt,
          deliveryAttempts: (delivery.deliveryAttempts ?? 0) + 1,
          deliveryError: undefined,
          deliveryStatus: "delivered",
          sinkDeliveries: {
            [auditDeliverySinkId]: {
              attempts: (delivery.deliveryAttempts ?? 0) + 1,
              deliveredAt,
              deliveredTo: auditDeliverySinkTarget,
              eventCount: delivery.events.length,
              status: "delivered",
            },
          },
          updatedAt: deliveredAt,
        });
      }),
    );

    return result;
  },
});

const createDemoTraceDeliveryWorker = () => ({
  drain: async () => {
    const result = {
      alreadyProcessed: 0,
      attempted: 0,
      deadLettered: 0,
      delivered: 0,
      failed: 0,
      skipped: 0,
    };
    const deliveries = await runtimeStorage.traceDeliveries.list();

    await Promise.all(
      deliveries.map(async (delivery) => {
        if (delivery.deliveryStatus === "delivered") {
          result.alreadyProcessed += 1;
          return;
        }

        const deliveredAt = Date.now();
        result.attempted += 1;
        result.delivered += 1;
        await runtimeStorage.traceDeliveries.set(delivery.id, {
          ...delivery,
          deliveredAt,
          deliveryAttempts: (delivery.deliveryAttempts ?? 0) + 1,
          deliveryError: undefined,
          deliveryStatus: "delivered",
          sinkDeliveries: {
            [traceDeliverySinkId]: {
              attempts: (delivery.deliveryAttempts ?? 0) + 1,
              deliveredAt,
              deliveredTo: traceDeliverySinkTarget,
              eventCount: delivery.events.length,
              status: "delivered",
            },
          },
          updatedAt: deliveredAt,
        });
      }),
    );

    return result;
  },
});

const deliveryWorkerRuntime = (() => {
  if (deliverySinkKind === "webhook") {
    return createVoiceDeliveryRuntime(
      createVoiceDeliveryRuntimePresetConfig({
        auditDeliveries: runtimeStorage.auditDeliveries,
        auditSinkId: auditDeliverySinkId,
        auditWorkerId: "voice-demo-audit-webhook-worker",
        body: {
          audit: ({ events }) => ({
            eventCount: events.length,
            events,
            source: "absolutejs-voice-demo",
            surface: "audit-deliveries",
          }),
          trace: ({ events }) => ({
            eventCount: events.length,
            events,
            source: "absolutejs-voice-demo",
            surface: "trace-deliveries",
          }),
        },
        failures: {
          maxFailures: 3,
        },
        leases: {
          audit: createDemoLeaseCoordinator(),
          trace: createDemoLeaseCoordinator(),
        },
        mode: "webhook",
        signingSecret: webhookSigningSecret,
        traceDeliveries: runtimeStorage.traceDeliveries,
        traceSinkId: traceDeliverySinkId,
        traceWorkerId: "voice-demo-trace-webhook-worker",
        url: deliverySinkTarget,
      }),
    );
  }

  if (deliverySinkKind === "s3") {
    return createVoiceDeliveryRuntime(
      createVoiceDeliveryRuntimePresetConfig({
        auditDeliveries: runtimeStorage.auditDeliveries,
        auditSinkId: auditDeliverySinkId,
        auditWorkerId: "voice-demo-audit-s3-worker",
        bucket: s3DeliveryTarget.bucket,
        failures: {
          maxFailures: 3,
        },
        keyPrefix: s3DeliveryTarget.keyPrefix,
        leases: {
          audit: createDemoLeaseCoordinator(),
          trace: createDemoLeaseCoordinator(),
        },
        mode: "s3",
        traceDeliveries: runtimeStorage.traceDeliveries,
        traceSinkId: traceDeliverySinkId,
        traceWorkerId: "voice-demo-trace-s3-worker",
      }),
    );
  }

  return undefined;
})();

const demoAuditDeliveryWorker = createDemoAuditDeliveryWorker();

const demoTraceDeliveryWorker = createDemoTraceDeliveryWorker();

const demoDeliveryRuntimeSummaryCacheMs = 60_000;

let demoDeliveryRuntimeSummaryCache:
  | {
      expiresAt: number;
      promise: Promise<{
        audit: Awaited<ReturnType<typeof summarizeVoiceAuditSinkDeliveries>>;
        trace: Awaited<ReturnType<typeof summarizeVoiceTraceSinkDeliveries>>;
      }>;
    }
  | undefined;

const summarizeDemoDeliveryRuntime = () => {
  const now = Date.now();
  if (
    demoDeliveryRuntimeSummaryCache &&
    demoDeliveryRuntimeSummaryCache.expiresAt > now
  ) {
    return demoDeliveryRuntimeSummaryCache.promise;
  }

  const promise = Promise.all([
    runtimeStorage.auditDeliveries.list(),
    runtimeStorage.traceDeliveries.list(),
  ])
    .then(async ([auditDeliveries, traceDeliveries]) => ({
      audit: await summarizeVoiceAuditSinkDeliveries(auditDeliveries),
      trace: await summarizeVoiceTraceSinkDeliveries(traceDeliveries),
    }))
    .catch((error) => {
      demoDeliveryRuntimeSummaryCache = undefined;
      throw error;
    });
  demoDeliveryRuntimeSummaryCache = {
    expiresAt: now + demoDeliveryRuntimeSummaryCacheMs,
    promise,
  };

  return promise;
};

const deliveryRuntimeControl = deliveryWorkerRuntime ?? {
  audit: demoAuditDeliveryWorker,
  isRunning: () => false,
  start: () => undefined,
  stop: () => undefined,
  requeueDeadLetters: async () => ({
    audit: 0,
    trace: 0,
    total: 0,
  }),
  summarize: summarizeDemoDeliveryRuntime,
  tick: async () => {
    const [audit, trace] = await Promise.all([
      demoAuditDeliveryWorker.drain(),
      demoTraceDeliveryWorker.drain(),
    ]);

    return { audit, trace };
  },
  trace: demoTraceDeliveryWorker,
};

const createAuditDeliveryWorker = () =>
  deliveryWorkerRuntime?.audit ?? demoAuditDeliveryWorker;

const createTraceDeliveryWorker = () =>
  deliveryWorkerRuntime?.trace ?? demoTraceDeliveryWorker;

const isDemoBargeInProofTrace = (trace: VoiceTraceEvent) =>
  trace.type === "client.barge_in" &&
  trace.payload &&
  typeof trace.payload === "object" &&
  "id" in trace.payload &&
  trace.payload.id !== "barge-in-proof-seed" &&
  "latencyMs" in trace.payload &&
  typeof trace.payload.latencyMs === "number" &&
  "status" in trace.payload &&
  trace.payload.status === "stopped" &&
  trace.metadata?.source !== "demo" &&
  trace.metadata?.proof !== "barge-in-seed";

const getBargeInReportEvents = async (
  input: {
    events?: readonly StoredVoiceTraceEvent[];
  } = {},
) => {
  const traces = input.events
    ? [...input.events]
    : await runtimeStorage.traces.list();
  const live = traces.filter(isDemoBargeInProofTrace);

  return live.length > 0 ? live : traces;
};

const buildDemoBargeInReport = async (
  input: {
    context?: ReturnType<typeof createVoiceProofPackBuildContext>;
    events?: readonly StoredVoiceTraceEvent[];
  } = {},
) => {
  const events = await getBargeInReportEvents(input);
  const source = events.some(isDemoBargeInProofTrace) ? "live" : "demo";
  const thresholdProfile = await loadProofPackSloThresholdProfile(
    input.context,
  );
  const report = summarizeVoiceBargeIn(events, {
    thresholdMs: thresholdProfile.bargeIn.thresholdMs ?? 250,
  });

  return {
    ...report,
    source,
    sourceLabel:
      source === "live"
        ? "Live captured browser interruption events"
        : "Demo fallback seed",
  };
};

const renderDemoBargeInHTML = async () => {
  const report = await buildDemoBargeInReport();
  const html = renderVoiceBargeInHTML(report, {
    title: "AbsoluteJS Voice Barge-In",
  });
  const detail =
    report.source === "live"
      ? "This report is backed by persisted client.barge_in trace events from browser interruption tests."
      : "No live browser interruption event is available yet, so readiness uses the deterministic demo seed.";
  const badge = `<section class="metrics"><article><span>Proof source</span><strong>${escapeHtml(report.sourceLabel)}</strong></article><article><span>Source detail</span><strong style="font-size:1rem">${escapeHtml(detail)}</strong></article></section>`;

  return html.replace("</main>", `${badge}</main>`);
};

const toNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const toStringValue = (value: unknown) =>
  typeof value === "string" && value.trim() ? value : undefined;

const storeLiveTurnLatencyTrace = async (body: unknown) => {
  const input =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const id = toStringValue(input.id) ?? `live-turn-${crypto.randomUUID()}`;
  const sessionId =
    toStringValue(input.sessionId) ?? `live-latency-${crypto.randomUUID()}`;
  const latencyMs = toNumber(input.latencyMs);
  const startedAt = toNumber(input.startedAt) ?? Date.now();
  const completedAt = toNumber(input.completedAt) ?? Date.now();
  const status = toStringValue(input.status) ?? "unknown";
  const event: VoiceTraceEvent = {
    at: completedAt,
    metadata: {
      source: "browser",
      surface: "live-latency-proof",
    },
    payload: {
      assistantAudioAt: toNumber(input.assistantAudioAt),
      assistantTextAt: toNumber(input.assistantTextAt),
      completedAt,
      elapsedMs: latencyMs,
      latencyMs,
      startedAt,
      status,
      thresholdMs: toNumber(input.thresholdMs),
    },
    sessionId,
    traceId: id,
    type: "client.live_latency",
  };
  await deliveryTraceStore.append(event);

  return { ok: true, sessionId, traceId: id };
};

const isReconnectStatus = (value: unknown) =>
  value === "idle" ||
  value === "reconnecting" ||
  value === "resumed" ||
  value === "exhausted";

const getLiveReconnectContractSnapshots = async (
  input: {
    events?: readonly StoredVoiceTraceEvent[];
  } = {},
) =>
  summarizeVoiceReconnectContractSnapshots(
    input.events ? [...input.events] : await runtimeStorage.traces.list(),
  );

const getReconnectContractSnapshotSource = async (
  input: {
    events?: readonly StoredVoiceTraceEvent[];
  } = {},
) =>
  (await getLiveReconnectContractSnapshots(input)).length > 0 ? "live" : "demo";

const getReconnectContractSnapshots = async (
  input: {
    events?: readonly StoredVoiceTraceEvent[];
  } = {},
) => {
  const snapshots = await getLiveReconnectContractSnapshots(input);

  return snapshots.length > 0 ? snapshots : getDemoReconnectContractSnapshots();
};

const buildDemoReconnectContractReport = async (
  input: {
    events?: readonly StoredVoiceTraceEvent[];
  } = {},
) => {
  const snapshots = await getReconnectContractSnapshots(input);
  const source = snapshots.some((snapshot) =>
    input.events?.some(
      (event) => event.type === "client.reconnect" && event.at === snapshot.at,
    ),
  )
    ? "live"
    : "demo";
  const report = runVoiceReconnectContract({
    snapshots,
  });
  const resumed = snapshots.filter(
    (snapshot) =>
      snapshot.reconnect.status === "resumed" &&
      typeof snapshot.reconnect.lastResumedAt === "number",
  );
  const resumeLatencies = resumed
    .map((snapshot) => {
      const previousReconnect = snapshots
        .filter(
          (candidate) =>
            candidate.at <= snapshot.at &&
            candidate.reconnect.status === "reconnecting" &&
            typeof candidate.reconnect.lastDisconnectAt === "number",
        )
        .at(-1);

      return previousReconnect?.reconnect.lastDisconnectAt === undefined
        ? undefined
        : snapshot.reconnect.lastResumedAt! -
            previousReconnect.reconnect.lastDisconnectAt;
    })
    .filter(
      (value): value is number => typeof value === "number" && value >= 0,
    );
  const resumeLatencyP95Ms =
    resumeLatencies.length > 0
      ? [...resumeLatencies].sort((left, right) => left - right)[
          Math.min(
            resumeLatencies.length - 1,
            Math.max(0, Math.ceil(0.95 * resumeLatencies.length) - 1),
          )
        ]
      : undefined;

  return {
    ...report,
    resumeLatencyP95Ms,
    source,
    sourceLabel:
      source === "live"
        ? "Live captured browser traces"
        : "Demo fallback snapshots",
  };
};

const persistReconnectRealCallProfileEvidence = async (input: {
  report: Awaited<ReturnType<typeof buildDemoReconnectContractReport>>;
  sessionId: string;
}) => {
  if (input.report.pass !== true) {
    return;
  }

  const evidence = buildVoiceRealCallProfileEvidenceFromReconnectProofReports(
    input.report,
    {
      operationsRecordHref: "/voice/reconnect-contract",
      profileDescription:
        "Real browser reconnect/resume traces captured by the demo UI.",
      profileId: "reconnect-resume",
      profileLabel: "Reconnect resume",
      sessionId: `reconnect-resume-${input.sessionId}-${String(input.report.checkedAt)}`,
      surfaces: ["browser", "reconnect"],
    },
  );

  await Promise.all(
    evidence.map((entry) =>
      realCallProfileEvidenceStore.append({
        ...entry,
        id: `reconnect-resume:${input.sessionId}:${String(input.report.checkedAt)}:${String(input.report.snapshotCount)}`,
      }),
    ),
  );
};

const storeReconnectTrace = async (body: unknown) => {
  const input =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const reconnect =
    input.reconnect && typeof input.reconnect === "object"
      ? (input.reconnect as Record<string, unknown>)
      : undefined;
  const status = reconnect ? reconnect.status : undefined;

  if (!reconnect || !isReconnectStatus(status)) {
    return Response.json(
      { error: "Invalid reconnect snapshot." },
      { status: 400 },
    );
  }

  const at = toNumber(input.at) ?? Date.now();
  const sessionId =
    toStringValue(input.sessionId) ?? `reconnect-${crypto.randomUUID()}`;
  const scenarioId = toStringValue(input.scenarioId);
  const turnIds = Array.isArray(input.turnIds)
    ? input.turnIds.filter(
        (turnId): turnId is string => typeof turnId === "string",
      )
    : [];
  const event: VoiceTraceEvent = {
    at,
    metadata: {
      source: "browser",
      surface: "reconnect-proof",
    },
    payload: {
      at,
      reconnect: {
        attempts: toNumber(reconnect.attempts) ?? 0,
        lastDisconnectAt: toNumber(reconnect.lastDisconnectAt),
        lastResumedAt: toNumber(reconnect.lastResumedAt),
        maxAttempts: toNumber(reconnect.maxAttempts) ?? 0,
        nextAttemptAt: toNumber(reconnect.nextAttemptAt),
        status,
      },
      turnIds,
    },
    scenarioId,
    sessionId,
    type: "client.reconnect",
  };
  await deliveryTraceStore.append(event);
  if (status === "resumed") {
    const events = await runtimeStorage.traces.list({ limit: 500 });
    await persistReconnectRealCallProfileEvidence({
      report: await buildDemoReconnectContractReport({ events }),
      sessionId,
    });
  }

  return { ok: true, sessionId };
};

const renderDemoReconnectContractHTML = async (
  report: Parameters<typeof renderVoiceReconnectContractHTML>[0],
) => {
  const source = await getReconnectContractSnapshotSource();
  const sourceLabel =
    source === "live"
      ? "Live captured browser traces"
      : "Demo fallback snapshots";
  const sourceDetail =
    source === "live"
      ? "This contract is backed by persisted client.reconnect trace events from real browser reconnect lifecycle transitions."
      : "No live client.reconnect traces are available yet, so the page is using deterministic demo snapshots.";
  const html = renderVoiceReconnectContractHTML(report);
  const badge = `<section class="card"><h2>Proof source</h2><p><strong>${escapeHtml(sourceLabel)}</strong></p><p>${escapeHtml(sourceDetail)}</p></section>`;

  return html.replace("</main>", `${badge}</main>`);
};

export {
  buildDemoBargeInReport,
  buildDemoReconnectContractReport,
  createAuditDeliveryWorker,
  createProofSession,
  createTraceDeliveryWorker,
  deliveryRuntimeControl,
  getReconnectContractSnapshots,
  renderDemoBargeInHTML,
  renderDemoReconnectContractHTML,
  seedDemoBargeInProof,
  seedDemoDeliveryProof,
  storeLiveTurnLatencyTrace,
  storeReconnectTrace,
  summarizeDemoDeliveryRuntime,
  toNumber,
  toStringValue,
};
export type { ProofCallDisposition };
