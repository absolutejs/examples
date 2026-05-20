export {};

type EndpointName =
  | "agentSquadContract"
  | "opsStatus"
  | "bargeIn"
  | "campaignProof"
  | "campaignReadiness"
  | "campaigns"
  | "carriers"
  | "dataControl"
  | "handoffs"
  | "incidentHandoff"
  | "liveLatency"
  | "opsRecovery"
  | "outcomeContracts"
  | "phoneAgent"
  | "productionReadiness"
  | "providerCapabilities"
  | "providerRoutingContract"
  | "simulationSuite"
  | "sttProviderRoutingContract"
  | "telephonyWebhookDecisions"
  | "toolContracts"
  | "ttsProviderRoutingContract"
  | "turnLatency"
  | "voiceTraces";

type EndpointResult = {
  elapsedMs: number;
  error?: string;
  name: EndpointName;
  ok: boolean;
  status?: number;
  summary?: Record<string, unknown>;
  url: string;
};

const baseUrl = (
  process.env.VOICE_DEMO_URL ??
  `http://127.0.0.1:${process.env.PORT ?? "3004"}`
).replace(/\/$/, "");
const timeoutMs = Number(process.env.VOICE_READINESS_SMOKE_TIMEOUT_MS ?? 8_000);
const strict = process.env.VOICE_READINESS_SMOKE_STRICT === "true";

