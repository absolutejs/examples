import type {
  RAGAdminActionRecord,
  RAGAdminJobRecord,
  RAGAnswerGroundingEvaluationCaseResult,
  RAGAnswerGroundingEvaluationHistory,
  RAGAnswerGroundingEvaluationCaseDifficultyEntry,
  RAGAnswerGroundingEvaluationLeaderboardEntry,
  RAGAnswerGroundingEvaluationResponse,
  RAGCorpusHealth,
  RAGChunkGraphNavigation,
  RAGChunkGraphNode,
  RAGChunkGraphSectionGroup,
  RAGCitation,
  RAGEvaluationCaseResult,
  RAGEvaluationHistory,
  RAGEvaluationInput,
  RAGEvaluationLeaderboardEntry,
  RAGEvaluationResponse,
  RAGEvaluationSuite,
  RAGRerankerComparison,
  RAGLabelValueRow,
  RAGRerankerComparisonEntry,
  RAGBackendCapabilities,
  RAGDocumentChunk,
  RAGDocumentChunkPreview,
  RAGDocumentUploadIngestInput,
  RAGExtractorReadiness,
  RAGGroundedAnswer,
  RAGGroundedAnswerPart,
  RAGGroundedAnswerSectionSummary,
  RAGGroundingReference,
  RAGRetrievalReleaseIncidentRecord,
  RAGRetrievalTrace,
  RAGSectionRetrievalDiagnostic,
  RAGSource,
  RAGSourceSummary,
  RAGSyncSourceRecord,
  RAGVectorStoreStatus,
} from "@absolutejs/rag";
import type {
  RAGAnswerGroundingCaseDifficultyHistory,
  RAGRetrievalComparison,
  RAGRetrievalComparisonEntry,
} from "@absolutejs/rag";
import {
  buildRAGAdminActionPresentations,
  buildRAGAdminJobPresentations,
  buildRAGAnswerGroundingCaseSnapshotPresentations,
  buildRAGAnswerGroundingHistoryPresentation,
  buildRAGCorpusHealthPresentation,
  buildRAGComparisonTraceDiffRows,
  buildRAGComparisonTraceSummaryRows,
  buildRAGEvaluationCaseTracePresentations,
  buildRAGEvaluationHistoryPresentation,
  buildRAGEvaluationHistoryRows,
  buildRAGGroundingProviderPresentations,
  buildRAGGroundingProviderOverviewPresentation,
  buildRAGGroundingProviderCaseComparisonPresentations,
  buildRAGQualityOverviewPresentation,
  buildRAGReadinessPresentation,
  buildRAGRerankerComparisonOverviewPresentation,
  buildRAGRerankerComparisonPresentations,
  buildRAGRetrievalComparisonOverviewPresentation,
  buildRAGRetrievalComparisonPresentations,
  buildRAGRetrievalTracePresentation,
  buildRAGSectionRetrievalDiagnostics,
  buildRAGSyncOverviewPresentation,
  buildRAGSyncSourcePresentation,
} from "@absolutejs/rag/ui";
import { createRAGEvaluationSuite } from "@absolutejs/rag/client";
import {
  buildRAGChunkGraph,
  buildRAGChunkGraphNavigation,
} from "@absolutejs/rag/client/ui";

export type RagDocumentKind = "seed" | "custom";
export type DemoBackendMode =
  | "sqlite-native"
  | "sqlite-fallback"
  | "postgres"
  | "pinecone";
export type DemoReleaseWorkspace = "alpha" | "beta";
export type DemoFrameworkId =
  | "react"
  | "svelte"
  | "vue"
  | "angular"
  | "html"
  | "htmx";
export type DemoContentFormat = "text" | "markdown" | "html";
export type DemoChunkingStrategy =
  | "paragraphs"
  | "sentences"
  | "fixed"
  | "source_aware";

export type DemoBackendDescriptor = {
  id: DemoBackendMode;
  label: string;
  available: boolean;
  path?: string;
  reason?: string;
};

export type DemoDocument = {
  chunkCount: number;
  chunkSize: number;
  chunkStrategy: DemoChunkingStrategy;
  createdAt: number;
  format: DemoContentFormat;
  updatedAt: number;
  id: string;
  kind: RagDocumentKind;
  source: string;
  text: string;
  title: string;
  metadata?: Record<string, unknown>;
};

export type DemoInspectionEntry = {
  id: string;
  kind: "document" | "chunk";
  label: string;
  detail: string;
  documentId?: string;
  source?: string;
  sourceQuery?: string;
};

export type DemoChunkPreview = RAGDocumentChunkPreview;

export type DemoStatusView = {
  backend: string;
  capabilities: string[];
  chunkCount: number;
  dimensions?: number;
  documents: {
    total: number;
    byKind: Record<RagDocumentKind, number>;
  };
  native: {
    active: boolean;
    fallbackReason?: string;
    sourceLabel?: string;
  };
  reranker: {
    label: string;
    summary: string;
  };
  vectorMode: string;
  vectorModeMessage: string;
};

export type SearchResultChunk = {
  chunkId: string;
  title: string;
  source: string;
  score: number;
  metadata: Record<string, unknown>;
  text: string;
  labels?: RAGSource["labels"];
  structure?: RAGSource["structure"];
  targetId: string;
};

export type SearchResultSectionJump = {
  id: string;
  label: string;
  targetId: string;
  kind: "parent" | "sibling" | "child";
};

export type SearchResultSectionGroup = {
  id: string;
  label: string;
  summary: string;
  targetId: string;
  leadChunkId: string;
  jumps: SearchResultSectionJump[];
  chunks: SearchResultChunk[];
};

export type SearchResponse = {
  query: string;
  elapsedMs: number;
  topK: number;
  count: number;
  chunks: SearchResultChunk[];
  filter: Record<string, string>;
  storyHighlights: string[];
  attributionOverview: string[];
  sectionDiagnostics: DemoSectionDiagnostic[];
  trace?: RAGRetrievalTrace;
};

type DemoSectionDiagnostic = RAGSectionRetrievalDiagnostic & {
  peakStage?: string;
  peakCount?: number;
  finalCount?: number;
  finalRetentionRate?: number;
  dropFromPeak?: number;
  queryAttribution?: {
    mode: "primary" | "transformed" | "variant" | "mixed";
    primaryHits: number;
    transformedHits: number;
    variantHits: number;
    reasons: string[];
  };
  stageWeights?: Array<{
    stage: string;
    count: number;
    previousStage?: string;
    previousCount?: number;
    countDelta?: number;
    retentionRate?: number;
    totalScore?: number;
    stageScoreShare?: number;
    parentStageScoreShare?: number;
    stageScoreShareGap?: number;
    parentStageScoreShareGap?: number;
    stageShare: number;
    parentStageShare?: number;
    stageShareGap?: number;
    parentStageShareGap?: number;
    strongestSiblingLabel?: string;
    strongestSiblingCount?: number;
    reasons: string[];
  }>;
};

export type DemoSourceSummaryGroup = {
  id: string;
  label: string;
  targetId: string;
  summary: string;
  summaries: RAGSourceSummary[];
};

export type DemoGroundingReferenceGroup = {
  id: string;
  label: string;
  targetId: string;
  summary: string;
  references: RAGGroundingReference[];
};

export type DemoCitationGroup = {
  id: string;
  label: string;
  targetId: string;
  summary: string;
  citations: RAGCitation[];
};

export type SearchFormState = {
  query: string;
  topK: number;
  scoreThreshold: string;
  kind: "" | RagDocumentKind;
  source: string;
  documentId: string;
  nativeQueryProfile?: "" | "latency" | "balanced" | "recall";
};

export type DemoActiveRetrievalState = {
  searchForm: SearchFormState;
  scopeDriver: string;
  lastUpdatedAt?: number;
  retrievalPresetId?: string;
  benchmarkPresetId?: string;
  uploadPresetId?: string;
  streamModelKey?: string;
  streamPrompt?: string;
};

export type AddFormState = {
  id: string;
  title: string;
  source: string;
  format: DemoContentFormat;
  chunkStrategy: DemoChunkingStrategy;
  text: string;
};

export type DemoBenchmarkCategory =
  | "base"
  | "transformed"
  | "mixed"
  | "competition"
  | "rerank"
  | "routing";

export type DemoEvaluationPreset = {
  id: string;
  label: string;
  description: string;
  query: string;
  expectedSources: string[];
  topK?: number;
  benchmarkCategory?: DemoBenchmarkCategory;
  retrievalPresetId?: string;
};

export type DemoUploadPreset = {
  id: string;
  label: string;
  description: string;
  fileName: string;
  fixturePath: string;
  contentType: string;
  query: string;
  expectedSources: string[];
  source: string;
  title: string;
};

export type DemoAIModelOption = {
  key: string;
  providerId: string;
  providerLabel: string;
  modelId: string;
  label: string;
};

export const demoReleaseWorkspaces: Array<{
  id: DemoReleaseWorkspace;
  label: string;
  description: string;
}> = [
  {
    id: "alpha",
    label: "Alpha workspace",
    description:
      "Shows the alpha corpus group inside the shared release-control group.",
  },
  {
    id: "beta",
    label: "Beta workspace",
    description:
      "Shows the beta corpus group inside the same shared release-control group.",
  },
];

export type DemoAIModelCatalogResponse = {
  defaultModelKey: string | null;
  models: DemoAIModelOption[];
};

export type DemoReleaseAction = {
  id: string;
  label: string;
  description: string;
  method: "POST";
  path: string;
  payload: {
    actionId: string;
    workspace?: DemoReleaseWorkspace;
  };
  tone?: "primary" | "neutral" | "danger";
};

type DemoReleaseClassification = NonNullable<
  RAGRetrievalReleaseIncidentRecord["classification"]
>;

export type DemoRetrievalQualityResponse = {
  suite: RAGEvaluationSuite;
  comparison: RAGRerankerComparison;
  retrievalComparison: RAGRetrievalComparison;
  rerankerComparison: RAGRerankerComparison;
  groundingEvaluation: RAGAnswerGroundingEvaluationResponse;
  providerGroundingComparison: DemoGroundingProviderComparison | null;
  providerGroundingHistories: Record<
    string,
    RAGAnswerGroundingEvaluationHistory
  >;
  providerGroundingDifficultyHistory?: RAGAnswerGroundingCaseDifficultyHistory;
  retrievalHistories: Record<string, RAGEvaluationHistory>;
  rerankerHistories: Record<string, RAGEvaluationHistory>;
};

export type DemoReleaseOpsResponse = {
  workspace?: {
    id: DemoReleaseWorkspace;
    label: string;
    description: string;
    corpusGroupKey: string;
  };
  actions?: DemoReleaseAction[];
  scenario?: {
    id: "blocked-general" | "blocked-multivector" | "ready" | "completed";
    label: string;
    description: string;
    groupKey?: string;
    laneState?: "blocked" | "ready" | "completed";
    classification?: DemoReleaseClassification;
  };
  recentReleaseDecisions?: Array<{
    corpusGroupKey?: string;
    decidedAt?: number;
    kind?: string;
    notes?: string;
    targetRolloutLabel?: string;
  }>;
  releaseStatus?: {
    retrievalComparisons?: {
      configured?: boolean;
      latest?: {
        groupKey?: string;
        corpusGroupKey?: string;
        id?: string;
        label?: string;
        finishedAt?: number;
        bestByLowestRuntimeCandidateBudgetExhaustedCases?: string;
        bestByLowestRuntimeUnderfilledTopKCases?: string;
      };
      adaptiveNativePlannerBenchmark?: {
        suiteId: string;
        suiteLabel: string;
        recommendedGroupKey?: string;
        recommendedTags?: string[];
        snapshotHistoryPresentation?: {
          summary: string;
          rows: Array<{ label: string; value: string }>;
          snapshots: Array<{
            id: string;
            label: string;
            summary: string;
            version: number;
            rows: Array<{ label: string; value: string }>;
          }>;
        };
      };
      activeBaselines?: Array<{
        corpusGroupKey?: string;
        approvedAt?: number;
        approvedBy?: string;
        id: string;
        label: string;
        retrievalId: string;
        rolloutLabel?: string;
        sourceRunId?: string;
        version: number;
      }>;
      alerts?: Array<{
        classification?: DemoReleaseClassification;
        kind: string;
        message?: string;
        severity?: string;
        targetRolloutLabel?: string;
      }>;
      promotionCandidates?: Array<{
        groupKey?: string;
        label?: string;
        baselineRetrievalId?: string;
        candidateRetrievalId?: string;
        delta?: {
          averageF1Delta: number;
          elapsedMsDelta: number;
          passingRateDelta: number;
        };
        reasons: string[];
        ready: boolean;
        releaseVerdictStatus?: string;
        reviewStatus: string;
        sourceRunId?: string;
        targetRolloutLabel?: string;
      }>;
      readyToPromoteByLane?: Array<{
        baselineRetrievalId?: string;
        candidateRetrievalId?: string;
        classification?: DemoReleaseClassification;
        gateStatus?: string;
        ready: boolean;
        reasons: string[];
        requiresApproval?: boolean;
        requiresOverride?: boolean;
        targetRolloutLabel?: string;
      }>;
      releaseLaneRecommendations?: Array<{
        classification?: DemoReleaseClassification;
        groupKey: string;
        reasons?: string[];
        recommendedAction: string;
        recommendedActionReasons?: string[];
        remediationActions?: Array<{
          kind: string;
          label: string;
          method: string;
          path: string;
        }>;
        targetRolloutLabel?: string;
      }>;
      recentDecisions?: Array<{
        decidedAt?: number;
        kind?: string;
        notes?: string;
        targetRolloutLabel?: string;
      }>;
      recentRuns?: Array<{
        groupKey?: string;
        corpusGroupKey?: string;
        id?: string;
        label?: string;
        finishedAt?: number;
        decisionSummary?: {
          delta?: {
            averageF1Delta?: number;
            elapsedMsDelta?: number;
            passingRateDelta?: number;
            multiVectorCollapsedCasesDelta?: number;
            multiVectorLexicalHitCasesDelta?: number;
            multiVectorVectorHitCasesDelta?: number;
          };
          gate?: {
            status?: string;
            reasons?: string[];
          };
        };
      }>;
      recentReleaseLanePolicyHistory?: Array<{
        corpusGroupKey?: string;
        approvalMaxAgeMs?: number;
        changeKind?: string;
        groupKey?: string;
        recordedAt?: number;
        requireApprovalBeforePromotion?: boolean;
        rolloutLabel?: string;
      }>;
      recentBaselineGatePolicyHistory?: Array<{
        corpusGroupKey?: string;
        changeKind?: string;
        groupKey?: string;
        policy?: {
          minAverageF1Delta?: number;
          minPassingRateDelta?: number;
          severity?: string;
        };
        recordedAt?: number;
        rolloutLabel?: string;
      }>;
      recentReleaseLaneEscalationPolicyHistory?: Array<{
        corpusGroupKey?: string;
        changeKind?: string;
        gateFailureSeverity?: string;
        groupKey?: string;
        openIncidentSeverity?: string;
        recordedAt?: number;
        targetRolloutLabel?: string;
      }>;
      recentHandoffAutoCompletePolicyHistory?: Array<{
        corpusGroupKey?: string;
        changeKind?: string;
        enabled?: boolean;
        groupKey?: string;
        maxApprovedDecisionAgeMs?: number;
        recordedAt?: number;
        targetRolloutLabel?: string;
      }>;
    };
  };
  incidentStatus?: {
    incidentSummary?: {
      acknowledgedOpenCount: number;
      latestTriggeredAt?: number;
      openCount: number;
      resolvedCount?: number;
      unacknowledgedOpenCount: number;
    };
    incidentClassificationSummary?: {
      openGeneralCount: number;
      openMultiVectorCount: number;
      openRuntimeCount?: number;
      resolvedGeneralCount: number;
      resolvedMultiVectorCount: number;
      resolvedRuntimeCount?: number;
      totalGeneralCount: number;
      totalMultiVectorCount: number;
      totalRuntimeCount?: number;
    };
    recentIncidents?: Array<{
      classification?: DemoReleaseClassification;
      groupKey?: string;
      id?: string;
      acknowledgedAt?: number;
      acknowledgedBy?: string;
      kind: string;
      message: string;
      resolvedAt?: number;
      severity: string;
      status: string;
      targetRolloutLabel?: string;
      triggeredAt: number;
    }>;
  };
  remediationStatus?: {
    incidentClassificationSummary?: {
      openGeneralCount: number;
      openMultiVectorCount: number;
      openRuntimeCount?: number;
      resolvedGeneralCount: number;
      resolvedMultiVectorCount: number;
      resolvedRuntimeCount?: number;
      totalGeneralCount: number;
      totalMultiVectorCount: number;
      totalRuntimeCount?: number;
    };
    incidentRemediationExecutionSummary?: {
      guardrailBlockedCount: number;
      mutationSkippedReplayCount: number;
      replayCount: number;
      replayRate: number;
    };
    recentIncidentRemediationDecisions?: Array<{
      decidedAt?: number;
      remediationKind?: string;
      status?: string;
    }>;
    recentIncidentRemediationExecutions?: Array<{
      action?: { kind?: string };
      blockedByGuardrail?: boolean;
      code?: string;
      executedAt?: number;
      guardrailKind?: string;
      idempotentReplay?: boolean;
      mutationSkipped?: boolean;
    }>;
  };
  driftStatus?: {
    handoffDriftCountsByLane?: Array<{
      countsByKind: Record<string, number | undefined>;
      targetRolloutLabel?: string;
      totalCount: number;
    }>;
  };
  handoffStatus?: {
    handoffs?: Array<{
      candidateRetrievalId?: string;
      groupKey: string;
      readyForHandoff: boolean;
      reasons: string[];
      sourceBaselineRetrievalId?: string;
      sourceRolloutLabel: string;
      targetBaselineRetrievalId?: string;
      targetReadiness?: {
        gateStatus?: string;
        ready: boolean;
        reasons: string[];
        reviewStatus?: string;
        sourceRunId?: string;
      };
      targetRolloutLabel: string;
    }>;
    decisions?: Array<{
      decidedAt?: number;
      kind?: string;
      notes?: string;
      targetRolloutLabel?: string;
    }>;
    autoComplete?: Array<{
      approvalExpiresAt?: number;
      candidateRetrievalId?: string;
      latestApprovedAt?: number;
      reasons: string[];
      safe: boolean;
      sourceRunId?: string;
      targetRolloutLabel: string;
    }>;
    incidentSummary?: {
      acknowledgedOpenCount?: number;
      openCount?: number;
      resolvedCount?: number;
      staleOpenCount?: number;
      unacknowledgedOpenCount?: number;
    };
    incidents?: Array<{
      acknowledgedAt?: number;
      groupKey?: string;
      id?: string;
      kind?: string;
      message?: string;
      resolvedAt?: number;
      severity?: string;
      status?: string;
      targetRolloutLabel?: string;
      triggeredAt?: number;
    }>;
    recentHistory?: Array<{
      action?: string;
      groupKey?: string;
      incidentId?: string;
      notes?: string;
      recordedAt?: number;
      targetRolloutLabel?: string;
    }>;
  };
};

const formatCorpusGroupLabel = (corpusGroupKey?: string | null) =>
  corpusGroupKey ? `corpus ${corpusGroupKey}` : undefined;

