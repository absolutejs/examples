<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
const props = defineProps<{
  availableBackends?: DemoBackendDescriptor[];
  mode?: DemoBackendMode;
}>();
import { useRAG } from "@absolutejs/rag/vue";
import type { RAGEvaluationResponse } from "@absolutejs/rag";
import {
  type AddFormState,
  type DemoActiveRetrievalState,
  type DemoAIModelCatalogResponse,
  type DemoReleaseOpsResponse,
  type DemoReleaseWorkspace,
  type DemoRetrievalQualityResponse,
  type DemoBackendDescriptor,
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
  formatGroundingHistoryArtifactTrail,
  formatGroundingHistorySummary,
  formatGroundingHistoryDetails,
  formatGroundingHistorySnapshotPresentations,
  formatGroundingProviderCasePresentations,
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
  getAvailableDemoBackends,
  demoEvaluationPresets,
  demoFrameworks,
  demoChunkingStrategies,
  demoReleaseWorkspaces,
  demoUploadPresets,
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
  sortSyncSources,
  encodeArrayBufferToBase64,
  getRAGPathForMode,
  getDemoPagePath,
  getDemoUploadFixtureUrl,
  getInitialBackendMode,
  loadActiveRetrievalState,
  loadRecentQueries,
  navigateToBackendMode,
  saveActiveRetrievalState,
  saveRecentQueries,
  workflowChecks,
} from "../../demo-backends";

type DemoRagReadinessState = {
  className: string;
  detail: string;
  elapsedMs: number;
  label: string;
  status: "warming" | "ready" | "failed";
};

const selectedMode = ref<DemoBackendMode>(
  props.mode ?? getInitialBackendMode(),
);
const searchForm = ref<SearchFormState>({
  query: "",
  topK: 6,
  scoreThreshold: "",
  kind: "",
  source: "",
  documentId: "",
});
const searchResults = ref<SearchResponse | null>(null);
const searchSectionGroups = computed(() =>
  buildSearchSectionGroups(searchResults.value),
);
const addForm = ref<AddFormState>({
  id: "",
  title: "",
  source: "",
  format: "markdown",
  chunkStrategy: "source_aware",
  text: "",
});
const loading = ref(false);
const ragReadiness = ref<DemoRagReadinessState | null>(null);
const searchError = ref("");
const addError = ref("");
const uploadError = ref("");
const evaluationMessage = ref("");
const message = ref("");
const scopeDriver = ref("manual filters");
const restoredSharedState = ref(false);
const restoredSharedStateSummary = ref("");
const recentQueries = ref<Array<{ label: string; state: SearchFormState }>>([]);
const documentPage = ref(1);
const documentSearchTerm = ref("");
const documentTypeFilter = ref("all");
const selectedUploadFile = ref<File | null>(null);
const retrievalPresetId = ref("");
const benchmarkPresetId = ref("");
const uploadPresetId = ref("");
type RagExampleSection =
  | "overview"
  | "retrieve"
  | "ingest"
  | "workflow"
  | "connectors"
  | "evaluate"
  | "ops";
const activeSection = ref<RagExampleSection>("overview");
const hasLoadedActiveSectionData = ref(false);
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
      "Query the index, inspect sources, and prove metadata filters and attribution.",
    loadLabel: "Load retrieval",
  },
  {
    id: "ingest",
    kicker: "2 · Ingest",
    title: "Add Documents",
    description:
      "Upload extracted fixtures or author custom documents, then verify searchability.",
    loadLabel: "Load ingest",
  },
  {
    id: "workflow",
    kicker: "3 · Workflow",
    title: "Grounded Streaming",
    description:
      "Run the RAG answer workflow and inspect grounding and citations.",
    loadLabel: "Load workflow",
  },
  {
    id: "connectors",
    kicker: "4 · Connectors",
    title: "Auth-Backed Sources",
    description: "Inspect sync sources and connector-backed account bindings.",
    loadLabel: "Load connectors",
  },
  {
    id: "evaluate",
    kicker: "5 · Quality",
    title: "Evaluation And Release",
    description: "Run benchmark presets and compare retrieval quality.",
    loadLabel: "Load quality",
  },
  {
    id: "ops",
    kicker: "6 · Operations",
    title: "Diagnostics And Index Health",
    description:
      "Inspect corpus health, sync state, admin jobs, and backend readiness.",
    loadLabel: "Load ops",
  },
];

const backendOptions = computed(() =>
  getAvailableDemoBackends(props.availableBackends),
);
const rag = useRAG(getRAGPathForMode(selectedMode.value), {
  autoLoadOps: false,
  autoLoadStatus: false,
});
const documents = computed(
  () => rag.documents.documents.value as DemoDocument[],
);
const chunkPreview = computed(
  () => rag.chunkPreview.preview.value as DemoChunkPreview | null,
);
const chunkPreviewNavigation = computed(
  () => rag.chunkPreview.navigation.value,
);
const activeChunkPreviewId = computed(
  () => rag.chunkPreview.activeChunkId.value,
);
const activeChunkPreviewSectionDiagnostic = computed(() =>
  buildActiveChunkPreviewSectionDiagnostic(
    chunkPreview.value,
    activeChunkPreviewId.value,
  ),
);
const evaluation = computed(
  () => rag.evaluate.lastResponse.value as RAGEvaluationResponse | null,
);
const chunkPreviewLoading = computed(() => rag.chunkPreview.isLoading.value);
const streamStages = [
  "submitting",
  "retrieving",
  "retrieved",
  "streaming",
  "complete",
] as const;
const DOCUMENTS_PER_PAGE = 10;
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
const inferDocumentExtension = (document: DemoDocument) => {
  const candidates = [document.source, document.title];
  for (const candidate of candidates) {
    const match = candidate.toLowerCase().match(/(\.[a-z0-9]+)(?:[#?].*)?$/);
    if (match) return match[1];
  }
  if (document.format === "markdown") return ".md";
  if (document.format === "html") return ".html";
  return ".txt";
};
const filteredDocuments = computed(() => {
  const query = documentSearchTerm.value.trim().toLowerCase();
  return documents.value.filter((document) => {
    const matchesQuery =
      query.length === 0 ||
      document.title.toLowerCase().includes(query) ||
      document.source.toLowerCase().includes(query) ||
      document.text.toLowerCase().includes(query);
    const matchesType =
      documentTypeFilter.value === "all" ||
      inferDocumentExtension(document) === documentTypeFilter.value;
    return matchesQuery && matchesType;
  });
});
const totalDocumentPages = computed(() =>
  Math.max(1, Math.ceil(filteredDocuments.value.length / DOCUMENTS_PER_PAGE)),
);
const paginatedDocuments = computed(() => {
  const start = (documentPage.value - 1) * DOCUMENTS_PER_PAGE;
  return filteredDocuments.value.slice(start, start + DOCUMENTS_PER_PAGE);
});
const evaluationSuite = buildDemoEvaluationSuite();
const qualityViews = [
  "overview",
  "strategies",
  "grounding",
  "history",
] as const;
const aiModelCatalog = ref<DemoAIModelCatalogResponse>({
  defaultModelKey: null,
  models: [],
});
const qualityData = ref<DemoRetrievalQualityResponse | null>(null);
const releaseData = ref<DemoReleaseOpsResponse | null>(null);
const qualityView = ref<"overview" | "strategies" | "grounding" | "history">(
  "overview",
);
const releaseActionBusyId = ref<string | null>(null);
const releaseWorkspace = ref<DemoReleaseWorkspace>("alpha");
const selectedAIModelKey = ref("");
const streamPrompt = ref("How do metadata filters change retrieval quality?");
let ragReadinessTimer: ReturnType<typeof setTimeout> | null = null;
let ragReadinessRequest = 0;
const workflow = rag.workflow;
const workflowState = computed(() => workflow.state.value);
const streamLatestMessage = computed(
  () => workflow.latestAssistantMessage.value,
);
const streamRetrieval = computed(() => workflow.retrieval.value);
const workflowTracePresentation = computed(() =>
  buildTracePresentation(streamRetrieval.value?.trace),
);
const releasePanel = computed(() =>
  buildDemoReleasePanelState(releaseData.value),
);
const releasePendingLabel = computed(() => {
  if (!releaseActionBusyId.value) return null;
  const action = releasePanel.value.actions.find(
    (entry) => entry.id === releaseActionBusyId.value,
  );
  const lane = action?.id.includes("stable")
    ? "stable"
    : action?.id.includes("canary")
      ? "canary"
      : "release";
  return `Pending ${lane} action · ${action?.label ?? releaseActionBusyId.value}`;
});
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
const streamGroundedAnswer = computed(() => workflow.groundedAnswer.value);
const streamGroundingReferences = computed(
  () => workflow.groundingReferences.value,
);
const streamSourceSummaries = computed(() => workflow.sourceSummaries.value);
const streamSourceSummaryGroups = computed(() =>
  buildSourceSummarySectionGroups(streamSourceSummaries.value),
);
const streamGroundingReferenceGroups = computed(() =>
  buildGroundingReferenceGroups(streamGroundingReferences.value),
);
const streamCitationGroups = computed(() =>
  buildCitationGroups(workflow.citations.value),
);
const streamStage = computed(() => workflow.stage.value);
const streamBusy = computed(
  () => workflow.isRetrieving.value || workflow.isAnswerStreaming.value,
);
const sortedSyncSources = computed(() =>
  sortSyncSources(rag.ops.syncSources.value),
);
const syncOverviewLines = computed(() =>
  formatSyncSourceOverview(sortedSyncSources.value),
);
const retrievalScopeSummary = computed(() =>
  formatRetrievalScopeSummary(searchForm.value),
);
const retrievalScopeHint = computed(() =>
  formatRetrievalScopeHint(searchForm.value),
);
const isStreamStageComplete = (
  stage: (typeof streamStages)[number],
  currentStage: string,
) =>
  currentStage === "complete"
    ? stage === "complete" ||
      streamStages.indexOf(stage) <
        streamStages.indexOf(currentStage as (typeof streamStages)[number])
    : streamStages.indexOf(stage) <
      streamStages.indexOf(currentStage as (typeof streamStages)[number]);

const status = computed(() =>
  buildStatusView(
    rag.status.status.value,
    rag.status.capabilities.value,
    documents.value,
    selectedMode.value,
  ),
);

const runReleaseAction = async (action: {
  id: string;
  label: string;
  path: string;
  payload: { actionId: string; workspace?: DemoReleaseWorkspace };
}) => {
  releaseActionBusyId.value = action.id;
  addError.value = "";
  try {
    const response = await fetch(action.path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...action.payload,
        workspace: releaseWorkspace.value,
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
      throw new Error(`Release action ${action.label} failed`);
    }
    releaseData.value = payload.release;
    message.value =
      payload.message ??
      `${action.label} completed through the published AbsoluteJS release-control workflow.`;
  } catch (error) {
    addError.value =
      error instanceof Error
        ? error.message
        : `Release action ${action.label} failed`;
  } finally {
    releaseActionBusyId.value = null;
  }
};

const loadRagReadiness = async () => {
  const requestId = ++ragReadinessRequest;
  if (ragReadinessTimer) {
    clearTimeout(ragReadinessTimer);
    ragReadinessTimer = null;
  }

  try {
    const response = await fetch(
      `/demo/rag-readiness/${selectedMode.value}/json`,
    );
    const next = (await response.json()) as DemoRagReadinessState;
    if (requestId !== ragReadinessRequest) {
      return;
    }
    ragReadiness.value = next;
    if (next.status === "warming") {
      ragReadinessTimer = setTimeout(() => {
        void loadRagReadiness();
      }, 2000);
    }
  } catch {
    if (requestId === ragReadinessRequest) {
      ragReadiness.value = {
        className: "demo-rag-readiness-failed",
        detail: "Unable to load RAG readiness.",
        elapsedMs: 0,
        label: "RAG Failed",
        status: "failed",
      };
    }
  }
};

const refreshData = async () => {
  loading.value = true;
  searchError.value = "";
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
      fetch(`/demo/quality/${selectedMode.value}`).then((response) =>
        response.json(),
      ) as Promise<DemoRetrievalQualityResponse>,
      fetch(
        `/demo/release/${selectedMode.value}?workspace=${releaseWorkspace.value}`,
      ).then((response) => response.json()) as Promise<DemoReleaseOpsResponse>,
    ]);
    aiModelCatalog.value = aiModelsResponse;
    qualityData.value = qualityResponse;
    releaseData.value = releaseResponse;
    rag.evaluate.saveSuite(evaluationSuite);
    selectedAIModelKey.value =
      selectedAIModelKey.value ||
      aiModelsResponse.defaultModelKey ||
      aiModelsResponse.models[0]?.key ||
      "";
    if (
      chunkPreview.value !== null &&
      documentsData.documents.some(
        (document) => document.id === chunkPreview.value?.document.id,
      )
    ) {
      // keep preview if the document still exists after refresh
    } else {
      rag.chunkPreview.clear();
    }
    message.value = "";
  } catch (error) {
    message.value =
      error instanceof Error
        ? `Unable to load demo data: ${error.message}`
        : "Unable to load demo data";
  } finally {
    loading.value = false;
  }
};