const endpoints: Array<{
  name: EndpointName;
  path: string;
  summarize: (body: unknown) => Record<string, unknown>;
}> = [
  {
    name: "productionReadiness",
    path: "/api/production-readiness",
    summarize: (body) => {
      const report = body as {
        status?: unknown;
        summary?: {
          agentSquadContracts?: unknown;
          campaignReadiness?: unknown;
          carriers?: unknown;
          handoffs?: unknown;
          liveLatency?: unknown;
          opsRecovery?: unknown;
          providerRoutingContracts?: unknown;
          providers?: unknown;
          quality?: unknown;
          routing?: unknown;
          sessions?: unknown;
        };
      };
      return {
        agentSquadContracts: report.summary?.agentSquadContracts,
        campaignReadiness: report.summary?.campaignReadiness,
        carriers: report.summary?.carriers,
        handoffs: report.summary?.handoffs,
        liveLatency: report.summary?.liveLatency,
        opsRecovery: report.summary?.opsRecovery,
        providerRoutingContracts: report.summary?.providerRoutingContracts,
        providers: report.summary?.providers,
        quality: report.summary?.quality,
        readinessStatus: report.status,
        routing: report.summary?.routing,
        sessions: report.summary?.sessions,
      };
    },
  },
  {
    name: "carriers",
    path: "/api/carriers",
    summarize: (body) => {
      const matrix = body as {
        pass?: unknown;
        summary?: unknown;
      };
      return {
        carrierPass: matrix.pass,
        carrierSummary: matrix.summary,
      };
    },
  },
  {
    name: "dataControl",
    path: "/data-control.json",
    summarize: (body) => {
      const report = body as {
        audit?: { configured?: unknown };
        redaction?: { enabled?: unknown };
        retentionPlan?: { dryRun?: unknown; totalMatches?: unknown };
        storage?: unknown[];
        traceDeliveries?: { configured?: unknown };
        zeroRetentionAvailable?: unknown;
      };
      return {
        auditConfigured: report.audit?.configured,
        redactionEnabled: report.redaction?.enabled,
        retentionDryRun: report.retentionPlan?.dryRun,
        retentionMatches: report.retentionPlan?.totalMatches,
        storageSurfaces: Array.isArray(report.storage) ? report.storage.length : 0,
        traceDeliveriesConfigured: report.traceDeliveries?.configured,
        zeroRetentionAvailable: report.zeroRetentionAvailable,
      };
    },
  },
  {
    name: "opsRecovery",
    path: "/api/voice/ops-recovery",
    summarize: (body) => {
      const report = body as {
        issues?: unknown[];
        providers?: {
          recoveredFallbacks?: unknown;
          unresolvedFailures?: unknown;
        };
        status?: unknown;
        interventions?: {
          total?: unknown;
        };
      };
      return {
        issueCount: Array.isArray(report.issues) ? report.issues.length : 0,
        opsRecoveryStatus: report.status,
        operatorInterventions: report.interventions?.total,
        recoveredFallbacks: report.providers?.recoveredFallbacks,
        unresolvedProviderFailures: report.providers?.unresolvedFailures,
      };
    },
  },
  {
    name: "phoneAgent",
    path: "/api/voice/phone/setup",
    summarize: (body) => {
      const report = body as {
        lifecycleStages?: unknown[];
        matrix?: {
          pass?: unknown;
          summary?: unknown;
        };
        ready?: unknown;
      };
      return {
        lifecycleStages: Array.isArray(report.lifecycleStages)
          ? report.lifecycleStages.length
          : undefined,
        phoneAgentReady: report.ready,
        phoneAgentMatrixPass: report.matrix?.pass,
        phoneAgentMatrixSummary: report.matrix?.summary,
      };
    },
  },
  {
    name: "agentSquadContract",
    path: "/api/agent-squad-contract",
    summarize: (body) => {
      const report = body as {
        issues?: unknown[];
        pass?: unknown;
        turns?: Array<{
          agentId?: unknown;
          handoffs?: unknown[];
          outcome?: unknown;
          pass?: unknown;
        }>;
      };
      const firstTurn = report.turns?.[0];
      const handoffs = report.turns?.flatMap((turn) =>
        Array.isArray(turn.handoffs) ? turn.handoffs : [],
      );
      return {
        agentSquadContractPass: report.pass,
        blockedHandoffs: handoffs?.filter(
          (handoff) =>
            handoff &&
            typeof handoff === "object" &&
            "status" in handoff &&
            handoff.status === "blocked",
        ).length,
        finalAgentId: firstTurn?.agentId,
        firstTurnHandoffs: Array.isArray(firstTurn?.handoffs)
          ? firstTurn.handoffs.length
          : undefined,
        firstTurnOutcome: firstTurn?.outcome,
        issueCount: Array.isArray(report.issues) ? report.issues.length : 0,
        turnCount: Array.isArray(report.turns) ? report.turns.length : 0,
      };
    },
  },
  {
    name: "providerRoutingContract",
    path: "/api/provider-routing-contract",
    summarize: (body) => {
      const report = body as {
        contractId?: unknown;
        events?: unknown[];
        issues?: unknown[];
        pass?: unknown;
      };
      return {
        contractId: report.contractId,
        eventCount: Array.isArray(report.events) ? report.events.length : 0,
        issueCount: Array.isArray(report.issues) ? report.issues.length : 0,
        providerRoutingContractPass: report.pass,
      };
    },
  },
  {
    name: "sttProviderRoutingContract",
    path: "/api/stt-provider-routing-contract",
    summarize: (body) => {
      const report = body as {
        contractId?: unknown;
        events?: unknown[];
        issues?: unknown[];
        pass?: unknown;
      };
      return {
        contractId: report.contractId,
        eventCount: Array.isArray(report.events) ? report.events.length : 0,
        issueCount: Array.isArray(report.issues) ? report.issues.length : 0,
        sttProviderRoutingContractPass: report.pass,
      };
    },
  },
  {
    name: "ttsProviderRoutingContract",
    path: "/api/tts-provider-routing-contract",
    summarize: (body) => {
      const report = body as {
        contractId?: unknown;
        events?: unknown[];
        issues?: unknown[];
        pass?: unknown;
      };
      return {
        contractId: report.contractId,
        eventCount: Array.isArray(report.events) ? report.events.length : 0,
        issueCount: Array.isArray(report.issues) ? report.issues.length : 0,
        ttsProviderRoutingContractPass: report.pass,
      };
    },
  },
  {
    name: "campaigns",
    path: "/api/voice/campaigns",
    summarize: (body) => {
      const report = body as {
        campaigns?: unknown[];
        summary?: {
          attempts?: { total?: unknown };
          campaigns?: { total?: unknown };
          recipients?: { total?: unknown };
        };
      };
      return {
        attempts: report.summary?.attempts?.total,
        campaignCount: Array.isArray(report.campaigns)
          ? report.campaigns.length
          : report.summary?.campaigns?.total,
        recipients: report.summary?.recipients?.total,
      };
    },
  },
  {
    name: "campaignReadiness",
    path: "/api/voice/campaigns/readiness-proof",
    summarize: (body) => {
      const report = body as {
        checks?: Array<{ status?: unknown }>;
        ok?: unknown;
        proof?: unknown;
      };
      return {
        failedChecks: Array.isArray(report.checks)
          ? report.checks.filter((check) => check.status !== "pass").length
          : undefined,
        ok: report.ok,
        proof: report.proof,
        totalChecks: Array.isArray(report.checks)
          ? report.checks.length
          : undefined,
      };
    },
  },
  {
    name: "telephonyWebhookDecisions",
    path: "/api/telephony-webhook-decisions",
    summarize: (body) => {
      const report = body as {
        decisions?: Array<{
          action?: unknown;
          provider?: unknown;
        }>;
        total?: unknown;
      };
      const actions = new Set<string>();
      const providers = new Set<string>();
      for (const decision of report.decisions ?? []) {
        if (typeof decision.action === "string") {
          actions.add(decision.action);
        }
        if (typeof decision.provider === "string") {
          providers.add(decision.provider);
        }
      }

      return {
        actions: [...actions].sort(),
        providers: [...providers].sort(),
        total: report.total,
      };
    },
  },
  {
    name: "providerCapabilities",
    path: "/api/provider-capabilities",
    summarize: (body) => {
      const report = body as {
        capabilities?: unknown[];
        selected?: unknown;
        total?: unknown;
      };
      return {
        capabilityCount: Array.isArray(report.capabilities)
          ? report.capabilities.length
          : report.total,
        selected: report.selected,
      };
    },
  },
  {
    name: "handoffs",
    path: "/api/voice-handoffs",
    summarize: (body) => {
      const summary = body as {
        failed?: unknown;
        total?: unknown;
      };
      return {
        failed: summary.failed,
        total: summary.total,
      };
    },
  },
  {
    name: "voiceTraces",
    path: "/api/voice-traces",
    summarize: (body) => {
      const report = body as {
        failed?: unknown;
        total?: unknown;
        warnings?: unknown;
      };
      return {
        failed: report.failed,
        total: report.total,
        warnings: report.warnings,
      };
    },
  },
  {
    name: "turnLatency",
    path: "/api/turn-latency",
    summarize: (body) => {
      const report = body as {
        averageTotalMs?: unknown;
        failed?: unknown;
        status?: unknown;
        total?: unknown;
        warnings?: unknown;
      };
      return {
        averageTotalMs: report.averageTotalMs,
        failed: report.failed,
        status: report.status,
        total: report.total,
        warnings: report.warnings,
      };
    },
  },
  {
    name: "simulationSuite",
    path: "/api/voice/simulations",
    summarize: (body) => {
      const report = body as {
        actions?: Array<{
          href?: unknown;
          section?: unknown;
        }>;
        failed?: unknown;
        status?: unknown;
        summary?: unknown;
        total?: unknown;
      };
      const actions = Array.isArray(report.actions) ? report.actions : [];
      const operationsRecordActionHrefs = actions
        .map((action) => action.href)
        .filter(
          (href): href is string =>
            typeof href === "string" && href.includes("/voice-operations/"),
        );
      const requiresOperationsRecordAction =
        report.status === "fail" && actions.length > 0;

      return {
        actionHrefs: actions
          .map((action) => action.href)
          .filter((href): href is string => typeof href === "string"),
        actions: actions.length,
        failed: report.failed,
        operationsRecordActionHrefs,
        operationsRecordActions: operationsRecordActionHrefs.length,
        operationsRecordActionsOk:
          !requiresOperationsRecordAction ||
          operationsRecordActionHrefs.length > 0,
        status: report.status,
        summary: report.summary,
        total: report.total,
      };
    },
  },
  {
    name: "toolContracts",
    path: "/api/tool-contracts",
    summarize: (body) => {
      const report = body as {
        contracts?: Array<{
          cases?: Array<{
            operationsRecordHref?: unknown;
            sessionId?: unknown;
          }>;
        }>;
        failed?: unknown;
        status?: unknown;
        total?: unknown;
      };
      const cases = (report.contracts ?? []).flatMap((contract) =>
        Array.isArray(contract.cases) ? contract.cases : [],
      );
      const operationsRecordCaseHrefs = cases
        .map((testCase) => testCase.operationsRecordHref)
        .filter(
          (href): href is string =>
            typeof href === "string" && href.includes("/voice-operations/"),
        );
      const requiresOperationsRecordCases = cases.length > 0;

      return {
        cases: cases.length,
        failed: report.failed,
        operationsRecordCaseHrefs,
        operationsRecordCases: operationsRecordCaseHrefs.length,
        operationsRecordCasesOk:
          !requiresOperationsRecordCases ||
          operationsRecordCaseHrefs.length === cases.length,
        status: report.status,
        total: report.total,
      };
    },
  },
  {
    name: "outcomeContracts",
    path: "/api/outcome-contracts",
    summarize: (body) => {
      const report = body as {
        contracts?: Array<{
          operationsRecordHrefs?: unknown[];
          sessionIds?: unknown[];
        }>;
        failed?: unknown;
        status?: unknown;
        total?: unknown;
      };
      const contracts = Array.isArray(report.contracts) ? report.contracts : [];
      const matchedSessionCount = contracts.reduce(
        (total, contract) =>
          total +
          (Array.isArray(contract.sessionIds) ? contract.sessionIds.length : 0),
        0,
      );
      const operationsRecordHrefs = contracts
        .flatMap((contract) =>
          Array.isArray(contract.operationsRecordHrefs)
            ? contract.operationsRecordHrefs
            : [],
        )
        .filter(
          (href): href is string =>
            typeof href === "string" && href.includes("/voice-operations/"),
        );
      const requiresOperationsRecordHrefs = matchedSessionCount > 0;

      return {
        failed: report.failed,
        matchedSessionCount,
        operationsRecordHrefs,
        operationsRecordLinks: operationsRecordHrefs.length,
        operationsRecordLinksOk:
          !requiresOperationsRecordHrefs ||
          operationsRecordHrefs.length === matchedSessionCount,
        status: report.status,
        total: report.total,
      };
    },
  },
  {
    name: "liveLatency",
    path: "/api/live-latency",
    summarize: (body) => {
      const report = body as {
        averageLatencyMs?: unknown;
        failed?: unknown;
        p50LatencyMs?: unknown;
        p95LatencyMs?: unknown;
        status?: unknown;
        total?: unknown;
        warnings?: unknown;
      };
      return {
        averageLatencyMs: report.averageLatencyMs,
        failed: report.failed,
        p50LatencyMs: report.p50LatencyMs,
        p95LatencyMs: report.p95LatencyMs,
        status: report.status,
        total: report.total,
        warnings: report.warnings,
      };
    },
  },
  {
    name: "bargeIn",
    path: "/api/voice-barge-in",
    summarize: (body) => {
      const report = body as {
        averageLatencyMs?: unknown;
        failed?: unknown;
        status?: unknown;
        total?: unknown;
      };
      return {
        averageLatencyMs: report.averageLatencyMs,
        failed: report.failed,
        status: report.status,
        total: report.total,
      };
    },
  },
  {
    name: "opsStatus",
    path: "/api/voice/ops-status",
    summarize: (body) => {
      const status = body as {
        failed?: unknown;
        passed?: unknown;
        status?: unknown;
        total?: unknown;
      };
      return {
        opsStatus: status.status,
        failed: status.failed,
        passed: status.passed,
        total: status.total,
      };
    },
  },
];