export const buildDemoReleasePanelState = (
  releaseData: DemoReleaseOpsResponse | null | undefined,
) => {
  const activeBaselines =
    releaseData?.releaseStatus?.retrievalComparisons?.activeBaselines ?? [];
  const formatGovernanceClassificationLabel = (
    classification?: DemoReleaseClassification,
  ) =>
    classification === "multivector"
      ? "multivector regression"
      : classification === "runtime"
        ? "runtime regression"
        : classification === "general"
          ? "general regression"
          : undefined;
  const laneReadiness = (
    releaseData?.releaseStatus?.retrievalComparisons?.readyToPromoteByLane ?? []
  ).map((entry) => ({
    ...entry,
    classificationLabel: formatGovernanceClassificationLabel(
      entry.classification,
    ),
  }));
  const releaseRecommendations = (
    releaseData?.releaseStatus?.retrievalComparisons
      ?.releaseLaneRecommendations ?? []
  ).map((entry) => ({
    ...entry,
    classificationLabel: formatGovernanceClassificationLabel(
      entry.classification,
    ),
    reasons: entry.reasons ?? entry.recommendedActionReasons ?? [],
    remediationActions: entry.remediationActions ?? [],
  }));
  const releaseCandidates = (
    releaseData?.releaseStatus?.retrievalComparisons?.promotionCandidates ?? []
  ).map((entry) => ({
    ...entry,
    classification: entry.reasons?.some((reason) =>
      reason.toLowerCase().includes("multivector"),
    )
      ? "multivector"
      : "general",
    classificationLabel: formatGovernanceClassificationLabel(
      entry.reasons?.some((reason) =>
        reason.toLowerCase().includes("multivector"),
      )
        ? "multivector"
        : "general",
    ),
  }));
  const releaseAlerts = (
    releaseData?.releaseStatus?.retrievalComparisons?.alerts ?? []
  ).map((entry) => ({
    ...entry,
    classificationLabel: formatGovernanceClassificationLabel(
      entry.classification,
    ),
  }));
  const releasePolicyHistory =
    releaseData?.releaseStatus?.retrievalComparisons
      ?.recentReleaseLanePolicyHistory ?? [];
  const baselineGatePolicyHistory =
    releaseData?.releaseStatus?.retrievalComparisons
      ?.recentBaselineGatePolicyHistory ?? [];
  const releaseEscalationPolicyHistory =
    releaseData?.releaseStatus?.retrievalComparisons
      ?.recentReleaseLaneEscalationPolicyHistory ?? [];
  const handoffPolicyHistory =
    releaseData?.releaseStatus?.retrievalComparisons
      ?.recentHandoffAutoCompletePolicyHistory ?? [];
  const handoffs = releaseData?.handoffStatus?.handoffs ?? [];
  const handoffDecisions = releaseData?.handoffStatus?.decisions ?? [];
  const handoffAutoComplete = releaseData?.handoffStatus?.autoComplete ?? [];
  const handoffIncidents = (releaseData?.handoffStatus?.incidents ?? []).filter(
    (entry) => entry.targetRolloutLabel === "stable",
  );
  const handoffIncidentHistory = (
    releaseData?.handoffStatus?.recentHistory ?? []
  ).filter((entry) => entry.targetRolloutLabel === "stable");
  const stableBaseline = activeBaselines.find(
    (entry) => entry.rolloutLabel === "stable",
  );
  const canaryBaseline = activeBaselines.find(
    (entry) => entry.rolloutLabel === "canary",
  );
  const stableReadiness = laneReadiness.find(
    (entry) => entry.targetRolloutLabel === "stable",
  );
  const canaryReadiness = laneReadiness.find(
    (entry) => entry.targetRolloutLabel === "canary",
  );
  const stableHandoff = handoffs.find(
    (entry) => entry.targetRolloutLabel === "stable",
  );
  const stableHandoffDecision = handoffDecisions
    .filter((entry) => entry.targetRolloutLabel === "stable")
    .sort((left, right) => (right.decidedAt ?? 0) - (left.decidedAt ?? 0))[0];
  const stableHandoffAutoComplete = handoffAutoComplete.find(
    (entry) => entry.targetRolloutLabel === "stable",
  );
  const stableHandoffDrift = (
    releaseData?.driftStatus?.handoffDriftCountsByLane ?? []
  ).find((entry) => entry.targetRolloutLabel === "stable");
  const stableHandoffIncidentSummary =
    releaseData?.handoffStatus?.incidentSummary;
  const stableHandoffIncidentSummaryLabel = stableHandoffIncidentSummary
    ? `${stableHandoffIncidentSummary.openCount ?? 0} open · ${stableHandoffIncidentSummary.acknowledgedOpenCount ?? 0} acknowledged · ${stableHandoffIncidentSummary.resolvedCount ?? 0} resolved`
    : "No handoff incidents";
  const laneReadinessEntries = [canaryReadiness, stableReadiness].filter(
    (entry): entry is NonNullable<typeof entry> => Boolean(entry),
  );

  const policyHistoryEntries = [
    ...releasePolicyHistory.map((entry, index) => ({
      id: `release-policy-${entry.rolloutLabel ?? "lane"}-${entry.recordedAt ?? index}-${index}`,
      recordedAt: entry.recordedAt ?? 0,
      title: `release ${entry.rolloutLabel ?? "lane"} · ${entry.changeKind ?? "snapshot"}`,
      detail: [
        entry.requireApprovalBeforePromotion === true
          ? "approval required"
          : entry.requireApprovalBeforePromotion === false
            ? "approval open"
            : undefined,
        typeof entry.approvalMaxAgeMs === "number"
          ? `ttl ${(entry.approvalMaxAgeMs / 3600000).toFixed(entry.approvalMaxAgeMs % 3600000 === 0 ? 0 : 1)}h`
          : undefined,
        formatCorpusGroupLabel(entry.corpusGroupKey),
        entry.recordedAt ? formatDate(entry.recordedAt) : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
    ...baselineGatePolicyHistory.map((entry, index) => ({
      id: `gate-policy-${entry.rolloutLabel ?? "lane"}-${entry.recordedAt ?? index}-${index}`,
      recordedAt: entry.recordedAt ?? 0,
      title: `gate ${entry.rolloutLabel ?? "lane"} · ${entry.changeKind ?? "snapshot"}`,
      detail: [
        entry.policy?.severity ? `${entry.policy.severity} gate` : undefined,
        typeof entry.policy?.minAverageF1Delta === "number"
          ? `f1 ${entry.policy.minAverageF1Delta}`
          : undefined,
        typeof entry.policy?.minPassingRateDelta === "number"
          ? `pass ${entry.policy.minPassingRateDelta}`
          : undefined,
        formatCorpusGroupLabel(entry.corpusGroupKey),
        entry.recordedAt ? formatDate(entry.recordedAt) : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
    ...releaseEscalationPolicyHistory.map((entry, index) => ({
      id: `escalation-policy-${entry.targetRolloutLabel ?? "lane"}-${entry.recordedAt ?? index}-${index}`,
      recordedAt: entry.recordedAt ?? 0,
      title: `escalation ${entry.targetRolloutLabel ?? "lane"} · ${entry.changeKind ?? "snapshot"}`,
      detail: [
        entry.openIncidentSeverity
          ? `open ${entry.openIncidentSeverity}`
          : undefined,
        entry.gateFailureSeverity
          ? `gate ${entry.gateFailureSeverity}`
          : undefined,
        formatCorpusGroupLabel(entry.corpusGroupKey),
        entry.recordedAt ? formatDate(entry.recordedAt) : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
    ...handoffPolicyHistory.map((entry, index) => ({
      id: `handoff-policy-${entry.targetRolloutLabel ?? "lane"}-${entry.recordedAt ?? index}-${index}`,
      recordedAt: entry.recordedAt ?? 0,
      title: `handoff ${entry.targetRolloutLabel ?? "lane"} · ${entry.changeKind ?? "snapshot"}`,
      detail: [
        entry.enabled ? "enabled" : "disabled",
        typeof entry.maxApprovedDecisionAgeMs === "number"
          ? `ttl ${(entry.maxApprovedDecisionAgeMs / 3600000).toFixed(entry.maxApprovedDecisionAgeMs % 3600000 === 0 ? 0 : 1)}h`
          : undefined,
        formatCorpusGroupLabel(entry.corpusGroupKey),
        entry.recordedAt ? formatDate(entry.recordedAt) : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
  ]
    .filter((entry) => entry.recordedAt > 0)
    .sort((left, right) => right.recordedAt - left.recordedAt)
    .slice(0, 6);
  const policyHistorySummary =
    policyHistoryEntries.length > 0
      ? `${policyHistoryEntries.length} recent record${policyHistoryEntries.length === 1 ? "" : "s"}`
      : "No policy history recorded yet.";

  const recentIncidents = (
    releaseData?.incidentStatus?.recentIncidents ?? []
  ).map((entry) => ({
    ...entry,
    classificationLabel: formatGovernanceClassificationLabel(
      entry.classification,
    ),
  }));
  const incidentClassificationSummary = releaseData?.incidentStatus
    ?.incidentClassificationSummary ?? {
    openGeneralCount: recentIncidents.filter(
      (entry) =>
        entry.status === "open" && entry.classification !== "multivector",
    ).length,
    openMultiVectorCount: recentIncidents.filter(
      (entry) =>
        entry.status === "open" && entry.classification === "multivector",
    ).length,
    resolvedGeneralCount: recentIncidents.filter(
      (entry) =>
        entry.status === "resolved" && entry.classification !== "multivector",
    ).length,
    resolvedMultiVectorCount: recentIncidents.filter(
      (entry) =>
        entry.status === "resolved" && entry.classification === "multivector",
    ).length,
    totalGeneralCount: recentIncidents.filter(
      (entry) => entry.classification !== "multivector",
    ).length,
    totalMultiVectorCount: recentIncidents.filter(
      (entry) => entry.classification === "multivector",
    ).length,
  };
  const incidentSummary = releaseData?.incidentStatus?.incidentSummary;
  const incidentSummaryLabel = incidentSummary
    ? `${incidentSummary.openCount} open · ${incidentSummary.acknowledgedOpenCount} acknowledged · ${incidentSummary.resolvedCount ?? 0} resolved${incidentClassificationSummary.totalMultiVectorCount > 0 ? ` · ${incidentClassificationSummary.totalMultiVectorCount} multivector` : ""}`
    : "No release incidents";

  const actions = releaseData?.actions ?? [];
  const handoffActions = actions.filter((entry) =>
    entry.id.includes("handoff"),
  );
  const releaseActions = actions.filter(
    (entry) => !entry.id.includes("handoff"),
  );
  const primaryReleaseActions = releaseActions.filter(
    (entry) =>
      entry.id !== "inspect-release-status" &&
      entry.id !== "inspect-release-drift",
  );
  const secondaryReleaseActions = releaseActions.filter(
    (entry) =>
      entry.id === "inspect-release-status" ||
      entry.id === "inspect-release-drift",
  );
  const scenarioSwitchActions = {
    blockedGeneral: actions.find(
      (entry) => entry.id === "switch-to-blocked-general-scenario",
    ),
    blockedMultivector: actions.find(
      (entry) => entry.id === "switch-to-blocked-multivector-scenario",
    ),
    ready: actions.find((entry) => entry.id === "switch-to-ready-scenario"),
    completed: actions.find(
      (entry) => entry.id === "switch-to-completed-scenario",
    ),
  };
  const recentReleaseDecisions = releaseData?.recentReleaseDecisions ?? [];
  const recentReleaseRuns =
    releaseData?.releaseStatus?.retrievalComparisons?.recentRuns ?? [];
  const activeComparisonRun = recentReleaseRuns[0];
  const activeCorpusGroupKey =
    releaseData?.releaseStatus?.retrievalComparisons?.latest?.corpusGroupKey ??
    activeBaselines[0]?.corpusGroupKey ??
    recentReleaseDecisions[0]?.corpusGroupKey ??
    recentReleaseRuns[0]?.corpusGroupKey;
  const recentIncidentRemediationDecisions =
    releaseData?.remediationStatus?.recentIncidentRemediationDecisions ?? [];
  const remediationSummary =
    releaseData?.remediationStatus?.incidentRemediationExecutionSummary;

  const auditSurfaceEntries = [
    ...activeBaselines.slice(0, 2).map((entry, index) => ({
      id: `audit-baseline-${entry.rolloutLabel ?? "lane"}-${entry.id ?? index}`,
      title: `baseline ${entry.rolloutLabel ?? "lane"} · ${entry.retrievalId}`,
      detail: [
        `v${entry.version}`,
        entry.label,
        formatCorpusGroupLabel(entry.corpusGroupKey),
        entry.approvedAt ? formatDate(entry.approvedAt) : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
    ...recentReleaseDecisions.slice(0, 2).map((entry, index) => ({
      id: `audit-decision-${entry.targetRolloutLabel ?? "lane"}-${entry.decidedAt ?? index}`,
      title: `decision ${entry.targetRolloutLabel ?? "lane"} · ${(entry.kind ?? "decision").replaceAll("_", " ")}`,
      detail: [
        entry.notes,
        formatCorpusGroupLabel(entry.corpusGroupKey),
        entry.decidedAt ? formatDate(entry.decidedAt) : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
    ...recentReleaseRuns.slice(0, 2).map((entry, index) => ({
      id: `audit-history-${entry.groupKey ?? "group"}-${entry.finishedAt ?? index}`,
      title: `history ${entry.groupKey ?? "group"} · ${(entry.label ?? entry.id ?? "run").replaceAll("_", " ")}`,
      detail: [
        formatCorpusGroupLabel(entry.corpusGroupKey),
        entry.finishedAt ? formatDate(entry.finishedAt) : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
    ...recentIncidentRemediationDecisions.slice(0, 2).map((entry, index) => ({
      id: `audit-remediation-${entry.remediationKind ?? "decision"}-${entry.decidedAt ?? index}`,
      title: `remediation ${(entry.remediationKind ?? "decision").replaceAll("_", " ")} · ${entry.status ?? "recorded"}`,
      detail: [entry.decidedAt ? formatDate(entry.decidedAt) : undefined]
        .filter(Boolean)
        .join(" · "),
    })),
  ]
    .filter((entry) => entry.detail || entry.title)
    .slice(0, 8);
  const auditSurfaceSummary =
    auditSurfaceEntries.length > 0
      ? `${auditSurfaceEntries.length} audit record${auditSurfaceEntries.length === 1 ? "" : "s"}`
      : "No audit surfaces recorded yet.";

  const pollingSurfaceEntries = [
    {
      id: "poll-release-incidents",
      title: "GET /status/release/incidents",
      detail: incidentSummary
        ? `${incidentSummary.openCount} open · ${incidentSummary.acknowledgedOpenCount} acknowledged · ${incidentSummary.resolvedCount ?? 0} resolved`
        : "No release incidents",
    },
    {
      id: "poll-release-remediations",
      title: "GET /status/release/remediations",
      detail: releaseData?.remediationStatus
        ?.incidentRemediationExecutionSummary
        ? `${releaseData.remediationStatus.incidentRemediationExecutionSummary.guardrailBlockedCount} blocked · ${releaseData.remediationStatus.incidentRemediationExecutionSummary.replayCount} replays · ${(releaseData.remediationStatus.recentIncidentRemediationExecutions ?? []).length} executions`
        : `${(releaseData?.remediationStatus?.recentIncidentRemediationExecutions ?? []).length} executions`,
    },
    {
      id: "poll-handoff-incidents",
      title: "GET /status/handoffs/incidents",
      detail: stableHandoffIncidentSummary
        ? `${stableHandoffIncidentSummary.openCount ?? 0} open · ${stableHandoffIncidentSummary.acknowledgedOpenCount ?? 0} acknowledged · ${stableHandoffIncidentSummary.resolvedCount ?? 0} resolved`
        : "No handoff incidents",
    },
  ];
  const latestReleaseDecision = recentReleaseDecisions
    .slice()
    .sort((left, right) => (right.decidedAt ?? 0) - (left.decidedAt ?? 0))[0];
  const releaseDecisionHeadline =
    recentReleaseDecisions.length > 0
      ? recentReleaseDecisions
          .slice(0, 2)
          .map(
            (entry) =>
              `${entry.targetRolloutLabel ?? "lane"} ${(
                entry.kind ?? "decision"
              ).replaceAll("_", " ")}`,
          )
          .join(" · ")
      : "No release decisions recorded yet.";
  const releaseHeroMeta = [
    releaseData?.scenario?.description,
    formatCorpusGroupLabel(activeCorpusGroupKey),
  ]
    .filter(Boolean)
    .join(" · ");
  const releaseScopeNote = [
    releaseData?.scenario?.groupKey
      ? `Shared release group ${releaseData.scenario.groupKey}`
      : undefined,
    releaseData?.workspace?.corpusGroupKey
      ? `active corpus group ${releaseData.workspace.corpusGroupKey}`
      : activeCorpusGroupKey
        ? `active corpus group ${activeCorpusGroupKey}`
        : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  const handoffStateLabel =
    stableHandoffDecision?.kind === "complete"
      ? "completed"
      : stableHandoffDecision?.kind === "approve"
        ? "approved"
        : stableHandoff?.readyForHandoff
          ? "ready"
          : stableHandoff
            ? "blocked"
            : "idle";
  const handoffStateTone =
    stableHandoffDecision?.kind === "complete"
      ? "ready"
      : stableHandoffDecision?.kind === "approve"
        ? "watch"
        : stableHandoff?.readyForHandoff
          ? "watch"
          : stableHandoff
            ? "blocked"
            : "muted";

  const scenarioId = releaseData?.scenario?.id ?? "blocked-multivector";
  const releaseHero =
    stableHandoffDecision?.kind === "complete"
      ? "Canary handoff completed into the stable lane."
      : stableReadiness?.ready
        ? "Stable lane is ready to promote from the current candidate."
        : (stableReadiness?.reasons?.[0] ??
          canaryReadiness?.reasons?.[0] ??
          "Release control is tracking the current retrieval rollout state.");
  const topRecommendation =
    releaseRecommendations.find(
      (entry) => entry.targetRolloutLabel === "stable",
    ) ??
    releaseRecommendations.find(
      (entry) => entry.targetRolloutLabel === "canary",
    ) ??
    releaseRecommendations[0];
  const stableBlockedCandidateSummary =
    !stableReadiness?.ready && stableReadiness?.candidateRetrievalId
      ? `${stableReadiness.candidateRetrievalId} is blocked for stable${stableReadiness.reasons?.[0] ? ` · ${stableReadiness.reasons[0]}` : ""}`
      : undefined;

  const scenarioClassification =
    releaseData?.scenario?.classification ??
    (incidentClassificationSummary.totalMultiVectorCount > 0
      ? "multivector"
      : incidentClassificationSummary.totalGeneralCount > 0
        ? "general"
        : undefined);
  const scenarioClassificationLabel = formatGovernanceClassificationLabel(
    scenarioClassification,
  );
  const incidentClassificationDetailLines = [
    `Open multivector incidents · ${incidentClassificationSummary.openMultiVectorCount}`,
    `Open general incidents · ${incidentClassificationSummary.openGeneralCount}`,
    `Resolved multivector incidents · ${incidentClassificationSummary.resolvedMultiVectorCount}`,
    `Resolved general incidents · ${incidentClassificationSummary.resolvedGeneralCount}`,
  ];
  const policyHistoryDetailLines = [
    scenarioClassificationLabel
      ? `Current blocker class · ${scenarioClassificationLabel}`
      : undefined,
    scenarioClassification === "multivector"
      ? "Policy focus · protect multivector collapsed-parent and variant-hit coverage before stable promotion."
      : scenarioClassification === "general"
        ? "Policy focus · protect passing-rate and gate regressions before stable promotion."
        : undefined,
    stableReadiness?.reasons?.[0]
      ? `Current gate reason · ${stableReadiness.reasons[0]}`
      : undefined,
    releaseAlerts[0]?.message
      ? `Latest alert · ${releaseAlerts[0].message}`
      : undefined,
  ].filter((entry): entry is string => Boolean(entry));
  const latestRemediationExecutionLabel = (
    releaseData?.remediationStatus?.recentIncidentRemediationExecutions ?? []
  )
    .slice()
    .sort((left, right) => (right.executedAt ?? 0) - (left.executedAt ?? 0))[0];
  const remediationDetailLines = [
    scenarioClassificationLabel
      ? `Remediation track · ${scenarioClassificationLabel}`
      : undefined,
    scenarioClassification === "multivector"
      ? "Operator path · inspect multivector coverage deltas, variant-hit traces, and collapsed-parent recovery before promotion."
      : scenarioClassification === "general"
        ? "Operator path · inspect gate deltas, passing-rate drift, and readiness history before promotion."
        : undefined,
    latestRemediationExecutionLabel?.action?.kind
      ? `Latest execution · ${latestRemediationExecutionLabel.action.kind.replaceAll("_", " ")}${latestRemediationExecutionLabel.code ? ` · ${latestRemediationExecutionLabel.code}` : ""}`
      : undefined,
    remediationSummary
      ? `Guardrail posture · ${remediationSummary.guardrailBlockedCount} blocked · ${remediationSummary.replayCount} replays`
      : undefined,
  ].filter((entry): entry is string => Boolean(entry));
  const activeBlockerDeltaLines = [
    typeof activeComparisonRun?.decisionSummary?.delta?.passingRateDelta ===
    "number"
      ? `Passing-rate delta · ${activeComparisonRun.decisionSummary.delta.passingRateDelta >= 0 ? "+" : ""}${activeComparisonRun.decisionSummary.delta.passingRateDelta}`
      : undefined,
    typeof activeComparisonRun?.decisionSummary?.delta?.averageF1Delta ===
    "number"
      ? `Average F1 delta · ${activeComparisonRun.decisionSummary.delta.averageF1Delta >= 0 ? "+" : ""}${activeComparisonRun.decisionSummary.delta.averageF1Delta.toFixed(2)}`
      : undefined,
    typeof activeComparisonRun?.decisionSummary?.delta?.elapsedMsDelta ===
    "number"
      ? `Latency delta · ${activeComparisonRun.decisionSummary.delta.elapsedMsDelta >= 0 ? "+" : ""}${activeComparisonRun.decisionSummary.delta.elapsedMsDelta}ms`
      : undefined,
    typeof activeComparisonRun?.decisionSummary?.delta
      ?.multiVectorCollapsedCasesDelta === "number"
      ? `Multivector collapsed delta · ${activeComparisonRun.decisionSummary.delta.multiVectorCollapsedCasesDelta >= 0 ? "+" : ""}${activeComparisonRun.decisionSummary.delta.multiVectorCollapsedCasesDelta}`
      : undefined,
    typeof activeComparisonRun?.decisionSummary?.delta
      ?.multiVectorLexicalHitCasesDelta === "number"
      ? `Multivector lexical-hit delta · ${activeComparisonRun.decisionSummary.delta.multiVectorLexicalHitCasesDelta >= 0 ? "+" : ""}${activeComparisonRun.decisionSummary.delta.multiVectorLexicalHitCasesDelta}`
      : undefined,
    typeof activeComparisonRun?.decisionSummary?.delta
      ?.multiVectorVectorHitCasesDelta === "number"
      ? `Multivector vector-hit delta · ${activeComparisonRun.decisionSummary.delta.multiVectorVectorHitCasesDelta >= 0 ? "+" : ""}${activeComparisonRun.decisionSummary.delta.multiVectorVectorHitCasesDelta}`
      : undefined,
    activeComparisonRun?.decisionSummary?.gate?.reasons?.[0]
      ? `Gate reason · ${activeComparisonRun.decisionSummary.gate.reasons[0]}`
      : undefined,
  ].filter((entry): entry is string => Boolean(entry));
  const activeBlockerDeltaSummary =
    activeBlockerDeltaLines[0] ?? "No comparison delta recorded yet.";
  const adaptiveNativePlannerBenchmark =
    releaseData?.releaseStatus?.retrievalComparisons
      ?.adaptiveNativePlannerBenchmark;
  const benchmarkSnapshotHistory =
    adaptiveNativePlannerBenchmark?.snapshotHistoryPresentation;
  const runtimePlannerHistoryLines = [
    releaseData?.releaseStatus?.retrievalComparisons?.latest
      ?.bestByLowestRuntimeCandidateBudgetExhaustedCases
      ? `Lowest budget exhaustion winner · ${releaseData.releaseStatus.retrievalComparisons.latest.bestByLowestRuntimeCandidateBudgetExhaustedCases}`
      : undefined,
    releaseData?.releaseStatus?.retrievalComparisons?.latest
      ?.bestByLowestRuntimeUnderfilledTopKCases
      ? `Lowest underfilled TopK winner · ${releaseData.releaseStatus.retrievalComparisons.latest.bestByLowestRuntimeUnderfilledTopKCases}`
      : undefined,
    ...recentReleaseRuns.slice(0, 3).flatMap((run) => {
      const rows: string[] = [];
      if (run.decisionSummary?.gate?.reasons?.length) {
        const runtimeReasons = run.decisionSummary.gate.reasons.filter(
          (reason) => /runtime|candidate-budget|underfilled/i.test(reason),
        );
        if (runtimeReasons.length) {
          rows.push(`${run.label ?? "run"} · ${runtimeReasons[0]}`);
        }
      }
      return rows;
    }),
  ].filter((entry): entry is string => Boolean(entry));
  const runtimePlannerHistorySummary =
    runtimePlannerHistoryLines[0] ??
    "No runtime planner regressions recorded in recent release history.";
  const benchmarkSnapshotLines = [
    benchmarkSnapshotHistory?.summary
      ? `Snapshot history · ${benchmarkSnapshotHistory.summary}`
      : undefined,
    adaptiveNativePlannerBenchmark?.recommendedGroupKey
      ? `Recommended release group · ${adaptiveNativePlannerBenchmark.recommendedGroupKey}`
      : undefined,
    adaptiveNativePlannerBenchmark?.recommendedTags?.length
      ? `Recommended tags · ${adaptiveNativePlannerBenchmark.recommendedTags.join(", ")}`
      : undefined,
    ...(benchmarkSnapshotHistory?.rows ?? [])
      .slice(0, 3)
      .map((row) => `${row.label} · ${row.value}`),
  ].filter((entry): entry is string => Boolean(entry));
  const benchmarkSnapshotSummary =
    benchmarkSnapshotLines[0] ??
    "No adaptive native planner benchmark snapshots have been saved yet.";

  const releaseEvidenceDrills = [
    {
      id: "general-regression-evidence",
      label: "Run general evidence",
      summary:
        "Launches the support-policy benchmark query so the trace shows a classic stable gate regression path.",
      query: "List support policies for shipping and returns.",
      topK: 6,
      benchmarkPresetId: "support-policy-source",
      retrievalPresetId: "",
      classification: "general" as const,
      classificationLabel: formatGovernanceClassificationLabel("general"),
      expectedSource: "guide/demo.md",
      traceExpectation:
        "Trace expectation · gate reason stays general, support-policy source wins, and no multivector cue is required.",
      driver: "benchmark preset: Support policy benchmark",
      active: scenarioClassification === "general",
    },
    {
      id: "multivector-regression-evidence",
      label: "Run multivector evidence",
      summary:
        "Launches the late-interaction benchmark query so the trace shows collapsed-parent and variant-hit evidence directly.",
      query:
        "Which aurora launch packet phrase shows late interaction can match precise wording without splitting the parent document?",
      topK: 4,
      benchmarkPresetId: "multivector-late-interaction",
      retrievalPresetId: "hybrid",
      classification: "multivector" as const,
      classificationLabel: formatGovernanceClassificationLabel("multivector"),
      expectedSource: "guide/multivector-release-guide.md",
      traceExpectation:
        "Trace expectation · collapsedParents, lexicalVariantHits, and the lead multivector cue all stay visible.",
      driver: "benchmark preset: Late interaction benchmark",
      active: scenarioClassification === "multivector",
    },
  ];
  const releaseBlockerComparisonCards = [
    {
      id: "general",
      label: "General regression",
      active: scenarioClassification === "general",
      detailLines: [
        "Signal · passing-rate and stable gate regressions block promotion.",
        "Drill · List support policies for shipping and returns.",
        "Expected source · guide/demo.md",
        "Inspect · release alerts, readiness history, and gate deltas.",
      ],
    },
    {
      id: "multivector",
      label: "Multivector regression",
      active: scenarioClassification === "multivector",
      detailLines: [
        "Signal · collapsed-parent and variant-hit coverage regressions block promotion.",
        "Drill · Which aurora launch packet phrase shows late interaction can match precise wording without splitting the parent document?",
        "Expected source · guide/multivector-release-guide.md",
        "Inspect · lead multivector cue, lexicalVariantHits, and collapsedParents in the trace.",
      ],
    },
  ];
  const releaseHeroSummary =
    scenarioId === "blocked-general"
      ? `Blocked on a general stable gate${stableReadiness?.reasons?.[0] ? ` · ${stableReadiness.reasons[0]}` : " · operator triage and override are now visible."}`
      : scenarioId === "blocked-multivector"
        ? `Blocked on multivector coverage${stableReadiness?.reasons?.[0] ? ` · ${stableReadiness.reasons[0]}` : " · operator triage and variant-hit remediation are now visible."}`
        : scenarioId === "ready"
          ? `Ready to promote${stableReadiness?.candidateRetrievalId ? ` · ${stableReadiness.candidateRetrievalId} is the live stable candidate.` : " · stable is clear for promotion."}`
          : scenarioId === "completed"
            ? `Stable is already running the promoted candidate${stableBaseline?.retrievalId ? ` · ${stableBaseline.retrievalId} is active.` : "."}`
            : topRecommendation
              ? `${topRecommendation.targetRolloutLabel ?? "lane"} should ${topRecommendation.recommendedAction.replaceAll("_", " ")}${topRecommendation.reasons[0] ? ` · ${topRecommendation.reasons[0]}` : ""}`
              : incidentSummaryLabel;
  const releaseScenarioActions = [
    {
      id: "blocked-general",
      label: "General block",
      action: actions.find(
        (entry) => entry.id === "switch-to-blocked-general-scenario",
      ),
      active: scenarioId === "blocked-general",
    },
    {
      id: "blocked-multivector",
      label: "Multivector block",
      action: actions.find(
        (entry) => entry.id === "switch-to-blocked-multivector-scenario",
      ),
      active: scenarioId === "blocked-multivector",
    },
    {
      id: "ready",
      label: "Ready",
      action: scenarioSwitchActions.ready,
      active: scenarioId === "ready",
    },
    {
      id: "completed",
      label: "Completed",
      action: scenarioSwitchActions.completed,
      active: scenarioId === "completed",
    },
  ];
  const releasePathSteps = [
    {
      id: "blocked-general",
      label: "General block",
      summary: "Passing-rate gate fails and opens a classic rollout incident.",
      detail:
        "Use this branch to show generic gate regression handling without multivector-specific cues.",
      status:
        scenarioId === "blocked-general"
          ? "current"
          : scenarioId === "ready" || scenarioId === "completed"
            ? "complete"
            : "available",
      action: actions.find(
        (entry) => entry.id === "switch-to-blocked-general-scenario",
      ),
    },
    {
      id: "blocked-multivector",
      label: "Multivector block",
      summary:
        "Collapsed-parent and variant-hit coverage regress so stable promotion blocks.",
      detail:
        "Use this branch to show multivector-specific release governance and remediation steps.",
      status:
        scenarioId === "blocked-multivector"
          ? "current"
          : scenarioId === "ready" || scenarioId === "completed"
            ? "complete"
            : "available",
      action: actions.find(
        (entry) => entry.id === "switch-to-blocked-multivector-scenario",
      ),
    },
    {
      id: "ready",
      label: "Ready",
      summary: "Candidate passes stable checks and can be promoted.",
      detail:
        "Stable is clear to promote because the candidate passes the lane gate and approval policy for this seeded scenario.",
      status:
        scenarioId === "ready"
          ? "current"
          : scenarioId === "completed"
            ? "complete"
            : "available",
      action: scenarioSwitchActions.ready,
    },
    {
      id: "completed",
      label: "Completed",
      summary: "Canary handoff already landed in stable.",
      detail:
        "The handoff decision already completed and the stable baseline now points at the promoted candidate.",
      status: scenarioId === "completed" ? "current" : "available",
      action: scenarioSwitchActions.completed,
    },
  ];

  const releaseRailCallout =
    scenarioId === "completed"
      ? {
          tone: "ready",
          title: "Current success",
          message: stableBaseline?.retrievalId
            ? "Stable is already serving " + stableBaseline.retrievalId + "."
            : "Stable is already serving the promoted candidate.",
          detail: stableHandoffDecision?.decidedAt
            ? `Completed handoff · ${formatDate(stableHandoffDecision.decidedAt)}`
            : stableBaseline?.approvedAt
              ? `Active stable baseline · ${formatDate(stableBaseline.approvedAt)}`
              : undefined,
          nextStep:
            "Next step · inspect release status or reset the demo to replay the rollout path.",
        }
      : stableReadiness?.ready
        ? {
            tone: "watch",
            title: "Current success",
            message: stableReadiness.candidateRetrievalId
              ? stableReadiness.candidateRetrievalId +
                " is ready for stable promotion."
              : "Stable is ready for promotion.",
            detail: [
              stableReadiness.gateStatus
                ? `gate ${stableReadiness.gateStatus}`
                : undefined,
              stableReadiness.requiresApproval
                ? "approval still required"
                : undefined,
              stableReadiness.requiresOverride
                ? "override still required"
                : undefined,
            ]
              .filter(Boolean)
              .join(" · "),
            nextStep:
              "Next step · promote the stable candidate or complete the canary handoff.",
          }
        : {
            tone: "blocked",
            title: "Current blocker",
            message: stableReadiness?.reasons?.[0] ?? releaseHero,
            detail: [
              stableReadiness?.candidateRetrievalId
                ? `candidate ${stableReadiness.candidateRetrievalId}`
                : undefined,
              stableReadiness?.requiresApproval
                ? "explicit approval is required"
                : undefined,
              stableReadiness?.requiresOverride
                ? "override path is open"
                : undefined,
            ]
              .filter(Boolean)
              .join(" · "),
            nextStep:
              "Next step · inspect the blocker, then approve, reject, or inspect drift.",
          };

  const releaseStateBadge = {
    label: releaseData?.scenario?.label ?? "Blocked stable lane",
    tone:
      scenarioId === "completed"
        ? "ready"
        : stableReadiness?.ready
          ? "watch"
          : "blocked",
  };
  const latestReleaseActionKind = latestReleaseDecision?.kind ?? "";
  const latestReleaseAction = latestReleaseDecision
    ? {
        title: `${latestReleaseDecision.targetRolloutLabel ?? "lane"} ${(
          latestReleaseDecision.kind ?? "decision"
        ).replaceAll("_", " ")}`,
        detail: [
          latestReleaseDecision.notes,
          latestReleaseDecision.decidedAt
            ? formatDate(latestReleaseDecision.decidedAt)
            : undefined,
        ]
          .filter(Boolean)
          .join(" · "),
        nextStep:
          latestReleaseActionKind === "approve"
            ? stableReadiness?.ready
              ? "Next step · promote the stable candidate while approval is still fresh."
              : "Next step · inspect the stable gate failure before attempting promotion."
            : latestReleaseActionKind === "promote"
              ? "Next step · verify the active stable baseline or revert if the rollout regresses."
              : latestReleaseActionKind === "reject"
                ? "Next step · inspect drift or load the ready scenario to compare the approval path."
                : latestReleaseActionKind === "revert"
                  ? "Next step · inspect release status and confirm the restored stable baseline."
                  : latestReleaseActionKind === "complete"
                    ? "Next step · confirm the stable handoff result or reset the demo to replay the workflow."
                    : scenarioId === "blocked-general" ||
                        scenarioId === "blocked-multivector"
                      ? "Next step · inspect the blocker, then approve, reject, or inspect drift."
                      : scenarioId === "ready"
                        ? "Next step · promote the stable candidate or complete the canary handoff."
                        : "Next step · inspect release status to confirm the finished lane state.",
        tone:
          latestReleaseDecision.kind === "promote" ||
          latestReleaseDecision.kind === "approve"
            ? "watch"
            : latestReleaseDecision.kind === "reject" ||
                latestReleaseDecision.kind === "revert"
              ? "blocked"
              : latestReleaseDecision.kind === "complete"
                ? "ready"
                : "muted",
      }
    : undefined;
  const releaseDiagnosticsSummary = `${releaseCandidates.length} candidate${releaseCandidates.length === 1 ? "" : "s"} · ${releaseAlerts.length} alert${releaseAlerts.length === 1 ? "" : "s"} · ${stableHandoffDrift?.totalCount ?? 0} handoff drift`;

  const recentReleaseActivity = [
    ...recentReleaseDecisions.map((entry) => ({
      id: `release-activity-${entry.targetRolloutLabel ?? "lane"}-${entry.kind ?? "decision"}-${entry.decidedAt ?? 0}`,
      sortAt: entry.decidedAt ?? 0,
      laneLabel: entry.targetRolloutLabel ?? "lane",
      title: (entry.kind ?? "decision").replaceAll("_", " "),
      detail: [
        entry.notes,
        entry.decidedAt ? formatDate(entry.decidedAt) : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
      targetCardId:
        entry.kind === "complete"
          ? "release-stable-handoff-card"
          : "release-lane-readiness-card",
      tone:
        entry.kind === "promote" || entry.kind === "approve"
          ? "watch"
          : entry.kind === "reject" || entry.kind === "revert"
            ? "blocked"
            : entry.kind === "complete"
              ? "ready"
              : "muted",
    })),
    ...(releaseData?.incidentStatus?.recentIncidents ?? []).map((entry) => ({
      id: `release-activity-${entry.targetRolloutLabel ?? "lane"}-${entry.kind}-${entry.acknowledgedAt ?? entry.resolvedAt ?? entry.triggeredAt ?? 0}`,
      sortAt:
        entry.acknowledgedAt ?? entry.resolvedAt ?? entry.triggeredAt ?? 0,
      laneLabel: entry.targetRolloutLabel ?? "lane",
      title:
        typeof entry.acknowledgedAt === "number"
          ? "incident acknowledged"
          : entry.status === "resolved"
            ? "incident resolved"
            : entry.kind.replaceAll("_", " "),
      detail: [
        entry.message,
        typeof entry.acknowledgedAt === "number"
          ? formatDate(entry.acknowledgedAt)
          : entry.resolvedAt
            ? formatDate(entry.resolvedAt)
            : entry.triggeredAt
              ? formatDate(entry.triggeredAt)
              : undefined,
      ]
        .filter(Boolean)
        .join(" · "),
      targetCardId: "release-open-incidents-card",
      tone:
        typeof entry.acknowledgedAt === "number"
          ? "watch"
          : entry.status === "resolved"
            ? "ready"
            : entry.severity === "critical"
              ? "blocked"
              : "watch",
    })),
  ]
    .filter((entry) => entry.sortAt > 0)
    .sort((left, right) => right.sortAt - left.sortAt)
    .slice(0, 3);

  const laneDeltaPill =
    stableReadiness?.ready === canaryReadiness?.ready
      ? {
          label: "Lane delta",
          tone: stableReadiness?.ready
            ? "ready"
            : stableReadiness || canaryReadiness
              ? "watch"
              : "muted",
          value: stableReadiness?.ready
            ? "lanes aligned"
            : stableReadiness || canaryReadiness
              ? "both blocked"
              : "idle",
          targetCardId: undefined,
          targetActivityId: undefined,
        }
      : stableReadiness?.ready
        ? {
            label: "Lane delta",
            tone: "watch",
            value: "stable ahead",
            targetCardId: undefined,
            targetActivityId: undefined,
          }
        : {
            label: "Lane delta",
            tone: "blocked",
            value: "stable behind canary",
            targetCardId: undefined,
            targetActivityId: undefined,
          };

  const latestOperationalEvent = recentReleaseActivity[0];
  const latestIncidentByLane = new Map<
    string,
    (typeof recentReleaseActivity)[number]
  >();
  for (const entry of recentReleaseActivity) {
    if (
      entry.targetCardId !== "release-open-incidents-card" ||
      latestIncidentByLane.has(entry.laneLabel)
    ) {
      continue;
    }
    latestIncidentByLane.set(entry.laneLabel, entry);
  }
  const prioritizedIncidentEvent =
    latestIncidentByLane.get("stable") ??
    latestIncidentByLane.get("canary") ??
    Array.from(latestIncidentByLane.values())[0];
  const severityRank: Record<string, number> = {
    critical: 3,
    warning: 2,
    info: 1,
  };
  const activeIncidentPostureByLane = new Map<
    string,
    { severity: string; tone: "blocked" | "watch" | "ready" }
  >();
  for (const incident of releaseData?.incidentStatus?.recentIncidents ?? []) {
    if (incident.status === "resolved") {
      continue;
    }
    const laneLabel = incident.targetRolloutLabel ?? "lane";
    const current = activeIncidentPostureByLane.get(laneLabel);
    const nextRank = severityRank[incident.severity] ?? 0;
    const currentRank = current ? (severityRank[current.severity] ?? 0) : -1;
    if (!current || nextRank > currentRank) {
      activeIncidentPostureByLane.set(laneLabel, {
        severity: incident.severity,
        tone:
          incident.severity === "critical"
            ? "blocked"
            : incident.severity === "warning"
              ? "watch"
              : "ready",
      });
    }
  }
  const transitionPillKinds = new Set([
    "approve",
    "promote",
    "reject",
    "revert",
    "complete",
  ]);
  const operationalPillTitles = new Set([
    "incident resolved",
    "incident acknowledged",
  ]);
  const transitionPill =
    latestReleaseActionKind && transitionPillKinds.has(latestReleaseActionKind)
      ? {
          label: "Latest transition",
          tone:
            latestReleaseActionKind === "complete"
              ? "ready"
              : latestReleaseActionKind === "reject" ||
                  latestReleaseActionKind === "revert"
                ? "blocked"
                : "watch",
          value: `${latestReleaseDecision?.targetRolloutLabel ?? "lane"} ${latestReleaseActionKind}`,
          targetCardId:
            latestReleaseActionKind === "complete"
              ? "release-stable-handoff-card"
              : "release-lane-readiness-card",
          targetActivityId: latestReleaseDecision
            ? `release-activity-${latestReleaseDecision.targetRolloutLabel ?? "lane"}-${latestReleaseDecision.kind ?? "decision"}-${latestReleaseDecision.decidedAt ?? 0}`
            : undefined,
        }
      : prioritizedIncidentEvent &&
          operationalPillTitles.has(prioritizedIncidentEvent.title)
        ? {
            label: "Latest incident",
            tone: prioritizedIncidentEvent.tone,
            value: `${prioritizedIncidentEvent.laneLabel} ${prioritizedIncidentEvent.title}`,
            targetCardId: prioritizedIncidentEvent.targetCardId,
            targetActivityId: prioritizedIncidentEvent.id,
          }
        : {
            label: "Open incidents",
            tone: (incidentSummary?.openCount ?? 0) > 0 ? "blocked" : "ready",
            value: `${incidentSummary?.openCount ?? 0} open`,
            targetCardId: "release-open-incidents-card",
            targetActivityId: undefined,
          };

  const releaseRailDeltaChip = {
    tone: laneDeltaPill.tone,
    label:
      laneDeltaPill.value === "lanes aligned"
        ? "Stable matches canary"
        : laneDeltaPill.value === "stable ahead"
          ? "Stable ahead of canary"
          : laneDeltaPill.value === "stable behind canary"
            ? "Stable behind canary"
            : laneDeltaPill.value === "both blocked"
              ? "Stable and canary blocked"
              : "Lane delta idle",
  };
  const railIncidentPostureChip = {
    tone:
      (activeIncidentPostureByLane.get("stable")?.severity ?? "clear") ===
      "critical"
        ? "blocked"
        : (activeIncidentPostureByLane.get("stable")?.severity ?? "clear") ===
            "warning"
          ? "watch"
          : (activeIncidentPostureByLane.get("canary")?.severity ?? "clear") ===
              "critical"
            ? "watch"
            : (activeIncidentPostureByLane.get("canary")?.severity ??
                  "clear") === "warning"
              ? "watch"
              : "ready",
    label: `stable ${activeIncidentPostureByLane.get("stable")?.severity ?? "clear"} · canary ${activeIncidentPostureByLane.get("canary")?.severity ?? "clear"}`,
  };
  const railGateChip = {
    tone:
      stableReadiness?.ready && canaryReadiness?.ready
        ? "ready"
        : stableReadiness?.ready || canaryReadiness?.ready
          ? "watch"
          : stableReadiness || canaryReadiness
            ? "blocked"
            : "muted",
    label: `stable ${stableReadiness?.gateStatus ?? (stableReadiness?.ready ? "pass" : "idle")} · canary ${canaryReadiness?.gateStatus ?? (canaryReadiness?.ready ? "pass" : "idle")}`,
  };

  const railApprovalChip = {
    tone: stableReadiness?.requiresApproval
      ? "blocked"
      : stableReadiness?.requiresOverride
        ? "watch"
        : stableReadiness
          ? "ready"
          : "muted",
    label: stableReadiness
      ? [
          stableReadiness.requiresApproval
            ? "approval required"
            : "approval clear",
          stableReadiness.requiresOverride ? "override open" : undefined,
        ]
          .filter(Boolean)
          .join(" · ")
      : "idle",
  };

  const railRemediationChip = {
    tone: releaseData?.remediationStatus?.incidentRemediationExecutionSummary
      ?.guardrailBlockedCount
      ? "blocked"
      : releaseData?.remediationStatus?.incidentRemediationExecutionSummary
            ?.replayCount
        ? "watch"
        : releaseData?.remediationStatus?.recentIncidentRemediationExecutions
              ?.length
          ? "watch"
          : "muted",
    label: releaseData?.remediationStatus?.incidentRemediationExecutionSummary
      ? `${releaseData.remediationStatus.incidentRemediationExecutionSummary.guardrailBlockedCount} blocked · ${releaseData.remediationStatus.incidentRemediationExecutionSummary.replayCount} replays`
      : releaseData?.remediationStatus?.recentIncidentRemediationExecutions
            ?.length
        ? `${releaseData.remediationStatus.recentIncidentRemediationExecutions.length} executions`
        : "idle",
  };

  const latestReleaseUpdateAt = Math.max(
    latestReleaseDecision?.decidedAt ?? 0,
    ...(releaseData?.incidentStatus?.recentIncidents ?? []).map(
      (entry) =>
        entry.acknowledgedAt ?? entry.resolvedAt ?? entry.triggeredAt ?? 0,
    ),
    ...(
      releaseData?.remediationStatus?.recentIncidentRemediationExecutions ?? []
    ).map((entry) => entry.executedAt ?? 0),
  );
  const releaseRailUpdatedLabel =
    latestReleaseUpdateAt > 0
      ? Date.now() - latestReleaseUpdateAt < 90_000
        ? "Updated just now"
        : `Updated ${formatDate(latestReleaseUpdateAt)}`
      : "Waiting for release activity";
  const latestDecisionActivityId = latestReleaseDecision
    ? `release-activity-${latestReleaseDecision.targetRolloutLabel ?? "lane"}-${latestReleaseDecision.kind ?? "decision"}-${latestReleaseDecision.decidedAt ?? 0}`
    : undefined;
  const latestIncidentEvent = recentReleaseActivity.find(
    (entry) =>
      entry.targetCardId === "release-open-incidents-card" &&
      entry.sortAt === latestReleaseUpdateAt,
  );
  const latestRemediationExecution = (
    releaseData?.remediationStatus?.recentIncidentRemediationExecutions ?? []
  ).find((entry) => (entry.executedAt ?? 0) === latestReleaseUpdateAt);
  const releaseRailUpdateSource =
    latestReleaseDecision?.decidedAt === latestReleaseUpdateAt
      ? {
          label: `Decision: ${latestReleaseDecision?.targetRolloutLabel ?? "lane"} ${latestReleaseActionKind ?? "update"}`,
          tone:
            latestReleaseActionKind === "reject" ||
            latestReleaseActionKind === "revert"
              ? "blocked"
              : latestReleaseActionKind === "complete"
                ? "ready"
                : "watch",
          targetCardId:
            latestReleaseActionKind === "complete"
              ? "release-stable-handoff-card"
              : "release-lane-readiness-card",
          targetActivityId: latestDecisionActivityId,
        }
      : (releaseData?.incidentStatus?.recentIncidents ?? []).some(
            (entry) =>
              (entry.acknowledgedAt ??
                entry.resolvedAt ??
                entry.triggeredAt ??
                0) === latestReleaseUpdateAt,
          )
        ? {
            label: `Incident: ${latestIncidentEvent?.laneLabel ?? prioritizedIncidentEvent?.laneLabel ?? "lane"} ${latestIncidentEvent?.title ?? prioritizedIncidentEvent?.title ?? "update"}`,
            tone:
              latestIncidentEvent?.tone ??
              prioritizedIncidentEvent?.tone ??
              "watch",
            targetCardId:
              latestIncidentEvent?.targetCardId ??
              "release-open-incidents-card",
            targetActivityId: latestIncidentEvent?.id,
          }
        : (
              releaseData?.remediationStatus
                ?.recentIncidentRemediationExecutions ?? []
            ).some((entry) => (entry.executedAt ?? 0) === latestReleaseUpdateAt)
          ? {
              label: `Remediation: ${latestRemediationExecution?.action?.kind ?? "execution"}`,
              tone: "watch",
              targetCardId: "release-remediation-history-card",
              targetActivityId: undefined,
            }
          : {
              label: "Release state: snapshot",
              tone: "muted",
              targetCardId: "release-lane-readiness-card",
              targetActivityId: undefined,
            };
  const releaseDiagnosticsUpdatedLabel =
    latestReleaseUpdateAt > 0
      ? `Diagnostics snapshot · ${releaseRailUpdatedLabel.replace(/^Updated\s*/, "")}`
      : "Diagnostics snapshot · waiting for release activity";

  const stableReadinessStatSummary = stableReadiness
    ? stableReadiness.ready
      ? stableReadiness.candidateRetrievalId
        ? `candidate ${stableReadiness.candidateRetrievalId} ready for stable`
        : "stable candidate is ready"
      : `${stableReadiness.classificationLabel ? `${stableReadiness.classificationLabel} · ` : ""}${stableReadiness.reasons[0] ?? "stable gate is blocking promotion"}`
    : "No stable lane readiness snapshot available.";
  const remediationGuardrailSummary = remediationSummary
    ? remediationSummary.guardrailBlockedCount > 0
      ? `${remediationSummary.guardrailBlockedCount} blocked · execution history below`
      : remediationSummary.replayCount > 0
        ? `${remediationSummary.replayCount} replays · execution history below`
        : "execution history below"
    : "Execution history will appear after remediation workflows run.";

  const stableHandoffDisplayReasons = (stableHandoff?.reasons ?? [])
    .filter((reason) => !/approval|override/i.test(reason))
    .slice(0, 1);
  const stableHandoffAutoCompleteLabel = stableHandoffAutoComplete
    ? stableHandoffAutoComplete.safe
      ? "auto-complete safe"
      : "auto-complete blocked"
    : undefined;

  const incidentPosturePill = {
    label: "Incident posture",
    tone:
      (activeIncidentPostureByLane.get("stable")?.severity ?? "clear") ===
      "critical"
        ? "blocked"
        : (activeIncidentPostureByLane.get("stable")?.severity ?? "clear") ===
            "warning"
          ? "watch"
          : (activeIncidentPostureByLane.get("canary")?.severity ?? "clear") ===
              "critical"
            ? "watch"
            : (activeIncidentPostureByLane.get("canary")?.severity ??
                  "clear") === "warning"
              ? "watch"
              : "ready",
    value: `${activeIncidentPostureByLane.get("stable")?.severity ?? "clear"} stable · ${activeIncidentPostureByLane.get("canary")?.severity ?? "clear"} canary`,
    targetCardId: "release-open-incidents-card",
    targetActivityId: prioritizedIncidentEvent?.id,
  };

  const releaseHeroPills = [
    {
      label: "Stable lane",
      tone: stableReadiness?.ready ? "ready" : "blocked",
      value: stableReadiness?.ready ? "ready" : "blocked",
      targetCardId: "release-lane-readiness-card",
      targetActivityId: undefined,
    },
    {
      label: "Canary lane",
      tone: canaryReadiness?.ready
        ? "ready"
        : canaryReadiness
          ? "watch"
          : "muted",
      value: canaryReadiness?.ready
        ? "ready"
        : canaryReadiness
          ? "watching"
          : "idle",
      targetCardId: "release-lane-readiness-card",
      targetActivityId: undefined,
    },
    {
      label: "Scenario",
      tone:
        scenarioId === "ready" || scenarioId === "completed"
          ? "ready"
          : "watch",
      value: releaseData?.scenario?.label ?? "default",
      targetCardId: undefined,
      targetActivityId: undefined,
    },
    transitionPill,
    incidentPosturePill,
    laneDeltaPill,
    {
      label: "Handoff",
      tone: handoffStateTone,
      value: handoffStateLabel,
      targetCardId: "release-stable-handoff-card",
      targetActivityId: undefined,
    },
  ];

  return {
    activeBaselines,
    canaryBaseline,
    canaryReadiness,
    actions,
    handoffActions,
    handoffDriftCountsByLane:
      releaseData?.driftStatus?.handoffDriftCountsByLane ?? [],
    incidentSummary,
    incidentSummaryLabel,
    laneReadiness,
    laneReadinessEntries,
    latestReleaseDecision,
    recentIncidents,
    incidentClassificationSummary,
    incidentClassificationDetailLines,
    recentIncidentRemediationExecutions:
      releaseData?.remediationStatus?.recentIncidentRemediationExecutions ?? [],
    recentReleaseDecisions,
    releaseAlerts,
    releaseCandidates,
    releaseDecisionHeadline,
    policyHistoryEntries,
    policyHistorySummary,
    policyHistoryDetailLines,
    auditSurfaceEntries,
    auditSurfaceSummary,
    pollingSurfaceEntries,
    releaseHeroMeta,
    releaseScopeNote,
    releaseActions,
    stableBlockedCandidateSummary,
    releaseDiagnosticsSummary,
    releaseStateBadge,
    latestReleaseAction,
    primaryReleaseActions,
    secondaryReleaseActions,
    releaseHero,
    releaseHeroPills,
    releaseHeroSummary,
    scenarioClassificationLabel,
    releaseRailDeltaChip,
    railIncidentPostureChip,
    railGateChip,
    railApprovalChip,
    railRemediationChip,
    releaseRailUpdateSource,
    releaseRailUpdatedLabel,
    releaseDiagnosticsUpdatedLabel,
    stableReadinessStatSummary,
    remediationGuardrailSummary,
    remediationDetailLines,
    activeBlockerDeltaSummary,
    runtimePlannerHistorySummary,
    runtimePlannerHistoryLines,
    benchmarkSnapshotSummary,
    benchmarkSnapshotLines,
    activeBlockerDeltaLines,
    releaseEvidenceDrills,
    releaseBlockerComparisonCards,
    releasePathSteps,
    releaseRailCallout,
    recentReleaseActivity,
    releaseScenarioActions,
    releaseRecommendations,
    remediationSummary:
      releaseData?.remediationStatus?.incidentRemediationExecutionSummary,
    scenario: releaseData?.scenario,
    stableBaseline,
    stableHandoff,
    handoffIncidents,
    handoffIncidentHistory,
    stableHandoffIncidentSummary,
    stableHandoffIncidentSummaryLabel,
    stableHandoffAutoComplete,
    stableHandoffAutoCompleteLabel,
    stableHandoffDisplayReasons,
    stableHandoffDecision,
    stableHandoffDrift,
    handoffStateLabel,
    handoffStateTone,
    stableReadiness,
  };
};

export type DemoGroundingProviderEntry = {
  providerKey: string;
  providerId: string;
  providerLabel: string;
  modelId: string;
  label: string;
  elapsedMs: number;
  response: RAGAnswerGroundingEvaluationResponse;
};

export type DemoGroundingProviderCaseEntry = {
  providerKey: string;
  label: string;
  status: RAGAnswerGroundingEvaluationCaseResult["status"];
  coverage: RAGAnswerGroundingEvaluationCaseResult["coverage"];
  citationF1: number;
  resolvedCitationRate: number;
  matchedIds: string[];
  missingIds: string[];
  extraIds: string[];
  answerExcerpt: string;
};

export type DemoGroundingProviderCaseComparison = {
  caseId: string;
  label: string;
  entries: DemoGroundingProviderCaseEntry[];
  summary: {
    bestByStatus?: string;
    bestByCitationF1?: string;
    bestByResolvedCitationRate?: string;
  };
};

export type DemoGroundingProviderComparison = {
  entries: DemoGroundingProviderEntry[];
  caseComparisons: DemoGroundingProviderCaseComparison[];
  difficultyLeaderboard: RAGAnswerGroundingEvaluationCaseDifficultyEntry[];
  summary: {
    bestByPassingRate?: string;
    bestByAverageCitationF1?: string;
    bestByResolvedCitationRate?: string;
    fastest?: string;
  };
};

export const demoContentFormats: DemoContentFormat[] = [
  "markdown",
  "html",
  "text",
];
export const demoChunkingStrategies: DemoChunkingStrategy[] = [
  "source_aware",
  "paragraphs",
  "sentences",
  "fixed",
];

export const demoFrameworks: Array<{ id: DemoFrameworkId; label: string }> = [
  { id: "react", label: "React" },
  { id: "svelte", label: "Svelte" },
  { id: "vue", label: "Vue" },
  { id: "angular", label: "Angular" },
  { id: "html", label: "HTML" },
  { id: "htmx", label: "HTMX" },
];

export const demoBackends: DemoBackendDescriptor[] = [
  { id: "sqlite-native", label: "SQLite Native", available: true },
  { id: "sqlite-fallback", label: "SQLite Fallback", available: true },
  { id: "postgres", label: "PostgreSQL", available: true },
  { id: "pinecone", label: "Pinecone", available: true },
];
const MAX_RECENT_QUERIES = 4;
export const DEMO_RERANKER_LABEL = "Absolute heuristic";
export const DEMO_RERANKER_SUMMARY =
  "AbsoluteJS reranks the initial vector hits with the built-in heuristic provider before rendering results.";

const isSearchFormState = (value: unknown): value is SearchFormState => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.query === "string" &&
    typeof record.topK === "number" &&
    typeof record.scoreThreshold === "string" &&
    typeof record.kind === "string" &&
    typeof record.source === "string" &&
    typeof record.documentId === "string" &&
    (typeof record.nativeQueryProfile === "string" ||
      typeof record.nativeQueryProfile === "undefined")
  );
};

const isRecentQueryEntry = (
  value: unknown,
): value is { label: string; state: SearchFormState } => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.label === "string" && isSearchFormState(record.state);
};

const isDemoActiveRetrievalState = (
  value: unknown,
): value is DemoActiveRetrievalState => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    isSearchFormState(record.searchForm) &&
    typeof record.scopeDriver === "string" &&
    (typeof record.lastUpdatedAt === "number" ||
      typeof record.lastUpdatedAt === "undefined") &&
    (typeof record.retrievalPresetId === "string" ||
      typeof record.retrievalPresetId === "undefined") &&
    (typeof record.benchmarkPresetId === "string" ||
      typeof record.benchmarkPresetId === "undefined") &&
    (typeof record.uploadPresetId === "string" ||
      typeof record.uploadPresetId === "undefined") &&
    (typeof record.streamModelKey === "string" ||
      typeof record.streamModelKey === "undefined") &&
    (typeof record.streamPrompt === "string" ||
      typeof record.streamPrompt === "undefined")
  );
};

export const getRecentQueryStateKey = (
  frameworkId: DemoFrameworkId,
  mode: DemoBackendMode,
) => `${frameworkId}:${mode}`;

export const readJsonResponse = async (response: Response) => {
  const text = await response.text();
  if (text.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

export const loadRecentQueries = (
  frameworkId: DemoFrameworkId,
  mode: DemoBackendMode,
): Promise<Array<{ label: string; state: SearchFormState }>> => {
  return fetch(`/demo/ui-state/recent-queries/${frameworkId}/${mode}`)
    .then(async (result) => {
      if (!result.ok) {
        return [];
      }

      const parsed = await readJsonResponse(result);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(isRecentQueryEntry).slice(0, MAX_RECENT_QUERIES);
    })
    .catch(() => []);
};

export const saveRecentQueries = (
  frameworkId: DemoFrameworkId,
  mode: DemoBackendMode,
  recentQueries: Array<{ label: string; state: SearchFormState }>,
) => {
  return fetch(`/demo/ui-state/recent-queries/${frameworkId}/${mode}`, {
    body: JSON.stringify(recentQueries.slice(0, MAX_RECENT_QUERIES)),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })
    .then(() => undefined)
    .catch(() => undefined);
};

export const loadActiveRetrievalState = (
  frameworkId: DemoFrameworkId,
  mode: DemoBackendMode,
): Promise<DemoActiveRetrievalState | null> => {
  return fetch(`/demo/ui-state/active-retrieval/${frameworkId}/${mode}`)
    .then(async (result) => {
      if (!result.ok) {
        return null;
      }

      const parsed = await readJsonResponse(result);
      return isDemoActiveRetrievalState(parsed) ? parsed : null;
    })
    .catch(() => null);
};

export const saveActiveRetrievalState = (
  frameworkId: DemoFrameworkId,
  mode: DemoBackendMode,
  state: DemoActiveRetrievalState,
) => {
  return fetch(`/demo/ui-state/active-retrieval/${frameworkId}/${mode}`, {
    body: JSON.stringify(state),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })
    .then(() => undefined)
    .catch(() => undefined);
};

export const buildDemoAIStreamPrompt = (modelKey: string, prompt: string) => {
  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length === 0) {
    return trimmedPrompt;
  }

  const firstColon = modelKey.indexOf(":");
  if (firstColon <= 0) {
    return trimmedPrompt;
  }

  const providerId = modelKey.slice(0, firstColon);
  const modelId = modelKey.slice(firstColon + 1);
  if (providerId.length === 0 || modelId.length === 0) {
    return trimmedPrompt;
  }

  return `${providerId}:${modelId}:${trimmedPrompt}`;
};

export const formatDemoAIModelLabel = (model: DemoAIModelOption) =>
  `${model.providerLabel} · ${model.label}`;

export const workflowChecks = [
  "Inspect the stuffed file-backed seed corpus and verify extractor metadata across PDFs, office docs, archives, images, audio, video, EPUB, email, and legacy files.",
  "Upload first-party fixture files through the extractor-backed ingest route and verify retrieval against the uploaded source path.",
  "Ingest a custom document with a chosen format and chunking strategy.",
  "Sync local folders, URL fixtures, storage-backed objects, and provider-specific mailbox threads for Gmail, Microsoft Graph, and IMAP through the same first-class knowledge-base operations surface, then switch those mailbox tiles from fixture mode to real-account mode with env credentials without changing the UI or ingestion workflow.",
  "Run retrieval and verify the returned chunk text, source label, and metadata summary match the indexed source.",
  "Stream a grounded answer from the first-class workflow primitive instead of stitching transport state by hand.",
  "Run the built-in benchmark suite and compare retrieval, reranking, citations, and missing evidence on the same page.",
  "Inspect grounded-answer coverage and reference mapping so every citation number resolves to concrete evidence.",
  "Review knowledge-base operations health, extractor readiness, and recent admin jobs from the first-class ops surface.",
  "Prove late-interaction multivector retrieval can hit phrase-level launch-checklist wording while still collapsing back to one parent chunk in the trace.",
];

export const demoEvaluationPresets: DemoEvaluationPreset[] = [
  {
    id: "support-policy-source",
    label: "Support policy benchmark",
    description:
      "Proves the benchmark can pin a customer-facing answer back to the markdown policy source.",
    query: "List support policies for shipping and returns.",
    expectedSources: ["guide/demo.md"],
  },
  {
    id: "metadata-discipline-source",
    label: "Metadata discipline benchmark",
    description:
      "Verifies metadata guidance resolves to the dedicated metadata guide instead of a nearby chunk.",
    query: "Why should metadata be stable?",
    expectedSources: ["guides/metadata.md"],
  },
  {
    id: "postgres-portability-source",
    label: "PostgreSQL parity benchmark",
    description:
      "Shows the hosted PostgreSQL backend returns the same cross-framework workflow guidance as the local adapters.",
    query: "Which frameworks stay aligned in the retrieval workflow?",
    expectedSources: ["guide/welcome.md"],
  },
  {
    id: "pdf-citation-source",
    label: "PDF page provenance benchmark",
    description:
      "Verifies native PDF extraction returns page-aware evidence so the answer can point back to the exact handbook page.",
    query:
      "Which PDF page says page-aware evidence should remain inspectable in retrieval diagnostics?",
    expectedSources: ["files/native-handbook.pdf"],
  },
  {
    id: "ocr-fallback-source",
    label: "OCR receipt benchmark",
    description:
      "Verifies scanned PDF OCR keeps receipt evidence retrievable with explicit provenance through the same workflow surface.",
    query: "Which scanned PDF receipt contains invoice INV-2048?",
    expectedSources: ["files/scanned-receipt.pdf"],
  },
  {
    id: "spreadsheet-source",
    label: "Spreadsheet benchmark",
    description:
      "Shows spreadsheet ingestion preserves sheet-aware evidence for retrieval and inspection.",
    query:
      "Which revenue forecast workbook sheet named Regional Growth tracks market expansion by territory?",
    expectedSources: ["files/revenue-forecast.xlsx"],
  },
  {
    id: "archive-source",
    label: "Archive benchmark",
    description:
      "Shows archive expansion keeps nested source paths stable for retrieval and evaluation.",
    query: "Which archive entry explains recovery procedures?",
    expectedSources: ["archives/support-bundle.zip#runbooks/recovery.md"],
  },
  {
    id: "media-source",
    label: "Media timestamp benchmark",
    description:
      "Verifies media transcripts return timestamp-aware evidence so the answer can cite the exact audio segment.",
    query:
      "Which daily standup audio timestamp 00:00 to 00:08 says retrieval, citations, evaluation, and ingest workflows stay aligned across every frontend?",
    expectedSources: ["files/daily-standup.mp3"],
  },
  {
    id: "multi-source-audit",
    label: "Multi-source audit benchmark",
    description:
      "Stresses overlapping phrasing so retrieval has to surface more than one relevant source instead of repeating near-duplicate chunks.",
    query:
      "Which sources say evidence should stay inspectable, auditable, and visible to operators reviewing an answer?",
    expectedSources: ["files/platform-overview.txt", "files/field-notes.txt"],
    topK: 6,
  },
  {
    id: "multivector-late-interaction",
    label: "Late interaction benchmark",
    description:
      "Proves multivector retrieval can match launch-checklist phrasing while still returning one parent source in the final evidence.",
    query:
      "Which aurora launch packet phrase shows late interaction can match precise wording without splitting the parent document?",
    expectedSources: ["guide/multivector-release-guide.md"],
    topK: 4,
    retrievalPresetId: "hybrid",
  },
  {
    id: "policy-metadata-pair",
    label: "Policy and metadata pair benchmark",
    description:
      "Checks whether retrieval can bring back both the customer policy source and the metadata discipline source when the query spans auditability and stable filters.",
    query:
      "Which sources say support answers stay auditable after ingest and metadata filters stay stable over time?",
    expectedSources: ["guide/demo.md", "guides/metadata.md"],
    topK: 6,
  },
  {
    id: "query-attribution-base",
    label: "Base query attribution benchmark",
    description:
      "Uses a query with no transform domain so the section diagnostics stay on the base-query path.",
    query:
      "Which sources say support answers stay auditable after ingest and metadata filters stay stable over time?",
    expectedSources: ["guide/demo.md", "guides/metadata.md"],
    topK: 6,
    benchmarkCategory: "base",
  },
  {
    id: "query-attribution-transformed",
    label: "Transformed attribution benchmark",
    description:
      "Uses framework wording that only becomes useful after the heuristic transform expands it into the seeded corpus vocabulary.",
    query: "Which framework docs and approval gates explain rollout posture?",
    expectedSources: ["files/legacy-brief.doc"],
    topK: 6,
    benchmarkCategory: "transformed",
    retrievalPresetId: "hybrid-transform",
  },
  {
    id: "query-attribution-benchmark",
    label: "Mixed attribution benchmark",
    description:
      "Uses a preserved titled-workbook query plus spreadsheet variants so the same section can show base-query and variant reinforcement together.",
    query: "Which workbook titled Regional Growth explains rollout posture?",
    expectedSources: [
      "guide/query-attribution.md",
      "files/revenue-forecast.xlsx",
    ],
    topK: 6,
    benchmarkCategory: "mixed",
    retrievalPresetId: "hybrid-transform",
  },
  {
    id: "section-competition-benchmark",
    label: "Section competition benchmark",
    description:
      "Uses nested release-guide wording so sibling sections compete and the diagnostics have to explain why one stable-lane section wins.",
    query:
      "Which stable lane section explains approval gates and incident review?",
    expectedSources: ["guide/release-hierarchy.md"],
    topK: 6,
    benchmarkCategory: "competition",
  },
  {
    id: "rerank-survival-benchmark",
    label: "Rerank survival benchmark",
    description:
      "Uses dense compliance wording so the retrieval trace shows a section survive rerank and narrow from a larger candidate set into the final winning evidence.",
    query:
      "Which source keeps archive entry paths, spreadsheet sheet names, presentation slide numbers, and email attachment labels visible in retrieval evidence?",
    expectedSources: ["cases/compliance.html"],
    topK: 6,
    benchmarkCategory: "rerank",
  },
  {
    id: "support-policy-routing-benchmark",
    label: "Support policy routing benchmark",
    description:
      "Uses explicit support and policy wording so the built-in retrieval strategy routes the query onto the support lexical path.",
    query:
      "Which support policy explains password reset and customer billing access?",
    expectedSources: ["guide/demo.md"],
    topK: 6,
    benchmarkCategory: "routing",
  },
];

export const benchmarkOutcomeRail = [
  {
    id: "base",
    label: "Base query only",
    summary: "Original wording should resolve without transform support.",
  },
  {
    id: "transformed",
    label: "Transformed only",
    summary: "Heuristic rewrite should carry the winning source.",
  },
  {
    id: "mixed",
    label: "Mixed attribution",
    summary:
      "One winning section should keep base and expanded evidence together.",
  },
  {
    id: "competition",
    label: "Section competition",
    summary: "Sibling sections should compete and expose why one section wins.",
  },
  {
    id: "rerank",
    label: "Rerank survival",
    summary:
      "One section should survive rerank and narrow from a larger candidate set into the final evidence.",
  },
  {
    id: "routing",
    label: "Routing decision",
    summary:
      "Built-in retrieval routing should switch the query onto a non-default path.",
  },
] as const;

export const resolveBenchmarkRetrievalPresetId = (presetId: string) =>
  demoEvaluationPresets.find((preset) => preset.id === presetId)
    ?.retrievalPresetId ?? "";

export const formatBenchmarkOutcomeRailLabel = (
  entry: (typeof benchmarkOutcomeRail)[number],
  activePresetId?: string,
) => {
  const activeCategory = demoEvaluationPresets.find(
    (preset) => preset.id === activePresetId,
  )?.benchmarkCategory;
  return activeCategory === entry.id ? `${entry.label} · active` : entry.label;
};

export const demoUploadPresets: DemoUploadPreset[] = [
  {
    id: "upload-native-pdf",
    label: "Upload native PDF",
    description:
      "Exercises the native PDF extractor through the published upload ingest surface.",
    fileName: "native-handbook.pdf",
    fixturePath: "files/native-handbook.pdf",
    contentType: "application/pdf",
    query: "What should remain inspectable in retrieval diagnostics?",
    expectedSources: ["uploads/native-handbook.pdf"],
    source: "uploads/native-handbook.pdf",
    title: "Uploaded native handbook PDF",
  },
  {
    id: "upload-scanned-pdf",
    label: "Upload scanned PDF",
    description:
      "Exercises the scanned PDF OCR fallback path through the published upload ingest surface.",
    fileName: "scanned-receipt.pdf",
    fixturePath: "files/scanned-receipt.pdf",
    contentType: "application/pdf",
    query: "Which invoice number appears in the scanned receipt?",
    expectedSources: ["uploads/scanned-receipt.pdf"],
    source: "uploads/scanned-receipt.pdf",
    title: "Uploaded scanned receipt PDF",
  },
  {
    id: "upload-spreadsheet",
    label: "Upload spreadsheet",
    description:
      "Exercises sheet-aware office extraction through the published upload ingest surface.",
    fileName: "revenue-forecast.xlsx",
    fixturePath: "files/revenue-forecast.xlsx",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    query:
      "Which revenue forecast workbook sheet named Regional Growth tracks market expansion by territory?",
    expectedSources: ["uploads/revenue-forecast.xlsx"],
    source: "uploads/revenue-forecast.xlsx",
    title: "Uploaded revenue forecast workbook",
  },
  {
    id: "upload-presentation",
    label: "Upload deck",
    description:
      "Exercises slide-aware presentation extraction through the published upload ingest surface.",
    fileName: "workflow-roadmap.pptx",
    fixturePath: "files/workflow-roadmap.pptx",
    contentType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    query: "Which slide explains the retrieval workflow rollout?",
    expectedSources: ["uploads/workflow-roadmap.pptx"],
    source: "uploads/workflow-roadmap.pptx",
    title: "Uploaded workflow roadmap deck",
  },
  {
    id: "upload-email",
    label: "Upload email thread",
    description:
      "Exercises email extraction and thread metadata through the published upload ingest surface.",
    fileName: "support-thread.eml",
    fixturePath: "files/support-thread.eml",
    contentType: "message/rfc822",
    query: "Who asked for workflow parity in the support thread?",
    expectedSources: ["uploads/support-thread.eml"],
    source: "uploads/support-thread.eml",
    title: "Uploaded support thread",
  },
  {
    id: "upload-image-ocr",
    label: "Upload image OCR",
    description:
      "Exercises image OCR extraction through the published upload ingest surface.",
    fileName: "receipt.jpg",
    fixturePath: "files/receipt.jpg",
    contentType: "image/jpeg",
    query: "Which invoice number appears in the receipt image?",
    expectedSources: ["uploads/receipt.jpg"],
    source: "uploads/receipt.jpg",
    title: "Uploaded receipt image",
  },
  {
    id: "upload-audio",
    label: "Upload audio",
    description:
      "Exercises media transcription through the published upload ingest surface.",
    fileName: "daily-standup.mp3",
    fixturePath: "files/daily-standup.mp3",
    contentType: "audio/mpeg",
    query:
      "Which uploaded daily standup audio timestamp 00:00 to 00:08 says retrieval, citations, evaluation, and ingest workflows stay aligned across every frontend?",
    expectedSources: ["uploads/daily-standup.mp3"],
    source: "uploads/daily-standup.mp3",
    title: "Uploaded daily standup audio",
  },
  {
    id: "upload-video",
    label: "Upload video",
    description:
      "Exercises video transcription through the published upload ingest surface.",
    fileName: "workflow-walkthrough.mp4",
    fixturePath: "files/workflow-walkthrough.mp4",
    contentType: "video/mp4",
    query: "Which source explains the workflow rollout checkpoint?",
    expectedSources: ["uploads/workflow-walkthrough.mp4"],
    source: "uploads/workflow-walkthrough.mp4",
    title: "Uploaded workflow walkthrough video",
  },
  {
    id: "upload-archive",
    label: "Upload archive",
    description:
      "Exercises archive expansion through the published upload ingest surface.",
    fileName: "support-bundle.zip",
    fixturePath: "archives/support-bundle.zip",
    contentType: "application/zip",
    query: "Which archive entry explains recovery procedures?",
    expectedSources: ["uploads/support-bundle.zip#runbooks/recovery.md"],
    source: "uploads/support-bundle.zip",
    title: "Uploaded support bundle archive",
  },
];

export const buildDemoEvaluationSuite = () =>
  createRAGEvaluationSuite({
    id: "absolutejs-rag-demo-suite",
    label: "AbsoluteJS retrieval workflow suite",
    description:
      "Saved suite covering policy docs, metadata guidance, PostgreSQL parity, PDF and OCR, spreadsheets, archives, and media transcripts.",
    input: buildDemoEvaluationInput(),
    metadata: {
      story: "retrieval-quality",
    },
  });

export const buildDemoEvaluationInput = (): RAGEvaluationInput => ({
  cases: demoEvaluationPresets.map((preset) => ({
    expectedSources: preset.expectedSources,
    id: preset.id,
    label: preset.label,
    query: preset.query,
    topK: preset.topK ?? 4,
  })),
});

export const formatEvaluationPercent = (value: number) =>
  `${(value * 100).toFixed(1)}%`;

export const formatEvaluationPassingRate = (value: number) =>
  `${value.toFixed(1)}%`;

export const formatEvaluationCaseSummary = (entry: RAGEvaluationCaseResult) =>
  [
    `${entry.status.toUpperCase()} via ${entry.mode}`,
    `matched ${entry.matchedCount}/${entry.expectedCount}`,
    `precision ${formatEvaluationPercent(entry.precision)}`,
    `recall ${formatEvaluationPercent(entry.recall)}`,
    `f1 ${entry.f1.toFixed(3)}`,
  ].join(" · ");

export const formatEvaluationMissing = (entry: RAGEvaluationCaseResult) =>
  entry.missingIds.length > 0 ? entry.missingIds.join(", ") : "none";

export const formatEvaluationExpected = (entry: RAGEvaluationCaseResult) =>
  entry.expectedIds.join(", ");

export const formatEvaluationRetrieved = (entry: RAGEvaluationCaseResult) =>
  entry.retrievedIds.join(", ");

export const formatEvaluationSummary = (response: RAGEvaluationResponse) =>
  [
    `${response.summary.passedCases}/${response.summary.totalCases} pass`,
    `precision ${formatEvaluationPercent(response.summary.averagePrecision)}`,
    `recall ${formatEvaluationPercent(response.summary.averageRecall)}`,
    `f1 ${response.summary.averageF1.toFixed(3)}`,
    `avg latency ${response.summary.averageLatencyMs.toFixed(1)}ms`,
    `passing ${formatEvaluationPassingRate(response.passingRate)}`,
  ].join(" · ");

export const formatEvaluationLeaderboardEntry = (
  entry: RAGEvaluationLeaderboardEntry,
) =>
  `#${entry.rank} · ${entry.label} · passing ${formatEvaluationPassingRate(entry.passingRate)} · f1 ${entry.averageF1.toFixed(3)} · ${entry.averageLatencyMs.toFixed(1)}ms`;

const formatSignedDelta = (value: number, digits = 1, suffix = "") =>
  `${value > 0 ? "+" : ""}${value.toFixed(digits)}${suffix}`;

const formatHistoryCaseLabels = (
  labels: Array<{ label?: string; caseId: string }>,
) =>
  labels.length > 0
    ? labels.map((entry) => entry.label ?? entry.caseId).join(", ")
    : "none";

const buildSnapshotLeadLabel = (snapshot?: Record<string, unknown>) => {
  if (!snapshot) return undefined;
  return typeof snapshot.topLocatorLabel === "string" &&
    snapshot.topLocatorLabel
    ? snapshot.topLocatorLabel
    : typeof snapshot.topContextLabel === "string" && snapshot.topContextLabel
      ? snapshot.topContextLabel
      : typeof snapshot.sourceAwareUnitScopeLabel === "string" &&
          snapshot.sourceAwareUnitScopeLabel
        ? snapshot.sourceAwareUnitScopeLabel
        : typeof snapshot.sourceAwareChunkReasonLabel === "string" &&
            snapshot.sourceAwareChunkReasonLabel
          ? snapshot.sourceAwareChunkReasonLabel
          : undefined;
};

const ensureLabeledRow = (
  rows: RAGLabelValueRow[],
  label: string,
  value: string,
) => {
  const existing = rows.find((row) => row.label === label);
  if (existing) {
    if (
      existing.value === "none" ||
      existing.value === "n/a" ||
      existing.value === "Unavailable"
    ) {
      existing.value = value;
    }
    return rows;
  }
  return [...rows, { label, value }];
};

const buildComparisonLeadCueValue = (entry: {
  caseTraceSnapshots?: unknown[];
}) => {
  const values = Array.from(
    new Set(
      (entry.caseTraceSnapshots ?? [])
        .map((snapshot) =>
          buildSnapshotLeadLabel(snapshot as Record<string, unknown>),
        )
        .filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0,
        ),
    ),
  ).slice(0, 3);

  return values.length > 0 ? values.join(" · ") : "none";
};

const buildSnapshotLeadMediaCueValue = (snapshot?: Record<string, unknown>) => {
  const speaker =
    typeof snapshot?.leadSpeakerCue === "string" && snapshot.leadSpeakerCue
      ? snapshot.leadSpeakerCue
      : undefined;
  const quotedSpeakerAttribution =
    snapshot?.leadSpeakerAttributionCue === "quoted_match"
      ? "quoted speaker match"
      : undefined;
  const channel =
    typeof snapshot?.leadChannelCue === "string" && snapshot.leadChannelCue
      ? snapshot.leadChannelCue
      : undefined;
  const quotedChannelAttribution =
    snapshot?.leadChannelAttributionCue === "quoted_match"
      ? "quoted channel match"
      : undefined;
  const continuity =
    typeof snapshot?.leadContinuityCue === "string"
      ? formatLeadContinuityCue(snapshot.leadContinuityCue)
      : undefined;
  const parts = [
    speaker ? `speaker ${speaker}` : undefined,
    quotedSpeakerAttribution,
    channel ? `channel ${channel}` : undefined,
    quotedChannelAttribution,
    continuity,
  ].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  return parts.length > 0 ? parts.join(" · ") : "none";
};

const buildComparisonLeadDriftValue = (
  entry: { caseTraceSnapshots?: unknown[] },
  leader?: { caseTraceSnapshots?: unknown[] },
) => {
  const leaderSnapshots = new Map(
    (leader?.caseTraceSnapshots ?? []).map((snapshot) => {
      const record = snapshot as Record<string, unknown>;
      return [String(record.caseId ?? ""), record] as const;
    }),
  );

  const drifts = (entry.caseTraceSnapshots ?? [])
    .map((snapshot) => {
      const record = snapshot as Record<string, unknown>;
      const caseId = String(record.caseId ?? "");
      const currentLead = buildSnapshotLeadLabel(record);
      const previousLead = buildSnapshotLeadLabel(leaderSnapshots.get(caseId));
      if (
        !caseId ||
        !currentLead ||
        !previousLead ||
        currentLead === previousLead
      )
        return undefined;
      const label =
        typeof record.label === "string" && record.label
          ? record.label
          : caseId;
      return `${label} ${previousLead}→${currentLead}`;
    })
    .filter((value): value is string => typeof value === "string")
    .slice(0, 3);

  return drifts.length > 0 ? drifts.join(" · ") : "none";
};

const buildComparisonLeadMediaCueValue = (entry: {
  caseTraceSnapshots?: unknown[];
}) => {
  const values = Array.from(
    new Set(
      (entry.caseTraceSnapshots ?? [])
        .map((snapshot) =>
          buildSnapshotLeadMediaCueValue(snapshot as Record<string, unknown>),
        )
        .filter(
          (value): value is string =>
            typeof value === "string" && value !== "none",
        ),
    ),
  ).slice(0, 3);

  return values.length > 0 ? values.join(" · ") : "none";
};

const buildComparisonLeadMediaDriftValue = (
  entry: { caseTraceSnapshots?: unknown[] },
  leader?: { caseTraceSnapshots?: unknown[] },
) => {
  const leaderSnapshots = new Map(
    (leader?.caseTraceSnapshots ?? []).map((snapshot) => {
      const record = snapshot as Record<string, unknown>;
      return [String(record.caseId ?? ""), record] as const;
    }),
  );

  const drifts = (entry.caseTraceSnapshots ?? [])
    .map((snapshot) => {
      const record = snapshot as Record<string, unknown>;
      const caseId = String(record.caseId ?? "");
      const currentLead = buildSnapshotLeadMediaCueValue(record);
      const previousLead = buildSnapshotLeadMediaCueValue(
        leaderSnapshots.get(caseId),
      );
      if (
        !caseId ||
        currentLead === "none" ||
        previousLead === "none" ||
        currentLead === previousLead
      )
        return undefined;
      const label =
        typeof record.label === "string" && record.label
          ? record.label
          : caseId;
      return `${label} ${previousLead}→${currentLead}`;
    })
    .filter((value): value is string => typeof value === "string")
    .slice(0, 3);

  return drifts.length > 0 ? drifts.join(" · ") : "none";
};

const buildHistoryLeadDriftValue = (history?: RAGEvaluationHistory) => {
  const drifts = (history?.caseTraceSnapshots ?? [])
    .map((snapshot) => {
      const record = snapshot as unknown as Record<string, unknown>;
      const caseId = String(record.caseId ?? "");
      const currentLead = buildSnapshotLeadLabel(record);
      const previousLead = buildSnapshotLeadLabel({
        topLocatorLabel: record.previousTopLocatorLabel,
        topContextLabel: record.previousTopContextLabel,
        sourceAwareUnitScopeLabel: record.previousSourceAwareUnitScopeLabel,
        sourceAwareChunkReasonLabel: record.previousSourceAwareChunkReasonLabel,
      });
      if (
        !caseId ||
        !currentLead ||
        !previousLead ||
        currentLead === previousLead
      )
        return undefined;
      const label =
        typeof record.label === "string" && record.label
          ? record.label
          : caseId;
      return `${label} ${previousLead}→${currentLead}`;
    })
    .filter((value): value is string => typeof value === "string")
    .slice(0, 3);

  return drifts.length > 0 ? drifts.join(" · ") : "none";
};

const buildSnapshotSQLitePlannerOutcomeValue = (
  snapshot?: Record<string, unknown>,
) => {
  const coverage =
    typeof snapshot?.sqliteQueryCandidateCoverage === "string" &&
    snapshot.sqliteQueryCandidateCoverage
      ? snapshot.sqliteQueryCandidateCoverage.replace(/_/g, " ")
      : undefined;
  const underfilled =
    snapshot?.sqliteQueryUnderfilledTopK === true
      ? "underfilled topK"
      : undefined;
  const budgetExhausted =
    snapshot?.sqliteQueryCandidateBudgetExhausted === true
      ? "budget exhausted"
      : undefined;
  const returned =
    typeof snapshot?.sqliteQueryReturnedCount === "number"
      ? `returned ${snapshot.sqliteQueryReturnedCount}`
      : undefined;
  const filtered =
    typeof snapshot?.sqliteQueryFilteredCandidates === "number"
      ? `filtered ${snapshot.sqliteQueryFilteredCandidates}`
      : undefined;
  const parts = [
    coverage ? `coverage ${coverage}` : undefined,
    underfilled,
    budgetExhausted,
    returned,
    filtered,
  ].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  return parts.length > 0 ? parts.join(" · ") : "none";
};

const buildComparisonSQLitePlannerOutcomeValue = (entry: {
  caseTraceSnapshots?: unknown[];
}) => {
  const values = Array.from(
    new Set(
      (entry.caseTraceSnapshots ?? [])
        .map((snapshot) =>
          buildSnapshotSQLitePlannerOutcomeValue(
            snapshot as Record<string, unknown>,
          ),
        )
        .filter(
          (value): value is string =>
            typeof value === "string" && value !== "none",
        ),
    ),
  ).slice(0, 3);

  return values.length > 0 ? values.join(" · ") : "none";
};

const buildComparisonSQLitePlannerDriftValue = (
  entry: { caseTraceSnapshots?: unknown[] },
  leader?: { caseTraceSnapshots?: unknown[] },
) => {
  const leaderSnapshots = new Map(
    (leader?.caseTraceSnapshots ?? []).map((snapshot) => {
      const record = snapshot as Record<string, unknown>;
      return [String(record.caseId ?? ""), record] as const;
    }),
  );

  const drifts = (entry.caseTraceSnapshots ?? [])
    .map((snapshot) => {
      const record = snapshot as Record<string, unknown>;
      const caseId = String(record.caseId ?? "");
      const currentValue = buildSnapshotSQLitePlannerOutcomeValue(record);
      const previousValue = buildSnapshotSQLitePlannerOutcomeValue(
        leaderSnapshots.get(caseId),
      );
      if (
        !caseId ||
        currentValue === "none" ||
        previousValue === "none" ||
        currentValue === previousValue
      )
        return undefined;
      const label =
        typeof record.label === "string" && record.label
          ? record.label
          : caseId;
      return `${label} ${previousValue}→${currentValue}`;
    })
    .filter((value): value is string => typeof value === "string")
    .slice(0, 3);

  return drifts.length > 0 ? drifts.join(" · ") : "none";
};

const buildHistorySQLitePlannerOutcomeValue = (
  history?: RAGEvaluationHistory,
) => {
  const shifts = (history?.caseTraceSnapshots ?? [])
    .map((snapshot) => {
      const record = snapshot as Record<string, unknown>;
      const caseId = String(record.caseId ?? "");
      const currentValue = buildSnapshotSQLitePlannerOutcomeValue(record);
      const previousValue = buildSnapshotSQLitePlannerOutcomeValue({
        sqliteQueryCandidateCoverage:
          record.previousSqliteQueryCandidateCoverage,
        sqliteQueryUnderfilledTopK: record.previousSqliteQueryUnderfilledTopK,
        sqliteQueryCandidateBudgetExhausted:
          record.previousSqliteQueryCandidateBudgetExhausted,
        sqliteQueryReturnedCount: record.previousSqliteQueryReturnedCount,
        sqliteQueryFilteredCandidates:
          record.previousSqliteQueryFilteredCandidates,
      });
      if (
        !caseId ||
        currentValue === "none" ||
        previousValue === "none" ||
        currentValue === previousValue
      )
        return undefined;
      const label =
        typeof record.label === "string" && record.label
          ? record.label
          : caseId;
      return `${label} ${previousValue}→${currentValue}`;
    })
    .filter((value): value is string => typeof value === "string")
    .slice(0, 3);

  return shifts.length > 0 ? shifts.join(" · ") : "none";
};

const formatValueList = (values: Array<string | number>, limit = 8) => {
  const normalized = values.map((value) => String(value));
  if (normalized.length <= limit) {
    return normalized.join(", ");
  }

  return `${normalized.slice(0, limit).join(", ")}, …`;
};

const buildSetDelta = (previous: string[] = [], current: string[] = []) => {
  const currentSet = new Set(current);
  const previousSet = new Set(previous);
  const added = [...currentSet]
    .filter((value) => !previousSet.has(value))
    .sort();
  const removed = [...previousSet]
    .filter((value) => !currentSet.has(value))
    .sort();
  return { added, removed };
};

const formatGroundingHistoryArtifactLine = (
  label: string,
  previous: string[],
  current: string[],
) => {
  const { added, removed } = buildSetDelta(previous, current);
  if (added.length === 0 && removed.length === 0) {
    return [];
  }

  return [
    `${label} added: ${formatValueList(added)}`,
    `${label} removed: ${formatValueList(removed)}`,
  ];
};

const formatGroundingHistoryArtifactDeltas = (
  history?: RAGAnswerGroundingEvaluationHistory,
) => {
  if (!history?.diff) {
    return [
      "Run the provider comparison again to compare grounding evidence changes.",
    ];
  }

  const caseDiffs = [
    ...history.diff.improvedCases,
    ...history.diff.regressedCases,
    ...history.diff.unchangedCases,
  ];

  if (caseDiffs.length === 0) {
    return ["No case-level grounding evidence changes are available yet."];
  }

  let previousReferenceCount = 0;
  let currentReferenceCount = 0;
  let previousResolvedCitationCount = 0;
  let currentResolvedCitationCount = 0;
  let previousUnresolvedCitationCount = 0;
  let currentUnresolvedCitationCount = 0;
  let answerChanges = 0;

  const allPreviousCitedIds: string[] = [];
  const allCurrentCitedIds: string[] = [];
  const allPreviousMatchedIds: string[] = [];
  const allCurrentMatchedIds: string[] = [];
  const allPreviousMissingIds: string[] = [];
  const allCurrentMissingIds: string[] = [];
  const allPreviousExtraIds: string[] = [];
  const allCurrentExtraIds: string[] = [];
  const allPreviousUngroundedRefs: string[] = [];
  const allCurrentUngroundedRefs: string[] = [];

  for (const entry of caseDiffs) {
    previousReferenceCount += entry.previousReferenceCount ?? 0;
    currentReferenceCount += entry.currentReferenceCount;
    previousResolvedCitationCount += entry.previousResolvedCitationCount ?? 0;
    currentResolvedCitationCount += entry.currentResolvedCitationCount;
    previousUnresolvedCitationCount +=
      entry.previousUnresolvedCitationCount ?? 0;
    currentUnresolvedCitationCount += entry.currentUnresolvedCitationCount;
    answerChanges += entry.answerChanged ? 1 : 0;
    allPreviousCitedIds.push(...entry.previousCitedIds);
    allCurrentCitedIds.push(...entry.currentCitedIds);
    allPreviousMatchedIds.push(...entry.previousMatchedIds);
    allCurrentMatchedIds.push(...entry.currentMatchedIds);
    allPreviousMissingIds.push(...entry.previousMissingIds);
    allCurrentMissingIds.push(...entry.currentMissingIds);
    allPreviousExtraIds.push(...entry.previousExtraIds);
    allCurrentExtraIds.push(...entry.currentExtraIds);
    allPreviousUngroundedRefs.push(
      ...entry.previousUngroundedReferenceNumbers.map(String),
    );
    allCurrentUngroundedRefs.push(
      ...entry.currentUngroundedReferenceNumbers.map(String),
    );
  }

  const lines = [
    `Reference count change: ${formatSignedDelta(currentReferenceCount - previousReferenceCount)} (${previousReferenceCount}→${currentReferenceCount})`,
    `Resolved citation count change: ${formatSignedDelta(currentResolvedCitationCount - previousResolvedCitationCount)} (${previousResolvedCitationCount}→${currentResolvedCitationCount})`,
    `Unresolved citation count change: ${formatSignedDelta(currentUnresolvedCitationCount - previousUnresolvedCitationCount)} (${previousUnresolvedCitationCount}→${currentUnresolvedCitationCount})`,
    `Cases with answer changes: ${answerChanges}/${caseDiffs.length}`,
  ];

  return [
    ...lines,
    ...formatGroundingHistoryArtifactLine(
      "Cited IDs",
      allPreviousCitedIds,
      allCurrentCitedIds,
    ),
    ...formatGroundingHistoryArtifactLine(
      "Matched IDs",
      allPreviousMatchedIds,
      allCurrentMatchedIds,
    ),
    ...formatGroundingHistoryArtifactLine(
      "Missing IDs",
      allPreviousMissingIds,
      allCurrentMissingIds,
    ),
    ...formatGroundingHistoryArtifactLine(
      "Extra IDs",
      allPreviousExtraIds,
      allCurrentExtraIds,
    ),
    ...formatGroundingHistoryArtifactLine(
      "Unresolved ref #",
      allPreviousUngroundedRefs,
      allCurrentUngroundedRefs,
    ),
  ];
};

const formatGroundingHistoryCaseChanges = (
  labels: Array<{
    label?: string;
    caseId: string;
    previousCitationF1?: number;
    currentCitationF1: number;
  }>,
) =>
  labels.length > 0
    ? labels
        .map(
          (entry) =>
            `${entry.label ?? entry.caseId} (${formatSignedDelta(entry.currentCitationF1 - (entry.previousCitationF1 ?? 0), 3)})`,
        )
        .join(", ")
    : "none";

export const formatEvaluationHistorySummary = (
  history?: RAGEvaluationHistory,
) => [formatEvaluationHistoryPresentation(history).summary];

export const formatEvaluationHistoryDiff = (history?: RAGEvaluationHistory) => {
  if (!history?.diff) {
    return ["Run the benchmark again to compare benchmark results over time."];
  }

  const lines = [
    `Pass rate change: ${formatSignedDelta(history.diff.summaryDelta.passingRate, 1, "%")}`,
    `Average F1 change: ${formatSignedDelta(history.diff.summaryDelta.averageF1, 3)}`,
    `Latency change: ${formatSignedDelta(history.diff.summaryDelta.averageLatencyMs, 1, "ms")}`,
    `Cases improved: ${formatHistoryCaseLabels(history.diff.improvedCases)}`,
    `Cases regressed: ${formatHistoryCaseLabels(history.diff.regressedCases)}`,
    `Lead evidence shift: ${buildHistoryLeadDriftValue(history)}`,
  ];

  if (history.diff.traceSummaryDelta) {
    lines.push(
      `Trace retrieval mode: ${history.diff.traceSummaryDelta.modesChanged ? "changed" : "stable"}`,
      `Trace final hits change: ${formatSignedDelta(history.diff.traceSummaryDelta.averageFinalCount, 1)}`,
      `Trace vector hits change: ${formatSignedDelta(history.diff.traceSummaryDelta.averageVectorCount, 1)}`,
      `Trace lexical hits change: ${formatSignedDelta(history.diff.traceSummaryDelta.averageLexicalCount, 1)}`,
      `Trace query rewrites change: ${formatSignedDelta(history.diff.traceSummaryDelta.transformedCases)}`,
      `Trace variant coverage change: ${formatSignedDelta(history.diff.traceSummaryDelta.variantCases)}`,
    );

    const stageDelta = Object.entries(
      history.diff.traceSummaryDelta.stageCounts ?? {},
    )
      .map(([stage, count]) => `${stage} ${formatSignedDelta(count)}`)
      .join(", ");

    if (stageDelta) {
      lines.push(`Trace stage coverage change: ${stageDelta}`);
    }
  }

  return lines;
};

export type DemoHistoryRow = RAGLabelValueRow;
export type DemoComparisonTraceRow = RAGLabelValueRow;
export type DemoComparisonPresentation = {
  id: string;
  label: string;
  summary: string;
  traceSummaryRows: RAGLabelValueRow[];
  diffLabel: string;
  diffRows: RAGLabelValueRow[];
};
export type DemoGroundingProviderPresentation = {
  id: string;
  label: string;
  summary: string;
};
export type DemoGroundingProviderCaseComparisonPresentation = {
  caseId: string;
  label: string;
  summary: string;
  rows: RAGLabelValueRow[];
};

const formatTraceModes = (modes: string[]) =>
  modes.length > 0 ? modes.join(" / ") : "n/a";

export const formatEvaluationHistoryPresentation =
  buildRAGEvaluationHistoryPresentation;
export const formatEvaluationHistoryRows = (history?: RAGEvaluationHistory) =>
  ensureLabeledRow(
    ensureLabeledRow(
      buildRAGEvaluationHistoryRows(history),
      "Lead evidence shift",
      buildHistoryLeadDriftValue(history),
    ),
    "SQLite planner outcome",
    buildHistorySQLitePlannerOutcomeValue(history),
  );
export const formatEvaluationHistoryDetails = (
  history?: RAGEvaluationHistory,
) =>
  formatEvaluationHistoryRows(history).map(
    (row) => `${row.label}: ${row.value}`,
  );

export const formatEvaluationHistoryTracePresentations = (
  history?: RAGEvaluationHistory,
) => {
  const snapshots = new Map(
    (history?.caseTraceSnapshots ?? []).map((snapshot) => [
      snapshot.caseId,
      snapshot as unknown as Record<string, unknown>,
    ]),
  );
  return buildRAGEvaluationCaseTracePresentations(history).map((entry) => {
    let rows = [...entry.rows];
    const snapshot = snapshots.get(entry.caseId);
    const leadContext =
      typeof snapshot?.topContextLabel === "string" && snapshot.topContextLabel
        ? snapshot.topContextLabel
        : undefined;
    const leadLocation =
      typeof snapshot?.topLocatorLabel === "string" && snapshot.topLocatorLabel
        ? snapshot.topLocatorLabel
        : undefined;
    const boundary =
      typeof snapshot?.sourceAwareChunkReasonLabel === "string" &&
      snapshot.sourceAwareChunkReasonLabel
        ? snapshot.sourceAwareChunkReasonLabel
        : undefined;
    const scope =
      typeof snapshot?.sourceAwareUnitScopeLabel === "string" &&
      snapshot.sourceAwareUnitScopeLabel
        ? snapshot.sourceAwareUnitScopeLabel
        : undefined;
    if (leadContext)
      rows = ensureLabeledRow(rows, "Lead evidence context", leadContext);
    if (leadLocation)
      rows = ensureLabeledRow(rows, "Lead evidence location", leadLocation);
    if (boundary)
      rows = ensureLabeledRow(rows, "Chunk boundary rule", boundary);
    if (scope) rows = ensureLabeledRow(rows, "Source scope", scope);
    return { ...entry, rows };
  });
};
export const formatEvaluationHistoryTraceSnapshots = (
  history?: RAGEvaluationHistory,
) => {
  const presentations = formatEvaluationHistoryTracePresentations(history);
  if (presentations.length > 0) {
    return presentations.map((entry) => `${entry.label}: ${entry.summary}`);
  }

  if (!history?.latestRun) {
    return ["No saved case-level retrieval traces yet."];
  }

  return [
    "Run the benchmark again with trace-aware history to capture case-level retrieval changes.",
  ];
};

export const formatComparisonTraceSummaryRows = (
  entry: RAGRerankerComparisonEntry | RAGRetrievalComparisonEntry,
) =>
  ensureLabeledRow(
    ensureLabeledRow(
      ensureLabeledRow(
        buildRAGComparisonTraceSummaryRows(entry),
        "Lead evidence",
        buildComparisonLeadCueValue(entry),
      ),
      "Lead media cues",
      buildComparisonLeadMediaCueValue(entry),
    ),
    "SQLite planner outcome",
    buildComparisonSQLitePlannerOutcomeValue(entry),
  );
export const formatComparisonTraceDiffRows = (
  entry: RAGRerankerComparisonEntry | RAGRetrievalComparisonEntry,
  leader?: RAGRerankerComparisonEntry | RAGRetrievalComparisonEntry,
) =>
  ensureLabeledRow(
    ensureLabeledRow(
      ensureLabeledRow(
        buildRAGComparisonTraceDiffRows(entry, leader),
        "Lead evidence shift vs leader",
        buildComparisonLeadDriftValue(entry, leader),
      ),
      "Lead media shift vs leader",
      buildComparisonLeadMediaDriftValue(entry, leader),
    ),
    "SQLite planner outcome shift vs leader",
    buildComparisonSQLitePlannerDriftValue(entry, leader),
  );
export const formatRetrievalComparisonPresentations = (
  comparison: RAGRetrievalComparison,
) =>
  buildRAGRetrievalComparisonPresentations(comparison).map((card, index) => ({
    ...card,
    traceSummaryRows: formatComparisonTraceSummaryRows(
      comparison.entries[index]!,
    ),
    diffRows: formatComparisonTraceDiffRows(
      comparison.entries[index]!,
      comparison.entries[0],
    ),
  }));
export const formatRerankerComparisonPresentations = (
  comparison: RAGRerankerComparison,
) =>
  buildRAGRerankerComparisonPresentations(comparison).map((card, index) => ({
    ...card,
    traceSummaryRows: formatComparisonTraceSummaryRows(
      comparison.entries[index]!,
    ),
    diffRows: formatComparisonTraceDiffRows(
      comparison.entries[index]!,
      comparison.entries[0],
    ),
  }));
export const formatRetrievalComparisonOverviewPresentation =
  buildRAGRetrievalComparisonOverviewPresentation;
export const formatRerankerComparisonOverviewPresentation =
  buildRAGRerankerComparisonOverviewPresentation;
export const buildTracePresentation = buildRAGRetrievalTracePresentation;

export const formatRerankerComparisonEntry = (
  entry: RAGRerankerComparisonEntry,
) => {
  const leadMediaCues = buildComparisonLeadMediaCueValue(entry);
  const plannerOutcome = buildComparisonSQLitePlannerOutcomeValue(entry);
  return [
    entry.label,
    `passing ${formatEvaluationPassingRate(entry.response.passingRate)}`,
    `f1 ${entry.response.summary.averageF1.toFixed(3)}`,
    `latency ${entry.response.summary.averageLatencyMs.toFixed(1)}ms`,
    leadMediaCues !== "none" ? `lead media ${leadMediaCues}` : undefined,
    plannerOutcome !== "none" ? `planner ${plannerOutcome}` : undefined,
  ]
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    )
    .join(" · ");
};

export const formatRerankerComparisonSummary = (
  comparison: RAGRerankerComparison,
) => {
  return formatRerankerComparisonOverviewPresentation(comparison).rows.map(
    (row) => `${row.label}: ${row.value}`,
  );
};

export const formatRetrievalComparisonEntry = (
  entry: RAGRetrievalComparisonEntry,
) => {
  const leadMediaCues = buildComparisonLeadMediaCueValue(entry);
  const plannerOutcome = buildComparisonSQLitePlannerOutcomeValue(entry);
  return [
    entry.label,
    `mode ${entry.retrievalMode}`,
    `passing ${formatEvaluationPassingRate(entry.response.passingRate)}`,
    `f1 ${entry.response.summary.averageF1.toFixed(3)}`,
    `latency ${entry.response.summary.averageLatencyMs.toFixed(1)}ms`,
    leadMediaCues !== "none" ? `lead media ${leadMediaCues}` : undefined,
    plannerOutcome !== "none" ? `planner ${plannerOutcome}` : undefined,
  ]
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    )
    .join(" · ");
};

export const formatRetrievalComparisonSummary = (
  comparison: RAGRetrievalComparison,
) => {
  return formatRetrievalComparisonOverviewPresentation(comparison).rows.map(
    (row) => `${row.label}: ${row.value}`,
  );
};

export const formatGroundingEvaluationSummary = (
  response: RAGAnswerGroundingEvaluationResponse,
) =>
  [
    `${response.summary.passedCases}/${response.summary.totalCases} pass`,
    `grounded ${response.summary.groundedCases}`,
    `partial ${response.summary.partiallyGroundedCases}`,
    `ungrounded ${response.summary.ungroundedCases}`,
    `resolved citations ${formatEvaluationPercent(response.summary.averageResolvedCitationRate)}`,
    `citation f1 ${response.summary.averageCitationF1.toFixed(3)}`,
    `passing ${formatEvaluationPassingRate(response.passingRate)}`,
  ].join(" · ");

export const formatGroundingEvaluationCase = (
  entry: RAGAnswerGroundingEvaluationCaseResult,
) =>
  [
    `${entry.status.toUpperCase()} via ${entry.mode}`,
    `coverage ${entry.coverage}`,
    `citations ${entry.resolvedCitationCount}/${entry.citationCount}`,
    `resolved ${formatEvaluationPercent(entry.resolvedCitationRate)}`,
    `f1 ${entry.citationF1.toFixed(3)}`,
  ].join(" · ");

export const formatGroundingEvaluationDetails = (
  entry: RAGAnswerGroundingEvaluationCaseResult,
) => [
  `expected: ${entry.expectedIds.join(", ") || "none"}`,
  `cited: ${entry.citedIds.join(", ") || "none"}`,
  `missing: ${entry.missingIds.join(", ") || "none"}`,
  `extra: ${entry.extraIds.join(", ") || "none"}`,
  `unresolved citations: ${entry.unresolvedCitationCount}`,
];

export const formatGroundingProviderEntry = (
  entry: DemoGroundingProviderEntry,
) =>
  [
    entry.label,
    `passing ${formatEvaluationPassingRate(entry.response.passingRate)}`,
    `citation f1 ${entry.response.summary.averageCitationF1.toFixed(3)}`,
    `resolved ${formatEvaluationPercent(entry.response.summary.averageResolvedCitationRate)}`,
    `latency ${entry.elapsedMs.toFixed(1)}ms`,
  ].join(" · ");

export const formatGroundingProviderSummary = (
  comparison: DemoGroundingProviderComparison,
) =>
  formatGroundingProviderOverviewPresentation(comparison).rows.map(
    (row) => `${row.label}: ${row.value}`,
  );

export const formatGroundingProviderCaseEntry = (
  entry: DemoGroundingProviderCaseEntry,
) =>
  [
    entry.label,
    entry.status.toUpperCase(),
    `f1 ${entry.citationF1.toFixed(3)}`,
    `resolved ${formatEvaluationPercent(entry.resolvedCitationRate)}`,
    `matched ${entry.matchedIds.join(", ") || "none"}`,
    `missing ${entry.missingIds.join(", ") || "none"}`,
    `extra ${entry.extraIds.join(", ") || "none"}`,
  ].join(" · ");

export const formatGroundingProviderCaseSummary = (
  comparison: DemoGroundingProviderCaseComparison,
) => {
  const resolveLabel = (key?: string) =>
    comparison.entries.find((entry) => entry.providerKey === key)?.label ??
    key ??
    "n/a";

  return [
    `Best grounded: ${resolveLabel(comparison.summary.bestByStatus)}`,
    `Best citation F1: ${resolveLabel(comparison.summary.bestByCitationF1)}`,
    `Best resolved citations: ${resolveLabel(comparison.summary.bestByResolvedCitationRate)}`,
  ];
};

export const formatGroundingProviderPresentations =
  buildRAGGroundingProviderPresentations;
export const formatGroundingProviderOverviewPresentation =
  buildRAGGroundingProviderOverviewPresentation;
const buildQualityOverviewPlannerOutcomeValue = (input: {
  retrievalComparison: RAGRetrievalComparison;
  rerankerComparison: RAGRerankerComparison;
}) => {
  const retrievalLeader = input.retrievalComparison.entries[0];
  const rerankerLeader = input.rerankerComparison.entries[0];
  const retrievalOutcome = retrievalLeader
    ? buildComparisonSQLitePlannerOutcomeValue(retrievalLeader)
    : "none";
  const rerankerOutcome = rerankerLeader
    ? buildComparisonSQLitePlannerOutcomeValue(rerankerLeader)
    : "none";

  if (retrievalOutcome === "none" && rerankerOutcome === "none") {
    return "none";
  }

  if (retrievalOutcome !== "none" && rerankerOutcome !== "none") {
    return retrievalOutcome === rerankerOutcome
      ? retrievalOutcome
      : `retrieval  · reranker `;
  }

  if (retrievalOutcome !== "none") {
    return `retrieval `;
  }

  return `reranker `;
};

export const formatQualityOverviewPresentation = (
  input: Parameters<typeof buildRAGQualityOverviewPresentation>[0],
) => {
  const presentation = buildRAGQualityOverviewPresentation(input);
  const plannerOutcome = buildQualityOverviewPlannerOutcomeValue(input);

  return plannerOutcome === "none"
    ? presentation
    : {
        ...presentation,
        rows: [
          ...presentation.rows,
          { label: "SQLite planner outcome", value: plannerOutcome },
        ],
      };
};

export const formatQualityOverviewNotes = () => [
  "Compare which strategy wins, whether grounding stays reliable, and whether a run slipped.",
  "Use the drilldowns for evidence and history, but keep the top-level read focused on decisions and changes.",
  "Planner outcome stays visible in the default view so selective-search regressions do not hide behind the strategy tabs.",
];
export const formatGroundingProviderCasePresentations =
  buildRAGGroundingProviderCaseComparisonPresentations;

export const formatGroundingCaseDifficultyEntry = (
  entry: RAGAnswerGroundingEvaluationCaseDifficultyEntry,
) =>
  [
    `#${entry.rank}`,
    entry.label ?? entry.caseId,
    `pass ${formatEvaluationPassingRate(entry.passRate)}`,
    `fail ${formatEvaluationPassingRate(entry.failRate)}`,
    `grounded ${formatEvaluationPassingRate(entry.groundedRate)}`,
    `citation f1 ${entry.averageCitationF1.toFixed(3)}`,
    `resolved ${formatEvaluationPercent(entry.averageResolvedCitationRate)}`,
  ].join(" · ");

export const formatGroundingDifficultyHistorySummary = (
  history?: RAGAnswerGroundingCaseDifficultyHistory,
) => {
  if (!history?.latestRun) {
    return ["No saved difficulty runs yet."];
  }

  const lines = [
    `Runs recorded: ${history.runs.length}`,
    `Latest: ${history.latestRun.label} · ${history.latestRun.entries.length} ranked case(s)`,
  ];

  if (history.previousRun) {
    lines.push(
      `Previous: ${history.previousRun.label} · ${history.previousRun.entries.length} ranked case(s)`,
    );
  }

  lines.push(
    `Most often harder: ${history.trends.mostOftenHarderCaseIds.length > 0 ? history.trends.mostOftenHarderCaseIds.join(", ") : "none"}`,
  );
  lines.push(
    `Most often easier: ${history.trends.mostOftenEasierCaseIds.length > 0 ? history.trends.mostOftenEasierCaseIds.join(", ") : "none"}`,
  );

  return lines;
};

const formatGroundingDifficultyCaseLabels = (
  entries: Array<{
    label?: string;
    caseId: string;
    currentRank: number;
    previousRank?: number;
  }>,
) =>
  entries.length > 0
    ? entries
        .map(
          (entry) =>
            `${entry.label ?? entry.caseId} (#${entry.previousRank ?? "new"}→#${entry.currentRank})`,
        )
        .join(", ")
    : "none";

export const formatGroundingDifficultyHistoryDiff = (
  history?: RAGAnswerGroundingCaseDifficultyHistory,
) => {
  if (!history?.diff) {
    return [
      "Run provider comparisons again to compare hardest-case changes over time.",
    ];
  }

  return [
    `Cases trending harder: ${formatGroundingDifficultyCaseLabels(history.diff.harderCases)}`,
    `Cases trending easier: ${formatGroundingDifficultyCaseLabels(history.diff.easierCases)}`,
  ];
};

export const formatGroundingDifficultyHistoryDetails = (
  history?: RAGAnswerGroundingCaseDifficultyHistory,
) => [
  ...formatGroundingDifficultyHistorySummary(history).slice(1),
  ...formatGroundingDifficultyHistoryDiff(history),
];

const truncateAnswerSnapshot = (value: string, maxLength = 140) =>
  value.length <= maxLength
    ? value
    : `${value.slice(0, maxLength - 1).trimEnd()}…`;

export const formatGroundingProviderCaseDetails = (
  entry: DemoGroundingProviderCaseEntry,
) => [
  `coverage ${entry.coverage}`,
  `matched ${entry.matchedIds.length > 0 ? entry.matchedIds.join(", ") : "none"}`,
  `missing ${entry.missingIds.length > 0 ? entry.missingIds.join(", ") : "none"}`,
  `extra ${entry.extraIds.length > 0 ? entry.extraIds.join(", ") : "none"}`,
  `resolved ${formatEvaluationPercent(entry.resolvedCitationRate)}`,
  `answer: ${truncateAnswerSnapshot(entry.answerExcerpt)}`,
];

const formatGroundingSnapshotArtifacts = (
  entry: RAGAnswerGroundingEvaluationHistory["caseSnapshots"][number],
) => {
  const parts = [
    `${entry.label ?? entry.caseId}: ${entry.answerChange}`,
    `coverage ${entry.coverage}`,
    `resolved ${formatEvaluationPercent(entry.resolvedCitationRate)}`,
    `citations ${entry.resolvedCitationCount}/${entry.citationCount}`,
    `refs ${entry.referenceCount}`,
    `cited ${entry.citedIds.length > 0 ? entry.citedIds.join(", ") : "none"}`,
    `extra ${entry.extraIds.length > 0 ? entry.extraIds.join(", ") : "none"}`,
  ];

  if (entry.ungroundedReferenceNumbers.length > 0) {
    parts.push(
      `unresolved refs ${entry.ungroundedReferenceNumbers.join(", ")}`,
    );
  }

  parts.push(truncateAnswerSnapshot(entry.answer));
  return parts.join(" · ");
};

const formatGroundingCaseDiffStatusLabel = (entry: {
  label?: string;
  caseId: string;
  previousStatus?: string;
  currentStatus: string;
}) =>
  `${entry.label ?? entry.caseId} · ${entry.previousStatus ?? "n/a"}→${entry.currentStatus}`;

const buildGroundingCaseDiffTrail = (
  entry: NonNullable<
    RAGAnswerGroundingEvaluationHistory["diff"]
  >["improvedCases"][number],
) => {
  const statusLabel = formatGroundingCaseDiffStatusLabel(entry);
  const citationF1Delta = formatSignedDelta(
    (entry.currentCitationF1 ?? 0) - (entry.previousCitationF1 ?? 0),
    3,
  );
  const resolvedDelta = `${formatSignedDelta((entry.currentResolvedCitationCount ?? 0) - (entry.previousResolvedCitationCount ?? 0))} (${entry.previousResolvedCitationCount ?? 0}→${entry.currentResolvedCitationCount})`;
  const unresolvedDelta = `${formatSignedDelta((entry.currentUnresolvedCitationCount ?? 0) - (entry.previousUnresolvedCitationCount ?? 0))} (${entry.previousUnresolvedCitationCount ?? 0}→${entry.currentUnresolvedCitationCount})`;
  const referenceDelta = `${formatSignedDelta((entry.currentReferenceCount ?? 0) - (entry.previousReferenceCount ?? 0))} (${entry.previousReferenceCount ?? 0}→${entry.currentReferenceCount})`;

  return [
    `${statusLabel} · f1 ${citationF1Delta}`,
    `coverage ${entry.previousCoverage ?? "n/a"}→${entry.currentCoverage}`,
    `resolved refs ${resolvedDelta}`,
    `unresolved refs ${unresolvedDelta}`,
    `references ${referenceDelta}`,
    `Answer changed: ${entry.answerChanged ? "yes" : "no"}`,
    ...formatGroundingHistoryArtifactLine(
      "Cited IDs",
      entry.previousCitedIds,
      entry.currentCitedIds,
    ),
    ...formatGroundingHistoryArtifactLine(
      "Matched IDs",
      entry.previousMatchedIds,
      entry.currentMatchedIds,
    ),
    ...formatGroundingHistoryArtifactLine(
      "Missing IDs",
      entry.previousMissingIds,
      entry.currentMissingIds,
    ),
    ...formatGroundingHistoryArtifactLine(
      "Extra IDs",
      entry.previousExtraIds,
      entry.currentExtraIds,
    ),
    ...formatGroundingHistoryArtifactLine(
      "Unresolved ref #",
      entry.previousUngroundedReferenceNumbers.map(String),
      entry.currentUngroundedReferenceNumbers.map(String),
    ),
  ];
};

export const formatGroundingHistoryArtifactTrail = (
  history?: RAGAnswerGroundingEvaluationHistory,
) => {
  if (!history?.diff) {
    return [
      "Run the provider comparison again to show case-level evidence history.",
    ];
  }

  if (
    history.diff.improvedCases.length === 0 &&
    history.diff.regressedCases.length === 0 &&
    history.diff.unchangedCases.length === 0
  ) {
    return [
      "No case-level evidence history is available for the latest provider comparison.",
    ];
  }

  return [
    `Case history: ${history.diff.improvedCases.length} improved · ${history.diff.regressedCases.length} regressed · ${history.diff.unchangedCases.length} unchanged`,
    `Case history F1 change: ${formatSignedDelta(history.diff.summaryDelta.averageCitationF1, 3)}`,
    ...history.diff.improvedCases.flatMap((entry) =>
      buildGroundingCaseDiffTrail(entry),
    ),
    ...history.diff.regressedCases.flatMap((entry) =>
      buildGroundingCaseDiffTrail(entry),
    ),
    ...history.diff.unchangedCases.flatMap((entry) =>
      buildGroundingCaseDiffTrail(entry),
    ),
  ];
};

export const formatGroundingHistorySnapshots = (
  history?: RAGAnswerGroundingEvaluationHistory,
) => {
  if (history?.caseSnapshots.length) {
    return history.caseSnapshots.map((entry) =>
      formatGroundingSnapshotArtifacts(entry),
    );
  }

  if (!history?.latestRun) {
    return ["No saved provider answer snapshots yet."];
  }

  return history.latestRun.response.cases.map(
    (entry) =>
      `${entry.label ?? entry.caseId}: no answer change · ${truncateAnswerSnapshot(entry.answer)}`,
  );
};

export const formatGroundingHistorySnapshotPresentations =
  buildRAGAnswerGroundingCaseSnapshotPresentations;

export const formatGroundingHistoryPresentation =
  buildRAGAnswerGroundingHistoryPresentation;

export const formatGroundingHistorySummary = (
  history?: RAGAnswerGroundingEvaluationHistory,
) => [formatGroundingHistoryPresentation(history).summary];

export const formatGroundingHistoryDiff = (
  history?: RAGAnswerGroundingEvaluationHistory,
) => {
  if (!history?.diff) {
    return [
      "Run the provider comparison again to compare grounding results over time.",
    ];
  }

  return [
    `Pass rate change: ${formatSignedDelta(history.diff.summaryDelta.passingRate, 1, "%")}`,
    `Citation F1 change: ${formatSignedDelta(history.diff.summaryDelta.averageCitationF1, 3)}`,
    `Resolved citation rate change: ${formatSignedDelta(history.diff.summaryDelta.averageResolvedCitationRate * 100, 1, "%")}`,
    `Cases improved: ${formatGroundingHistoryCaseChanges(history.diff.improvedCases)}`,
    `Cases regressed: ${formatGroundingHistoryCaseChanges(history.diff.regressedCases)}`,
    ...formatGroundingHistoryArtifactDeltas(history),
  ];
};

export const formatGroundingHistoryDetails = (
  history?: RAGAnswerGroundingEvaluationHistory,
) =>
  formatGroundingHistoryPresentation(history).rows.map(
    (row) => `${row.label}: ${row.value}`,
  );

export const formatGroundingHistoryLeaderboardEntry = (
  entry: RAGAnswerGroundingEvaluationLeaderboardEntry,
) =>
  `#${entry.rank} · ${entry.label} · passing ${formatEvaluationPassingRate(entry.passingRate)} · citation f1 ${entry.averageCitationF1.toFixed(3)} · resolved ${formatEvaluationPercent(entry.averageResolvedCitationRate)}`;

export const isBackendMode = (value: unknown): value is DemoBackendMode =>
  value === "sqlite-native" ||
  value === "sqlite-fallback" ||
  value === "postgres" ||
  value === "pinecone";

export const isFrameworkId = (value: unknown): value is DemoFrameworkId =>
  value === "react" ||
  value === "svelte" ||
  value === "vue" ||
  value === "angular" ||
  value === "html" ||
  value === "htmx";

export const getBackendLabel = (mode: DemoBackendMode) =>
  demoBackends.find((backend) => backend.id === mode)?.label ?? mode;

export const getAvailableDemoBackends = (backends?: DemoBackendDescriptor[]) =>
  backends ?? demoBackends;

export const getFrameworkLabel = (framework: DemoFrameworkId) =>
  demoFrameworks.find((entry) => entry.id === framework)?.label ?? framework;

export const getDemoPagePath = (
  framework: DemoFrameworkId,
  mode: DemoBackendMode,
) => `/${framework}/${mode}`;

export const getRAGPathForMode = (mode: DemoBackendMode) => {
  switch (mode) {
    case "sqlite-fallback":
      return "/rag/sqlite-fallback";
    case "postgres":
      return "/rag/postgres";
    case "sqlite-native":
    default:
      return "/rag/sqlite-native";
  }
};

export const readBackendModeFromPath = (
  pathname: string,
  defaultMode: DemoBackendMode = "sqlite-native",
) => {
  const mode = pathname.split("/").filter(Boolean).at(-1);
  return isBackendMode(mode) ? mode : defaultMode;
};

export const readFrameworkFromPath = (
  pathname: string,
  defaultFramework: DemoFrameworkId = "react",
) => {
  const framework = pathname.split("/").filter(Boolean)[0];
  return isFrameworkId(framework) ? framework : defaultFramework;
};

export const getInitialBackendMode = (
  defaultMode: DemoBackendMode = "sqlite-native",
) => {
  if (typeof window === "undefined") {
    return defaultMode;
  }

  return readBackendModeFromPath(window.location.pathname, defaultMode);
};

export const getInitialFramework = (
  defaultFramework: DemoFrameworkId = "react",
) => {
  if (typeof window === "undefined") {
    return defaultFramework;
  }

  return readFrameworkFromPath(window.location.pathname, defaultFramework);
};

export const navigateToBackendMode = (
  frameworkOrMode: DemoFrameworkId | DemoBackendMode,
  maybeMode?: DemoBackendMode,
) => {
  if (typeof window === "undefined") {
    return;
  }

  const framework = maybeMode
    ? (frameworkOrMode as DemoFrameworkId)
    : getInitialFramework();
  const mode = maybeMode ?? (frameworkOrMode as DemoBackendMode);
  window.location.href = getDemoPagePath(framework, mode);
};

export const buildSearchPayload = (
  query: SearchFormState & { retrievalPresetId?: string },
) => {
  const payload: Record<string, unknown> = {
    query: query.query,
    topK: query.topK,
  };

  if (query.scoreThreshold.length > 0) {
    payload.scoreThreshold = Number(query.scoreThreshold);
  }
  if (query.kind.length > 0) payload.kind = query.kind;
  if (query.source.length > 0) payload.source = query.source;
  if (query.documentId.length > 0) payload.documentId = query.documentId;
  if (
    typeof query.nativeQueryProfile === "string" &&
    query.nativeQueryProfile.length > 0
  ) {
    payload.nativeQueryProfile = query.nativeQueryProfile;
  }
  if (
    typeof query.retrievalPresetId === "string" &&
    query.retrievalPresetId.length > 0
  ) {
    payload.retrievalPresetId = query.retrievalPresetId;
  }

  return payload;
};

const buildSearchTargetId = (prefix: string, value: string) => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${normalized || "item"}`;
};

const buildSearchSectionJump = (
  kind: SearchResultSectionJump["kind"],
  section: Pick<RAGChunkGraphSectionGroup, "id" | "path" | "title">,
  targetId: string,
): SearchResultSectionJump => ({
  id: `${kind}:${section.id}`,
  kind,
  label: `${kind[0].toUpperCase()}${kind.slice(1)} · ${formatChunkSectionGroupLabel(section)}`,
  targetId,
});

const formatAttributionModeLabel = (mode: string) =>
  mode === "primary"
    ? "base-query-only"
    : mode === "transformed"
      ? "transformed-only"
      : mode === "variant"
        ? "variant-only"
        : "mixed";

const formatLeadContinuityCue = (value?: string) =>
  value === "immediate_follow_up"
    ? "immediate follow-up"
    : value === "near_follow_up"
      ? "near follow-up"
      : value === "close_follow_up"
        ? "close follow-up"
        : value === "delayed_follow_up"
          ? "delayed follow-up"
          : value === "immediate_prior"
            ? "immediate prior segment"
            : value === "near_prior"
              ? "near prior segment"
              : value === "close_prior"
                ? "close prior segment"
                : value === "delayed_prior"
                  ? "delayed prior segment"
                  : undefined;

const buildLeadMediaCueLine = (trace?: RAGRetrievalTrace) => {
  const rerankStep = trace?.steps.find((step) => step.stage === "rerank");
  const metadata = (rerankStep?.metadata ?? {}) as Record<string, unknown>;
  const speaker =
    typeof metadata.leadSpeakerCue === "string" && metadata.leadSpeakerCue
      ? metadata.leadSpeakerCue
      : undefined;
  const quotedSpeakerAttribution =
    metadata.leadSpeakerAttributionCue === "quoted_match"
      ? "quoted speaker match"
      : undefined;
  const channel =
    typeof metadata.leadChannelCue === "string" && metadata.leadChannelCue
      ? metadata.leadChannelCue
      : undefined;
  const quotedChannelAttribution =
    metadata.leadChannelAttributionCue === "quoted_match"
      ? "quoted channel match"
      : undefined;
  const continuity =
    typeof metadata.leadContinuityCue === "string"
      ? formatLeadContinuityCue(metadata.leadContinuityCue)
      : undefined;
  const parts = [
    speaker ? `speaker ${speaker}` : undefined,
    quotedSpeakerAttribution,
    channel ? `channel ${channel}` : undefined,
    quotedChannelAttribution,
    continuity,
  ].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  return parts.length > 0
    ? `Lead media cues · ${parts.join(" · ")}`
    : undefined;
};

const buildSearchStoryHighlights = (
  results: RAGSource[],
  diagnostics: DemoSectionDiagnostic[],
  trace?: RAGRetrievalTrace,
) => {
  const lines: string[] = [];
  const leadDiagnostic = diagnostics[0];
  const leadSource = results[0]?.source ?? leadDiagnostic?.topSource;
  const queryTransformApplied = Boolean(trace?.transformedQuery);
  const leadMetadata = (results[0]?.metadata ?? {}) as Record<string, unknown>;
  const traceMode = leadDiagnostic?.retrievalMode ?? trace?.mode ?? "hybrid";

  let mode: "primary" | "transformed" | "variant" | "mixed" | undefined =
    leadDiagnostic?.queryAttribution?.mode;
  if (!mode) {
    const seen = new Set<string>();
    for (const result of results) {
      const metadata = (result.metadata ?? {}) as Record<string, unknown>;
      const origins = Array.isArray(metadata.retrievalQueryOrigins)
        ? metadata.retrievalQueryOrigins.filter(
            (value): value is string => typeof value === "string",
          )
        : typeof metadata.retrievalQueryOrigin === "string"
          ? [metadata.retrievalQueryOrigin]
          : [];
      origins.forEach((origin) => seen.add(origin));
    }
    mode =
      seen.size === 1
        ? ([...seen][0] as "primary" | "transformed" | "variant")
        : seen.size > 1
          ? "mixed"
          : undefined;
  }

  if (leadDiagnostic) {
    lines.push(`Winning evidence · ${leadDiagnostic.label}`);
  } else if (leadSource) {
    lines.push(`Winning evidence · ${leadSource}`);
  }
  lines.push(
    `Search path · ${traceMode}${queryTransformApplied ? " with transform" : " without transform"}${leadDiagnostic?.rerankApplied ? " · reranked" : ""}`,
  );
  const leadMediaCueLine = buildLeadMediaCueLine(trace);
  if (leadMediaCueLine) {
    lines.push(leadMediaCueLine);
  }
  if (trace?.multiVector?.configured) {
    const matchedVariantLabel =
      typeof leadMetadata.multivectorMatchedVariantLabel === "string"
        ? leadMetadata.multivectorMatchedVariantLabel
        : typeof leadMetadata.multivectorMatchedVariantId === "string"
          ? leadMetadata.multivectorMatchedVariantId
          : "variant match";
    lines.push(
      `Late interaction · ${matchedVariantLabel} · collapsed ${trace.multiVector.collapsedParents} parent${trace.multiVector.collapsedParents === 1 ? "" : "s"} · vector variants ${trace.multiVector.vectorVariantHits} · lexical variants ${trace.multiVector.lexicalVariantHits}`,
    );
  }
  if (mode) {
    const label = formatAttributionModeLabel(mode);
    lines.push(
      mode === "mixed"
        ? `Reading target · expect one winning section to keep base and expanded evidence together.`
        : mode === "transformed"
          ? `Reading target · expect transformed vocabulary to carry the winning source, even if it is not sectioned.`
          : mode === "variant"
            ? `Reading target · expect expanded variants to dominate the winning evidence.`
            : `Reading target · expect the original wording to resolve without transform support.`,
    );
    lines.push(`Diagnostic focus · ${label}`);
  } else if (queryTransformApplied) {
    lines.push(
      "Reading target · inspect whether transformed wording, not the base query, is carrying the winning source.",
    );
  }
  return lines;
};

const buildSearchAttributionOverview = (
  results: RAGSource[],
  diagnostics: DemoSectionDiagnostic[],
  trace?: RAGRetrievalTrace,
) => {
  const lines: string[] = [];
  const modes = new Set(
    diagnostics.map((entry) => entry.queryAttribution?.mode ?? "mixed"),
  );
  let primaryHits = diagnostics.reduce(
    (total, entry) => total + (entry.queryAttribution?.primaryHits ?? 0),
    0,
  );
  let transformedHits = diagnostics.reduce(
    (total, entry) => total + (entry.queryAttribution?.transformedHits ?? 0),
    0,
  );
  let variantHits = diagnostics.reduce(
    (total, entry) => total + (entry.queryAttribution?.variantHits ?? 0),
    0,
  );
  const leadDiagnostic = diagnostics[0];
  const leadSource = results[0]?.source ?? leadDiagnostic?.topSource;

  if (diagnostics.length === 0) {
    const fallbackModes = new Set<string>();
    for (const result of results) {
      const metadata = (result.metadata ?? {}) as Record<string, unknown>;
      const origins = Array.isArray(metadata.retrievalQueryOrigins)
        ? metadata.retrievalQueryOrigins.filter(
            (value): value is string => typeof value === "string",
          )
        : typeof metadata.retrievalQueryOrigin === "string"
          ? [metadata.retrievalQueryOrigin]
          : [];
      for (const origin of origins) {
        if (origin === "primary") {
          primaryHits += 1;
          fallbackModes.add("primary");
        } else if (origin === "transformed") {
          transformedHits += 1;
          fallbackModes.add("transformed");
        } else if (origin === "variant") {
          variantHits += 1;
          fallbackModes.add("variant");
        }
      }
    }
    if (fallbackModes.size === 0 && trace?.transformedQuery) {
      fallbackModes.add("transformed");
    }
    for (const mode of fallbackModes) {
      modes.add(mode as "primary" | "transformed" | "variant" | "mixed");
    }
  }

  if (modes.size === 1) {
    const onlyMode = [...modes][0] ?? "mixed";
    lines.push(`Attribution mode · ${formatAttributionModeLabel(onlyMode)}`);
  } else if (modes.size > 1) {
    lines.push(
      `Attribution mode · mixed sections (${[...modes].sort().join(", ")})`,
    );
  }
  if (primaryHits + transformedHits + variantHits > 0) {
    lines.push(
      `Attribution counts · base ${primaryHits} · transformed ${transformedHits} · variant ${variantHits}`,
    );
  }
  if (leadDiagnostic) {
    lines.push(`Leading section · ${leadDiagnostic.label}`);
  }
  if (leadSource) {
    lines.push(`Lead source · ${leadSource}`);
  }
  const leadMediaCueLine = buildLeadMediaCueLine(trace);
  if (leadMediaCueLine) {
    lines.push(leadMediaCueLine);
  }
  if (trace?.multiVector?.configured) {
    lines.push(
      `Late interaction summary · parents ${trace.multiVector.collapsedParents} · vector variants ${trace.multiVector.vectorVariantHits} · lexical variants ${trace.multiVector.lexicalVariantHits}`,
    );
  }
  return lines;
};

export const attributionBenchmarkNotes = [
  "Base query only · exact seeded phrasing · expect base-query-only attribution.",
  "Transformed only · rewritten framework wording · expect transformed-only attribution even for legacy sources.",
  "Mixed attribution · titled workbook plus variants · expect one section to keep base and variant evidence together.",
  "Routing decision · explicit support policy wording · expect the built-in route to leave the default path.",
] as const;

export const buildSearchResponse = (
  query: string,
  payload: Record<string, unknown>,
  results: RAGSource[],
  elapsedMs: number,
  trace?: RAGRetrievalTrace,
): SearchResponse => {
  const traceRoutingStep = trace?.steps.find(
    (step) => step.stage === "routing",
  );
  const traceRoutingMetadata = (traceRoutingStep?.metadata ?? {}) as Record<
    string,
    unknown
  >;
  const traceQueryTransformStep = trace?.steps.find(
    (step) => step.stage === "query_transform",
  );
  const traceQueryTransformMetadata = (traceQueryTransformStep?.metadata ??
    {}) as Record<string, unknown>;
  const rawSectionDiagnostics = buildRAGSectionRetrievalDiagnostics(
    results,
    trace,
  ) as DemoSectionDiagnostic[];
  const sectionDiagnostics: DemoSectionDiagnostic[] = rawSectionDiagnostics.map(
    (diagnostic) => ({
      ...diagnostic,
      requestedMode:
        diagnostic.requestedMode ??
        trace?.requestedMode ??
        (typeof traceRoutingMetadata.requestedMode === "string"
          ? (traceRoutingMetadata.requestedMode as DemoSectionDiagnostic["requestedMode"])
          : undefined),
      routingLabel:
        diagnostic.routingLabel ??
        trace?.routingLabel ??
        (typeof traceRoutingMetadata.label === "string"
          ? traceRoutingMetadata.label
          : undefined),
      routingProvider:
        diagnostic.routingProvider ??
        trace?.routingProvider ??
        (typeof traceRoutingMetadata.providerName === "string"
          ? traceRoutingMetadata.providerName
          : undefined),
      routingReason:
        diagnostic.routingReason ??
        trace?.routingReason ??
        (typeof traceRoutingMetadata.reason === "string"
          ? traceRoutingMetadata.reason
          : undefined),
      queryTransformLabel:
        diagnostic.queryTransformLabel ??
        trace?.queryTransformLabel ??
        (typeof traceQueryTransformMetadata.label === "string"
          ? traceQueryTransformMetadata.label
          : undefined),
      queryTransformProvider:
        diagnostic.queryTransformProvider ??
        trace?.queryTransformProvider ??
        (typeof traceQueryTransformMetadata.providerName === "string"
          ? traceQueryTransformMetadata.providerName
          : undefined),
      queryTransformReason:
        diagnostic.queryTransformReason ??
        trace?.queryTransformReason ??
        (typeof traceQueryTransformMetadata.reason === "string"
          ? traceQueryTransformMetadata.reason
          : undefined),
    }),
  );

  return {
    query,
    elapsedMs,
    topK: typeof payload.topK === "number" ? payload.topK : 6,
    count: results.length,
    chunks: results.map((result) => ({
      chunkId: result.chunkId,
      title: result.title ?? result.chunkId,
      source: result.source ?? "unknown",
      score: result.score,
      metadata: (result.metadata ?? {}) as Record<string, unknown>,
      text: result.text,
      labels: result.labels,
      structure: result.structure,
      targetId: buildSearchTargetId("search-result", result.chunkId),
    })),
    filter: Object.fromEntries(
      Object.entries(payload)
        .filter(
          ([key, value]) =>
            ["kind", "source", "documentId"].includes(key) &&
            typeof value === "string" &&
            value.length > 0,
        )
        .map(([key, value]) => [key, value as string]),
    ),
    storyHighlights: buildSearchStoryHighlights(
      results,
      sectionDiagnostics,
      trace,
    ),
    sectionDiagnostics,
    attributionOverview: buildSearchAttributionOverview(
      results,
      sectionDiagnostics,
      trace,
    ),
    trace,
  };
};

const buildChunkPreviewSources = (preview: DemoChunkPreview): RAGSource[] =>
  preview.chunks.map((chunk, index) => ({
    chunkId: chunk.chunkId,
    labels: chunk.labels,
    metadata: chunk.metadata,
    score: Math.max(0, preview.chunks.length - index),
    source: chunk.source ?? preview.document.source,
    structure: chunk.structure,
    text: chunk.text,
    title: preview.document.title,
  }));

export const buildChunkPreviewSectionDiagnostics = (
  preview?: DemoChunkPreview | null,
): DemoSectionDiagnostic[] =>
  preview
    ? (buildRAGSectionRetrievalDiagnostics(
        buildChunkPreviewSources(preview),
      ) as DemoSectionDiagnostic[])
    : [];

export const buildActiveChunkPreviewSectionDiagnostic = (
  preview?: DemoChunkPreview | null,
  activeChunkId?: string | null,
): DemoSectionDiagnostic | null => {
  if (!preview) return null;

  const previewSources = buildChunkPreviewSources(preview);
  const diagnostics = buildRAGSectionRetrievalDiagnostics(
    previewSources,
  ) as DemoSectionDiagnostic[];
  const navigation = buildRAGChunkGraphNavigation(
    buildRAGChunkGraph(previewSources),
    activeChunkId ?? undefined,
  );
  const sectionKey =
    navigation.section?.path?.join(" > ") ?? navigation.section?.title;
  if (!sectionKey) return null;

  return (
    diagnostics.find((diagnostic) => diagnostic.key === sectionKey) ??
    diagnostics.find((diagnostic) => diagnostic.label === sectionKey) ??
    null
  );
};

export const buildSearchSectionGroups = (
  response?: SearchResponse | null,
): SearchResultSectionGroup[] => {
  const chunks = response?.chunks ?? [];
  if (chunks.length === 0) return [];

  const graph = buildRAGChunkGraph(chunks);
  const groups = new Map<
    string,
    {
      id: string;
      label: string;
      targetId: string;
      leadChunkId: string;
      score: number;
      index: number;
      section?: Pick<
        RAGChunkGraphSectionGroup,
        "id" | "path" | "title" | "leadChunkId"
      >;
      chunks: SearchResultChunk[];
    }
  >();

  chunks.forEach((chunk, index) => {
    const navigation = buildRAGChunkGraphNavigation(graph, chunk.chunkId);
    const section = navigation.section;
    const groupId = section?.id ?? `chunk:${chunk.chunkId}`;
    const existing = groups.get(groupId);
    if (existing) {
      existing.chunks.push(chunk);
      if (chunk.score > existing.score) existing.score = chunk.score;
      return;
    }

    groups.set(groupId, {
      id: groupId,
      label: section
        ? formatChunkSectionGroupLabel(section)
        : (chunk.labels?.contextLabel ?? chunk.title),
      targetId: section
        ? buildSearchTargetId("search-section", section.id)
        : chunk.targetId,
      leadChunkId: section?.leadChunkId ?? chunk.chunkId,
      score: chunk.score,
      index,
      section: section
        ? {
            id: section.id,
            path: section.path,
            title: section.title,
            leadChunkId: section.leadChunkId,
          }
        : undefined,
      chunks: [chunk],
    });
  });

  const groupTargetIds = new Map(
    [...groups.values()].flatMap((group) =>
      group.section ? [[group.section.id, group.targetId] as const] : [],
    ),
  );

  return [...groups.values()]
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    })
    .map((group) => {
      const navigation = buildRAGChunkGraphNavigation(graph, group.leadChunkId);
      const jumps: SearchResultSectionJump[] = [];
      if (navigation.parentSection) {
        const targetId = groupTargetIds.get(navigation.parentSection.id);
        if (targetId)
          jumps.push(
            buildSearchSectionJump(
              "parent",
              navigation.parentSection,
              targetId,
            ),
          );
      }
      navigation.siblingSections.forEach((section) => {
        const targetId = groupTargetIds.get(section.id);
        if (targetId)
          jumps.push(buildSearchSectionJump("sibling", section, targetId));
      });
      navigation.childSections.forEach((section) => {
        const targetId = groupTargetIds.get(section.id);
        if (targetId)
          jumps.push(buildSearchSectionJump("child", section, targetId));
      });
      return {
        id: group.id,
        label: group.label,
        summary: `${group.chunks.length} matching chunk${group.chunks.length === 1 ? "" : "s"}`,
        targetId: group.targetId,
        leadChunkId: group.leadChunkId,
        jumps,
        chunks: group.chunks,
      } satisfies SearchResultSectionGroup;
    });
};

export const buildSourceSummarySectionGroups = (
  summaries?: RAGSourceSummary[] | null,
): DemoSourceSummaryGroup[] => {
  const groups = new Map<string, DemoSourceSummaryGroup>();
  for (const summary of summaries ?? []) {
    const label = summary.contextLabel ?? summary.label;
    const id = buildSearchTargetId("source-summary-section", label);
    const existing = groups.get(id);
    if (existing) {
      existing.summaries.push(summary);
      existing.summary = `${existing.summaries.length} evidence summar${existing.summaries.length === 1 ? "y" : "ies"}`;
      continue;
    }
    groups.set(id, {
      id,
      label,
      targetId: id,
      summary: "1 evidence summary",
      summaries: [summary],
    });
  }
  return [...groups.values()].sort((left, right) => {
    const leftScore = Math.max(
      ...left.summaries.map((summary) => summary.bestScore),
    );
    const rightScore = Math.max(
      ...right.summaries.map((summary) => summary.bestScore),
    );
    return rightScore - leftScore;
  });
};
export const buildGroundingReferenceGroups = (
  references?: RAGGroundingReference[] | null,
): DemoGroundingReferenceGroup[] => {
  const groups = new Map<string, DemoGroundingReferenceGroup>();
  for (const reference of references ?? []) {
    const label =
      reference.contextLabel ??
      reference.label ??
      reference.source ??
      reference.chunkId;
    const id = buildSearchTargetId("grounding-reference-section", label);
    const existing = groups.get(id);
    if (existing) {
      existing.references.push(reference);
      existing.summary = `${existing.references.length} grounding reference${existing.references.length === 1 ? "" : "s"}`;
      continue;
    }
    groups.set(id, {
      id,
      label,
      targetId: id,
      summary: "1 grounding reference",
      references: [reference],
    });
  }
  return [...groups.values()].sort((left, right) => {
    const leftScore = Math.max(
      ...left.references.map((reference) => reference.score),
    );
    const rightScore = Math.max(
      ...right.references.map((reference) => reference.score),
    );
    return rightScore - leftScore;
  });
};

export const buildCitationGroups = (
  citations?: RAGCitation[] | null,
): DemoCitationGroup[] => {
  const groups = new Map<string, DemoCitationGroup>();
  for (const citation of citations ?? []) {
    const label =
      citation.contextLabel ??
      citation.label ??
      citation.source ??
      citation.chunkId;
    const id = buildSearchTargetId("citation-section", label);
    const existing = groups.get(id);
    if (existing) {
      existing.citations.push(citation);
      existing.summary = `${existing.citations.length} citation${existing.citations.length === 1 ? "" : "s"}`;
      continue;
    }
    groups.set(id, {
      id,
      label,
      targetId: id,
      summary: "1 citation",
      citations: [citation],
    });
  }
  return [...groups.values()].sort((left, right) => {
    const leftScore = Math.max(
      ...left.citations.map((citation) => citation.score),
    );
    const rightScore = Math.max(
      ...right.citations.map((citation) => citation.score),
    );
    return rightScore - leftScore;
  });
};

const buildNativeSourceLabel = (status: RAGVectorStoreStatus) => {
  const vectorMode = status.vectorMode as string;
  const nativeResolution =
    status.native && "resolution" in status.native
      ? status.native.resolution
      : undefined;

  if (vectorMode === "native_vec0") {
    return nativeResolution?.source === "absolute-package"
      ? "Packaged sqlite-vec"
      : "Native sqlite-vec";
  }

  if (vectorMode === "native_pgvector") {
    return "PostgreSQL pgvector extension";
  }

  return "Not applicable";
};

const buildVectorModeMessage = (
  status: RAGVectorStoreStatus,
  selectedMode: DemoBackendMode,
) => {
  const backendLabel = getBackendLabel(selectedMode);
  const vectorMode = status.vectorMode as string;

  if (vectorMode === "native_vec0") {
    return `Packaged native vec0 is active. Retrieval is using the ${backendLabel} backend shipped through @absolutejs/absolute-rag-sqlite.`;
  }

  if (vectorMode === "native_pgvector") {
    return `PostgreSQL pgvector is active. Retrieval is using the ${backendLabel} backend shipped through @absolutejs/absolute-rag-postgresql.`;
  }

  return (
    status.native?.fallbackReason ??
    `Owned JSON fallback mode is active. Retrieval is using the ${backendLabel} backend without native vector acceleration.`
  );
};

export const buildStatusView = (
  status: RAGVectorStoreStatus | undefined,
  capabilities: RAGBackendCapabilities | undefined,
  documents: DemoDocument[],
  selectedMode: DemoBackendMode,
): DemoStatusView | null => {
  if (!status) {
    return null;
  }

  const counts = documents.reduce(
    (acc, doc) => {
      acc.total += 1;
      acc.byKind[doc.kind] = (acc.byKind[doc.kind] ?? 0) + 1;
      acc.chunkCount += doc.chunkCount;
      return acc;
    },
    {
      total: 0,
      chunkCount: 0,
      byKind: { seed: 0, custom: 0 } as Record<RagDocumentKind, number>,
    },
  );

  const capabilityLabels = [
    `${capabilities?.persistence ?? "unknown"} persistence`,
    capabilities?.nativeVectorSearch
      ? "native vector search"
      : "owned JSON fallback search",
    capabilities?.serverSideFiltering
      ? "server-side filtering"
      : "client-side filtering",
  ];

  return {
    backend: status.backend,
    capabilities: capabilityLabels,
    chunkCount: counts.chunkCount,
    dimensions: status.dimensions,
    documents: {
      total: counts.total,
      byKind: counts.byKind,
    },
    native: {
      active: status.native?.active === true,
      fallbackReason: status.native?.fallbackReason,
      sourceLabel: buildNativeSourceLabel(status),
    },
    reranker: {
      label: DEMO_RERANKER_LABEL,
      summary: DEMO_RERANKER_SUMMARY,
    },
    vectorMode: status.vectorMode,
    vectorModeMessage: buildVectorModeMessage(status, selectedMode),
  };
};

const formatCompactList = (values: string[]) =>
  values.length > 0 ? values.join(", ") : "none";

const formatDuration = (value?: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${value}${value === 1 ? "ms" : "ms"}`
    : "n/a";

const formatAge = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "n/a";
  }

  if (value < 1000) {
    return `${Math.round(value)}ms`;
  }

  const seconds = value / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  }

  const hours = minutes / 60;
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }

  return `${(hours / 24).toFixed(1)}d`;
};

const formatCoverageMap = (entries: Record<string, number>) =>
  Object.entries(entries)
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .map(([key, count]) => `${key}: ${count}`)
    .join(" · ") || "none";

export const formatGroundingCoverage = (
  coverage: RAGGroundedAnswer["coverage"],
) => {
  switch (coverage) {
    case "grounded":
      return "Grounded";
    case "partial":
      return "Partially grounded";
    case "ungrounded":
    default:
      return "Ungrounded";
  }
};

export const formatGroundingSummary = (answer?: RAGGroundedAnswer | null) => {
  if (!answer) {
    return [] as string[];
  }

  const citationParts = answer.parts.filter((part) => part.type === "citation");
  return [
    `${formatGroundingCoverage(answer.coverage)} answer · ${answer.references.length} reference(s)`,
    `${citationParts.length} cited answer segment(s)`,
    answer.ungroundedReferenceNumbers.length > 0
      ? `Unresolved citations: ${answer.ungroundedReferenceNumbers.map((value) => `[${value}]`).join(" ")}`
      : "All citation numbers resolve to retrieved evidence.",
  ];
};

export const formatGroundedAnswerSectionSummaryDetails = (
  summary: RAGGroundedAnswerSectionSummary,
) => {
  const citationList = summary.referenceNumbers
    .map((number) => `[${number}]`)
    .join(" ");
  return [
    `${summary.count} reference${summary.count === 1 ? "" : "s"}${citationList ? ` · citations ${citationList}` : ""}`,
    summary.locatorLabel ? `location: ${summary.locatorLabel}` : undefined,
    summary.contextLabel && summary.contextLabel !== summary.label
      ? `context: ${summary.contextLabel}`
      : undefined,
    summary.provenanceLabel
      ? `provenance: ${summary.provenanceLabel}`
      : undefined,
  ].filter((line): line is string => Boolean(line));
};

export const formatGroundingReferenceLabel = (
  reference: RAGGroundingReference,
) =>
  [reference.label, reference.contextLabel, reference.locatorLabel]
    .filter(Boolean)
    .join(" · ");

export const formatGroundingReferenceSummary = (
  reference: RAGGroundingReference,
) => reference.source ?? reference.title ?? reference.chunkId;

export const formatGroundingReferenceExcerpt = (
  reference: RAGGroundingReference,
) => reference.excerpt || reference.text;

export const formatCitationLabel = (citation: RAGCitation) =>
  [citation.label, citation.contextLabel, citation.locatorLabel]
    .filter(Boolean)
    .join(" · ");

export const formatCitationSummary = (citation: RAGCitation) =>
  citation.source ?? citation.title ?? citation.chunkId;

export const formatCitationExcerpt = (citation: RAGCitation) =>
  citation.excerpt || citation.text;

export const formatGroundedAnswerPartExcerpt = (part: RAGGroundedAnswerPart) =>
  part.type === "citation"
    ? part.referenceDetails[0]?.excerpt ||
      part.references[0]?.excerpt ||
      part.references[0]?.text ||
      part.text
    : part.text;

export const formatGroundedAnswerSectionSummaryExcerpt = (
  summary: RAGGroundedAnswerSectionSummary,
) =>
  summary.excerpt ||
  summary.references[0]?.excerpt ||
  summary.references[0]?.text ||
  "";

const formatEvidenceDetailLine = (label: string, value?: string | null) =>
  value && value.length > 0 ? `${label}: ${value}` : "";

const formatEvidenceContextLine = (
  contextLabel?: string | null,
  locatorLabel?: string | null,
) => {
  const value = [locatorLabel, contextLabel]
    .filter((entry): entry is string => Boolean(entry && entry.length > 0))
    .join(" · ");
  return value.length > 0 ? `location: ${value}` : "";
};

export const formatSourceSummaryDetails = (summary: RAGSourceSummary) =>
  [
    `best score: ${formatScore(summary.bestScore)}`,
    `coverage: ${summary.count} chunk(s) · citations ${summary.citationNumbers.map((value) => `[${value}]`).join(" ") || "none"}`,
    formatEvidenceContextLine(summary.contextLabel, summary.locatorLabel),
    formatEvidenceDetailLine("provenance", summary.provenanceLabel),
  ].filter((value) => value.length > 0);

export const formatGroundingReferenceDetails = (
  reference: RAGGroundingReference,
) =>
  [
    formatEvidenceDetailLine(
      "evidence",
      reference.source ?? reference.title ?? reference.chunkId,
    ),
    formatEvidenceContextLine(reference.contextLabel, reference.locatorLabel),
    formatEvidenceDetailLine("provenance", reference.provenanceLabel),
    `score: ${formatScore(reference.score)}`,
  ].filter((value) => value.length > 0);

export const formatCitationDetails = (citation: RAGCitation) =>
  [
    formatEvidenceDetailLine(
      "evidence",
      citation.source ?? citation.title ?? citation.chunkId,
    ),
    formatEvidenceContextLine(citation.contextLabel, citation.locatorLabel),
    formatEvidenceDetailLine("provenance", citation.provenanceLabel),
    `score: ${formatScore(citation.score)}`,
  ].filter((value) => value.length > 0);

export const formatGroundingPartReferences = (referenceNumbers: number[]) =>
  referenceNumbers.map((value) => `[${value}]`).join(" ");

export const formatGroundedAnswerPartDetails = (
  part: Extract<RAGGroundedAnswerPart, { type: "citation" }>,
) => [
  ...part.referenceDetails.flatMap((detail) =>
    [detail.evidenceLabel, detail.evidenceSummary]
      .filter((value): value is string => Boolean(value && value.length > 0))
      .map((value, index) =>
        index === 0
          ? `evidence ${detail.number}: ${value}`
          : `summary ${detail.number}: ${value}`,
      ),
  ),
  ...(part.unresolvedReferenceNumbers.length > 0
    ? [
        `unresolved: ${part.unresolvedReferenceNumbers
          .map((value) => `[${value}]`)
          .join(" ")}`,
      ]
    : []),
];

export const formatReadinessSummary = (readiness?: RAGExtractorReadiness) => {
  const presentation = buildRAGReadinessPresentation(readiness);
  return presentation.sections.map(
    (section) => `${section.label}: ${section.title} · ${section.summary}`,
  );
};

export const formatHealthSummary = (health?: RAGCorpusHealth) => {
  const presentation = buildRAGCorpusHealthPresentation(health);
  const coverage = presentation.sections.find(
    (section) => section.label === "Corpus coverage",
  );
  const quality = presentation.sections.find(
    (section) => section.label === "Chunk quality",
  );
  const freshness = presentation.sections.find(
    (section) => section.label === "Freshness",
  );
  const failures = presentation.sections.find(
    (section) => section.label === "Failures",
  );
  const oldest =
    freshness?.rows?.find((row) => row.label === "Oldest age")?.value ?? "";
  const newest =
    freshness?.rows?.find((row) => row.label === "Newest age")?.value ?? "";

  return [
    coverage
      ? `Coverage by format: ${coverage.title.replace(/^Formats:\s*/, "")}`
      : "",
    coverage
      ? `Coverage by kind: ${coverage.summary.replace(/^Kinds:\s*/, "")}`
      : "",
    coverage?.rows?.find((row) => row.label === "Average chunks per document")
      ? `Average chunks per document: ${coverage.rows.find((row) => row.label === "Average chunks per document")?.value ?? ""}`
      : "",
    freshness
      ? `Stale documents: ${freshness.title} within ${freshness.summary.replace(/^Stale threshold\s*/, "")}`
      : "",
    failures
      ? `Duplicates: ${failures.summary.replace(/^Duplicate\s*/, "").replace(/ · duplicate ids /, " · document ids ")}`
      : "",
    quality
      ? `Missing fields: source ${quality.rows?.find((row) => row.label === "Missing source")?.value ?? "0"} · title ${quality.rows?.find((row) => row.label === "Missing title")?.value ?? "0"} · metadata ${quality.rows?.find((row) => row.label === "Missing metadata")?.value ?? "0"}`
      : "",
    quality ? `Chunk quality: ${quality.summary}` : "",
    freshness && oldest.length > 0 && newest.length > 0
      ? `Document age window: oldest ${oldest} · newest ${newest}`
      : "",
  ].filter((value) => value.length > 0);
};

export const formatFailureSummary = (health?: RAGCorpusHealth) => {
  const failures = buildRAGCorpusHealthPresentation(health).sections.find(
    (section) => section.label === "Failures",
  );
  if (!failures) {
    return [] as string[];
  }

  return [
    failures.title,
    ...(failures.rows ?? []).map((row) => `${row.label}: ${row.value}`),
  ];
};

export const formatInspectionSummary = (health?: RAGCorpusHealth) => {
  const inspection = health?.inspection;
  if (!inspection) {
    return [] as string[];
  }

  const nativeKinds = Object.entries(inspection.sourceNativeKinds ?? {})
    .map(([key, value]) => `${key} ${value}`)
    .join(" · ");

  return [
    nativeKinds.length > 0
      ? `Source-native kinds: ${nativeKinds}`
      : "Source-native kinds: none detected",
    `Labeled inspection: documents ${inspection.documentsWithSourceLabels} · chunks ${inspection.chunksWithSourceLabels}`,
  ];
};

export const formatInspectionSamples = (health?: RAGCorpusHealth) => {
  const inspection = health?.inspection;
  if (!inspection) {
    return [] as string[];
  }

  return [
    ...(inspection.sampleDocuments ?? []).map((entry) =>
      [
        "document",
        entry.id,
        entry.sourceNativeKind,
        entry.labels?.locatorLabel ?? entry.labels?.contextLabel,
        entry.source,
      ]
        .filter((value) => typeof value === "string" && value.length > 0)
        .join(" · "),
    ),
    ...(inspection.sampleChunks ?? []).map((entry) =>
      [
        "chunk",
        entry.chunkId,
        entry.sourceNativeKind,
        entry.labels?.locatorLabel ?? entry.labels?.contextLabel,
        entry.source,
      ]
        .filter((value) => typeof value === "string" && value.length > 0)
        .join(" · "),
    ),
  ];
};

export const buildInspectionEntryHref = (
  mode: DemoBackendMode,
  entry: DemoInspectionEntry,
) => {
  const params = new URLSearchParams();
  if (entry.sourceQuery) params.set("query", entry.sourceQuery);
  if (entry.documentId) params.set("documentId", entry.documentId);
  if (entry.documentId) params.set("inspect", "true");
  const query = params.toString();
  return `/demo/documents/${mode}${query ? `?${query}` : ""}`;
};

export const buildInspectionEntries = (
  health?: RAGCorpusHealth,
): DemoInspectionEntry[] => {
  const inspection = health?.inspection;
  if (!inspection) {
    return [];
  }

  return [
    ...(inspection.sampleDocuments ?? []).map((entry) => ({
      id: `document:${entry.id}`,
      kind: "document" as const,
      label: [
        entry.sourceNativeKind,
        entry.labels?.locatorLabel ?? entry.labels?.contextLabel ?? entry.title,
      ]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0,
        )
        .join(" · "),
      detail: entry.source,
      documentId: entry.id,
      source: entry.source,
      sourceQuery: entry.source || entry.title,
    })),
    ...(inspection.sampleChunks ?? []).map((entry) => ({
      id: `chunk:${entry.chunkId}`,
      kind: "chunk" as const,
      label: [
        entry.sourceNativeKind,
        entry.labels?.locatorLabel ??
          entry.labels?.contextLabel ??
          entry.chunkId,
      ]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0,
        )
        .join(" · "),
      detail: entry.source ?? entry.chunkId,
      documentId: entry.documentId,
      source: entry.source,
      sourceQuery: entry.source ?? entry.documentId ?? entry.chunkId,
    })),
  ];
};

export const formatAdminJobSummary = (job: RAGAdminJobRecord) =>
  buildRAGAdminJobPresentations([job])[0]?.summary ?? "";

export const formatAdminActionSummary = (action: RAGAdminActionRecord) => {
  return buildRAGAdminActionPresentations([action])[0]?.summary ?? "";
};

export const formatAdminJobList = (jobs?: RAGAdminJobRecord[]) =>
  buildRAGAdminJobPresentations(jobs).map((job) => job.summary);

export const formatAdminActionList = (actions?: RAGAdminActionRecord[]) =>
  buildRAGAdminActionPresentations(actions).map((action) => action.summary);

const readMetadataString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const readMetadataNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const isLinkedProviderSource = (source: RAGSyncSourceRecord) =>
  source.metadata?.accountMode === "live-linked" &&
  typeof source.metadata?.linkedConnectorProvider === "string";

export type LinkedConnectorAccountSummary = {
  sourceId: string;
  sourceLabel: string;
  providerId: string;
  providerLabel: string;
  ownerRef?: string;
  accountLabel?: string;
  email?: string;
  bindingId?: string;
  bindingLabel?: string;
  bindingStatus?: string;
  grantStatus?: string;
  selectionMode?: string;
  scopeSummary?: string;
  availableBindingCount?: number;
  providerConfigured: boolean;
  providerFound?: boolean;
  providerError?: string;
};

const formatLinkedConnectorProviderLabel = (provider?: string) => {
  switch (provider) {
    case "gmail":
      return "Gmail";
    case "google_contacts":
      return "Google Contacts";
    case "facebook":
      return "Facebook";
    case "instagram":
      return "Instagram";
    default:
      return provider ?? "Linked provider";
  }
};

export const listLinkedConnectorAccounts = (
  syncSources?: RAGSyncSourceRecord[],
) =>
  (syncSources ?? [])
    .filter((source) => isLinkedProviderSource(source))
    .map((source) => {
      const metadata = source.metadata ?? {};
      const providerId =
        readMetadataString(metadata.linkedConnectorProvider) ?? "linked";
      const accountLabel =
        readMetadataString(metadata.linkedAccountLabel) ??
        readMetadataString(metadata.linkedMailboxLabel) ??
        readMetadataString(metadata.linkedExternalAccountId);

      return {
        accountLabel,
        availableBindingCount: readMetadataNumber(
          metadata.linkedAvailableBindingCount,
        ),
        bindingId: readMetadataString(metadata.linkedBindingId),
        bindingLabel: readMetadataString(metadata.linkedBindingLabel),
        bindingStatus: readMetadataString(metadata.linkedBindingStatus),
        email: readMetadataString(metadata.linkedEmail),
        grantStatus: readMetadataString(metadata.linkedGrantStatus),
        ownerRef: readMetadataString(metadata.linkedOwnerRef),
        providerConfigured: metadata.linkedProviderConfigured !== false,
        providerError: readMetadataString(metadata.linkedProviderError),
        providerFound:
          metadata.linkedProviderFound === true
            ? true
            : metadata.linkedProviderFound === false
              ? false
              : undefined,
        providerId,
        providerLabel: formatLinkedConnectorProviderLabel(providerId),
        scopeSummary: readMetadataString(metadata.linkedProviderScopeSummary),
        selectionMode: readMetadataString(metadata.linkedProviderSelectionMode),
        sourceId: source.id,
        sourceLabel: source.label,
      } satisfies LinkedConnectorAccountSummary;
    });

const formatLinkedProviderPrimaryDetails = (source: RAGSyncSourceRecord) => {
  if (!isLinkedProviderSource(source)) {
    return [] as string[];
  }

  const metadata = source.metadata ?? {};
  const provider = readMetadataString(metadata.linkedConnectorProvider);
  const ownerRef = readMetadataString(metadata.linkedOwnerRef);
  const account =
    readMetadataString(metadata.linkedAccountLabel) ??
    readMetadataString(metadata.linkedMailboxLabel) ??
    readMetadataString(metadata.linkedExternalAccountId);
  const bindingStatus = readMetadataString(metadata.linkedBindingStatus);
  const grantStatus = readMetadataString(metadata.linkedGrantStatus);

  return [
    provider ? `linked provider: ${provider}` : "",
    ownerRef ? `linked owner: ${ownerRef}` : "",
    account ? `linked account: ${account}` : "",
    bindingStatus ? `binding status: ${bindingStatus}` : "",
    grantStatus ? `grant status: ${grantStatus}` : "",
  ].filter((value) => value.length > 0);
};

const formatLinkedProviderExtendedDetails = (source: RAGSyncSourceRecord) => {
  if (!isLinkedProviderSource(source)) {
    return [] as string[];
  }

  const metadata = source.metadata ?? {};
  const bindingId = readMetadataString(metadata.linkedBindingId);
  const selectionMode = readMetadataString(
    metadata.linkedProviderSelectionMode,
  );
  const scopeSummary = readMetadataString(metadata.linkedProviderScopeSummary);
  const expiresAt = readMetadataNumber(metadata.linkedGrantExpiresAt);
  const refreshError = readMetadataString(metadata.linkedGrantLastRefreshError);
  const configError = readMetadataString(metadata.linkedProviderError);
  const availableBindingCount = readMetadataNumber(
    metadata.linkedAvailableBindingCount,
  );
  const found =
    metadata.linkedProviderFound === true
      ? "resolved"
      : metadata.linkedProviderFound === false
        ? "missing"
        : undefined;

  return [
    found ? `linked credential: ${found}` : "",
    bindingId ? `binding id: ${bindingId}` : "",
    selectionMode ? `selection mode: ${selectionMode}` : "",
    typeof availableBindingCount === "number"
      ? `available bindings: ${availableBindingCount}`
      : "",
    scopeSummary ? `granted scopes: ${scopeSummary}` : "",
    typeof expiresAt === "number"
      ? `token expiry: ${new Date(expiresAt).toLocaleString()}`
      : "",
    refreshError ? `refresh error: ${refreshError}` : "",
    configError ? `linked provider error: ${configError}` : "",
  ].filter((value) => value.length > 0);
};

export const formatSyncSourceSummary = (source: RAGSyncSourceRecord) =>
  (() => {
    const discoverySummary = buildSyncDiscoverySummary(source);
    return [
      source.label,
      buildRAGSyncSourcePresentation(source).summary,
      discoverySummary,
    ]
      .filter((value) => value.length > 0)
      .join(" · ");
  })();

export const formatSyncSourceDetails = (source: RAGSyncSourceRecord) => [
  ...formatLinkedProviderPrimaryDetails(source),
  ...buildRAGSyncSourcePresentation(source).rows.map(
    (row) => `${row.label.toLowerCase()}: ${row.value}`,
  ),
  ...formatSyncSourceRecentRuns(source).map(
    (run, index) =>
      `recent run ${index + 1}: ${run.trigger} ${run.status} ${run.output} ${run.duration} ${run.finishedAt}${run.error ? ` error ${run.error}` : ""}`,
  ),
];

export const formatSyncSourceRecentRuns = (source: RAGSyncSourceRecord) =>
  (buildRAGSyncSourcePresentation(source).runs ?? []).map((run) => ({
    duration: run.rows?.find((row) => row.label === "Duration")?.value ?? "n/a",
    error: run.rows?.find((row) => row.label === "Error")?.value ?? "",
    finishedAt:
      run.rows?.find((row) => row.label === "Finished")?.value ?? "n/a",
    label: run.label,
    output: run.rows?.find((row) => row.label === "Output")?.value ?? "n/a",
    status: run.status,
    trigger: run.rows?.find((row) => row.label === "Trigger")?.value ?? "sync",
  }));

export const formatSyncSourceExtendedDetails = (source: RAGSyncSourceRecord) =>
  [
    ...formatLinkedProviderExtendedDetails(source),
    buildSyncDiscoverySummary(source),
    buildRAGSyncSourcePresentation(source).extendedSummary ?? "",
  ].filter(
    (value, index, values) =>
      value.length > 0 && values.indexOf(value) === index,
  );

export const formatSyncSourceOverview = (sources?: RAGSyncSourceRecord[]) => {
  return buildRAGSyncOverviewPresentation(sources).rows.map(
    (row) => `${row.label}: ${row.value}`,
  );
};

export const formatSyncSourceActionSummary = (source: RAGSyncSourceRecord) =>
  (() => {
    const presentation = buildRAGSyncSourcePresentation(source);
    const lastSuccess = presentation.rows.find(
      (row) => row.label === "Last success",
    )?.value;
    const discoverySummary = buildSyncDiscoverySummary(source);

    return [
      source.status.toUpperCase(),
      lastSuccess ? `last sync ${lastSuccess}` : "no completed sync yet",
      typeof source.documentCount === "number"
        ? `${source.documentCount} docs`
        : "",
      typeof source.chunkCount === "number"
        ? `${source.chunkCount} chunks`
        : "",
      discoverySummary,
    ]
      .filter((value) => value.length > 0)
      .join(" · ");
  })();

export const formatSyncSourceActionBadges = (source: RAGSyncSourceRecord) =>
  buildRAGSyncSourcePresentation(source).tags ?? [];

export const formatSyncSourceCollapsedSummary = (source: RAGSyncSourceRecord) =>
  (() => {
    const presentation = buildRAGSyncSourcePresentation(source);
    const lastSuccess = presentation.rows.find(
      (row) => row.label === "Last success",
    )?.value;
    const error = presentation.rows.find(
      (row) => row.label === "Last error",
    )?.value;
    const discoverySummary = buildSyncDiscoverySummary(source);

    return [
      source.label,
      source.status.toUpperCase(),
      error && source.status === "failed"
        ? `error: ${error}`
        : lastSuccess
          ? `last sync ${lastSuccess}`
          : "",
      discoverySummary,
    ]
      .filter((value) => value.length > 0)
      .join(" · ");
  })();

export const formatSyncSourceSubtype = (source: RAGSyncSourceRecord) => {
  if (typeof source.metadata?.provider === "string") {
    if (typeof source.metadata?.accountMode === "string") {
      return `${source.metadata.provider} ${source.metadata.accountMode}`;
    }

    return source.metadata.provider;
  }

  switch (source.kind) {
    case "directory":
      return "Watched folder";
    case "storage":
      return "Object storage";
    case "url":
      return "Route fetch";
    case "email":
      return "Mailbox sync";
    default:
      return source.kind;
  }
};

const syncStatusRank = (status: string) => {
  switch (status.toLowerCase()) {
    case "failed":
    case "error":
      return 0;
    case "running":
      return 1;
    case "idle":
      return 2;
    case "completed":
      return 3;
    default:
      return 4;
  }
};

export const sortSyncSources = <T extends RAGSyncSourceRecord>(sources?: T[]) =>
  [...(sources ?? [])].sort((left, right) => {
    const byStatus = syncStatusRank(left.status) - syncStatusRank(right.status);
    if (byStatus !== 0) return byStatus;
    const leftTime = left.lastSuccessfulSyncAt ?? left.lastSyncedAt ?? 0;
    const rightTime = right.lastSuccessfulSyncAt ?? right.lastSyncedAt ?? 0;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return left.label.localeCompare(right.label);
  });

export const formatSyncDeltaChips = (sources?: RAGSyncSourceRecord[]) => {
  const records = sources ?? [];
  if (records.length === 0) {
    return ["sync: none configured"];
  }

  const countByStatus = (status: string) =>
    records.filter((record) => record.status.toLowerCase() === status).length;
  const latest = sortSyncSources(records).find(
    (record) =>
      typeof record.lastSuccessfulSyncAt === "number" ||
      typeof record.lastSyncedAt === "number",
  );

  return [
    `sync failed: ${countByStatus("failed")}`,
    `sync running: ${countByStatus("running")}`,
    `sync completed: ${countByStatus("completed")}`,
    `sync discovery hints: ${records.filter((record) => hasSyncDiscoveryDiagnostics(record)).length}`,
    latest ? `latest sync: ${latest.label}` : "latest sync: none",
  ];
};

const syncDiscoveryDiagnosticLabelByCode: Partial<Record<string, string>> = {
  canonical_dedupe_applied: "canonical dedupe",
  robots_blocked: "robots blocked",
  nofollow_skipped: "nofollow",
  noindex_skipped: "noindex",
};

const buildSyncDiscoverySummary = (source: RAGSyncSourceRecord) => {
  const labels = (source.diagnostics?.entries ?? [])
    .map((entry) => syncDiscoveryDiagnosticLabelByCode[entry.code])
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
  if (labels.length === 0) {
    return "";
  }
  return `discovery ${labels.join(" · ")}`;
};

const hasSyncDiscoveryDiagnostics = (source: RAGSyncSourceRecord) =>
  (source.diagnostics?.entries ?? []).some(
    (entry) =>
      typeof syncDiscoveryDiagnosticLabelByCode[entry.code] === "string",
  );

export const formatRetrievalScopeSummary = (search: SearchFormState) => {
  const parts = [
    search.kind ? `kind ${search.kind}` : "",
    search.source.trim().length > 0 ? `source ${search.source.trim()}` : "",
    search.documentId.trim().length > 0
      ? `document ${search.documentId.trim()}`
      : "",
    search.nativeQueryProfile ? `planner ${search.nativeQueryProfile}` : "",
  ].filter((value) => value.length > 0);

  return parts.length > 0
    ? `Active scope: ${parts.join(" · ")}`
    : "Active scope: whole index";
};

export const formatRetrievalScopeHint = (search: SearchFormState) => {
  const hasSource = search.source.trim().length > 0;
  const hasDocument = search.documentId.trim().length > 0;
  if (hasSource && hasDocument) {
    return "Both source and document filters are active. Clear one if you want broader retrieval.";
  }
  if (hasDocument) {
    return "Document scope is locked to a single indexed document. Row actions set this automatically.";
  }
  if (hasSource) {
    return "Source scope is locked to a single source path. Row actions set this automatically.";
  }
  if (search.kind) {
    return "Kind filtering is active. Retrieval is constrained to the selected document kind.";
  }
  if (search.nativeQueryProfile) {
    return `Planner profile ${search.nativeQueryProfile} is active. Retrieval tuning is being applied before the search runs.`;
  }
  return "Use row actions or the filters below to narrow retrieval before searching.";
};

export const formatDate = (value: number) => new Date(value).toLocaleString();
export const formatScore = (value: number) => value.toFixed(4);

const formatMetadataValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map((entry) => formatMetadataValue(entry)).join(", ");
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return typeof value === "string" ? value : "";
};

export const formatDemoMetadataSummary = (
  metadata?: Record<string, unknown>,
) => {
  if (!metadata) {
    return [] as string[];
  }

  const lines: string[] = [];
  const push = (label: string, key: string) => {
    const value = formatMetadataValue(metadata[key]);
    if (value.length > 0) {
      lines.push(label + ": " + value);
    }
  };

  push("extractor", "extractor");
  push("kind", "fileKind");
  push("legacy", "legacyFormat");
  push("pages", "pageCount");
  push("sections", "sectionCount");
  push("slides", "slideCount");
  push("sheets", "sheetNames");
  push("ocr", "ocrEngine");
  push("ocr source", "extractedFrom");
  push("transcript", "transcriptSource");
  push("media", "mediaKind");
  push("pdf mode", "pdfTextMode");
  push("archive", "archiveType");
  push("entry", "archivePath");
  push("thread", "threadTopic");
  push("from", "from");
  push("to", "to");

  return lines;
};

export const formatContentFormat = (value: DemoContentFormat) => {
  switch (value) {
    case "markdown":
      return "Markdown";
    case "html":
      return "HTML";
    case "text":
    default:
      return "Plain text";
  }
};

export const formatChunkStrategy = (value: DemoChunkingStrategy) => {
  switch (value) {
    case "source_aware":
      return "Source-aware";
    case "paragraphs":
      return "Paragraphs";
    case "sentences":
      return "Sentences";
    case "fixed":
    default:
      return "Fixed window";
  }
};

export const formatOptionalContentFormat = (value?: string | null) =>
  formatContentFormat(
    value === "markdown" || value === "html" ? value : "text",
  );

export const formatOptionalChunkStrategy = (value?: string | null) =>
  formatChunkStrategy(
    value === "source_aware" || value === "sentences" || value === "fixed"
      ? value
      : "paragraphs",
  );

export const formatChunkNavigationNodeLabel = (
  node?: Pick<
    RAGChunkGraphNode,
    "chunkId" | "locatorLabel" | "contextLabel"
  > | null,
) => node?.locatorLabel ?? node?.contextLabel ?? node?.chunkId ?? "";

export const formatChunkNavigationSectionLabel = (
  navigation?: Pick<RAGChunkGraphNavigation, "section"> | null,
) => {
  const path = navigation?.section?.path ?? [];
  if (path.length > 0) {
    return path.join(" > ");
  }

  return navigation?.section?.title ?? "Current section";
};

export const formatChunkSectionGroupLabel = (
  section?: Pick<RAGChunkGraphSectionGroup, "id" | "path" | "title"> | null,
) => {
  const path = section?.path ?? [];
  if (path.length > 0) {
    return path.join(" > ");
  }

  return section?.title ?? section?.id ?? "Section";
};

const formatSectionDiagnosticPercent = (value?: number) =>
  typeof value === "number" ? `${Math.round(value * 100)}%` : null;

const formatSectionDiagnosticReason = (reason: string) =>
  reason.replaceAll("_", " ");

const formatSectionDiagnosticStage = (stage: string) =>
  stage.replaceAll("_", " ");

const formatSectionDiagnosticWeightReason = (reason: string) =>
  ({
    final_stage_concentration: "final stage concentrated on this section",
    final_stage_dominant_within_parent:
      "final stage stayed ahead inside its parent",
    rerank_preserved_lead: "rerank kept this section in front",
    stage_runner_up_pressure: "runner-up stayed close in this stage",
    stage_expanded: "this section expanded in this stage",
    stage_held: "this section held steady in this stage",
    stage_narrowed: "this section narrowed in this stage",
  })[reason] ?? reason.replaceAll("_", " ");

const formatSectionQueryAttributionReason = (reason: string) =>
  ({
    base_query_only: "came only from the base query",
    transformed_query_only: "came only from the transformed query",
    variant_only: "came only from query variants",
    transform_introduced: "the transformed query introduced this section",
    variant_supported: "query variants reinforced this section",
    mixed_query_sources: "multiple query forms contributed",
  })[reason] ?? reason.replaceAll("_", " ");

export const formatSectionDiagnosticChannels = (
  diagnostic: RAGSectionRetrievalDiagnostic,
) =>
  `Channels · hybrid ${diagnostic.hybridHits} · vector ${diagnostic.vectorHits} · lexical ${diagnostic.lexicalHits}`;

export const formatSectionDiagnosticAttributionFocus = (
  diagnostic: DemoSectionDiagnostic,
) => {
  const mode = diagnostic.queryAttribution?.mode ?? "mixed";
  const label =
    mode === "primary"
      ? "Attribution · base-query-only"
      : mode === "transformed"
        ? "Attribution · transformed-only"
        : mode === "variant"
          ? "Attribution · variant-only"
          : "Attribution · mixed";
  const parts = [label];
  if ((diagnostic.queryAttribution?.primaryHits ?? 0) > 0)
    parts.push(`base ${diagnostic.queryAttribution?.primaryHits}`);
  if ((diagnostic.queryAttribution?.transformedHits ?? 0) > 0)
    parts.push(`transformed ${diagnostic.queryAttribution?.transformedHits}`);
  if ((diagnostic.queryAttribution?.variantHits ?? 0) > 0)
    parts.push(`variant ${diagnostic.queryAttribution?.variantHits}`);
  return parts.join(" · ");
};

export const formatSectionDiagnosticPipeline = (
  diagnostic: DemoSectionDiagnostic,
) => {
  const requestedMode =
    diagnostic.requestedMode ?? diagnostic.retrievalMode ?? "n/a";
  const selectedMode = diagnostic.retrievalMode ?? "n/a";
  const routeLabel = diagnostic.routingLabel ?? "default route";
  const transformLabel = diagnostic.queryTransformLabel ?? "no transform";
  return `Mode ${selectedMode} · requested ${requestedMode} · route ${routeLabel} · transform ${transformLabel} · rerank ${diagnostic.rerankApplied ? "on" : "off"} · source balance ${diagnostic.sourceBalanceApplied ? "on" : "off"} · threshold ${diagnostic.scoreThresholdApplied ? "on" : "off"} · query ${diagnostic.queryAttribution?.mode ?? "n/a"}`;
};

export const formatSectionDiagnosticStageFlow = (
  diagnostic: RAGSectionRetrievalDiagnostic,
) =>
  diagnostic.stageCounts.length > 0
    ? `Stage flow · ${diagnostic.stageCounts
        .map(
          (entry) =>
            `${formatSectionDiagnosticStage(entry.stage)} ${entry.count}`,
        )
        .join(" → ")}`
    : null;

export const formatSectionDiagnosticStageBounds = (
  diagnostic: DemoSectionDiagnostic,
) => {
  const parts: string[] = [];
  if (diagnostic.firstSeenStage)
    parts.push(
      `first seen ${formatSectionDiagnosticStage(diagnostic.firstSeenStage)}`,
    );
  if (diagnostic.lastSeenStage)
    parts.push(
      `last seen ${formatSectionDiagnosticStage(diagnostic.lastSeenStage)}`,
    );
  if (diagnostic.peakStage)
    parts.push(
      `peak ${formatSectionDiagnosticStage(diagnostic.peakStage)} ${diagnostic.peakCount}`,
    );
  const finalRetention = formatSectionDiagnosticPercent(
    diagnostic.finalRetentionRate,
  );
  if (finalRetention) parts.push(`final retention ${finalRetention}`);
  if (typeof diagnostic.dropFromPeak === "number")
    parts.push(`drop from peak ${diagnostic.dropFromPeak}`);
  return parts.length > 0 ? parts.join(" · ") : null;
};

export const formatSectionDiagnosticStageWeightRows = (
  diagnostic: DemoSectionDiagnostic,
) =>
  (diagnostic.stageWeights ?? [])
    .filter(
      (entry: DemoSectionDiagnostic["stageWeights"][number]) =>
        entry.reasons.length > 0 ||
        entry.stage === "rerank" ||
        entry.stage === "finalize",
    )
    .map((entry: DemoSectionDiagnostic["stageWeights"][number]) => {
      const parts = [
        `${formatSectionDiagnosticStage(entry.stage)} ${(entry.stageShare * 100).toFixed(0)}% of stage`,
        typeof entry.stageScoreShare === "number"
          ? `${(entry.stageScoreShare * 100).toFixed(0)}% of stage score`
          : null,
        typeof entry.retentionRate === "number" &&
        entry.previousStage &&
        entry.retentionRate !== 1
          ? `${(entry.retentionRate * 100).toFixed(0)}% retained from ${formatSectionDiagnosticStage(entry.previousStage)}`
          : null,
        typeof entry.countDelta === "number" && entry.countDelta !== 0
          ? `delta ${entry.countDelta >= 0 ? "+" : ""}${entry.countDelta}`
          : null,
        typeof entry.parentStageShare === "number" &&
        entry.strongestSiblingLabel
          ? `${(entry.parentStageShare * 100).toFixed(0)}% of parent stage`
          : null,
        typeof entry.parentStageScoreShare === "number" &&
        entry.strongestSiblingLabel
          ? `${(entry.parentStageScoreShare * 100).toFixed(0)}% of parent stage score`
          : null,
        typeof entry.stageShareGap === "number"
          ? `gap ${(entry.stageShareGap * 100).toFixed(0)}%`
          : null,
        typeof entry.stageScoreShareGap === "number"
          ? `score gap ${(entry.stageScoreShareGap * 100).toFixed(0)}%`
          : null,
        entry.strongestSiblingLabel
          ? `runner-up ${entry.strongestSiblingLabel}`
          : null,
      ].filter((value): value is string => Boolean(value));
      return parts.join(" · ");
    });

export const formatSectionDiagnosticStageWeightReasons = (
  diagnostic: DemoSectionDiagnostic,
) =>
  (diagnostic.stageWeights ?? []).flatMap(
    (entry: DemoSectionDiagnostic["stageWeights"][number]) =>
      entry.reasons.map(
        (reason: string) =>
          `${formatSectionDiagnosticStage(entry.stage)} · ${formatSectionDiagnosticWeightReason(reason)}`,
      ),
  );

export const formatSectionDiagnosticQueryAttribution = (
  diagnostic: DemoSectionDiagnostic,
) =>
  `Query attribution · ${diagnostic.queryAttribution?.mode ?? "n/a"} · primary ${diagnostic.queryAttribution?.primaryHits ?? 0} · transformed ${diagnostic.queryAttribution?.transformedHits ?? 0} · variant ${diagnostic.queryAttribution?.variantHits ?? 0}`;

export const formatSectionDiagnosticQueryAttributionReasons = (
  diagnostic: DemoSectionDiagnostic,
) =>
  (diagnostic.queryAttribution?.reasons ?? []).map((reason: string) =>
    formatSectionQueryAttributionReason(reason),
  );

export const formatSectionDiagnosticCompetition = (
  diagnostic: RAGSectionRetrievalDiagnostic,
) => {
  const parts: string[] = [];
  const parentShare = formatSectionDiagnosticPercent(diagnostic.parentShare);
  const parentShareGap = formatSectionDiagnosticPercent(
    diagnostic.parentShareGap,
  );
  if (!diagnostic.strongestSiblingLabel) return "";
  if (parentShare) parts.push(`parent share ${parentShare}`);
  if (parentShareGap) parts.push(`gap ${parentShareGap}`);
  parts.push(`runner-up ${diagnostic.strongestSiblingLabel}`);
  return parts.join(" · ");
};

export const formatSectionDiagnosticTopEntry = (
  diagnostic: DemoSectionDiagnostic,
) => {
  const parts: string[] = [];
  if (diagnostic.topSource) parts.push(`top source ${diagnostic.topSource}`);
  if (diagnostic.topChunkId) parts.push(`lead chunk ${diagnostic.topChunkId}`);
  parts.push(
    `${diagnostic.sourceCount} source${diagnostic.sourceCount === 1 ? "" : "s"}`,
  );
  parts.push(
    `primary ${diagnostic.queryAttribution?.primaryHits ?? 0} · transformed ${diagnostic.queryAttribution?.transformedHits ?? 0} · variant ${diagnostic.queryAttribution?.variantHits ?? 0}`,
  );
  return parts.join(" · ");
};

export const formatSectionDiagnosticReasons = (
  diagnostic: DemoSectionDiagnostic,
) => [
  ...diagnostic.reasons.map((reason) => formatSectionDiagnosticReason(reason)),
  ...formatSectionDiagnosticQueryAttributionReasons(diagnostic),
  ...(diagnostic.routingReason
    ? [`routing · ${diagnostic.routingReason}`]
    : []),
  ...(diagnostic.queryTransformReason
    ? [`transform · ${diagnostic.queryTransformReason}`]
    : []),
];

export const formatSectionDiagnosticDistributionRows = (
  diagnostic: RAGSectionRetrievalDiagnostic,
) =>
  diagnostic.parentDistribution.map(
    (entry) =>
      `${entry.isActive ? "Active" : "Peer"} · ${entry.label} · ${entry.count} hit${entry.count === 1 ? "" : "s"} · ${formatSectionDiagnosticPercent(entry.parentShare) ?? "0%"}`,
  );

export const getDemoUploadPreset = (id: string) =>
  demoUploadPresets.find((preset) => preset.id === id) ?? null;

export const getDemoUploadFixtureUrl = (id: string) =>
  "/demo/upload-fixtures/" + encodeURIComponent(id);

export const buildDemoUploadIngestInput = (
  preset: DemoUploadPreset,
  base64Content: string,
): RAGDocumentUploadIngestInput => ({
  baseMetadata: {
    demoUploadPreset: preset.id,
    fileKind: "uploaded-demo-fixture",
    kind: "custom",
  },
  uploads: [
    {
      name: preset.fileName,
      source: preset.source,
      title: preset.title,
      contentType: preset.contentType,
      encoding: "base64",
      content: base64Content,
      metadata: {
        demoUploadPreset: preset.id,
        fixturePath: preset.fixturePath,
        kind: "custom",
      },
    },
  ],
});

export const encodeArrayBufferToBase64 = (value: ArrayBuffer) => {
  const bytes = new Uint8Array(value);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
};
