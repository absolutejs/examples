import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRAG } from "@absolutejs/rag/react";
import type {
  RAGEvaluationResponse,
  RAGRetrievalTrace,
  RAGSource,
  RAGSyncSourceRecord,
} from "@absolutejs/rag";
import {
  type AddFormState,
  type DemoAIModelCatalogResponse,
  type DemoActiveRetrievalState,
  type DemoReleaseOpsResponse,
  type DemoReleaseWorkspace,
  type DemoRetrievalQualityResponse,
  type DemoBackendMode,
  type DemoChunkPreview,
  type DemoDocument,
  type SearchFormState,
  type SearchResponse,
  buildDemoAIStreamPrompt,
  buildDemoEvaluationSuite,
  buildDemoEvaluationInput,
  buildDemoReleasePanelState,
  buildDemoUploadIngestInput,
  buildCitationGroups,
  buildGroundingReferenceGroups,
  buildSourceSummarySectionGroups,
  buildTracePresentation,
  formatEvaluationCaseSummary,
  formatEvaluationExpected,
  formatEvaluationMissing,
  formatEvaluationRetrieved,
  formatEvaluationSummary,
  formatEvaluationHistoryDiff,
  formatEvaluationHistoryDetails,
  formatEvaluationHistoryRows,
  formatEvaluationHistoryTracePresentations,
  formatEvaluationHistorySummary,
  formatEvaluationLeaderboardEntry,
  formatGroundingEvaluationCase,
  formatGroundingEvaluationDetails,
  formatGroundingEvaluationSummary,
  formatGroundingHistoryDiff,
  formatGroundingCaseDifficultyEntry,
  formatGroundingDifficultyHistoryDiff,
  formatGroundingDifficultyHistoryDetails,
  formatGroundingDifficultyHistorySummary,
  formatGroundingHistorySnapshots,
  formatGroundingHistorySummary,
  formatGroundingHistoryDetails,
  formatGroundingHistoryArtifactTrail,
  formatGroundingProviderCasePresentations,
  formatGroundingHistorySnapshotPresentations,
  formatGroundingProviderPresentations,
  formatGroundingProviderOverviewPresentation,
  formatQualityOverviewPresentation,
  formatQualityOverviewNotes,
  formatRetrievalComparisonOverviewPresentation,
  buildSearchPayload,
  attributionBenchmarkNotes,
  benchmarkOutcomeRail,
  formatBenchmarkOutcomeRailLabel,
  resolveBenchmarkRetrievalPresetId,
  buildSearchResponse,
  buildActiveChunkPreviewSectionDiagnostic,
  buildSearchSectionGroups,
  buildStatusView,
  demoEvaluationPresets,
  demoChunkingStrategies,
  demoUploadPresets,
  demoReleaseWorkspaces,
  demoContentFormats,
  formatAdminActionList,
  formatAdminJobList,
  formatDemoAIModelLabel,
  formatCitationDetails,
  formatChunkNavigationNodeLabel,
  formatChunkNavigationSectionLabel,
  formatChunkSectionGroupLabel,
  formatSectionDiagnosticAttributionFocus,
  formatSectionDiagnosticChannels,
  formatSectionDiagnosticCompetition,
  formatSectionDiagnosticDistributionRows,
  formatSectionDiagnosticPipeline,
  formatSectionDiagnosticStageBounds,
  formatSectionDiagnosticStageFlow,
  formatSectionDiagnosticStageWeightReasons,
  formatSectionDiagnosticStageWeightRows,
  formatSectionDiagnosticReasons,
  formatSectionDiagnosticTopEntry,
  formatChunkStrategy,
  formatCitationExcerpt,
  formatCitationLabel,
  formatCitationSummary,
  formatContentFormat,
  formatOptionalContentFormat,
  formatOptionalChunkStrategy,
  formatDemoMetadataSummary,
  formatDate,
  formatFailureSummary,
  buildInspectionEntries,
  buildInspectionEntryHref,
  formatInspectionSamples,
  formatInspectionSummary,
  formatGroundingCoverage,
  formatGroundedAnswerPartDetails,
  formatGroundedAnswerPartExcerpt,
  formatGroundingPartReferences,
  formatGroundingReferenceDetails,
  formatGroundingReferenceExcerpt,
  formatGroundingReferenceLabel,
  formatGroundingReferenceSummary,
  formatGroundedAnswerSectionSummaryDetails,
  formatGroundedAnswerSectionSummaryExcerpt,
  formatGroundingSummary,
  formatSourceSummaryDetails,
  formatRetrievalComparisonPresentations,
  formatRetrievalComparisonSummary,
  formatRerankerComparisonOverviewPresentation,
  formatRerankerComparisonPresentations,
  formatRerankerComparisonSummary,
  formatHealthSummary,
  formatReadinessSummary,
  formatRetrievalScopeHint,
  formatRetrievalScopeSummary,
  formatScore,
  formatSyncSourceActionBadges,
  formatSyncSourceActionSummary,
  formatSyncSourceCollapsedSummary,
  formatSyncDeltaChips,
  formatSyncSourceOverview,
  formatSyncSourceDetails,
  formatSyncSourceSummary,
  listLinkedConnectorAccounts,
  sortSyncSources,
  encodeArrayBufferToBase64,
  getRAGPathForMode,
  getDemoUploadFixtureUrl,
  getInitialBackendMode,
  loadActiveRetrievalState,
  loadRecentQueries,
  saveActiveRetrievalState,
  saveRecentQueries,
} from "../../demo-backends";

type DemoRagReadinessState = {
  className: string;
  detail: string;
  elapsedMs: number;
  label: string;
  status: "warming" | "ready" | "failed";
};

type DemoProps = {
  mode?: DemoBackendMode;
};

type SyncPendingState =
  | {
      scope: "all";
      background: boolean;
    }
  | {
      scope: "source";
      background: boolean;
      sourceId: string;
    };

type SyncSourcesResponse = {
  mode: DemoBackendMode;
  startup: {
    elapsedMs: number;
    status: "warming" | "ready" | "failed";
    summary: string;
  };
  syncSources: RAGSyncSourceRecord[];
};

type SyncBindingOption = {
  id: string;
  label?: string;
  email?: string;
  externalAccountId?: string;
};

type RagExampleSection =
  | "overview"
  | "connectors"
  | "retrieve"
  | "ingest"
  | "workflow"
  | "evaluate"
  | "ops";

const connectorProviders = [
  {
    description:
      "Gmail mailbox and Google Contacts grants for this AbsoluteJS account.",
    href: "/oauth2/google/authorization?client=connector",
    iconPath: "/assets/svg/providers/google.svg",
    key: "google",
    label: "Connect Google",
  },
  {
    description:
      "Meta grants for Facebook Pages and Instagram business connector testing.",
    href: "/oauth2/facebook/authorization?client=connector",
    iconPath: "/assets/svg/providers/meta.svg",
    key: "facebook",
    label: "Connect Meta",
  },
] as const;

const ragExampleSections: Array<{
  id: RagExampleSection;
  kicker: string;
  title: string;
  description: string;
  loadLabel: string;
}> = [
  {
    id: "retrieve",
    kicker: "1 · Retrieval",
    title: "Search And Verify",
    description:
      "Query the index, inspect sources, and prove metadata filters and chunk attribution.",
    loadLabel: "Load retrieval",
  },
  {
    id: "ingest",
    kicker: "2 · Ingest",
    title: "Add Documents",
    description:
      "Upload extracted fixtures or author custom documents, then verify they are searchable.",
    loadLabel: "Load ingest",
  },
  {
    id: "workflow",
    kicker: "3 · Workflow",
    title: "Grounded Streaming",
    description:
      "Run the RAG answer workflow and inspect citations, grounding, and retrieval trace.",
    loadLabel: "Load workflow",
  },
  {
    id: "connectors",
    kicker: "4 · Connectors",
    title: "Auth-Backed Sources",
    description:
      "Connect Gmail, Google Contacts, and Meta grants through AbsoluteJS auth-backed bindings.",
    loadLabel: "Load connectors",
  },
  {
    id: "evaluate",
    kicker: "5 · Quality",
    title: "Evaluation And Release",
    description:
      "Run benchmark presets, compare retrieval quality, and inspect release-control state.",
    loadLabel: "Load quality",
  },
  {
    id: "ops",
    kicker: "6 · Operations",
    title: "Diagnostics And Index Health",
    description:
      "Inspect corpus health, sync status, admin jobs, and backend readiness.",
    loadLabel: "Load ops",
  },
];

const readSyncBindingOptions = (
  source: RAGSyncSourceRecord,
): SyncBindingOption[] => {
  const metadata =
    source.metadata && typeof source.metadata === "object"
      ? (source.metadata as Record<string, unknown>)
      : {};
  const raw = metadata.linkedAvailableBindings;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    if (!id) {
      return [];
    }

    return [
      {
        email: typeof record.email === "string" ? record.email : undefined,
        externalAccountId:
          typeof record.externalAccountId === "string"
            ? record.externalAccountId
            : undefined,
        id,
        label: typeof record.label === "string" ? record.label : undefined,
      },
    ];
  });
};

const readSelectedBindingId = (source: RAGSyncSourceRecord) => {
  const metadata =
    source.metadata && typeof source.metadata === "object"
      ? (source.metadata as Record<string, unknown>)
      : {};
  return typeof metadata.linkedBindingId === "string"
    ? metadata.linkedBindingId
    : "";
};

const formatSyncBindingOptionLabel = (option: SyncBindingOption) =>
  option.label ?? option.email ?? option.externalAccountId ?? option.id;

