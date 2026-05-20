import { Database } from "bun:sqlite";
import {
  createRAGFileRetrievalBaselineStore,
  createRAGFileRetrievalComparisonHistoryStore,
  createRAGFileRetrievalIncidentRemediationDecisionStore,
  createRAGFileRetrievalIncidentRemediationExecutionHistoryStore,
  createRAGFileRetrievalLaneHandoffAutoCompletePolicyHistoryStore,
  createRAGFileRetrievalLaneHandoffDecisionStore,
  createRAGFileRetrievalLaneHandoffIncidentHistoryStore,
  createRAGFileRetrievalLaneHandoffIncidentStore,
  createRAGFileRetrievalReleaseDecisionStore,
  createRAGFileRetrievalReleaseIncidentStore,
  createRAGFileRetrievalReleaseLanePolicyHistoryStore,
  createRAGFileRetrievalBaselineGatePolicyHistoryStore,
  createRAGFileRetrievalReleaseLaneEscalationPolicyHistoryStore,
  loadRAGRetrievalBaselines,
  loadRAGRetrievalComparisonHistory,
  loadRAGRetrievalIncidentRemediationDecisions,
  loadRAGRetrievalIncidentRemediationExecutionHistory,
  loadRAGRetrievalLaneHandoffDecisions,
  loadRAGRetrievalReleaseDecisions,
  loadRAGRetrievalReleaseIncidents,
  persistRAGRetrievalBaseline,
  persistRAGRetrievalComparisonRun,
  persistRAGRetrievalLaneHandoffDecision,
  persistRAGRetrievalReleaseDecision,
  persistRAGRetrievalReleaseIncident,
} from "@absolutejs/rag";
import type { RAGRetrievalReleaseIncidentRecord } from "@absolutejs/rag";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import type {
  DemoBackendMode,
  DemoReleaseOpsResponse,
  DemoReleaseWorkspace,
} from "../../../frontend/demo-backends";
import { createRAGBackends } from "./ragBackends";

type DemoReleaseScenarioId =
  | "blocked-general"
  | "blocked-multivector"
  | "ready"
  | "completed";

type DemoReleaseClassification = NonNullable<
  RAGRetrievalReleaseIncidentRecord["classification"]
>;

type DemoReleaseStores = {
  comparisonHistoryStore: ReturnType<
    typeof createRAGFileRetrievalComparisonHistoryStore
  >;
  baselineStore: ReturnType<typeof createRAGFileRetrievalBaselineStore>;
  releaseDecisionStore: ReturnType<
    typeof createRAGFileRetrievalReleaseDecisionStore
  >;
  releaseIncidentStore: ReturnType<
    typeof createRAGFileRetrievalReleaseIncidentStore
  >;
  laneHandoffDecisionStore: ReturnType<
    typeof createRAGFileRetrievalLaneHandoffDecisionStore
  >;
  laneHandoffIncidentStore: ReturnType<
    typeof createRAGFileRetrievalLaneHandoffIncidentStore
  >;
  laneHandoffIncidentHistoryStore: ReturnType<
    typeof createRAGFileRetrievalLaneHandoffIncidentHistoryStore
  >;
  laneHandoffAutoCompletePolicyHistoryStore: ReturnType<
    typeof createRAGFileRetrievalLaneHandoffAutoCompletePolicyHistoryStore
  >;
  releaseLanePolicyHistoryStore: ReturnType<
    typeof createRAGFileRetrievalReleaseLanePolicyHistoryStore
  >;
  baselineGatePolicyHistoryStore: ReturnType<
    typeof createRAGFileRetrievalBaselineGatePolicyHistoryStore
  >;
  releaseLaneEscalationPolicyHistoryStore: ReturnType<
    typeof createRAGFileRetrievalReleaseLaneEscalationPolicyHistoryStore
  >;
  incidentRemediationDecisionStore: ReturnType<
    typeof createRAGFileRetrievalIncidentRemediationDecisionStore
  >;
  incidentRemediationExecutionHistoryStore: ReturnType<
    typeof createRAGFileRetrievalIncidentRemediationExecutionHistoryStore
  >;
};

type DemoReleaseController = ReturnType<typeof createDemoReleaseController>;

type InternalHandler = (request: Request) => Promise<Response>;

type DemoReleaseScenario = {
  id: DemoReleaseScenarioId;
  label: string;
  description: string;
  groupKey: string;
  canaryRunId: string;
  stableRunId: string;
  laneState: "blocked" | "ready" | "completed";
  classification?: DemoReleaseClassification;
};

const normalizeDemoReleaseWorkspace = (
  value?: string | null,
): DemoReleaseWorkspace => (value === "beta" ? "beta" : "alpha");

const getDemoCorpusGroupKey = (workspace: DemoReleaseWorkspace) => workspace;

const getQualifiedReleaseRunId = (
  runId: string,
  workspace: DemoReleaseWorkspace,
) => `${runId}-${workspace}`;

const getQualifiedReleaseEntityId = (
  entityId: string,
  workspace: DemoReleaseWorkspace,
) => `${entityId}-${workspace}`;

const DEMO_CANARY_GATE_POLICY = {
  minAverageF1Delta: -0.05,
  minPassingRateDelta: -5,
  severity: "warn" as const,
};

const DEMO_STABLE_GATE_POLICY = {
  minAverageF1Delta: 0.01,
  minPassingRateDelta: 1,
  severity: "fail" as const,
};

const DEMO_RELEASE_POLICIES = {
  "docs-release-general": {
    approvalMaxAgeMs: 1000 * 60 * 60 * 24,
    requireApprovalBeforePromotion: true,
  },
  "docs-release-multivector": {
    approvalMaxAgeMs: 1000 * 60 * 60 * 24,
    requireApprovalBeforePromotion: true,
  },
  "docs-release-ready": {
    approvalMaxAgeMs: 1000 * 60 * 60 * 24,
    requireApprovalBeforePromotion: true,
  },
  "docs-release-completed": {
    approvalMaxAgeMs: 1000 * 60 * 60 * 24,
    requireApprovalBeforePromotion: true,
  },
} as const;

const DEMO_RELEASE_SCENARIOS: Record<
  DemoReleaseScenarioId,
  DemoReleaseScenario
> = {
  "blocked-general": {
    id: "blocked-general",
    label: "Blocked stable lane · general",
    description:
      "Stable lane is blocked by a classic passing-rate gate regression.",
    groupKey: "docs-release-general",
    canaryRunId: "demo-release-run-canary-general",
    stableRunId: "demo-release-run-stable-general",
    laneState: "blocked",
    classification: "general",
  },
  "blocked-multivector": {
    id: "blocked-multivector",
    label: "Blocked stable lane · multivector",
    description:
      "Stable lane is blocked by multivector coverage and collapsed-parent recovery regressions.",
    groupKey: "docs-release-multivector",
    canaryRunId: "demo-release-run-canary-multivector",
    stableRunId: "demo-release-run-stable-multivector",
    laneState: "blocked",
    classification: "multivector",
  },
  ready: {
    id: "ready",
    label: "Promotable stable lane",
    description: "Stable lane is promotable from the current candidate.",
    groupKey: "docs-release-ready",
    canaryRunId: "demo-release-run-canary-ready",
    stableRunId: "demo-release-run-stable-ready",
    laneState: "ready",
  },
  completed: {
    id: "completed",
    label: "Completed stable handoff",
    description:
      "Stable already received the canary handoff and is running the promoted candidate.",
    groupKey: "docs-release-completed",
    canaryRunId: "demo-release-run-canary-completed",
    stableRunId: "demo-release-run-stable-completed",
    laneState: "completed",
  },
};

const getReleaseScenarioStateId = (
  mode: DemoBackendMode,
  workspace: DemoReleaseWorkspace,
) => `release:${mode}:${workspace}`;

const readJsonResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const createDemoReleaseController = ({
  ragDb,
  ragBackends,
  releaseControlRoot,
}: {
  ragDb: Database;
  ragBackends: ReturnType<typeof createRAGBackends>;
  releaseControlRoot: string;
}) => {
  const readUIState = ragDb.query<{ value: string }, [string, string]>(
    "SELECT value FROM demo_ui_state WHERE scope = ?1 AND id = ?2",
  );
  const writeUIState = ragDb.query<never, [string, string, string, number]>(`
    INSERT INTO demo_ui_state (scope, id, value, updated_at)
    VALUES (?1, ?2, ?3, ?4)
    ON CONFLICT(scope, id) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);

  const readDemoReleaseScenario = (
    mode: DemoBackendMode,
    workspace: DemoReleaseWorkspace,
  ): DemoReleaseScenarioId => {
    const row = readUIState.get(
      "release-scenario",
      getReleaseScenarioStateId(mode, workspace),
    );
    if (
      row?.value === "blocked-general" ||
      row?.value === "blocked-multivector" ||
      row?.value === "ready" ||
      row?.value === "completed"
    ) {
      return row.value;
    }
    writeUIState.run(
      "release-scenario",
      getReleaseScenarioStateId(mode, workspace),
      "blocked-multivector",
      Date.now(),
    );
    return "blocked-multivector";
  };

  const writeDemoReleaseScenario = (
    mode: DemoBackendMode,
    workspace: DemoReleaseWorkspace,
    scenario: DemoReleaseScenarioId,
  ) => {
    writeUIState.run(
      "release-scenario",
      getReleaseScenarioStateId(mode, workspace),
      scenario,
      Date.now(),
    );
  };

  const createStores = (mode: DemoBackendMode): DemoReleaseStores => ({
    comparisonHistoryStore: createRAGFileRetrievalComparisonHistoryStore(
      join(releaseControlRoot, mode, "comparison-history.json"),
    ),
    baselineStore: createRAGFileRetrievalBaselineStore(
      join(releaseControlRoot, mode, "baselines.json"),
    ),
    releaseDecisionStore: createRAGFileRetrievalReleaseDecisionStore(
      join(releaseControlRoot, mode, "release-decisions.json"),
    ),
    releaseIncidentStore: createRAGFileRetrievalReleaseIncidentStore(
      join(releaseControlRoot, mode, "release-incidents.json"),
    ),
    laneHandoffDecisionStore: createRAGFileRetrievalLaneHandoffDecisionStore(
      join(releaseControlRoot, mode, "lane-handoff-decisions.json"),
    ),
    laneHandoffIncidentStore: createRAGFileRetrievalLaneHandoffIncidentStore(
      join(releaseControlRoot, mode, "lane-handoff-incidents.json"),
    ),
    laneHandoffIncidentHistoryStore:
      createRAGFileRetrievalLaneHandoffIncidentHistoryStore(
        join(releaseControlRoot, mode, "lane-handoff-incident-history.json"),
      ),
    laneHandoffAutoCompletePolicyHistoryStore:
      createRAGFileRetrievalLaneHandoffAutoCompletePolicyHistoryStore(
        join(releaseControlRoot, mode, "lane-handoff-policy-history.json"),
      ),
    releaseLanePolicyHistoryStore:
      createRAGFileRetrievalReleaseLanePolicyHistoryStore(
        join(releaseControlRoot, mode, "release-lane-policy-history.json"),
      ),
    baselineGatePolicyHistoryStore:
      createRAGFileRetrievalBaselineGatePolicyHistoryStore(
        join(releaseControlRoot, mode, "baseline-gate-policy-history.json"),
      ),
    releaseLaneEscalationPolicyHistoryStore:
      createRAGFileRetrievalReleaseLaneEscalationPolicyHistoryStore(
        join(
          releaseControlRoot,
          mode,
          "release-lane-escalation-policy-history.json",
        ),
      ),
    incidentRemediationDecisionStore:
      createRAGFileRetrievalIncidentRemediationDecisionStore(
        join(releaseControlRoot, mode, "incident-remediation-decisions.json"),
      ),
    incidentRemediationExecutionHistoryStore:
      createRAGFileRetrievalIncidentRemediationExecutionHistoryStore(
        join(releaseControlRoot, mode, "incident-remediation-executions.json"),
      ),
  });

  const storesByMode: Record<DemoBackendMode, DemoReleaseStores> = {
    "sqlite-native": createStores("sqlite-native"),
    "sqlite-fallback": createStores("sqlite-fallback"),
    postgres: createStores("postgres"),
    pinecone: createStores("pinecone"),
  };

  const seedRun = async ({
    mode,
    groupKey,
    corpusGroupKey,
    runId,
    gateStatus,
    gateReasons,
    delta,
    classification,
    label,
    suiteId,
    targetRolloutLabel,
    tags,
  }: {
    mode: DemoBackendMode;
    groupKey: string;
    corpusGroupKey: string;
    runId: string;
    gateStatus: "pass" | "fail";
    gateReasons: string[];
    delta: {
      averageF1Delta: number;
      passingRateDelta: number;
      elapsedMsDelta: number;
    };
    classification?: DemoReleaseClassification;
    label: string;
    suiteId: string;
    targetRolloutLabel: "canary" | "stable";
    tags: string[];
  }) => {
    const finishedAt =
      Date.now() - (targetRolloutLabel === "stable" ? 1_000 : 2_000);
    const multivectorSnapshot =
      classification === "multivector"
        ? {
            baseline: {
              multiVectorCases: 2,
              multiVectorCollapsedCases: 2,
              multiVectorLexicalHitCases: 2,
              multiVectorVectorHitCases: 1,
            },
            candidate: {
              multiVectorCases: 2,
              multiVectorCollapsedCases: 1,
              multiVectorLexicalHitCases: 1,
              multiVectorVectorHitCases: 1,
            },
            delta: {
              multiVectorCollapsedCasesDelta: -1,
              multiVectorLexicalHitCasesDelta: -1,
              multiVectorVectorHitCasesDelta: 0,
            },
            winners: {
              bestByMultivectorCollapsedCases: "vector",
              bestByMultivectorLexicalHitCases: "vector",
              bestByMultivectorVectorHitCases: "hybrid",
              winnerByMultivectorCollapsedCases: "vector",
              winnerByMultivectorLexicalHitCases: "vector",
              winnerByMultivectorVectorHitCases: "hybrid",
            },
          }
        : null;
    await persistRAGRetrievalComparisonRun({
      store: storesByMode[mode].comparisonHistoryStore,
      run: {
        id: runId,
        label,
        suiteId,
        suiteLabel: label,
        groupKey,
        corpusGroupKey,
        tags,
        startedAt: finishedAt - 250,
        finishedAt,
        elapsedMs: 250,
        comparison: {
          entries: [],
          leaderboard: [],
          summary: {
            bestByAverageF1: "hybrid",
            bestByPassingRate:
              delta.passingRateDelta >= 0 ? "hybrid" : "vector",
            fastest: delta.elapsedMsDelta <= 0 ? "hybrid" : "vector",
            ...(multivectorSnapshot?.winners
              ? {
                  bestByMultivectorCollapsedCases:
                    multivectorSnapshot.winners.bestByMultivectorCollapsedCases,
                  bestByMultivectorLexicalHitCases:
                    multivectorSnapshot.winners
                      .bestByMultivectorLexicalHitCases,
                  bestByMultivectorVectorHitCases:
                    multivectorSnapshot.winners.bestByMultivectorVectorHitCases,
                }
              : {}),
          },
          suiteId,
          suiteLabel: label,
        },
        decisionSummary: {
          baseline: {
            retrievalId: "vector",
            label: "Vector retrieval",
            passingRate:
              targetRolloutLabel === "stable" && gateStatus === "fail"
                ? 92
                : 90,
            averageF1: 0.62,
            elapsedMs: 39,
            ...(multivectorSnapshot?.baseline ?? {}),
          },
          baselineRetrievalId: "vector",
          candidate: {
            retrievalId: "hybrid",
            label: "Hybrid fusion",
            passingRate:
              targetRolloutLabel === "stable" && gateStatus === "fail"
                ? 88
                : 93,
            averageF1:
              targetRolloutLabel === "stable" && gateStatus === "fail"
                ? 0.64
                : 0.66,
            elapsedMs: 47,
            ...(multivectorSnapshot?.candidate ?? {}),
          },
          candidateRetrievalId: "hybrid",
          delta: { ...delta, ...(multivectorSnapshot?.delta ?? {}) },
          gate: {
            status: gateStatus,
            reasons: gateReasons,
            policy:
              targetRolloutLabel === "stable"
                ? DEMO_STABLE_GATE_POLICY
                : DEMO_CANARY_GATE_POLICY,
          },
          winnerByAverageF1: "hybrid",
          winnerByPassingRate:
            delta.passingRateDelta >= 0 ? "hybrid" : "vector",
          fastest: delta.elapsedMsDelta <= 0 ? "hybrid" : "vector",
          ...(multivectorSnapshot?.winners
            ? {
                winnerByMultivectorCollapsedCases:
                  multivectorSnapshot.winners.winnerByMultivectorCollapsedCases,
                winnerByMultivectorLexicalHitCases:
                  multivectorSnapshot.winners
                    .winnerByMultivectorLexicalHitCases,
                winnerByMultivectorVectorHitCases:
                  multivectorSnapshot.winners.winnerByMultivectorVectorHitCases,
              }
            : {}),
        },
        releaseVerdict: {
          status: gateStatus,
          summary:
            gateStatus === "pass"
              ? "Candidate passed the active baseline gate."
              : "Candidate failed the active baseline gate.",
          baselineGroupKey: groupKey,
          baselineRetrievalId: "vector",
          candidateRetrievalId: "hybrid",
          delta: { ...delta, ...(multivectorSnapshot?.delta ?? {}) },
          gate: {
            status: gateStatus,
            reasons: gateReasons,
            policy:
              targetRolloutLabel === "stable"
                ? DEMO_STABLE_GATE_POLICY
                : DEMO_CANARY_GATE_POLICY,
          },
        },
      },
    });
  };

  const ensureScenario = async (
    mode: DemoBackendMode,
    workspace: DemoReleaseWorkspace,
    scenarioId = readDemoReleaseScenario(mode, workspace),
  ) => {
    const backend = ragBackends.backends[mode];
    if (!backend.available || !backend.rag) {
      return;
    }

    mkdirSync(join(releaseControlRoot, mode), { recursive: true });

    const scenario = DEMO_RELEASE_SCENARIOS[scenarioId];
    const isBlockedScenario = scenario.laneState === "blocked";
    const isReadyScenario = scenario.laneState === "ready";
    const isCompletedScenario = scenario.laneState === "completed";
    const isMultivectorScenario = scenario.classification === "multivector";
    const stableGateReasons = isBlockedScenario
      ? isMultivectorScenario
        ? [
            "multivector collapsed cases delta -1 is below 0",
            "multivector lexical hit coverage regressed on the stable candidate",
          ]
        : ["passing rate delta -4 is below 1"]
      : [];
    const stableGateDelta = isBlockedScenario
      ? isMultivectorScenario
        ? { averageF1Delta: 0, passingRateDelta: -1, elapsedMsDelta: 8 }
        : { averageF1Delta: 0.02, passingRateDelta: -4, elapsedMsDelta: 8 }
      : { averageF1Delta: 0.02, passingRateDelta: 3, elapsedMsDelta: 8 };
    const corpusGroupKey = getDemoCorpusGroupKey(workspace);
    const canaryRunId = getQualifiedReleaseRunId(
      scenario.canaryRunId,
      workspace,
    );
    const stableRunId = getQualifiedReleaseRunId(
      scenario.stableRunId,
      workspace,
    );
    const stores = storesByMode[mode];
    const existingRuns = await loadRAGRetrievalComparisonHistory({
      store: stores.comparisonHistoryStore,
      groupKey: scenario.groupKey,
      corpusGroupKey,
      limit: 10,
      tag: "demo-release",
    });

    if (existingRuns.length === 0) {
      await seedRun({
        mode,
        groupKey: scenario.groupKey,
        corpusGroupKey,
        runId: canaryRunId,
        gateStatus: "pass",
        gateReasons: [],
        delta: {
          averageF1Delta: 0.03,
          passingRateDelta: 4,
          elapsedMsDelta: -2,
        },
        label: `${scenario.label} canary benchmark`,
        suiteId: `demo-release-suite-${mode}-${scenario.id}-canary`,
        targetRolloutLabel: "canary",
        tags: ["demo-release", scenario.id, "canary"],
      });
      await seedRun({
        mode,
        groupKey: scenario.groupKey,
        corpusGroupKey,
        runId: stableRunId,
        gateStatus: isBlockedScenario ? "fail" : "pass",
        gateReasons: stableGateReasons,
        delta: stableGateDelta,
        classification: scenario.classification,
        label: `${scenario.label} stable benchmark`,
        suiteId: `demo-release-suite-${mode}-${scenario.id}-stable`,
        targetRolloutLabel: "stable",
        tags: ["demo-release", scenario.id, "stable"],
      });
    }

    const baselines = await loadRAGRetrievalBaselines({
      store: stores.baselineStore,
      groupKey: scenario.groupKey,
      corpusGroupKey,
      limit: 12,
    });

    const hasCanaryBaseline = baselines.some(
      (entry) => entry.rolloutLabel === "canary" && entry.status === "active",
    );
    const hasStableBaseline = baselines.some(
      (entry) => entry.rolloutLabel === "stable" && entry.status === "active",
    );

    if (!hasCanaryBaseline) {
      await persistRAGRetrievalBaseline({
        store: stores.baselineStore,
        record: {
          id: getQualifiedReleaseEntityId(
            `demo-release-baseline-canary-${mode}-${scenario.id}`,
            workspace,
          ),
          groupKey: scenario.groupKey,
          corpusGroupKey,
          version: 1,
          status: "active",
          rolloutLabel: "canary",
          retrievalId: "hybrid",
          label: "Hybrid canary",
          suiteId: `demo-release-suite-${mode}-${scenario.id}-canary`,
          suiteLabel: "Release control showcase suite",
          sourceRunId: canaryRunId,
          promotedAt: Date.now() - 2_000,
          approvedAt: Date.now() - 2_000,
          approvedBy: "release-bot",
          policy: DEMO_CANARY_GATE_POLICY,
          tags: ["demo-release", scenario.id, "canary"],
        },
      });
    }

    if (!hasStableBaseline) {
      await persistRAGRetrievalBaseline({
        store: stores.baselineStore,
        record: {
          id: getQualifiedReleaseEntityId(
            `demo-release-baseline-stable-${mode}-${scenario.id}`,
            workspace,
          ),
          groupKey: scenario.groupKey,
          corpusGroupKey,
          version: 1,
          status: "active",
          rolloutLabel: "stable",
          retrievalId: isCompletedScenario ? "hybrid" : "vector",
          label: isCompletedScenario ? "Hybrid stable" : "Vector stable",
          suiteId: `demo-release-suite-${mode}-${scenario.id}-stable`,
          suiteLabel: "Release control showcase suite",
          sourceRunId: stableRunId,
          promotedAt: Date.now() - 5_000,
          approvedAt: Date.now() - 5_000,
          approvedBy: "release-bot",
          policy: DEMO_STABLE_GATE_POLICY,
          tags: ["demo-release", scenario.id, "stable"],
        },
      });
    }

    const decisions = await loadRAGRetrievalReleaseDecisions({
      store: stores.releaseDecisionStore,
      groupKey: scenario.groupKey,
      corpusGroupKey,
      limit: 12,
    });

    if (
      (isReadyScenario || isCompletedScenario) &&
      !decisions.some(
        (entry) =>
          entry.kind === "approve" &&
          entry.targetRolloutLabel === "stable" &&
          entry.sourceRunId === stableRunId,
      )
    ) {
      await persistRAGRetrievalReleaseDecision({
        store: stores.releaseDecisionStore,
        record: {
          id: getQualifiedReleaseEntityId(
            `demo-release-approve-${mode}-${scenario.id}`,
            workspace,
          ),
          kind: "approve",
          groupKey: scenario.groupKey,
          corpusGroupKey,
          targetRolloutLabel: "stable",
          retrievalId: "hybrid",
          sourceRunId: stableRunId,
          decidedAt: Date.now() - 1_000,
          decidedBy: "demo-operator",
          notes: "Approved for the promotable stable-lane scenario.",
          gateStatus: "pass",
          freshnessStatus: "fresh",
        },
      });
    }

    const incidents = await loadRAGRetrievalReleaseIncidents({
      store: stores.releaseIncidentStore,
      groupKey: scenario.groupKey,
      corpusGroupKey,
      limit: 12,
    });

    if (
      isBlockedScenario &&
      !incidents.some(
        (entry) =>
          entry.id ===
          getQualifiedReleaseEntityId(
            `demo-release-incident-stable-${mode}`,
            workspace,
          ),
      )
    ) {
      await persistRAGRetrievalReleaseIncident({
        store: stores.releaseIncidentStore,
        record: {
          id: getQualifiedReleaseEntityId(
            `demo-release-incident-stable-${mode}`,
            workspace,
          ),
          groupKey: scenario.groupKey,
          targetRolloutLabel: "stable",
          severity: "critical",
          status: "open",
          kind: "gate_failure",
          message: isMultivectorScenario
            ? "stable multivector coverage regressed for the current candidate"
            : "stable gate failed for the current candidate",
          triggeredAt: Date.now() - 750,
          baselineRetrievalId: "vector",
          candidateRetrievalId: "hybrid",
          sourceRunId: stableRunId,
          classification: scenario.classification ?? "general",
          corpusGroupKey,
        },
      });
    }

    const handoffDecisions = await loadRAGRetrievalLaneHandoffDecisions({
      store: stores.laneHandoffDecisionStore,
      groupKey: scenario.groupKey,
      corpusGroupKey,
      targetRolloutLabel: "stable",
      limit: 12,
    });
    if (isCompletedScenario && handoffDecisions.length === 0) {
      await persistRAGRetrievalLaneHandoffDecision({
        store: stores.laneHandoffDecisionStore,
        record: {
          id: getQualifiedReleaseEntityId(
            `demo-release-handoff-approve-${mode}-${scenario.id}`,
            workspace,
          ),
          candidateRetrievalId: "hybrid",
          decidedAt: Date.now() - 900,
          decidedBy: "demo-operator",
          groupKey: scenario.groupKey,
          corpusGroupKey,
          kind: "approve",
          notes: "Seeded approved handoff for completed scenario.",
          sourceBaselineRetrievalId: "hybrid",
          sourceRolloutLabel: "canary",
          sourceRunId: stableRunId,
          targetBaselineRetrievalId: "vector",
          targetRolloutLabel: "stable",
        },
      });
      await persistRAGRetrievalLaneHandoffDecision({
        store: stores.laneHandoffDecisionStore,
        record: {
          id: getQualifiedReleaseEntityId(
            `demo-release-handoff-complete-${mode}-${scenario.id}`,
            workspace,
          ),
          candidateRetrievalId: "hybrid",
          decidedAt: Date.now() - 800,
          decidedBy: "demo-operator",
          groupKey: scenario.groupKey,
          corpusGroupKey,
          kind: "complete",
          notes: "Seeded completed handoff for completed scenario.",
          sourceBaselineRetrievalId: "hybrid",
          sourceRolloutLabel: "canary",
          sourceRunId: stableRunId,
          targetBaselineRetrievalId: "hybrid",
          targetRolloutLabel: "stable",
        },
      });
    }
  };

  const pluginConfig = (mode: DemoBackendMode) => {
    const stores = storesByMode[mode];
    return {
      retrievalComparisonHistoryStore: stores.comparisonHistoryStore,
      retrievalBaselineStore: stores.baselineStore,
      retrievalReleaseDecisionStore: stores.releaseDecisionStore,
      retrievalReleaseIncidentStore: stores.releaseIncidentStore,
      retrievalLaneHandoffDecisionStore: stores.laneHandoffDecisionStore,
      retrievalLaneHandoffIncidentStore: stores.laneHandoffIncidentStore,
      retrievalLaneHandoffIncidentHistoryStore:
        stores.laneHandoffIncidentHistoryStore,
      retrievalLaneHandoffAutoCompletePolicyHistoryStore:
        stores.laneHandoffAutoCompletePolicyHistoryStore,
      retrievalReleaseLanePolicyHistoryStore:
        stores.releaseLanePolicyHistoryStore,
      retrievalBaselineGatePolicyHistoryStore:
        stores.baselineGatePolicyHistoryStore,
      retrievalReleaseLaneEscalationPolicyHistoryStore:
        stores.releaseLaneEscalationPolicyHistoryStore,
      retrievalIncidentRemediationDecisionStore:
        stores.incidentRemediationDecisionStore,
      retrievalIncidentRemediationExecutionHistoryStore:
        stores.incidentRemediationExecutionHistoryStore,
      retrievalReleasePolicies: DEMO_RELEASE_POLICIES,
      retrievalReleasePoliciesByGroupAndRolloutLabel: {
        "docs-release-general": {
          canary: { requireApprovalBeforePromotion: false },
          stable: DEMO_RELEASE_POLICIES["docs-release-general"],
        },
        "docs-release-multivector": {
          canary: { requireApprovalBeforePromotion: false },
          stable: DEMO_RELEASE_POLICIES["docs-release-multivector"],
        },
        "docs-release-ready": {
          canary: { requireApprovalBeforePromotion: false },
          stable: DEMO_RELEASE_POLICIES["docs-release-ready"],
        },
        "docs-release-completed": {
          canary: { requireApprovalBeforePromotion: false },
          stable: DEMO_RELEASE_POLICIES["docs-release-completed"],
        },
      },
      retrievalBaselineGatePoliciesByGroupAndRolloutLabel: {
        "docs-release-general": {
          canary: DEMO_CANARY_GATE_POLICY,
          stable: DEMO_STABLE_GATE_POLICY,
        },
        "docs-release-multivector": {
          canary: DEMO_CANARY_GATE_POLICY,
          stable: DEMO_STABLE_GATE_POLICY,
        },
        "docs-release-ready": {
          canary: DEMO_CANARY_GATE_POLICY,
          stable: DEMO_STABLE_GATE_POLICY,
        },
        "docs-release-completed": {
          canary: DEMO_CANARY_GATE_POLICY,
          stable: DEMO_STABLE_GATE_POLICY,
        },
      },
      retrievalLaneHandoffAutoCompletePoliciesByGroupAndTargetRolloutLabel: {
        "docs-release-general": {
          stable: {
            enabled: true,
            maxApprovedDecisionAgeMs: 1000 * 60 * 60 * 24,
          },
        },
        "docs-release-multivector": {
          stable: {
            enabled: true,
            maxApprovedDecisionAgeMs: 1000 * 60 * 60 * 24,
          },
        },
        "docs-release-ready": {
          stable: {
            enabled: true,
            maxApprovedDecisionAgeMs: 1000 * 60 * 60 * 24,
          },
        },
        "docs-release-completed": {
          stable: {
            enabled: true,
            maxApprovedDecisionAgeMs: 1000 * 60 * 60 * 24,
          },
        },
      },
    };
  };

  const buildReleaseResponse = async (
    mode: DemoBackendMode,
    workspace: DemoReleaseWorkspace,
    handleInternal: InternalHandler,
  ): Promise<DemoReleaseOpsResponse> => {
    await ensureScenario(mode, workspace);
    const backend = ragBackends.backends[mode];
    if (!backend.available) {
      return {};
    }

    const scenario =
      DEMO_RELEASE_SCENARIOS[readDemoReleaseScenario(mode, workspace)];
    const corpusGroupKey = getDemoCorpusGroupKey(workspace);
    const canaryRunId = getQualifiedReleaseRunId(
      scenario.canaryRunId,
      workspace,
    );
    const stableRunId = getQualifiedReleaseRunId(
      scenario.stableRunId,
      workspace,
    );
    const stores = storesByMode[mode];
    const [releaseStatus, driftStatus, handoffStatusRaw] = await Promise.all([
      readJsonResponse(
        await handleInternal(
          new Request(`http://absolute.local${backend.path}/status/release`, {
            method: "GET",
          }),
        ),
      ),
      readJsonResponse(
        await handleInternal(
          new Request(
            `http://absolute.local${backend.path}/status/release/drift`,
            {
              method: "GET",
            },
          ),
        ),
      ),
      readJsonResponse(
        await handleInternal(
          new Request(`http://absolute.local${backend.path}/status/handoffs`, {
            method: "GET",
          }),
        ),
      ),
    ]);

    const [
      decisions,
      incidents,
      remediationDecisionsRaw,
      executionHistoryRaw,
      baselines,
    ] = await Promise.all([
      loadRAGRetrievalReleaseDecisions({
        store: stores.releaseDecisionStore,
        groupKey: scenario.groupKey,
        corpusGroupKey,
        limit: 12,
      }),
      loadRAGRetrievalReleaseIncidents({
        store: stores.releaseIncidentStore,
        groupKey: scenario.groupKey,
        corpusGroupKey,
        limit: 12,
      }),
      loadRAGRetrievalIncidentRemediationDecisions({
        store: stores.incidentRemediationDecisionStore,
        incidentId: undefined,
        limit: 24,
      }),
      loadRAGRetrievalIncidentRemediationExecutionHistory({
        store: stores.incidentRemediationExecutionHistoryStore,
        incidentId: undefined,
        limit: 24,
      }),
      loadRAGRetrievalBaselines({
        store: stores.baselineStore,
        groupKey: scenario.groupKey,
        corpusGroupKey,
        limit: 12,
      }),
    ]);

    const matchesGovernanceScope = (entry: {
      groupKey?: string;
      corpusGroupKey?: string;
    }) =>
      (!entry.groupKey || entry.groupKey === scenario.groupKey) &&
      (!entry.corpusGroupKey || entry.corpusGroupKey === corpusGroupKey);

    const remediationDecisions = remediationDecisionsRaw.filter((entry) =>
      matchesGovernanceScope(entry),
    );
    const executionHistory = executionHistoryRaw.filter((entry) =>
      matchesGovernanceScope(entry),
    );

    const handoffStatus = {
      ...handoffStatusRaw,
      autoComplete: (handoffStatusRaw.autoComplete ?? []).filter(
        (entry: { groupKey?: string; corpusGroupKey?: string }) =>
          matchesGovernanceScope(entry),
      ),
      decisions: (handoffStatusRaw.decisions ?? []).filter(
        (entry: { groupKey?: string; corpusGroupKey?: string }) =>
          matchesGovernanceScope(entry),
      ),
      handoffs: (handoffStatusRaw.handoffs ?? []).filter(
        (entry: { groupKey?: string; corpusGroupKey?: string }) =>
          matchesGovernanceScope(entry),
      ),
      incidents: (handoffStatusRaw.incidents ?? []).filter(
        (entry: { groupKey?: string; corpusGroupKey?: string }) =>
          matchesGovernanceScope(entry),
      ),
      recentHistory: (handoffStatusRaw.recentHistory ?? []).filter(
        (entry: { groupKey?: string; corpusGroupKey?: string }) =>
          matchesGovernanceScope(entry),
      ),
      freshnessWindows: (handoffStatusRaw.freshnessWindows ?? []).filter(
        (entry: { groupKey?: string; corpusGroupKey?: string }) =>
          matchesGovernanceScope(entry),
      ),
    };

    const inferHandoffDriftKind = (reasons: string[]) => {
      const normalized = reasons.join(" ").toLowerCase();
      if (normalized.includes("expired")) {
        return "handoff_auto_complete_stale_approval";
      }
      if (
        normalized.includes("source lane") ||
        normalized.includes("source rollout")
      ) {
        return "handoff_auto_complete_source_lane_missing";
      }
      if (normalized.includes("gate")) {
        return "handoff_auto_complete_gate_blocked";
      }
      if (normalized.includes("approval") || normalized.includes("approve")) {
        return "handoff_auto_complete_approval_missing";
      }
      return "handoff_auto_complete_policy_drift";
    };

    const handoffDriftCountsByLaneAccumulator: Record<
      string,
      {
        countsByKind: Record<string, number>;
        targetRolloutLabel?: string;
        totalCount: number;
      }
    > = {};
    const handoffDriftRollupAccumulator: Record<
      string,
      {
        count: number;
        groupKeys: string[];
        kind: string;
        remediationHints: string[];
        remediationSteps: Array<{
          kind: string;
          label: string;
          actions: Array<{
            kind: string;
            label: string;
            method: string;
            path: string;
          }>;
        }>;
        severity: string;
        targetRolloutLabel?: string;
      }
    > = {};
    for (const entry of handoffStatus.autoComplete ?? []) {
      if (entry.ready) {
        continue;
      }
      const laneKey = entry.targetRolloutLabel ?? "unknown";
      const driftKind = inferHandoffDriftKind(entry.reasons ?? []);
      const existing = handoffDriftCountsByLaneAccumulator[laneKey] ?? {
        countsByKind: {
          handoff_auto_complete_policy_drift: 0,
          handoff_auto_complete_stale_approval: 0,
          handoff_auto_complete_source_lane_missing: 0,
          handoff_auto_complete_gate_blocked: 0,
          handoff_auto_complete_approval_missing: 0,
        },
        targetRolloutLabel: entry.targetRolloutLabel,
        totalCount: 0,
      };
      existing.countsByKind[driftKind] =
        (existing.countsByKind[driftKind] ?? 0) + 1;
      existing.totalCount += 1;
      handoffDriftCountsByLaneAccumulator[laneKey] = existing;

      const rollupKey = `${laneKey}:${driftKind}`;
      const rollup = handoffDriftRollupAccumulator[rollupKey] ?? {
        count: 0,
        groupKeys: [scenario.groupKey],
        kind: driftKind,
        remediationHints: entry.reasons ?? [],
        remediationSteps: (entry.reasons ?? []).map((reason: string) => ({
          kind: driftKind.includes("approval")
            ? "record_approval"
            : driftKind.includes("gate")
              ? "inspect_gate"
              : "review_readiness",
          label: reason,
          actions: [
            {
              kind: "view_release_status",
              label: "Inspect release readiness before deciding.",
              method: "GET",
              path: `${backend.path}/status/release`,
            },
          ],
        })),
        severity: driftKind.includes("gate") ? "critical" : "warning",
        targetRolloutLabel: entry.targetRolloutLabel,
      };
      rollup.count += 1;
      handoffDriftRollupAccumulator[rollupKey] = rollup;
    }
    const handoffDriftCountsByLane = Object.values(
      handoffDriftCountsByLaneAccumulator,
    );
    const handoffDriftRollups = Object.values(handoffDriftRollupAccumulator);

    const retrievalComparisons = releaseStatus.retrievalComparisons ?? {};
    const activeBaselines = (retrievalComparisons.activeBaselines ?? []).filter(
      (entry: { groupKey?: string; corpusGroupKey?: string }) =>
        matchesGovernanceScope(entry),
    );
    const recentRuns = (retrievalComparisons.recentRuns ?? []).filter(
      (entry: { groupKey?: string; corpusGroupKey?: string }) =>
        matchesGovernanceScope(entry),
    );
    const readyToPromoteByLane = (
      retrievalComparisons.readyToPromoteByLane ?? []
    ).filter(
      (entry: { sourceRunId?: string }) =>
        entry.sourceRunId === canaryRunId || entry.sourceRunId === stableRunId,
    );
    const stableReadiness = readyToPromoteByLane.find(
      (entry: { targetRolloutLabel?: string }) =>
        entry.targetRolloutLabel === "stable",
    );
    const stableHandoff = (handoffStatus.handoffs ?? []).find(
      (entry: { targetRolloutLabel?: string }) =>
        entry.targetRolloutLabel === "stable",
    );
    const stableHandoffDecision = (handoffStatus.decisions ?? [])
      .filter(
        (entry: { targetRolloutLabel?: string }) =>
          entry.targetRolloutLabel === "stable",
      )
      .sort(
        (left: { decidedAt?: number }, right: { decidedAt?: number }) =>
          (right.decidedAt ?? 0) - (left.decidedAt ?? 0),
      )[0];
    const latestStableBaselineHistory = baselines
      .filter(
        (entry) =>
          entry.rolloutLabel === "stable" && entry.status === "superseded",
      )
      .sort((left, right) => right.version - left.version)[0];
    const stableBaseline = activeBaselines.find(
      (entry: { rolloutLabel?: string }) => entry.rolloutLabel === "stable",
    );
    const openIncidents = incidents.filter((entry) => entry.status === "open");
    const incidentSummary = {
      acknowledgedOpenCount: openIncidents.filter((entry) =>
        Boolean(entry.acknowledgedAt),
      ).length,
      latestTriggeredAt: incidents
        .map((entry) => entry.triggeredAt)
        .sort((left, right) => right - left)[0],
      openCount: openIncidents.length,
      resolvedCount: incidents.filter((entry) => entry.status === "resolved")
        .length,
      unacknowledgedOpenCount: openIncidents.filter(
        (entry) => !entry.acknowledgedAt,
      ).length,
    };
    const incidentClassificationSummary = {
      openGeneralCount: openIncidents.filter(
        (entry) => (entry.classification ?? "general") !== "multivector",
      ).length,
      openMultiVectorCount: openIncidents.filter(
        (entry) => entry.classification === "multivector",
      ).length,
      resolvedGeneralCount: incidents.filter(
        (entry) =>
          entry.status === "resolved" &&
          (entry.classification ?? "general") !== "multivector",
      ).length,
      resolvedMultiVectorCount: incidents.filter(
        (entry) =>
          entry.status === "resolved" && entry.classification === "multivector",
      ).length,
      totalGeneralCount: incidents.filter(
        (entry) => (entry.classification ?? "general") !== "multivector",
      ).length,
      totalMultiVectorCount: incidents.filter(
        (entry) => entry.classification === "multivector",
      ).length,
    };
    const stableOpenIncident = openIncidents.find(
      (entry) => entry.targetRolloutLabel === "stable",
    );
    const openIncident = stableOpenIncident ?? openIncidents[0];

    const actions = [
      scenario.id !== "blocked-general"
        ? {
            id: "switch-to-blocked-general-scenario",
            label: "Load blocked general regression",
            description:
              "Switch the demo to a blocked stable-lane scenario driven by a general passing-rate regression.",
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "switch-to-blocked-general-scenario" },
            tone: "neutral" as const,
          }
        : null,
      scenario.id !== "blocked-multivector"
        ? {
            id: "switch-to-blocked-multivector-scenario",
            label: "Load blocked multivector regression",
            description:
              "Switch the demo to a blocked stable-lane scenario driven by multivector coverage regression.",
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "switch-to-blocked-multivector-scenario" },
            tone: "neutral" as const,
          }
        : null,
      scenario.id !== "ready"
        ? {
            id: "switch-to-ready-scenario",
            label: "Load promotable stable lane",
            description:
              "Switch the demo to a promotable stable-lane scenario so promotion and handoff completion paths become available.",
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "switch-to-ready-scenario" },
            tone: "neutral" as const,
          }
        : null,
      scenario.id !== "completed"
        ? {
            id: "switch-to-completed-scenario",
            label: "Load completed stable handoff",
            description:
              "Switch the demo to a completed handoff scenario so the promoted stable-lane outcome is visible immediately.",
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "switch-to-completed-scenario" },
            tone: "neutral" as const,
          }
        : null,
      {
        id: "reset-release-demo",
        label: "Reset release demo",
        description:
          "Clear the release-control files for this backend mode and reseed the blocked multivector stable-lane scenario.",
        method: "POST" as const,
        path: `/demo/release/${mode}/action`,
        payload: { actionId: "reset-release-demo" },
        tone: "danger" as const,
      },
      {
        id: "inspect-release-status",
        label: "Inspect release status",
        description:
          "Execute the published release status workflow and record the inspection in remediation history.",
        method: "POST" as const,
        path: `/demo/release/${mode}/action`,
        payload: { actionId: "inspect-release-status" },
        tone: "neutral" as const,
      },
      {
        id: "inspect-release-drift",
        label: "Inspect release drift",
        description:
          "Execute the published release drift workflow and record the inspection in remediation history.",
        method: "POST" as const,
        path: `/demo/release/${mode}/action`,
        payload: { actionId: "inspect-release-drift" },
        tone: "neutral" as const,
      },
      {
        id: "run-remediation-drill",
        label: "Run remediation drill",
        description:
          "Execute real remediation workflows to create execution history, an idempotent replay, and a guardrail-blocked bulk mutation.",
        method: "POST" as const,
        path: `/demo/release/${mode}/action`,
        payload: { actionId: "run-remediation-drill" },
        tone: "neutral" as const,
      },
      {
        id: "run-policy-history-drill",
        label: "Run policy history drill",
        description:
          "Load the published release, gate, escalation, and handoff policy history routes so recent policy snapshots are visible in the demo.",
        method: "POST" as const,
        path: `/demo/release/${mode}/action`,
        payload: { actionId: "run-policy-history-drill" },
        tone: "neutral" as const,
      },
      openIncident
        ? {
            id: "run-incident-drill",
            label: "Run incident drill",
            description:
              "Acknowledge and resolve the current release incident through the published incident workflow.",
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "run-incident-drill" },
            tone: "neutral" as const,
          }
        : null,
      scenario.laneState === "ready"
        ? {
            id: "run-promote-revert-drill",
            label: "Run promote/revert drill",
            description:
              "Promote the ready stable candidate and then revert to the previous stable baseline through the published workflows.",
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "run-promote-revert-drill" },
            tone: "neutral" as const,
          }
        : null,
      stableHandoff?.readyForHandoff &&
      stableHandoffDecision?.kind !== "complete"
        ? {
            id: "run-handoff-completion-drill",
            label: "Run handoff completion drill",
            description:
              "Approve and complete the stable handoff through the published handoff workflows.",
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "run-handoff-completion-drill" },
            tone: "neutral" as const,
          }
        : null,
      stableReadiness?.ready &&
      stableBaseline?.retrievalId !== stableReadiness?.candidateRetrievalId
        ? {
            id: "promote-stable-candidate",
            label: "Promote stable candidate",
            description:
              "Promote the current stable candidate through the published promote-from-run workflow.",
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "promote-stable-candidate" },
            tone: "primary" as const,
          }
        : null,
      stableBaseline?.sourceRunId === stableRunId &&
      stableBaseline?.retrievalId !== "vector" &&
      latestStableBaselineHistory
        ? {
            id: "revert-stable-baseline",
            label: "Revert stable baseline",
            description:
              "Revert stable to the previous baseline version through the published rollback workflow.",
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "revert-stable-baseline" },
            tone: "danger" as const,
          }
        : null,
      {
        id: "approve-stable-override",
        label: "Approve stable candidate",
        description:
          "Record a stable-lane approval through the real release decision route.",
        method: "POST" as const,
        path: `/demo/release/${mode}/action`,
        payload: { actionId: "approve-stable-override" },
        tone: "primary" as const,
      },
      {
        id: "reject-stable-candidate",
        label: "Reject stable candidate",
        description:
          "Record a stable-lane rejection through the published release decision workflow.",
        method: "POST" as const,
        path: `/demo/release/${mode}/action`,
        payload: { actionId: "reject-stable-candidate" },
        tone: "danger" as const,
      },
      openIncident && !openIncident.acknowledgedAt
        ? {
            id: "acknowledge-open-incident",
            label: `Acknowledge ${openIncident.targetRolloutLabel ?? "release"} incident`,
            description: `Acknowledge the current ${openIncident.targetRolloutLabel ?? "release"} incident through the published release incident workflow.`,
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "acknowledge-open-incident" },
            tone: "neutral" as const,
          }
        : null,
      openIncident
        ? {
            id: "resolve-open-incident",
            label: `Resolve ${openIncident.targetRolloutLabel ?? "release"} incident`,
            description: `Resolve the current ${openIncident.targetRolloutLabel ?? "release"} incident through the published release incident workflow.`,
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "resolve-open-incident" },
            tone: "danger" as const,
          }
        : null,
      stableHandoff
        ? {
            id: "inspect-stable-handoffs",
            label: "Inspect handoffs",
            description:
              "Execute the published handoff status workflow and record the inspection in remediation history.",
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "inspect-stable-handoffs" },
            tone: "neutral" as const,
          }
        : null,
      stableHandoff?.readyForHandoff &&
      stableHandoffDecision?.kind !== "complete"
        ? {
            id: "run-handoff-incident-drill",
            label: "Run handoff incident drill",
            description:
              "Create a stale handoff incident, then acknowledge, unacknowledge, and resolve it through the published handoff incident workflows.",
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "run-handoff-incident-drill" },
            tone: "neutral" as const,
          }
        : null,
      stableHandoff?.readyForHandoff &&
      stableHandoffDecision?.kind !== "complete"
        ? {
            id: "approve-stable-handoff",
            label: "Approve stable handoff",
            description:
              "Record a canary-to-stable handoff approval through the published handoff decision workflow.",
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "approve-stable-handoff" },
            tone: "primary" as const,
          }
        : null,
      stableHandoff?.readyForHandoff &&
      stableHandoffDecision?.kind === "approve"
        ? {
            id: "complete-stable-handoff",
            label: "Complete stable handoff",
            description:
              "Complete the canary-to-stable handoff through the published handoff promotion workflow.",
            method: "POST" as const,
            path: `/demo/release/${mode}/action`,
            payload: { actionId: "complete-stable-handoff" },
            tone: "primary" as const,
          }
        : null,
    ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    const workspaceInfo = {
      id: workspace,
      label: workspace === "beta" ? "Beta workspace" : "Alpha workspace",
      description:
        workspace === "beta"
          ? "Shows the beta corpus group inside the shared release-control group."
          : "Shows the alpha corpus group inside the shared release-control group.",
      corpusGroupKey,
    };

    const actionsWithWorkspace = actions.map((action) => ({
      ...action,
      payload: {
        ...action.payload,
        workspace,
      },
    }));

    return {
      workspace: workspaceInfo,
      actions: actionsWithWorkspace,
      driftStatus: {
        ...(driftStatus ?? {}),
        handoffDriftCountsByLane,
        handoffDriftRollups,
      },
      handoffStatus,
      incidentStatus: {
        incidentClassificationSummary,
        incidentSummary,
        recentIncidents: incidents.slice(0, 6),
      },
      recentReleaseDecisions: decisions
        .filter((entry) => matchesGovernanceScope(entry))
        .slice(0, 6),
      remediationStatus: {
        incidentClassificationSummary,
        incidentRemediationExecutionSummary:
          releaseStatus.incidentRemediationExecutionSummary,
        recentIncidentRemediationDecisions: remediationDecisions.slice(0, 6),
        recentIncidentRemediationExecutions: executionHistory.slice(0, 6),
      },
      scenario,
      releaseStatus: {
        retrievalComparisons: {
          configured: retrievalComparisons.configured,
          latest:
            retrievalComparisons.latest &&
            matchesGovernanceScope(retrievalComparisons.latest)
              ? {
                  ...retrievalComparisons.latest,
                  bestByLowestRuntimeCandidateBudgetExhaustedCases:
                    retrievalComparisons.latest
                      .bestByLowestRuntimeCandidateBudgetExhaustedCases,
                  bestByLowestRuntimeUnderfilledTopKCases:
                    retrievalComparisons.latest
                      .bestByLowestRuntimeUnderfilledTopKCases,
                }
              : recentRuns[0],
          adaptiveNativePlannerBenchmark:
            retrievalComparisons.adaptiveNativePlannerBenchmark,
          activeBaselines,
          alerts: (retrievalComparisons.alerts ?? []).filter(
            (entry: { groupKey?: string; corpusGroupKey?: string }) =>
              !entry.groupKey || matchesGovernanceScope(entry),
          ),
          promotionCandidates: (
            retrievalComparisons.promotionCandidates ?? []
          ).filter((entry: { groupKey?: string; corpusGroupKey?: string }) =>
            matchesGovernanceScope(entry),
          ),
          readyToPromoteByLane,
          recentDecisions: decisions
            .filter((entry) => matchesGovernanceScope(entry))
            .slice(0, 6),
          recentRuns,
          recentReleaseLanePolicyHistory: (
            retrievalComparisons.recentReleaseLanePolicyHistory ?? []
          ).filter(
            (entry: { groupKey?: string; corpusGroupKey?: string }) =>
              !entry.groupKey || matchesGovernanceScope(entry),
          ),
          recentBaselineGatePolicyHistory: (
            retrievalComparisons.recentBaselineGatePolicyHistory ?? []
          ).filter(
            (entry: { groupKey?: string; corpusGroupKey?: string }) =>
              !entry.groupKey || matchesGovernanceScope(entry),
          ),
          recentReleaseLaneEscalationPolicyHistory: (
            retrievalComparisons.recentReleaseLaneEscalationPolicyHistory ?? []
          ).filter((entry: { groupKey?: string; corpusGroupKey?: string }) =>
            matchesGovernanceScope(entry),
          ),
          recentHandoffAutoCompletePolicyHistory: (
            retrievalComparisons.recentHandoffAutoCompletePolicyHistory ?? []
          ).filter((entry: { groupKey?: string; corpusGroupKey?: string }) =>
            matchesGovernanceScope(entry),
          ),
          releaseLaneRecommendations: (
            retrievalComparisons.releaseLaneRecommendations ?? []
          ).filter((entry: { groupKey?: string; corpusGroupKey?: string }) =>
            matchesGovernanceScope(entry),
          ),
        },
      },
    } satisfies DemoReleaseOpsResponse;
  };

  const handleAction = async ({
    mode,
    workspace,
    actionId,
    handleInternal,
  }: {
    mode: DemoBackendMode;
    workspace: DemoReleaseWorkspace;
    actionId: string;
    handleInternal: InternalHandler;
  }) => {
    await ensureScenario(mode, workspace);
    const backend = ragBackends.backends[mode];
    if (!backend.available) {
      throw new Error(
        backend.reason ?? `Backend mode ${mode} is not available`,
      );
    }

    const scenario =
      DEMO_RELEASE_SCENARIOS[readDemoReleaseScenario(mode, workspace)];
    const corpusGroupKey = getDemoCorpusGroupKey(workspace);
    const canaryRunId = getQualifiedReleaseRunId(
      scenario.canaryRunId,
      workspace,
    );
    const stableRunId = getQualifiedReleaseRunId(
      scenario.stableRunId,
      workspace,
    );
    const stores = storesByMode[mode];
    const incidents = await loadRAGRetrievalReleaseIncidents({
      store: stores.releaseIncidentStore,
      groupKey: scenario.groupKey,
      corpusGroupKey,
      limit: 12,
    });
    const stableOpenIncident = incidents.find(
      (entry) =>
        entry.status === "open" && entry.targetRolloutLabel === "stable",
    );
    const openIncident =
      stableOpenIncident ?? incidents.find((entry) => entry.status === "open");

    let internalRequest: Request | null = null;
    if (
      actionId === "switch-to-ready-scenario" ||
      actionId === "switch-to-blocked-general-scenario" ||
      actionId === "switch-to-blocked-multivector-scenario" ||
      actionId === "switch-to-completed-scenario"
    ) {
      const nextScenario =
        actionId === "switch-to-ready-scenario"
          ? "ready"
          : actionId === "switch-to-completed-scenario"
            ? "completed"
            : actionId === "switch-to-blocked-general-scenario"
              ? "blocked-general"
              : "blocked-multivector";
      writeDemoReleaseScenario(mode, workspace, nextScenario);
      await ensureScenario(mode, workspace, nextScenario);
    } else if (actionId === "reset-release-demo") {
      rmSync(join(releaseControlRoot, mode), { force: true, recursive: true });
      writeDemoReleaseScenario(mode, workspace, "blocked-multivector");
      await ensureScenario(mode, workspace, "blocked-multivector");
    } else if (actionId === "inspect-release-status") {
      internalRequest = new Request(
        `http://absolute.local${backend.path}/compare/retrieval/incidents/remediations/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: {
              kind: "view_release_status",
              label: "Inspect release status",
              method: "GET",
              path: `${backend.path}/status/release`,
            },
            decidedBy: "demo-operator",
            groupKey: scenario.groupKey,
            corpusGroupKey,
            idempotencyKey: `${actionId}:${mode}`,
            incidentId: openIncident?.id,
            notes:
              "Inspected the release status from the demo release-control panel.",
            persistDecision: true,
            remediationKind: "review_readiness",
            targetRolloutLabel: openIncident?.targetRolloutLabel ?? "stable",
          }),
        },
      );
    } else if (actionId === "inspect-release-drift") {
      internalRequest = new Request(
        `http://absolute.local${backend.path}/compare/retrieval/incidents/remediations/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: {
              kind: "view_release_drift",
              label: "Inspect release drift",
              method: "GET",
              path: `${backend.path}/status/release/drift`,
            },
            decidedBy: "demo-operator",
            groupKey: scenario.groupKey,
            corpusGroupKey,
            idempotencyKey: `${actionId}:${mode}`,
            incidentId: openIncident?.id,
            notes:
              "Inspected the release drift from the demo release-control panel.",
            persistDecision: true,
            remediationKind: "inspect_gate",
            targetRolloutLabel: openIncident?.targetRolloutLabel ?? "stable",
          }),
        },
      );
    } else if (actionId === "promote-stable-candidate") {
      internalRequest = new Request(
        `http://absolute.local${backend.path}/compare/retrieval/baselines/promote-run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvedBy: "demo-operator",
            approvalNotes: "Promoted from the demo release-control panel.",
            groupKey: scenario.groupKey,
            corpusGroupKey,
            rolloutLabel: "stable",
            sourceRunId: stableRunId,
          }),
        },
      );
    } else if (actionId === "revert-stable-baseline") {
      const baselines = await loadRAGRetrievalBaselines({
        store: stores.baselineStore,
        groupKey: scenario.groupKey,
        corpusGroupKey,
        limit: 12,
      });
      const previousStableBaseline = baselines
        .filter(
          (entry) =>
            entry.rolloutLabel === "stable" && entry.status === "superseded",
        )
        .sort((left, right) => right.version - left.version)[0];
      if (!previousStableBaseline) {
        throw new Error("No prior stable baseline is available to revert");
      }
      internalRequest = new Request(
        `http://absolute.local${backend.path}/compare/retrieval/baselines/revert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approvedBy: "demo-operator",
            approvalNotes: "Reverted from the demo release-control panel.",
            groupKey: scenario.groupKey,
            corpusGroupKey,
            version: previousStableBaseline.version,
          }),
        },
      );
    } else if (actionId === "approve-stable-override") {
      internalRequest = new Request(
        `http://absolute.local${backend.path}/compare/retrieval/baselines/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decidedBy: "demo-operator",
            groupKey: scenario.groupKey,
            corpusGroupKey,
            notes: "Approved from the demo release-control panel.",
            overrideGate: scenario.laneState === "blocked",
            overrideReason:
              scenario.laneState === "blocked"
                ? "Demo override to show the stable approval workflow."
                : undefined,
            sourceRunId: stableRunId,
            targetRolloutLabel: "stable",
          }),
        },
      );
    } else if (actionId === "reject-stable-candidate") {
      internalRequest = new Request(
        `http://absolute.local${backend.path}/compare/retrieval/baselines/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decidedBy: "demo-operator",
            groupKey: scenario.groupKey,
            corpusGroupKey,
            notes: "Rejected from the demo release-control panel.",
            sourceRunId: stableRunId,
            targetRolloutLabel: "stable",
          }),
        },
      );
    } else if (actionId === "acknowledge-open-incident") {
      if (!openIncident) {
        throw new Error("No open release incident is available to acknowledge");
      }
      internalRequest = new Request(
        `http://absolute.local${backend.path}/compare/retrieval/incidents/acknowledge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acknowledgedBy: "demo-operator",
            acknowledgementNotes:
              "Acknowledged from the demo release-control panel.",
            incidentId: openIncident.id,
          }),
        },
      );
    } else if (actionId === "resolve-open-incident") {
      if (!openIncident) {
        throw new Error("No open release incident is available to resolve");
      }
      internalRequest = new Request(
        `http://absolute.local${backend.path}/compare/retrieval/incidents/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            incidentId: openIncident.id,
            resolutionNotes: "Resolved from the demo release-control panel.",
            resolvedBy: "demo-operator",
          }),
        },
      );
    } else if (actionId === "inspect-stable-handoffs") {
      internalRequest = new Request(
        `http://absolute.local${backend.path}/compare/retrieval/incidents/remediations/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: {
              kind: "view_handoffs",
              label: "Inspect handoff posture",
              method: "GET",
              path: `${backend.path}/status/handoffs`,
            },
            decidedBy: "demo-operator",
            groupKey: scenario.groupKey,
            corpusGroupKey,
            idempotencyKey: `${actionId}:${mode}`,
            incidentId: stableOpenIncident?.id,
            notes:
              "Inspected the canary-to-stable handoff posture from the demo release-control panel.",
            persistDecision: true,
            remediationKind: "review_readiness",
            targetRolloutLabel: "stable",
          }),
        },
      );
    } else if (actionId === "approve-stable-handoff") {
      internalRequest = new Request(
        `http://absolute.local${backend.path}/compare/retrieval/handoffs/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decidedAt: Date.now(),
            decidedBy: "demo-operator",
            groupKey: scenario.groupKey,
            corpusGroupKey,
            kind: "approve",
            notes: "Approved from the demo release-control panel.",
            sourceRolloutLabel: "canary",
            targetRolloutLabel: "stable",
          }),
        },
      );
    } else if (actionId === "complete-stable-handoff") {
      internalRequest = new Request(
        `http://absolute.local${backend.path}/compare/retrieval/handoffs/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decidedAt: Date.now(),
            decidedBy: "demo-operator",
            executePromotion: true,
            groupKey: scenario.groupKey,
            corpusGroupKey,
            kind: "complete",
            notes: "Completed from the demo release-control panel.",
            sourceRolloutLabel: "canary",
            targetRolloutLabel: "stable",
          }),
        },
      );
    }

    const executeInternal = async (request: Request) => {
      const response = await handleInternal(request);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response;
    };

    if (actionId === "run-remediation-drill") {
      const incidentId = openIncident?.id;
      const targetRolloutLabel = openIncident?.targetRolloutLabel ?? "stable";
      const inspectStatusBody = {
        action: {
          kind: "view_release_status",
          label: "Inspect release status",
          method: "GET",
          path: `${backend.path}/status/release`,
        },
        decidedBy: "demo-operator",
        groupKey: scenario.groupKey,
        corpusGroupKey,
        idempotencyKey: `inspect-release-status:${mode}:drill`,
        incidentId,
        notes: "Ran the remediation drill from the demo release-control panel.",
        persistDecision: true,
        remediationKind: "review_readiness",
        targetRolloutLabel,
      };
      await executeInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/incidents/remediations/execute`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(inspectStatusBody),
          },
        ),
      );
      await executeInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/incidents/remediations/execute`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(inspectStatusBody),
          },
        ),
      );
      await executeInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/incidents/remediations/execute`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: {
                kind: "view_handoffs",
                label: "Inspect handoff posture",
                method: "GET",
                path: `${backend.path}/status/handoffs`,
              },
              decidedBy: "demo-operator",
              groupKey: scenario.groupKey,
              corpusGroupKey,
              idempotencyKey: `inspect-stable-handoffs:${mode}:drill`,
              incidentId: stableOpenIncident?.id,
              notes:
                "Ran the remediation handoff check from the demo release-control panel.",
              persistDecision: true,
              remediationKind: "review_readiness",
              targetRolloutLabel: "stable",
            }),
          },
        ),
      );
      const bulkGuardrailResponse = await handleInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/incidents/remediations/execute/bulk`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              allowMutationExecution: false,
              items: [
                {
                  action: {
                    kind: "acknowledge_incident",
                    label: "Acknowledge incident",
                    method: "POST",
                    path: `${backend.path}/compare/retrieval/incidents/acknowledge`,
                  },
                  decidedBy: "demo-operator",
                  groupKey: scenario.groupKey,
                  corpusGroupKey,
                  idempotencyKey: `acknowledge-open-incident:${mode}:drill`,
                  incidentId,
                  notes:
                    "Attempted the guarded bulk incident mutation from the demo remediation drill.",
                  persistDecision: true,
                  remediationKind: "review_readiness",
                  targetRolloutLabel,
                },
              ],
              stopOnError: true,
            }),
          },
        ),
      );
      const bulkGuardrailText = await bulkGuardrailResponse.text();
      if (bulkGuardrailResponse.ok) {
        const bulkGuardrailBody = JSON.parse(bulkGuardrailText) as {
          ok?: boolean;
          error?: string;
        };
        if (
          bulkGuardrailBody.ok !== false ||
          !bulkGuardrailBody.error?.includes("allowMutationExecution: true")
        ) {
          throw new Error(
            bulkGuardrailBody.error ?? "Unexpected remediation bulk response",
          );
        }
      } else if (!bulkGuardrailText.includes("allowMutationExecution: true")) {
        throw new Error(bulkGuardrailText);
      }
    } else if (actionId === "run-policy-history-drill") {
      for (const path of [
        `${backend.path}/status/release`,
        `${backend.path}/compare/retrieval/release-policies/history`,
        `${backend.path}/compare/retrieval/gate-policies/history`,
        `${backend.path}/compare/retrieval/escalation-policies/history`,
        `${backend.path}/compare/retrieval/handoffs/policies/history`,
      ]) {
        await executeInternal(
          new Request(`http://absolute.local${path}`, {
            method: "GET",
          }),
        );
      }
    } else if (actionId === "run-incident-drill") {
      if (!openIncident) {
        throw new Error(
          "No open release incident is available for the incident drill",
        );
      }
      if (!openIncident.acknowledgedAt) {
        await executeInternal(
          new Request(
            `http://absolute.local${backend.path}/compare/retrieval/incidents/acknowledge`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                acknowledgedBy: "demo-operator",
                acknowledgementNotes:
                  "Acknowledged from the demo incident drill.",
                incidentId: openIncident.id,
              }),
            },
          ),
        );
      }
      await executeInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/incidents/resolve`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              incidentId: openIncident.id,
              resolutionNotes: "Resolved from the demo incident drill.",
              resolvedBy: "demo-operator",
            }),
          },
        ),
      );
    } else if (actionId === "run-promote-revert-drill") {
      await executeInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/baselines/promote-run`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              approvedBy: "demo-operator",
              approvalNotes: "Promoted from the demo promote/revert drill.",
              groupKey: scenario.groupKey,
              corpusGroupKey,
              rolloutLabel: "stable",
              sourceRunId: stableRunId,
            }),
          },
        ),
      );
      const baselines = await loadRAGRetrievalBaselines({
        store: stores.baselineStore,
        groupKey: scenario.groupKey,
        corpusGroupKey,
        limit: 12,
      });
      const previousStableBaseline = baselines
        .filter(
          (entry) =>
            entry.rolloutLabel === "stable" && entry.status === "superseded",
        )
        .sort((left, right) => right.version - left.version)[0];
      if (!previousStableBaseline) {
        throw new Error(
          "No prior stable baseline is available to revert during the drill",
        );
      }
      await executeInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/baselines/revert`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              approvedBy: "demo-operator",
              approvalNotes: "Reverted from the demo promote/revert drill.",
              groupKey: scenario.groupKey,
              corpusGroupKey,
              version: previousStableBaseline.version,
            }),
          },
        ),
      );
    } else if (actionId === "run-handoff-completion-drill") {
      await executeInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/handoffs/decide`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              decidedAt: Date.now(),
              decidedBy: "demo-operator",
              groupKey: scenario.groupKey,
              corpusGroupKey,
              kind: "approve",
              notes: "Approved from the demo handoff completion drill.",
              sourceRolloutLabel: "canary",
              targetRolloutLabel: "stable",
            }),
          },
        ),
      );
      await executeInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/handoffs/decide`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              decidedAt: Date.now(),
              decidedBy: "demo-operator",
              executePromotion: true,
              groupKey: scenario.groupKey,
              corpusGroupKey,
              kind: "complete",
              notes: "Completed from the demo handoff completion drill.",
              sourceRolloutLabel: "canary",
              targetRolloutLabel: "stable",
            }),
          },
        ),
      );
    } else if (actionId === "run-handoff-incident-drill") {
      const staleDecisionAt = Date.now() - 1000 * 60 * 60 * 48;
      const staleApproveResponse = await handleInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/handoffs/decide`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              decidedAt: staleDecisionAt,
              decidedBy: "demo-operator",
              groupKey: scenario.groupKey,
              corpusGroupKey,
              kind: "approve",
              notes:
                "Approved from the demo handoff incident drill with an intentionally stale timestamp.",
              sourceRolloutLabel: "canary",
              targetRolloutLabel: "stable",
            }),
          },
        ),
      );
      if (!staleApproveResponse.ok) {
        const staleApproveText = await staleApproveResponse.text();
        if (!staleApproveText.includes("fresher handoff approval")) {
          throw new Error(staleApproveText);
        }
      }
      await executeInternal(
        new Request(`http://absolute.local${backend.path}/status/handoffs`, {
          method: "GET",
        }),
      );
      const incidentsResponse = await executeInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/handoffs/incidents`,
          { method: "GET" },
        ),
      );
      const incidentsBody = await incidentsResponse.json();
      const handoffIncident = (incidentsBody.incidents ?? [])
        .filter(
          (entry: any) =>
            entry.groupKey === scenario.groupKey &&
            entry.targetRolloutLabel === "stable",
        )
        .sort(
          (left: any, right: any) =>
            (right.triggeredAt ?? 0) - (left.triggeredAt ?? 0),
        )[0];
      if (!handoffIncident?.id) {
        throw new Error(
          "No stale handoff incident was created during the drill",
        );
      }
      await executeInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/handoffs/incidents/acknowledge`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              acknowledgedBy: "demo-operator",
              acknowledgementNotes:
                "Acknowledged from the demo handoff incident drill.",
              incidentId: handoffIncident.id,
            }),
          },
        ),
      );
      await executeInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/handoffs/incidents/unacknowledge`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ incidentId: handoffIncident.id }),
          },
        ),
      );
      await executeInternal(
        new Request(
          `http://absolute.local${backend.path}/compare/retrieval/handoffs/incidents/resolve`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              incidentId: handoffIncident.id,
              resolutionNotes: "Resolved from the demo handoff incident drill.",
              resolvedBy: "demo-operator",
            }),
          },
        ),
      );
    } else if (
      !internalRequest &&
      !actionId.startsWith("switch-to-") &&
      actionId !== "reset-release-demo"
    ) {
      throw new Error(`Unknown release action ${actionId}`);
    }

    if (internalRequest) {
      await executeInternal(internalRequest);
    }

    return buildReleaseResponse(mode, workspace, handleInternal);
  };

  return {
    buildReleaseResponse,
    ensureScenario,
    handleAction,
    pluginConfig,
  };
};

export type { DemoReleaseController };