const executeSearch = async () => {
  searchError.value = "";
  searchResults.value = null;

  const query = searchForm.value.query.trim();
  if (query.length === 0) {
    searchError.value = "query is required";
    return;
  }

  try {
    const payload = buildSearchPayload({
      ...searchForm.value,
      query,
      retrievalPresetId: retrievalPresetId.value || undefined,
    });
    const start = performance.now();
    const response = await fetch(`/demo/message/${selectedMode.value}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const parsed = (await response.json()) as {
      ok: boolean;
      results?: Parameters<typeof buildSearchResponse>[2];
      trace?: Parameters<typeof buildSearchResponse>[4];
      error?: string;
    };
    if (!response.ok || !parsed.ok) {
      throw new Error(
        parsed.error ?? `Search failed with status ${response.status}`,
      );
    }
    const results = parsed.results ?? [];
    const nextState = { ...searchForm.value, query };
    recentQueries.value = [
      { label: query, state: nextState },
      ...recentQueries.value.filter(
        (entry) => JSON.stringify(entry.state) !== JSON.stringify(nextState),
      ),
    ].slice(0, 4);
    searchResults.value = buildSearchResponse(
      query,
      payload,
      results,
      Math.round(performance.now() - start),
      parsed.trace,
    );
  } catch (error) {
    searchError.value =
      error instanceof Error
        ? `Search failed: ${error.message}`
        : "Search failed";
  }
};

const focusInspectionEntry = async (
  entry: ReturnType<typeof buildInspectionEntries>[number],
) => {
  documentTypeFilter.value = "all";
  documentSearchTerm.value = entry.sourceQuery ?? "";
  documentPage.value = 1;
  document
    .getElementById("document-list")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (entry.documentId) {
    message.value = `Inspecting ${entry.documentId} from ops inspection.`;
    await inspectChunks(entry.documentId);
    return;
  }
  if (entry.source) {
    searchForm.value = {
      ...searchForm.value,
      source: entry.source,
      documentId: "",
      query: `Source search for ${entry.source}`,
    };
    scopeDriver.value = `ops inspection: ${entry.source}`;
    message.value = `Scoped retrieval to ${entry.source} from ops inspection.`;
    await executeSearch();
  }
};

const submitSearch = async (event: SubmitEvent) => {
  event.preventDefault();
  scopeDriver.value = "manual filters";
  await executeSearch();
};

const clearRetrievalScope = () => {
  searchForm.value = {
    ...searchForm.value,
    kind: "",
    source: "",
    documentId: "",
  };
  scopeDriver.value = "chip reset";
  if (searchForm.value.query.trim().length > 0) {
    void executeSearch();
  }
};

const clearAllRetrievalState = () => {
  searchForm.value = {
    ...searchForm.value,
    query: "",
    kind: "",
    source: "",
    documentId: "",
    scoreThreshold: "",
  };
  searchResults.value = null;
  searchError.value = "";
  scopeDriver.value = "clear all state";
};

const rerunLastQuery = () => {
  if (searchForm.value.query.trim().length === 0) return;
  scopeDriver.value = "rerun last query";
  void executeSearch();
};

const rerunRecentQuery = (state: SearchFormState) => {
  searchForm.value = state;
  scopeDriver.value = "recent query";
  void executeSearch();
};

const submitStreamQuery = (event: SubmitEvent) => {
  event.preventDefault();
  const prompt = streamPrompt.value.trim();
  if (prompt.length === 0) {
    message.value = "Enter a retrieval question before starting the stream.";
    return;
  }
  if (selectedAIModelKey.value.length === 0) {
    message.value = "Configure an AI provider to enable retrieval streaming.";
    return;
  }

  message.value = "";
  workflow.query(buildDemoAIStreamPrompt(selectedAIModelKey.value, prompt));
};

const runSavedSuite = async () => {
  evaluationMessage.value = "";

  try {
    const run = await rag.evaluate.runSuite(evaluationSuite);
    evaluationMessage.value = `Saved suite run finished in ${run.elapsedMs}ms and ranked ${rag.evaluate.leaderboard.value.length} workflow run(s).`;
  } catch (error) {
    evaluationMessage.value =
      error instanceof Error
        ? `Saved suite failed: ${error.message}`
        : "Saved suite failed";
  }
};

const runEvaluation = async () => {
  evaluationMessage.value = "";

  try {
    const response = await rag.evaluate.evaluate(buildDemoEvaluationInput());
    evaluationMessage.value = `Benchmark suite finished in ${response.elapsedMs}ms across ${response.totalCases} benchmark queries.`;
  } catch (error) {
    evaluationMessage.value =
      error instanceof Error
        ? `Evaluation failed: ${error.message}`
        : "Evaluation failed";
  }
};

const runPresetSearch = (
  query: string,
  options: Partial<SearchFormState> = {},
  driver = "preset",
  presetId = "",
) => {
  searchForm.value = {
    ...searchForm.value,
    ...options,
    query,
    kind:
      options.kind === "seed" || options.kind === "custom" ? options.kind : "",
    source: options.source ?? "",
    documentId: options.documentId ?? "",
    scoreThreshold: options.scoreThreshold ?? "",
    topK: options.topK ?? 6,
  };
  scopeDriver.value = driver;
  if (driver.startsWith("benchmark preset:")) {
    benchmarkPresetId.value = presetId;
    retrievalPresetId.value = resolveBenchmarkRetrievalPresetId(presetId);
    uploadPresetId.value = "";
  } else if (driver === "upload verification") {
    retrievalPresetId.value = "";
    benchmarkPresetId.value = "";
  } else {
    retrievalPresetId.value = presetId;
    benchmarkPresetId.value = "";
    uploadPresetId.value = "";
  }

  void executeSearch();
};

const runReleaseEvidenceDrill = (
  drill: (typeof releasePanel.value.releaseEvidenceDrills)[number],
) => {
  runPresetSearch(
    drill.query,
    { topK: drill.topK },
    drill.driver,
    drill.benchmarkPresetId || drill.retrievalPresetId || "",
  );
  document
    .getElementById("search-results")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const ingestDemoUpload = async (preset: (typeof demoUploadPresets)[number]) => {
  uploadError.value = "";
  message.value = `Uploading ${preset.label}...`;
  try {
    const response = await fetch(getDemoUploadFixtureUrl(preset.id));
    if (!response.ok) {
      throw new Error(`Failed to load ${preset.fileName}: ${response.status}`);
    }
    const result = await rag.ingest.ingestUploads(
      buildDemoUploadIngestInput(
        preset,
        encodeArrayBufferToBase64(await response.arrayBuffer()),
      ),
    );
    message.value = `Uploaded ${preset.label}. Extracted ${result.count ?? 0} chunk(s) across ${result.documentCount ?? 1} document(s).`;
    uploadPresetId.value = preset.id;
    runPresetSearch(
      preset.query,
      { source: preset.expectedSources[0] ?? preset.source, topK: 6 },
      "upload verification",
    );
  } catch (error) {
    uploadError.value =
      error instanceof Error
        ? `Upload failed: ${error.message}`
        : "Upload failed";
    message.value = "";
  }
};

const uploadSelectedFile = async () => {
  if (!selectedUploadFile.value) {
    uploadError.value = "Choose a file before uploading.";
    return;
  }
  uploadError.value = "";
  message.value = `Uploading ${selectedUploadFile.value.name}...`;
  try {
    const result = await rag.ingest.ingestUploads({
      baseMetadata: {
        fileKind: "uploaded-user-file",
        kind: "custom",
      },
      uploads: [
        {
          name: selectedUploadFile.value.name,
          source: `uploads/${selectedUploadFile.value.name}`,
          title: selectedUploadFile.value.name,
          contentType:
            selectedUploadFile.value.type || "application/octet-stream",
          encoding: "base64",
          content: encodeArrayBufferToBase64(
            await selectedUploadFile.value.arrayBuffer(),
          ),
          metadata: {
            kind: "custom",
            uploadedFrom: "vue-general-upload",
          },
        },
      ],
    });
    const uploadedName = selectedUploadFile.value.name;
    message.value = `Uploaded ${uploadedName}. Extracted ${result.count ?? 0} chunk(s) across ${result.documentCount ?? 1} document(s).`;
    selectedUploadFile.value = null;
    await refreshData();
    runPresetSearch(
      `Explain ${uploadedName}`,
      { source: `uploads/${uploadedName}`, topK: 6 },
      "upload verification",
    );
  } catch (error) {
    uploadError.value =
      error instanceof Error
        ? `Upload failed: ${error.message}`
        : "Upload failed";
    message.value = "";
  }
};

const onUploadFileChange = (event: Event) => {
  selectedUploadFile.value =
    (event.target as HTMLInputElement | null)?.files?.[0] ?? null;
};

const submitAddDocument = async (event: SubmitEvent) => {
  event.preventDefault();
  addError.value = "";
  searchError.value = "";

  try {
    const response = await rag.index.createDocument({
      id:
        addForm.value.id.trim().length > 0
          ? addForm.value.id.trim()
          : undefined,
      title: addForm.value.title.trim(),
      source: addForm.value.source.trim(),
      format: addForm.value.format,
      text: addForm.value.text.trim(),
      chunking: {
        strategy: addForm.value.chunkStrategy,
      },
    });

    message.value = `Inserted ${response.inserted ?? addForm.value.title.trim()}`;
    addForm.value = {
      id: "",
      title: "",
      source: "",
      format: "markdown",
      chunkStrategy: "source_aware",
      text: "",
    };
    await refreshData();
  } catch (error) {
    addError.value =
      error instanceof Error
        ? `Failed to insert: ${error.message}`
        : "Failed to insert document";
  }
};

const inspectChunks = async (id: string) => {
  try {
    await rag.chunkPreview.inspect(id);
  } catch (error) {
    message.value =
      error instanceof Error
        ? `Failed to inspect ${id}: ${error.message}`
        : `Failed to inspect ${id}`;
  }
};

const chunkIndexText = (
  chunk: { metadata?: Record<string, unknown> },
  fallbackCount: number,
) => {
  const indexValue =
    typeof chunk.metadata?.chunkIndex === "number"
      ? chunk.metadata.chunkIndex
      : 0;
  const countValue =
    typeof chunk.metadata?.chunkCount === "number"
      ? chunk.metadata.chunkCount
      : fallbackCount;
  return `chunk index: ${String(indexValue)} / count: ${String(countValue)}`;
};

const deleteDocument = async (id: string) => {
  try {
    await rag.index.deleteDocument(id);
    message.value = `Deleted ${id}`;
    if (chunkPreview.value?.document.id === id) {
      rag.chunkPreview.clear();
    }
    await refreshData();
  } catch (error) {
    message.value =
      error instanceof Error
        ? `Failed to delete ${id}: ${error.message}`
        : "Failed to delete document";
  }
};

const reseed = async () => {
  searchError.value = "";
  addError.value = "";
  try {
    message.value = "Reseeding defaults...";
    const result = await rag.index.reseed();
    message.value = `Reseed complete. Documents=${result.documents ?? 0}`;
    searchResults.value = null;
    await refreshData();
  } catch (error) {
    message.value =
      error instanceof Error
        ? `Reseed failed: ${error.message}`
        : "Reseed failed";
  }
};

const resetCustom = async () => {
  searchError.value = "";
  addError.value = "";
  try {
    message.value = "Resetting custom documents...";
    const result = await rag.index.reset();
    message.value = `Reset complete. Documents=${result.documents ?? 0}`;
    searchResults.value = null;
    await refreshData();
  } catch (error) {
    message.value =
      error instanceof Error
        ? `Reset failed: ${error.message}`
        : "Reset failed";
  }
};

const syncAllSources = async () => {
  searchError.value = "";
  addError.value = "";
  try {
    message.value = "Starting source sync...";
    const result = await rag.index.syncAllSources({ background: true });
    const count = "sources" in result ? result.sources.length : 0;
    message.value = `Started sync for ${count} source(s). Watch the sync feedback panel for progress.`;
    await refreshData();
  } catch (error) {
    message.value =
      error instanceof Error
        ? `Source sync failed: ${error.message}`
        : "Source sync failed";
  }
};

const queueBackgroundSync = async () => {
  searchError.value = "";
  addError.value = "";
  try {
    message.value = "Queueing background sync...";
    await rag.index.syncAllSources({ background: true });
    message.value = "Background sync queued.";
    await refreshData();
  } catch (error) {
    message.value =
      error instanceof Error
        ? `Failed to queue background sync: ${error.message}`
        : "Failed to queue background sync";
  }
};

const syncSource = async (id: string) => {
  searchError.value = "";
  addError.value = "";
  try {
    message.value = `Starting ${id} sync...`;
    const result = await rag.index.syncSource(id, { background: true });
    message.value =
      "source" in result
        ? `Started ${result.source.label}. Watch the sync feedback panel for progress.`
        : `Started ${id}. Watch the sync feedback panel for progress.`;
    await refreshData();
  } catch (error) {
    message.value =
      error instanceof Error
        ? `Failed to sync ${id}: ${error.message}`
        : `Failed to sync ${id}`;
  }
};

const queueBackgroundSourceSync = async (id: string) => {
  searchError.value = "";
  addError.value = "";
  try {
    message.value = `Queueing ${id} in the background...`;
    const result = await rag.index.syncSource(id, { background: true });
    message.value =
      "source" in result ? `Queued ${result.source.label}.` : `Queued ${id}.`;
    await refreshData();
  } catch (error) {
    message.value =
      error instanceof Error
        ? `Failed to queue ${id}: ${error.message}`
        : `Failed to queue ${id}`;
  }
};

onMounted(() => {
  void loadRagReadiness();
  void loadRecentQueries("vue", selectedMode.value).then((entries) => {
    recentQueries.value = entries;
  });
  void loadActiveRetrievalState("vue", selectedMode.value).then((state) => {
    if (state) {
      searchForm.value = state.searchForm;
      scopeDriver.value = state.scopeDriver;
      retrievalPresetId.value = state.retrievalPresetId ?? "";
      benchmarkPresetId.value = state.benchmarkPresetId ?? "";
      uploadPresetId.value = state.uploadPresetId ?? "";
      selectedAIModelKey.value =
        state.streamModelKey ?? selectedAIModelKey.value;
      streamPrompt.value = state.streamPrompt ?? streamPrompt.value;
      restoredSharedState.value = true;
      const label =
        demoUploadPresets.find((preset) => preset.id === state.uploadPresetId)
          ?.label ??
        demoEvaluationPresets.find(
          (preset) => preset.id === state.benchmarkPresetId,
        )?.label ??
        state.retrievalPresetId ??
        "manual state";
      restoredSharedStateSummary.value = `Restored from shared demo state · ${label} · ${new Date(state.lastUpdatedAt ?? Date.now()).toLocaleString()}.`;
    } else {
      restoredSharedState.value = false;
      restoredSharedStateSummary.value = "";
    }
  });
});

watch(
  () => selectedMode.value,
  () => {
    hasLoadedActiveSectionData.value = false;
    void loadRagReadiness();
  },
);

watch(
  () => releaseWorkspace.value,
  () => {
    if (
      hasLoadedActiveSectionData.value &&
      activeSection.value !== "overview"
    ) {
      void refreshData();
    }
  },
);

watch(
  () => activeSection.value,
  () => {
    if (
      activeSection.value === "overview" ||
      hasLoadedActiveSectionData.value ||
      loading.value
    ) {
      return;
    }
    hasLoadedActiveSectionData.value = true;
    void refreshData();
  },
);

watch(
  () => recentQueries.value,
  (value) => {
    void saveRecentQueries("vue", selectedMode.value, value);
  },
  { deep: true },
);

watch(
  () => searchForm.value,
  (value) => {
    const state: DemoActiveRetrievalState = {
      searchForm: value,
      scopeDriver: scopeDriver.value,
      lastUpdatedAt: Date.now(),
      retrievalPresetId: retrievalPresetId.value || undefined,
      benchmarkPresetId: benchmarkPresetId.value || undefined,
      uploadPresetId: uploadPresetId.value || undefined,
      streamModelKey: selectedAIModelKey.value || undefined,
      streamPrompt: streamPrompt.value,
    };
    void saveActiveRetrievalState("vue", selectedMode.value, state);
  },
  { deep: true },
);

watch(
  () => scopeDriver.value,
  (value) => {
    const state: DemoActiveRetrievalState = {
      searchForm: searchForm.value,
      scopeDriver: value,
      lastUpdatedAt: Date.now(),
      retrievalPresetId: retrievalPresetId.value || undefined,
      benchmarkPresetId: benchmarkPresetId.value || undefined,
      uploadPresetId: uploadPresetId.value || undefined,
      streamModelKey: selectedAIModelKey.value || undefined,
      streamPrompt: streamPrompt.value,
    };
    void saveActiveRetrievalState("vue", selectedMode.value, state);
  },
);

watch(
  () => [selectedAIModelKey.value, streamPrompt.value],
  ([modelKey, prompt]) => {
    const state: DemoActiveRetrievalState = {
      searchForm: searchForm.value,
      scopeDriver: scopeDriver.value,
      lastUpdatedAt: Date.now(),
      retrievalPresetId: retrievalPresetId.value || undefined,
      benchmarkPresetId: benchmarkPresetId.value || undefined,
      uploadPresetId: uploadPresetId.value || undefined,
      streamModelKey: modelKey || undefined,
      streamPrompt: prompt,
    };
    void saveActiveRetrievalState("vue", selectedMode.value, state);
  },
);

watch(
  () => filteredDocuments.value.length,
  () => {
    documentPage.value = Math.min(
      Math.max(1, documentPage.value),
      totalDocumentPages.value,
    );
  },
);
onUnmounted(() => {
  if (ragReadinessTimer) {
    clearTimeout(ragReadinessTimer);
  }
});
</script>

<template>
  <div class="rag-demo-page">
    <header>
      <div class="header-left">
        <a class="logo" href="/">
          <img
            alt="AbsoluteJS"
            height="24"
            src="/assets/png/absolutejs-temp.png"
          />
          AbsoluteJS
        </a>
      </div>
      <nav>
        <div
          v-for="backend in backendOptions"
          :key="backend.id"
          class="demo-nav-row"
        >
          <span
            :class="
              backend.id === selectedMode
                ? 'demo-nav-row-label active'
                : 'demo-nav-row-label'
            "
            >{{ backend.label }}</span
          >
          <a
            v-for="framework in demoFrameworks"
            :key="`${backend.id}-${framework.id}`"
            :class="[
              framework.id === 'vue' && backend.id === selectedMode
                ? 'active'
                : '',
              backend.available ? '' : 'disabled',
            ]"
            :href="
              backend.available
                ? getDemoPagePath(framework.id, backend.id)
                : undefined
            "
            :aria-disabled="!backend.available"
            :title="backend.available ? undefined : backend.reason"
            >{{ framework.label }}</a
          >
        </div>
      </nav>
    </header>

    <main class="demo-layout">
      <section class="demo-card">
        <span class="demo-hero-kicker">Vue workflow surface</span>
        <h1>AbsoluteJS RAG Workflow Demo - Vue</h1>
        <div
          v-if="ragReadiness"
          :class="['demo-rag-readiness', ragReadiness.className]"
        >
          <strong>{{ ragReadiness.label }}</strong>
          <span>{{ ragReadiness.detail }}</span>
        </div>
        <p v-else class="demo-metadata">Loading RAG readiness...</p>
        <p>
          Use one route to ingest, sync, retrieve, stream grounded answers, and
          inspect ops health against the same stuffed multi-format knowledge
          base.
        </p>
        <p class="demo-metadata">
          Pinned to
          <code
            >@absolutejs/absolute@0.19.0-beta.655 + @absolutejs/ai@0.0.5 +
            @absolutejs/rag@0.0.5</code
          >
          and surfacing the shared
          <code>@absolutejs/ai + @absolutejs/rag</code> plus
          <code>@absolutejs/rag/ui</code> diagnostics on this page.
        </p>
        <div class="demo-hero-grid">
          <article class="demo-stat-card">
            <span class="demo-stat-label">Corpus</span>
            <strong>Stuffed multi-format index</strong>
            <p>
              PDF, Office, archive, image, audio, video, EPUB, email, markdown,
              and legacy files on one page.
            </p>
          </article>
          <article class="demo-stat-card">
            <span class="demo-stat-label">Retrieval</span>
            <strong>Search with source proof</strong>
            <p>
              Row actions jump straight into scoped retrieval and inline chunk
              inspection instead of making you type filters by hand.
            </p>
          </article>
          <article class="demo-stat-card">
            <span class="demo-stat-label">Workflow</span>
            <strong>Grounded answers and citations</strong>
            <p>
              Drive the first-class workflow primitive, then inspect coverage,
              references, and resolved citations without leaving the route.
            </p>
          </article>
          <article class="demo-stat-card">
            <span class="demo-stat-label">Ops</span>
            <strong>Ingest, sync, benchmark</strong>
            <p>
              Exercise directory, URL, storage, and email sync adapters
              alongside ingest mutations, benchmarks, and admin status.
            </p>
          </article>
        </div>
        <div class="demo-pill-row">
          <span class="demo-pill">1. Retrieve and verify</span>
          <span class="demo-pill">2. Inspect chunks inline</span>
          <span class="demo-pill">3. Sync a source</span>
          <span class="demo-pill">4. Run quality benchmarks</span>
        </div>
        <div class="demo-section-card-grid">
          <button
            v-for="section in ragExampleSections"
            :key="section.id"
            :class="
              activeSection === section.id
                ? 'demo-section-card demo-section-card-active'
                : 'demo-section-card'
            "
            @click="activeSection = section.id"
            type="button"
          >
            <span>{{ section.kicker }}</span>
            <strong>{{ section.title }}</strong>
            <p>{{ section.description }}</p>
            <small>{{
              activeSection === section.id ? "Loaded" : section.loadLabel
            }}</small>
          </button>
        </div>
      </section>

      <section
        v-if="activeSection === 'overview'"
        class="demo-card demo-full-lab-placeholder"
      >
        <h2>Choose a RAG capability card</h2>
        <p class="demo-metadata">
          Vue now follows the same card-driven demo structure as React. Pick a
          lane to show that part of the RAG package example.
        </p>
      </section>

      <div
        :class="
          activeSection === 'overview'
            ? 'demo-results demo-section-hidden'
            : 'demo-results'
        "
      >
        <h3>Sync Feedback</h3>
        <p class="demo-metadata">
          Run a sync, ingest, reset, or delete action to see the latest mutation
          summary here.
        </p>
        <p class="demo-metadata">
          This panel stays on the same route as diagnostics and retrieval so ops
          feedback is always visible.
        </p>
        <p v-if="message" class="demo-banner">{{ message }}</p>
        <p v-if="loading" class="demo-banner">
          Loading status and documents...
        </p>
        <p v-if="restoredSharedState" class="demo-banner">
          {{ restoredSharedStateSummary }}
        </p>
      </div>
      <section
        class="demo-grid"
        v-if="
          status && activeSection !== 'overview' && activeSection !== 'ingest'
        "
      >
        <article class="demo-card">
          <h2>Diagnostics</h2>
          <dl class="demo-stat-grid">
            <div>
              <dt>Selected mode</dt>
              <dd>{{ selectedMode }}</dd>
            </div>
            <div>
              <dt>Backend</dt>
              <dd>{{ status.backend }}</dd>
            </div>
            <div>
              <dt>Vector mode</dt>
              <dd>{{ status.vectorMode }}</dd>
            </div>
            <div>
              <dt>Embedding dimensions</dt>
              <dd>{{ status.dimensions ?? "n/a" }}</dd>
            </div>
            <div>
              <dt>Documents</dt>
              <dd>{{ status.documents.total }}</dd>
            </div>
            <div>
              <dt>Total chunks</dt>
              <dd>{{ status.chunkCount }}</dd>
            </div>
            <div>
              <dt>Seed docs</dt>
              <dd>{{ status.documents.byKind.seed }}</dd>
            </div>
            <div>
              <dt>Custom docs</dt>
              <dd>{{ status.documents.byKind.custom }}</dd>
            </div>
            <div>
              <dt>Vector acceleration</dt>
              <dd>{{ status.native.active ? "active" : "inactive" }}</dd>
            </div>
            <div>
              <dt>Native source</dt>
              <dd>{{ status.native.sourceLabel ?? "Not applicable" }}</dd>
            </div>
            <div>
              <dt>Reranker</dt>
              <dd>{{ status.reranker.label }}</dd>
            </div>
          </dl>

          <p v-if="status.native.fallbackReason" class="demo-metadata">
            {{ status.native.fallbackReason }}
          </p>
          <p class="demo-metadata">{{ status.reranker.summary }}</p>
          <p class="demo-metadata">
            Backend capabilities:
            <strong>{{ status.capabilities.join(" · ") }}</strong>
          </p>
          <div class="demo-results demo-release-card">
            <h3>Release Control</h3>
            <p class="demo-metadata">
              This panel exercises the same AbsoluteJS release-control surface
              that backs retrieval baselines, lane readiness, incidents, and
              remediation execution tracking.
            </p>
            <div class="demo-release-hero">
              <div class="demo-release-hero-copy">
                <p class="demo-release-kicker">AbsoluteJS release workflow</p>
                <p class="demo-release-banner">
                  {{ releasePanel.releaseHero }}
                </p>
                <p class="demo-release-summary">
                  {{ releasePanel.releaseHeroSummary }}
                </p>
                <p class="demo-metadata">{{ releasePanel.releaseHeroMeta }}</p>
                <p class="demo-metadata">{{ releasePanel.releaseScopeNote }}</p>
                <div class="demo-release-pills">
                  <template
                    v-for="pill in releasePanel.releaseHeroPills"
                    :key="`release-pill-${pill.label}`"
                  >
                    <a
                      v-if="pill.targetCardId || pill.targetActivityId"
                      :class="[
                        `demo-release-pill`,
                        `demo-release-pill-${pill.tone}`,
                      ]"
                      :href="`#${pill.targetActivityId ?? pill.targetCardId}`"
                      @click="openReleaseDiagnosticsTarget(pill.targetCardId)"
                    >
                      <span class="demo-release-pill-label">{{
                        pill.label
                      }}</span>
                      <span class="demo-release-pill-value">{{
                        pill.value
                      }}</span>
                    </a>
                    <span
                      v-else
                      :class="[
                        `demo-release-pill`,
                        `demo-release-pill-${pill.tone}`,
                      ]"
                    >
                      <span class="demo-release-pill-label">{{
                        pill.label
                      }}</span>
                      <span class="demo-release-pill-value">{{
                        pill.value
                      }}</span>
                    </span>
                  </template>
                </div>
                <div class="demo-release-scenario-switcher">
                  <span
                    v-for="entry in demoReleaseWorkspaces"
                    :key="`release-workspace-${entry.id}`"
                    :class="[
                      `demo-release-scenario-chip`,
                      `demo-release-workspace-chip`,
                      releaseWorkspace === entry.id
                        ? 'demo-release-scenario-chip-active'
                        : '',
                    ]"
                  >
                    <button
                      type="button"
                      :disabled="releaseWorkspace === entry.id"
                      :title="entry.description"
                      @click="releaseWorkspace = entry.id"
                    >
                      Workspace · {{ entry.label }}
                    </button>
                  </span>
                  <span
                    v-for="entry in releasePanel.releaseScenarioActions"
                    :key="`release-scenario-${entry.id}`"
                    :class="[
                      `demo-release-scenario-chip`,
                      entry.active ? 'demo-release-scenario-chip-active' : '',
                    ]"
                  >
                    <button
                      v-if="entry.action"
                      type="button"
                      :disabled="
                        entry.active || releaseActionBusyId === entry.action.id
                      "
                      :title="entry.action.description"
                      @click="runReleaseAction(entry.action)"
                    >
                      {{
                        releaseActionBusyId === entry.action.id
                          ? `Running ${entry.action.label}...`
                          : entry.label
                      }}
                    </button>
                    <span v-else>{{ entry.label }}</span>
                  </span>
                </div>
                <div class="demo-release-path">
                  <article
                    v-for="step in releasePanel.releasePathSteps"
                    :key="`release-path-${step.id}`"
                    :class="[
                      `demo-release-path-step`,
                      `demo-release-path-step-${step.status}`,
                    ]"
                  >
                    <div class="demo-release-path-step-header">
                      <h4>{{ step.label }}</h4>
                      <span
                        :class="[
                          `demo-release-path-status`,
                          `demo-release-path-status-${step.status}`,
                        ]"
                        >{{ step.status }}</span
                      >
                    </div>
                    <p>{{ step.summary }}</p>
                    <p class="demo-release-path-detail">{{ step.detail }}</p>
                    <button
                      v-if="step.action"
                      class="demo-release-path-action"
                      type="button"
                      :disabled="releaseActionBusyId === step.action.id"
                      @click="runReleaseAction(step.action)"
                    >
                      {{
                        releaseActionBusyId === step.action.id
                          ? `Running ${step.action.label}...`
                          : step.action.label
                      }}
                    </button>
                  </article>
                </div>
              </div>
              <div class="demo-release-action-rail">
                <div class="demo-release-action-state">
                  <span class="demo-release-action-state-badge"
                    >Scenario ·
                    {{
                      releasePanel.scenario?.label ?? "Blocked stable lane"
                    }}</span
                  >
                  <span
                    :class="[
                      `demo-release-action-delta-badge`,
                      `demo-release-action-delta-badge-${releasePanel.releaseRailDeltaChip.tone}`,
                    ]"
                    >{{ releasePanel.releaseRailDeltaChip.label }}</span
                  >
                  <span
                    :class="[
                      `demo-release-action-delta-badge`,
                      `demo-release-action-delta-badge-${releasePanel.railIncidentPostureChip.tone}`,
                    ]"
                    >Incident posture ·
                    {{ releasePanel.railIncidentPostureChip.label }}</span
                  >
                  <span
                    :class="[
                      `demo-release-action-delta-badge`,
                      `demo-release-action-delta-badge-${releasePanel.railGateChip.tone}`,
                    ]"
                    >Gate posture · {{ releasePanel.railGateChip.label }}</span
                  >
                  <span
                    :class="[
                      `demo-release-action-delta-badge`,
                      `demo-release-action-delta-badge-${releasePanel.railApprovalChip.tone}`,
                    ]"
                    >Approval posture ·
                    {{ releasePanel.railApprovalChip.label }}</span
                  >
                  <span
                    :class="[
                      `demo-release-action-delta-badge`,
                      `demo-release-action-delta-badge-${releasePanel.railRemediationChip.tone}`,
                    ]"
                    >Remediation posture ·
                    {{ releasePanel.railRemediationChip.label }}</span
                  >
                </div>
                <div class="demo-release-rail-meta">
                  <a
                    v-if="
                      releasePanel.releaseRailUpdateSource.targetCardId ||
                      releasePanel.releaseRailUpdateSource.targetActivityId
                    "
                    :class="[
                      `demo-release-activity-lane`,
                      `demo-release-activity-lane-${releasePanel.releaseRailUpdateSource.tone}`,
                    ]"
                    :href="`#${releasePanel.releaseRailUpdateSource.targetActivityId ?? releasePanel.releaseRailUpdateSource.targetCardId}`"
                    @click="
                      openReleaseDiagnosticsTarget(
                        releasePanel.releaseRailUpdateSource.targetCardId,
                      )
                    "
                    >{{ releasePanel.releaseRailUpdateSource.label }}</a
                  ><span
                    v-else
                    :class="[
                      `demo-release-activity-lane`,
                      `demo-release-activity-lane-${releasePanel.releaseRailUpdateSource.tone}`,
                    ]"
                    >{{ releasePanel.releaseRailUpdateSource.label }}</span
                  >
                  <p class="demo-release-updated">
                    {{ releasePanel.releaseRailUpdatedLabel }}
                  </p>
                </div>
                <p v-if="releasePendingLabel" class="demo-release-pending">
                  {{ releasePendingLabel }}
                </p>
                <details
                  v-if="releasePanel.latestReleaseAction"
                  :class="[
                    `demo-collapsible`,
                    `demo-release-action-latest`,
                    `demo-release-action-latest-${releasePanel.latestReleaseAction.tone}`,
                  ]"
                >
                  <summary>
                    Latest action · {{ releasePanel.latestReleaseAction.title }}
                  </summary>
                  <p v-if="releasePanel.latestReleaseAction.detail">
                    {{ releasePanel.latestReleaseAction.detail }}
                  </p>
                  <p class="demo-release-next-step">
                    {{ releasePanel.latestReleaseAction.nextStep }}
                  </p>
                </details>
                <details
                  :class="[
                    `demo-collapsible`,
                    `demo-release-rail-callout`,
                    `demo-release-rail-callout-${releasePanel.releaseRailCallout.tone}`,
                  ]"
                >
                  <summary>{{ releasePanel.releaseRailCallout.title }}</summary>
                  <p>{{ releasePanel.releaseRailCallout.message }}</p>
                  <p v-if="releasePanel.releaseRailCallout.detail">
                    {{ releasePanel.releaseRailCallout.detail }}
                  </p>
                  <p class="demo-release-next-step">
                    {{ releasePanel.releaseRailCallout.nextStep }}
                  </p>
                </details>
                <div
                  v-if="releasePanel.recentReleaseActivity.length"
                  class="demo-release-activity-stack"
                >
                  <span class="demo-release-action-subtitle"
                    >Recent activity</span
                  ><a
                    v-for="(entry, index) in releasePanel.recentReleaseActivity"
                    :id="entry.id"
                    :key="`release-activity-${entry.laneLabel}-${index}`"
                    :class="[
                      `demo-release-activity`,
                      `demo-release-activity-${entry.tone}`,
                    ]"
                    :href="`#${entry.targetCardId}`"
                    @click="openReleaseDiagnosticsTarget(entry.targetCardId)"
                    ><span
                      :class="[
                        `demo-release-activity-lane`,
                        `demo-release-activity-lane-${entry.tone}`,
                      ]"
                      >{{ entry.laneLabel }}</span
                    ><strong>{{ entry.title }}</strong
                    >{{ entry.detail ? ` · ${entry.detail}` : "" }}</a
                  >
                </div>
                <div class="demo-release-action-group">
                  <span class="demo-release-action-subtitle">Release</span>
                  <div class="demo-release-actions">
                    <button
                      v-for="action in releasePanel.primaryReleaseActions"
                      :key="`release-action-${action.id}`"
                      :class="[
                        `demo-release-action`,
                        `demo-release-action-${action.tone ?? 'neutral'}`,
                      ]"
                      type="button"
                      :disabled="releaseActionBusyId === action.id"
                      :title="action.description"
                      @click="runReleaseAction(action)"
                    >
                      {{
                        releaseActionBusyId === action.id
                          ? `Running ${action.label}...`
                          : action.label
                      }}
                    </button>
                  </div>
                  <details
                    v-if="releasePanel.secondaryReleaseActions.length > 0"
                    class="demo-collapsible demo-release-more-actions"
                  >
                    <summary>More actions</summary>
                    <div class="demo-release-actions">
                      <button
                        v-for="action in releasePanel.secondaryReleaseActions"
                        :key="`secondary-release-action-${action.id}`"
                        :class="[
                          `demo-release-action`,
                          `demo-release-action-${action.tone ?? 'neutral'}`,
                        ]"
                        type="button"
                        :disabled="releaseActionBusyId === action.id"
                        :title="action.description"
                        @click="runReleaseAction(action)"
                      >
                        {{
                          releaseActionBusyId === action.id
                            ? `Running ${action.label}...`
                            : action.label
                        }}
                      </button>
                    </div>
                  </details>
                </div>
                <div
                  v-if="releasePanel.handoffActions.length > 0"
                  class="demo-release-action-group"
                >
                  <span class="demo-release-action-subtitle">Handoff</span>
                  <div class="demo-release-actions">
                    <button
                      v-for="action in releasePanel.handoffActions"
                      :key="`handoff-action-${action.id}`"
                      :class="[
                        `demo-release-action`,
                        `demo-release-action-${action.tone ?? 'neutral'}`,
                      ]"
                      type="button"
                      :disabled="releaseActionBusyId === action.id"
                      :title="action.description"
                      @click="runReleaseAction(action)"
                    >
                      {{
                        releaseActionBusyId === action.id
                          ? `Running ${action.label}...`
                          : action.label
                      }}
                    </button>
                  </div>
                </div>
                <div class="demo-release-action-group">
                  <span class="demo-release-action-subtitle"
                    >Evidence drills</span
                  >
                  <div class="demo-release-actions">
                    <button
                      v-for="drill in releasePanel.releaseEvidenceDrills"
                      :key="`release-drill-${drill.id}`"
                      :class="[
                        `demo-release-action`,
                        `demo-release-action-${drill.active ? 'primary' : 'neutral'}`,
                      ]"
                      type="button"
                      @click="runReleaseEvidenceDrill(drill)"
                    >
                      {{ drill.label }}
                    </button>
                  </div>
                  <template
                    v-for="drill in releasePanel.releaseEvidenceDrills"
                    :key="`release-drill-detail-${drill.id}`"
                  >
                    <p class="demo-metadata">
                      <strong>{{ drill.classificationLabel }}:</strong>
                      {{ drill.summary }} Expected source ·
                      {{ drill.expectedSource }}
                    </p>
                    <p class="demo-metadata">{{ drill.traceExpectation }}</p>
                  </template>
                </div>
              </div>
            </div>
            <div class="demo-stat-grid">
              <article class="demo-stat-card">
                <span class="demo-stat-label">Stable baseline</span>
                <strong>{{
                  releasePanel.stableBaseline?.label ?? "Not promoted"
                }}</strong>
                <p>
                  {{
                    releasePanel.stableBaseline
                      ? `${releasePanel.stableBaseline.retrievalId} · v${releasePanel.stableBaseline.version}${releasePanel.stableBaseline.approvedBy ? ` · approved by ${releasePanel.stableBaseline.approvedBy}` : ""}`
                      : "No stable baseline has been promoted yet."
                  }}
                </p>
              </article>
              <article class="demo-stat-card">
                <span class="demo-stat-label">Canary baseline</span>
                <strong>{{
                  releasePanel.canaryBaseline?.label ?? "Not promoted"
                }}</strong>
                <p>
                  {{
                    releasePanel.canaryBaseline
                      ? `${releasePanel.canaryBaseline.retrievalId} · v${releasePanel.canaryBaseline.version}${releasePanel.canaryBaseline.approvedAt ? ` · ${formatDate(releasePanel.canaryBaseline.approvedAt)}` : ""}`
                      : "No canary baseline has been promoted yet."
                  }}
                </p>
              </article>
              <article class="demo-stat-card">
                <span class="demo-stat-label">Stable readiness</span>
                <strong>{{
                  releasePanel.stableReadiness?.ready ? "Ready" : "Blocked"
                }}</strong>
                <p>{{ releasePanel.stableReadinessStatSummary }}</p>
              </article>
              <article class="demo-stat-card">
                <span class="demo-stat-label">Remediation guardrails</span>
                <strong>{{
                  releasePanel.remediationSummary
                    ? `${releasePanel.remediationSummary.guardrailBlockedCount} blocked · ${releasePanel.remediationSummary.replayCount} replays`
                    : "No remediation executions"
                }}</strong>
                <p>{{ releasePanel.remediationGuardrailSummary }}</p>
              </article>
            </div>
            <p
              :class="[
                `demo-release-card-state`,
                `demo-release-card-state-${releasePanel.releaseStateBadge.tone}`,
              ]"
            >
              State · {{ releasePanel.releaseStateBadge.label }}
            </p>
            <div class="demo-result-grid">
              <article class="demo-result-item">
                <h4>Blocker comparison</h4>
                <p class="demo-score-headline">
                  {{
                    releasePanel.scenarioClassificationLabel
                      ? `Active blocker · ${releasePanel.scenarioClassificationLabel}`
                      : "Compare both blocker classes"
                  }}
                </p>
                <div class="demo-result-grid">
                  <article
                    v-for="card in releasePanel.releaseBlockerComparisonCards"
                    :key="`blocker-card-${card.id}`"
                    class="demo-result-item"
                  >
                    <h4>
                      {{ card.label }}{{ card.active ? " · active" : "" }}
                    </h4>
                    <p
                      v-for="line in card.detailLines"
                      :key="`${card.id}-${line}`"
                      class="demo-metadata"
                    >
                      {{ line }}
                    </p>
                  </article>
                </div>
              </article>
              <article
                id="release-runtime-history-card"
                class="demo-result-item"
              >
                <h4>Runtime planner history</h4>
                <p class="demo-score-headline">
                  {{ releasePanel.runtimePlannerHistorySummary }}
                </p>
                <p
                  v-for="line in releasePanel.runtimePlannerHistoryLines"
                  :key="`runtime-planner-${line}`"
                  class="demo-metadata"
                >
                  {{ line }}
                </p>
              </article>
              <article
                id="release-benchmark-snapshots-card"
                class="demo-result-item"
              >
                <h4>Adaptive planner benchmark</h4>
                <p class="demo-score-headline">
                  {{ releasePanel.benchmarkSnapshotSummary }}
                </p>
                <p
                  v-for="line in releasePanel.benchmarkSnapshotLines"
                  :key="`benchmark-snapshot-${line}`"
                  class="demo-metadata"
                >
                  {{ line }}
                </p>
              </article>
              <article id="release-active-deltas-card" class="demo-result-item">
                <h4>Active blocker deltas</h4>
                <p class="demo-score-headline">
                  {{ releasePanel.activeBlockerDeltaSummary }}
                </p>
                <p
                  v-for="line in releasePanel.activeBlockerDeltaLines"
                  :key="`active-blocker-delta-${line}`"
                  class="demo-metadata"
                >
                  {{ line }}
                </p>
              </article>
              <article
                id="release-lane-readiness-card"
                class="demo-result-item"
              >
                <h4>Lane readiness</h4>
                <div class="demo-key-value-grid">
                  <template
                    v-for="entry in releasePanel.laneReadinessEntries"
                    :key="`lane-readiness-${entry.targetRolloutLabel}`"
                  >
                    <div class="demo-key-value-row">
                      <span>{{ entry.targetRolloutLabel ?? "lane" }}</span>
                      <strong>{{ entry.ready ? "ready" : "blocked" }}</strong>
                    </div>
                    <p
                      v-for="reason in entry.reasons.slice(0, 2)"
                      :key="`${entry.targetRolloutLabel}-${reason}`"
                      class="demo-metadata"
                    >
                      {{ reason }}
                    </p>
                  </template>
                </div>
              </article>
              <article class="demo-result-item">
                <h4>Lane recommendations</h4>
                <div class="demo-insight-stack">
                  <template
                    v-if="releasePanel.releaseRecommendations.length > 0"
                  >
                    <p
                      v-for="entry in releasePanel.releaseRecommendations"
                      :key="`${entry.groupKey}:${entry.targetRolloutLabel}:${entry.recommendedAction}`"
                      class="demo-insight-card"
                    >
                      <strong
                        >{{ entry.targetRolloutLabel ?? "lane" }} ·
                        {{
                          entry.classificationLabel ?? "release recommendation"
                        }}:</strong
                      >
                      {{ entry.recommendedAction.replaceAll("_", " ")
                      }}{{ entry.reasons[0] ? ` · ${entry.reasons[0]}` : "" }}
                    </p>
                  </template>
                  <p v-else class="demo-insight-card">
                    No lane recommendations are available yet.
                  </p>
                </div>
              </article>
              <article
                id="release-open-incidents-card"
                class="demo-result-item"
              >
                <h4>Open incidents</h4>
                <p class="demo-score-headline">
                  {{ releasePanel.incidentSummaryLabel }}
                </p>
                <p
                  v-for="line in releasePanel.incidentClassificationDetailLines"
                  :key="`incident-detail-${line}`"
                  class="demo-metadata"
                >
                  {{ line }}
                </p>
                <div class="demo-insight-stack">
                  <p
                    v-for="incident in releasePanel.recentIncidents.slice(0, 3)"
                    :key="`${incident.kind}:${incident.triggeredAt}`"
                    class="demo-insight-card"
                  >
                    <strong
                      >{{ incident.targetRolloutLabel ?? "lane" }} ·
                      {{ incident.kind }} ·
                      {{
                        incident.classificationLabel ?? "general regression"
                      }}</strong
                    ><br />{{ incident.message }}
                  </p>
                </div>
              </article>
              <article
                id="release-remediation-history-card"
                class="demo-result-item"
              >
                <h4>Remediation execution history</h4>
                <p
                  v-for="line in releasePanel.remediationDetailLines"
                  :key="`remediation-detail-${line}`"
                  class="demo-metadata"
                >
                  {{ line }}
                </p>
                <div class="demo-key-value-grid">
                  <div
                    v-for="(
                      entry, index
                    ) in releasePanel.recentIncidentRemediationExecutions.slice(
                      0,
                      4,
                    )"
                    :key="`remediation-execution-${index}`"
                    class="demo-key-value-row"
                  >
                    <span>{{ entry.action?.kind ?? "execution" }}</span>
                    <strong
                      >{{ entry.code
                      }}{{ entry.idempotentReplay ? " · replay" : ""
                      }}{{
                        entry.blockedByGuardrail ? " · blocked" : ""
                      }}</strong
                    >
                  </div>
                </div>
              </article>
            </div>
            <details
              id="release-diagnostics"
              class="demo-collapsible demo-release-diagnostics"
            >
              <summary>
                Advanced release diagnostics ·
                {{ releasePanel.releaseDiagnosticsSummary }}
              </summary>
              <p class="demo-release-updated">
                {{ releasePanel.releaseDiagnosticsUpdatedLabel }}
              </p>
              <p
                :class="[
                  `demo-release-card-state`,
                  `demo-release-card-state-${releasePanel.releaseStateBadge.tone}`,
                ]"
              >
                State · {{ releasePanel.releaseStateBadge.label }}
              </p>
              <div class="demo-result-grid">
                <article
                  id="release-promotion-candidates-card"
                  class="demo-result-item"
                >
                  <h4>Promotion candidates</h4>
                  <div class="demo-key-value-grid">
                    <template v-if="releasePanel.releaseCandidates.length > 0">
                      <template
                        v-for="(
                          candidate, index
                        ) in releasePanel.releaseCandidates.slice(0, 3)"
                        :key="`promotion-candidate-${candidate.targetRolloutLabel}-${index}`"
                      >
                        <div class="demo-key-value-row">
                          <span
                            >{{ candidate.targetRolloutLabel ?? "lane" }} ·
                            {{
                              candidate.candidateRetrievalId ?? "candidate"
                            }}</span
                          >
                          <strong>{{ candidate.reviewStatus }}</strong>
                        </div>
                        <p class="demo-metadata">
                          {{
                            candidate.reasons[0] ??
                            "No release reasons recorded."
                          }}
                        </p>
                      </template>
                    </template>
                    <p v-else class="demo-metadata">
                      No promotion candidates recorded yet.
                    </p>
                  </div>
                </article>
                <article class="demo-result-item">
                  <h4>Release alerts</h4>
                  <div class="demo-insight-stack">
                    <template v-if="releasePanel.releaseAlerts.length > 0">
                      <p
                        v-for="(
                          alert, index
                        ) in releasePanel.releaseAlerts.slice(0, 4)"
                        :key="`${alert.kind}-${index}`"
                        class="demo-insight-card"
                      >
                        <strong
                          >{{ alert.targetRolloutLabel ?? "lane" }} ·
                          {{ alert.kind }} ·
                          {{
                            alert.classificationLabel ?? "general regression"
                          }}</strong
                        ><br />{{ alert.message ?? "No alert detail" }}
                      </p>
                    </template>
                    <p v-else class="demo-insight-card">
                      No release alerts are active.
                    </p>
                  </div>
                </article>
                <article
                  id="release-policy-history-card"
                  class="demo-result-item"
                >
                  <h4>Policy history</h4>
                  <p
                    v-for="line in releasePanel.policyHistoryDetailLines"
                    :key="`policy-detail-${line}`"
                    class="demo-metadata"
                  >
                    {{ line }}
                  </p>
                  <div class="demo-insight-stack">
                    <template
                      v-if="releasePanel.policyHistoryEntries.length > 0"
                    >
                      <p
                        v-for="entry in releasePanel.policyHistoryEntries"
                        :key="entry.id"
                        class="demo-insight-card"
                      >
                        <strong>{{ entry.title }}</strong
                        ><br />{{ entry.detail }}
                      </p>
                    </template>
                    <p v-else class="demo-insight-card">
                      {{ releasePanel.policyHistorySummary }}
                    </p>
                  </div>
                </article>
                <article
                  id="release-audit-surfaces-card"
                  class="demo-result-item"
                >
                  <h4>Audit surfaces</h4>
                  <div class="demo-insight-stack">
                    <template
                      v-if="releasePanel.auditSurfaceEntries.length > 0"
                    >
                      <p
                        v-for="entry in releasePanel.auditSurfaceEntries"
                        :key="entry.id"
                        class="demo-insight-card"
                      >
                        <strong>{{ entry.title }}</strong
                        ><br />{{ entry.detail }}
                      </p>
                    </template>
                    <p v-else class="demo-insight-card">
                      {{ releasePanel.auditSurfaceSummary }}
                    </p>
                  </div>
                </article>
                <article
                  id="release-polling-surfaces-card"
                  class="demo-result-item"
                >
                  <h4>Polling surfaces</h4>
                  <div class="demo-insight-stack">
                    <p
                      v-for="entry in releasePanel.pollingSurfaceEntries"
                      :key="entry.id"
                      class="demo-insight-card"
                    >
                      <strong>{{ entry.title }}</strong
                      ><br />{{ entry.detail }}
                    </p>
                  </div>
                </article>
                <article
                  id="release-handoff-incidents-card"
                  class="demo-result-item"
                >
                  <h4>Handoff incidents</h4>
                  <p class="demo-score-headline">
                    {{ releasePanel.stableHandoffIncidentSummaryLabel }}
                  </p>
                  <div class="demo-insight-stack">
                    <template v-if="releasePanel.handoffIncidents.length > 0">
                      <p
                        v-for="(
                          incident, index
                        ) in releasePanel.handoffIncidents.slice(0, 2)"
                        :key="incident.id ?? index"
                        class="demo-insight-card"
                      >
                        <strong
                          >{{ incident.status ?? "incident" }} ·
                          {{ incident.kind ?? "handoff_stale" }}</strong
                        ><br />{{
                          incident.message ?? "No handoff incident detail"
                        }}
                      </p>
                    </template>
                    <p v-else class="demo-insight-card">
                      No handoff incidents recorded.
                    </p>
                    <p
                      v-for="(
                        entry, index
                      ) in releasePanel.handoffIncidentHistory.slice(0, 3)"
                      :key="`${entry.incidentId ?? index}-${entry.recordedAt ?? 0}`"
                      class="demo-insight-card"
                    >
                      <strong>{{ entry.action ?? "history" }}</strong
                      ><br />{{
                        [
                          entry.notes,
                          entry.recordedAt
                            ? new Date(entry.recordedAt).toLocaleString()
                            : undefined,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      }}
                    </p>
                  </div>
                </article>
                <article
                  id="release-stable-handoff-card"
                  class="demo-result-item"
                >
                  <h4>Stable handoff</h4>
                  <div class="demo-key-value-grid">
                    <template v-if="releasePanel.stableHandoff">
                      <div class="demo-key-value-row">
                        <span
                          >{{
                            releasePanel.stableHandoff.sourceRolloutLabel
                          }}
                          ->
                          {{
                            releasePanel.stableHandoff.targetRolloutLabel
                          }}</span
                        >
                        <strong>{{
                          releasePanel.stableHandoff.readyForHandoff
                            ? "ready"
                            : "blocked"
                        }}</strong>
                      </div>
                      <p class="demo-metadata">
                        {{
                          releasePanel.stableHandoff.candidateRetrievalId
                            ? `candidate ${releasePanel.stableHandoff.candidateRetrievalId}`
                            : "No candidate retrieval is attached to the handoff yet."
                        }}{{
                          releasePanel.stableHandoffDecision?.kind
                            ? ` · latest ${releasePanel.stableHandoffDecision.kind}`
                            : ""
                        }}
                      </p>
                      <p
                        v-for="reason in releasePanel.stableHandoffDisplayReasons"
                        :key="`stable-handoff-${reason}`"
                        class="demo-metadata"
                      >
                        {{ reason }}
                      </p>
                      <p
                        v-if="releasePanel.stableHandoffAutoCompleteLabel"
                        class="demo-metadata"
                      >
                        {{ releasePanel.stableHandoffAutoCompleteLabel }}
                      </p>
                      <div class="demo-key-value-row">
                        <span>Drift events</span>
                        <strong>{{
                          releasePanel.stableHandoffDrift?.totalCount ?? 0
                        }}</strong>
                      </div>
                    </template>
                    <p v-else class="demo-metadata">
                      No stable handoff posture is available yet.
                    </p>
                  </div>
                </article>
              </div>
            </details>
          </div>
          <div class="demo-actions">
            <button @click="reseed" type="button">Re-seed defaults</button>
            <button @click="resetCustom" type="button">
              Reset custom docs
            </button>
            <button @click="refreshData" type="button">Refresh</button>
          </div>
        </article>

        <article class="demo-card">
          <h2>Retrieve And Verify</h2>
          <p class="demo-metadata">
            This section is powered by <code>useRAG</code>. Run a query, then
            confirm the returned chunk text and source label match the indexed
            source list below.
          </p>
          <div class="demo-preset-grid">
            <button
              type="button"
              @click="
                runPresetSearch(
                  'How do metadata filters change retrieval quality?',
                  { kind: 'seed' },
                  'preset: filter behavior',
                  'filter-behavior',
                )
              "
            >
              Filter behavior
            </button>
            <button
              type="button"
              @click="
                runPresetSearch(
                  'What should I verify after ingesting a new source?',
                  {},
                  'preset: verify ingestion',
                  'verify-ingestion',
                )
              "
            >
              Verify ingestion
            </button>
            <button
              type="button"
              @click="
                runPresetSearch(
                  'List support policies for shipping and returns.',
                  { source: 'guide/demo.md' },
                  'preset: source filter',
                  'source-filter',
                )
              "
            >
              Source filter
            </button>
            <button
              type="button"
              @click="
                runPresetSearch(
                  'Why should metadata be stable?',
                  { source: 'guides/metadata.md' },
                  'preset: metadata discipline',
                  'metadata-discipline',
                )
              "
            >
              Metadata discipline
            </button>
            <button
              type="button"
              @click="
                runPresetSearch(
                  'Which aurora launch packet phrase shows late interaction can match precise wording without splitting the parent document?',
                  {},
                  'preset: late interaction',
                  'hybrid',
                )
              "
            >
              Late interaction / multivector
            </button>
            <button
              type="button"
              @click="
                runPresetSearch(
                  'Which synced site discovery guide says discovery diagnostics stay visible on the same sync surface as every other source?',
                  { source: 'sync/site/demo/sync-fixtures/site/docs/guide' },
                  'preset: site discovery',
                  'site-discovery',
                )
              "
            >
              Site discovery (sync first)
            </button>
          </div>
          <form class="demo-search-form" @submit.prevent="submitSearch">
            <label for="query">Query</label>
            <input
              id="query"
              v-model="searchForm.query"
              name="query"
              required
              type="text"
              placeholder="e.g. How do metadata filters work?"
            />

            <label for="topK">Top K</label>
            <input
              id="topK"
              v-model.number="searchForm.topK"
              max="20"
              min="1"
              name="topK"
              type="number"
            />

            <label for="scoreThreshold">Minimum score (0-1)</label>
            <input
              id="scoreThreshold"
              v-model="searchForm.scoreThreshold"
              name="scoreThreshold"
              placeholder="optional"
              type="number"
              step="0.01"
              min="0"
              max="1"
            />

            <label for="kind">Kind filter</label>
            <select id="kind" v-model="searchForm.kind" name="kind">
              <option value="">Any</option>
              <option value="seed">Seed</option>
              <option value="custom">Custom</option>
            </select>

            <label for="source">Source filter</label>
            <input
              id="source"
              v-model="searchForm.source"
              @input="scopeDriver = 'manual filters'"
              :class="{
                'demo-filter-active': searchForm.source.trim().length > 0,
              }"
              name="source"
              placeholder="e.g. guide/demo.md"
              type="text"
            />

            <label for="documentId">Document ID filter</label>
            <input
              id="documentId"
              v-model="searchForm.documentId"
              @input="scopeDriver = 'manual filters'"
              :class="{
                'demo-filter-active': searchForm.documentId.trim().length > 0,
              }"
              name="documentId"
              placeholder="e.g. rag-demo"
              type="text"
            />

            <button type="submit">Search index</button>
          </form>
          <div class="demo-results">
            <h3>Active Retrieval Scope</h3>
            <div class="demo-badge-row">
              <span class="demo-state-chip">{{ retrievalScopeSummary }}</span>
              <span class="demo-state-chip"
                >Changed by:
                {{
                  scopeDriver.replace(/^row action: /, "row action · ")
                }}</span
              >
              <span class="demo-state-chip"
                >Results: {{ searchResults?.count ?? 0 }}</span
              >
            </div>
            <p class="demo-metadata">{{ retrievalScopeHint }}</p>
            <div class="demo-actions">
              <button
                :disabled="
                  searchForm.query.trim().length === 0 &&
                  searchForm.source.trim().length === 0 &&
                  searchForm.documentId.trim().length === 0 &&
                  searchForm.kind.length === 0
                "
                @click="clearRetrievalScope"
                type="button"
              >
                Clear scope
              </button>
              <button
                :disabled="searchForm.query.trim().length === 0"
                @click="rerunLastQuery"
                type="button"
              >
                Rerun query
              </button>
              <button @click="clearAllRetrievalState" type="button">
                Clear search
              </button>
            </div>
            <template v-if="recentQueries.length > 0">
              <p class="demo-section-caption">Recent Searches</p>
              <div class="demo-badge-row">
                <button
                  v-for="entry in recentQueries"
                  :key="`${entry.label}-${entry.state.source}-${entry.state.documentId}-${entry.state.kind}`"
                  class="demo-state-chip"
                  @click="rerunRecentQuery(entry.state)"
                  type="button"
                >
                  {{ entry.label }}
                </button>
              </div>
            </template>
          </div>
          <p v-if="searchError" class="demo-error">{{ searchError }}</p>
          <div v-if="searchResults" class="demo-results">
            <p>
              {{ searchResults.count }} results for “{{ searchResults.query }}”
              in {{ searchResults.elapsedMs }}ms
            </p>
            <p class="demo-metadata">{{ retrievalScopeSummary }}</p>
            <p class="demo-metadata">Scope changed by: {{ scopeDriver }}</p>
            <p class="demo-metadata">
              Reranking is active: AbsoluteJS reorders the first vector hits
              with the built-in heuristic provider before these results render.
            </p>
            <p class="demo-metadata">
              Verification rule: a good result shows chunk text that answers the
              query and a source label you can trace back to the indexed source
              list.
            </p>
            <div
              v-if="searchResults.storyHighlights.length > 0"
              class="demo-results"
            >
              <h3>Retrieval Story</h3>
              <p
                v-for="line in searchResults.storyHighlights"
                :key="`story-${line}`"
                class="demo-metadata"
              >
                {{ line }}
              </p>
            </div>
            <div
              v-if="searchResults.attributionOverview.length > 0"
              class="demo-results"
            >
              <h3>Attribution Overview</h3>
              <p
                v-for="line in searchResults.attributionOverview"
                :key="`attribution-${line}`"
                class="demo-metadata"
              >
                {{ line }}
              </p>
            </div>
            <div
              v-if="searchResults.sectionDiagnostics.length > 0"
              class="demo-results"
            >
              <h3>Section Diagnostics</h3>
              <div class="demo-result-grid">
                <article
                  v-for="diagnostic in searchResults.sectionDiagnostics"
                  :key="`search-diagnostic-${diagnostic.key}`"
                  class="demo-result-item"
                >
                  <h4>{{ diagnostic.label }}</h4>
                  <p class="demo-result-source">{{ diagnostic.summary }}</p>
                  <p class="demo-metadata">
                    {{ formatSectionDiagnosticChannels(diagnostic) }}
                  </p>
                  <p class="demo-metadata">
                    {{ formatSectionDiagnosticAttributionFocus(diagnostic) }}
                  </p>
                  <p class="demo-metadata">
                    {{ formatSectionDiagnosticPipeline(diagnostic) }}
                  </p>
                  <p
                    v-if="formatSectionDiagnosticStageFlow(diagnostic)"
                    class="demo-metadata"
                  >
                    {{ formatSectionDiagnosticStageFlow(diagnostic) }}
                  </p>
                  <p
                    v-if="formatSectionDiagnosticStageBounds(diagnostic)"
                    class="demo-metadata"
                  >
                    {{ formatSectionDiagnosticStageBounds(diagnostic) }}
                  </p>
                  <p
                    v-for="line in formatSectionDiagnosticStageWeightRows(
                      diagnostic,
                    )"
                    :key="`${diagnostic.key}-${line}-stage`"
                    class="demo-metadata"
                  >
                    {{ line }}
                  </p>
                  <p class="demo-metadata">
                    {{ formatSectionDiagnosticTopEntry(diagnostic) }}
                  </p>
                  <p
                    v-if="formatSectionDiagnosticCompetition(diagnostic)"
                    class="demo-metadata"
                  >
                    {{ formatSectionDiagnosticCompetition(diagnostic) }}
                  </p>
                  <div
                    v-if="formatSectionDiagnosticReasons(diagnostic).length > 0"
                    class="demo-badge-row"
                  >
                    <span
                      v-for="reason in formatSectionDiagnosticReasons(
                        diagnostic,
                      )"
                      :key="`${diagnostic.key}-${reason}`"
                      class="demo-state-chip"
                      >{{ reason }}</span
                    >
                    <span
                      v-for="reason in formatSectionDiagnosticStageWeightReasons(
                        diagnostic,
                      )"
                      :key="`${diagnostic.key}-${reason}-stage`"
                      class="demo-state-chip"
                      >{{ reason }}</span
                    >
                  </div>
                  <p
                    v-for="line in formatSectionDiagnosticDistributionRows(
                      diagnostic,
                    )"
                    :key="`${diagnostic.key}-${line}`"
                    class="demo-metadata"
                  >
                    {{ line }}
                  </p>
                </article>
              </div>
            </div>
            <div class="demo-result-grid">
              <article
                v-for="group in searchSectionGroups"
                :id="group.targetId"
                :key="group.id"
                class="demo-result-item"
              >
                <h3>{{ group.label }}</h3>
                <p class="demo-result-source">{{ group.summary }}</p>
                <div v-if="group.jumps.length > 0" class="demo-badge-row">
                  <a
                    v-for="jump in group.jumps"
                    :key="jump.id"
                    class="demo-state-chip"
                    :href="`#${jump.targetId}`"
                    >{{ jump.label }}</a
                  >
                </div>
                <div class="demo-result-grid">
                  <article
                    v-for="chunk in group.chunks"
                    :id="chunk.targetId"
                    :key="chunk.chunkId"
                    class="demo-result-item"
                  >
                    <h4>{{ chunk.title }}</h4>
                    <p class="demo-result-score">
                      score: {{ formatScore(chunk.score) }}
                    </p>
                    <p class="demo-result-source">source: {{ chunk.source }}</p>
                    <p v-if="chunk.labels?.contextLabel" class="demo-metadata">
                      {{ chunk.labels.contextLabel }}
                    </p>
                    <p v-if="chunk.labels?.locatorLabel" class="demo-metadata">
                      {{ chunk.labels.locatorLabel }}
                    </p>
                    <p
                      v-if="chunk.labels?.provenanceLabel"
                      class="demo-metadata"
                    >
                      {{ chunk.labels.provenanceLabel }}
                    </p>
                    <p
                      v-for="line in formatDemoMetadataSummary(chunk.metadata)"
                      :key="line"
                      class="demo-metadata"
                    >
                      {{ line }}
                    </p>
                    <p class="demo-result-text">{{ chunk.text }}</p>
                  </article>
                </div>
              </article>
            </div>
          </div>

          <div class="demo-results">
            <h3>Benchmark Retrieval</h3>
            <p class="demo-metadata">
              This section uses <code>useRAG().evaluate</code> to run a built-in
              benchmark suite. Each case names the source we expect retrieval to
              surface so you can compare expected, retrieved, and missing
              evidence directly.
            </p>
            <p
              v-for="line in attributionBenchmarkNotes"
              :key="`benchmark-note-${line}`"
              class="demo-metadata"
            >
              {{ line }}
            </p>
            <div class="demo-badge-row">
              <span
                v-for="entry in benchmarkOutcomeRail"
                :key="`benchmark-rail-${entry.id}`"
                class="demo-state-chip"
                :title="entry.summary"
                >{{
                  formatBenchmarkOutcomeRailLabel(entry, benchmarkPresetId)
                }}</span
              >
            </div>
            <div class="demo-preset-grid">
              <button
                v-for="preset in demoEvaluationPresets"
                :key="preset.id"
                type="button"
                :title="preset.description"
                @click="
                  runPresetSearch(
                    preset.query,
                    { source: preset.expectedSources[0] ?? '' },
                    `benchmark preset: ${preset.label}`,
                    preset.id,
                  )
                "
              >
                {{ preset.label }}
              </button>
            </div>
            <div class="demo-actions">
              <button
                type="button"
                :disabled="rag.evaluate.isEvaluating.value"
                @click="runEvaluation"
              >
                {{
                  rag.evaluate.isEvaluating.value
                    ? "Running benchmark suite..."
                    : "Run benchmark suite"
                }}
              </button>
            </div>
            <p v-if="evaluationMessage" class="demo-metadata">
              {{ evaluationMessage }}
            </p>
            <p v-if="rag.evaluate.error.value" class="demo-error">
              {{ rag.evaluate.error.value }}
            </p>
            <template v-if="evaluation">
              <p class="demo-metadata">
                Benchmark summary: {{ formatEvaluationSummary(evaluation) }}
              </p>
              <div class="demo-result-grid">
                <article
                  v-for="entry in evaluation.cases"
                  :key="entry.caseId"
                  :class="[
                    'demo-result-item',
                    'demo-evaluation-card',
                    `demo-evaluation-${entry.status}`,
                  ]"
                >
                  <h4>{{ entry.label ?? entry.caseId }}</h4>
                  <p class="demo-result-source">{{ entry.query }}</p>
                  <p class="demo-evaluation-status">
                    {{ entry.status.toUpperCase() }}
                  </p>
                  <p class="demo-metadata">
                    {{ formatEvaluationCaseSummary(entry) }}
                  </p>
                  <p class="demo-metadata">
                    expected: {{ formatEvaluationExpected(entry) }}
                  </p>
                  <p class="demo-metadata">
                    retrieved: {{ formatEvaluationRetrieved(entry) }}
                  </p>
                  <p class="demo-result-text">
                    missing: {{ formatEvaluationMissing(entry) }}
                  </p>
                </article>
              </div>
            </template>
          </div>

          <div class="demo-results">
            <h3>Retrieval Quality Tooling</h3>
            <p class="demo-metadata">
              This section now behaves like an evaluation dashboard instead of a
              log dump. The summary cards answer who is winning, the strategy
              tab shows why, the grounding tab keeps case drill-downs collapsed
              until needed, and the history tab only expands when you want
              regression detail.
            </p>
            <div class="demo-pill-row">
              <span
                v-for="suite in rag.evaluate.suites.value.length > 0
                  ? rag.evaluate.suites.value
                  : [evaluationSuite]"
                :key="suite.id"
                class="demo-pill"
                >{{ suite.label ?? suite.id }} ·
                {{ suite.input.cases.length }} cases</span
              >
            </div>
            <div class="demo-actions">
              <button
                :disabled="rag.evaluate.isEvaluating.value"
                @click="runSavedSuite"
                type="button"
              >
                {{
                  rag.evaluate.isEvaluating.value
                    ? "Running saved suite..."
                    : "Run saved suite"
                }}
              </button>
            </div>
            <div class="demo-tab-row">
              <button
                v-for="view in qualityViews"
                :key="view"
                :class="
                  qualityView === view ? 'demo-tab demo-tab-active' : 'demo-tab'
                "
                @click="qualityView = view"
                type="button"
              >
                {{ view[0].toUpperCase() + view.slice(1) }}
              </button>
            </div>
            <div class="demo-stat-grid">
              <article class="demo-stat-card">
                <span class="demo-stat-label">Saved suite leader</span>
                <strong>{{
                  rag.evaluate.leaderboard.value[0]?.label ??
                  "Run the saved suite"
                }}</strong>
                <p>
                  {{
                    rag.evaluate.leaderboard.value[0]
                      ? formatEvaluationLeaderboardEntry(
                          rag.evaluate.leaderboard.value[0],
                        )
                      : "The leaderboard will rank repeated workflow benchmark runs."
                  }}
                </p>
              </article>
              <article class="demo-stat-card">
                <span class="demo-stat-label">Retrieval winner</span>
                <strong>{{
                  qualityData
                    ? formatRetrievalComparisonOverviewPresentation(
                        qualityData.retrievalComparison,
                      ).winnerLabel
                    : "Loading comparison"
                }}</strong>
                <p>
                  {{
                    qualityData
                      ? formatRetrievalComparisonOverviewPresentation(
                          qualityData.retrievalComparison,
                        ).summary
                      : "Running retrieval comparison..."
                  }}
                </p>
              </article>
              <article class="demo-stat-card">
                <span class="demo-stat-label">Reranker winner</span>
                <strong>{{
                  qualityData
                    ? formatRerankerComparisonOverviewPresentation(
                        qualityData.rerankerComparison,
                      ).winnerLabel
                    : "Loading comparison"
                }}</strong>
                <p>
                  {{
                    qualityData
                      ? formatRerankerComparisonOverviewPresentation(
                          qualityData.rerankerComparison,
                        ).summary
                      : "Running reranker comparison..."
                  }}
                </p>
              </article>
              <article class="demo-stat-card">
                <span class="demo-stat-label">Grounding winner</span>
                <strong>{{
                  qualityData?.providerGroundingComparison
                    ? formatGroundingProviderOverviewPresentation(
                        qualityData.providerGroundingComparison,
                      ).winnerLabel
                    : "Stored workflow evaluation"
                }}</strong>
                <p>
                  {{
                    qualityData?.providerGroundingComparison
                      ? formatGroundingProviderOverviewPresentation(
                          qualityData.providerGroundingComparison,
                        ).summary
                      : qualityData
                        ? formatGroundingEvaluationSummary(
                            qualityData.groundingEvaluation,
                          )
                        : "Loading grounding comparison..."
                  }}
                </p>
              </article>
            </div>
            <template v-if="qualityData">
              <div v-if="qualityView === 'overview'" class="demo-result-grid">
                <article class="demo-result-item">
                  <h4>Winners at a glance</h4>
                  <div class="demo-key-value-grid">
                    <div
                      v-for="row in formatQualityOverviewPresentation({
                        retrievalComparison: qualityData.retrievalComparison,
                        rerankerComparison: qualityData.rerankerComparison,
                        groundingEvaluation: qualityData.groundingEvaluation,
                        groundingProviderOverview:
                          qualityData.providerGroundingComparison
                            ? formatGroundingProviderOverviewPresentation(
                                qualityData.providerGroundingComparison,
                              )
                            : undefined,
                      }).rows"
                      :key="`${row.label}:${row.value}`"
                      class="demo-key-value-row"
                    >
                      <span>{{ row.label }}</span>
                      <strong>{{ row.value }}</strong>
                    </div>
                  </div>
                </article>
                <article class="demo-result-item">
                  <h4>Why this matters</h4>
                  <div class="demo-insight-stack">
                    <p
                      v-for="insight in formatQualityOverviewNotes()"
                      :key="insight"
                      class="demo-insight-card"
                    >
                      {{ insight }}
                    </p>
                  </div>
                </article>
              </div>
              <template v-if="qualityView === 'strategies'">
                <div class="demo-result-grid">
                  <article
                    v-for="card in formatRetrievalComparisonPresentations(
                      qualityData.retrievalComparison,
                    )"
                    :key="card.id"
                    class="demo-result-item demo-score-card"
                  >
                    <h4>{{ card.label }}</h4>
                    <p class="demo-score-headline">{{ card.summary }}</p>
                    <div class="demo-key-value-grid demo-trace-summary-grid">
                      <div
                        v-for="row in card.traceSummaryRows"
                        :key="`${card.id}-${row.label}`"
                        class="demo-key-value-row"
                      >
                        <span>{{ row.label }}</span>
                        <strong>{{ row.value }}</strong>
                      </div>
                    </div>
                    <details class="demo-collapsible demo-trace-diff">
                      <summary>
                        <span>Trace diff vs leader</span>
                        <strong>{{ card.diffLabel }}</strong>
                      </summary>
                      <div
                        class="demo-collapsible-content demo-trace-diff-grid"
                      >
                        <div
                          v-for="row in card.diffRows"
                          :key="`${card.id}-diff-${row.label}`"
                          class="demo-key-value-row"
                        >
                          <span>{{ row.label }}</span>
                          <strong>{{ row.value }}</strong>
                        </div>
                      </div>
                    </details>
                  </article>
                </div>
                <div class="demo-result-grid">
                  <article
                    v-for="card in formatRerankerComparisonPresentations(
                      qualityData.rerankerComparison,
                    )"
                    :key="card.id"
                    class="demo-result-item demo-score-card"
                  >
                    <h4>{{ card.label }}</h4>
                    <p class="demo-score-headline">{{ card.summary }}</p>
                    <div class="demo-key-value-grid demo-trace-summary-grid">
                      <div
                        v-for="row in card.traceSummaryRows"
                        :key="`${card.id}-${row.label}`"
                        class="demo-key-value-row"
                      >
                        <span>{{ row.label }}</span>
                        <strong>{{ row.value }}</strong>
                      </div>
                    </div>
                    <details class="demo-collapsible demo-trace-diff">
                      <summary>
                        <span>Trace diff vs leader</span>
                        <strong>{{ card.diffLabel }}</strong>
                      </summary>
                      <div
                        class="demo-collapsible-content demo-trace-diff-grid"
                      >
                        <div
                          v-for="row in card.diffRows"
                          :key="`${card.id}-diff-${row.label}`"
                          class="demo-key-value-row"
                        >
                          <span>{{ row.label }}</span>
                          <strong>{{ row.value }}</strong>
                        </div>
                      </div>
                    </details>
                  </article>
                </div>
              </template>
              <template v-if="qualityView === 'grounding'">
                <div class="demo-result-grid">
                  <details
                    v-for="entry in qualityData.groundingEvaluation.cases"
                    :key="`grounding-${entry.caseId}`"
                    class="demo-result-item demo-collapsible"
                  >
                    <summary>
                      <span>{{ entry.label ?? entry.caseId }}</span>
                      <strong>{{
                        formatGroundingEvaluationCase(entry)
                      }}</strong>
                    </summary>
                    <div class="demo-collapsible-content">
                      <p
                        v-for="line in formatGroundingEvaluationDetails(entry)"
                        :key="`${entry.caseId}-${line}`"
                        class="demo-metadata"
                      >
                        {{ line }}
                      </p>
                    </div>
                  </details>
                </div>
                <div
                  v-if="qualityData.providerGroundingComparison"
                  class="demo-result-grid"
                >
                  <article
                    v-for="card in formatGroundingProviderPresentations(
                      qualityData.providerGroundingComparison.entries,
                    )"
                    :key="`provider-grounding-${card.id}`"
                    class="demo-result-item demo-score-card"
                  >
                    <h4>{{ card.label }}</h4>
                    <p class="demo-score-headline">{{ card.summary }}</p>
                  </article>
                  <article class="demo-result-item">
                    <h4>Hardest cases</h4>
                    <div class="demo-pill-row">
                      <span
                        v-for="entry in qualityData.providerGroundingComparison
                          .difficultyLeaderboard"
                        :key="`provider-grounding-difficulty-${entry.caseId}`"
                        class="demo-pill"
                        >{{ formatGroundingCaseDifficultyEntry(entry) }}</span
                      >
                    </div>
                  </article>
                </div>
                <div
                  v-if="qualityData.providerGroundingComparison"
                  class="demo-result-grid"
                >
                  <details
                    v-for="card in formatGroundingProviderCasePresentations(
                      qualityData.providerGroundingComparison.caseComparisons,
                    )"
                    :key="`provider-grounding-case-${card.caseId}`"
                    class="demo-result-item demo-collapsible"
                  >
                    <summary>
                      <span>{{ card.label }}</span>
                      <strong>{{ card.summary }}</strong>
                    </summary>
                    <div class="demo-collapsible-content">
                      <div
                        v-for="row in card.rows"
                        :key="`${card.caseId}-${row.label}`"
                        class="demo-key-value-row"
                      >
                        <span>{{ row.label }}</span
                        ><strong>{{ row.value }}</strong>
                      </div>
                    </div>
                  </details>
                </div>
              </template>
              <template v-if="qualityView === 'history'">
                <div class="demo-result-grid">
                  <details
                    v-for="entry in qualityData.retrievalComparison.entries"
                    :key="`retrieval-history-${entry.retrievalId}`"
                    class="demo-result-item demo-collapsible"
                  >
                    <summary>
                      <span>{{ entry.label }} history</span>
                      <strong>{{
                        formatEvaluationHistorySummary(
                          qualityData.retrievalHistories[entry.retrievalId],
                        )[0] ?? "No runs yet"
                      }}</strong>
                    </summary>
                    <div class="demo-collapsible-content">
                      <div
                        v-for="row in formatEvaluationHistoryRows(
                          qualityData.retrievalHistories[entry.retrievalId],
                        )"
                        :key="`${entry.retrievalId}-${row.label}`"
                        class="demo-key-value-row"
                      >
                        <span>{{ row.label }}</span
                        ><strong>{{ row.value }}</strong>
                      </div>
                      <div class="demo-result-grid">
                        <details
                          v-for="traceCase in formatEvaluationHistoryTracePresentations(
                            qualityData.retrievalHistories[entry.retrievalId],
                          )"
                          :key="`${entry.retrievalId}-trace-${traceCase.caseId}`"
                          class="demo-result-item demo-collapsible"
                        >
                          <summary>
                            <span>{{ traceCase.label }}</span
                            ><strong>{{ traceCase.summary }}</strong>
                          </summary>
                          <div class="demo-collapsible-content">
                            <div
                              v-for="row in traceCase.rows"
                              :key="`${entry.retrievalId}-${traceCase.caseId}-${row.label}`"
                              class="demo-key-value-row"
                            >
                              <span>{{ row.label }}</span
                              ><strong>{{ row.value }}</strong>
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  </details>
                  <details
                    v-for="entry in qualityData.rerankerComparison.entries"
                    :key="`reranker-history-${entry.rerankerId}`"
                    class="demo-result-item demo-collapsible"
                  >
                    <summary>
                      <span>{{ entry.label }} history</span>
                      <strong>{{
                        formatEvaluationHistorySummary(
                          qualityData.rerankerHistories[entry.rerankerId],
                        )[0] ?? "No runs yet"
                      }}</strong>
                    </summary>
                    <div class="demo-collapsible-content">
                      <div
                        v-for="row in formatEvaluationHistoryRows(
                          qualityData.rerankerHistories[entry.rerankerId],
                        )"
                        :key="`${entry.rerankerId}-${row.label}`"
                        class="demo-key-value-row"
                      >
                        <span>{{ row.label }}</span
                        ><strong>{{ row.value }}</strong>
                      </div>
                      <div class="demo-result-grid">
                        <details
                          v-for="traceCase in formatEvaluationHistoryTracePresentations(
                            qualityData.rerankerHistories[entry.rerankerId],
                          )"
                          :key="`${entry.rerankerId}-trace-${traceCase.caseId}`"
                          class="demo-result-item demo-collapsible"
                        >
                          <summary>
                            <span>{{ traceCase.label }}</span
                            ><strong>{{ traceCase.summary }}</strong>
                          </summary>
                          <div class="demo-collapsible-content">
                            <div
                              v-for="row in traceCase.rows"
                              :key="`${entry.rerankerId}-${traceCase.caseId}-${row.label}`"
                              class="demo-key-value-row"
                            >
                              <span>{{ row.label }}</span
                              ><strong>{{ row.value }}</strong>
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  </details>
                  <template v-if="qualityData.providerGroundingComparison">
                    <details
                      v-for="entry in qualityData.providerGroundingComparison
                        .entries"
                      :key="`provider-grounding-history-${entry.providerKey}`"
                      class="demo-result-item demo-collapsible"
                    >
                      <summary>
                        <span>{{ entry.label }} history</span>
                        <strong>{{
                          formatGroundingHistorySummary(
                            qualityData.providerGroundingHistories[
                              entry.providerKey
                            ],
                          )[0] ?? "No runs yet"
                        }}</strong>
                      </summary>
                      <div class="demo-collapsible-content">
                        <p
                          v-for="line in formatGroundingHistoryDetails(
                            qualityData.providerGroundingHistories[
                              entry.providerKey
                            ],
                          )"
                          :key="`${entry.providerKey}-${line}`"
                          class="demo-metadata"
                        >
                          {{ line }}
                        </p>
                        <div class="demo-result-grid">
                          <details
                            v-for="snapshot in formatGroundingHistorySnapshotPresentations(
                              qualityData.providerGroundingHistories[
                                entry.providerKey
                              ],
                            )"
                            :key="`${entry.providerKey}-snapshot-${snapshot.caseId}`"
                            class="demo-result-item demo-collapsible"
                          >
                            <summary>
                              <span>{{ snapshot.label }}</span
                              ><strong>{{ snapshot.summary }}</strong>
                            </summary>
                            <div class="demo-collapsible-content">
                              <div
                                v-for="row in snapshot.rows"
                                :key="`${entry.providerKey}-${snapshot.caseId}-${row.label}`"
                                class="demo-key-value-row"
                              >
                                <span>{{ row.label }}</span
                                ><strong>{{ row.value }}</strong>
                              </div>
                            </div>
                          </details>
                        </div>
                      </div>
                    </details>
                    <details class="demo-result-item demo-collapsible">
                      <summary>
                        <span>Grounding difficulty history</span>
                        <strong>{{
                          formatGroundingDifficultyHistorySummary(
                            qualityData.providerGroundingDifficultyHistory,
                          )[0] ?? "No history yet"
                        }}</strong>
                      </summary>
                      <div class="demo-collapsible-content">
                        <p
                          v-for="line in formatGroundingDifficultyHistoryDetails(
                            qualityData.providerGroundingDifficultyHistory,
                          )"
                          :key="line"
                          class="demo-metadata"
                        >
                          {{ line }}
                        </p>
                      </div>
                    </details>
                  </template>
                </div>
              </template>
            </template>
          </div>

          <div class="demo-results demo-quality-card">
            <h3>Knowledge Base Operations</h3>
            <p v-if="rag.ops.error.value" class="demo-error">
              {{ rag.ops.error.value }}
            </p>
            <ul class="demo-detail-list">
              <li
                v-for="line in formatReadinessSummary(rag.ops.readiness.value)"
                :key="line"
              >
                {{ line }}
              </li>
            </ul>
            <ul class="demo-detail-list">
              <li
                v-for="line in formatHealthSummary(rag.ops.health.value)"
                :key="line"
              >
                {{ line }}
              </li>
            </ul>
            <ul class="demo-detail-list">
              <li
                v-for="line in [
                  ...formatFailureSummary(rag.ops.health.value),
                  ...formatInspectionSummary(rag.ops.health.value),
                  ...formatInspectionSamples(rag.ops.health.value),
                ]"
                :key="line"
              >
                {{ line }}
              </li>
              <li
                v-for="entry in buildInspectionEntries(rag.ops.health.value)"
                :key="entry.id"
              >
                <div class="demo-inspection-action-row">
                  <button
                    type="button"
                    @click="void focusInspectionEntry(entry)"
                  >
                    {{
                      entry.documentId
                        ? `Inspect ${entry.kind}`
                        : "Search source"
                    }}
                    · {{ entry.label }}</button
                  ><a
                    class="demo-inspection-link"
                    :href="buildInspectionEntryHref(selectedMode, entry)"
                    >Open standalone view</a
                  >
                </div>
              </li>
            </ul>
            <div class="demo-result-grid">
              <article class="demo-result-item">
                <h4>Sync Sources</h4>
                <div class="demo-actions">
                  <button @click="syncAllSources" type="button">
                    Sync all sources
                  </button>
                  <button @click="queueBackgroundSync" type="button">
                    Queue background sync
                  </button>
                </div>
                <div class="demo-badge-row">
                  <span
                    v-for="chip in formatSyncDeltaChips(sortedSyncSources)"
                    :key="chip"
                    class="demo-state-chip"
                    >{{ chip.replace(/^sync /, "") }}</span
                  >
                </div>
                <div class="demo-stat-grid">
                  <article
                    v-for="line in syncOverviewLines"
                    :key="`sync-overview-${line}`"
                    class="demo-stat-card"
                  >
                    <span class="demo-stat-label">Sync overview</span>
                    <strong>{{
                      line.includes(":")
                        ? line.slice(0, line.indexOf(":"))
                        : "Sync overview"
                    }}</strong>
                    <p>
                      {{
                        line.includes(":")
                          ? line.slice(line.indexOf(":") + 1).trim()
                          : line
                      }}
                    </p>
                  </article>
                </div>
                <ul class="demo-detail-list">
                  <li
                    v-for="line in sortedSyncSources.length > 0
                      ? sortedSyncSources.flatMap((source) => [
                          formatSyncSourceSummary(source),
                          ...formatSyncSourceDetails(source),
                        ])
                      : ['No sync sources configured yet.']"
                    :key="line"
                  >
                    {{ line }}
                  </li>
                </ul>
                <div class="demo-actions">
                  <template
                    v-for="source in sortedSyncSources"
                    :key="source.id"
                  >
                    <details
                      :class="
                        source.status === 'failed'
                          ? 'demo-sync-action-details demo-sync-action-failed'
                          : 'demo-sync-action-details'
                      "
                      :open="source.status === 'failed'"
                    >
                      <summary>
                        {{ formatSyncSourceCollapsedSummary(source) }}
                      </summary>
                      <div class="demo-sync-action-group">
                        <div class="demo-actions">
                          <button @click="syncSource(source.id)" type="button">
                            Sync {{ source.label }}
                          </button>
                          <button
                            @click="queueBackgroundSourceSync(source.id)"
                            type="button"
                          >
                            Queue {{ source.label }}
                          </button>
                          <template v-if="source.status === 'failed'">
                            <button
                              @click="syncSource(source.id)"
                              type="button"
                            >
                              Retry now
                            </button>
                            <button
                              @click="queueBackgroundSourceSync(source.id)"
                              type="button"
                            >
                              Retry in background
                            </button>
                          </template>
                        </div>
                        <p class="demo-metadata demo-sync-action-meta">
                          {{ formatSyncSourceActionSummary(source) }}
                        </p>
                        <div
                          v-if="formatSyncSourceActionBadges(source).length > 0"
                          class="demo-badge-row"
                        >
                          <span
                            v-for="badge in formatSyncSourceActionBadges(
                              source,
                            )"
                            :key="`${source.id}-${badge}`"
                            class="demo-badge"
                            >{{ badge }}</span
                          >
                        </div>
                      </div>
                    </details>
                  </template>
                </div>
              </article>
              <article class="demo-result-item">
                <h4>Admin Jobs</h4>
                <ul class="demo-detail-list">
                  <li
                    v-for="line in formatAdminJobList(rag.ops.adminJobs.value)
                      .length > 0
                      ? formatAdminJobList(rag.ops.adminJobs.value)
                      : ['No admin jobs recorded yet.']"
                    :key="line"
                  >
                    {{ line }}
                  </li>
                </ul>
              </article>
              <article class="demo-result-item">
                <h4>Recent Admin Actions</h4>
                <ul class="demo-detail-list">
                  <li
                    v-for="line in formatAdminActionList(
                      rag.ops.adminActions.value,
                    ).length > 0
                      ? formatAdminActionList(rag.ops.adminActions.value)
                      : ['No admin actions recorded yet.']"
                    :key="line"
                  >
                    {{ line }}
                  </li>
                </ul>
              </article>
            </div>
          </div>

          <div class="demo-stream-panel">
            <h3>Stream Retrieval Workflow</h3>
            <p class="demo-metadata">
              This page composes <code>useRAG()</code> for the broader demo, and
              this stream section proves the explicit workflow contract through
              <code>useRAG().workflow</code>.
            </p>
            <form class="demo-stream-form" @submit.prevent="submitStreamQuery">
              <label for="stream-model-key">Answer model</label>
              <select id="stream-model-key" v-model="selectedAIModelKey">
                <option v-if="aiModelCatalog.models.length === 0" value="">
                  Configure an AI provider
                </option>
                <option
                  v-for="model in aiModelCatalog.models"
                  :key="model.key"
                  :value="model.key"
                >
                  {{ formatDemoAIModelLabel(model) }}
                </option>
              </select>
              <p class="demo-metadata">
                Model switching stays on the official AbsoluteJS plugin path by
                selecting the provider and model sent with the retrieval stream
                request.
              </p>
              <label for="stream-query">Question</label>
              <input
                id="stream-query"
                v-model="streamPrompt"
                placeholder="e.g. What should I verify after ingesting a new source?"
                type="text"
              />
              <div class="demo-actions">
                <button v-if="!streamBusy" type="submit">
                  Ask with retrieval stream
                </button>
                <button v-else @click="workflow.cancel" type="button">
                  Cancel
                </button>
              </div>
            </form>
            <div class="demo-result-grid">
              <article class="demo-result-item">
                <h4>Workflow Contract</h4>
                <ul class="demo-detail-list">
                  <li>Explicit workflow surface: useRAG().workflow</li>
                  <li>Snapshot stage: {{ workflowState.stage }}</li>
                  <li>Live stage field: {{ streamStage }}</li>
                  <li>Snapshot sources: {{ workflowState.sources.length }}</li>
                  <li>
                    Snapshot running:
                    {{ workflowState.isRunning ? "yes" : "no" }}
                  </li>
                </ul>
              </article>
              <article class="demo-result-item">
                <h4>Workflow Proof</h4>
                <ul class="demo-detail-list">
                  <li>
                    Retrieved: {{ workflowState.hasRetrieved ? "yes" : "no" }}
                  </li>
                  <li>
                    Has sources: {{ workflowState.hasSources ? "yes" : "no" }}
                  </li>
                  <li>Citation count: {{ workflow.citations.value.length }}</li>
                  <li>
                    Grounding coverage: {{ streamGroundedAnswer.coverage }}
                  </li>
                </ul>
              </article>
            </div>
            <div class="demo-stage-row">
              <span
                v-for="stage in streamStages"
                :key="stage"
                :class="[
                  'demo-stage-pill',
                  streamStage === stage ? 'current' : '',
                  isStreamStageComplete(stage, streamStage) ? 'complete' : '',
                ]"
                >{{ stage }}</span
              >
            </div>
            <dl v-if="streamRetrieval" class="demo-stream-stats">
              <div>
                <dt>Retrieval started</dt>
                <dd>
                  {{
                    streamRetrieval.retrievalStartedAt
                      ? formatDate(streamRetrieval.retrievalStartedAt)
                      : "n/a"
                  }}
                </dd>
              </div>
              <div>
                <dt>Retrieval duration</dt>
                <dd>{{ streamRetrieval.retrievalDurationMs ?? 0 }}ms</dd>
              </div>
              <div>
                <dt>Retrieved sources</dt>
                <dd>{{ streamRetrieval.sources.length }}</dd>
              </div>
              <div>
                <dt>Current stage</dt>
                <dd>{{ streamStage }}</dd>
              </div>
            </dl>
            <div v-if="streamRetrieval?.trace" class="demo-results">
              <h4>Workflow Retrieval Trace</h4>
              <p class="demo-metadata">
                This is the retrieval trace attached to the workflow answer
                path. It explains how the answer workflow found evidence before
                grounding and citations were built.
              </p>
              <div class="demo-stat-grid">
                <article
                  v-for="row in workflowTracePresentation.stats"
                  :key="'workflow-trace-stat-' + row.label"
                  class="demo-stat-card"
                >
                  <p class="demo-section-caption">{{ row.label }}</p>
                  <strong>{{ row.value }}</strong>
                </article>
              </div>
              <div class="demo-key-value-list">
                <p
                  v-for="row in workflowTracePresentation.details"
                  :key="'workflow-trace-detail-' + row.label"
                  class="demo-key-value-row"
                >
                  <strong>{{ row.label }}</strong
                  ><span>{{ row.value }}</span>
                </p>
              </div>
              <div class="demo-result-grid">
                <details
                  v-for="(step, index) in workflowTracePresentation.steps"
                  :key="'workflow-trace-' + step.stage + '-' + index"
                  class="demo-collapsible demo-result-item"
                  :open="index === 0"
                >
                  <summary>
                    <strong>{{ index + 1 }}. {{ step.label }}</strong>
                  </summary>
                  <div class="demo-key-value-list">
                    <p
                      v-for="row in step.rows"
                      :key="step.stage + '-' + row.label"
                      class="demo-key-value-row"
                    >
                      <strong>{{ row.label }}</strong>
                      <span>{{ row.value }}</span>
                    </p>
                  </div>
                </details>
              </div>
            </div>
            <p v-if="workflow.error.value" class="demo-error">
              {{ workflow.error.value }}
            </p>
            <div v-if="streamLatestMessage?.thinking" class="demo-stream-block">
              <h4>Thinking</h4>
              <p class="demo-result-text">{{ streamLatestMessage.thinking }}</p>
            </div>
            <div v-if="streamLatestMessage?.content" class="demo-stream-block">
              <h4>Answer</h4>
              <p class="demo-result-text">{{ streamLatestMessage.content }}</p>
            </div>
            <div v-if="streamLatestMessage?.content" class="demo-results">
              <h4>Answer Grounding</h4>
              <p
                :class="[
                  'demo-grounding-badge',
                  `demo-grounding-${streamGroundedAnswer.coverage}`,
                ]"
              >
                {{ formatGroundingCoverage(streamGroundedAnswer.coverage) }}
              </p>
              <ul class="demo-detail-list">
                <li
                  v-for="line in formatGroundingSummary(streamGroundedAnswer)"
                  :key="line"
                >
                  {{ line }}
                </li>
              </ul>
              <div
                v-if="
                  streamGroundedAnswer.parts.some(
                    (part) => part.type === 'citation',
                  )
                "
                class="demo-result-grid"
              >
                <article
                  v-for="(part, index) in streamGroundedAnswer.parts.filter(
                    (part) => part.type === 'citation',
                  )"
                  :key="`${formatGroundedAnswerPartExcerpt(part)}-${index}`"
                  class="demo-result-item demo-grounding-card"
                >
                  <p class="demo-citation-badge">
                    {{ formatGroundingPartReferences(part.referenceNumbers) }}
                  </p>
                  <p
                    v-for="line in formatGroundedAnswerPartDetails(part)"
                    :key="line"
                    class="demo-metadata"
                  >
                    {{ line }}
                  </p>
                  <p class="demo-result-text">
                    {{ formatGroundedAnswerPartExcerpt(part) }}
                  </p>
                </article>
              </div>
            </div>
            <div
              v-if="streamGroundedAnswer.sectionSummaries.length > 0"
              class="demo-results"
            >
              <h4>Grounding by Section</h4>
              <div class="demo-result-grid">
                <article
                  v-for="summary in streamGroundedAnswer.sectionSummaries"
                  :key="summary.key"
                  class="demo-result-item demo-grounding-card"
                >
                  <h3>{{ summary.label }}</h3>
                  <p class="demo-result-source">{{ summary.summary }}</p>
                  <p
                    v-for="line in formatGroundedAnswerSectionSummaryDetails(
                      summary,
                    )"
                    :key="line"
                    class="demo-metadata"
                  >
                    {{ line }}
                  </p>
                  <p class="demo-result-text">
                    {{ formatGroundedAnswerSectionSummaryExcerpt(summary) }}
                  </p>
                </article>
              </div>
            </div>
            <div
              v-if="streamGroundingReferences.length > 0"
              class="demo-results"
            >
              <h4>Grounding Reference Map</h4>
              <p class="demo-metadata">
                Each reference resolves answer citations back to concrete
                evidence with page, sheet, slide, archive, or thread context
                when available.
              </p>
              <div class="demo-result-grid">
                <article
                  v-for="group in streamGroundingReferenceGroups"
                  :id="group.targetId"
                  :key="group.id"
                  class="demo-result-item"
                >
                  <h3>{{ group.label }}</h3>
                  <p class="demo-result-source">{{ group.summary }}</p>
                  <div class="demo-result-grid">
                    <article
                      v-for="reference in group.references"
                      :key="reference.chunkId"
                      class="demo-result-item demo-grounding-card"
                    >
                      <p class="demo-citation-badge">
                        [{{ reference.number }}]
                        {{ formatGroundingReferenceLabel(reference) }}
                      </p>
                      <p class="demo-result-score">
                        {{ formatGroundingReferenceSummary(reference) }}
                      </p>
                      <p
                        v-for="line in formatGroundingReferenceDetails(
                          reference,
                        )"
                        :key="line"
                        class="demo-metadata"
                      >
                        {{ line }}
                      </p>
                      <p class="demo-result-text">
                        {{ formatGroundingReferenceExcerpt(reference) }}
                      </p>
                    </article>
                  </div>
                </article>
              </div>
            </div>
            <div v-if="streamSourceSummaries.length > 0" class="demo-results">
              <h4>Evidence Sources</h4>
              <div class="demo-result-grid">
                <article
                  v-for="group in streamSourceSummaryGroups"
                  :id="group.targetId"
                  :key="group.id"
                  class="demo-result-item"
                >
                  <h3>{{ group.label }}</h3>
                  <p class="demo-result-source">{{ group.summary }}</p>
                  <div class="demo-result-grid">
                    <article
                      v-for="summary in group.summaries"
                      :key="summary.key"
                      class="demo-result-item"
                    >
                      <h4>{{ summary.label }}</h4>
                      <p
                        v-for="line in formatSourceSummaryDetails(summary)"
                        :key="line"
                        class="demo-metadata"
                      >
                        {{ line }}
                      </p>
                      <p class="demo-result-text">{{ summary.excerpt }}</p>
                    </article>
                  </div>
                </article>
              </div>
            </div>
            <div
              v-if="workflow.citations.value.length > 0"
              class="demo-results"
            >
              <h4>Citation Trail</h4>
              <p class="demo-metadata">
                Each citation maps a concrete retrieved chunk to a stable
                reference number you can carry into the answer UI.
              </p>
              <div class="demo-result-grid">
                <article
                  v-for="group in streamCitationGroups"
                  :id="group.targetId"
                  :key="group.id"
                  class="demo-result-item"
                >
                  <h3>{{ group.label }}</h3>
                  <p class="demo-result-source">{{ group.summary }}</p>
                  <div class="demo-result-grid">
                    <article
                      v-for="(citation, index) in group.citations"
                      :key="`${citation.chunkId}-${index}`"
                      class="demo-result-item demo-citation-card"
                    >
                      <p class="demo-citation-badge">
                        [{{ index + 1 }}] {{ formatCitationLabel(citation) }}
                      </p>
                      <p class="demo-result-score">
                        {{ formatCitationSummary(citation) }}
                      </p>
                      <p
                        v-for="line in formatCitationDetails(citation)"
                        :key="line"
                        class="demo-metadata"
                      >
                        {{ line }}
                      </p>
                      <p class="demo-result-text">
                        {{ formatCitationExcerpt(citation) }}
                      </p>
                    </article>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section v-if="activeSection === 'ingest'" class="demo-grid">
        <article class="demo-card">
          <h2>Ingest Document</h2>
          <p class="demo-metadata">
            Add a document, choose its source format and chunking strategy, then
            verify how AbsoluteJS indexes it.
          </p>
          <div class="demo-results">
            <h3>Upload Extracted Fixtures</h3>
            <p class="demo-metadata">
              These buttons use
              <code>useRAG().ingest.ingestUploads</code> directly. Each fixture
              is fetched from the local demo corpus, sent through the published
              upload ingest route, and then verified with a retrieval query
              against the uploaded source path.
            </p>
            <p class="demo-metadata">
              Upload fixtures validate the extractor pipeline immediately. The
              managed document list below stays focused on authored example
              documents, while uploaded binaries are verified through retrieval.
            </p>
            <div class="demo-preset-grid">
              <button
                v-for="preset in demoUploadPresets"
                :key="preset.id"
                :disabled="rag.ingest.isIngesting.value"
                :title="preset.description"
                type="button"
                @click="void ingestDemoUpload(preset)"
              >
                {{ preset.label }}
              </button>
            </div>
            <div class="demo-upload-row">
              <input
                :accept="
                  SUPPORTED_FILE_TYPE_OPTIONS.slice(1)
                    .map((entry) => entry[0])
                    .join(',')
                "
                type="file"
                @change="onUploadFileChange"
              />
              <button
                :disabled="
                  rag.ingest.isIngesting.value || selectedUploadFile === null
                "
                type="button"
                @click="void uploadSelectedFile()"
              >
                Upload file
              </button>
            </div>
            <p v-if="selectedUploadFile" class="demo-metadata">
              Selected file: {{ selectedUploadFile.name }}
            </p>
            <p v-if="uploadError" class="demo-error">{{ uploadError }}</p>
          </div>
          <form class="demo-add-form" @submit.prevent="submitAddDocument">
            <label for="customId">Optional ID</label>
            <input id="customId" v-model="addForm.id" name="id" type="text" />

            <label for="customTitle">Title</label>
            <input
              id="customTitle"
              v-model="addForm.title"
              name="title"
              required
              type="text"
            />

            <label for="customSource">Source</label>
            <input
              id="customSource"
              v-model="addForm.source"
              name="source"
              required
              placeholder="e.g. onboarding-guide.md"
              type="text"
            />

            <label for="customFormat">Source format</label>
            <select id="customFormat" v-model="addForm.format" name="format">
              <option
                v-for="format in demoContentFormats"
                :key="format"
                :value="format"
              >
                {{ formatContentFormat(format) }}
              </option>
            </select>

            <label for="customChunkStrategy">Chunking strategy</label>
            <select
              id="customChunkStrategy"
              v-model="addForm.chunkStrategy"
              name="chunkStrategy"
            >
              <option
                v-for="strategy in demoChunkingStrategies"
                :key="strategy"
                :value="strategy"
              >
                {{ formatChunkStrategy(strategy) }}
              </option>
            </select>

            <label for="customText">Text</label>
            <textarea
              id="customText"
              v-model="addForm.text"
              name="text"
              required
              rows="6"
            ></textarea>

            <button type="submit">Ingest document and rebuild index</button>
          </form>
          <p v-if="addError" class="demo-error">{{ addError }}</p>
        </article>

        <article class="demo-card">
          <h2>Indexed Sources</h2>
          <div class="demo-stat-grid">
            <article class="demo-stat-card">
              <span class="demo-stat-label">Indexed documents</span>
              <strong>{{ filteredDocuments.length }}</strong>
              <p>
                {{
                  filteredDocuments.filter(
                    (document) => document.kind === "seed",
                  ).length
                }}
                seed ·
                {{
                  filteredDocuments.filter(
                    (document) => document.kind === "custom",
                  ).length
                }}
                custom
              </p>
            </article>
          </div>
          <div class="demo-source-filter-row">
            <input
              v-model="documentSearchTerm"
              placeholder="Search indexed sources by title, source, or text"
              type="text"
              @input="documentPage = 1"
            />
            <select v-model="documentTypeFilter" @change="documentPage = 1">
              <option
                v-for="[value, label] in SUPPORTED_FILE_TYPE_OPTIONS"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option>
            </select>
          </div>
          <div class="demo-pagination-row">
            <p class="demo-metadata">
              Showing {{ paginatedDocuments.length }} of
              {{ filteredDocuments.length }} matching documents
            </p>
            <div class="demo-pagination-controls">
              <button
                :disabled="documentPage <= 1"
                type="button"
                @click="documentPage = Math.max(1, documentPage - 1)"
              >
                Prev
              </button>
              <button
                v-for="pageNumber in totalDocumentPages"
                :key="pageNumber"
                :class="
                  pageNumber === documentPage
                    ? 'demo-page-button demo-page-button-active'
                    : 'demo-page-button'
                "
                type="button"
                @click="documentPage = pageNumber"
              >
                {{ pageNumber }}
              </button>
              <button
                :disabled="documentPage >= totalDocumentPages"
                type="button"
                @click="
                  documentPage = Math.min(totalDocumentPages, documentPage + 1)
                "
              >
                Next
              </button>
            </div>
          </div>
          <div class="demo-document-list" id="document-list">
            <p v-if="paginatedDocuments.length === 0" class="demo-metadata">
              No indexed sources match the current filters.
            </p>
            <details
              v-for="doc in paginatedDocuments"
              :key="doc.id"
              class="demo-document-item demo-document-collapsible"
            >
              <summary>
                <div class="demo-document-header">
                  <div>
                    <h3>{{ doc.title }}</h3>
                    <p class="demo-metadata">
                      {{ doc.source }} · {{ doc.kind }} ·
                      {{ doc.chunkCount }} chunk(s)
                    </p>
                  </div>
                  <div class="demo-badge-row">
                    <span class="demo-badge">{{
                      formatContentFormat(doc.format)
                    }}</span>
                    <span class="demo-badge">{{
                      formatChunkStrategy(doc.chunkStrategy)
                    }}</span>
                    <span class="demo-badge"
                      >chunk target {{ doc.chunkSize }} chars</span
                    >
                  </div>
                </div>
              </summary>
              <div class="demo-collapsible-content">
                <div class="demo-actions">
                  <button type="button" @click="inspectChunks(doc.id)">
                    Inspect chunks
                  </button>
                  <button
                    type="button"
                    @click="
                      runPresetSearch(
                        'Source search for ' + doc.source,
                        { source: doc.source },
                        'row action: source ' + doc.source,
                      )
                    "
                  >
                    Search source
                  </button>
                  <button
                    type="button"
                    @click="
                      runPresetSearch(
                        'Explain ' + doc.title,
                        { documentId: doc.id },
                        'row action: document ' + doc.id,
                      )
                    "
                  >
                    Search document
                  </button>
                  <button
                    v-if="doc.kind === 'custom'"
                    type="button"
                    @click="deleteDocument(doc.id)"
                  >
                    Delete
                  </button>
                </div>
                <div class="demo-key-value-grid">
                  <div class="demo-key-value-row">
                    <span>Source</span><strong>{{ doc.source }}</strong>
                  </div>
                  <div class="demo-key-value-row">
                    <span>Created</span
                    ><strong>{{ formatDate(doc.createdAt) }}</strong>
                  </div>
                  <div class="demo-key-value-row">
                    <span>Kind</span><strong>{{ doc.kind }}</strong>
                  </div>
                  <div class="demo-key-value-row">
                    <span>Chunks</span><strong>{{ doc.chunkCount }}</strong>
                  </div>
                  <div
                    v-for="line in formatDemoMetadataSummary(doc.metadata)"
                    :key="line"
                    class="demo-key-value-row"
                  >
                    <span>Metadata</span><strong>{{ line }}</strong>
                  </div>
                </div>
                <p class="demo-document-preview">{{ doc.text }}</p>
                <div class="demo-inline-preview">
                  <p
                    v-if="
                      chunkPreviewLoading &&
                      chunkPreview?.document.id !== doc.id
                    "
                    class="demo-metadata"
                  >
                    Preparing chunk preview...
                  </p>
                  <template
                    v-if="
                      !chunkPreviewLoading &&
                      chunkPreview?.document.id === doc.id
                    "
                  >
                    <p class="demo-section-caption">Chunk Preview</p>
                    <p class="demo-metadata">
                      {{ chunkPreview.document.title }} ·
                      {{
                        formatOptionalContentFormat(
                          chunkPreview.document.format,
                        )
                      }}
                      ·
                      {{
                        formatOptionalChunkStrategy(
                          chunkPreview.document.chunkStrategy,
                        )
                      }}
                      · {{ chunkPreview.chunks.length }} chunk(s)
                    </p>
                    <div
                      v-if="chunkPreviewNavigation?.activeNode"
                      class="demo-chunk-nav"
                    >
                      <div class="demo-chunk-nav-row">
                        <button
                          :disabled="!chunkPreviewNavigation.previousNode"
                          type="button"
                          @click="
                            chunkPreviewNavigation.previousNode &&
                            rag.chunkPreview.selectChunk(
                              chunkPreviewNavigation.previousNode.chunkId,
                            )
                          "
                        >
                          Previous chunk
                        </button>
                        <p class="demo-metadata">
                          {{
                            formatChunkNavigationSectionLabel(
                              chunkPreviewNavigation,
                            )
                          }}
                          ·
                          {{
                            formatChunkNavigationNodeLabel(
                              chunkPreviewNavigation.activeNode,
                            )
                          }}
                        </p>
                        <button
                          :disabled="!chunkPreviewNavigation.nextNode"
                          type="button"
                          @click="
                            chunkPreviewNavigation.nextNode &&
                            rag.chunkPreview.selectChunk(
                              chunkPreviewNavigation.nextNode.chunkId,
                            )
                          "
                        >
                          Next chunk
                        </button>
                      </div>
                      <div
                        v-if="chunkPreviewNavigation.sectionNodes.length > 1"
                        class="demo-chunk-nav-strip"
                      >
                        <button
                          v-for="node in chunkPreviewNavigation.sectionNodes"
                          :key="node.chunkId"
                          :class="
                            node.chunkId === activeChunkPreviewId
                              ? 'demo-chunk-nav-chip demo-chunk-nav-chip-active'
                              : 'demo-chunk-nav-chip'
                          "
                          type="button"
                          @click="rag.chunkPreview.selectChunk(node.chunkId)"
                        >
                          {{ formatChunkNavigationNodeLabel(node) }}
                        </button>
                      </div>
                      <div
                        v-if="
                          chunkPreviewNavigation.parentSection ||
                          chunkPreviewNavigation.siblingSections.length > 0 ||
                          chunkPreviewNavigation.childSections.length > 0
                        "
                        class="demo-chunk-nav-strip"
                      >
                        <button
                          v-if="chunkPreviewNavigation.parentSection"
                          class="demo-chunk-nav-chip"
                          type="button"
                          @click="rag.chunkPreview.selectParentSection()"
                        >
                          Parent ·
                          {{
                            formatChunkSectionGroupLabel(
                              chunkPreviewNavigation.parentSection,
                            )
                          }}
                        </button>
                        <button
                          v-for="section in chunkPreviewNavigation.siblingSections"
                          :key="section.id"
                          class="demo-chunk-nav-chip"
                          type="button"
                          @click="
                            rag.chunkPreview.selectSiblingSection(section.id)
                          "
                        >
                          Sibling · {{ formatChunkSectionGroupLabel(section) }}
                        </button>
                        <button
                          v-for="section in chunkPreviewNavigation.childSections"
                          :key="section.id + ':child'"
                          class="demo-chunk-nav-chip"
                          type="button"
                          @click="
                            rag.chunkPreview.selectChildSection(section.id)
                          "
                        >
                          Child · {{ formatChunkSectionGroupLabel(section) }}
                        </button>
                      </div>
                    </div>
                    <article
                      v-if="activeChunkPreviewSectionDiagnostic"
                      class="demo-result-item"
                    >
                      <h3>Active Section Diagnostic</h3>
                      <p class="demo-result-source">
                        {{ activeChunkPreviewSectionDiagnostic.label }}
                      </p>
                      <p class="demo-metadata">
                        {{ activeChunkPreviewSectionDiagnostic.summary }}
                      </p>
                      <p class="demo-metadata">
                        {{
                          formatSectionDiagnosticChannels(
                            activeChunkPreviewSectionDiagnostic,
                          )
                        }}
                      </p>
                      <p class="demo-metadata">
                        {{
                          formatSectionDiagnosticPipeline(
                            activeChunkPreviewSectionDiagnostic,
                          )
                        }}
                      </p>
                      <p
                        v-if="
                          formatSectionDiagnosticStageFlow(
                            activeChunkPreviewSectionDiagnostic,
                          )
                        "
                        class="demo-metadata"
                      >
                        {{
                          formatSectionDiagnosticStageFlow(
                            activeChunkPreviewSectionDiagnostic,
                          )
                        }}
                      </p>
                      <p
                        v-if="
                          formatSectionDiagnosticStageBounds(
                            activeChunkPreviewSectionDiagnostic,
                          )
                        "
                        class="demo-metadata"
                      >
                        {{
                          formatSectionDiagnosticStageBounds(
                            activeChunkPreviewSectionDiagnostic,
                          )
                        }}
                      </p>
                      <p
                        v-for="line in formatSectionDiagnosticStageWeightRows(
                          activeChunkPreviewSectionDiagnostic,
                        )"
                        :key="`active-section-${line}-stage`"
                        class="demo-metadata"
                      >
                        {{ line }}
                      </p>
                      <p class="demo-metadata">
                        {{
                          formatSectionDiagnosticTopEntry(
                            activeChunkPreviewSectionDiagnostic,
                          )
                        }}
                      </p>
                      <p
                        v-if="
                          formatSectionDiagnosticCompetition(
                            activeChunkPreviewSectionDiagnostic,
                          )
                        "
                        class="demo-metadata"
                      >
                        {{
                          formatSectionDiagnosticCompetition(
                            activeChunkPreviewSectionDiagnostic,
                          )
                        }}
                      </p>
                      <div
                        v-if="
                          formatSectionDiagnosticReasons(
                            activeChunkPreviewSectionDiagnostic,
                          ).length > 0
                        "
                        class="demo-badge-row"
                      >
                        <span
                          v-for="reason in formatSectionDiagnosticReasons(
                            activeChunkPreviewSectionDiagnostic,
                          )"
                          :key="`active-section-${reason}`"
                          class="demo-state-chip"
                          >{{ reason }}</span
                        >
                        <span
                          v-for="reason in formatSectionDiagnosticStageWeightReasons(
                            activeChunkPreviewSectionDiagnostic,
                          )"
                          :key="`active-section-${reason}-stage`"
                          class="demo-state-chip"
                          >{{ reason }}</span
                        >
                      </div>
                      <p
                        v-for="line in formatSectionDiagnosticDistributionRows(
                          activeChunkPreviewSectionDiagnostic,
                        )"
                        :key="`active-section-${line}`"
                        class="demo-metadata"
                      >
                        {{ line }}
                      </p>
                    </article>
                    <div class="demo-result-grid">
                      <article
                        v-for="chunk in chunkPreview.chunks"
                        :key="chunk.chunkId"
                        :class="
                          chunk.chunkId === activeChunkPreviewId
                            ? 'demo-result-item demo-result-item-active'
                            : 'demo-result-item'
                        "
                      >
                        <h3>{{ chunk.chunkId }}</h3>
                        <p class="demo-result-source">
                          source:
                          {{ chunk.source ?? chunkPreview.document.source }}
                        </p>
                        <p class="demo-metadata">
                          chunk index:
                          {{
                            chunkIndexText(chunk, chunkPreview.chunks.length)
                          }}
                        </p>
                        <p class="demo-result-text">{{ chunk.text }}</p>
                      </article>
                    </div>
                  </template>
                </div>
              </div>
            </details>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>