const postConnectorSync = async (
  selectedMode: DemoBackendMode,
  sourceId?: string,
) => {
  const response = await fetch(
    sourceId
      ? `/demo/sync/${selectedMode}/${encodeURIComponent(sourceId)}`
      : `/demo/sync/${selectedMode}`,
    {
      body: new URLSearchParams({ background: "true" }),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(await response.text());
  }
};

const loadConnectorSyncSources = async (selectedMode: DemoBackendMode) => {
  const response = await fetch(`/demo/sync-sources/${selectedMode}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as SyncSourcesResponse;
};

const updateConnectorBinding = async (
  selectedMode: DemoBackendMode,
  sourceId: string,
  bindingId: string,
) => {
  const response = await fetch(
    `/demo/sync-selection/${selectedMode}/${encodeURIComponent(sourceId)}`,
    {
      body: new URLSearchParams({ bindingId }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    },
  );
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as SyncSourcesResponse;
};

const initialSearch: SearchFormState = {
  query: "",
  topK: 6,
  scoreThreshold: "",
  kind: "",
  source: "",
  documentId: "",
};

const initialAddForm: AddFormState = {
  id: "",
  title: "",
  source: "",
  format: "markdown",
  chunkStrategy: "source_aware",
  text: "",
};

const streamStages = [
  "submitting",
  "retrieving",
  "retrieved",
  "streaming",
  "complete",
] as const;
const DOCUMENTS_PER_PAGE = 10;
const SYNC_FEEDBACK_POLL_INTERVAL_MS = 1_200;
const SYNC_FEEDBACK_POLL_ATTEMPTS = 12;
const SUPPORTED_FILE_TYPE_OPTIONS = [
  ["all", "All supported types"],
  [".txt", ".txt"],
  [".md", ".md"],
  [".mdx", ".mdx"],
  [".html", ".html"],
  [".htm", ".htm"],
  [".json", ".json"],
  [".csv", ".csv"],
  [".xml", ".xml"],
  [".yaml", ".yaml"],
  [".yml", ".yml"],
  [".log", ".log"],
  [".ts", ".ts"],
  [".tsx", ".tsx"],
  [".js", ".js"],
  [".jsx", ".jsx"],
  [".pdf", ".pdf"],
  [".epub", ".epub"],
  [".docx", ".docx"],
  [".xlsx", ".xlsx"],
  [".pptx", ".pptx"],
  [".odt", ".odt"],
  [".ods", ".ods"],
  [".odp", ".odp"],
  [".rtf", ".rtf"],
  [".doc", ".doc"],
  [".xls", ".xls"],
  [".ppt", ".ppt"],
  [".msg", ".msg"],
  [".eml", ".eml"],
  [".png", ".png"],
  [".jpg", ".jpg"],
  [".jpeg", ".jpeg"],
  [".webp", ".webp"],
  [".tiff", ".tiff"],
  [".tif", ".tif"],
  [".bmp", ".bmp"],
  [".gif", ".gif"],
  [".heic", ".heic"],
  [".mp3", ".mp3"],
  [".wav", ".wav"],
  [".m4a", ".m4a"],
  [".aac", ".aac"],
  [".flac", ".flac"],
  [".ogg", ".ogg"],
  [".opus", ".opus"],
  [".mp4", ".mp4"],
  [".mov", ".mov"],
  [".mkv", ".mkv"],
  [".webm", ".webm"],
  [".avi", ".avi"],
  [".m4v", ".m4v"],
  [".zip", ".zip"],
  [".tar", ".tar"],
  [".gz", ".gz"],
  [".tgz", ".tgz"],
  [".bz2", ".bz2"],
  [".xz", ".xz"],
] as const;

export const ReactRAGVectorDemoFullLabApp = ({
  activeSection,
  mode,
  showConnectorFocus = true,
}: DemoProps & {
  activeSection: Exclude<RagExampleSection, "overview" | "connectors">;
  showConnectorFocus?: boolean;
}) => {
  const [selectedMode, setSelectedMode] = useState<DemoBackendMode>(
    mode ?? getInitialBackendMode(),
  );
  const [searchForm, setSearchForm] = useState<SearchFormState>(initialSearch);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(
    null,
  );
  const searchSectionGroups = useMemo(
    () => buildSearchSectionGroups(searchResults),
    [searchResults],
  );
  const [addForm, setAddForm] = useState<AddFormState>(initialAddForm);
  const [searchError, setSearchError] = useState("");
  const [addError, setAddError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncPending, setSyncPending] = useState<SyncPendingState | null>(null);
  const [syncWatchLabel, setSyncWatchLabel] = useState("");
  const [quickSyncSources, setQuickSyncSources] = useState<
    RAGSyncSourceRecord[]
  >([]);
  const [syncSourcesLoading, setSyncSourcesLoading] = useState(false);
  const [syncSourcesError, setSyncSourcesError] = useState("");
  const [fullLabLoaded, setFullLabLoaded] = useState(false);
  const [evaluationMessage, setEvaluationMessage] = useState("");
  const [scopeDriver, setScopeDriver] = useState("manual filters");
  const [restoredSharedState, setRestoredSharedState] = useState(false);
  const [restoredSharedStateSummary, setRestoredSharedStateSummary] =
    useState("");
  const [retrievalPresetId, setRetrievalPresetId] = useState("");
  const [benchmarkPresetId, setBenchmarkPresetId] = useState("");
  const [uploadPresetId, setUploadPresetId] = useState("");
  const [recentQueries, setRecentQueries] = useState<
    Array<{ label: string; state: SearchFormState }>
  >([]);
  const [pendingScrollTarget, setPendingScrollTarget] = useState<
    "search-results" | null
  >(null);
  const [documentPage, setDocumentPage] = useState(1);
  const [documentSearchTerm, setDocumentSearchTerm] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(
    null,
  );
  const [qualityData, setQualityData] =
    useState<DemoRetrievalQualityResponse | null>(null);
  const [releaseData, setReleaseData] = useState<DemoReleaseOpsResponse | null>(
    null,
  );
  const [releaseWorkspace, setReleaseWorkspace] =
    useState<DemoReleaseWorkspace>("alpha");
  const [qualityView, setQualityView] = useState<
    "overview" | "strategies" | "grounding" | "history"
  >("overview");
  const [releaseActionBusyId, setReleaseActionBusyId] = useState<string | null>(
    null,
  );
  const [ragReadiness, setRagReadiness] =
    useState<DemoRagReadinessState | null>(null);
  const [aiModelCatalog, setAiModelCatalog] =
    useState<DemoAIModelCatalogResponse>({ defaultModelKey: null, models: [] });
  const [selectedAIModelKey, setSelectedAIModelKey] = useState("");
  const [streamPrompt, setStreamPrompt] = useState(
    "How do metadata filters change retrieval quality?",
  );
  const syncFeedbackRunRef = useRef(0);
  const activeRagPath = useMemo(
    () => getRAGPathForMode(selectedMode),
    [selectedMode],
  );
  const evaluationSuite = useMemo(() => buildDemoEvaluationSuite(), []);
  const showRetrievalLane = activeSection === "retrieve";
  const showIngestLane = activeSection === "ingest";
  const showWorkflowLane = activeSection === "workflow";
  const showQualityLane = activeSection === "evaluate";
  const showOperationsLane = activeSection === "ops";

  const inferDocumentExtension = (document: DemoDocument) => {
    const candidates = [document.source, document.title];
    for (const candidate of candidates) {
      const match = candidate.toLowerCase().match(/(\.[a-z0-9]+)(?:[#?].*)?$/);
      if (match) {
        return match[1];
      }
    }

    if (document.format === "markdown") {
      return ".md";
    }
    if (document.format === "html") {
      return ".html";
    }
    return ".txt";
  };

  const rag = useRAG(activeRagPath, { autoLoadStatus: false });
  const documents = rag.documents.documents as DemoDocument[];
  const filteredDocuments = useMemo(() => {
    const query = documentSearchTerm.trim().toLowerCase();
    return documents.filter((document) => {
      const matchesQuery =
        query.length === 0 ||
        document.title.toLowerCase().includes(query) ||
        document.source.toLowerCase().includes(query) ||
        document.text.toLowerCase().includes(query);
      const matchesType =
        documentTypeFilter === "all" ||
        inferDocumentExtension(document) === documentTypeFilter;
      return matchesQuery && matchesType;
    });
  }, [documentSearchTerm, documentTypeFilter, documents]);
  const chunkPreview = rag.chunkPreview.preview as DemoChunkPreview | null;
  const chunkPreviewNavigation = rag.chunkPreview.navigation;
  const activeChunkPreviewId = rag.chunkPreview.activeChunkId;
  const activeChunkPreviewSectionDiagnostic = useMemo(
    () =>
      buildActiveChunkPreviewSectionDiagnostic(
        chunkPreview,
        activeChunkPreviewId,
      ),
    [chunkPreview, activeChunkPreviewId],
  );
  const evaluation = rag.evaluate.lastResponse as RAGEvaluationResponse | null;
  const workflow = rag.workflow;
  const workflowState = workflow.state;
  const streamLatestMessage = workflow.latestAssistantMessage;
  const streamRetrieval = workflow.retrieval;
  const streamGroundedAnswer = workflow.groundedAnswer;
  const streamGroundingReferences = workflow.groundingReferences;
  const streamBusy = workflow.isRetrieving || workflow.isAnswerStreaming;
  const sourceRecords =
    rag.ops.syncSources.length > 0 ? rag.ops.syncSources : quickSyncSources;
  const sortedSyncSources = useMemo(
    () => sortSyncSources(sourceRecords),
    [sourceRecords],
  );
  const liveConnectorSources = useMemo(
    () =>
      sortedSyncSources.filter(
        (source) => source.metadata?.accountMode === "live-linked",
      ),
    [sortedSyncSources],
  );
  const linkedConnectorAccounts = useMemo(
    () => listLinkedConnectorAccounts(sortedSyncSources),
    [sortedSyncSources],
  );
  const syncPendingLabel = useMemo(() => {
    if (!syncPending) {
      return null;
    }

    if (syncPending.scope === "all") {
      return syncPending.background
        ? "Queueing background sync..."
        : "Syncing all sources...";
    }

    const sourceLabel =
      sortedSyncSources.find((source) => source.id === syncPending.sourceId)
        ?.label ?? syncPending.sourceId;
    return syncPending.background
      ? `Queueing ${sourceLabel} in the background...`
      : `Syncing ${sourceLabel}...`;
  }, [sortedSyncSources, syncPending]);
  const sourceSummaryGroups = useMemo(
    () => buildSourceSummarySectionGroups(workflow.sourceSummaries),
    [workflow.sourceSummaries],
  );
  const groundingReferenceGroups = useMemo(
    () => buildGroundingReferenceGroups(streamGroundingReferences),
    [streamGroundingReferences],
  );
  const citationGroups = useMemo(
    () => buildCitationGroups(workflow.citations),
    [workflow.citations],
  );
  const totalDocumentPages = Math.max(
    1,
    Math.ceil(filteredDocuments.length / DOCUMENTS_PER_PAGE),
  );
  const paginatedDocuments = useMemo(() => {
    const start = (documentPage - 1) * DOCUMENTS_PER_PAGE;
    return filteredDocuments.slice(start, start + DOCUMENTS_PER_PAGE);
  }, [documentPage, filteredDocuments]);

  const status = useMemo(
    () =>
      buildStatusView(
        rag.status.status,
        rag.status.capabilities,
        documents,
        selectedMode,
      ),
    [documents, rag.status.capabilities, rag.status.status, selectedMode],
  );
  const {
    actions,
    canaryBaseline,
    canaryReadiness,
    handoffActions,
    handoffIncidents,
    handoffIncidentHistory,
    handoffStateLabel,
    incidentSummary,
    incidentSummaryLabel,
    incidentClassificationDetailLines,
    laneReadinessEntries,
    recentIncidentRemediationExecutions,
    recentIncidents,
    releaseAlerts,
    releaseCandidates,
    primaryReleaseActions,
    secondaryReleaseActions,
    releaseDecisionHeadline,
    releaseHeroMeta,
    releaseScopeNote,
    policyHistoryEntries,
    policyHistorySummary,
    policyHistoryDetailLines,
    auditSurfaceEntries,
    auditSurfaceSummary,
    pollingSurfaceEntries,
    releaseDiagnosticsSummary,
    releaseStateBadge,
    latestReleaseAction,
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
    runtimePlannerHistorySummary,
    runtimePlannerHistoryLines,
    benchmarkSnapshotSummary,
    benchmarkSnapshotLines,
    activeBlockerDeltaSummary,
    activeBlockerDeltaLines,
    releaseEvidenceDrills,
    releaseBlockerComparisonCards,
    releasePathSteps,
    releaseRailCallout,
    recentReleaseActivity,
    releaseScenarioActions,
    releaseRecommendations,
    remediationSummary,
    scenario,
    stableHandoff,
    stableHandoffAutoComplete,
    stableHandoffAutoCompleteLabel,
    stableHandoffDecision,
    stableHandoffDisplayReasons,
    stableHandoffDrift,
    stableHandoffIncidentSummaryLabel,
    stableBaseline,
    stableReadiness,
  } = useMemo(() => buildDemoReleasePanelState(releaseData), [releaseData]);

  const releasePendingLabel = releaseActionBusyId
    ? (() => {
        const action = actions.find(
          (entry) => entry.id === releaseActionBusyId,
        );
        const lane = action?.id.includes("stable")
          ? "stable"
          : action?.id.includes("canary")
            ? "canary"
            : "release";
        return `Pending ${lane} action · ${action?.label ?? releaseActionBusyId}`;
      })()
    : null;

  const openReleaseDiagnosticsTarget = (targetCardId: string) => {
    if (
      targetCardId === "release-promotion-candidates-card" ||
      targetCardId === "release-stable-handoff-card" ||
      targetCardId === "release-remediation-history-card"
    ) {
      document
        .getElementById("release-diagnostics")
        ?.setAttribute("open", "open");
    }
  };

  const runReleaseAction = async (action: {
    id: string;
    label: string;
    path: string;
    payload: { actionId: string; workspace?: DemoReleaseWorkspace };
  }) => {
    setReleaseActionBusyId(action.id);
    setAddError("");
    try {
      const response = await fetch(action.path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...action.payload,
          workspace: releaseWorkspace,
        }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const payload = (await response.json()) as {
        message?: string;
        ok?: boolean;
        release?: DemoReleaseOpsResponse;
      };
      if (!payload.ok || !payload.release) {
        throw new Error(
          payload.message ?? `Release action ${action.label} failed`,
        );
      }
      setReleaseData(payload.release);
      setMessage(
        payload.message ??
          `${action.label} completed through the published AbsoluteJS release-control workflow.`,
      );
    } catch (error) {
      setAddError(
        error instanceof Error
          ? error.message
          : `Release action ${action.label} failed`,
      );
    } finally {
      setReleaseActionBusyId(null);
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const [
        documentsData,
        _statusData,
        _opsData,
        aiModelsResponse,
        qualityResponse,
        releaseResponse,
      ] = await Promise.all([
        rag.documents.load(),
        rag.status.refresh(),
        rag.ops.refresh(),
        fetch("/demo/ai-models").then((response) =>
          response.json(),
        ) as Promise<DemoAIModelCatalogResponse>,
        fetch(`/demo/quality/${selectedMode}`).then((response) =>
          response.json(),
        ) as Promise<DemoRetrievalQualityResponse>,
        fetch(
          `/demo/release/${selectedMode}?workspace=${releaseWorkspace}`,
        ).then((response) =>
          response.json(),
        ) as Promise<DemoReleaseOpsResponse>,
      ]);
      setAiModelCatalog(aiModelsResponse);
      setQualityData(qualityResponse);
      setReleaseData(releaseResponse);
      setFullLabLoaded(true);
      rag.evaluate.saveSuite(evaluationSuite);
      setSelectedAIModelKey(
        (current) =>
          current ||
          aiModelsResponse.defaultModelKey ||
          aiModelsResponse.models[0]?.key ||
          "",
      );
      if (
        chunkPreview &&
        !documentsData.documents.some(
          (document) => document.id === chunkPreview.document.id,
        )
      ) {
        rag.chunkPreview.clear();
      }
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Unable to load demo data: ${error.message}`
          : "Unable to load demo data",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadActiveLabSection = async () => {
    setLoading(true);
    try {
      if (activeSection === "retrieve") {
        const [documentsData] = await Promise.all([
          rag.documents.load(),
          rag.status.refresh(),
        ]);
        if (
          chunkPreview &&
          !documentsData.documents.some(
            (document) => document.id === chunkPreview.document.id,
          )
        ) {
          rag.chunkPreview.clear();
        }
      } else if (activeSection === "ingest") {
        await Promise.all([rag.documents.load(), rag.status.refresh()]);
      } else if (activeSection === "workflow") {
        const [aiModelsResponse] = await Promise.all([
          fetch("/demo/ai-models").then((response) =>
            response.json(),
          ) as Promise<DemoAIModelCatalogResponse>,
          rag.status.refresh(),
        ]);
        setAiModelCatalog(aiModelsResponse);
        setSelectedAIModelKey(
          (current) =>
            current ||
            aiModelsResponse.defaultModelKey ||
            aiModelsResponse.models[0]?.key ||
            "",
        );
      } else if (activeSection === "evaluate") {
        const [qualityResponse, releaseResponse] = await Promise.all([
          fetch(`/demo/quality/${selectedMode}`).then((response) =>
            response.json(),
          ) as Promise<DemoRetrievalQualityResponse>,
          fetch(
            `/demo/release/${selectedMode}?workspace=${releaseWorkspace}`,
          ).then((response) =>
            response.json(),
          ) as Promise<DemoReleaseOpsResponse>,
          rag.status.refresh(),
        ]);
        setQualityData(qualityResponse);
        setReleaseData(releaseResponse);
        rag.evaluate.saveSuite(evaluationSuite);
      } else if (activeSection === "ops") {
        await Promise.all([
          rag.ops.refresh(),
          rag.status.refresh(),
          loadSyncSources({ quiet: true }),
        ]);
      }
      setFullLabLoaded(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Unable to load ${activeSection} lane: ${error.message}`
          : `Unable to load ${activeSection} lane`,
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSyncSources = async ({ quiet = false } = {}) => {
    if (!quiet) {
      setSyncSourcesLoading(true);
    }
    setSyncSourcesError("");

    try {
      const payload = await loadConnectorSyncSources(selectedMode);
      setQuickSyncSources(payload.syncSources);
    } catch (error) {
      setSyncSourcesError(
        error instanceof Error
          ? `Unable to load connector sources: ${error.message}`
          : "Unable to load connector sources",
      );
    } finally {
      if (!quiet) {
        setSyncSourcesLoading(false);
      }
    }
  };

  const refreshSyncFeedback = async () => {
    const [documentsData] = await Promise.all([
      rag.documents.load(),
      rag.status.refresh(),
      rag.ops.refresh(),
      loadSyncSources({ quiet: true }),
    ]);

    if (
      chunkPreview &&
      !documentsData.documents.some(
        (document) => document.id === chunkPreview.document.id,
      )
    ) {
      rag.chunkPreview.clear();
    }
  };

  const watchSyncFeedback = async (label: string) => {
    const runId = syncFeedbackRunRef.current + 1;
    syncFeedbackRunRef.current = runId;
    setSyncWatchLabel(label);

    try {
      for (
        let attempt = 0;
        attempt < SYNC_FEEDBACK_POLL_ATTEMPTS;
        attempt += 1
      ) {
        await refreshSyncFeedback();

        if (syncFeedbackRunRef.current !== runId) {
          return;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, SYNC_FEEDBACK_POLL_INTERVAL_MS),
        );
      }

      if (syncFeedbackRunRef.current === runId) {
        setSyncWatchLabel("");
      }
    } catch (error) {
      if (syncFeedbackRunRef.current === runId) {
        setSyncWatchLabel("");
        setMessage(
          error instanceof Error
            ? `Sync was requested, but feedback polling failed: ${error.message}`
            : "Sync was requested, but feedback polling failed",
        );
      }
    }
  };

  useEffect(
    () => () => {
      syncFeedbackRunRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadRagReadiness = async () => {
      try {
        const response = await fetch(
          `/demo/rag-readiness/${selectedMode}/json`,
        );
        const next = (await response.json()) as DemoRagReadinessState;
        if (cancelled) {
          return;
        }
        setRagReadiness(next);
        if (next.status === "warming") {
          timeoutId = setTimeout(() => {
            void loadRagReadiness();
          }, 2000);
        }
      } catch {
        if (!cancelled) {
          setRagReadiness({
            className: "demo-rag-readiness-failed",
            detail: "Unable to load RAG readiness.",
            elapsedMs: 0,
            label: "RAG Failed",
            status: "failed",
          });
        }
      }
    };

    let initialTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let initialAnimationFrameId: number | null = null;

    if (typeof requestAnimationFrame === "function") {
      initialAnimationFrameId = requestAnimationFrame(() => {
        void loadRagReadiness();
      });
    } else {
      initialTimeoutId = setTimeout(() => {
        void loadRagReadiness();
      }, 0);
    }

    return () => {
      cancelled = true;
      if (initialTimeoutId !== null) {
        clearTimeout(initialTimeoutId);
      }
      if (
        initialAnimationFrameId !== null &&
        typeof cancelAnimationFrame === "function"
      ) {
        cancelAnimationFrame(initialAnimationFrameId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [selectedMode]);

  useEffect(() => {
    let initialTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let initialAnimationFrameId: number | null = null;

    if (typeof requestAnimationFrame === "function") {
      initialAnimationFrameId = requestAnimationFrame(() => {
        void loadSyncSources();
      });
    } else {
      initialTimeoutId = setTimeout(() => {
        void loadSyncSources();
      }, 0);
    }

    return () => {
      if (initialTimeoutId !== null) {
        clearTimeout(initialTimeoutId);
      }
      if (
        initialAnimationFrameId !== null &&
        typeof cancelAnimationFrame === "function"
      ) {
        cancelAnimationFrame(initialAnimationFrameId);
      }
    };
  }, [selectedMode]);

  useEffect(() => {
    void loadRecentQueries("react", selectedMode).then((entries) => {
      setRecentQueries(entries);
    });
    void loadActiveRetrievalState("react", selectedMode).then((state) => {
      if (state) {
        setSearchForm(state.searchForm);
        setScopeDriver(state.scopeDriver);
        setRetrievalPresetId(state.retrievalPresetId ?? "");
        setBenchmarkPresetId(state.benchmarkPresetId ?? "");
        setUploadPresetId(state.uploadPresetId ?? "");
        setSelectedAIModelKey(state.streamModelKey ?? "");
        setStreamPrompt(
          state.streamPrompt ??
            "How do metadata filters change retrieval quality?",
        );
        setRestoredSharedState(true);
        const label =
          demoUploadPresets.find((preset) => preset.id === state.uploadPresetId)
            ?.label ??
          demoEvaluationPresets.find(
            (preset) => preset.id === state.benchmarkPresetId,
          )?.label ??
          state.retrievalPresetId ??
          "manual state";
        setRestoredSharedStateSummary(
          `Restored from shared demo state · ${label} · ${new Date(state.lastUpdatedAt ?? Date.now()).toLocaleString()}.`,
        );
      } else {
        setRestoredSharedState(false);
        setRestoredSharedStateSummary("");
      }
    });
  }, [selectedMode]);

  useEffect(() => {
    void saveRecentQueries("react", selectedMode, recentQueries);
  }, [recentQueries, selectedMode]);

  useEffect(() => {
    if (pendingScrollTarget !== "search-results" || searchResults === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      document
        .getElementById("search-results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingScrollTarget(null);
    }, 60);

    return () => window.clearTimeout(timeout);
  }, [pendingScrollTarget, searchResults]);

  useEffect(() => {
    setDocumentPage((current) =>
      Math.min(
        Math.max(1, current),
        Math.max(1, Math.ceil(filteredDocuments.length / DOCUMENTS_PER_PAGE)),
      ),
    );
  }, [filteredDocuments.length]);

  useEffect(() => {
    const state: DemoActiveRetrievalState = { searchForm, scopeDriver };
    state.lastUpdatedAt = Date.now();
    state.retrievalPresetId = retrievalPresetId || undefined;
    state.benchmarkPresetId = benchmarkPresetId || undefined;
    state.uploadPresetId = uploadPresetId || undefined;
    state.streamModelKey = selectedAIModelKey || undefined;
    state.streamPrompt = streamPrompt;
    void saveActiveRetrievalState("react", selectedMode, state);
  }, [
    benchmarkPresetId,
    retrievalPresetId,
    scopeDriver,
    searchForm,
    selectedAIModelKey,
    selectedMode,
    streamPrompt,
    uploadPresetId,
  ]);

  useEffect(() => {
    void loadActiveLabSection();
  }, [activeSection, selectedMode, releaseWorkspace]);

  const onSearchFieldChange = (
    evt: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setScopeDriver("manual filters");
    const { name, value } = evt.target;
    if (name === "topK") {
      setSearchForm((prev) => ({ ...prev, topK: Number(value) || prev.topK }));
      return;
    }

    if (name === "kind") {
      setSearchForm((prev) => ({
        ...prev,
        kind: value === "seed" || value === "custom" ? value : "",
      }));
      return;
    }

    setSearchForm((prev) => ({ ...prev, [name]: value }));
  };

  const onAddFieldChange = (
    evt: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = evt.target;
    setAddForm((prev) => ({ ...prev, [name]: value }));
  };

  const executeSearch = async (searchValues: SearchFormState) => {
    setSearchError("");
    setSearchResults(null);
    const query = searchValues.query.trim();
    if (query.length === 0) {
      setSearchError("query is required");
      return;
    }

    try {
      const payload = buildSearchPayload({
        ...searchValues,
        query,
        retrievalPresetId: retrievalPresetId || undefined,
      });
      const start = performance.now();
      const response = await fetch(`/demo/message/${selectedMode}/search`, {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const parsed = (await response.json()) as {
        ok: boolean;
        results?: RAGSource[];
        trace?: RAGRetrievalTrace;
        error?: string;
      };

      if (!response.ok || !parsed.ok) {
        throw new Error(
          parsed.error ?? `Search failed with status ${response.status}`,
        );
      }

      const results = parsed.results ?? [];
      setRecentQueries((prev) => {
        const next = [
          { label: query, state: { ...searchValues, query } },
          ...prev.filter(
            (entry) =>
              JSON.stringify(entry.state) !==
              JSON.stringify({ ...searchValues, query }),
          ),
        ];
        return next.slice(0, 4);
      });
      setSearchResults(
        buildSearchResponse(
          query,
          payload,
          results,
          Math.round(performance.now() - start),
          parsed.trace,
        ),
      );
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? `Search failed: ${error.message}`
          : "Search failed",
      );
    }
  };

  const focusInspectionEntry = async (
    entry: ReturnType<typeof buildInspectionEntries>[number],
  ) => {
    setDocumentTypeFilter("all");
    setDocumentSearchTerm(entry.sourceQuery ?? "");
    setDocumentPage(1);
    document
      .getElementById("document-list")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (entry.documentId) {
      setMessage(`Inspecting ${entry.documentId} from ops inspection.`);
      await inspectChunks(entry.documentId);
      return;
    }
    if (entry.source) {
      const nextState = {
        ...searchForm,
        source: entry.source,
        documentId: "",
        query: `Source search for ${entry.source}`,
      } as SearchFormState;
      setSearchForm(nextState);
      setScopeDriver(`ops inspection: ${entry.source}`);
      setPendingScrollTarget("search-results");
      setMessage(`Scoped retrieval to ${entry.source} from ops inspection.`);
      await executeSearch(nextState);
    }
  };

  const submitSearch = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setScopeDriver("manual filters");
    setPendingScrollTarget("search-results");
    await executeSearch(searchForm);
  };

  const clearRetrievalScope = () => {
    const nextSearch = {
      ...searchForm,
      kind: "",
      source: "",
      documentId: "",
    } as SearchFormState;
    setSearchForm(nextSearch);
    setScopeDriver("chip reset");
    if (nextSearch.query.trim().length > 0) {
      void executeSearch(nextSearch);
    }
  };

  const clearAllRetrievalState = () => {
    const nextSearch = {
      ...searchForm,
      query: "",
      kind: "",
      source: "",
      documentId: "",
      scoreThreshold: "",
    } as SearchFormState;
    setSearchForm(nextSearch);
    setSearchResults(null);
    setSearchError("");
    setScopeDriver("clear all state");
  };

  const rerunLastQuery = () => {
    if (searchForm.query.trim().length === 0) return;
    setScopeDriver("rerun last query");
    setPendingScrollTarget("search-results");
    void executeSearch(searchForm);
  };

  const rerunRecentQuery = (state: SearchFormState) => {
    setSearchForm(state);
    setScopeDriver("recent query");
    setPendingScrollTarget("search-results");
    void executeSearch(state);
  };

  const submitStreamQuery = (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    const prompt = streamPrompt.trim();
    if (prompt.length === 0) {
      setMessage("Enter a retrieval question before starting the stream.");
      return;
    }
    if (selectedAIModelKey.length === 0) {
      setMessage("Configure an AI provider to enable retrieval streaming.");
      return;
    }

    setMessage("");
    workflow.query(buildDemoAIStreamPrompt(selectedAIModelKey, prompt));
  };

  const runSavedSuite = async () => {
    setEvaluationMessage("");
    try {
      const run = await rag.evaluate.runSuite(evaluationSuite);
      setEvaluationMessage(
        `Saved suite run finished in ${run.elapsedMs}ms and ranked ${rag.evaluate.leaderboard.length} workflow run(s).`,
      );
    } catch (error) {
      setEvaluationMessage(
        error instanceof Error
          ? `Saved suite failed: ${error.message}`
          : "Saved suite failed",
      );
    }
  };

  const runEvaluation = async () => {
    setEvaluationMessage("");
    try {
      const response = await rag.evaluate.evaluate(buildDemoEvaluationInput());
      setEvaluationMessage(
        `Benchmark suite finished in ${response.elapsedMs}ms across ${response.totalCases} benchmark queries.`,
      );
    } catch (error) {
      setEvaluationMessage(
        error instanceof Error
          ? `Evaluation failed: ${error.message}`
          : "Evaluation failed",
      );
    }
  };

  const runPresetSearch = (
    query: string,
    options: Partial<SearchFormState> = {},
    driver = "preset",
    presetId = "",
    scrollTarget: "search-results" | null = "search-results",
  ) => {
    const nextSearch = {
      ...searchForm,
      ...options,
      query,
      kind:
        options.kind === "seed" || options.kind === "custom"
          ? options.kind
          : "",
      source: options.source ?? "",
      documentId: options.documentId ?? "",
      nativeQueryProfile: options.nativeQueryProfile ?? "",
      scoreThreshold: options.scoreThreshold ?? "",
      topK: options.topK ?? 6,
    } as SearchFormState;

    setSearchForm(nextSearch);
    setScopeDriver(driver);
    if (scrollTarget) {
      setPendingScrollTarget(scrollTarget);
    }
    if (driver.startsWith("benchmark preset:")) {
      setBenchmarkPresetId(presetId);
      setRetrievalPresetId(resolveBenchmarkRetrievalPresetId(presetId));
      setUploadPresetId("");
    } else if (driver === "upload verification") {
      setRetrievalPresetId("");
      setBenchmarkPresetId("");
    } else {
      setRetrievalPresetId(presetId);
      setBenchmarkPresetId("");
      setUploadPresetId("");
    }
    void executeSearch(nextSearch);
  };

  const runReleaseEvidenceDrill = (
    drill: (typeof releaseEvidenceDrills)[number],
  ) => {
    runPresetSearch(
      drill.query,
      { topK: drill.topK },
      drill.driver,
      drill.benchmarkPresetId || drill.retrievalPresetId || "",
      "search-results",
    );
  };

  const uploadSelectedFile = async () => {
    if (!selectedUploadFile) {
      setUploadError("Choose a file before uploading.");
      return;
    }

    setUploadError("");
    setMessage(`Uploading ${selectedUploadFile.name}...`);
    try {
      const result = await rag.ingest.ingestUploads({
        baseMetadata: {
          fileKind: "uploaded-user-file",
          kind: "custom",
        },
        uploads: [
          {
            name: selectedUploadFile.name,
            source: `uploads/${selectedUploadFile.name}`,
            title: selectedUploadFile.name,
            contentType: selectedUploadFile.type || "application/octet-stream",
            encoding: "base64",
            content: encodeArrayBufferToBase64(
              await selectedUploadFile.arrayBuffer(),
            ),
            metadata: {
              kind: "custom",
              uploadedFrom: "react-general-upload",
            },
          },
        ],
      });
      setMessage(
        `Uploaded ${selectedUploadFile.name}. Extracted ${result.count ?? 0} chunk(s) across ${result.documentCount ?? 1} document(s).`,
      );
      setSelectedUploadFile(null);
      await refreshData();
      runPresetSearch(
        `Explain ${selectedUploadFile.name}`,
        { source: `uploads/${selectedUploadFile.name}`, topK: 6 },
        "upload verification",
        "",
        "search-results",
      );
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? `Upload failed: ${error.message}`
          : "Upload failed",
      );
      setMessage("");
    }
  };

  const ingestDemoUpload = async (
    preset: (typeof demoUploadPresets)[number],
  ) => {
    setUploadError("");
    setMessage(`Uploading ${preset.label}...`);
    try {
      const response = await fetch(getDemoUploadFixtureUrl(preset.id));
      if (!response.ok) {
        throw new Error(
          `Failed to load ${preset.fileName}: ${response.status}`,
        );
      }

      const result = await rag.ingest.ingestUploads(
        buildDemoUploadIngestInput(
          preset,
          encodeArrayBufferToBase64(await response.arrayBuffer()),
        ),
      );
      setMessage(
        `Uploaded ${preset.label}. Extracted ${result.count ?? 0} chunk(s) across ${result.documentCount ?? 1} document(s).`,
      );
      setUploadPresetId(preset.id);
      runPresetSearch(
        preset.query,
        { source: preset.expectedSources[0] ?? preset.source, topK: 6 },
        "upload verification",
      );
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? `Upload failed: ${error.message}`
          : "Upload failed",
      );
      setMessage("");
    }
  };

  const submitAddDocument = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setAddError("");
    setSearchError("");
    try {
      const response = await rag.index.createDocument({
        id: addForm.id.trim().length > 0 ? addForm.id.trim() : undefined,
        title: addForm.title.trim(),
        source: addForm.source.trim(),
        format: addForm.format,
        text: addForm.text.trim(),
        chunking: {
          strategy: addForm.chunkStrategy,
        },
      });

      setMessage(`Inserted ${response.inserted ?? addForm.title.trim()}`);
      setAddForm(initialAddForm);
      await refreshData();
    } catch (error) {
      setAddError(
        error instanceof Error
          ? `Failed to insert: ${error.message}`
          : "Failed to insert document",
      );
    }
  };

  const inspectChunks = async (id: string) => {
    try {
      await rag.chunkPreview.inspect(id);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Failed to inspect ${id}: ${error.message}`
          : `Failed to inspect ${id}`,
      );
    }
  };

  const deleteDocument = async (id: string) => {
    setMessage("");
    try {
      await rag.index.deleteDocument(id);
      setMessage(`Deleted ${id}`);
      if (chunkPreview?.document.id === id) {
        rag.chunkPreview.clear();
      }
      await refreshData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Failed to delete ${id}: ${error.message}`
          : "Failed to delete document",
      );
    }
  };

  const reseed = async () => {
    setMessage("Reseeding...");
    try {
      const result = await rag.index.reseed();
      setMessage(`Reseeded seed corpus. Documents=${result.documents ?? 0}`);
      await refreshData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Reseed failed: ${error.message}`
          : "Reseed failed",
      );
    }
  };

  const resetCustom = async () => {
    setMessage("Resetting custom documents...");
    try {
      const result = await rag.index.reset();
      setMessage(`Reset complete. Documents=${result.documents ?? 0}`);
      setSearchResults(null);
      await refreshData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Reset failed: ${error.message}`
          : "Reset failed",
      );
    }
  };

  const syncAllSources = async () => {
    setSyncPending({ background: false, scope: "all" });
    setMessage("Starting source sync...");
    try {
      await postConnectorSync(selectedMode);
      const payload = await loadConnectorSyncSources(selectedMode);
      setQuickSyncSources(payload.syncSources);
      const sourceCount = payload.syncSources.length;
      setMessage(
        `Started sync for ${sourceCount} source(s). Watching sync feedback.`,
      );
      void watchSyncFeedback("Watching sync feedback for all sources...");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Source sync failed: ${error.message}`
          : "Source sync failed",
      );
    } finally {
      setSyncPending(null);
    }
  };

  const selectSyncBinding = async (sourceId: string, bindingId: string) => {
    setSyncPending({ background: true, scope: "source", sourceId });
    setMessage(
      bindingId
        ? "Updating connector binding..."
        : "Clearing connector binding selection...",
    );

    try {
      const payload = await updateConnectorBinding(
        selectedMode,
        sourceId,
        bindingId,
      );
      setQuickSyncSources(payload.syncSources);
      setMessage(
        bindingId
          ? "Connector binding updated."
          : "Connector binding selection cleared.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Failed to update connector binding: ${error.message}`
          : "Failed to update connector binding",
      );
    } finally {
      setSyncPending(null);
    }
  };

  const queueBackgroundSync = async () => {
    setSyncPending({ background: true, scope: "all" });
    setMessage("Queueing background sync...");
    try {
      await rag.index.syncAllSources({ background: true });
      setMessage("Background sync queued.");
      void watchSyncFeedback("Watching background sync feedback...");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Failed to queue background sync: ${error.message}`
          : "Failed to queue background sync",
      );
    } finally {
      setSyncPending(null);
    }
  };

  const syncSource = async (id: string) => {
    setSyncPending({ background: false, scope: "source", sourceId: id });
    setMessage(`Starting ${id} sync...`);
    try {
      await postConnectorSync(selectedMode, id);
      const payload = await loadConnectorSyncSources(selectedMode);
      setQuickSyncSources(payload.syncSources);
      const sourceLabel =
        payload.syncSources.find((source) => source.id === id)?.label ?? id;
      setMessage(`Started ${sourceLabel}. Watching sync feedback.`);
      void watchSyncFeedback(`Watching sync feedback for ${sourceLabel}...`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Failed to sync ${id}: ${error.message}`
          : `Failed to sync ${id}`,
      );
    } finally {
      setSyncPending(null);
    }
  };

  const queueBackgroundSourceSync = async (id: string) => {
    setSyncPending({ background: true, scope: "source", sourceId: id });
    setMessage(`Queueing ${id} in the background...`);
    try {
      const result = await rag.index.syncSource(id, { background: true });
      const sourceLabel = "source" in result ? result.source.label : id;
      setMessage(`Queued ${sourceLabel}.`);
      void watchSyncFeedback(`Watching sync feedback for ${sourceLabel}...`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Failed to queue ${id}: ${error.message}`
          : `Failed to queue ${id}`,
      );
    } finally {
      setSyncPending(null);
    }
  };

  return (
    <main className="demo-layout">
      <section className="demo-card">
        <span className="demo-hero-kicker">React workflow surface</span>
        <h1>AbsoluteJS RAG Workflow Demo - React</h1>
        {ragReadiness ? (
          <div className={`demo-rag-readiness ${ragReadiness.className}`}>
            <strong>{ragReadiness.label}</strong>
            <span>{ragReadiness.detail}</span>
          </div>
        ) : (
          <p className="demo-metadata">Loading RAG readiness...</p>
        )}
        <p>
          Use one route to ingest, sync, retrieve, stream grounded answers, and
          inspect ops health against the same stuffed multi-format knowledge
          base.
        </p>
        <p className="demo-metadata">
          Pinned to{" "}
          <code>
            @absolutejs/absolute@0.19.0-beta.655 + @absolutejs/ai@0.0.5 +
            @absolutejs/rag@0.0.5
          </code>{" "}
          and surfacing the shared <code>@absolutejs/ai + @absolutejs/rag</code>{" "}
          plus <code>@absolutejs/rag/ui</code> diagnostics on this page.
        </p>
        <div className="demo-hero-grid">
          <article className="demo-stat-card">
            <span className="demo-stat-label">Corpus</span>
            <strong>Stuffed multi-format index</strong>
            <p>
              PDF, Office, archive, image, audio, video, EPUB, email, markdown,
              and legacy files on one page.
            </p>
          </article>
          <article className="demo-stat-card">
            <span className="demo-stat-label">Retrieval</span>
            <strong>Search with source proof</strong>
            <p>
              Row actions jump straight into scoped retrieval and inline chunk
              inspection instead of making you type filters by hand.
            </p>
          </article>
          <article className="demo-stat-card">
            <span className="demo-stat-label">Workflow</span>
            <strong>Grounded answers and citations</strong>
            <p>
              Drive the first-class workflow primitive, then inspect coverage,
              references, and resolved citations without leaving the route.
            </p>
          </article>
          <article className="demo-stat-card">
            <span className="demo-stat-label">Ops</span>
            <strong>Ingest, sync, benchmark</strong>
            <p>
              Exercise directory, URL, storage, and email sync adapters
              alongside ingest mutations, benchmarks, and admin status.
            </p>
          </article>
        </div>
        <div className="demo-pill-row">
          <span className="demo-pill">1. Retrieve and verify</span>
          <span className="demo-pill">2. Inspect chunks inline</span>
          <span className="demo-pill">3. Sync a source</span>
          <span className="demo-pill">4. Run quality benchmarks</span>
        </div>
      </section>

      {showConnectorFocus && (
        <section className="demo-card demo-connector-focus">
          <span className="demo-hero-kicker">Connector test bench</span>
          <h2>Auth-backed connectors</h2>
          <p>
            This is the useful path for replacing Social Sweep: sign in with
            AbsoluteJS, connect Google or Meta, choose the linked account, then
            sync Gmail and Contacts into RAG without waiting for the full
            diagnostics dashboard.
          </p>
          <div className="demo-actions">
            {connectorProviders.map((provider) => (
              <a
                className="demo-auth-provider-button"
                href={provider.href}
                key={provider.key}
              >
                <img alt="" aria-hidden="true" src={provider.iconPath} />
                <span>{provider.label}</span>
              </a>
            ))}
            <button
              disabled={syncSourcesLoading}
              onClick={() => void loadSyncSources()}
              type="button"
            >
              {syncSourcesLoading ? "Refreshing..." : "Refresh connector state"}
            </button>
            <button
              disabled={syncPending !== null}
              onClick={syncAllSources}
              type="button"
            >
              {syncPending?.scope === "all"
                ? "Queueing..."
                : "Sync linked connectors"}
            </button>
            <button
              disabled={loading}
              onClick={() => void refreshData()}
              type="button"
            >
              {loading
                ? "Loading full lab..."
                : fullLabLoaded
                  ? "Refresh full RAG lab"
                  : "Load full RAG lab"}
            </button>
          </div>
          {syncSourcesError && <p className="demo-error">{syncSourcesError}</p>}
          {linkedConnectorAccounts.length > 0 ? (
            <div className="demo-stat-grid">
              {linkedConnectorAccounts.map((account) => (
                <article className="demo-stat-card" key={account.sourceId}>
                  <span className="demo-stat-label">
                    {account.providerLabel}
                  </span>
                  <strong>
                    {account.accountLabel ??
                      account.email ??
                      "No linked account resolved"}
                  </strong>
                  <p>
                    {account.providerFound
                      ? `Using ${account.bindingLabel ?? account.bindingId ?? "the resolved binding"} for ${account.sourceLabel}.`
                      : (account.providerError ??
                        `No ${account.providerLabel} binding is resolved for ${account.sourceLabel}.`)}
                  </p>
                  <div className="demo-key-value-list">
                    <div className="demo-key-value-row">
                      <span>Source</span>
                      <strong>{account.sourceLabel}</strong>
                    </div>
                    <div className="demo-key-value-row">
                      <span>Grant</span>
                      <strong>{account.grantStatus ?? "missing"}</strong>
                    </div>
                    <div className="demo-key-value-row">
                      <span>Bindings</span>
                      <strong>
                        {typeof account.availableBindingCount === "number"
                          ? account.availableBindingCount
                          : 0}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="demo-metadata">
              No linked connector bindings are resolved yet. Use the connector
              buttons above after signing in.
            </p>
          )}
          <div className="demo-sync-source-grid">
            {liveConnectorSources.length > 0 ? (
              liveConnectorSources.map((source) => {
                const bindingOptions = readSyncBindingOptions(source);
                const selectedBindingId = readSelectedBindingId(source);
                return (
                  <article
                    className={
                      source.status === "failed"
                        ? "demo-sync-source-card demo-sync-source-card-failed"
                        : "demo-sync-source-card"
                    }
                    key={`connector-focus-${source.id}`}
                  >
                    <div className="demo-sync-source-header">
                      <div>
                        <h4>{source.label}</h4>
                        <p className="demo-metadata">
                          {source.target ??
                            source.description ??
                            "No target configured."}
                        </p>
                      </div>
                      <div className="demo-badge-row">
                        <span className="demo-badge">
                          {source.status.toUpperCase()}
                        </span>
                        {typeof source.documentCount === "number" && (
                          <span className="demo-badge">
                            {source.documentCount} docs
                          </span>
                        )}
                        {typeof source.chunkCount === "number" && (
                          <span className="demo-badge">
                            {source.chunkCount} chunks
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="demo-actions">
                      <button
                        disabled={syncPending !== null}
                        onClick={() => void syncSource(source.id)}
                        type="button"
                      >
                        {syncPending?.scope === "source" &&
                        syncPending.sourceId === source.id
                          ? "Queueing..."
                          : "Sync this connector"}
                      </button>
                      {bindingOptions.length > 0 && (
                        <label className="demo-connector-binding-select">
                          <span>Binding</span>
                          <select
                            disabled={syncPending !== null}
                            onChange={(event) =>
                              void selectSyncBinding(
                                source.id,
                                event.target.value,
                              )
                            }
                            value={selectedBindingId}
                          >
                            <option value="">Auto select first binding</option>
                            {bindingOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {formatSyncBindingOptionLabel(option)}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                    <p className="demo-metadata demo-sync-action-meta">
                      {formatSyncSourceActionSummary(source)}
                    </p>
                    <div className="demo-badge-row">
                      {formatSyncSourceActionBadges(source).map((badge) => (
                        <span
                          className="demo-badge"
                          key={`${source.id}-${badge}`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="demo-metadata">
                Connector-capable sync sources are still loading or are not
                configured for this account.
              </p>
            )}
          </div>
        </section>
      )}

      <div className="demo-results">
        <h3>Sync Feedback</h3>
        <p className="demo-metadata">
          Run a sync, ingest, reset, or delete action to see the latest mutation
          summary here.
        </p>
        <p className="demo-metadata">
          This panel stays on the same route as diagnostics and retrieval so ops
          feedback is always visible.
        </p>
        {message && <p className="demo-banner">{message}</p>}
        {syncPendingLabel && (
          <p className="demo-release-pending">
            <span className="demo-inline-spinner" aria-hidden="true" />
            {syncPendingLabel}
          </p>
        )}
        {syncWatchLabel && (
          <p className="demo-release-pending demo-sync-watch">
            <span className="demo-inline-spinner" aria-hidden="true" />
            {syncWatchLabel}
          </p>
        )}
        {loading && (
          <p className="demo-banner">Loading status and documents...</p>
        )}
        {restoredSharedState && (
          <p className="demo-banner">{restoredSharedStateSummary}</p>
        )}
      </div>

      {status && !showIngestLane && (
        <section className="demo-grid">
          {showOperationsLane && (
            <article className="demo-card">
              <h2>Diagnostics</h2>
              <dl className="demo-stat-grid">
                <div>
                  <dt>Selected mode</dt>
                  <dd>{selectedMode}</dd>
                </div>
                <div>
                  <dt>Backend</dt>
                  <dd>{status.backend}</dd>
                </div>
                <div>
                  <dt>Vector mode</dt>
                  <dd>{status.vectorMode}</dd>
                </div>
                <div>
                  <dt>Embedding dimensions</dt>
                  <dd>{status.dimensions ?? "n/a"}</dd>
                </div>
                <div>
                  <dt>Documents</dt>
                  <dd>{status.documents.total}</dd>
                </div>
                <div>
                  <dt>Total chunks</dt>
                  <dd>{status.chunkCount}</dd>
                </div>
                <div>
                  <dt>Seed docs</dt>
                  <dd>{status.documents.byKind.seed}</dd>
                </div>
                <div>
                  <dt>Custom docs</dt>
                  <dd>{status.documents.byKind.custom}</dd>
                </div>
                <div>
                  <dt>Vector acceleration</dt>
                  <dd>{status.native.active ? "active" : "inactive"}</dd>
                </div>
                <div>
                  <dt>Native source</dt>
                  <dd>{status.native.sourceLabel ?? "Not applicable"}</dd>
                </div>
                <div>
                  <dt>Reranker</dt>
                  <dd>{status.reranker.label}</dd>
                </div>
              </dl>
              {status.native.fallbackReason && (
                <p className="demo-metadata">{status.native.fallbackReason}</p>
              )}
              <p className="demo-metadata">{status.reranker.summary}</p>
              <p className="demo-metadata">
                Backend capabilities:{" "}
                <strong>{status.capabilities.join(" · ")}</strong>
              </p>
              <div className="demo-results demo-release-card">
                <h3>Retrieval Release Control</h3>
                <p className="demo-metadata">
                  This panel exercises the same AbsoluteJS release-control
                  surface that backs retrieval baselines, incidents, lane
                  readiness, and remediation execution tracking.
                </p>
                <div className="demo-release-scenario-switcher">
                  {demoReleaseWorkspaces.map((entry) => (
                    <span
                      className={`demo-release-scenario-chip demo-release-workspace-chip${releaseWorkspace === entry.id ? " demo-release-scenario-chip-active" : ""}`}
                      key={`release-workspace-${entry.id}`}
                    >
                      <button
                        type="button"
                        onClick={() => setReleaseWorkspace(entry.id)}
                        disabled={releaseWorkspace === entry.id}
                        title={entry.description}
                      >
                        Workspace · {entry.label}
                      </button>
                    </span>
                  ))}
                </div>
                <div className="demo-release-hero">
                  <div className="demo-release-hero-copy">
                    <p className="demo-release-kicker">
                      AbsoluteJS release workflow
                    </p>
                    <p className="demo-release-banner">{releaseHero}</p>
                    <p className="demo-release-summary">{releaseHeroSummary}</p>
                    <p className="demo-metadata">{releaseHeroMeta}</p>
                    <p className="demo-metadata">{releaseScopeNote}</p>
                    <div className="demo-release-pills">
                      {releaseHeroPills.map((pill) =>
                        pill.targetCardId || pill.targetActivityId ? (
                          <a
                            className={`demo-release-pill demo-release-pill-${pill.tone}`}
                            key={pill.label}
                            href={`#${pill.targetActivityId ?? pill.targetCardId}`}
                            onClick={() =>
                              openReleaseDiagnosticsTarget(pill.targetCardId)
                            }
                          >
                            <span className="demo-release-pill-label">
                              {pill.label}
                            </span>
                            <span className="demo-release-pill-value">
                              {pill.value}
                            </span>
                          </a>
                        ) : (
                          <span
                            className={`demo-release-pill demo-release-pill-${pill.tone}`}
                            key={pill.label}
                          >
                            <span className="demo-release-pill-label">
                              {pill.label}
                            </span>
                            <span className="demo-release-pill-value">
                              {pill.value}
                            </span>
                          </span>
                        ),
                      )}
                    </div>
                    <div className="demo-release-scenario-switcher">
                      {releaseScenarioActions.map((entry) => (
                        <span
                          className={`demo-release-scenario-chip${entry.active ? " demo-release-scenario-chip-active" : ""}`}
                          key={entry.id}
                        >
                          {entry.action ? (
                            <button
                              type="button"
                              onClick={() => runReleaseAction(entry.action!)}
                              disabled={
                                entry.active ||
                                releaseActionBusyId === entry.action.id
                              }
                              title={entry.action.description}
                            >
                              {releaseActionBusyId === entry.action.id
                                ? `Running ${entry.action.label}...`
                                : entry.label}
                            </button>
                          ) : (
                            <span>{entry.label}</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="demo-release-path">
                      {releasePathSteps.map((step) => (
                        <article
                          className={`demo-release-path-step demo-release-path-step-${step.status}`}
                          key={step.id}
                        >
                          <div className="demo-release-path-step-header">
                            <h4>{step.label}</h4>
                            <span
                              className={`demo-release-path-status demo-release-path-status-${step.status}`}
                            >
                              {step.status}
                            </span>
                          </div>
                          <p>{step.summary}</p>
                          <p className="demo-release-path-detail">
                            {step.detail}
                          </p>
                          {step.action ? (
                            <button
                              className="demo-release-path-action"
                              type="button"
                              onClick={() => runReleaseAction(step.action!)}
                              disabled={releaseActionBusyId === step.action.id}
                            >
                              {releaseActionBusyId === step.action.id
                                ? `Running ${step.action.label}...`
                                : step.action.label}
                            </button>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                  <div className="demo-release-action-rail">
                    <span className="demo-release-action-label">
                      Live actions
                    </span>
                    <div className="demo-release-action-state">
                      <span className="demo-release-action-state-badge">
                        Scenario · {scenario?.label ?? "Blocked stable lane"}
                      </span>
                      <span
                        className={`demo-release-action-delta-badge demo-release-action-delta-badge-${releaseRailDeltaChip.tone}`}
                      >
                        {releaseRailDeltaChip.label}
                      </span>
                      <span
                        className={`demo-release-action-delta-badge demo-release-action-delta-badge-${railIncidentPostureChip.tone}`}
                      >
                        Incident posture · {railIncidentPostureChip.label}
                      </span>
                      <span
                        className={`demo-release-action-delta-badge demo-release-action-delta-badge-${railGateChip.tone}`}
                      >
                        Gate posture · {railGateChip.label}
                      </span>
                      <span
                        className={`demo-release-action-delta-badge demo-release-action-delta-badge-${railApprovalChip.tone}`}
                      >
                        Approval posture · {railApprovalChip.label}
                      </span>
                      <span
                        className={`demo-release-action-delta-badge demo-release-action-delta-badge-${railRemediationChip.tone}`}
                      >
                        Remediation posture · {railRemediationChip.label}
                      </span>
                    </div>
                    <div className="demo-release-rail-meta">
                      {releaseRailUpdateSource.targetCardId ||
                      releaseRailUpdateSource.targetActivityId ? (
                        <a
                          className={`demo-release-activity-lane demo-release-activity-lane-${releaseRailUpdateSource.tone}`}
                          href={`#${releaseRailUpdateSource.targetActivityId ?? releaseRailUpdateSource.targetCardId}`}
                          onClick={() =>
                            openReleaseDiagnosticsTarget(
                              releaseRailUpdateSource.targetCardId,
                            )
                          }
                        >
                          {releaseRailUpdateSource.label}
                        </a>
                      ) : (
                        <span
                          className={`demo-release-activity-lane demo-release-activity-lane-${releaseRailUpdateSource.tone}`}
                        >
                          {releaseRailUpdateSource.label}
                        </span>
                      )}
                      <p className="demo-release-updated">
                        {releaseRailUpdatedLabel}
                      </p>
                    </div>
                    {releasePendingLabel ? (
                      <p className="demo-release-pending">
                        {releasePendingLabel}
                      </p>
                    ) : null}
                    {latestReleaseAction ? (
                      <details
                        className={`demo-collapsible demo-release-action-latest demo-release-action-latest-${latestReleaseAction.tone}`}
                      >
                        <summary>
                          Latest action · {latestReleaseAction.title}
                        </summary>
                        {latestReleaseAction.detail ? (
                          <p>{latestReleaseAction.detail}</p>
                        ) : null}
                        <p className="demo-release-next-step">
                          {latestReleaseAction.nextStep}
                        </p>
                      </details>
                    ) : null}
                    <details
                      className={`demo-collapsible demo-release-rail-callout demo-release-rail-callout-${releaseRailCallout.tone}`}
                    >
                      <summary>{releaseRailCallout.title}</summary>
                      <p>{releaseRailCallout.message}</p>
                      {releaseRailCallout.detail ? (
                        <p>{releaseRailCallout.detail}</p>
                      ) : null}
                      <p className="demo-release-next-step">
                        {releaseRailCallout.nextStep}
                      </p>
                    </details>
                    {recentReleaseActivity.length ? (
                      <div className="demo-release-activity-stack">
                        <span className="demo-release-action-subtitle">
                          Recent activity
                        </span>
                        {recentReleaseActivity.map((entry, index) => (
                          <a
                            id={entry.id}
                            key={`${entry.laneLabel}-${entry.title}-${index}`}
                            className={`demo-release-activity demo-release-activity-${entry.tone}`}
                            href={`#${entry.targetCardId}`}
                            onClick={() =>
                              openReleaseDiagnosticsTarget(entry.targetCardId)
                            }
                          >
                            <span
                              className={`demo-release-activity-lane demo-release-activity-lane-${entry.tone}`}
                            >
                              {entry.laneLabel}
                            </span>
                            <strong>{entry.title}</strong>
                            {entry.detail ? ` · ${entry.detail}` : ""}
                          </a>
                        ))}
                      </div>
                    ) : null}
                    <div className="demo-release-action-group">
                      <span className="demo-release-action-subtitle">
                        Release
                      </span>
                      <div className="demo-release-actions">
                        {primaryReleaseActions.map((action) => (
                          <button
                            key={action.id}
                            className={`demo-release-action demo-release-action-${action.tone ?? "neutral"}`}
                            type="button"
                            onClick={() => runReleaseAction(action)}
                            disabled={releaseActionBusyId === action.id}
                            title={action.description}
                          >
                            {releaseActionBusyId === action.id
                              ? `Running ${action.label}...`
                              : action.label}
                          </button>
                        ))}
                      </div>
                      {secondaryReleaseActions.length > 0 ? (
                        <details className="demo-collapsible demo-release-more-actions">
                          <summary>More actions</summary>
                          <div className="demo-release-actions">
                            {secondaryReleaseActions.map((action) => (
                              <button
                                key={action.id}
                                className={`demo-release-action demo-release-action-${action.tone ?? "neutral"}`}
                                type="button"
                                onClick={() => runReleaseAction(action)}
                                disabled={releaseActionBusyId === action.id}
                                title={action.description}
                              >
                                {releaseActionBusyId === action.id
                                  ? `Running ${action.label}...`
                                  : action.label}
                              </button>
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </div>
                    {handoffActions.length > 0 ? (
                      <div className="demo-release-action-group">
                        <span className="demo-release-action-subtitle">
                          Handoff
                        </span>
                        <div className="demo-release-actions">
                          {handoffActions.map((action) => (
                            <button
                              key={action.id}
                              className={`demo-release-action demo-release-action-${action.tone ?? "neutral"}`}
                              type="button"
                              onClick={() => runReleaseAction(action)}
                              disabled={releaseActionBusyId === action.id}
                              title={action.description}
                            >
                              {releaseActionBusyId === action.id
                                ? `Running ${action.label}...`
                                : action.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="demo-stat-grid">
                  <article className="demo-stat-card">
                    <span className="demo-stat-label">Stable baseline</span>
                    <strong>{stableBaseline?.label ?? "Not promoted"}</strong>
                    <p>
                      {stableBaseline
                        ? `${stableBaseline.retrievalId} · v${stableBaseline.version}${stableBaseline.approvedBy ? ` · approved by ${stableBaseline.approvedBy}` : ""}`
                        : "No stable baseline has been promoted yet."}
                    </p>
                  </article>
                  <article className="demo-stat-card">
                    <span className="demo-stat-label">Canary baseline</span>
                    <strong>{canaryBaseline?.label ?? "Not promoted"}</strong>
                    <p>
                      {canaryBaseline
                        ? `${canaryBaseline.retrievalId} · v${canaryBaseline.version}${canaryBaseline.approvedAt ? ` · ${formatDate(canaryBaseline.approvedAt)}` : ""}`
                        : "No canary baseline has been promoted yet."}
                    </p>
                  </article>
                  <article className="demo-stat-card">
                    <span className="demo-stat-label">Stable readiness</span>
                    <strong>
                      {stableReadiness?.ready ? "Ready" : "Blocked"}
                    </strong>
                    <p>{stableReadinessStatSummary}</p>
                  </article>
                  <article className="demo-stat-card">
                    <span className="demo-stat-label">
                      Remediation guardrails
                    </span>
                    <strong>
                      {remediationSummary
                        ? `${remediationSummary.guardrailBlockedCount} blocked · ${remediationSummary.replayCount} replays`
                        : "No remediation executions"}
                    </strong>
                    <p>{remediationGuardrailSummary}</p>
                  </article>
                </div>
                <p
                  className={`demo-release-card-state demo-release-card-state-${releaseStateBadge.tone}`}
                >
                  State · {releaseStateBadge.label}
                </p>
                <div className="demo-result-grid">
                  <article className="demo-result-item">
                    <h4>Evidence drills</h4>
                    <p className="demo-score-headline">
                      Jump directly into the trace that explains each blocker
                      class.
                    </p>
                    <div className="demo-release-actions">
                      {releaseEvidenceDrills.map((drill) => (
                        <button
                          key={drill.id}
                          className={`demo-release-action demo-release-action-${drill.active ? "primary" : "neutral"}`}
                          type="button"
                          onClick={() => runReleaseEvidenceDrill(drill)}
                        >
                          {drill.label}
                        </button>
                      ))}
                    </div>
                    {releaseEvidenceDrills.map((drill) => (
                      <Fragment key={`release-drill-${drill.id}`}>
                        <p className="demo-metadata">
                          <strong>{drill.classificationLabel}:</strong>{" "}
                          {drill.summary} Expected source ·{" "}
                          {drill.expectedSource}
                        </p>
                        <p className="demo-metadata">
                          {drill.traceExpectation}
                        </p>
                      </Fragment>
                    ))}
                  </article>
                  <article className="demo-result-item">
                    <h4>Blocker comparison</h4>
                    <p className="demo-score-headline">
                      {scenarioClassificationLabel
                        ? `Active blocker · ${scenarioClassificationLabel}`
                        : "Compare both blocker classes"}
                    </p>
                    <div className="demo-result-grid">
                      {releaseBlockerComparisonCards.map((card) => (
                        <article className="demo-result-item" key={card.id}>
                          <h4>
                            {card.label}
                            {card.active ? " · active" : ""}
                          </h4>
                          {card.detailLines.map((line) => (
                            <p
                              className="demo-metadata"
                              key={`${card.id}-${line}`}
                            >
                              {line}
                            </p>
                          ))}
                        </article>
                      ))}
                    </div>
                  </article>
                  <article
                    className="demo-result-item"
                    id="release-runtime-history-card"
                  >
                    <h4>Runtime planner history</h4>
                    <p className="demo-score-headline">
                      {runtimePlannerHistorySummary}
                    </p>
                    {runtimePlannerHistoryLines.map((line) => (
                      <p
                        className="demo-metadata"
                        key={`runtime-planner-${line}`}
                      >
                        {line}
                      </p>
                    ))}
                  </article>
                  <article
                    className="demo-result-item"
                    id="release-benchmark-snapshots-card"
                  >
                    <h4>Adaptive planner benchmark</h4>
                    <p className="demo-score-headline">
                      {benchmarkSnapshotSummary}
                    </p>
                    {benchmarkSnapshotLines.map((line) => (
                      <p
                        className="demo-metadata"
                        key={`benchmark-snapshot-${line}`}
                      >
                        {line}
                      </p>
                    ))}
                  </article>
                  <article
                    className="demo-result-item"
                    id="release-active-deltas-card"
                  >
                    <h4>Active blocker deltas</h4>
                    <p className="demo-score-headline">
                      {activeBlockerDeltaSummary}
                    </p>
                    {activeBlockerDeltaLines.map((line) => (
                      <p
                        className="demo-metadata"
                        key={`active-blocker-delta-${line}`}
                      >
                        {line}
                      </p>
                    ))}
                  </article>
                  <article
                    className="demo-result-item"
                    id="release-lane-readiness-card"
                  >
                    <h4>Lane readiness</h4>
                    <div className="demo-key-value-grid">
                      {laneReadinessEntries.map((entry) => (
                        <Fragment
                          key={`lane-readiness-${entry.targetRolloutLabel}`}
                        >
                          <div className="demo-key-value-row">
                            <span>{entry.targetRolloutLabel ?? "lane"}</span>
                            <strong>{entry.ready ? "ready" : "blocked"}</strong>
                          </div>
                          {entry.reasons.slice(0, 2).map((reason) => (
                            <p
                              className="demo-metadata"
                              key={`${entry.targetRolloutLabel}-${reason}`}
                            >
                              {reason}
                            </p>
                          ))}
                        </Fragment>
                      ))}
                    </div>
                  </article>
                  <article className="demo-result-item">
                    <h4>Lane recommendations</h4>
                    <div className="demo-insight-stack">
                      {releaseRecommendations.length > 0 ? (
                        releaseRecommendations.map((entry) => (
                          <p
                            className="demo-insight-card"
                            key={`${entry.groupKey}:${entry.targetRolloutLabel}:${entry.recommendedAction}`}
                          >
                            <strong>
                              {entry.targetRolloutLabel ?? "lane"} ·{" "}
                              {entry.classificationLabel ??
                                "release recommendation"}
                              :
                            </strong>{" "}
                            {entry.recommendedAction.replaceAll("_", " ")}
                            {entry.reasons[0] ? ` · ${entry.reasons[0]}` : ""}
                          </p>
                        ))
                      ) : (
                        <p className="demo-insight-card">
                          No lane recommendations are available yet.
                        </p>
                      )}
                    </div>
                  </article>
                  <article
                    className="demo-result-item"
                    id="release-open-incidents-card"
                  >
                    <h4>Open incidents</h4>
                    <p className="demo-score-headline">
                      {incidentSummaryLabel}
                    </p>
                    {incidentClassificationDetailLines.map((line) => (
                      <p
                        className="demo-metadata"
                        key={`incident-detail-${line}`}
                      >
                        {line}
                      </p>
                    ))}
                    <div className="demo-insight-stack">
                      {recentIncidents.slice(0, 3).map((incident) => (
                        <p
                          className="demo-insight-card"
                          key={`${incident.kind}:${incident.triggeredAt}`}
                        >
                          <strong>
                            {incident.targetRolloutLabel ?? "lane"} ·{" "}
                            {incident.kind} ·{" "}
                            {incident.classificationLabel ??
                              "general regression"}
                          </strong>
                          <br />
                          {incident.message}
                        </p>
                      ))}
                    </div>
                  </article>
                  <article
                    className="demo-result-item"
                    id="release-remediation-history-card"
                  >
                    <h4>Remediation execution history</h4>
                    {remediationDetailLines.map((line) => (
                      <p
                        className="demo-metadata"
                        key={`remediation-detail-${line}`}
                      >
                        {line}
                      </p>
                    ))}
                    <div className="demo-key-value-grid">
                      {recentIncidentRemediationExecutions
                        .slice(0, 4)
                        .map((entry, index) => (
                          <div
                            className="demo-key-value-row"
                            key={`remediation-execution-${index}`}
                          >
                            <span>{entry.action?.kind ?? "execution"}</span>
                            <strong>
                              {entry.code}
                              {entry.idempotentReplay ? " · replay" : ""}
                              {entry.blockedByGuardrail ? " · blocked" : ""}
                            </strong>
                          </div>
                        ))}
                    </div>
                  </article>
                </div>
                <details
                  className="demo-collapsible demo-release-diagnostics"
                  id="release-diagnostics"
                >
                  <summary>
                    Advanced release diagnostics · {releaseDiagnosticsSummary}
                  </summary>
                  <p className="demo-release-updated">
                    {releaseDiagnosticsUpdatedLabel}
                  </p>
                  <p
                    className={`demo-release-card-state demo-release-card-state-${releaseStateBadge.tone}`}
                  >
                    State · {releaseStateBadge.label}
                  </p>
                  <div className="demo-result-grid">
                    <article
                      className="demo-result-item"
                      id="release-promotion-candidates-card"
                    >
                      <h4>Promotion candidates</h4>
                      <div className="demo-key-value-grid">
                        {releaseCandidates.length > 0 ? (
                          releaseCandidates
                            .slice(0, 3)
                            .map((candidate, index) => (
                              <Fragment
                                key={`promotion-candidate-${candidate.targetRolloutLabel}-${index}`}
                              >
                                <div className="demo-key-value-row">
                                  <span>
                                    {candidate.targetRolloutLabel ?? "lane"} ·{" "}
                                    {candidate.candidateRetrievalId ??
                                      "candidate"}
                                  </span>
                                  <strong>{candidate.reviewStatus}</strong>
                                </div>
                                <p className="demo-metadata">
                                  {candidate.reasons[0] ??
                                    "No release reasons recorded."}
                                </p>
                              </Fragment>
                            ))
                        ) : (
                          <p className="demo-metadata">
                            No promotion candidates recorded yet.
                          </p>
                        )}
                      </div>
                    </article>
                    <article className="demo-result-item">
                      <h4>Release alerts</h4>
                      <div className="demo-insight-stack">
                        {releaseAlerts.length > 0 ? (
                          releaseAlerts.slice(0, 4).map((alert, index) => (
                            <p
                              className="demo-insight-card"
                              key={`${alert.kind}-${index}`}
                            >
                              <strong>
                                {alert.targetRolloutLabel ?? "lane"} ·{" "}
                                {alert.kind} ·{" "}
                                {alert.classificationLabel ??
                                  "general regression"}
                              </strong>
                              <br />
                              {alert.message ?? "No alert detail"}
                            </p>
                          ))
                        ) : (
                          <p className="demo-insight-card">
                            No release alerts are active.
                          </p>
                        )}
                      </div>
                    </article>
                    <article
                      className="demo-result-item"
                      id="release-policy-history-card"
                    >
                      <h4>Policy history</h4>
                      {policyHistoryDetailLines.map((line) => (
                        <p
                          className="demo-metadata"
                          key={`policy-detail-${line}`}
                        >
                          {line}
                        </p>
                      ))}
                      <div className="demo-insight-stack">
                        {policyHistoryEntries.length > 0 ? (
                          policyHistoryEntries.map((entry) => (
                            <p className="demo-insight-card" key={entry.id}>
                              <strong>{entry.title}</strong>
                              <br />
                              {entry.detail}
                            </p>
                          ))
                        ) : (
                          <p className="demo-insight-card">
                            {policyHistorySummary}
                          </p>
                        )}
                      </div>
                    </article>
                    <article
                      className="demo-result-item"
                      id="release-audit-surfaces-card"
                    >
                      <h4>Audit surfaces</h4>
                      <div className="demo-insight-stack">
                        {auditSurfaceEntries.length > 0 ? (
                          auditSurfaceEntries.map((entry) => (
                            <p className="demo-insight-card" key={entry.id}>
                              <strong>{entry.title}</strong>
                              <br />
                              {entry.detail}
                            </p>
                          ))
                        ) : (
                          <p className="demo-insight-card">
                            {auditSurfaceSummary}
                          </p>
                        )}
                      </div>
                    </article>
                    <article
                      className="demo-result-item"
                      id="release-polling-surfaces-card"
                    >
                      <h4>Polling surfaces</h4>
                      <div className="demo-insight-stack">
                        {pollingSurfaceEntries.map((entry) => (
                          <p className="demo-insight-card" key={entry.id}>
                            <strong>{entry.title}</strong>
                            <br />
                            {entry.detail}
                          </p>
                        ))}
                      </div>
                    </article>
                    <article
                      className="demo-result-item"
                      id="release-handoff-incidents-card"
                    >
                      <h4>Handoff incidents</h4>
                      <p className="demo-score-headline">
                        {stableHandoffIncidentSummaryLabel}
                      </p>
                      <div className="demo-insight-stack">
                        {handoffIncidents.length > 0 ? (
                          handoffIncidents
                            .slice(0, 2)
                            .map((incident, index) => (
                              <p
                                className="demo-insight-card"
                                key={`handoff-incident-${incident.id ?? index}`}
                              >
                                <strong>
                                  {incident.status ?? "incident"} ·{" "}
                                  {incident.kind ?? "handoff_stale"}
                                </strong>
                                <br />
                                {incident.message ??
                                  "No handoff incident detail"}
                              </p>
                            ))
                        ) : (
                          <p className="demo-insight-card">
                            No handoff incidents recorded.
                          </p>
                        )}
                        {handoffIncidentHistory
                          .slice(0, 3)
                          .map((entry, index) => (
                            <p
                              className="demo-insight-card"
                              key={`handoff-history-${entry.incidentId ?? index}-${entry.recordedAt ?? 0}`}
                            >
                              <strong>{entry.action ?? "history"}</strong>
                              <br />
                              {[
                                entry.notes,
                                entry.recordedAt
                                  ? new Date(entry.recordedAt).toLocaleString()
                                  : undefined,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ))}
                      </div>
                    </article>
                    <article
                      className="demo-result-item"
                      id="release-stable-handoff-card"
                    >
                      <h4>Stable handoff</h4>
                      <div className="demo-key-value-grid">
                        {stableHandoff ? (
                          <>
                            <div className="demo-key-value-row">
                              <span>
                                {stableHandoff.sourceRolloutLabel} {"->"}{" "}
                                {stableHandoff.targetRolloutLabel}
                              </span>
                              <strong>
                                {stableHandoff.readyForHandoff
                                  ? "ready"
                                  : "blocked"}
                              </strong>
                            </div>
                            <p className="demo-metadata">
                              {stableHandoff.candidateRetrievalId
                                ? `candidate ${stableHandoff.candidateRetrievalId}`
                                : "No candidate retrieval is attached to the handoff yet."}
                              {stableHandoffDecision?.kind
                                ? ` · latest ${stableHandoffDecision.kind}`
                                : ""}
                            </p>
                            {stableHandoffDisplayReasons.map((reason) => (
                              <p
                                className="demo-metadata"
                                key={`stable-handoff-reason-${reason}`}
                              >
                                {reason}
                              </p>
                            ))}
                            {stableHandoffAutoComplete ? (
                              <p className="demo-metadata">
                                {stableHandoffAutoCompleteLabel}
                              </p>
                            ) : null}
                            <div className="demo-key-value-row">
                              <span>Drift events</span>
                              <strong>
                                {stableHandoffDrift?.totalCount ?? 0}
                              </strong>
                            </div>
                          </>
                        ) : (
                          <p className="demo-metadata">
                            No stable handoff posture is available yet.
                          </p>
                        )}
                      </div>
                    </article>
                  </div>
                </details>
              </div>
              <div className="demo-actions">
                <button onClick={reseed} type="button">
                  Re-seed defaults
                </button>
                <button onClick={resetCustom} type="button">
                  Reset custom docs
                </button>
                <button onClick={refreshData} type="button">
                  Refresh
                </button>
              </div>
            </article>
          )}

          {(showRetrievalLane ||
            showQualityLane ||
            showWorkflowLane ||
            showOperationsLane) && (
            <article className="demo-card">
              <h2>Retrieve And Verify</h2>
              <p className="demo-metadata">
                This section is powered by <code>useRAG</code>. Run a query,
                then confirm the returned chunk text and source label match the
                indexed source list below.
              </p>
              <div className="demo-preset-grid">
                <button
                  type="button"
                  onClick={() =>
                    runPresetSearch(
                      "How do metadata filters change retrieval quality?",
                      { kind: "seed" },
                      "preset: filter behavior",
                      "filter-behavior",
                    )
                  }
                >
                  Filter behavior
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runPresetSearch(
                      "What should I verify after ingesting a new source?",
                      {},
                      "preset: verify ingestion",
                      "verify-ingestion",
                    )
                  }
                >
                  Verify ingestion
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runPresetSearch(
                      "List support policies for shipping and returns.",
                      { source: "guide/demo.md" },
                      "preset: source filter",
                      "source-filter",
                    )
                  }
                >
                  Source filter
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runPresetSearch(
                      "Why should metadata be stable?",
                      { source: "guides/metadata.md" },
                      "preset: metadata discipline",
                      "metadata-discipline",
                    )
                  }
                >
                  Metadata discipline
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runPresetSearch(
                      "Which aurora launch packet phrase shows late interaction can match precise wording without splitting the parent document?",
                      {},
                      "preset: late interaction",
                      "hybrid",
                    )
                  }
                >
                  Late interaction / multivector
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runPresetSearch(
                      "Which synced site discovery guide says discovery diagnostics stay visible on the same sync surface as every other source?",
                      {
                        source: "sync/site/demo/sync-fixtures/site/docs/guide",
                      },
                      "preset: site discovery",
                      "site-discovery",
                    )
                  }
                >
                  Site discovery (sync first)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runPresetSearch(
                      "release",
                      { nativeQueryProfile: "latency", topK: 4 },
                      "preset: planner profile latency",
                      "planner-profile-latency",
                    )
                  }
                >
                  Planner profile · latency
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runPresetSearch(
                      "release",
                      { nativeQueryProfile: "balanced", topK: 4 },
                      "preset: planner profile balanced",
                      "planner-profile-balanced",
                    )
                  }
                >
                  Planner profile · balanced
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runPresetSearch(
                      "release",
                      { nativeQueryProfile: "recall", topK: 4 },
                      "preset: planner profile recall",
                      "planner-profile-recall",
                    )
                  }
                >
                  Planner profile · recall
                </button>
              </div>
              <form className="demo-search-form" onSubmit={submitSearch}>
                <label htmlFor="query">Query</label>
                <input
                  id="query"
                  name="query"
                  onChange={onSearchFieldChange}
                  placeholder="e.g. How do metadata filters work?"
                  required
                  type="text"
                  value={searchForm.query}
                />
                <label htmlFor="topK">Top K</label>
                <input
                  id="topK"
                  max={20}
                  min={1}
                  name="topK"
                  onChange={onSearchFieldChange}
                  type="number"
                  value={searchForm.topK}
                />
                <label htmlFor="scoreThreshold">Minimum score (0-1)</label>
                <input
                  id="scoreThreshold"
                  name="scoreThreshold"
                  onChange={onSearchFieldChange}
                  placeholder="optional"
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  value={searchForm.scoreThreshold}
                />
                <label htmlFor="kind">Kind filter</label>
                <select
                  id="kind"
                  name="kind"
                  onChange={onSearchFieldChange}
                  value={searchForm.kind}
                >
                  <option value="">Any</option>
                  <option value="seed">Seed</option>
                  <option value="custom">Custom</option>
                </select>
                <label htmlFor="source">Source filter</label>
                <input
                  className={
                    searchForm.source.trim().length > 0
                      ? "demo-filter-active"
                      : undefined
                  }
                  id="source"
                  name="source"
                  onChange={onSearchFieldChange}
                  placeholder="e.g. guide/demo.md"
                  type="text"
                  value={searchForm.source}
                />
                <label htmlFor="documentId">Document ID filter</label>
                <input
                  className={
                    searchForm.documentId.trim().length > 0
                      ? "demo-filter-active"
                      : undefined
                  }
                  id="documentId"
                  name="documentId"
                  onChange={onSearchFieldChange}
                  placeholder="e.g. rag-demo"
                  type="text"
                  value={searchForm.documentId}
                />
                <button type="submit">Search index</button>
              </form>
              <div className="demo-results">
                <h3>Active Retrieval Scope</h3>
                <div className="demo-badge-row">
                  <span className="demo-state-chip">
                    {formatRetrievalScopeSummary(searchForm)}
                  </span>
                  <span className="demo-state-chip">
                    Changed by:{" "}
                    {scopeDriver.replace(/^row action: /, "row action · ")}
                  </span>
                  <span className="demo-state-chip">
                    Results: {searchResults?.count ?? 0}
                  </span>
                </div>
                <p className="demo-metadata">
                  {formatRetrievalScopeHint(searchForm)}
                </p>
                <div className="demo-actions">
                  <button
                    disabled={
                      searchForm.query.trim().length === 0 &&
                      searchForm.source.trim().length === 0 &&
                      searchForm.documentId.trim().length === 0 &&
                      searchForm.kind.length === 0
                    }
                    onClick={clearRetrievalScope}
                    type="button"
                  >
                    Clear scope
                  </button>
                  <button
                    disabled={searchForm.query.trim().length === 0}
                    onClick={rerunLastQuery}
                    type="button"
                  >
                    Rerun query
                  </button>
                  <button onClick={clearAllRetrievalState} type="button">
                    Clear search
                  </button>
                </div>
                {recentQueries.length > 0 && (
                  <>
                    <p className="demo-section-caption">Recent Searches</p>
                    <div className="demo-badge-row">
                      {recentQueries.map((entry) => (
                        <button
                          className="demo-state-chip"
                          key={`${entry.label}-${entry.state.source}-${entry.state.documentId}-${entry.state.kind}`}
                          onClick={() => rerunRecentQuery(entry.state)}
                          type="button"
                        >
                          {entry.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {searchError && <p className="demo-error">{searchError}</p>}
              {searchResults && (
                <div className="demo-search-results" id="search-results">
                  <p className="demo-metadata">
                    {searchResults.count} results for “{searchResults.query}” in{" "}
                    {searchResults.elapsedMs}ms
                  </p>
                  <p className="demo-metadata">
                    {formatRetrievalScopeSummary(searchForm)}
                  </p>
                  <p className="demo-metadata">
                    Scope changed by: {scopeDriver}
                  </p>
                  <p className="demo-metadata">
                    Reranking is active: AbsoluteJS reorders the first vector
                    hits with the built-in heuristic provider before these
                    results render.
                  </p>
                  <p className="demo-metadata">
                    Verification rule: a good result shows chunk text that
                    answers the query and a source label you can trace back to
                    the indexed source list.
                  </p>
                  {searchResults.storyHighlights.length > 0 && (
                    <div className="demo-results">
                      <h3>Retrieval Story</h3>
                      {searchResults.storyHighlights.map((line) => (
                        <p className="demo-metadata" key={line}>
                          {line}
                        </p>
                      ))}
                    </div>
                  )}
                  {searchResults.attributionOverview.length > 0 && (
                    <div className="demo-results">
                      <h3>Attribution Overview</h3>
                      {searchResults.attributionOverview.map((line) => (
                        <p className="demo-metadata" key={line}>
                          {line}
                        </p>
                      ))}
                    </div>
                  )}
                  {searchResults.sectionDiagnostics.length > 0 && (
                    <div className="demo-results">
                      <h3>Section Diagnostics</h3>
                      <div className="demo-result-grid">
                        {searchResults.sectionDiagnostics.map((diagnostic) => (
                          <article
                            className="demo-result-item"
                            key={`search-diagnostic-${diagnostic.key}`}
                          >
                            <h4>{diagnostic.label}</h4>
                            <p className="demo-result-source">
                              {diagnostic.summary}
                            </p>
                            <p className="demo-metadata">
                              {formatSectionDiagnosticChannels(diagnostic)}
                            </p>
                            <p className="demo-metadata">
                              {formatSectionDiagnosticAttributionFocus(
                                diagnostic,
                              )}
                            </p>
                            <p className="demo-metadata">
                              {formatSectionDiagnosticPipeline(diagnostic)}
                            </p>
                            {formatSectionDiagnosticStageFlow(diagnostic) && (
                              <p className="demo-metadata">
                                {formatSectionDiagnosticStageFlow(diagnostic)}
                              </p>
                            )}
                            {formatSectionDiagnosticStageBounds(diagnostic) && (
                              <p className="demo-metadata">
                                {formatSectionDiagnosticStageBounds(diagnostic)}
                              </p>
                            )}
                            {formatSectionDiagnosticStageWeightRows(
                              diagnostic,
                            ).map((line: string) => (
                              <p
                                className="demo-metadata"
                                key={`${diagnostic.key}-${line}`}
                              >
                                {line}
                              </p>
                            ))}
                            <p className="demo-metadata">
                              {formatSectionDiagnosticTopEntry(diagnostic)}
                            </p>
                            {formatSectionDiagnosticCompetition(diagnostic) && (
                              <p className="demo-metadata">
                                {formatSectionDiagnosticCompetition(diagnostic)}
                              </p>
                            )}
                            {formatSectionDiagnosticReasons(diagnostic).length >
                              0 && (
                              <div className="demo-badge-row">
                                {formatSectionDiagnosticReasons(diagnostic).map(
                                  (reason) => (
                                    <span
                                      className="demo-state-chip"
                                      key={`${diagnostic.key}-${reason}`}
                                    >
                                      {reason}
                                    </span>
                                  ),
                                )}
                                {formatSectionDiagnosticStageWeightReasons(
                                  diagnostic,
                                ).map((reason: string) => (
                                  <span
                                    className="demo-state-chip"
                                    key={`${diagnostic.key}-${reason}`}
                                  >
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            )}
                            {formatSectionDiagnosticDistributionRows(
                              diagnostic,
                            ).map((line) => (
                              <p
                                className="demo-metadata"
                                key={`${diagnostic.key}-${line}`}
                              >
                                {line}
                              </p>
                            ))}
                          </article>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="demo-result-grid">
                    {searchSectionGroups.map((group) => (
                      <article
                        className="demo-result-item"
                        id={group.targetId}
                        key={group.id}
                      >
                        <h3>{group.label}</h3>
                        <p className="demo-result-source">{group.summary}</p>
                        {group.jumps.length > 0 && (
                          <div className="demo-badge-row">
                            {group.jumps.map((jump) => (
                              <a
                                className="demo-state-chip"
                                href={`#${jump.targetId}`}
                                key={jump.id}
                              >
                                {jump.label}
                              </a>
                            ))}
                          </div>
                        )}
                        <div className="demo-result-grid">
                          {group.chunks.map((chunk) => (
                            <article
                              className="demo-result-item"
                              id={chunk.targetId}
                              key={chunk.chunkId}
                            >
                              <h4>{chunk.title}</h4>
                              <p className="demo-result-score">
                                score: {formatScore(chunk.score)}
                              </p>
                              <p className="demo-result-source">
                                source: {chunk.source}
                              </p>
                              {chunk.labels?.contextLabel && (
                                <p className="demo-metadata">
                                  {chunk.labels.contextLabel}
                                </p>
                              )}
                              {chunk.labels?.locatorLabel && (
                                <p className="demo-metadata">
                                  {chunk.labels.locatorLabel}
                                </p>
                              )}
                              {chunk.labels?.provenanceLabel && (
                                <p className="demo-metadata">
                                  {chunk.labels.provenanceLabel}
                                </p>
                              )}
                              {formatDemoMetadataSummary(chunk.metadata).map(
                                (line) => (
                                  <p className="demo-metadata" key={line}>
                                    {line}
                                  </p>
                                ),
                              )}
                              <p className="demo-result-text">{chunk.text}</p>
                            </article>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                  {searchResults.trace && (
                    <div className="demo-results">
                      <h3>Retrieval Trace</h3>
                      <p className="demo-metadata">
                        This is the first-class retrieval trace from AbsoluteJS.
                        It shows how the query was transformed, which retrieval
                        stages ran, and how many candidates survived each step.
                      </p>
                      <div className="demo-stat-grid">
                        {buildTracePresentation(searchResults.trace).stats.map(
                          (row) => (
                            <article
                              className="demo-stat-card"
                              key={`search-trace-stat-${row.label}`}
                            >
                              <p className="demo-section-caption">
                                {row.label}
                              </p>
                              <strong>{row.value}</strong>
                            </article>
                          ),
                        )}
                      </div>
                      <div className="demo-key-value-list">
                        {buildTracePresentation(
                          searchResults.trace,
                        ).details.map((row) => (
                          <p
                            className="demo-key-value-row"
                            key={`search-trace-detail-${row.label}`}
                          >
                            <strong>{row.label}</strong>
                            <span>{row.value}</span>
                          </p>
                        ))}
                      </div>
                      <div className="demo-result-grid">
                        {buildTracePresentation(searchResults.trace).steps.map(
                          (step, index) => (
                            <details
                              className="demo-collapsible demo-result-item"
                              key={`${step.stage}-${index}`}
                              open={index === 0}
                            >
                              <summary>
                                <strong>
                                  {index + 1}. {step.label}
                                </strong>
                              </summary>
                              <div className="demo-key-value-list">
                                {step.rows.map((row) => (
                                  <p
                                    className="demo-key-value-row"
                                    key={`${step.stage}-${row.label}`}
                                  >
                                    <strong>{row.label}</strong>
                                    <span>{row.value}</span>
                                  </p>
                                ))}
                              </div>
                            </details>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="demo-results">
                <h3>Benchmark Retrieval</h3>
                <p className="demo-metadata">
                  This section uses <code>useRAG().evaluate</code> to run a
                  built-in benchmark suite. Each case names the source we expect
                  retrieval to surface so you can compare expected, retrieved,
                  and missing evidence directly.
                </p>
                {attributionBenchmarkNotes.map((line) => (
                  <p className="demo-metadata" key={line}>
                    {line}
                  </p>
                ))}
                <div className="demo-badge-row">
                  {benchmarkOutcomeRail.map((entry) => (
                    <span
                      className="demo-state-chip"
                      key={entry.id}
                      title={entry.summary}
                    >
                      {formatBenchmarkOutcomeRailLabel(
                        entry,
                        benchmarkPresetId,
                      )}
                    </span>
                  ))}
                </div>
                <div className="demo-preset-grid">
                  {demoEvaluationPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.description}
                      onClick={() =>
                        runPresetSearch(
                          preset.query,
                          { source: preset.expectedSources[0] ?? "" },
                          `benchmark preset: ${preset.label}`,
                          preset.id,
                        )
                      }
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="demo-actions">
                  <button
                    disabled={rag.evaluate.isEvaluating}
                    onClick={runEvaluation}
                    type="button"
                  >
                    {rag.evaluate.isEvaluating
                      ? "Running benchmark suite..."
                      : "Run benchmark suite"}
                  </button>
                </div>
                {evaluationMessage && (
                  <p className="demo-metadata">{evaluationMessage}</p>
                )}
                {rag.evaluate.error && (
                  <p className="demo-error">{rag.evaluate.error}</p>
                )}
                {evaluation && (
                  <>
                    <p className="demo-metadata">
                      Benchmark summary: {formatEvaluationSummary(evaluation)}
                    </p>
                    <div className="demo-result-grid">
                      {evaluation.cases.map((entry) => (
                        <article
                          className={`demo-result-item demo-evaluation-card demo-evaluation-${entry.status}`}
                          key={entry.caseId}
                        >
                          <h4>{entry.label ?? entry.caseId}</h4>
                          <p className="demo-result-source">{entry.query}</p>
                          <p className="demo-evaluation-status">
                            {entry.status.toUpperCase()}
                          </p>
                          <p className="demo-metadata">
                            {formatEvaluationCaseSummary(entry)}
                          </p>
                          <p className="demo-metadata">
                            expected: {formatEvaluationExpected(entry)}
                          </p>
                          <p className="demo-metadata">
                            retrieved: {formatEvaluationRetrieved(entry)}
                          </p>
                          <p className="demo-result-text">
                            missing: {formatEvaluationMissing(entry)}
                          </p>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="demo-results">
                <h3>Retrieval Quality Tooling</h3>
                <p className="demo-metadata">
                  This section now behaves like an evaluation dashboard instead
                  of a log dump. The summary cards answer who is winning, the
                  strategy tab shows why, the grounding tab keeps case
                  drill-downs collapsed until needed, and the history tab only
                  expands when you want regression detail.
                </p>
                <div className="demo-pill-row">
                  {(rag.evaluate.suites.length > 0
                    ? rag.evaluate.suites
                    : [evaluationSuite]
                  ).map((suite) => (
                    <span className="demo-pill" key={suite.id}>
                      {suite.label ?? suite.id} · {suite.input.cases.length}{" "}
                      cases
                    </span>
                  ))}
                </div>
                <div className="demo-actions">
                  <button
                    disabled={rag.evaluate.isEvaluating}
                    onClick={runSavedSuite}
                    type="button"
                  >
                    {rag.evaluate.isEvaluating
                      ? "Running saved suite..."
                      : "Run saved suite"}
                  </button>
                </div>
                <div className="demo-tab-row">
                  {(
                    ["overview", "strategies", "grounding", "history"] as const
                  ).map((view) => (
                    <button
                      key={view}
                      className={
                        qualityView === view
                          ? "demo-tab demo-tab-active"
                          : "demo-tab"
                      }
                      onClick={() => setQualityView(view)}
                      type="button"
                    >
                      {view[0].toUpperCase() + view.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="demo-stat-grid">
                  <article className="demo-stat-card">
                    <span className="demo-stat-label">Saved suite leader</span>
                    <strong>
                      {rag.evaluate.leaderboard[0]?.label ??
                        "Run the saved suite"}
                    </strong>
                    <p>
                      {rag.evaluate.leaderboard[0]
                        ? formatEvaluationLeaderboardEntry(
                            rag.evaluate.leaderboard[0],
                          )
                        : "The leaderboard will rank repeated workflow benchmark runs."}
                    </p>
                  </article>
                  <article className="demo-stat-card">
                    <span className="demo-stat-label">Retrieval winner</span>
                    <strong>
                      {qualityData
                        ? formatRetrievalComparisonOverviewPresentation(
                            qualityData.retrievalComparison,
                          ).winnerLabel
                        : "Loading comparison"}
                    </strong>
                    <p>
                      {qualityData
                        ? formatRetrievalComparisonOverviewPresentation(
                            qualityData.retrievalComparison,
                          ).summary
                        : "Running retrieval comparison..."}
                    </p>
                  </article>
                  <article className="demo-stat-card">
                    <span className="demo-stat-label">Reranker winner</span>
                    <strong>
                      {qualityData
                        ? formatRerankerComparisonOverviewPresentation(
                            qualityData.rerankerComparison,
                          ).winnerLabel
                        : "Loading comparison"}
                    </strong>
                    <p>
                      {qualityData
                        ? formatRerankerComparisonOverviewPresentation(
                            qualityData.rerankerComparison,
                          ).summary
                        : "Running reranker comparison..."}
                    </p>
                  </article>
                  <article className="demo-stat-card">
                    <span className="demo-stat-label">Grounding winner</span>
                    <strong>
                      {qualityData?.providerGroundingComparison
                        ? formatGroundingProviderOverviewPresentation(
                            qualityData.providerGroundingComparison,
                          ).winnerLabel
                        : "Stored workflow evaluation"}
                    </strong>
                    <p>
                      {qualityData?.providerGroundingComparison
                        ? formatGroundingProviderOverviewPresentation(
                            qualityData.providerGroundingComparison,
                          ).summary
                        : qualityData
                          ? formatGroundingEvaluationSummary(
                              qualityData.groundingEvaluation,
                            )
                          : "Loading grounding comparison..."}
                    </p>
                  </article>
                </div>
                {qualityData ? (
                  <>
                    {qualityView === "overview" && (
                      <div className="demo-result-grid">
                        <article className="demo-result-item">
                          <h4>Winners at a glance</h4>
                          <div className="demo-key-value-grid">
                            {formatQualityOverviewPresentation({
                              retrievalComparison:
                                qualityData.retrievalComparison,
                              rerankerComparison:
                                qualityData.rerankerComparison,
                              groundingEvaluation:
                                qualityData.groundingEvaluation,
                              groundingProviderOverview:
                                qualityData.providerGroundingComparison
                                  ? formatGroundingProviderOverviewPresentation(
                                      qualityData.providerGroundingComparison,
                                    )
                                  : undefined,
                            }).rows.map((row) => (
                              <div
                                className="demo-key-value-row"
                                key={`${row.label}:${row.value}`}
                              >
                                <span>{row.label}</span>
                                <strong>{row.value}</strong>
                              </div>
                            ))}
                          </div>
                        </article>
                        <article className="demo-result-item">
                          <h4>Why this matters</h4>
                          <div className="demo-insight-stack">
                            {formatQualityOverviewNotes().map((insight) => (
                              <p className="demo-insight-card" key={insight}>
                                {insight}
                              </p>
                            ))}
                          </div>
                        </article>
                      </div>
                    )}
                    {qualityView === "strategies" && (
                      <>
                        <div className="demo-result-grid">
                          {formatRetrievalComparisonPresentations(
                            qualityData.retrievalComparison,
                          ).map((card) => (
                            <article
                              className="demo-result-item demo-score-card"
                              key={card.id}
                            >
                              <h4>{card.label}</h4>
                              <p className="demo-score-headline">
                                {card.summary}
                              </p>
                              <div className="demo-key-value-grid demo-trace-summary-grid">
                                {card.traceSummaryRows.map((row) => (
                                  <div
                                    className="demo-key-value-row"
                                    key={`${card.id}-${row.label}`}
                                  >
                                    <span>{row.label}</span>
                                    <strong>{row.value}</strong>
                                  </div>
                                ))}
                              </div>
                              <details className="demo-collapsible demo-trace-diff">
                                <summary>
                                  <span>Trace diff vs leader</span>
                                  <strong>{card.diffLabel}</strong>
                                </summary>
                                <div className="demo-collapsible-content demo-trace-diff-grid">
                                  {card.diffRows.map((row) => (
                                    <div
                                      className="demo-key-value-row"
                                      key={`${card.id}-diff-${row.label}`}
                                    >
                                      <span>{row.label}</span>
                                      <strong>{row.value}</strong>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </article>
                          ))}
                        </div>
                        <div className="demo-result-grid">
                          {formatRerankerComparisonPresentations(
                            qualityData.rerankerComparison,
                          ).map((card) => (
                            <article
                              className="demo-result-item demo-score-card"
                              key={card.id}
                            >
                              <h4>{card.label}</h4>
                              <p className="demo-score-headline">
                                {card.summary}
                              </p>
                              <div className="demo-key-value-grid demo-trace-summary-grid">
                                {card.traceSummaryRows.map((row) => (
                                  <div
                                    className="demo-key-value-row"
                                    key={`${card.id}-${row.label}`}
                                  >
                                    <span>{row.label}</span>
                                    <strong>{row.value}</strong>
                                  </div>
                                ))}
                              </div>
                              <details className="demo-collapsible demo-trace-diff">
                                <summary>
                                  <span>Trace diff vs leader</span>
                                  <strong>{card.diffLabel}</strong>
                                </summary>
                                <div className="demo-collapsible-content demo-trace-diff-grid">
                                  {card.diffRows.map((row) => (
                                    <div
                                      className="demo-key-value-row"
                                      key={`${card.id}-diff-${row.label}`}
                                    >
                                      <span>{row.label}</span>
                                      <strong>{row.value}</strong>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </article>
                          ))}
                        </div>
                      </>
                    )}
                    {qualityView === "grounding" && (
                      <>
                        <div className="demo-result-grid">
                          {qualityData.groundingEvaluation.cases.map(
                            (entry) => (
                              <details
                                className="demo-result-item demo-collapsible"
                                key={`grounding-${entry.caseId}`}
                              >
                                <summary>
                                  <span>{entry.label ?? entry.caseId}</span>
                                  <strong>
                                    {formatGroundingEvaluationCase(entry)}
                                  </strong>
                                </summary>
                                <div className="demo-collapsible-content">
                                  {formatGroundingEvaluationDetails(entry).map(
                                    (line) => (
                                      <p
                                        className="demo-metadata"
                                        key={`${entry.caseId}-${line}`}
                                      >
                                        {line}
                                      </p>
                                    ),
                                  )}
                                </div>
                              </details>
                            ),
                          )}
                        </div>
                        {qualityData.providerGroundingComparison && (
                          <div className="demo-result-grid">
                            {formatGroundingProviderPresentations(
                              qualityData.providerGroundingComparison.entries,
                            ).map((card) => (
                              <article
                                className="demo-result-item demo-score-card"
                                key={`provider-grounding-${card.id}`}
                              >
                                <h4>{card.label}</h4>
                                <p className="demo-score-headline">
                                  {card.summary}
                                </p>
                              </article>
                            ))}
                            <article className="demo-result-item">
                              <h4>Hardest cases</h4>
                              <div className="demo-pill-row">
                                {qualityData.providerGroundingComparison.difficultyLeaderboard.map(
                                  (entry) => (
                                    <span
                                      className="demo-pill"
                                      key={`provider-grounding-difficulty-${entry.caseId}`}
                                    >
                                      {formatGroundingCaseDifficultyEntry(
                                        entry,
                                      )}
                                    </span>
                                  ),
                                )}
                              </div>
                            </article>
                          </div>
                        )}
                        {qualityData.providerGroundingComparison && (
                          <div className="demo-result-grid">
                            {formatGroundingProviderCasePresentations(
                              qualityData.providerGroundingComparison
                                .caseComparisons,
                            ).map((card) => (
                              <details
                                className="demo-result-item demo-collapsible"
                                key={`provider-grounding-case-${card.caseId}`}
                              >
                                <summary>
                                  <span>{card.label}</span>
                                  <strong>{card.summary}</strong>
                                </summary>
                                <div className="demo-collapsible-content">
                                  {card.rows.map((row) => (
                                    <div
                                      className="demo-key-value-row"
                                      key={`${card.caseId}-${row.label}`}
                                    >
                                      <span>{row.label}</span>
                                      <strong>{row.value}</strong>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {qualityView === "history" && (
                      <>
                        <div className="demo-result-grid">
                          {qualityData.retrievalComparison.entries.map(
                            (entry) => (
                              <details
                                className="demo-result-item demo-collapsible"
                                key={`retrieval-history-${entry.retrievalId}`}
                              >
                                <summary>
                                  <span>{entry.label} history</span>
                                  <strong>
                                    {formatEvaluationHistorySummary(
                                      qualityData.retrievalHistories[
                                        entry.retrievalId
                                      ],
                                    )[0] ?? "No runs yet"}
                                  </strong>
                                </summary>
                                <div className="demo-collapsible-content">
                                  {formatEvaluationHistoryRows(
                                    qualityData.retrievalHistories[
                                      entry.retrievalId
                                    ],
                                  ).map((row) => (
                                    <div
                                      className="demo-key-value-row"
                                      key={`${entry.retrievalId}-${row.label}`}
                                    >
                                      <span>{row.label}</span>
                                      <strong>{row.value}</strong>
                                    </div>
                                  ))}
                                  <div className="demo-result-grid">
                                    {formatEvaluationHistoryTracePresentations(
                                      qualityData.retrievalHistories[
                                        entry.retrievalId
                                      ],
                                    ).map((traceCase) => (
                                      <details
                                        className="demo-result-item demo-collapsible"
                                        key={`${entry.retrievalId}-trace-${traceCase.caseId}`}
                                      >
                                        <summary>
                                          <span>{traceCase.label}</span>
                                          <strong>{traceCase.summary}</strong>
                                        </summary>
                                        <div className="demo-collapsible-content">
                                          {traceCase.rows.map((row) => (
                                            <div
                                              className="demo-key-value-row"
                                              key={`${entry.retrievalId}-${traceCase.caseId}-${row.label}`}
                                            >
                                              <span>{row.label}</span>
                                              <strong>{row.value}</strong>
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    ))}
                                  </div>
                                </div>
                              </details>
                            ),
                          )}
                        </div>
                        <div className="demo-result-grid">
                          {qualityData.rerankerComparison.entries.map(
                            (entry) => (
                              <details
                                className="demo-result-item demo-collapsible"
                                key={`reranker-history-${entry.rerankerId}`}
                              >
                                <summary>
                                  <span>{entry.label} history</span>
                                  <strong>
                                    {formatEvaluationHistorySummary(
                                      qualityData.rerankerHistories[
                                        entry.rerankerId
                                      ],
                                    )[0] ?? "No runs yet"}
                                  </strong>
                                </summary>
                                <div className="demo-collapsible-content">
                                  {formatEvaluationHistoryRows(
                                    qualityData.rerankerHistories[
                                      entry.rerankerId
                                    ],
                                  ).map((row) => (
                                    <div
                                      className="demo-key-value-row"
                                      key={`${entry.rerankerId}-${row.label}`}
                                    >
                                      <span>{row.label}</span>
                                      <strong>{row.value}</strong>
                                    </div>
                                  ))}
                                  <div className="demo-result-grid">
                                    {formatEvaluationHistoryTracePresentations(
                                      qualityData.rerankerHistories[
                                        entry.rerankerId
                                      ],
                                    ).map((traceCase) => (
                                      <details
                                        className="demo-result-item demo-collapsible"
                                        key={`${entry.rerankerId}-trace-${traceCase.caseId}`}
                                      >
                                        <summary>
                                          <span>{traceCase.label}</span>
                                          <strong>{traceCase.summary}</strong>
                                        </summary>
                                        <div className="demo-collapsible-content">
                                          {traceCase.rows.map((row) => (
                                            <div
                                              className="demo-key-value-row"
                                              key={`${entry.rerankerId}-${traceCase.caseId}-${row.label}`}
                                            >
                                              <span>{row.label}</span>
                                              <strong>{row.value}</strong>
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    ))}
                                  </div>
                                </div>
                              </details>
                            ),
                          )}
                        </div>
                        {qualityData.providerGroundingComparison && (
                          <div className="demo-result-grid">
                            {qualityData.providerGroundingComparison.entries.map(
                              (entry) => (
                                <details
                                  className="demo-result-item demo-collapsible"
                                  key={`provider-grounding-history-${entry.providerKey}`}
                                >
                                  <summary>
                                    <span>{entry.label} history</span>
                                    <strong>
                                      {formatGroundingHistorySummary(
                                        qualityData.providerGroundingHistories[
                                          entry.providerKey
                                        ],
                                      )[0] ?? "No runs yet"}
                                    </strong>
                                  </summary>
                                  <div className="demo-collapsible-content">
                                    {[
                                      ...formatGroundingHistoryDetails(
                                        qualityData.providerGroundingHistories[
                                          entry.providerKey
                                        ],
                                      ),
                                    ].map((line) => (
                                      <p
                                        className="demo-metadata"
                                        key={`${entry.providerKey}-${line}`}
                                      >
                                        {line}
                                      </p>
                                    ))}
                                    <div className="demo-result-grid">
                                      {formatGroundingHistorySnapshotPresentations(
                                        qualityData.providerGroundingHistories[
                                          entry.providerKey
                                        ],
                                      ).map((snapshot) => (
                                        <details
                                          className="demo-result-item demo-collapsible"
                                          key={`${entry.providerKey}-snapshot-${snapshot.caseId}`}
                                        >
                                          <summary>
                                            <span>{snapshot.label}</span>
                                            <strong>{snapshot.summary}</strong>
                                          </summary>
                                          <div className="demo-collapsible-content">
                                            {snapshot.rows.map((row) => (
                                              <div
                                                className="demo-key-value-row"
                                                key={`${entry.providerKey}-${snapshot.caseId}-${row.label}`}
                                              >
                                                <span>{row.label}</span>
                                                <strong>{row.value}</strong>
                                              </div>
                                            ))}
                                          </div>
                                        </details>
                                      ))}
                                    </div>
                                  </div>
                                </details>
                              ),
                            )}
                            <details className="demo-result-item demo-collapsible">
                              <summary>
                                <span>Grounding difficulty history</span>
                                <strong>
                                  {formatGroundingDifficultyHistorySummary(
                                    qualityData.providerGroundingDifficultyHistory,
                                  )[0] ?? "No history yet"}
                                </strong>
                              </summary>
                              <div className="demo-collapsible-content">
                                {formatGroundingDifficultyHistoryDetails(
                                  qualityData.providerGroundingDifficultyHistory,
                                ).map((line) => (
                                  <p
                                    className="demo-metadata"
                                    key={`provider-grounding-difficulty-history-${line}`}
                                  >
                                    {line}
                                  </p>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <p className="demo-metadata">Loading quality dashboard…</p>
                )}
              </div>

              <div className="demo-results demo-quality-card">
                <h3>Knowledge Base Operations</h3>
                {rag.ops.error && <p className="demo-error">{rag.ops.error}</p>}
                <div className="demo-stat-grid">
                  <article className="demo-stat-card">
                    <span className="demo-stat-label">Provider</span>
                    <strong>
                      {rag.ops.readiness?.providerConfigured
                        ? (rag.ops.readiness?.providerName ??
                          "Runtime provider routing")
                        : "Not configured"}
                    </strong>
                    <p>
                      {rag.ops.readiness?.providerConfigured
                        ? rag.ops.readiness?.model
                          ? `Requests route through ${rag.ops.readiness?.providerName ?? "the runtime provider registry"} with default model ${rag.ops.readiness.model}.`
                          : `Requests route through ${rag.ops.readiness?.providerName ?? "the runtime provider registry"}.`
                        : "Provider-backed retrieval is not configured yet."}
                    </p>
                  </article>
                  <article className="demo-stat-card">
                    <span className="demo-stat-label">Embeddings</span>
                    <strong>
                      {rag.ops.readiness?.embeddingConfigured
                        ? rag.ops.readiness?.embeddingModel ===
                          "collection-managed embeddings"
                          ? "Collection-managed"
                          : "Configured"
                        : "Missing"}
                    </strong>
                    <p>
                      {rag.ops.readiness?.embeddingConfigured
                        ? rag.ops.readiness?.embeddingModel ===
                          "collection-managed embeddings"
                          ? "Embeddings come from the collection and vector store layer, so retrieval stays vector-backed without a separate top-level embedding provider."
                          : (rag.ops.readiness?.embeddingModel ??
                            "Embedding model configured.")
                        : "Embeddings are not configured yet."}
                    </p>
                  </article>
                  <article className="demo-stat-card">
                    <span className="demo-stat-label">Retrieval Stack</span>
                    <strong>
                      {rag.ops.readiness?.rerankerConfigured
                        ? "Reranker ready"
                        : "Vector only"}
                    </strong>
                    <p>
                      {rag.ops.readiness?.indexManagerConfigured
                        ? "Index manager configured."
                        : "Index manager not configured."}
                    </p>
                  </article>
                  <article className="demo-stat-card">
                    <span className="demo-stat-label">Extractors</span>
                    <strong>
                      {rag.ops.readiness?.extractorsConfigured
                        ? `${rag.ops.readiness.extractorNames.length} configured`
                        : "None configured"}
                    </strong>
                    <div className="demo-pill-row">
                      {(rag.ops.readiness?.extractorNames.length
                        ? rag.ops.readiness.extractorNames
                        : ["No extractors configured"]
                      ).map((name) => (
                        <span className="demo-pill" key={name}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </article>
                </div>
                <div className="demo-ops-metric-grid">
                  <article className="demo-result-item demo-score-card">
                    <h4>Corpus coverage</h4>
                    <p className="demo-score-headline">
                      {rag.ops.health
                        ? `Formats: ${Object.entries(
                            rag.ops.health.coverageByFormat,
                          )
                            .map(([key, value]) => `${key} ${value}`)
                            .join(" · ")}`
                        : "Waiting for corpus health..."}
                    </p>
                    <p className="demo-metadata">
                      {rag.ops.health
                        ? `Kinds: ${Object.entries(
                            rag.ops.health.coverageByKind,
                          )
                            .map(([key, value]) => `${key} ${value}`)
                            .join(" · ")}`
                        : ""}
                    </p>
                  </article>
                  <article className="demo-result-item demo-score-card">
                    <h4>Chunk quality</h4>
                    <p className="demo-score-headline">
                      {rag.ops.health
                        ? `${rag.ops.health.averageChunksPerDocument.toFixed(2)} avg chunks/doc`
                        : "Waiting for corpus health..."}
                    </p>
                    <p className="demo-metadata">
                      {rag.ops.health
                        ? `Empty docs ${rag.ops.health.emptyDocuments} · empty chunks ${rag.ops.health.emptyChunks} · low signal ${rag.ops.health.lowSignalChunks}`
                        : ""}
                    </p>
                  </article>
                  <article className="demo-result-item demo-score-card">
                    <h4>Freshness</h4>
                    <p className="demo-score-headline">
                      {rag.ops.health
                        ? `${rag.ops.health.staleDocuments.length} stale docs`
                        : "Waiting for corpus health..."}
                    </p>
                    <p className="demo-metadata">
                      {rag.ops.health
                        ? `Oldest ${formatHealthSummary(rag.ops.health)[7]?.replace("Document age window: oldest ", "") ?? ""}`
                        : ""}
                    </p>
                  </article>
                  <article className="demo-result-item demo-score-card">
                    <h4>Failures</h4>
                    <p className="demo-score-headline">
                      {rag.ops.health
                        ? `${rag.ops.health.failedIngestJobs} ingest · ${rag.ops.health.failedAdminJobs} admin`
                        : "Waiting for corpus health..."}
                    </p>
                    <p className="demo-metadata">
                      {rag.ops.health
                        ? `Duplicate sources ${rag.ops.health.duplicateSourceGroups.length} · duplicate ids ${rag.ops.health.duplicateDocumentIdGroups.length}`
                        : ""}
                    </p>
                  </article>
                </div>
                <div className="demo-result-grid">
                  <article className="demo-result-item">
                    <h4>Linked Connectors For This Account</h4>
                    <p className="demo-metadata">
                      These bindings are resolved from the signed-in AbsoluteJS
                      account. Gmail and Google Contacts sync will read from the
                      bindings shown here.
                    </p>
                    {linkedConnectorAccounts.length > 0 ? (
                      <div className="demo-stat-grid">
                        {linkedConnectorAccounts.map((account) => (
                          <article
                            className="demo-stat-card"
                            key={account.sourceId}
                          >
                            <span className="demo-stat-label">
                              {account.providerLabel}
                            </span>
                            <strong>
                              {account.accountLabel ??
                                account.email ??
                                "No linked account resolved"}
                            </strong>
                            <p>
                              {account.providerFound
                                ? `Using ${account.bindingLabel ?? account.bindingId ?? "the resolved binding"} for ${account.sourceLabel}.`
                                : (account.providerError ??
                                  `No ${account.providerLabel} binding is resolved for ${account.sourceLabel}.`)}
                            </p>
                            <div className="demo-key-value-list">
                              <div className="demo-key-value-row">
                                <span>Source</span>
                                <strong>{account.sourceLabel}</strong>
                              </div>
                              <div className="demo-key-value-row">
                                <span>Binding</span>
                                <strong>
                                  {account.bindingLabel ??
                                    account.bindingId ??
                                    "auto-select first binding"}
                                </strong>
                              </div>
                              <div className="demo-key-value-row">
                                <span>Binding status</span>
                                <strong>
                                  {account.bindingStatus ?? "missing"}
                                </strong>
                              </div>
                              <div className="demo-key-value-row">
                                <span>Grant status</span>
                                <strong>
                                  {account.grantStatus ?? "missing"}
                                </strong>
                              </div>
                              <div className="demo-key-value-row">
                                <span>Selection mode</span>
                                <strong>
                                  {account.selectionMode ?? "unconfigured"}
                                </strong>
                              </div>
                              <div className="demo-key-value-row">
                                <span>Available bindings</span>
                                <strong>
                                  {typeof account.availableBindingCount ===
                                  "number"
                                    ? String(account.availableBindingCount)
                                    : "0"}
                                </strong>
                              </div>
                              {account.scopeSummary && (
                                <div className="demo-key-value-row">
                                  <span>Scopes</span>
                                  <strong>{account.scopeSummary}</strong>
                                </div>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="demo-metadata">
                        No linked connector sources are active for the current
                        backend.
                      </p>
                    )}
                  </article>
                  <article className="demo-result-item">
                    <h4>Sync Sources</h4>
                    <p className="demo-metadata">
                      The default view now shows source health and actions
                      first. Full protocol and run history stay inside each
                      source card instead of flooding the page.
                    </p>
                    <div className="demo-actions">
                      <button
                        disabled={syncPending !== null}
                        onClick={syncAllSources}
                        type="button"
                      >
                        {syncPending?.scope === "all" && !syncPending.background
                          ? "Syncing..."
                          : "Sync all sources"}
                      </button>
                      <button
                        disabled={syncPending !== null}
                        onClick={queueBackgroundSync}
                        type="button"
                      >
                        {syncPending?.scope === "all" && syncPending.background
                          ? "Queueing..."
                          : "Queue background sync"}
                      </button>
                    </div>
                    <div className="demo-stat-grid">
                      {formatSyncSourceOverview(sortedSyncSources).map(
                        (line) => (
                          <article
                            className="demo-stat-card"
                            key={`sync-overview-${line}`}
                          >
                            <span className="demo-stat-label">
                              Sync overview
                            </span>
                            <strong>
                              {line.includes(":")
                                ? line.slice(0, line.indexOf(":"))
                                : "Sync overview"}
                            </strong>
                            <p>
                              {line.includes(":")
                                ? line.slice(line.indexOf(":") + 1).trim()
                                : line}
                            </p>
                          </article>
                        ),
                      )}
                    </div>
                    <div className="demo-badge-row">
                      {formatSyncDeltaChips(sortedSyncSources).map((chip) => (
                        <span className="demo-state-chip" key={chip}>
                          {chip.replace(/^sync /, "")}
                        </span>
                      ))}
                    </div>
                    <div className="demo-sync-source-grid">
                      {sortedSyncSources.length > 0 ? (
                        sortedSyncSources.map((source) => (
                          <details
                            className={
                              source.status === "failed"
                                ? "demo-sync-source-card demo-sync-source-card-failed"
                                : "demo-sync-source-card"
                            }
                            key={source.id}
                            open={source.status === "failed"}
                          >
                            <summary>
                              <div className="demo-sync-source-header">
                                <div>
                                  <h5>{source.label}</h5>
                                  <p className="demo-metadata">
                                    {source.target ??
                                      source.description ??
                                      "No target configured."}
                                  </p>
                                </div>
                                <div className="demo-badge-row">
                                  <span className="demo-badge">
                                    {source.kind}
                                  </span>
                                  <span className="demo-badge">
                                    {source.status.toUpperCase()}
                                  </span>
                                  {typeof source.documentCount === "number" && (
                                    <span className="demo-badge">
                                      {source.documentCount} docs
                                    </span>
                                  )}
                                  {typeof source.chunkCount === "number" && (
                                    <span className="demo-badge">
                                      {source.chunkCount} chunks
                                    </span>
                                  )}
                                </div>
                              </div>
                            </summary>
                            <div className="demo-collapsible-content">
                              <div className="demo-actions">
                                <button
                                  disabled={syncPending !== null}
                                  onClick={() => void syncSource(source.id)}
                                  type="button"
                                >
                                  {syncPending?.scope === "source" &&
                                  syncPending.sourceId === source.id &&
                                  !syncPending.background
                                    ? "Syncing..."
                                    : "Sync now"}
                                </button>
                                <button
                                  disabled={syncPending !== null}
                                  onClick={() =>
                                    void queueBackgroundSourceSync(source.id)
                                  }
                                  type="button"
                                >
                                  {syncPending?.scope === "source" &&
                                  syncPending.sourceId === source.id &&
                                  syncPending.background
                                    ? "Queueing..."
                                    : "Queue in background"}
                                </button>
                              </div>
                              <p className="demo-metadata demo-sync-action-meta">
                                {formatSyncSourceActionSummary(source)}
                              </p>
                              {formatSyncSourceActionBadges(source).length >
                                0 && (
                                <div className="demo-badge-row">
                                  {formatSyncSourceActionBadges(source).map(
                                    (badge) => (
                                      <span
                                        className="demo-badge"
                                        key={`${source.id}-${badge}`}
                                      >
                                        {badge}
                                      </span>
                                    ),
                                  )}
                                </div>
                              )}
                              <div className="demo-key-value-grid">
                                {source.description && (
                                  <div className="demo-key-value-row">
                                    <span>Purpose</span>
                                    <strong>{source.description}</strong>
                                  </div>
                                )}
                                {source.target && (
                                  <div className="demo-key-value-row">
                                    <span>Target</span>
                                    <strong>{source.target}</strong>
                                  </div>
                                )}
                                {typeof source.metadata?.provider ===
                                  "string" && (
                                  <div className="demo-key-value-row">
                                    <span>Provider</span>
                                    <strong>{source.metadata.provider}</strong>
                                  </div>
                                )}
                                {typeof source.metadata?.accountMode ===
                                  "string" && (
                                  <div className="demo-key-value-row">
                                    <span>Account mode</span>
                                    <strong>
                                      {source.metadata.accountMode}
                                    </strong>
                                  </div>
                                )}
                                {typeof source.metadata?.schedule ===
                                  "string" && (
                                  <div className="demo-key-value-row">
                                    <span>Schedule</span>
                                    <strong>{source.metadata.schedule}</strong>
                                  </div>
                                )}
                                {typeof source.lastSuccessfulSyncAt ===
                                  "number" && (
                                  <div className="demo-key-value-row">
                                    <span>Last success</span>
                                    <strong>
                                      {formatSyncSourceDetails(source)
                                        .find((line) =>
                                          line.startsWith(
                                            "last successful sync:",
                                          ),
                                        )
                                        ?.replace(
                                          "last successful sync: ",
                                          "",
                                        ) ?? ""}
                                    </strong>
                                  </div>
                                )}
                                {source.lastError && (
                                  <div className="demo-key-value-row">
                                    <span>Last error</span>
                                    <strong>{source.lastError}</strong>
                                  </div>
                                )}
                              </div>
                              {Array.isArray(source.metadata?.recentRuns) &&
                                (
                                  source.metadata.recentRuns as Array<
                                    Record<string, unknown>
                                  >
                                ).length > 0 && (
                                  <div>
                                    <p className="demo-section-caption">
                                      Recent runs
                                    </p>
                                    <div className="demo-pill-row">
                                      {formatSyncSourceDetails(source)
                                        .filter((line) =>
                                          line.startsWith("recent run"),
                                        )
                                        .map((line) => (
                                          <span
                                            className="demo-pill"
                                            key={`${source.id}-${line}`}
                                          >
                                            {line}
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </details>
                        ))
                      ) : (
                        <p className="demo-metadata">
                          No sync sources configured yet.
                        </p>
                      )}
                    </div>
                  </article>
                  <article className="demo-result-item">
                    <h4>Admin Timeline</h4>
                    <div className="demo-insight-stack">
                      <div className="demo-insight-card">
                        <span className="demo-stat-label">Recent jobs</span>
                        <div className="demo-pill-row">
                          {(formatAdminJobList(rag.ops.adminJobs).length > 0
                            ? formatAdminJobList(rag.ops.adminJobs)
                            : ["No admin jobs recorded yet."]
                          ).map((line) => (
                            <span className="demo-pill" key={line}>
                              {line}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="demo-insight-card">
                        <span className="demo-stat-label">Recent actions</span>
                        <div className="demo-pill-row">
                          {(formatAdminActionList(rag.ops.adminActions).length >
                          0
                            ? formatAdminActionList(rag.ops.adminActions)
                            : ["No admin actions recorded yet."]
                          ).map((line) => (
                            <span className="demo-pill" key={line}>
                              {line}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="demo-insight-card">
                        <span className="demo-stat-label">
                          Failure breakdown
                        </span>
                        {[
                          ...formatFailureSummary(rag.ops.health),
                          ...formatInspectionSummary(rag.ops.health),
                          ...formatInspectionSamples(rag.ops.health),
                        ].map((line) => (
                          <p className="demo-metadata" key={line}>
                            {line}
                          </p>
                        ))}
                        {buildInspectionEntries(rag.ops.health).length > 0 && (
                          <div className="demo-inspection-actions">
                            {buildInspectionEntries(rag.ops.health).map(
                              (entry) => (
                                <div
                                  className="demo-inspection-action-row"
                                  key={entry.id}
                                >
                                  <button
                                    onClick={() =>
                                      void focusInspectionEntry(entry)
                                    }
                                    type="button"
                                  >
                                    {entry.documentId
                                      ? `Inspect ${entry.kind}`
                                      : "Search source"}{" "}
                                    · {entry.label}
                                  </button>
                                  <a
                                    className="demo-inspection-link"
                                    href={buildInspectionEntryHref(
                                      selectedMode,
                                      entry,
                                    )}
                                  >
                                    Open standalone view
                                  </a>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                </div>
              </div>

              <div className="demo-stream-panel">
                <h3>Stream Retrieval Workflow</h3>
                <p className="demo-metadata">
                  This page composes <code>useRAG()</code> for the broader demo,
                  and this stream section proves the explicit workflow contract
                  through <code>useRAG().workflow</code>.
                </p>
                <form className="demo-stream-form" onSubmit={submitStreamQuery}>
                  <label htmlFor="stream-model-key">Answer model</label>
                  <select
                    id="stream-model-key"
                    onChange={(evt) => setSelectedAIModelKey(evt.target.value)}
                    value={selectedAIModelKey}
                  >
                    {aiModelCatalog.models.length === 0 ? (
                      <option value="">Configure an AI provider</option>
                    ) : (
                      aiModelCatalog.models.map((model) => (
                        <option key={model.key} value={model.key}>
                          {formatDemoAIModelLabel(model)}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="demo-metadata">
                    Model switching stays on the official AbsoluteJS plugin path
                    by selecting the provider and model sent with the retrieval
                    stream request.
                  </p>
                  <label htmlFor="stream-query">Question</label>
                  <input
                    id="stream-query"
                    onChange={(evt) => setStreamPrompt(evt.target.value)}
                    placeholder="e.g. What should I verify after ingesting a new source?"
                    type="text"
                    value={streamPrompt}
                  />
                  <div className="demo-actions">
                    {streamBusy ? (
                      <button onClick={workflow.cancel} type="button">
                        Cancel
                      </button>
                    ) : (
                      <button type="submit">Ask with retrieval stream</button>
                    )}
                  </div>
                </form>
                <div className="demo-result-grid">
                  <article className="demo-result-item">
                    <h4>Workflow Contract</h4>
                    <ul className="demo-detail-list">
                      <li>Explicit workflow surface: useRAG().workflow</li>
                      <li>Snapshot stage: {workflowState.stage}</li>
                      <li>Live stage field: {workflow.stage}</li>
                      <li>Snapshot sources: {workflowState.sources.length}</li>
                      <li>
                        Snapshot running:{" "}
                        {workflowState.isRunning ? "yes" : "no"}
                      </li>
                    </ul>
                  </article>
                  <article className="demo-result-item">
                    <h4>Workflow Proof</h4>
                    <ul className="demo-detail-list">
                      <li>
                        Retrieved: {workflowState.hasRetrieved ? "yes" : "no"}
                      </li>
                      <li>
                        Has sources: {workflowState.hasSources ? "yes" : "no"}
                      </li>
                      <li>Citation count: {workflow.citations.length}</li>
                      <li>
                        Grounding coverage: {streamGroundedAnswer.coverage}
                      </li>
                    </ul>
                  </article>
                </div>
                <div className="demo-stage-row">
                  {streamStages.map((stage) => {
                    const currentStage = workflow.stage;
                    const isCurrent = currentStage === stage;
                    const isComplete =
                      currentStage === "complete"
                        ? stage === "complete" ||
                          streamStages.indexOf(stage) <
                            streamStages.indexOf(
                              currentStage as (typeof streamStages)[number],
                            )
                        : streamStages.indexOf(stage) <
                          streamStages.indexOf(
                            currentStage as (typeof streamStages)[number],
                          );

                    return (
                      <span
                        className={[
                          "demo-stage-pill",
                          isCurrent ? "current" : "",
                          isComplete ? "complete" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        key={stage}
                      >
                        {stage}
                      </span>
                    );
                  })}
                </div>
                {streamRetrieval && (
                  <dl className="demo-stream-stats">
                    <div>
                      <dt>Retrieval started</dt>
                      <dd>
                        {streamRetrieval.retrievalStartedAt
                          ? formatDate(streamRetrieval.retrievalStartedAt)
                          : "n/a"}
                      </dd>
                    </div>
                    <div>
                      <dt>Retrieval duration</dt>
                      <dd>{streamRetrieval.retrievalDurationMs ?? 0}ms</dd>
                    </div>
                    <div>
                      <dt>Retrieved sources</dt>
                      <dd>{streamRetrieval.sources.length}</dd>
                    </div>
                    <div>
                      <dt>Current stage</dt>
                      <dd>{workflow.stage}</dd>
                    </div>
                  </dl>
                )}
                {streamRetrieval?.trace && (
                  <div className="demo-results">
                    <h4>Workflow Retrieval Trace</h4>
                    <p className="demo-metadata">
                      This is the retrieval trace attached to the workflow
                      answer path. It explains how the answer workflow found
                      evidence before grounding and citations were built.
                    </p>
                    <div className="demo-stat-grid">
                      {buildTracePresentation(streamRetrieval.trace).stats.map(
                        (row) => (
                          <article
                            className="demo-stat-card"
                            key={`workflow-trace-stat-${row.label}`}
                          >
                            <p className="demo-section-caption">{row.label}</p>
                            <strong>{row.value}</strong>
                          </article>
                        ),
                      )}
                    </div>
                    <div className="demo-key-value-list">
                      {buildTracePresentation(
                        streamRetrieval.trace,
                      ).details.map((row) => (
                        <p
                          className="demo-key-value-row"
                          key={`workflow-trace-detail-${row.label}`}
                        >
                          <strong>{row.label}</strong>
                          <span>{row.value}</span>
                        </p>
                      ))}
                    </div>
                    <div className="demo-result-grid">
                      {buildTracePresentation(streamRetrieval.trace).steps.map(
                        (step, index) => (
                          <details
                            className="demo-collapsible demo-result-item"
                            key={`workflow-trace-${step.stage}-${index}`}
                            open={index === 0}
                          >
                            <summary>
                              <strong>
                                {index + 1}. {step.label}
                              </strong>
                            </summary>
                            <div className="demo-key-value-list">
                              {step.rows.map((row) => (
                                <p
                                  className="demo-key-value-row"
                                  key={`${step.stage}-${row.label}`}
                                >
                                  <strong>{row.label}</strong>
                                  <span>{row.value}</span>
                                </p>
                              ))}
                            </div>
                          </details>
                        ),
                      )}
                    </div>
                  </div>
                )}
                {workflow.error && (
                  <p className="demo-error">{workflow.error}</p>
                )}
                {streamLatestMessage?.thinking && (
                  <div className="demo-stream-block">
                    <h4>Thinking</h4>
                    <p className="demo-result-text">
                      {streamLatestMessage.thinking}
                    </p>
                  </div>
                )}
                {streamLatestMessage?.content && (
                  <div className="demo-stream-block">
                    <h4>Answer</h4>
                    <p className="demo-result-text">
                      {streamLatestMessage.content}
                    </p>
                  </div>
                )}
                {streamLatestMessage?.content && (
                  <div className="demo-results">
                    <h4>Answer Grounding</h4>
                    <p
                      className={[
                        "demo-grounding-badge",
                        `demo-grounding-${streamGroundedAnswer.coverage}`,
                      ].join(" ")}
                    >
                      {formatGroundingCoverage(streamGroundedAnswer.coverage)}
                    </p>
                    <ul className="demo-detail-list">
                      {formatGroundingSummary(streamGroundedAnswer).map(
                        (line) => (
                          <li key={line}>{line}</li>
                        ),
                      )}
                    </ul>
                    {streamGroundedAnswer.parts.some(
                      (part) => part.type === "citation",
                    ) && (
                      <div className="demo-result-grid">
                        {streamGroundedAnswer.parts.map((part, index) =>
                          part.type === "citation" ? (
                            <article
                              className="demo-result-item demo-grounding-card"
                              key={`${formatGroundedAnswerPartExcerpt(part)}-${index}`}
                            >
                              <p className="demo-citation-badge">
                                {formatGroundingPartReferences(
                                  part.referenceNumbers,
                                )}
                              </p>
                              {formatGroundedAnswerPartDetails(part).map(
                                (line) => (
                                  <p className="demo-metadata" key={line}>
                                    {line}
                                  </p>
                                ),
                              )}
                              <p className="demo-result-text">
                                {formatGroundedAnswerPartExcerpt(part)}
                              </p>
                            </article>
                          ) : null,
                        )}
                      </div>
                    )}
                  </div>
                )}
                {streamGroundedAnswer.sectionSummaries.length > 0 && (
                  <div className="demo-results">
                    <h4>Grounding by Section</h4>
                    <div className="demo-result-grid">
                      {streamGroundedAnswer.sectionSummaries.map((summary) => (
                        <article
                          className="demo-result-item demo-grounding-card"
                          key={summary.key}
                        >
                          <h3>{summary.label}</h3>
                          <p className="demo-result-source">
                            {summary.summary}
                          </p>
                          {formatGroundedAnswerSectionSummaryDetails(
                            summary,
                          ).map((line) => (
                            <p className="demo-metadata" key={line}>
                              {line}
                            </p>
                          ))}
                          <p className="demo-result-text">
                            {formatGroundedAnswerSectionSummaryExcerpt(summary)}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
                {streamGroundingReferences.length > 0 && (
                  <div className="demo-results">
                    <h4>Grounding Reference Map</h4>
                    <p className="demo-metadata">
                      Each reference resolves answer citations back to concrete
                      evidence with page, sheet, slide, archive, or thread
                      context when available.
                    </p>
                    <div className="demo-result-grid">
                      {groundingReferenceGroups.map((group) => (
                        <article
                          className="demo-result-item"
                          id={group.targetId}
                          key={group.id}
                        >
                          <h3>{group.label}</h3>
                          <p className="demo-result-source">{group.summary}</p>
                          <div className="demo-result-grid">
                            {group.references.map((reference) => (
                              <article
                                className="demo-result-item demo-grounding-card"
                                key={reference.chunkId}
                              >
                                <p className="demo-citation-badge">
                                  [{reference.number}]{" "}
                                  {formatGroundingReferenceLabel(reference)}
                                </p>
                                <p className="demo-result-score">
                                  {formatGroundingReferenceSummary(reference)}
                                </p>
                                {formatGroundingReferenceDetails(reference).map(
                                  (line) => (
                                    <p className="demo-metadata" key={line}>
                                      {line}
                                    </p>
                                  ),
                                )}
                                <p className="demo-result-text">
                                  {formatGroundingReferenceExcerpt(reference)}
                                </p>
                              </article>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
                {workflow.sourceSummaries.length > 0 && (
                  <div className="demo-results">
                    <h4>Evidence Sources</h4>
                    <div className="demo-result-grid">
                      {sourceSummaryGroups.map((group) => (
                        <article
                          className="demo-result-item"
                          id={group.targetId}
                          key={group.id}
                        >
                          <h3>{group.label}</h3>
                          <p className="demo-result-source">{group.summary}</p>
                          <div className="demo-result-grid">
                            {group.summaries.map((summary) => (
                              <article
                                className="demo-result-item"
                                key={summary.key}
                              >
                                <h4>{summary.label}</h4>
                                {formatSourceSummaryDetails(summary).map(
                                  (line) => (
                                    <p className="demo-metadata" key={line}>
                                      {line}
                                    </p>
                                  ),
                                )}
                                <p className="demo-result-text">
                                  {summary.excerpt}
                                </p>
                              </article>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
                {workflow.citations.length > 0 && (
                  <div className="demo-results">
                    <h4>Citation Trail</h4>
                    <p className="demo-metadata">
                      Each citation maps a concrete retrieved chunk to a stable
                      reference number you can carry into the answer UI.
                    </p>
                    <div className="demo-result-grid">
                      {citationGroups.map((group) => (
                        <article
                          className="demo-result-item"
                          id={group.targetId}
                          key={group.id}
                        >
                          <h3>{group.label}</h3>
                          <p className="demo-result-source">{group.summary}</p>
                          <div className="demo-result-grid">
                            {group.citations.map((citation, index) => (
                              <article
                                className="demo-result-item demo-citation-card"
                                key={`${citation.chunkId}-${index}`}
                              >
                                <p className="demo-citation-badge">
                                  [{index + 1}] {formatCitationLabel(citation)}
                                </p>
                                <p className="demo-result-score">
                                  {formatCitationSummary(citation)}
                                </p>
                                {formatCitationDetails(citation).map((line) => (
                                  <p className="demo-metadata" key={line}>
                                    {line}
                                  </p>
                                ))}
                                <p className="demo-result-text">
                                  {formatCitationExcerpt(citation)}
                                </p>
                              </article>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>
          )}
        </section>
      )}

      {showIngestLane && (
        <section className="demo-grid">
          <article className="demo-card">
            <h2>Ingest Document</h2>
            <p className="demo-metadata">
              Add a document, choose its source format and chunking strategy,
              then search for it using the RAG hook-powered retrieval form
              above.
            </p>
            <div className="demo-results">
              <h3>Upload Extracted Fixtures</h3>
              <p className="demo-metadata">
                These buttons use <code>useRAG().ingest.ingestUploads</code>{" "}
                directly. Each fixture is fetched from the local demo corpus,
                sent through the published upload ingest route, and then
                verified with a retrieval query against the uploaded source
                path.
              </p>
              <p className="demo-metadata">
                Upload fixtures validate the extractor pipeline immediately. The
                managed document list below stays focused on authored example
                documents, while uploaded binaries are verified through
                retrieval.
              </p>
              <div className="demo-preset-grid">
                {demoUploadPresets.map((preset) => (
                  <button
                    disabled={rag.ingest.isIngesting}
                    key={preset.id}
                    onClick={() => void ingestDemoUpload(preset)}
                    title={preset.description}
                    type="button"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="demo-upload-row">
                <input
                  accept={SUPPORTED_FILE_TYPE_OPTIONS.slice(1)
                    .map((entry) => entry[0])
                    .join(",")}
                  onChange={(evt) =>
                    setSelectedUploadFile(evt.target.files?.[0] ?? null)
                  }
                  type="file"
                />
                <button
                  disabled={
                    rag.ingest.isIngesting || selectedUploadFile === null
                  }
                  onClick={() => void uploadSelectedFile()}
                  type="button"
                >
                  Upload file
                </button>
              </div>
              {selectedUploadFile && (
                <p className="demo-metadata">
                  Selected file: {selectedUploadFile.name}
                </p>
              )}
              {uploadError && <p className="demo-error">{uploadError}</p>}
            </div>
            <form className="demo-add-form" onSubmit={submitAddDocument}>
              <label htmlFor="doc-id">Document ID (optional)</label>
              <input
                id="doc-id"
                name="id"
                onChange={onAddFieldChange}
                placeholder="auto-generated if blank"
                type="text"
                value={addForm.id}
              />
              <label htmlFor="doc-title">Title</label>
              <input
                id="doc-title"
                name="title"
                onChange={onAddFieldChange}
                required
                type="text"
                value={addForm.title}
              />
              <label htmlFor="doc-source">Source</label>
              <input
                id="doc-source"
                name="source"
                onChange={onAddFieldChange}
                placeholder="e.g. custom/launch-notes.md"
                type="text"
                value={addForm.source}
              />
              <label htmlFor="doc-format">Source format</label>
              <select
                id="doc-format"
                name="format"
                onChange={onAddFieldChange}
                value={addForm.format}
              >
                {demoContentFormats.map((format) => (
                  <option key={format} value={format}>
                    {formatContentFormat(format)}
                  </option>
                ))}
              </select>
              <label htmlFor="doc-chunk-strategy">Chunking strategy</label>
              <select
                id="doc-chunk-strategy"
                name="chunkStrategy"
                onChange={onAddFieldChange}
                value={addForm.chunkStrategy}
              >
                {demoChunkingStrategies.map((strategy) => (
                  <option key={strategy} value={strategy}>
                    {formatChunkStrategy(strategy)}
                  </option>
                ))}
              </select>
              <label htmlFor="doc-text">Body</label>
              <textarea
                id="doc-text"
                name="text"
                onChange={onAddFieldChange}
                required
                rows={8}
                value={addForm.text}
              />
              <button type="submit">Index document</button>
            </form>
            {addError && <p className="demo-error">{addError}</p>}
          </article>

          <article className="demo-card">
            <h2>Indexed Sources</h2>
            <div className="demo-stat-grid">
              <article className="demo-stat-card">
                <span className="demo-stat-label">Indexed documents</span>
                <strong>{filteredDocuments.length}</strong>
                <p>
                  {
                    filteredDocuments.filter(
                      (document) => document.kind === "seed",
                    ).length
                  }{" "}
                  seed ·{" "}
                  {
                    filteredDocuments.filter(
                      (document) => document.kind === "custom",
                    ).length
                  }{" "}
                  custom
                </p>
              </article>
            </div>
            <div className="demo-source-filter-row">
              <input
                onChange={(evt) => {
                  setDocumentSearchTerm(evt.target.value);
                  setDocumentPage(1);
                }}
                placeholder="Search indexed sources by title, source, or text"
                type="text"
                value={documentSearchTerm}
              />
              <select
                onChange={(evt) => {
                  setDocumentTypeFilter(evt.target.value);
                  setDocumentPage(1);
                }}
                value={documentTypeFilter}
              >
                {SUPPORTED_FILE_TYPE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="demo-pagination-row">
              <p className="demo-metadata">
                Showing {paginatedDocuments.length} of{" "}
                {filteredDocuments.length} matching documents
              </p>
              <div className="demo-pagination-controls">
                <button
                  disabled={documentPage <= 1}
                  onClick={() =>
                    setDocumentPage((page) => Math.max(1, page - 1))
                  }
                  type="button"
                >
                  Prev
                </button>
                {Array.from(
                  { length: totalDocumentPages },
                  (_, index) => index + 1,
                ).map((pageNumber) => (
                  <button
                    className={
                      pageNumber === documentPage
                        ? "demo-page-button demo-page-button-active"
                        : "demo-page-button"
                    }
                    key={pageNumber}
                    onClick={() => setDocumentPage(pageNumber)}
                    type="button"
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  disabled={documentPage >= totalDocumentPages}
                  onClick={() =>
                    setDocumentPage((page) =>
                      Math.min(totalDocumentPages, page + 1),
                    )
                  }
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
            <div className="demo-document-list" id="document-list">
              {paginatedDocuments.length > 0 ? (
                paginatedDocuments.map((document) => (
                  <details
                    className="demo-document-item demo-document-collapsible"
                    key={document.id}
                  >
                    <summary>
                      <div className="demo-document-header">
                        <div>
                          <h3>{document.title}</h3>
                          <p className="demo-metadata">
                            {document.source} · {document.kind} ·{" "}
                            {document.chunkCount} chunk(s)
                          </p>
                        </div>
                        <div className="demo-badge-row">
                          <span className="demo-badge">
                            {formatContentFormat(document.format)}
                          </span>
                          <span className="demo-badge">
                            {formatChunkStrategy(document.chunkStrategy)}
                          </span>
                          <span className="demo-badge">
                            chunk target {document.chunkSize} chars
                          </span>
                        </div>
                      </div>
                    </summary>
                    <div className="demo-collapsible-content">
                      <div className="demo-actions">
                        <button
                          onClick={() => inspectChunks(document.id)}
                          type="button"
                        >
                          Inspect chunks
                        </button>
                        <button
                          onClick={() =>
                            runPresetSearch(
                              `Source search for ${document.source}`,
                              { source: document.source },
                              `row action: source ${document.source}`,
                              "",
                              "search-results",
                            )
                          }
                          type="button"
                        >
                          Search source
                        </button>
                        <button
                          onClick={() =>
                            runPresetSearch(
                              `Explain ${document.title}`,
                              { documentId: document.id },
                              `row action: document ${document.id}`,
                              "",
                              "search-results",
                            )
                          }
                          type="button"
                        >
                          Search document
                        </button>
                        {document.kind === "custom" && (
                          <button
                            onClick={() => deleteDocument(document.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="demo-key-value-grid">
                        <div className="demo-key-value-row">
                          <span>Source</span>
                          <strong>{document.source}</strong>
                        </div>
                        <div className="demo-key-value-row">
                          <span>Created</span>
                          <strong>{formatDate(document.createdAt)}</strong>
                        </div>
                        <div className="demo-key-value-row">
                          <span>Kind</span>
                          <strong>{document.kind}</strong>
                        </div>
                        <div className="demo-key-value-row">
                          <span>Chunks</span>
                          <strong>{document.chunkCount}</strong>
                        </div>
                        {formatDemoMetadataSummary(document.metadata).map(
                          (line) => (
                            <div className="demo-key-value-row" key={line}>
                              <span>Metadata</span>
                              <strong>{line}</strong>
                            </div>
                          ),
                        )}
                      </div>
                      <p className="demo-document-preview">{document.text}</p>
                      <div className="demo-inline-preview">
                        {rag.chunkPreview.isLoading &&
                          chunkPreview?.document.id !== document.id && (
                            <p className="demo-metadata">
                              Preparing chunk preview...
                            </p>
                          )}
                        {!rag.chunkPreview.isLoading &&
                          chunkPreview?.document.id === document.id && (
                            <>
                              <p className="demo-section-caption">
                                Chunk Preview
                              </p>
                              <p className="demo-metadata">
                                {chunkPreview.document.title} ·{" "}
                                {formatOptionalContentFormat(
                                  chunkPreview.document.format,
                                )}{" "}
                                ·{" "}
                                {formatOptionalChunkStrategy(
                                  chunkPreview.document.chunkStrategy,
                                )}{" "}
                                · {chunkPreview.chunks.length} chunk(s)
                              </p>
                              {chunkPreviewNavigation?.activeNode && (
                                <div className="demo-chunk-nav">
                                  <div className="demo-chunk-nav-row">
                                    <button
                                      disabled={
                                        !chunkPreviewNavigation.previousNode
                                      }
                                      onClick={() =>
                                        chunkPreviewNavigation.previousNode &&
                                        rag.chunkPreview.selectChunk(
                                          chunkPreviewNavigation.previousNode
                                            .chunkId,
                                        )
                                      }
                                      type="button"
                                    >
                                      Previous chunk
                                    </button>
                                    <p className="demo-metadata">
                                      {formatChunkNavigationSectionLabel(
                                        chunkPreviewNavigation,
                                      )}{" "}
                                      ·{" "}
                                      {formatChunkNavigationNodeLabel(
                                        chunkPreviewNavigation.activeNode,
                                      )}
                                    </p>
                                    <button
                                      disabled={
                                        !chunkPreviewNavigation.nextNode
                                      }
                                      onClick={() =>
                                        chunkPreviewNavigation.nextNode &&
                                        rag.chunkPreview.selectChunk(
                                          chunkPreviewNavigation.nextNode
                                            .chunkId,
                                        )
                                      }
                                      type="button"
                                    >
                                      Next chunk
                                    </button>
                                  </div>
                                  {chunkPreviewNavigation.sectionNodes.length >
                                    1 && (
                                    <div className="demo-chunk-nav-strip">
                                      {chunkPreviewNavigation.sectionNodes.map(
                                        (node) => (
                                          <button
                                            className={
                                              node.chunkId ===
                                              activeChunkPreviewId
                                                ? "demo-chunk-nav-chip demo-chunk-nav-chip-active"
                                                : "demo-chunk-nav-chip"
                                            }
                                            key={node.chunkId}
                                            onClick={() =>
                                              rag.chunkPreview.selectChunk(
                                                node.chunkId,
                                              )
                                            }
                                            type="button"
                                          >
                                            {formatChunkNavigationNodeLabel(
                                              node,
                                            )}
                                          </button>
                                        ),
                                      )}
                                    </div>
                                  )}
                                  {(chunkPreviewNavigation.parentSection ||
                                    chunkPreviewNavigation.siblingSections
                                      .length > 0 ||
                                    chunkPreviewNavigation.childSections
                                      .length > 0) && (
                                    <div className="demo-chunk-nav-strip">
                                      {chunkPreviewNavigation.parentSection ? (
                                        <button
                                          className="demo-chunk-nav-chip"
                                          onClick={() =>
                                            rag.chunkPreview.selectParentSection()
                                          }
                                          type="button"
                                        >
                                          Parent ·{" "}
                                          {formatChunkSectionGroupLabel(
                                            chunkPreviewNavigation.parentSection,
                                          )}
                                        </button>
                                      ) : null}
                                      {chunkPreviewNavigation.siblingSections.map(
                                        (section) => (
                                          <button
                                            className="demo-chunk-nav-chip"
                                            key={section.id}
                                            onClick={() =>
                                              rag.chunkPreview.selectSiblingSection(
                                                section.id,
                                              )
                                            }
                                            type="button"
                                          >
                                            Sibling ·{" "}
                                            {formatChunkSectionGroupLabel(
                                              section,
                                            )}
                                          </button>
                                        ),
                                      )}
                                      {chunkPreviewNavigation.childSections.map(
                                        (section) => (
                                          <button
                                            className="demo-chunk-nav-chip"
                                            key={section.id}
                                            onClick={() =>
                                              rag.chunkPreview.selectChildSection(
                                                section.id,
                                              )
                                            }
                                            type="button"
                                          >
                                            Child ·{" "}
                                            {formatChunkSectionGroupLabel(
                                              section,
                                            )}
                                          </button>
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              {activeChunkPreviewSectionDiagnostic && (
                                <article className="demo-result-item">
                                  <h3>Active Section Diagnostic</h3>
                                  <p className="demo-result-source">
                                    {activeChunkPreviewSectionDiagnostic.label}
                                  </p>
                                  <p className="demo-metadata">
                                    {
                                      activeChunkPreviewSectionDiagnostic.summary
                                    }
                                  </p>
                                  <p className="demo-metadata">
                                    {formatSectionDiagnosticChannels(
                                      activeChunkPreviewSectionDiagnostic,
                                    )}
                                  </p>
                                  <p className="demo-metadata">
                                    {formatSectionDiagnosticPipeline(
                                      activeChunkPreviewSectionDiagnostic,
                                    )}
                                  </p>
                                  {formatSectionDiagnosticStageFlow(
                                    activeChunkPreviewSectionDiagnostic,
                                  ) && (
                                    <p className="demo-metadata">
                                      {formatSectionDiagnosticStageFlow(
                                        activeChunkPreviewSectionDiagnostic,
                                      )}
                                    </p>
                                  )}
                                  {formatSectionDiagnosticStageBounds(
                                    activeChunkPreviewSectionDiagnostic,
                                  ) && (
                                    <p className="demo-metadata">
                                      {formatSectionDiagnosticStageBounds(
                                        activeChunkPreviewSectionDiagnostic,
                                      )}
                                    </p>
                                  )}
                                  {formatSectionDiagnosticStageWeightRows(
                                    activeChunkPreviewSectionDiagnostic,
                                  ).map((line: string) => (
                                    <p
                                      className="demo-metadata"
                                      key={`active-section-${line}`}
                                    >
                                      {line}
                                    </p>
                                  ))}
                                  <p className="demo-metadata">
                                    {formatSectionDiagnosticTopEntry(
                                      activeChunkPreviewSectionDiagnostic,
                                    )}
                                  </p>
                                  {formatSectionDiagnosticCompetition(
                                    activeChunkPreviewSectionDiagnostic,
                                  ) && (
                                    <p className="demo-metadata">
                                      {formatSectionDiagnosticCompetition(
                                        activeChunkPreviewSectionDiagnostic,
                                      )}
                                    </p>
                                  )}
                                  {formatSectionDiagnosticReasons(
                                    activeChunkPreviewSectionDiagnostic,
                                  ).length > 0 && (
                                    <div className="demo-badge-row">
                                      {formatSectionDiagnosticReasons(
                                        activeChunkPreviewSectionDiagnostic,
                                      ).map((reason) => (
                                        <span
                                          className="demo-state-chip"
                                          key={`active-section-${reason}`}
                                        >
                                          {reason}
                                        </span>
                                      ))}
                                      {formatSectionDiagnosticStageWeightReasons(
                                        activeChunkPreviewSectionDiagnostic,
                                      ).map((reason: string) => (
                                        <span
                                          className="demo-state-chip"
                                          key={`active-section-${reason}`}
                                        >
                                          {reason}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {formatSectionDiagnosticDistributionRows(
                                    activeChunkPreviewSectionDiagnostic,
                                  ).map((line) => (
                                    <p
                                      className="demo-metadata"
                                      key={`active-section-${line}`}
                                    >
                                      {line}
                                    </p>
                                  ))}
                                </article>
                              )}
                              <div className="demo-result-grid">
                                {chunkPreview.chunks.map((chunk) => (
                                  <article
                                    className={
                                      chunk.chunkId === activeChunkPreviewId
                                        ? "demo-result-item demo-result-item-active"
                                        : "demo-result-item"
                                    }
                                    key={chunk.chunkId}
                                  >
                                    <h3>{chunk.chunkId}</h3>
                                    <p className="demo-result-source">
                                      source:{" "}
                                      {chunk.source ??
                                        chunkPreview.document.source}
                                    </p>
                                    <p className="demo-metadata">
                                      chunk index:{" "}
                                      {String(
                                        (chunk.metadata?.chunkIndex as
                                          | number
                                          | undefined) ?? 0,
                                      )}{" "}
                                      / count:{" "}
                                      {String(
                                        (chunk.metadata?.chunkCount as
                                          | number
                                          | undefined) ??
                                          chunkPreview.chunks.length,
                                      )}
                                    </p>
                                    <p className="demo-result-text">
                                      {chunk.text}
                                    </p>
                                  </article>
                                ))}
                              </div>
                            </>
                          )}
                      </div>
                    </div>
                  </details>
                ))
              ) : (
                <p className="demo-metadata">
                  No indexed sources match the current filters.
                </p>
              )}
            </div>
          </article>
        </section>
      )}
    </main>
  );
};

export { ReactRAGVectorDemoShell as ReactRAGVectorDemoApp } from "../components/ReactRAGVectorDemoShell";