const textEndpoints: Array<{
  name: EndpointName;
  path: string;
  requiredText: string[];
  summarize: (text: string) => Record<string, unknown>;
}> = [
  {
    name: "incidentHandoff",
    path: "/voice-operations/demo-incident-bundle/incident.md",
    requiredText: [
      "# Voice incident handoff",
      "demo-incident-bundle",
      "Guardrail evidence",
      "assistant.guardrail assistant-output",
      "assistant.guardrail tool-input",
      "operations-record-guardrail-seed",
    ],
    summarize: (text) => ({
      bytes: new TextEncoder().encode(text).byteLength,
      lines: text.split(/\r?\n/).length,
      markdownHeading: text.split(/\r?\n/)[0],
    }),
  },
];

const fetchJson = async (
  endpoint: (typeof endpoints)[number],
): Promise<EndpointResult> => {
  const url = `${baseUrl}${endpoint.path}`;
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });
    const text = await response.text();
    const body = text ? (JSON.parse(text) as unknown) : undefined;

    return {
      elapsedMs: Math.round(performance.now() - startedAt),
      name: endpoint.name,
      ok: response.ok,
      status: response.status,
      summary: endpoint.summarize(body),
      url,
    };
  } catch (error) {
    return {
      elapsedMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
      name: endpoint.name,
      ok: false,
      url,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const fetchText = async (
  endpoint: (typeof textEndpoints)[number],
): Promise<EndpointResult> => {
  const url = `${baseUrl}${endpoint.path}`;
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/markdown,text/plain,*/*",
      },
      signal: controller.signal,
    });
    const text = await response.text();
    const missingText = endpoint.requiredText.filter(
      (required) => !text.includes(required),
    );

    return {
      elapsedMs: Math.round(performance.now() - startedAt),
      error:
        missingText.length > 0
          ? `Missing required text: ${missingText.join(", ")}`
          : undefined,
      name: endpoint.name,
      ok: response.ok && missingText.length === 0,
      status: response.status,
      summary: {
        ...endpoint.summarize(text),
        requiredTextFound: missingText.length === 0,
      },
      url,
    };
  } catch (error) {
    return {
      elapsedMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
      name: endpoint.name,
      ok: false,
      url,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const postCampaignProof = async (): Promise<EndpointResult> => {
  const url = `${baseUrl}/api/voice/campaigns/proof`;
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
    });
    const body = (await response.json()) as {
      final?: {
        attempts?: unknown[];
        recipients?: unknown[];
      };
      summary?: unknown;
      tick?: {
        attempted?: unknown;
      };
    };

    return {
      elapsedMs: Math.round(performance.now() - startedAt),
      name: "campaignProof",
      ok: response.ok,
      status: response.status,
      summary: {
        attempts: Array.isArray(body.final?.attempts)
          ? body.final?.attempts.length
          : undefined,
        recipients: Array.isArray(body.final?.recipients)
          ? body.final?.recipients.length
          : undefined,
        tickAttempted: body.tick?.attempted,
      },
      url,
    };
  } catch (error) {
    return {
      elapsedMs: Math.round(performance.now() - startedAt),
      error: error instanceof Error ? error.message : String(error),
      name: "campaignProof",
      ok: false,
      url,
    };
  } finally {
    clearTimeout(timeout);
  }
};

const results = await Promise.all([
  ...endpoints.map((endpoint) => fetchJson(endpoint)),
  ...textEndpoints.map((endpoint) => fetchText(endpoint)),
]);
results.push(await postCampaignProof());
const readinessStatus = results.find(
  (result) => result.name === "productionReadiness",
)?.summary?.readinessStatus;
const endpointOk = results.every((result) => result.ok);
const simulationSuiteSummary = results.find(
  (result) => result.name === "simulationSuite",
)?.summary;
const simulationSuiteOk =
  simulationSuiteSummary?.operationsRecordActionsOk !== false;
const toolContractsSummary = results.find(
  (result) => result.name === "toolContracts",
)?.summary;
const toolContractsOk =
  toolContractsSummary?.operationsRecordCasesOk !== false;
const outcomeContractsSummary = results.find(
  (result) => result.name === "outcomeContracts",
)?.summary;
const outcomeContractsOk =
  outcomeContractsSummary?.operationsRecordLinksOk !== false;
const readinessOk =
  !strict || (readinessStatus === "pass" || readinessStatus === undefined);
const ok =
  endpointOk &&
  readinessOk &&
  simulationSuiteOk &&
  toolContractsOk &&
  outcomeContractsOk;

console.log(
  JSON.stringify(
    {
      baseUrl,
      endpointOk,
      ok,
      outcomeContractsOk,
      readinessStatus,
      results,
      simulationSuiteOk,
      strict,
      toolContractsOk,
    },
    null,
    2,
  ),
);

if (!ok) {
  process.exit(1);
}
