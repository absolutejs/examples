import { createRAGWorkflow, createRAGClient } from "@absolutejs/rag/client";
import { buildRAGChunkPreviewNavigation } from "@absolutejs/rag/client/ui";
import {
  buildRAGEvaluationLeaderboard,
  runRAGEvaluationSuite,
} from "@absolutejs/rag/client";
import type { RAGEvaluationResponse, RAGRetrievalTrace } from "@absolutejs/rag";
import type {
  AddFormState,
  DemoActiveRetrievalState,
  DemoReleaseOpsResponse,
  DemoReleaseWorkspace,
  DemoRetrievalQualityResponse,
  DemoAIModelCatalogResponse,
  DemoUploadPreset,
  DemoBackendDescriptor,
  DemoBackendMode,
  DemoChunkPreview,
  DemoDocument,
  DemoStatusView,
  SearchFormState,
  SearchResponse,
} from "../../demo-backends";
import {
  buildDemoAIStreamPrompt,
  buildDemoEvaluationSuite,
  buildDemoEvaluationInput,
  buildDemoReleasePanelState,
  buildDemoUploadIngestInput,
  attributionBenchmarkNotes,
  benchmarkOutcomeRail,
  formatBenchmarkOutcomeRailLabel,
  resolveBenchmarkRetrievalPresetId,
  buildSearchResponse,
  buildActiveChunkPreviewSectionDiagnostic,
  buildSearchSectionGroups,
  buildTracePresentation,
  buildSearchPayload,
  buildStatusView,
  getAvailableDemoBackends,
  demoChunkingStrategies,
  demoContentFormats,
  demoEvaluationPresets,
  demoReleaseWorkspaces,
  demoUploadPresets,
  formatAdminActionList,
  formatAdminJobList,
  formatDemoAIModelLabel,
  formatCitationDetails,
  formatCitationExcerpt,
  formatCitationLabel,
  formatCitationSummary,
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
  formatGroundingCaseDifficultyEntry,
  formatGroundingDifficultyHistoryDiff,
  formatGroundingDifficultyHistorySummary,
  formatGroundingDifficultyHistoryDetails,
  formatGroundingHistoryDiff,
  formatGroundingHistoryDetails,
  formatGroundingHistorySnapshotPresentations,
  formatGroundingHistorySummary,
  formatGroundingProviderCasePresentations,
  formatGroundingProviderPresentations,
  formatGroundingProviderOverviewPresentation,
  formatQualityOverviewPresentation,
  formatQualityOverviewNotes,
  formatRetrievalComparisonOverviewPresentation,
  buildCitationGroups,
  buildGroundingReferenceGroups,
  buildSourceSummarySectionGroups,
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
  formatRerankerComparisonPresentations,
  formatRerankerComparisonOverviewPresentation,
  formatRerankerComparisonSummary,
  formatHealthSummary,
  formatReadinessSummary,
  formatRetrievalScopeHint,
  formatRetrievalScopeSummary,
  formatScore,
  loadActiveRetrievalState,
  loadRecentQueries,
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
  getDemoUploadFixtureUrl,
  getInitialBackendMode,
  saveActiveRetrievalState,
  saveRecentQueries,
  navigateToBackendMode,
  getDemoPagePath,
} from "../../demo-backends";

type DemoRagReadinessState = {
  status: "warming" | "ready" | "failed";
  label: string;
  detail: string;
  elapsedMs: number;
  className: string;
};

const toNumber = (value: string, fallback: number) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const toSafeText = (value: string | null, fallback = "") =>
  value === null ? fallback : value.trim();
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

const getElement = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing demo element: #${id}`);
  }
  return element as T;
};

const getOptionalElement = <T extends HTMLElement>(id: string) => {
  return document.getElementById(id) as T | null;
};

const statusBackendEl = getElement<HTMLSpanElement>("status-table");
const statusModeEl = getElement<HTMLSpanElement>("status-mode");
const statusDimensionsEl = getElement<HTMLSpanElement>("status-vector-rows");
const statusNativeEnabledEl = getElement<HTMLSpanElement>(
  "status-native-enabled",
);
const statusResolutionEl = getElement<HTMLSpanElement>("status-native-rows");
const statusDocumentsEl = getElement<HTMLSpanElement>("status-seed-chunk-size");
const statusChunkTotalEl = getElement<HTMLSpanElement>("status-document-total");
const statusSeedCountEl = getElement<HTMLSpanElement>("status-total-chunks");
const statusCustomCountEl =
  getOptionalElement<HTMLSpanElement>("status-last-seed");
const statusCapabilitiesEl = getElement<HTMLSpanElement>("status-native-path");
const statusModeSummaryEl = getElement<HTMLParagraphElement>(
  "status-mode-summary",
);
const statusMessageEl = getElement<HTMLParagraphElement>(
  "status-native-install-hint",
);
const headerNavEl = getElement<HTMLElement>("header-nav");
const presetContainerEl = getElement<HTMLDivElement>("search-presets");
const messageEl = getElement<HTMLParagraphElement>("demo-message");
const loadingEl = getElement<HTMLParagraphElement>("demo-loading");
const restoredEl = getElement<HTMLParagraphElement>("demo-restored");
const ragSectionCardGridEl = getElement<HTMLDivElement>(
  "rag-section-card-grid",
);
const ragSectionOverviewEl = getElement<HTMLElement>("rag-section-overview");
const syncFeedbackPanelEl = getElement<HTMLElement>("sync-feedback-panel");
const searchErrorEl = getElement<HTMLParagraphElement>("search-error");
const addErrorEl = getElement<HTMLParagraphElement>("add-error");
const searchResultsWrapper = getElement<HTMLDivElement>("search-results");
const searchResultGrid = getElement<HTMLDivElement>("search-result-grid");
const searchCountEl = getElement<HTMLParagraphElement>("search-count");
const searchMetaEl = getElement<HTMLParagraphElement>("search-meta");
const searchScopeSummaryEl = getElement<HTMLParagraphElement>(
  "search-scope-summary",
);
const searchScopeHintEl = getElement<HTMLParagraphElement>("search-scope-hint");
const evaluationPresetContainerEl =
  getElement<HTMLDivElement>("evaluation-presets");
const uploadPresetContainerEl = getElement<HTMLDivElement>("upload-presets");
const uploadStatusEl = getElement<HTMLDivElement>("upload-status");
const ragReadinessBadgeEl = getElement<HTMLDivElement>("rag-readiness-badge");
const uploadFileInputEl = getElement<HTMLInputElement>("upload-file-input");
const uploadFileButtonEl = getElement<HTMLButtonElement>("upload-file-btn");
const uploadFileSelectionEl = getElement<HTMLParagraphElement>(
  "upload-file-selection",
);
const evaluationButtonEl = getElement<HTMLButtonElement>("evaluate-btn");
const evaluationMessageEl =
  getElement<HTMLParagraphElement>("evaluation-message");
const evaluationErrorEl = getElement<HTMLParagraphElement>("evaluation-error");
const evaluationResultsEl = getElement<HTMLDivElement>("evaluation-results");
const qualitySuiteListEl = getElement<HTMLDivElement>("quality-suite-list");
const qualitySuiteButtonEl = getElement<HTMLButtonElement>("quality-suite-btn");
const qualityTabRowEl = getElement<HTMLDivElement>("quality-tab-row");
const qualityStatGridEl = getElement<HTMLDivElement>("quality-stat-grid");
const qualityComparisonGridEl = getElement<HTMLDivElement>(
  "quality-comparison-grid",
);
const releaseBannerEl = getElement<HTMLParagraphElement>("release-banner");
const releaseSummaryEl = getElement<HTMLParagraphElement>("release-summary");
const releaseDecisionMetaEl = getElement<HTMLParagraphElement>(
  "release-decision-meta",
);
const releasePillRowEl = getElement<HTMLDivElement>("release-pill-row");
const releaseScenarioSwitcherEl = getElement<HTMLDivElement>(
  "release-scenario-switcher",
);
const releasePathRowEl = getElement<HTMLDivElement>("release-path-row");
const releaseActionRowEl = getElement<HTMLDivElement>("release-action-row");
const releaseStatGridEl = getElement<HTMLDivElement>("release-stat-grid");
const releasePrimaryGridEl = getElement<HTMLDivElement>("release-primary-grid");
const releaseSecondaryGridEl = getElement<HTMLDivElement>(
  "release-secondary-grid",
);
const documentListEl = getElement<HTMLElement>("document-list");
const documentCountTotalEl = getElement<HTMLElement>("document-count-total");
const documentCountBreakdownEl = getElement<HTMLElement>(
  "document-count-breakdown",
);
const documentSearchEl = getElement<HTMLInputElement>("document-search");
const documentTypeFilterEl = getElement<HTMLSelectElement>(
  "document-type-filter",
);
const documentPaginationSummaryEl = getElement<HTMLParagraphElement>(
  "document-pagination-summary",
);
const documentPaginationControlsEl = getElement<HTMLDivElement>(
  "document-pagination-controls",
);
const searchForm = getElement<HTMLFormElement>("search-form");
const addForm = getElement<HTMLFormElement>("add-form");
const streamForm = getElement<HTMLFormElement>("stream-form");
const streamModelKeyEl = getElement<HTMLSelectElement>("stream-model-key");
const streamQueryInput = getElement<HTMLInputElement>("stream-query");
const streamActionButton = getElement<HTMLButtonElement>("stream-action-btn");
const streamStageRow = getElement<HTMLDivElement>("stream-stage-row");
const streamStatsEl = getElement<HTMLDListElement>("stream-stats");
const streamTraceEl = getElement<HTMLDivElement>("stream-trace");
const streamTraceGridEl = getElement<HTMLDivElement>("stream-trace-grid");
const streamErrorEl = getElement<HTMLParagraphElement>("stream-error");
const streamThinkingEl = getElement<HTMLDivElement>("stream-thinking");
const streamThinkingTextEl = getElement<HTMLParagraphElement>(
  "stream-thinking-text",
);
const streamAnswerEl = getElement<HTMLDivElement>("stream-answer");
const streamAnswerTextEl =
  getElement<HTMLParagraphElement>("stream-answer-text");
const streamGroundingEl = getElement<HTMLDivElement>("stream-grounding");
const streamGroundingBadgeEl = getElement<HTMLParagraphElement>(
  "stream-grounding-badge",
);
const streamGroundingListEl = getElement<HTMLUListElement>(
  "stream-grounding-list",
);
const streamGroundingPartsEl = getElement<HTMLDivElement>(
  "stream-grounding-parts",
);
const streamGroundingSectionsEl = getElement<HTMLDivElement>(
  "stream-grounding-sections",
);
const streamGroundingSectionsGridEl = getElement<HTMLDivElement>(
  "stream-grounding-sections-grid",
);
const streamGroundingReferencesEl = getElement<HTMLDivElement>(
  "stream-grounding-references",
);
const streamGroundingReferencesGridEl = getElement<HTMLDivElement>(
  "stream-grounding-references-grid",
);
const streamSourcesEl = getElement<HTMLDivElement>("stream-sources");
const streamSourcesGridEl = getElement<HTMLDivElement>("stream-sources-grid");
const streamCitationsEl = getElement<HTMLDivElement>("stream-citations");
const streamCitationsGridEl = getElement<HTMLDivElement>(
  "stream-citations-grid",
);
const streamContractListEl = getElement<HTMLUListElement>(
  "stream-contract-list",
);
const streamProofListEl = getElement<HTMLUListElement>("stream-proof-list");
const opsErrorEl = getElement<HTMLParagraphElement>("ops-error");
const opsReadinessListEl = getElement<HTMLUListElement>("ops-readiness-list");
const opsHealthListEl = getElement<HTMLUListElement>("ops-health-list");
const opsFailureListEl = getElement<HTMLUListElement>("ops-failure-list");
const opsSyncSummaryListEl = getElement<HTMLUListElement>(
  "ops-sync-summary-list",
);
const opsSyncSourcesListEl = getElement<HTMLUListElement>(
  "ops-sync-sources-list",
);
const opsSyncActionsEl = getElement<HTMLDivElement>("ops-sync-actions");
const opsAdminJobsListEl = getElement<HTMLUListElement>("ops-admin-jobs-list");
const opsAdminActionsListEl = getElement<HTMLUListElement>(
  "ops-admin-actions-list",
);
const syncAllButton = getElement<HTMLButtonElement>("sync-all-btn");
const syncAllBackgroundButton = getElement<HTMLButtonElement>(
  "sync-all-background-btn",
);
const reseedButton = getElement<HTMLButtonElement>("reseed-btn");
const resetButton = getElement<HTMLButtonElement>("reset-btn");
const refreshButton = getElement<HTMLButtonElement>("refresh-btn");
const stateScopeChipEl = getElement<HTMLButtonElement>("state-scope-chip");
const stateDriverChipEl = getElement<HTMLButtonElement>("state-driver-chip");
const stateRerunChipEl = getElement<HTMLButtonElement>("state-rerun-chip");
const stateClearChipEl = getElement<HTMLButtonElement>("state-clear-chip");
const stateResultsChipEl = getElement<HTMLSpanElement>("state-results-chip");
const stateSyncRowEl = getElement<HTMLDivElement>("state-sync-row");
const stateRecentRowEl = getElement<HTMLDivElement>("state-recent-row");
let ragReadinessTimer: ReturnType<typeof setTimeout> | null = null;
let ragReadinessRequest = 0;
let selectedMode: DemoBackendMode = getInitialBackendMode();
type RagExampleSection =
  | "overview"
  | "retrieve"
  | "ingest"
  | "workflow"
  | "connectors"
  | "evaluate"
  | "ops";
let activeSection: RagExampleSection = "overview";
let hasLoadedActiveSectionData = false;
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
let backendOptions: DemoBackendDescriptor[] = getAvailableDemoBackends();
let activeRagPath = getRAGPathForMode(selectedMode);
let documentsCache: DemoDocument[] = [];
let chunkPreview: DemoChunkPreview | null = null;
let chunkPreviewActiveChunkId: string | null = null;
let chunkPreviewLoadingDocumentId: string | null = null;
let evaluationResponse: RAGEvaluationResponse | null = null;
const evaluationSuite = buildDemoEvaluationSuite();
let suiteRuns: Array<Awaited<ReturnType<typeof runRAGEvaluationSuite>>> = [];
let qualityData: DemoRetrievalQualityResponse | null = null;
let releaseData: DemoReleaseOpsResponse | null = null;
let releaseActionBusyId: string | null = null;
let releaseWorkspace: DemoReleaseWorkspace = "alpha";
let qualityView: "overview" | "strategies" | "grounding" | "history" =
  "overview";
let aiModelCatalog: DemoAIModelCatalogResponse = {
  defaultModelKey: null,
  models: [],
};
let scopeDriver = "manual filters";
let activeNativeQueryProfile: SearchFormState["nativeQueryProfile"] = "";
let recentQueries: Array<{ label: string; state: SearchFormState }> = [];
let restoredSharedState = false;
let restoredSharedStateSummary = "";
let retrievalPresetId = "";
let benchmarkPresetId = "";
let uploadPresetId = "";
let selectedUploadFile: File | null = null;
let documentPage = 1;
let ragClient = createRAGClient({ path: activeRagPath });
let ragWorkflow = createRAGWorkflow(activeRagPath);
let unsubscribeStream = () => {};
const streamStages = [
  "submitting",
  "retrieving",
  "retrieved",
  "streaming",
  "complete",
] as const;

const showMessage = (value: string) => {
  messageEl.textContent = value;
  messageEl.hidden = value.length === 0;
};

const showLoading = (value: string) => {
  loadingEl.textContent = value;
  loadingEl.hidden = value.length === 0;
};

const renderSectionCards = () => {
  ragSectionCardGridEl.innerHTML = "";
  for (const section of ragExampleSections) {
    const button = document.createElement("button");
    button.className =
      activeSection === section.id
        ? "demo-section-card demo-section-card-active"
        : "demo-section-card";
    button.type = "button";
    button.innerHTML = `<span>${section.kicker}</span><strong>${section.title}</strong><p>${section.description}</p><small>${activeSection === section.id ? "Loaded" : section.loadLabel}</small>`;
    button.addEventListener("click", () => {
      activeSection = section.id;
      renderSectionCards();
      applyActiveSection();
    });
    ragSectionCardGridEl.append(button);
  }
};

const applyActiveSection = () => {
  ragSectionOverviewEl.classList.toggle(
    "demo-section-hidden",
    activeSection !== "overview",
  );
  syncFeedbackPanelEl.classList.toggle(
    "demo-section-hidden",
    activeSection === "overview",
  );
  for (const section of document.querySelectorAll<HTMLElement>(
    "[data-rag-section]",
  )) {
    const lane = section.dataset.ragSection;
    section.classList.toggle(
      "demo-section-hidden",
      activeSection === "overview" ||
        (lane === "ingest"
          ? activeSection !== "ingest"
          : activeSection === "ingest"),
    );
  }
  if (activeSection !== "overview" && !hasLoadedActiveSectionData) {
    hasLoadedActiveSectionData = true;
    void refreshData();
  }
};

const renderStateChips = () => {
  const state = readSearchFormState();
  stateScopeChipEl.textContent = formatRetrievalScopeSummary(state);
  stateDriverChipEl.textContent = `Changed by: ${scopeDriver.replace(/^row action: /, "row action · ")}`;
  stateRerunChipEl.disabled = state.query.trim().length === 0;
  stateResultsChipEl.textContent = `Results: ${searchResultsWrapper.hidden ? 0 : searchResultGrid.childElementCount}`;
  restoredEl.textContent = restoredSharedStateSummary;
  restoredEl.hidden = !restoredSharedState;
  stateRecentRowEl.innerHTML = "";
  for (const entry of recentQueries) {
    const button = document.createElement("button");
    button.className = "demo-state-chip";
    button.type = "button";
    button.textContent = entry.label;
    button.addEventListener("click", () => {
      void rerunRecentQuery(entry.state);
    });
    stateRecentRowEl.append(button);
  }
};

const clearRetrievalScope = async () => {
  scopeDriver = "chip reset";
  fillSearchForm({ kind: "", source: "", documentId: "" });
  void saveActiveRetrievalState("html", selectedMode, {
    searchForm: readSearchFormState(),
    scopeDriver,
    lastUpdatedAt: Date.now(),
    retrievalPresetId: retrievalPresetId || undefined,
    benchmarkPresetId: benchmarkPresetId || undefined,
    uploadPresetId: uploadPresetId || undefined,
  });
  if (readSearchFormState().query.trim().length > 0) {
    setError(searchErrorEl, "");
    hideSearchResults();
    await runSearchFromValues(readSearchForm());
  }
};

const clearAllRetrievalState = () => {
  scopeDriver = "clear all state";
  fillSearchForm({
    query: "",
    kind: "",
    source: "",
    documentId: "",
    scoreThreshold: "",
  });
  void saveActiveRetrievalState("html", selectedMode, {
    searchForm: readSearchFormState(),
    scopeDriver,
    lastUpdatedAt: Date.now(),
    retrievalPresetId: retrievalPresetId || undefined,
    benchmarkPresetId: benchmarkPresetId || undefined,
    uploadPresetId: uploadPresetId || undefined,
  });
  hideSearchResults();
  setError(searchErrorEl, "");
};

const rerunLastQuery = async () => {
  const state = readSearchFormState();
  if (state.query.trim().length === 0) return;
  scopeDriver = "rerun last query";
  renderSearchScope();
  setError(searchErrorEl, "");
  hideSearchResults();
  await runSearchFromValues(state);
};

const rerunRecentQuery = async (state: SearchFormState) => {
  fillSearchForm(state);
  scopeDriver = "recent query";
  void saveActiveRetrievalState("html", selectedMode, {
    searchForm: readSearchFormState(),
    scopeDriver,
    lastUpdatedAt: Date.now(),
    retrievalPresetId: retrievalPresetId || undefined,
    benchmarkPresetId: benchmarkPresetId || undefined,
    uploadPresetId: uploadPresetId || undefined,
  });
  renderSearchScope();
  setError(searchErrorEl, "");
  hideSearchResults();
  await runSearchFromValues(state);
};

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

const isStreamBusy = () => {
  return ragWorkflow.isRunning;
};

const setError = (el: HTMLParagraphElement, value: string) => {
  el.textContent = value;
  el.hidden = value.length === 0;
};

const renderDetailList = (
  el: HTMLUListElement,
  lines: string[],
  fallback: string,
) => {
  el.innerHTML = "";
  for (const line of lines.length > 0 ? lines : [fallback]) {
    const item = document.createElement("li");
    item.textContent = line;
    el.append(item);
  }
};

const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const renderRagReadinessBadge = (state: DemoRagReadinessState | null) => {
  if (state === null) {
    ragReadinessBadgeEl.className = "demo-metadata";
    ragReadinessBadgeEl.textContent = "Loading RAG readiness...";
    return;
  }
  ragReadinessBadgeEl.className = `demo-rag-readiness ${state.className}`;
  ragReadinessBadgeEl.innerHTML = `<strong>${escapeHtml(state.label)}</strong><span>${escapeHtml(state.detail)}</span>`;
};

const loadRagReadiness = async () => {
  const requestId = ++ragReadinessRequest;
  if (ragReadinessTimer !== null) {
    clearTimeout(ragReadinessTimer);
    ragReadinessTimer = null;
  }
  try {
    const response = await fetch(`/demo/rag-readiness/${selectedMode}/json`);
    const next = (await response.json()) as DemoRagReadinessState;
    if (requestId !== ragReadinessRequest) {
      return;
    }
    renderRagReadinessBadge(next);
    if (next.status === "warming") {
      ragReadinessTimer = setTimeout(() => {
        void loadRagReadiness();
      }, 2000);
    }
  } catch {
    if (requestId !== ragReadinessRequest) {
      return;
    }
    renderRagReadinessBadge({
      className: "demo-rag-readiness-failed",
      detail: "Unable to load RAG readiness.",
      elapsedMs: 0,
      label: "RAG Failed",
      status: "failed",
    });
  }
};

const renderQualityState = () => {
  qualitySuiteListEl.innerHTML = `<span class="demo-pill">${escapeHtml(`${evaluationSuite.label ?? evaluationSuite.id} · ${evaluationSuite.input.cases.length} cases`)}</span>`;
  qualityTabRowEl.innerHTML = ["overview", "strategies", "grounding", "history"]
    .map(
      (view) =>
        `<button class="${qualityView === view ? "demo-tab demo-tab-active" : "demo-tab"}" data-quality-view="${view}" type="button">${escapeHtml(view[0].toUpperCase() + view.slice(1))}</button>`,
    )
    .join("");
  const leaderboard =
    suiteRuns.length > 0 ? buildRAGEvaluationLeaderboard(suiteRuns) : [];
  qualityStatGridEl.innerHTML = [
    `<article class="demo-stat-card"><span class="demo-stat-label">Saved suite leader</span><strong>${escapeHtml(leaderboard[0]?.label ?? "Run the saved suite")}</strong><p>${escapeHtml(leaderboard[0] ? formatEvaluationLeaderboardEntry(leaderboard[0]) : "The leaderboard will rank repeated workflow benchmark runs.")}</p></article>`,
    `<article class="demo-stat-card"><span class="demo-stat-label">Retrieval winner</span><strong>${escapeHtml(qualityData ? formatRetrievalComparisonOverviewPresentation(qualityData.retrievalComparison).winnerLabel : "Loading comparison")}</strong><p>${escapeHtml(qualityData ? formatRetrievalComparisonOverviewPresentation(qualityData.retrievalComparison).summary : "Running retrieval comparison...")}</p></article>`,
    `<article class="demo-stat-card"><span class="demo-stat-label">Reranker winner</span><strong>${escapeHtml(qualityData ? formatRerankerComparisonOverviewPresentation(qualityData.rerankerComparison).winnerLabel : "Loading comparison")}</strong><p>${escapeHtml(qualityData ? formatRerankerComparisonOverviewPresentation(qualityData.rerankerComparison).summary : "Running reranker comparison...")}</p></article>`,
    `<article class="demo-stat-card"><span class="demo-stat-label">Grounding winner</span><strong>${escapeHtml(qualityData?.providerGroundingComparison ? formatGroundingProviderOverviewPresentation(qualityData.providerGroundingComparison).winnerLabel : "Stored workflow evaluation")}</strong><p>${escapeHtml(qualityData?.providerGroundingComparison ? formatGroundingProviderOverviewPresentation(qualityData.providerGroundingComparison).summary : qualityData ? formatGroundingEvaluationSummary(qualityData.groundingEvaluation) : "Loading grounding comparison...")}</p></article>`,
  ].join("");

  if (!qualityData) {
    qualityComparisonGridEl.innerHTML = "";
    return;
  }

  const nextQualityData = qualityData;
  if (qualityView === "overview") {
    const overview = formatQualityOverviewPresentation({
      retrievalComparison: nextQualityData.retrievalComparison,
      rerankerComparison: nextQualityData.rerankerComparison,
      groundingEvaluation: nextQualityData.groundingEvaluation,
      groundingProviderOverview: nextQualityData.providerGroundingComparison
        ? formatGroundingProviderOverviewPresentation(
            nextQualityData.providerGroundingComparison,
          )
        : undefined,
    });
    qualityComparisonGridEl.innerHTML = [
      `<article class="demo-result-item"><h4>Winners at a glance</h4><div class="demo-key-value-grid">${overview.rows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div></article>`,
      `<article class="demo-result-item"><h4>Why this matters</h4><div class="demo-insight-stack">${formatQualityOverviewNotes()
        .map(
          (insight) =>
            `<p class="demo-insight-card">${escapeHtml(insight)}</p>`,
        )
        .join("")}</div></article>`,
    ].join("");
    return;
  }
  if (qualityView === "strategies") {
    qualityComparisonGridEl.innerHTML = [
      ...formatRetrievalComparisonPresentations(
        nextQualityData.retrievalComparison,
      ).map(
        (card) =>
          `<article class="demo-result-item demo-score-card"><h4>${escapeHtml(card.label)}</h4><p class="demo-score-headline">${escapeHtml(card.summary)}</p><div class="demo-key-value-grid demo-trace-summary-grid">${card.traceSummaryRows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div><details class="demo-collapsible demo-trace-diff"><summary><span>Trace diff vs leader</span><strong>${escapeHtml(card.diffLabel)}</strong></summary><div class="demo-collapsible-content demo-trace-diff-grid">${card.diffRows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div></details></article>`,
      ),
      ...formatRerankerComparisonPresentations(
        nextQualityData.rerankerComparison,
      ).map(
        (card) =>
          `<article class="demo-result-item demo-score-card"><h4>${escapeHtml(card.label)}</h4><p class="demo-score-headline">${escapeHtml(card.summary)}</p><div class="demo-key-value-grid demo-trace-summary-grid">${card.traceSummaryRows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div><details class="demo-collapsible demo-trace-diff"><summary><span>Trace diff vs leader</span><strong>${escapeHtml(card.diffLabel)}</strong></summary><div class="demo-collapsible-content demo-trace-diff-grid">${card.diffRows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div></details></article>`,
      ),
    ].join("");
    return;
  }
  if (qualityView === "grounding") {
    qualityComparisonGridEl.innerHTML = [
      ...nextQualityData.groundingEvaluation.cases.map(
        (entry) =>
          `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(entry.label ?? entry.caseId)}</span><strong>${escapeHtml(formatGroundingEvaluationCase(entry))}</strong></summary><div class="demo-collapsible-content">${formatGroundingEvaluationDetails(
            entry,
          )
            .map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`)
            .join("")}</div></details>`,
      ),
      ...(nextQualityData.providerGroundingComparison
        ? formatGroundingProviderPresentations(
            nextQualityData.providerGroundingComparison.entries,
          ).map(
            (card) =>
              `<article class="demo-result-item demo-score-card"><h4>${escapeHtml(card.label)}</h4><p class="demo-score-headline">${escapeHtml(card.summary)}</p></article>`,
          )
        : []),
      ...(nextQualityData.providerGroundingComparison
        ? [
            `<article class="demo-result-item"><h4>Hardest cases</h4><div class="demo-pill-row">${nextQualityData.providerGroundingComparison.difficultyLeaderboard.map((entry) => `<span class="demo-pill">${escapeHtml(formatGroundingCaseDifficultyEntry(entry))}</span>`).join("")}</div></article>`,
          ]
        : []),
      ...(nextQualityData.providerGroundingComparison
        ? formatGroundingProviderCasePresentations(
            nextQualityData.providerGroundingComparison.caseComparisons,
          ).map(
            (card) =>
              `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(card.label)}</span><strong>${escapeHtml(card.summary)}</strong></summary><div class="demo-collapsible-content">${card.rows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div></details>`,
          )
        : []),
    ].join("");
    return;
  }
  qualityComparisonGridEl.innerHTML = [
    ...nextQualityData.retrievalComparison.entries.map(
      (entry) =>
        `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(entry.label)} history</span><strong>${escapeHtml(formatEvaluationHistorySummary(nextQualityData.retrievalHistories[entry.retrievalId])[0] ?? "No runs yet")}</strong></summary><div class="demo-collapsible-content">${formatEvaluationHistoryRows(
          nextQualityData.retrievalHistories[entry.retrievalId],
        )
          .map(
            (row) =>
              `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`,
          )
          .join(
            "",
          )}<div class="demo-result-grid">${formatEvaluationHistoryTracePresentations(
          nextQualityData.retrievalHistories[entry.retrievalId],
        )
          .map(
            (traceCase) =>
              `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(traceCase.label)}</span><strong>${escapeHtml(traceCase.summary)}</strong></summary><div class="demo-collapsible-content">${traceCase.rows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div></details>`,
          )
          .join("")}</div></div></details>`,
    ),
    ...nextQualityData.rerankerComparison.entries.map(
      (entry) =>
        `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(entry.label)} history</span><strong>${escapeHtml(formatEvaluationHistorySummary(nextQualityData.rerankerHistories[entry.rerankerId])[0] ?? "No runs yet")}</strong></summary><div class="demo-collapsible-content">${formatEvaluationHistoryRows(
          nextQualityData.rerankerHistories[entry.rerankerId],
        )
          .map(
            (row) =>
              `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`,
          )
          .join(
            "",
          )}<div class="demo-result-grid">${formatEvaluationHistoryTracePresentations(
          nextQualityData.rerankerHistories[entry.rerankerId],
        )
          .map(
            (traceCase) =>
              `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(traceCase.label)}</span><strong>${escapeHtml(traceCase.summary)}</strong></summary><div class="demo-collapsible-content">${traceCase.rows.map((row) => `<div class="demo-key-value-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`).join("")}</div></details>`,
          )
          .join("")}</div></div></details>`,
    ),
    ...(nextQualityData.providerGroundingComparison
      ? nextQualityData.providerGroundingComparison.entries.map((entry) => {
          const history =
            nextQualityData.providerGroundingHistories[entry.providerKey];
          return `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(entry.label)} history</span><strong>${escapeHtml(formatGroundingHistorySummary(history)[0] ?? "No runs yet")}</strong></summary><div class="demo-collapsible-content">${formatGroundingHistoryDetails(
            history,
          )
            .map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`)
            .join("")}${
            formatGroundingHistorySnapshotPresentations(history).length
              ? `<div class="demo-result-grid">${formatGroundingHistorySnapshotPresentations(
                  history,
                )
                  .map(
                    (snapshot) =>
                      `<details class="demo-result-item demo-collapsible"><summary><span>${escapeHtml(snapshot.label)}</span><strong>${escapeHtml(snapshot.summary)}</strong></summary><div class="demo-collapsible-content">${snapshot.rows.map((row) => `<p class="demo-key-value-row"><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.value)}</span></p>`).join("")}</div></details>`,
                  )
                  .join("")}</div>`
              : ""
          }</div></details>`;
        })
      : []),
    ...(nextQualityData.providerGroundingComparison
      ? [
          `<details class="demo-result-item demo-collapsible"><summary><span>Grounding difficulty history</span><strong>${escapeHtml(formatGroundingDifficultyHistorySummary(nextQualityData.providerGroundingDifficultyHistory)[0] ?? "No history yet")}</strong></summary><div class="demo-collapsible-content">${formatGroundingDifficultyHistoryDetails(
            nextQualityData.providerGroundingDifficultyHistory,
          )
            .map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`)
            .join("")}</div></details>`,
        ]
      : []),
  ].join("");
};

const runReleaseAction = async (actionId: string) => {
  const releasePanel = buildDemoReleasePanelState(releaseData);
  const action = releasePanel.actions.find((entry) => entry.id === actionId);
  if (!action) {
    return;
  }
  releaseActionBusyId = action.id;
  renderReleaseState();
  try {
    const response = await fetch(action.path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...action.payload, workspace: releaseWorkspace }),
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
    releaseData = payload.release;
    showMessage(
      payload.message ??
        `${action.label} completed through the published AbsoluteJS release-control workflow.`,
    );
  } catch (error) {
    setError(
      addErrorEl,
      error instanceof Error
        ? error.message
        : `Release action ${action.label} failed`,
    );
  } finally {
    releaseActionBusyId = null;
    renderReleaseState();
  }
};

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }
  const workspaceButton = target.closest(
    "[data-release-workspace]",
  ) as HTMLElement | null;
  if (workspaceButton?.dataset.releaseWorkspace) {
    releaseWorkspace =
      workspaceButton.dataset.releaseWorkspace === "beta" ? "beta" : "alpha";
    void loadRagReadiness();
    void refreshData();
    return;
  }
  const evidenceButton = target.closest(
    "[data-release-evidence-id]",
  ) as HTMLButtonElement | null;
  if (evidenceButton) {
    void onPresetSearch({ currentTarget: evidenceButton } as unknown as Event);
    document
      .getElementById("search-results")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const actionButton = target.closest(
    "[data-release-action-id]",
  ) as HTMLElement | null;
  if (!actionButton) {
    return;
  }
  const actionId = actionButton.dataset.releaseActionId;
  if (!actionId) {
    return;
  }
  void runReleaseAction(actionId);
});

const renderReleaseState = () => {
  const releasePanel = buildDemoReleasePanelState(releaseData);
  releaseBannerEl.textContent = releasePanel.releaseHero;
  releaseSummaryEl.textContent = releasePanel.releaseHeroSummary;
  releaseDecisionMetaEl.textContent = `${releasePanel.releaseHeroMeta} · ${releasePanel.releaseScopeNote}`;
  releasePillRowEl.innerHTML = releasePanel.releaseHeroPills
    .map((pill) =>
      pill.targetCardId || pill.targetActivityId
        ? `<a class="demo-release-pill demo-release-pill-${escapeHtml(pill.tone)}" href="#${escapeHtml(pill.targetActivityId ?? pill.targetCardId ?? "")}" data-target-card="${escapeHtml(pill.targetCardId ?? "")}" onclick="const targetCard=this.dataset.targetCard; if(targetCard==='release-promotion-candidates-card'||targetCard==='release-stable-handoff-card'||targetCard==='release-remediation-history-card'){document.getElementById('release-diagnostics')?.setAttribute('open','open');}"><span class="demo-release-pill-label">${escapeHtml(pill.label)}</span><span class="demo-release-pill-value">${escapeHtml(pill.value)}</span></a>`
        : `<span class="demo-release-pill demo-release-pill-${escapeHtml(pill.tone)}"><span class="demo-release-pill-label">${escapeHtml(pill.label)}</span><span class="demo-release-pill-value">${escapeHtml(pill.value)}</span></span>`,
    )
    .join("");
  const workspaceButtons = demoReleaseWorkspaces
    .map(
      (entry) =>
        `<span class="demo-release-scenario-chip demo-release-workspace-chip${releaseWorkspace === entry.id ? " demo-release-scenario-chip-active" : ""}"><button type="button" data-release-workspace="${escapeHtml(entry.id)}" ${releaseWorkspace === entry.id ? "disabled" : ""} title="${escapeHtml(entry.description)}">Workspace · ${escapeHtml(entry.label)}</button></span>`,
    )
    .join("");
  const scenarioButtons = releasePanel.releaseScenarioActions
    .map(
      (entry) =>
        `<span class="demo-release-scenario-chip${entry.active ? " demo-release-scenario-chip-active" : ""}">${entry.action ? `<button type="button" data-release-action-id="${escapeHtml(entry.action.id)}">${escapeHtml(releaseActionBusyId === entry.action.id ? `Running ${entry.action.label}...` : entry.label)}</button>` : `<span>${escapeHtml(entry.label)}</span>`}</span>`,
    )
    .join("");
  releaseScenarioSwitcherEl.innerHTML = `${workspaceButtons}${scenarioButtons}`;
  releasePathRowEl.innerHTML = releasePanel.releasePathSteps
    .map(
      (step) =>
        `<article class="demo-release-path-step demo-release-path-step-${escapeHtml(step.status)}"><div class="demo-release-path-step-header"><h4>${escapeHtml(step.label)}</h4><span class="demo-release-path-status demo-release-path-status-${escapeHtml(step.status)}">${escapeHtml(step.status)}</span></div><p>${escapeHtml(step.summary)}</p><p class="demo-release-path-detail">${escapeHtml(step.detail)}</p>${step.action ? `<button class="demo-release-path-action" type="button" data-release-action-id="${escapeHtml(step.action.id)}">${escapeHtml(releaseActionBusyId === step.action.id ? `Running ${step.action.label}...` : step.action.label)}</button>` : ""}</article>`,
    )
    .join("");
  releaseActionRowEl.innerHTML = [
    `<div class="demo-release-action-state"><span class="demo-release-action-state-badge">Scenario · ${escapeHtml(releasePanel.scenario?.label ?? "Blocked stable lane")}</span><span class="demo-release-action-delta-badge demo-release-action-delta-badge-${escapeHtml(releasePanel.releaseRailDeltaChip.tone)}">${escapeHtml(releasePanel.releaseRailDeltaChip.label)}</span><span class="demo-release-action-delta-badge demo-release-action-delta-badge-${escapeHtml(releasePanel.railIncidentPostureChip.tone)}">Incident posture · ${escapeHtml(releasePanel.railIncidentPostureChip.label)}</span><span class="demo-release-action-delta-badge demo-release-action-delta-badge-${escapeHtml(releasePanel.railGateChip.tone)}">Gate posture · ${escapeHtml(releasePanel.railGateChip.label)}</span><span class="demo-release-action-delta-badge demo-release-action-delta-badge-${escapeHtml(releasePanel.railApprovalChip.tone)}">Approval posture · ${escapeHtml(releasePanel.railApprovalChip.label)}</span><span class="demo-release-action-delta-badge demo-release-action-delta-badge-${escapeHtml(releasePanel.railRemediationChip.tone)}">Remediation posture · ${escapeHtml(releasePanel.railRemediationChip.label)}</span></div>`,
    `<div class="demo-release-rail-meta">${releasePanel.releaseRailUpdateSource.targetCardId || releasePanel.releaseRailUpdateSource.targetActivityId ? `<a class="demo-release-activity-lane demo-release-activity-lane-${escapeHtml(releasePanel.releaseRailUpdateSource.tone)}" href="#${escapeHtml(releasePanel.releaseRailUpdateSource.targetActivityId ?? releasePanel.releaseRailUpdateSource.targetCardId ?? "")}" data-target-card="${escapeHtml(releasePanel.releaseRailUpdateSource.targetCardId ?? "")}" onclick="const targetCard=this.dataset.targetCard; if(targetCard==='release-promotion-candidates-card'||targetCard==='release-stable-handoff-card'||targetCard==='release-remediation-history-card'){document.getElementById('release-diagnostics')?.setAttribute('open','open');}">${escapeHtml(releasePanel.releaseRailUpdateSource.label)}</a>` : `<span class="demo-release-activity-lane demo-release-activity-lane-${escapeHtml(releasePanel.releaseRailUpdateSource.tone)}">${escapeHtml(releasePanel.releaseRailUpdateSource.label)}</span>`}<p class="demo-release-updated">${escapeHtml(releasePanel.releaseRailUpdatedLabel)}</p></div>`,
    releaseActionBusyId
      ? `<p class="demo-release-pending">Pending action · ${escapeHtml(releasePanel.actions.find((entry) => entry.id === releaseActionBusyId)?.label ?? releaseActionBusyId)}</p>`
      : "",
    releasePanel.latestReleaseAction
      ? `<details class="demo-collapsible demo-release-action-latest demo-release-action-latest-${escapeHtml(releasePanel.latestReleaseAction.tone)}"><summary>Latest action · ${escapeHtml(releasePanel.latestReleaseAction.title)}</summary>${releasePanel.latestReleaseAction.detail ? `<p>${escapeHtml(releasePanel.latestReleaseAction.detail)}</p>` : ""}<p class="demo-release-next-step">${escapeHtml(releasePanel.latestReleaseAction.nextStep)}</p></details>`
      : "",
    `<details class="demo-collapsible demo-release-rail-callout demo-release-rail-callout-${escapeHtml(releasePanel.releaseRailCallout.tone)}"><summary>${escapeHtml(releasePanel.releaseRailCallout.title)}</summary><p>${escapeHtml(releasePanel.releaseRailCallout.message)}</p>${releasePanel.releaseRailCallout.detail ? `<p>${escapeHtml(releasePanel.releaseRailCallout.detail)}</p>` : ""}<p class="demo-release-next-step">${escapeHtml(releasePanel.releaseRailCallout.nextStep)}</p></details>`,
    releasePanel.recentReleaseActivity.length
      ? `<div class="demo-release-activity-stack"><span class="demo-release-action-subtitle">Recent activity</span>${releasePanel.recentReleaseActivity.map((entry) => `<a id="${escapeHtml(entry.id)}" class="demo-release-activity demo-release-activity-${escapeHtml(entry.tone)}" href="#${escapeHtml(entry.targetCardId)}" onclick="if(this.getAttribute('href')==='#release-promotion-candidates-card'||this.getAttribute('href')==='#release-stable-handoff-card'){document.getElementById('release-diagnostics')?.setAttribute('open','open');}"><span class="demo-release-activity-lane demo-release-activity-lane-${escapeHtml(entry.tone)}">${escapeHtml(entry.laneLabel)}</span><strong>${escapeHtml(entry.title)}</strong>${entry.detail ? ` · ${escapeHtml(entry.detail)}` : ""}</a>`).join("")}</div>`
      : "",
    `<div class="demo-release-action-group"><span class="demo-release-action-subtitle">Release</span><div class="demo-release-actions">${releasePanel.primaryReleaseActions.map((action) => `<button class="demo-release-action demo-release-action-${escapeHtml(action.tone ?? "neutral")}" type="button" data-release-action-id="${escapeHtml(action.id)}" title="${escapeHtml(action.description)}" ${releaseActionBusyId === action.id ? "disabled" : ""}>${escapeHtml(releaseActionBusyId === action.id ? `Running ${action.label}...` : action.label)}</button>`).join("")}</div></div>`,
    releasePanel.secondaryReleaseActions.length > 0
      ? `<details class="demo-collapsible demo-release-more-actions"><summary>More actions</summary><div class="demo-release-actions">${releasePanel.secondaryReleaseActions.map((action) => `<button class="demo-release-action demo-release-action-${escapeHtml(action.tone ?? "neutral")}" type="button" data-release-action-id="${escapeHtml(action.id)}" title="${escapeHtml(action.description)}" ${releaseActionBusyId === action.id ? "disabled" : ""}>${escapeHtml(releaseActionBusyId === action.id ? `Running ${action.label}...` : action.label)}</button>`).join("")}</div></details>`
      : "",
    releasePanel.handoffActions.length > 0
      ? `<div class="demo-release-action-group"><span class="demo-release-action-subtitle">Handoff</span><div class="demo-release-actions">${releasePanel.handoffActions.map((action) => `<button class="demo-release-action demo-release-action-${escapeHtml(action.tone ?? "neutral")}" type="button" data-release-action-id="${escapeHtml(action.id)}" title="${escapeHtml(action.description)}" ${releaseActionBusyId === action.id ? "disabled" : ""}>${escapeHtml(releaseActionBusyId === action.id ? `Running ${action.label}...` : action.label)}</button>`).join("")}</div></div>`
      : "",
    `<div class="demo-release-action-group"><span class="demo-release-action-subtitle">Evidence drills</span><div class="demo-release-actions">${releasePanel.releaseEvidenceDrills.map((drill) => `<button class="demo-release-action demo-release-action-${escapeHtml(drill.active ? "primary" : "neutral")}" type="button" data-release-evidence-id="${escapeHtml(drill.id ?? "")}" data-query="${escapeHtml(drill.query ?? "")}" data-topk="${escapeHtml(String(drill.topK))}" data-driver="${escapeHtml(drill.driver ?? "")}" data-benchmark-preset-id="${escapeHtml(drill.benchmarkPresetId ?? "")}" data-retrieval-preset-id="${escapeHtml(drill.retrievalPresetId ?? "")}">${escapeHtml(drill.label ?? "")}</button>`).join("")}</div>${releasePanel.releaseEvidenceDrills.map((drill) => `<p class="demo-metadata"><strong>${escapeHtml(drill.classificationLabel ?? "")}:</strong> ${escapeHtml(drill.summary ?? "")} Expected source · ${escapeHtml(drill.expectedSource ?? "")}</p><p class="demo-metadata">${escapeHtml(drill.traceExpectation ?? "")}</p>`).join("")}</div>`,
  ].join("");

  releaseStatGridEl.innerHTML = [
    `<article class="demo-stat-card"><span class="demo-stat-label">Stable baseline</span><strong>${escapeHtml(releasePanel.stableBaseline?.label ?? "Not promoted")}</strong><p>${escapeHtml(releasePanel.stableBaseline ? `${releasePanel.stableBaseline.retrievalId} · v${releasePanel.stableBaseline.version}${releasePanel.stableBaseline.approvedBy ? ` · approved by ${releasePanel.stableBaseline.approvedBy}` : ""}` : "No stable baseline has been promoted yet.")}</p></article>`,
    `<article class="demo-stat-card"><span class="demo-stat-label">Canary baseline</span><strong>${escapeHtml(releasePanel.canaryBaseline?.label ?? "Not promoted")}</strong><p>${escapeHtml(releasePanel.canaryBaseline ? `${releasePanel.canaryBaseline.retrievalId} · v${releasePanel.canaryBaseline.version}${releasePanel.canaryBaseline.approvedAt ? ` · ${formatDate(releasePanel.canaryBaseline.approvedAt)}` : ""}` : "No canary baseline has been promoted yet.")}</p></article>`,
    `<article class="demo-stat-card"><span class="demo-stat-label">Stable readiness</span><strong>${escapeHtml(releasePanel.stableReadiness?.ready ? "Ready" : "Blocked")}</strong><p>${escapeHtml(releasePanel.stableReadinessStatSummary)}</p></article>`,
    `<article class="demo-stat-card"><span class="demo-stat-label">Remediation guardrails</span><strong>${escapeHtml(releasePanel.remediationSummary ? `${releasePanel.remediationSummary.guardrailBlockedCount} blocked · ${releasePanel.remediationSummary.replayCount} replays` : "No remediation executions")}</strong><p>${escapeHtml(releasePanel.remediationGuardrailSummary)}</p></article>`,
  ].join("");

  releasePrimaryGridEl.innerHTML = [
    `<p class="demo-release-card-state demo-release-card-state-${escapeHtml(releasePanel.releaseStateBadge.tone)}">State · ${escapeHtml(releasePanel.releaseStateBadge.label)}</p>`,
    `<article class="demo-result-item"><h4>Blocker comparison</h4><p class="demo-score-headline">${escapeHtml(releasePanel.scenarioClassificationLabel ? `Active blocker · ${releasePanel.scenarioClassificationLabel}` : "Compare both blocker classes")}</p><div class="demo-result-grid">${releasePanel.releaseBlockerComparisonCards.map((card) => `<article class="demo-result-item"><h4>${escapeHtml(card.label)}${card.active ? " · active" : ""}</h4>${card.detailLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}</article>`).join("")}</div></article>`,
    `<article id="release-runtime-history-card" class="demo-result-item"><h4>Runtime planner history</h4><p class="demo-score-headline">${escapeHtml(releasePanel.runtimePlannerHistorySummary)}</p>${releasePanel.runtimePlannerHistoryLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}</article>`,
    `<article id="release-benchmark-snapshots-card" class="demo-result-item"><h4>Adaptive planner benchmark</h4><p class="demo-score-headline">${escapeHtml(releasePanel.benchmarkSnapshotSummary)}</p>${releasePanel.benchmarkSnapshotLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}</article>`,
    `<article id="release-active-deltas-card" class="demo-result-item"><h4>Active blocker deltas</h4><p class="demo-score-headline">${escapeHtml(releasePanel.activeBlockerDeltaSummary)}</p>${releasePanel.activeBlockerDeltaLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}</article>`,
    `<article id="release-lane-readiness-card" class="demo-result-item"><h4>Lane readiness</h4><div class="demo-key-value-grid">${
      releasePanel.laneReadinessEntries
        .map(
          (entry) =>
            `<div class="demo-key-value-row"><span>${escapeHtml(entry.targetRolloutLabel ?? "lane")}</span><strong>${escapeHtml(entry.ready ? "ready" : "blocked")}</strong></div>${entry.reasons
              .slice(0, 2)
              .map(
                (reason) =>
                  `<p class="demo-metadata">${escapeHtml(reason)}</p>`,
              )
              .join("")}`,
        )
        .join("") ||
      `<p class="demo-metadata">No lane readiness snapshots are available yet.</p>`
    }</div></article>`,
    `<article class="demo-result-item"><h4>Lane recommendations</h4><div class="demo-insight-stack">${releasePanel.releaseRecommendations.length > 0 ? releasePanel.releaseRecommendations.map((entry) => `<p class="demo-insight-card"><strong>${escapeHtml(entry.targetRolloutLabel ?? "lane")} · ${escapeHtml(entry.classificationLabel ?? "release recommendation")}:</strong> ${escapeHtml(entry.recommendedAction.replaceAll("_", " "))}${entry.reasons[0] ? ` · ${escapeHtml(entry.reasons[0])}` : ""}</p>`).join("") : '<p class="demo-insight-card">No lane recommendations are available yet.</p>'}</div></article>`,
    `<article id="release-open-incidents-card" class="demo-result-item"><h4>Open incidents</h4><p class="demo-score-headline">${escapeHtml(releasePanel.incidentSummaryLabel)}</p>${releasePanel.incidentClassificationDetailLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}<div class="demo-insight-stack">${
      releasePanel.recentIncidents
        .slice(0, 3)
        .map(
          (incident) =>
            `<p class="demo-insight-card"><strong>${escapeHtml(incident.targetRolloutLabel ?? "lane")} · ${escapeHtml(incident.kind)} · ${escapeHtml(incident.classificationLabel ?? "general regression")}</strong><br />${escapeHtml(incident.message)}</p>`,
        )
        .join("") || '<p class="demo-insight-card">No incidents recorded.</p>'
    }</div></article>`,
    `<article id="release-remediation-history-card" class="demo-result-item"><h4>Remediation execution history</h4>${releasePanel.remediationDetailLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}<div class="demo-key-value-grid">${
      releasePanel.recentIncidentRemediationExecutions
        .slice(0, 4)
        .map(
          (entry) =>
            `<div class="demo-key-value-row"><span>${escapeHtml(entry.action?.kind ?? "execution")}</span><strong>${escapeHtml(`${entry.code ?? "unknown"}${entry.idempotentReplay ? " · replay" : ""}${entry.blockedByGuardrail ? " · blocked" : ""}`)}</strong></div>`,
        )
        .join("") ||
      '<p class="demo-metadata">No remediation executions recorded yet.</p>'
    }</div></article>`,
  ].join("");

  releaseSecondaryGridEl.innerHTML = [
    `<details id="release-diagnostics" class="demo-collapsible demo-release-diagnostics"><summary>Advanced release diagnostics · ${escapeHtml(releasePanel.releaseDiagnosticsSummary)}</summary><p class="demo-release-updated">${escapeHtml(releasePanel.releaseDiagnosticsUpdatedLabel)}</p><p class="demo-release-card-state demo-release-card-state-${escapeHtml(releasePanel.releaseStateBadge.tone)}">State · ${escapeHtml(releasePanel.releaseStateBadge.label)}</p><div class="demo-result-grid">`,
    `<article id="release-promotion-candidates-card" class="demo-result-item"><h4>Promotion candidates</h4><div class="demo-key-value-grid">${
      releasePanel.releaseCandidates.length > 0
        ? releasePanel.releaseCandidates
            .slice(0, 3)
            .map(
              (candidate) =>
                `<div class="demo-key-value-row"><span>${escapeHtml(candidate.targetRolloutLabel ?? "lane")} · ${escapeHtml(candidate.candidateRetrievalId ?? "candidate")}</span><strong>${escapeHtml(candidate.reviewStatus)}</strong></div><p class="demo-metadata">${escapeHtml(candidate.reasons[0] ?? "No release reasons recorded.")}</p>`,
            )
            .join("")
        : '<p class="demo-metadata">No promotion candidates recorded yet.</p>'
    }</div></article>`,
    `<article class="demo-result-item"><h4>Release alerts</h4><div class="demo-insight-stack">${
      releasePanel.releaseAlerts.length > 0
        ? releasePanel.releaseAlerts
            .slice(0, 4)
            .map(
              (alert) =>
                `<p class="demo-insight-card"><strong>${escapeHtml(alert.targetRolloutLabel ?? "lane")} · ${escapeHtml(alert.kind)} · ${escapeHtml(alert.classificationLabel ?? "general regression")}</strong><br />${escapeHtml(alert.message ?? "No alert detail")}</p>`,
            )
            .join("")
        : '<p class="demo-insight-card">No release alerts are active.</p>'
    }</div></article>`,
    `<article id="release-policy-history-card" class="demo-result-item"><h4>Policy history</h4>${releasePanel.policyHistoryDetailLines.map((line) => `<p class="demo-metadata">${escapeHtml(line)}</p>`).join("")}<div class="demo-insight-stack">${releasePanel.policyHistoryEntries.length > 0 ? releasePanel.policyHistoryEntries.map((entry) => `<p class="demo-insight-card"><strong>${escapeHtml(entry.title)}</strong><br />${escapeHtml(entry.detail)}</p>`).join("") : `<p class="demo-insight-card">${escapeHtml(releasePanel.policyHistorySummary)}</p>`}</div></article>`,
    `<article id="release-audit-surfaces-card" class="demo-result-item"><h4>Audit surfaces</h4><div class="demo-insight-stack">${releasePanel.auditSurfaceEntries.length > 0 ? releasePanel.auditSurfaceEntries.map((entry) => `<p class="demo-insight-card"><strong>${escapeHtml(entry.title)}</strong><br />${escapeHtml(entry.detail)}</p>`).join("") : `<p class="demo-insight-card">${escapeHtml(releasePanel.auditSurfaceSummary)}</p>`}</div></article>`,
    `<article id="release-polling-surfaces-card" class="demo-result-item"><h4>Polling surfaces</h4><div class="demo-insight-stack">${releasePanel.pollingSurfaceEntries.map((entry) => `<p class="demo-insight-card"><strong>${escapeHtml(entry.title)}</strong><br />${escapeHtml(entry.detail)}</p>`).join("")}</div></article>`,
    `<article id="release-handoff-incidents-card" class="demo-result-item"><h4>Handoff incidents</h4><p class="demo-score-headline">${escapeHtml(releasePanel.stableHandoffIncidentSummaryLabel)}</p><div class="demo-insight-stack">${
      releasePanel.handoffIncidents.length > 0
        ? releasePanel.handoffIncidents
            .slice(0, 2)
            .map(
              (incident) =>
                `<p class="demo-insight-card"><strong>${escapeHtml(incident.status ?? "incident")} · ${escapeHtml(incident.kind ?? "handoff_stale")}</strong><br />${escapeHtml(incident.message ?? "No handoff incident detail")}</p>`,
            )
            .join("")
        : `<p class="demo-insight-card">No handoff incidents recorded.</p>`
    }${releasePanel.handoffIncidentHistory
      .slice(0, 3)
      .map(
        (entry) =>
          `<p class="demo-insight-card"><strong>${escapeHtml(entry.action ?? "history")}</strong><br />${escapeHtml([entry.notes, entry.recordedAt ? new Date(entry.recordedAt).toLocaleString() : undefined].filter(Boolean).join(" · "))}</p>`,
      )
      .join("")}</div></article>`,
    `<article id="release-stable-handoff-card" class="demo-result-item"><h4>Stable handoff</h4><div class="demo-key-value-grid">${releasePanel.stableHandoff ? `<div class="demo-key-value-row"><span>${escapeHtml(releasePanel.stableHandoff.sourceRolloutLabel)} -&gt; ${escapeHtml(releasePanel.stableHandoff.targetRolloutLabel)}</span><strong>${escapeHtml(releasePanel.stableHandoff.readyForHandoff ? "ready" : "blocked")}</strong></div><p class="demo-metadata">${escapeHtml(releasePanel.stableHandoff.candidateRetrievalId ? `candidate ${releasePanel.stableHandoff.candidateRetrievalId}` : "No candidate retrieval is attached to the handoff yet.")}${releasePanel.stableHandoffDecision?.kind ? ` · ${escapeHtml(`latest ${releasePanel.stableHandoffDecision.kind}`)}` : ""}</p>${releasePanel.stableHandoffDisplayReasons.map((reason) => `<p class="demo-metadata">${escapeHtml(reason)}</p>`).join("")}${releasePanel.stableHandoffAutoCompleteLabel ? `<p class="demo-metadata">${escapeHtml(releasePanel.stableHandoffAutoCompleteLabel)}</p>` : ""}<div class="demo-key-value-row"><span>Drift events</span><strong>${escapeHtml(String(releasePanel.stableHandoffDrift?.totalCount ?? 0))}</strong></div>` : '<p class="demo-metadata">No stable handoff posture is available yet.</p>'}</div></article>`,
    "</div></details>",
  ].join("");
};

const renderOpsState = (
  ops: Awaited<ReturnType<ReturnType<typeof createRAGClient>["ops"]>>,
) => {
  const sortedSyncSources = sortSyncSources(ops.syncSources);
  stateSyncRowEl.innerHTML = "";
  for (const chip of formatSyncDeltaChips(sortedSyncSources)) {
    const span = document.createElement("span");
    span.className = "demo-state-chip";
    span.textContent = chip.replace(/^sync /, "");
    stateSyncRowEl.append(span);
  }
  setError(opsErrorEl, "");
  renderDetailList(
    opsReadinessListEl,
    formatReadinessSummary(ops.readiness),
    "Readiness unavailable.",
  );
  renderDetailList(
    opsHealthListEl,
    formatHealthSummary(ops.health),
    "Health unavailable.",
  );
  renderDetailList(
    opsFailureListEl,
    [
      ...formatFailureSummary(ops.health),
      ...formatInspectionSummary(ops.health),
      ...formatInspectionSamples(ops.health),
    ],
    "No recorded failures.",
  );
  const inspectionEntries = buildInspectionEntries(ops.health);
  for (const entry of inspectionEntries) {
    const item = document.createElement("li");
    item.className = "demo-inspection-action-row";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${entry.documentId ? `Inspect ${entry.kind}` : "Search source"} · ${entry.label}`;
    button.addEventListener("click", () => {
      void focusInspectionEntry(entry);
    });
    const link = document.createElement("a");
    link.className = "demo-inspection-link";
    link.href = buildInspectionEntryHref(selectedMode, entry);
    link.textContent = "Open standalone view";
    item.append(button, link);
    opsFailureListEl.append(item);
  }
  renderDetailList(
    opsSyncSummaryListEl,
    formatSyncSourceOverview(sortedSyncSources),
    "No sync sources configured yet.",
  );
  renderDetailList(
    opsSyncSourcesListEl,
    sortedSyncSources.length > 0
      ? sortedSyncSources.flatMap((source) => [
          formatSyncSourceSummary(source),
          ...formatSyncSourceDetails(source),
        ])
      : [],
    "No sync sources configured yet.",
  );
  opsSyncActionsEl.innerHTML = "";
  for (const source of sortedSyncSources) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const group = document.createElement("div");
    const actionRow = document.createElement("div");
    details.className =
      source.status === "failed"
        ? "demo-sync-action-details demo-sync-action-failed"
        : "demo-sync-action-details";
    details.open = source.status === "failed";
    summary.textContent = formatSyncSourceCollapsedSummary(source);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `Sync ${source.label}`;
    button.addEventListener("click", async () => {
      showMessage(`Starting ${source.id} sync...`);
      try {
        await ragClient.syncSource(source.id, { background: true });
        showMessage(
          `Started ${source.label}. Watch the sync feedback panel for progress.`,
        );
        await refreshData();
      } catch (error) {
        showMessage(
          error instanceof Error
            ? `Failed to sync ${source.id}: ${error.message}`
            : `Failed to sync ${source.id}`,
        );
      }
    });
    actionRow.append(button);

    const backgroundButton = document.createElement("button");
    backgroundButton.type = "button";
    backgroundButton.textContent = `Queue ${source.label}`;
    backgroundButton.addEventListener("click", async () => {
      showMessage(`Queueing ${source.id} in the background...`);
      try {
        await ragClient.syncSource(source.id, { background: true });
        await refreshData();
      } catch (error) {
        showMessage(
          error instanceof Error
            ? `Failed to queue ${source.id}: ${error.message}`
            : `Failed to queue ${source.id}`,
        );
      }
    });
    actionRow.append(backgroundButton);

    if (source.status === "failed") {
      const retryButton = document.createElement("button");
      retryButton.type = "button";
      retryButton.textContent = "Retry now";
      retryButton.addEventListener("click", async () => {
        showMessage(`Starting retry for ${source.id}...`);
        try {
          await ragClient.syncSource(source.id, { background: true });
          showMessage(
            `Started retry for ${source.label}. Watch the sync feedback panel for progress.`,
          );
          await refreshData();
        } catch (error) {
          showMessage(
            error instanceof Error
              ? `Failed to retry ${source.id}: ${error.message}`
              : `Failed to retry ${source.id}`,
          );
        }
      });
      actionRow.append(retryButton);

      const retryBackgroundButton = document.createElement("button");
      retryBackgroundButton.type = "button";
      retryBackgroundButton.textContent = "Retry in background";
      retryBackgroundButton.addEventListener("click", async () => {
        showMessage(`Queueing retry for ${source.id}...`);
        try {
          await ragClient.syncSource(source.id, { background: true });
          await refreshData();
        } catch (error) {
          showMessage(
            error instanceof Error
              ? `Failed to queue retry ${source.id}: ${error.message}`
              : `Failed to queue retry ${source.id}`,
          );
        }
      });
      actionRow.append(retryBackgroundButton);
    }

    const meta = document.createElement("p");
    meta.className = "demo-metadata demo-sync-action-meta";
    meta.textContent = formatSyncSourceActionSummary(source);

    const badges = document.createElement("div");
    badges.className = "demo-badge-row";
    for (const badgeText of formatSyncSourceActionBadges(source)) {
      const badge = document.createElement("span");
      badge.className = "demo-badge";
      badge.textContent = badgeText;
      badges.append(badge);
    }

    actionRow.className = "demo-actions";
    group.className = "demo-sync-action-group";
    group.append(actionRow, meta);
    if (badges.childElementCount > 0) {
      group.append(badges);
    }
    details.append(summary, group);
    opsSyncActionsEl.append(details);
  }
  renderDetailList(
    opsAdminJobsListEl,
    formatAdminJobList(ops.adminJobs),
    "No admin jobs recorded yet.",
  );
  renderDetailList(
    opsAdminActionsListEl,
    formatAdminActionList(ops.adminActions),
    "No admin actions recorded yet.",
  );
};

const renderAIModelOptions = () => {
  streamModelKeyEl.innerHTML = "";
  if (aiModelCatalog.models.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Configure an AI provider";
    streamModelKeyEl.append(option);
    return;
  }

  for (const model of aiModelCatalog.models) {
    const option = document.createElement("option");
    option.value = model.key;
    option.textContent = formatDemoAIModelLabel(model);
    if (
      model.key === (streamModelKeyEl.value || aiModelCatalog.defaultModelKey)
    ) {
      option.selected = true;
    }
    streamModelKeyEl.append(option);
  }
};

const readSearchForm = (): SearchFormState => {
  const values = new FormData(searchForm);
  const query = toSafeText(values.get("query")?.toString() ?? "", "");
  const source = toSafeText(values.get("source")?.toString() ?? "", "");
  const kindValue = toSafeText(values.get("kind")?.toString() ?? "", "");
  const documentId = toSafeText(values.get("documentId")?.toString() ?? "", "");
  const scoreThreshold = toSafeText(
    values.get("scoreThreshold")?.toString() ?? "",
    "",
  );
  const topKValue = toNumber(values.get("topK")?.toString() ?? "6", 6);
  const safeTopK = Math.min(20, Math.max(1, Math.floor(topKValue)));

  return {
    query,
    kind: kindValue === "seed" || kindValue === "custom" ? kindValue : "",
    source,
    topK: safeTopK,
    scoreThreshold,
    documentId,
  };
};

const readAddForm = (): AddFormState => {
  const values = new FormData(addForm);
  return {
    id: toSafeText(values.get("id")?.toString() ?? "", ""),
    title: toSafeText(values.get("title")?.toString() ?? "", ""),
    source: toSafeText(values.get("source")?.toString() ?? "", ""),
    format: demoContentFormats.includes(
      toSafeText(
        values.get("format")?.toString() ?? "",
        "markdown",
      ) as AddFormState["format"],
    )
      ? (toSafeText(
          values.get("format")?.toString() ?? "",
          "markdown",
        ) as AddFormState["format"])
      : "markdown",
    chunkStrategy: demoChunkingStrategies.includes(
      toSafeText(
        values.get("chunkStrategy")?.toString() ?? "",
        "source_aware",
      ) as AddFormState["chunkStrategy"],
    )
      ? (toSafeText(
          values.get("chunkStrategy")?.toString() ?? "",
          "source_aware",
        ) as AddFormState["chunkStrategy"])
      : "source_aware",
    text: toSafeText(values.get("text")?.toString() ?? "", ""),
  };
};

const renderStreamState = () => {
  const currentStage = ragWorkflow.stage;
  const latestMessage = ragWorkflow.latestAssistantMessage;
  const retrieval = ragWorkflow.retrieval;
  const workflowState = ragWorkflow.state;

  renderDetailList(
    streamContractListEl,
    [
      "Canonical entry point: createRAGWorkflow()",
      "Connected page surface: ragWorkflow",
      `Snapshot stage: ${workflowState.stage}`,
      `Live stage field: ${ragWorkflow.stage}`,
      `Snapshot sources: ${String(workflowState.sources.length)}`,
      `Snapshot running: ${workflowState.isRunning ? "yes" : "no"}`,
    ],
    "Workflow contract unavailable.",
  );
  renderDetailList(
    streamProofListEl,
    [
      `Retrieved: ${workflowState.hasRetrieved ? "yes" : "no"}`,
      `Has sources: ${workflowState.hasSources ? "yes" : "no"}`,
      `Citation count: ${String(ragWorkflow.citations.length)}`,
      `Grounding coverage: ${ragWorkflow.groundedAnswer.coverage}`,
    ],
    "Workflow proof unavailable.",
  );

  streamActionButton.textContent = isStreamBusy()
    ? "Cancel"
    : "Ask with retrieval stream";
  streamStageRow.innerHTML = "";
  for (const stage of streamStages) {
    const pill = document.createElement("span");
    pill.className = [
      "demo-stage-pill",
      currentStage === stage ? "current" : "",
      isStreamStageComplete(stage, currentStage) ? "complete" : "",
    ]
      .filter(Boolean)
      .join(" ");
    pill.textContent = stage;
    streamStageRow.append(pill);
  }

  if (retrieval) {
    streamStatsEl.hidden = false;
    streamStatsEl.innerHTML = `<div><dt>Retrieval started</dt><dd>${retrieval.retrievalStartedAt ? formatDate(retrieval.retrievalStartedAt) : "n/a"}</dd></div><div><dt>Retrieval duration</dt><dd>${String(retrieval.retrievalDurationMs ?? 0)}ms</dd></div><div><dt>Retrieved sources</dt><dd>${String(retrieval.sources.length)}</dd></div><div><dt>Current stage</dt><dd>${currentStage}</dd></div>`;
    renderWorkflowTrace(retrieval.trace);
  } else {
    streamStatsEl.hidden = true;
    streamStatsEl.innerHTML = "";
    renderWorkflowTrace(undefined);
  }

  setError(streamErrorEl, ragWorkflow.error ?? "");

  streamThinkingTextEl.textContent = latestMessage?.thinking ?? "";
  streamThinkingEl.hidden = !latestMessage?.thinking;
  streamAnswerTextEl.textContent = latestMessage?.content ?? "";
  streamAnswerEl.hidden = !latestMessage?.content;

  const groundedAnswer = ragWorkflow.groundedAnswer;
  const groundingReferences = ragWorkflow.groundingReferences;

  streamGroundingListEl.innerHTML = "";
  streamGroundingPartsEl.innerHTML = "";
  if ((latestMessage?.content ?? "").length > 0) {
    streamGroundingEl.hidden = false;
    streamGroundingBadgeEl.className = [
      "demo-grounding-badge",
      `demo-grounding-${groundedAnswer.coverage}`,
    ].join(" ");
    streamGroundingBadgeEl.textContent = formatGroundingCoverage(
      groundedAnswer.coverage,
    );
    for (const line of formatGroundingSummary(groundedAnswer)) {
      const item = document.createElement("li");
      item.textContent = line;
      streamGroundingListEl.append(item);
    }
    for (const part of groundedAnswer.parts) {
      if (part.type !== "citation") {
        continue;
      }
      const card = document.createElement("article");
      card.className = "demo-result-item demo-grounding-card";
      card.innerHTML = `<p class="demo-citation-badge">${formatGroundingPartReferences(part.referenceNumbers)}</p>${formatGroundedAnswerPartDetails(
        part,
      )
        .map((line) => `<p class="demo-metadata">${line}</p>`)
        .join(
          "",
        )}<p class="demo-result-text">${formatGroundedAnswerPartExcerpt(part)}</p>`;
      streamGroundingPartsEl.append(card);
    }
  } else {
    streamGroundingEl.hidden = true;
  }

  streamGroundingSectionsGridEl.innerHTML = "";
  if (groundedAnswer.sectionSummaries.length > 0) {
    streamGroundingSectionsEl.hidden = false;
    for (const summary of groundedAnswer.sectionSummaries) {
      const card = document.createElement("article");
      card.className = "demo-result-item demo-grounding-card";
      card.innerHTML = `<h3>${summary.label}</h3><p class="demo-result-source">${summary.summary}</p>${formatGroundedAnswerSectionSummaryDetails(
        summary,
      )
        .map((line) => `<p class="demo-metadata">${line}</p>`)
        .join(
          "",
        )}<p class="demo-result-text">${formatGroundedAnswerSectionSummaryExcerpt(summary)}</p>`;
      streamGroundingSectionsGridEl.append(card);
    }
  } else {
    streamGroundingSectionsEl.hidden = true;
  }

  streamGroundingReferencesGridEl.innerHTML = "";
  if (groundingReferences.length > 0) {
    streamGroundingReferencesEl.hidden = false;
    for (const group of buildGroundingReferenceGroups(groundingReferences)) {
      const groupCard = document.createElement("article");
      groupCard.className = "demo-result-item";
      groupCard.id = group.targetId;
      groupCard.innerHTML = `<h3>${group.label}</h3><p class="demo-result-source">${group.summary}</p>`;
      const nestedGrid = document.createElement("div");
      nestedGrid.className = "demo-result-grid";
      for (const reference of group.references) {
        const card = document.createElement("article");
        card.className = "demo-result-item demo-grounding-card";
        card.innerHTML = `<p class="demo-citation-badge">[${String(reference.number)}] ${formatGroundingReferenceLabel(reference)}</p><p class="demo-result-score">${formatGroundingReferenceSummary(reference)}</p>${formatGroundingReferenceDetails(
          reference,
        )
          .map((line) => `<p class="demo-metadata">${line}</p>`)
          .join(
            "",
          )}<p class="demo-result-text">${formatGroundingReferenceExcerpt(reference)}</p>`;
        nestedGrid.append(card);
      }
      groupCard.append(nestedGrid);
      streamGroundingReferencesGridEl.append(groupCard);
    }
  } else {
    streamGroundingReferencesEl.hidden = true;
  }

  streamSourcesGridEl.innerHTML = "";
  if (ragWorkflow.sourceSummaries.length > 0) {
    streamSourcesEl.hidden = false;
    for (const group of buildSourceSummarySectionGroups(
      ragWorkflow.sourceSummaries,
    )) {
      const groupCard = document.createElement("article");
      groupCard.className = "demo-result-item";
      groupCard.id = group.targetId;
      groupCard.innerHTML = `<h3>${group.label}</h3><p class="demo-result-source">${group.summary}</p>`;
      const nestedGrid = document.createElement("div");
      nestedGrid.className = "demo-result-grid";
      for (const summary of group.summaries) {
        const card = document.createElement("article");
        card.className = "demo-result-item";
        card.innerHTML = `<h4>${summary.label}</h4>${formatSourceSummaryDetails(
          summary,
        )
          .map((line) => `<p class="demo-metadata">${line}</p>`)
          .join("")}<p class="demo-result-text">${summary.excerpt}</p>`;
        nestedGrid.append(card);
      }
      groupCard.append(nestedGrid);
      streamSourcesGridEl.append(groupCard);
    }
  } else {
    streamSourcesEl.hidden = true;
  }

  streamCitationsGridEl.innerHTML = "";
  const citations = ragWorkflow.citations;
  if (citations.length > 0) {
    streamCitationsEl.hidden = false;
    for (const group of buildCitationGroups(citations)) {
      const groupCard = document.createElement("article");
      groupCard.className = "demo-result-item";
      groupCard.id = group.targetId;
      groupCard.innerHTML = `<h3>${group.label}</h3><p class="demo-result-source">${group.summary}</p>`;
      const nestedGrid = document.createElement("div");
      nestedGrid.className = "demo-result-grid";
      for (const [index, citation] of group.citations.entries()) {
        const card = document.createElement("article");
        card.className = "demo-result-item demo-citation-card";
        card.innerHTML = `<p class="demo-citation-badge">[${String(index + 1)}] ${formatCitationLabel(citation)}</p><p class="demo-result-score">${formatCitationSummary(citation)}</p>${formatCitationDetails(
          citation,
        )
          .map((line) => `<p class="demo-metadata">${line}</p>`)
          .join(
            "",
          )}<p class="demo-result-text">${formatCitationExcerpt(citation)}</p>`;
        nestedGrid.append(card);
      }
      groupCard.append(nestedGrid);
      streamCitationsGridEl.append(groupCard);
    }
  } else {
    streamCitationsEl.hidden = true;
  }
};

unsubscribeStream = ragWorkflow.subscribe(renderStreamState);

const resetStreamConnection = () => {
  unsubscribeStream();
  ragWorkflow.destroy();
  ragWorkflow = createRAGWorkflow(activeRagPath);
  unsubscribeStream = ragWorkflow.subscribe(renderStreamState);
  renderStreamState();
};

const clearChunkPreview = (
  message = "Pick a document and click Inspect chunks to compare the normalized text with the final chunk boundaries.",
) => {
  chunkPreview = null;
  chunkPreviewActiveChunkId = null;
  chunkPreviewLoadingDocumentId = null;
  formatDocuments(documentsCache, message);
};

const renderChunkPreview = (preview: DemoChunkPreview) => {
  chunkPreview = preview;
  chunkPreviewActiveChunkId = preview.chunks[0]?.chunkId ?? null;
  chunkPreviewLoadingDocumentId = null;
  formatDocuments(documentsCache);
};

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

const getFilteredDocuments = () => {
  const query = documentSearchEl.value.trim().toLowerCase();
  const type = documentTypeFilterEl.value;
  return documentsCache.filter((document) => {
    const matchesQuery =
      query.length === 0 ||
      document.title.toLowerCase().includes(query) ||
      document.source.toLowerCase().includes(query) ||
      document.text.toLowerCase().includes(query);
    const matchesType =
      type === "all" || inferDocumentExtension(document) === type;
    return matchesQuery && matchesType;
  });
};

const getChunkIndexText = (
  chunk: { metadata?: Record<string, unknown> },
  fallbackCount: number,
) => {
  const chunkIndex =
    typeof chunk.metadata?.chunkIndex === "number"
      ? chunk.metadata.chunkIndex
      : 0;
  const chunkCount =
    typeof chunk.metadata?.chunkCount === "number"
      ? chunk.metadata.chunkCount
      : fallbackCount;
  return `chunk index: ${String(chunkIndex)} / count: ${String(chunkCount)}`;
};

const inspectChunks = async (id: string) => {
  chunkPreviewLoadingDocumentId = id;
  formatDocuments(documentsCache);
  try {
    const preview = await ragClient.documentChunks(id);
    if (!preview.ok) {
      throw new Error(preview.error);
    }
    renderChunkPreview(preview as DemoChunkPreview);
  } catch (error) {
    clearChunkPreview(
      error instanceof Error
        ? `Failed to inspect ${id}: ${error.message}`
        : `Failed to inspect ${id}`,
    );
  }
};

const focusInspectionEntry = async (
  entry: ReturnType<typeof buildInspectionEntries>[number],
) => {
  documentTypeFilterEl.value = "all";
  documentSearchEl.value = entry.sourceQuery ?? "";
  documentPage = 1;
  formatDocuments(documentsCache);
  documentListEl.scrollIntoView({ behavior: "smooth", block: "start" });
  if (entry.documentId) {
    showMessage(`Inspecting ${entry.documentId} from ops inspection.`);
    await inspectChunks(entry.documentId);
    return;
  }
  if (entry.source) {
    scopeDriver = `ops inspection: ${entry.source}`;
    setSearchValue("documentId", "");
    setSearchValue("source", entry.source);
    setSearchValue("query", `Source search for ${entry.source}`);
    showMessage(`Scoped retrieval to ${entry.source} from ops inspection.`);
    searchForm.requestSubmit();
  }
};

const formatDocuments = (
  documents: DemoDocument[],
  emptyPreviewMessage = "Pick a document and click Inspect chunks to compare the normalized text with the final chunk boundaries.",
) => {
  const filteredDocuments = getFilteredDocuments();
  const totalDocumentPages = Math.max(
    1,
    Math.ceil(filteredDocuments.length / DOCUMENTS_PER_PAGE),
  );
  documentPage = Math.min(totalDocumentPages, Math.max(1, documentPage));
  const paginatedDocuments = filteredDocuments.slice(
    (documentPage - 1) * DOCUMENTS_PER_PAGE,
    documentPage * DOCUMENTS_PER_PAGE,
  );

  documentCountTotalEl.textContent = String(filteredDocuments.length);
  documentCountBreakdownEl.textContent = `${filteredDocuments.filter((document) => document.kind === "seed").length} seed · ${filteredDocuments.filter((document) => document.kind === "custom").length} custom`;
  documentPaginationSummaryEl.textContent = `Showing ${paginatedDocuments.length} of ${filteredDocuments.length} matching documents`;
  documentPaginationControlsEl.innerHTML = "";

  const prevButton = document.createElement("button");
  prevButton.type = "button";
  prevButton.textContent = "Prev";
  prevButton.disabled = documentPage <= 1;
  prevButton.addEventListener("click", () => {
    documentPage = Math.max(1, documentPage - 1);
    formatDocuments(documentsCache);
  });
  documentPaginationControlsEl.append(prevButton);

  for (let pageNumber = 1; pageNumber <= totalDocumentPages; pageNumber += 1) {
    const pageButton = document.createElement("button");
    pageButton.type = "button";
    pageButton.className =
      pageNumber === documentPage
        ? "demo-page-button demo-page-button-active"
        : "demo-page-button";
    pageButton.textContent = String(pageNumber);
    pageButton.addEventListener("click", () => {
      documentPage = pageNumber;
      formatDocuments(documentsCache);
    });
    documentPaginationControlsEl.append(pageButton);
  }

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.textContent = "Next";
  nextButton.disabled = documentPage >= totalDocumentPages;
  nextButton.addEventListener("click", () => {
    documentPage = Math.min(totalDocumentPages, documentPage + 1);
    formatDocuments(documentsCache);
  });
  documentPaginationControlsEl.append(nextButton);

  if (filteredDocuments.length === 0) {
    documentListEl.innerHTML =
      '<p class="demo-metadata">No indexed sources match the current filters.</p>';
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "demo-document-list";

  for (const doc of paginatedDocuments) {
    const details = document.createElement("details");
    details.className = "demo-document-item demo-document-collapsible";
    const summary = document.createElement("summary");
    const header = document.createElement("div");
    header.className = "demo-document-header";
    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    const subtitle = document.createElement("p");
    title.textContent = doc.title;
    subtitle.className = "demo-metadata";
    subtitle.textContent = `${doc.source} · ${doc.kind} · ${doc.chunkCount} chunk(s)`;
    titleWrap.append(title, subtitle);
    const badgeRow = document.createElement("div");
    badgeRow.className = "demo-badge-row";
    for (const badgeText of [
      formatContentFormat(doc.format),
      formatChunkStrategy(doc.chunkStrategy),
      `chunk target ${doc.chunkSize} chars`,
    ]) {
      const badge = document.createElement("span");
      badge.className = "demo-badge";
      badge.textContent = badgeText;
      badgeRow.append(badge);
    }
    header.append(titleWrap, badgeRow);
    summary.append(header);

    const content = document.createElement("div");
    content.className = "demo-collapsible-content";
    const action = document.createElement("div");
    action.className = "demo-actions";

    const inspectButton = document.createElement("button");
    inspectButton.type = "button";
    inspectButton.textContent = "Inspect chunks";
    inspectButton.addEventListener("click", () => {
      details.open = true;
      void inspectChunks(doc.id);
    });
    action.append(inspectButton);

    const quickSearch = document.createElement("button");
    quickSearch.type = "button";
    quickSearch.textContent = "Search source";
    quickSearch.addEventListener("click", () => {
      scopeDriver = `row action: source ${doc.source}`;
      setSearchValue("documentId", "");
      setSearchValue("source", doc.source);
      setSearchValue("query", `Source search for ${doc.source}`);
      searchForm.requestSubmit();
    });
    action.append(quickSearch);

    const documentSearch = document.createElement("button");
    documentSearch.type = "button";
    documentSearch.textContent = "Search document";
    documentSearch.addEventListener("click", () => {
      scopeDriver = `row action: document ${doc.id}`;
      setSearchValue("source", "");
      setSearchValue("documentId", doc.id);
      setSearchValue("query", `Explain ${doc.title}`);
      searchForm.requestSubmit();
    });
    action.append(documentSearch);

    if (doc.kind === "custom") {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.dataset.documentId = doc.id;
      deleteButton.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLButtonElement;
        const id = button.dataset.documentId;
        if (id === undefined) return;

        showMessage(`Deleting ${id}...`);
        try {
          const result = await ragClient.deleteDocument(id);
          if (!result.ok) {
            throw new Error(result.error ?? `Failed to delete ${id}`);
          }
          showMessage(`Deleted ${id}`);
          if (chunkPreview?.document.id === id) {
            clearChunkPreview();
          }
          await refreshData();
        } catch (error) {
          showMessage(
            error instanceof Error
              ? `Failed to delete ${id}: ${error.message}`
              : `Failed to delete ${id}`,
          );
        }
      });
      action.append(deleteButton);
    }

    const keyValueGrid = document.createElement("div");
    keyValueGrid.className = "demo-key-value-grid";
    const appendKeyValue = (label: string, value: string) => {
      const row = document.createElement("div");
      row.className = "demo-key-value-row";
      row.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
      keyValueGrid.append(row);
    };
    appendKeyValue("Source", doc.source);
    appendKeyValue("Created", formatDate(doc.createdAt));
    appendKeyValue("Kind", doc.kind);
    appendKeyValue("Chunks", String(doc.chunkCount));
    for (const line of formatDemoMetadataSummary(doc.metadata)) {
      appendKeyValue("Metadata", line);
    }

    const previewText = document.createElement("p");
    previewText.className = "demo-document-preview";
    previewText.textContent = doc.text;

    const inlinePreview = document.createElement("div");
    inlinePreview.className = "demo-inline-preview";
    if (chunkPreviewLoadingDocumentId === doc.id) {
      const loading = document.createElement("p");
      loading.className = "demo-metadata";
      loading.textContent = "Preparing chunk preview...";
      inlinePreview.append(loading);
    } else if (chunkPreview?.document.id === doc.id) {
      const caption = document.createElement("p");
      caption.className = "demo-section-caption";
      caption.textContent = "Chunk Preview";
      const summaryText = document.createElement("p");
      summaryText.className = "demo-metadata";
      summaryText.textContent = `${chunkPreview.document.title} · ${formatOptionalContentFormat(chunkPreview.document.format)} · ${formatOptionalChunkStrategy(chunkPreview.document.chunkStrategy)} · ${chunkPreview.chunks.length} chunk(s)`;
      const normalizedCard = document.createElement("article");
      normalizedCard.className = "demo-result-item";
      normalizedCard.innerHTML = `<h3>Normalized text</h3><p class="demo-result-text">${chunkPreview.normalizedText}</p>`;
      const navigation = buildRAGChunkPreviewNavigation(
        chunkPreview,
        chunkPreviewActiveChunkId ?? undefined,
      );
      const previewGrid = document.createElement("div");
      previewGrid.className = "demo-result-grid";
      if (navigation.activeNode) {
        const nav = document.createElement("div");
        nav.className = "demo-chunk-nav";
        const navRow = document.createElement("div");
        navRow.className = "demo-chunk-nav-row";
        const prevButton = document.createElement("button");
        prevButton.type = "button";
        prevButton.textContent = "Previous chunk";
        prevButton.disabled = !navigation.previousNode;
        prevButton.onclick = () => {
          if (navigation.previousNode) {
            chunkPreviewActiveChunkId = navigation.previousNode.chunkId;
            formatDocuments(documentsCache);
          }
        };
        const navLabel = document.createElement("p");
        navLabel.className = "demo-metadata";
        navLabel.textContent = `${formatChunkNavigationSectionLabel(navigation)} · ${formatChunkNavigationNodeLabel(navigation.activeNode)}`;
        const nextButton = document.createElement("button");
        nextButton.type = "button";
        nextButton.textContent = "Next chunk";
        nextButton.disabled = !navigation.nextNode;
        nextButton.onclick = () => {
          if (navigation.nextNode) {
            chunkPreviewActiveChunkId = navigation.nextNode.chunkId;
            formatDocuments(documentsCache);
          }
        };
        navRow.append(prevButton, navLabel, nextButton);
        nav.append(navRow);
        if (navigation.sectionNodes.length > 1) {
          const strip = document.createElement("div");
          strip.className = "demo-chunk-nav-strip";
          for (const node of navigation.sectionNodes) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className =
              node.chunkId === chunkPreviewActiveChunkId
                ? "demo-chunk-nav-chip demo-chunk-nav-chip-active"
                : "demo-chunk-nav-chip";
            chip.textContent = formatChunkNavigationNodeLabel(node);
            chip.onclick = () => {
              chunkPreviewActiveChunkId = node.chunkId;
              formatDocuments(documentsCache);
            };
            strip.append(chip);
          }
          nav.append(strip);
        }
        if (
          navigation.parentSection ||
          navigation.siblingSections.length > 0 ||
          navigation.childSections.length > 0
        ) {
          const hierarchyStrip = document.createElement("div");
          hierarchyStrip.className = "demo-chunk-nav-strip";
          if (navigation.parentSection) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "demo-chunk-nav-chip";
            chip.textContent = `Parent · ${formatChunkSectionGroupLabel(navigation.parentSection)}`;
            chip.onclick = () => {
              if (navigation.parentSection?.leadChunkId) {
                chunkPreviewActiveChunkId =
                  navigation.parentSection.leadChunkId;
                formatDocuments(documentsCache);
              }
            };
            hierarchyStrip.append(chip);
          }
          for (const section of navigation.siblingSections) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "demo-chunk-nav-chip";
            chip.textContent = `Sibling · ${formatChunkSectionGroupLabel(section)}`;
            chip.onclick = () => {
              if (section.leadChunkId) {
                chunkPreviewActiveChunkId = section.leadChunkId;
                formatDocuments(documentsCache);
              }
            };
            hierarchyStrip.append(chip);
          }
          for (const section of navigation.childSections) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "demo-chunk-nav-chip";
            chip.textContent = `Child · ${formatChunkSectionGroupLabel(section)}`;
            chip.onclick = () => {
              if (section.leadChunkId) {
                chunkPreviewActiveChunkId = section.leadChunkId;
                formatDocuments(documentsCache);
              }
            };
            hierarchyStrip.append(chip);
          }
          nav.append(hierarchyStrip);
        }
        inlinePreview.append(nav);
      }
      const activeSectionDiagnostic = buildActiveChunkPreviewSectionDiagnostic(
        chunkPreview,
        chunkPreviewActiveChunkId ?? undefined,
      );
      if (activeSectionDiagnostic) {
        appendSectionDiagnosticCard(
          previewGrid,
          activeSectionDiagnostic,
          `preview-${activeSectionDiagnostic.key}`,
        );
      }
      for (const chunk of chunkPreview.chunks) {
        const card = document.createElement("article");
        card.className =
          chunk.chunkId === chunkPreviewActiveChunkId
            ? "demo-result-item demo-result-item-active"
            : "demo-result-item";
        card.innerHTML = `<h3>${chunk.chunkId}</h3><p class="demo-result-source">source: ${chunk.source ?? chunkPreview.document.source}</p><p class="demo-metadata">${getChunkIndexText(chunk, chunkPreview.chunks.length)}</p><p class="demo-result-text">${chunk.text}</p>`;
        previewGrid.append(card);
      }
      inlinePreview.append(caption, summaryText, normalizedCard, previewGrid);
    } else if (
      chunkPreviewLoadingDocumentId === null &&
      chunkPreview === null
    ) {
      const hint = document.createElement("p");
      hint.className = "demo-metadata";
      hint.textContent = emptyPreviewMessage;
      inlinePreview.append(hint);
    }

    content.append(action, keyValueGrid, previewText, inlinePreview);
    details.append(summary, content);
    wrapper.append(details);
  }

  documentListEl.innerHTML = "";
  documentListEl.append(wrapper);
};

const formatStatus = (status: DemoStatusView) => {
  const statusRerankerEl = document.getElementById("status-reranker");
  const statusRerankerSummaryEl = document.getElementById(
    "status-reranker-summary",
  );
  statusBackendEl.textContent = status.backend;
  statusModeEl.textContent = status.vectorMode;
  statusDimensionsEl.textContent =
    status.dimensions === undefined ? "n/a" : `${status.dimensions}`;
  statusNativeEnabledEl.textContent = status.native.active
    ? "active"
    : "inactive";
  statusResolutionEl.textContent =
    status.native.sourceLabel ?? "Not applicable";
  statusDocumentsEl.textContent = `${status.documents.total}`;
  statusChunkTotalEl.textContent = `${status.chunkCount}`;
  statusSeedCountEl.textContent = `${status.documents.byKind.seed}`;
  if (statusCustomCountEl !== null) {
    statusCustomCountEl.textContent = `${status.documents.byKind.custom}`;
  }
  statusCapabilitiesEl.textContent = status.capabilities.join(" · ");
  statusModeSummaryEl.textContent = status.native.active
    ? "Native vector acceleration is active."
    : "Owned JSON fallback retrieval is active.";
  statusMessageEl.textContent =
    status.native.fallbackReason ?? status.vectorModeMessage;
  if (statusRerankerEl !== null) {
    statusRerankerEl.textContent = status.reranker.label;
  }
  if (statusRerankerSummaryEl !== null) {
    statusRerankerSummaryEl.textContent = status.reranker.summary;
  }
};

const setSearchValue = (name: string, value: string) => {
  const field = searchForm.elements.namedItem(name) as
    | HTMLInputElement
    | HTMLSelectElement
    | null;
  if (field === null) return;
  field.value = value;
  renderSearchScope();
};

const readSearchFormState = (): SearchFormState => ({
  query: toSafeText(
    (searchForm.elements.namedItem("query") as HTMLInputElement | null)
      ?.value ?? "",
  ),
  topK: toNumber(
    (searchForm.elements.namedItem("topK") as HTMLInputElement | null)?.value ??
      "6",
    6,
  ),
  scoreThreshold: toSafeText(
    (searchForm.elements.namedItem("scoreThreshold") as HTMLInputElement | null)
      ?.value ?? "",
  ),
  kind:
    (((searchForm.elements.namedItem("kind") as HTMLSelectElement | null)
      ?.value ?? "") as SearchFormState["kind"]) || "",
  source: toSafeText(
    (searchForm.elements.namedItem("source") as HTMLInputElement | null)
      ?.value ?? "",
  ),
  documentId: toSafeText(
    (searchForm.elements.namedItem("documentId") as HTMLInputElement | null)
      ?.value ?? "",
  ),
  nativeQueryProfile: activeNativeQueryProfile ?? "",
});

const renderSearchScope = () => {
  const state = readSearchFormState();
  searchScopeSummaryEl.textContent = formatRetrievalScopeSummary(state);
  searchScopeHintEl.textContent = `${formatRetrievalScopeHint(state)} Scope changed by: ${scopeDriver}.`;
  const sourceField = searchForm.elements.namedItem(
    "source",
  ) as HTMLInputElement | null;
  const documentField = searchForm.elements.namedItem(
    "documentId",
  ) as HTMLInputElement | null;
  sourceField?.classList.toggle(
    "demo-filter-active",
    state.source.trim().length > 0,
  );
  documentField?.classList.toggle(
    "demo-filter-active",
    state.documentId.trim().length > 0,
  );
  renderStateChips();
};

const fillSearchForm = (state: Partial<SearchFormState>) => {
  const query = state.query ?? "";
  if (query.length > 0) {
    setSearchValue("query", query);
  }

  const topK = state.topK;
  if (typeof topK === "number" && topK > 0) {
    setSearchValue("topK", String(topK));
  }

  setSearchValue("kind", state.kind ?? "");
  setSearchValue("source", state.source ?? "");
  setSearchValue("scoreThreshold", state.scoreThreshold ?? "");
  setSearchValue("documentId", state.documentId ?? "");
  activeNativeQueryProfile = state.nativeQueryProfile ?? "";
};

const runSearchFromValues = async (state: SearchFormState) => {
  if (state.query.length === 0) {
    setError(searchErrorEl, "query is required");
    return;
  }

  const payload = buildSearchPayload({
    ...state,
    retrievalPresetId: retrievalPresetId || undefined,
  });

  try {
    const start = Date.now();
    const response = await fetch(`/demo/message/${selectedMode}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const detailed = (await response.json()) as {
      ok: boolean;
      results?: Parameters<typeof buildSearchResponse>[2];
      trace?: Parameters<typeof buildSearchResponse>[4];
      error?: string;
    };
    if (!response.ok || !detailed.ok) {
      throw new Error(
        detailed.error ?? `Search failed with status ${response.status}`,
      );
    }
    const results = detailed.results ?? [];
    recentQueries = [
      { label: state.query, state: { ...state } },
      ...recentQueries.filter(
        (entry) => JSON.stringify(entry.state) !== JSON.stringify(state),
      ),
    ].slice(0, 4);
    void saveRecentQueries("html", selectedMode, recentQueries);
    void saveActiveRetrievalState("html", selectedMode, {
      searchForm: state,
      scopeDriver,
      lastUpdatedAt: Date.now(),
      retrievalPresetId: retrievalPresetId || undefined,
      benchmarkPresetId: benchmarkPresetId || undefined,
      uploadPresetId: uploadPresetId || undefined,
    });

    renderSearchResults(
      buildSearchResponse(
        state.query,
        payload,
        results,
        Date.now() - start,
        detailed.trace,
      ),
    );
    searchMetaEl.textContent = `${formatRetrievalScopeSummary(state)}. Reranking is active: AbsoluteJS reorders the first vector hits with the built-in heuristic provider before these results render. Verification rule: a good result shows chunk text that answers the query and a source label you can trace back to the indexed source list.`;
  } catch (error) {
    setError(
      searchErrorEl,
      error instanceof Error
        ? `Search failed: ${error.message}`
        : "Search failed",
    );
  }
};

const renderSearchTrace = (trace: RAGRetrievalTrace | undefined) => {
  if (!trace) {
    return null;
  }
  const presentation = buildTracePresentation(trace);

  const section = document.createElement("div");
  section.className = "demo-results";
  const title = document.createElement("h3");
  title.textContent = "Retrieval Trace";
  const summary = document.createElement("p");
  summary.className = "demo-metadata";
  summary.textContent =
    "This is the first-class retrieval trace from AbsoluteJS. It shows how the query was transformed, which retrieval stages ran, and how many candidates survived each step.";
  const stats = document.createElement("div");
  stats.className = "demo-stat-grid";
  presentation.stats.forEach(({ label, value }) => {
    const card = document.createElement("article");
    card.className = "demo-stat-card";
    card.innerHTML =
      '<p class="demo-section-caption">' +
      label +
      "</p><strong>" +
      value +
      "</strong>";
    stats.append(card);
  });
  const kv = document.createElement("div");
  kv.innerHTML = presentation.details
    .map(
      (row) =>
        '<p class="demo-key-value-row"><strong>' +
        row.label +
        "</strong><span>" +
        row.value +
        "</span></p>",
    )
    .join("");
  const stepGrid = document.createElement("div");
  stepGrid.className = "demo-result-grid";
  presentation.steps.forEach((step, index) => {
    const details = document.createElement("details");
    details.className = "demo-collapsible demo-result-item";
    if (index === 0) details.open = true;
    const summaryEl = document.createElement("summary");
    summaryEl.innerHTML =
      "<strong>" + String(index + 1) + ". " + step.label + "</strong>";
    details.append(summaryEl);
    const meta = document.createElement("div");
    meta.innerHTML = step.rows
      .map(
        (row) =>
          '<p class="demo-key-value-row"><strong>' +
          row.label +
          "</strong><span>" +
          row.value +
          "</span></p>",
      )
      .join("");
    details.append(meta);
    stepGrid.append(details);
  });
  section.append(title, summary, stats, kv, stepGrid);
  return section;
};

const renderWorkflowTrace = (trace: RAGRetrievalTrace | undefined) => {
  streamTraceGridEl.innerHTML = "";
  if (!trace) {
    streamTraceEl.hidden = true;
    return;
  }
  const presentation = buildTracePresentation(trace);

  streamTraceEl.hidden = false;

  const summaryCard = document.createElement("article");
  summaryCard.className = "demo-result-item";
  summaryCard.innerHTML = [
    '<div class="demo-stat-grid">',
    presentation.stats
      .map(
        (row) =>
          '<article class="demo-stat-card"><p class="demo-section-caption">' +
          row.label +
          "</p><strong>" +
          row.value +
          "</strong></article>",
      )
      .join(""),
    "</div>",
    presentation.details
      .map(
        (row) =>
          '<p class="demo-key-value-row"><strong>' +
          row.label +
          "</strong><span>" +
          row.value +
          "</span></p>",
      )
      .join(""),
  ].join("");
  streamTraceGridEl.append(summaryCard);

  for (const [index, step] of presentation.steps.entries()) {
    const details = document.createElement("details");
    details.className = "demo-collapsible demo-result-item";
    if (index === 0) {
      details.open = true;
    }
    const summary = document.createElement("summary");
    summary.innerHTML =
      "<strong>" + String(index + 1) + ". " + step.label + "</strong>";
    details.append(summary);
    const meta = document.createElement("div");
    meta.innerHTML = step.rows
      .map(
        (row) =>
          '<p class="demo-key-value-row"><strong>' +
          row.label +
          "</strong><span>" +
          row.value +
          "</span></p>",
      )
      .join("");
    details.append(meta);
    streamTraceGridEl.append(details);
  }
};

const appendSectionDiagnosticCard = (
  container: HTMLElement,
  diagnostic: NonNullable<SearchResponse["sectionDiagnostics"]>[number],
  keyPrefix: string,
) => {
  const card = document.createElement("article");
  card.className = "demo-result-item";
  card.innerHTML = `<h4>${diagnostic.label}</h4><p class="demo-result-source">${diagnostic.summary}</p>`;
  [
    formatSectionDiagnosticChannels(diagnostic),
    formatSectionDiagnosticAttributionFocus(diagnostic),
    formatSectionDiagnosticPipeline(diagnostic),
    formatSectionDiagnosticStageFlow(diagnostic),
    formatSectionDiagnosticStageBounds(diagnostic),
    ...formatSectionDiagnosticStageWeightRows(diagnostic),
    formatSectionDiagnosticTopEntry(diagnostic),
    formatSectionDiagnosticCompetition(diagnostic),
  ]
    .filter(Boolean)
    .forEach((line) => {
      const meta = document.createElement("p");
      meta.className = "demo-metadata";
      meta.textContent = String(line);
      card.append(meta);
    });
  const reasons = formatSectionDiagnosticReasons(diagnostic);
  const stageWeightReasons =
    formatSectionDiagnosticStageWeightReasons(diagnostic);
  if (reasons.length > 0 || stageWeightReasons.length > 0) {
    const badgeRow = document.createElement("div");
    badgeRow.className = "demo-badge-row";
    [...reasons, ...stageWeightReasons].forEach((reason, index) => {
      const badge = document.createElement("span");
      badge.className = "demo-state-chip";
      badge.textContent = reason;
      badge.dataset.key = `${keyPrefix}-reason-${index}`;
      badgeRow.append(badge);
    });
    card.append(badgeRow);
  }
  formatSectionDiagnosticDistributionRows(diagnostic).forEach((line) => {
    const meta = document.createElement("p");
    meta.className = "demo-metadata";
    meta.textContent = line;
    card.append(meta);
  });
  container.append(card);
};

const renderSearchResults = (result: SearchResponse) => {
  searchResultsWrapper.hidden = false;
  searchCountEl.textContent = `${result.count} results for “${result.query}” in ${result.elapsedMs}ms`;
  renderStateChips();
  if (result.count === 0) {
    searchResultGrid.innerHTML = "<p>No matching chunks.</p>";
    const traceSection = renderSearchTrace(result.trace);
    if (traceSection) {
      searchResultGrid.append(traceSection);
    }
    return;
  }

  searchResultGrid.innerHTML = "";
  if (result.storyHighlights.length > 0) {
    const storySection = document.createElement("div");
    storySection.className = "demo-results";
    const title = document.createElement("h3");
    title.textContent = "Retrieval Story";
    storySection.append(title);
    result.storyHighlights.forEach((line) => {
      const item = document.createElement("p");
      item.className = "demo-metadata";
      item.textContent = line;
      storySection.append(item);
    });
    searchResultGrid.append(storySection);
  }
  if (result.attributionOverview.length > 0) {
    const attributionSection = document.createElement("div");
    attributionSection.className = "demo-results";
    const title = document.createElement("h3");
    title.textContent = "Attribution Overview";
    attributionSection.append(title);
    result.attributionOverview.forEach((line) => {
      const item = document.createElement("p");
      item.className = "demo-metadata";
      item.textContent = line;
      attributionSection.append(item);
    });
    searchResultGrid.append(attributionSection);
  }
  if (result.sectionDiagnostics.length > 0) {
    const diagnosticsSection = document.createElement("div");
    diagnosticsSection.className = "demo-results";
    const title = document.createElement("h3");
    title.textContent = "Section Diagnostics";
    const grid = document.createElement("div");
    grid.className = "demo-result-grid";
    result.sectionDiagnostics.forEach((diagnostic) =>
      appendSectionDiagnosticCard(grid, diagnostic, `search-${diagnostic.key}`),
    );
    diagnosticsSection.append(title, grid);
    searchResultGrid.append(diagnosticsSection);
  }
  for (const group of buildSearchSectionGroups(result)) {
    const groupCard = document.createElement("article");
    groupCard.className = "demo-result-item";
    groupCard.id = group.targetId;
    const title = document.createElement("h3");
    title.textContent = group.label;
    const summary = document.createElement("p");
    summary.className = "demo-result-source";
    summary.textContent = group.summary;
    groupCard.append(title, summary);
    if (group.jumps.length > 0) {
      const jumps = document.createElement("div");
      jumps.className = "demo-badge-row";
      for (const jump of group.jumps) {
        const link = document.createElement("a");
        link.className = "demo-state-chip";
        link.href = `#${jump.targetId}`;
        link.textContent = jump.label;
        jumps.append(link);
      }
      groupCard.append(jumps);
    }
    const nestedGrid = document.createElement("div");
    nestedGrid.className = "demo-result-grid";
    for (const chunk of group.chunks) {
      const card = document.createElement("article");
      const itemTitle = document.createElement("h4");
      const score = document.createElement("p");
      const source = document.createElement("p");
      const text = document.createElement("p");
      card.className = "demo-result-item";
      card.id = chunk.targetId;
      itemTitle.textContent = chunk.title;
      score.className = "demo-result-score";
      score.textContent = `score: ${formatScore(chunk.score)}`;
      source.className = "demo-result-source";
      source.textContent = `source: ${chunk.source}`;
      text.className = "demo-result-text";
      text.textContent = chunk.text;
      const labelLines = [
        chunk.labels?.contextLabel,
        chunk.labels?.locatorLabel,
        chunk.labels?.provenanceLabel,
      ]
        .filter((value) => typeof value === "string" && value.length > 0)
        .map((line) => {
          const metadataLine = document.createElement("p");
          metadataLine.className = "demo-metadata";
          metadataLine.textContent = line ?? "";
          return metadataLine;
        });
      const metadataNodes = formatDemoMetadataSummary(chunk.metadata).map(
        (line) => {
          const metadataLine = document.createElement("p");
          metadataLine.className = "demo-metadata";
          metadataLine.textContent = line;
          return metadataLine;
        },
      );

      card.append(
        itemTitle,
        score,
        source,
        ...labelLines,
        ...metadataNodes,
        text,
      );
      nestedGrid.append(card);
    }
    groupCard.append(nestedGrid);
    searchResultGrid.append(groupCard);
  }

  const traceSection = renderSearchTrace(result.trace);
  if (traceSection) {
    searchResultGrid.append(traceSection);
  }
};

const hideSearchResults = () => {
  searchResultsWrapper.hidden = true;
  searchCountEl.textContent = "";
  searchMetaEl.textContent = "";
  searchResultGrid.innerHTML = "";
  renderStateChips();
};

const clearEvaluationResults = () => {
  evaluationResponse = null;
  evaluationResultsEl.hidden = true;
  evaluationResultsEl.innerHTML = "";
  evaluationMessageEl.hidden = true;
  evaluationMessageEl.textContent = "";
  setError(evaluationErrorEl, "");
};

const renderEvaluationResults = (response: RAGEvaluationResponse) => {
  evaluationResponse = response;
  evaluationResultsEl.hidden = false;
  evaluationResultsEl.innerHTML = "";
  evaluationMessageEl.hidden = false;
  evaluationMessageEl.textContent = `Benchmark summary: ${formatEvaluationSummary(response)}`;

  for (const entry of response.cases) {
    const card = document.createElement("article");
    card.className = `demo-result-item demo-evaluation-card demo-evaluation-${entry.status}`;
    card.innerHTML = `<h4>${entry.label ?? entry.caseId}</h4><p class="demo-result-source">${entry.query}</p><p class="demo-evaluation-status">${entry.status.toUpperCase()}</p><p class="demo-metadata">${formatEvaluationCaseSummary(entry)}</p><p class="demo-metadata">expected: ${formatEvaluationExpected(entry)}</p><p class="demo-metadata">retrieved: ${formatEvaluationRetrieved(entry)}</p><p class="demo-result-text">missing: ${formatEvaluationMissing(entry)}</p>`;
    evaluationResultsEl.append(card);
  }
};

const runSavedSuite = async () => {
  setError(evaluationErrorEl, "");
  showMessage("");
  qualitySuiteButtonEl.disabled = true;

  try {
    const run = await runRAGEvaluationSuite({
      suite: evaluationSuite,
      evaluate: (input) => ragClient.evaluate(input),
    });
    suiteRuns = [run, ...suiteRuns];
    renderQualityState();
    showMessage(
      `Saved suite run finished in ${run.elapsedMs}ms and ranked ${buildRAGEvaluationLeaderboard(suiteRuns).length} workflow run(s).`,
    );
  } catch (error) {
    setError(
      evaluationErrorEl,
      error instanceof Error
        ? `Saved suite failed: ${error.message}`
        : "Saved suite failed",
    );
  } finally {
    qualitySuiteButtonEl.disabled = false;
  }
};

const runEvaluation = async () => {
  clearEvaluationResults();
  evaluationButtonEl.disabled = true;
  evaluationButtonEl.textContent = "Running benchmark suite...";

  try {
    const response = await ragClient.evaluate(buildDemoEvaluationInput());
    evaluationMessageEl.hidden = false;
    evaluationMessageEl.textContent = `Benchmark suite finished in ${response.elapsedMs}ms across ${response.totalCases} benchmark queries.`;
    renderEvaluationResults(response);
  } catch (error) {
    setError(
      evaluationErrorEl,
      error instanceof Error
        ? `Evaluation failed: ${error.message}`
        : "Evaluation failed",
    );
  } finally {
    evaluationButtonEl.disabled = false;
    evaluationButtonEl.textContent = "Run benchmark suite";
  }
};

const renderHeaderNav = () => {
  headerNavEl.innerHTML = "";

  const frameworkIds = [
    "react",
    "svelte",
    "vue",
    "angular",
    "html",
    "htmx",
  ] as const;
  for (const backend of backendOptions) {
    const row = document.createElement("div");
    row.className = "demo-nav-row";

    const label = document.createElement("span");
    label.className =
      backend.id === selectedMode
        ? "demo-nav-row-label active"
        : "demo-nav-row-label";
    label.textContent = backend.label;
    row.append(label);

    for (const frameworkId of frameworkIds) {
      const anchor = document.createElement("a");
      anchor.textContent =
        frameworkId === "htmx"
          ? "HTMX"
          : frameworkId === "html"
            ? "HTML"
            : frameworkId[0].toUpperCase() + frameworkId.slice(1);
      if (backend.available) {
        anchor.href = getDemoPagePath(frameworkId, backend.id);
      } else {
        anchor.classList.add("disabled");
        anchor.setAttribute("aria-disabled", "true");
        if (backend.reason) {
          anchor.title = backend.reason;
        }
      }
      if (frameworkId === "html" && backend.id === selectedMode) {
        anchor.classList.add("active");
      }
      row.append(anchor);
    }

    headerNavEl.append(row);
  }
};

const runUploadPreset = async (preset: DemoUploadPreset) => {
  uploadStatusEl.innerHTML =
    '<p class="demo-metadata">Uploading ' + preset.label + "...</p>";
  try {
    const fixture = await fetch(getDemoUploadFixtureUrl(preset.id));
    if (!fixture.ok) {
      throw new Error(
        "Failed to load " + preset.fileName + ": " + String(fixture.status),
      );
    }

    const response = await ragClient.ingestUploads(
      buildDemoUploadIngestInput(
        preset,
        encodeArrayBufferToBase64(await fixture.arrayBuffer()),
      ),
    );
    if (!response.ok) {
      throw new Error(response.error ?? "Upload ingest failed");
    }

    uploadStatusEl.innerHTML =
      '<p class="demo-banner">Uploaded ' +
      preset.label +
      ' through the extractor-backed ingest route.</p><p class="demo-metadata">Verification query: ' +
      preset.query +
      '</p><p class="demo-metadata">Expected uploaded source: ' +
      (preset.expectedSources[0] ?? preset.source) +
      "</p>";
    uploadPresetId = preset.id;
    fillSearchForm({
      query: preset.query,
      source: preset.expectedSources[0] ?? preset.source,
      topK: 6,
    });
    await runSearchFromValues(readSearchForm());
  } catch (error) {
    uploadStatusEl.innerHTML =
      '<p class="demo-error">' +
      (error instanceof Error
        ? "Upload failed: " + error.message
        : "Upload failed") +
      "</p>";
  }
};

const renderUploadPresets = () => {
  uploadPresetContainerEl.innerHTML = "";
  for (const preset of demoUploadPresets) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = preset.label;
    button.title = preset.description;
    button.addEventListener("click", () => {
      void runUploadPreset(preset);
    });
    uploadPresetContainerEl.append(button);
  }
};

const uploadSelectedDocumentFile = async () => {
  if (selectedUploadFile === null) {
    uploadStatusEl.innerHTML =
      '<p class="demo-error">Choose a file before uploading.</p>';
    return;
  }

  uploadStatusEl.innerHTML = `<p class="demo-metadata">Uploading ${selectedUploadFile.name}...</p>`;
  try {
    const uploadedName = selectedUploadFile.name;
    const response = await ragClient.ingestUploads({
      baseMetadata: {
        fileKind: "uploaded-user-file",
        kind: "custom",
      },
      uploads: [
        {
          name: uploadedName,
          source: `uploads/${uploadedName}`,
          title: uploadedName,
          contentType: selectedUploadFile.type || "application/octet-stream",
          encoding: "base64",
          content: encodeArrayBufferToBase64(
            await selectedUploadFile.arrayBuffer(),
          ),
          metadata: {
            kind: "custom",
            uploadedFrom: "html-general-upload",
          },
        },
      ],
    });
    if (!response.ok) {
      throw new Error(response.error ?? "Upload ingest failed");
    }

    uploadStatusEl.innerHTML = `<p class="demo-banner">Uploaded ${uploadedName}. Extracted ${String(response.count ?? 0)} chunk(s) across ${String(response.documentCount ?? 1)} document(s).</p>`;
    selectedUploadFile = null;
    uploadFileInputEl.value = "";
    uploadFileSelectionEl.hidden = true;
    uploadFileSelectionEl.textContent = "";
    await refreshData();
    fillSearchForm({
      query: `Explain ${uploadedName}`,
      source: `uploads/${uploadedName}`,
      topK: 6,
    });
    scopeDriver = "upload verification";
    await runSearchFromValues(readSearchForm());
  } catch (error) {
    uploadStatusEl.innerHTML = `<p class="demo-error">${error instanceof Error ? `Upload failed: ${error.message}` : "Upload failed"}</p>`;
  }
};

const renderDocumentTypeOptions = () => {
  documentTypeFilterEl.innerHTML = "";
  for (const [value, label] of SUPPORTED_FILE_TYPE_OPTIONS) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected =
      value === documentTypeFilterEl.value ||
      (documentTypeFilterEl.value === "" && value === "all");
    documentTypeFilterEl.append(option);
  }
};

const renderEvaluationPresets = () => {
  evaluationPresetContainerEl.innerHTML = "";

  const previousRail = evaluationPresetContainerEl.previousElementSibling;
  if (
    previousRail instanceof HTMLDivElement &&
    previousRail.dataset.role === "benchmark-outcome-rail"
  ) {
    previousRail.remove();
  }
  evaluationPresetContainerEl.insertAdjacentHTML(
    "beforebegin",
    `<div class="demo-badge-row" data-role="benchmark-outcome-rail">${benchmarkOutcomeRail.map((entry) => `<span class="demo-state-chip" title="${escapeHtml(entry.summary)}">${escapeHtml(formatBenchmarkOutcomeRailLabel(entry, benchmarkPresetId))}</span>`).join("")}</div>`,
  );
  for (const preset of demoEvaluationPresets) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = preset.label;
    button.title = preset.description;
    button.addEventListener("click", () => {
      fillSearchForm({
        query: preset.query,
        source: preset.expectedSources[0] ?? "",
        topK: preset.topK ?? 6,
      });
      benchmarkPresetId = preset.id;
      retrievalPresetId = resolveBenchmarkRetrievalPresetId(preset.id);
      uploadPresetId = "";
      scopeDriver = `benchmark preset: ${preset.label}`;
      renderEvaluationPresets();
      void runSearchFromValues(readSearchForm());
    });
    evaluationPresetContainerEl.append(button);
  }
};

const loadBackendOptions = async () => {
  try {
    const response = await fetch("/demo/backends");
    if (!response.ok) {
      throw new Error(
        `Failed to load backend availability: ${response.status}`,
      );
    }
    backendOptions = getAvailableDemoBackends(
      (await response.json()) as DemoBackendDescriptor[],
    );
  } catch {
    backendOptions = getAvailableDemoBackends();
  }
};

const refreshData = async () => {
  showLoading("Loading status and documents...");
  setError(searchErrorEl, "");
  setError(addErrorEl, "");
  try {
    const nextMode = selectedMode;
    activeRagPath = getRAGPathForMode(nextMode);
    ragClient = createRAGClient({ path: activeRagPath });
    resetStreamConnection();
    await loadBackendOptions();
    renderHeaderNav();

    const [
      statusData,
      docsData,
      opsData,
      aiModelsResponse,
      qualityResponse,
      releaseResponse,
    ] = await Promise.all([
      ragClient.status(),
      ragClient.documents(),
      ragClient.ops(),
      fetch("/demo/ai-models").then((response) =>
        response.json(),
      ) as Promise<DemoAIModelCatalogResponse>,
      fetch(`/demo/quality/${selectedMode}`).then((response) =>
        response.json(),
      ) as Promise<DemoRetrievalQualityResponse>,
      fetch(`/demo/release/${selectedMode}?workspace=${releaseWorkspace}`).then(
        (response) => response.json(),
      ) as Promise<DemoReleaseOpsResponse>,
    ]);
    aiModelCatalog = aiModelsResponse;
    qualityData = qualityResponse;
    releaseData = releaseResponse;
    renderQualityState();
    renderReleaseState();
    if (!streamModelKeyEl.value) {
      streamModelKeyEl.value =
        aiModelsResponse.defaultModelKey ??
        aiModelsResponse.models[0]?.key ??
        "";
    }
    renderAIModelOptions();

    const formatted = buildStatusView(
      statusData.status as never,
      statusData.capabilities as never,
      docsData.documents as DemoDocument[],
      selectedMode,
    );
    if (formatted !== null) {
      formatStatus(formatted);
    }
    documentsCache = docsData.documents as DemoDocument[];
    renderEvaluationPresets();
    renderUploadPresets();
    renderDocumentTypeOptions();
    renderOpsState(opsData);
    formatDocuments(documentsCache);
    if (
      chunkPreview !== null &&
      !documentsCache.some(
        (document) => document.id === chunkPreview?.document.id,
      )
    ) {
      clearChunkPreview();
    }
    showMessage("");
  } catch (error) {
    showMessage(
      error instanceof Error
        ? `Unable to load demo data: ${error.message}`
        : "Unable to load demo data",
    );
  } finally {
    showLoading("");
  }
};

void loadRecentQueries("html", selectedMode).then((entries) => {
  recentQueries = entries;
  renderStateChips();
});
void loadActiveRetrievalState("html", selectedMode).then((state) => {
  if (state) {
    fillSearchForm(state.searchForm);
    scopeDriver = state.scopeDriver;
    retrievalPresetId = state.retrievalPresetId ?? "";
    benchmarkPresetId = state.benchmarkPresetId ?? "";
    uploadPresetId = state.uploadPresetId ?? "";
    streamModelKeyEl.value = state.streamModelKey ?? streamModelKeyEl.value;
    streamQueryInput.value = state.streamPrompt ?? streamQueryInput.value;
    restoredSharedState = true;
    const uploadLabel = demoUploadPresets.find(
      (preset) => preset.id === state.uploadPresetId,
    )?.label;
    const benchmarkLabel = demoEvaluationPresets.find(
      (preset) => preset.id === state.benchmarkPresetId,
    )?.label;
    const label =
      uploadLabel ??
      benchmarkLabel ??
      state.retrievalPresetId ??
      "manual state";
    restoredSharedStateSummary = `Restored from shared demo state · ${label} · ${new Date(state.lastUpdatedAt ?? Date.now()).toLocaleString()}.`;
  } else {
    restoredSharedState = false;
    restoredSharedStateSummary = "";
    renderStateChips();
  }
  renderStateChips();
});

const submitStreamQuery = (event: SubmitEvent) => {
  event.preventDefault();
  const prompt = toSafeText(streamQueryInput.value, "");
  if (prompt.length === 0) {
    setError(
      streamErrorEl,
      "Enter a retrieval question before starting the stream.",
    );
    return;
  }
  if (streamModelKeyEl.value.length === 0) {
    setError(
      streamErrorEl,
      "Configure an AI provider to enable retrieval streaming.",
    );
    return;
  }

  setError(streamErrorEl, "");
  ragWorkflow.query(buildDemoAIStreamPrompt(streamModelKeyEl.value, prompt));
};

const submitSearch = async (event: SubmitEvent) => {
  event.preventDefault();
  scopeDriver = "manual filters";
  renderSearchScope();
  setError(searchErrorEl, "");
  hideSearchResults();
  await runSearchFromValues(readSearchForm());
};

const onPresetSearch = async (event: Event) => {
  const button = event.currentTarget as HTMLButtonElement;
  const query = toSafeText(button.dataset.query ?? "", "");
  if (query.length === 0) return;

  scopeDriver =
    button.dataset.driver ??
    `preset: ${button.textContent?.trim().toLowerCase() ?? "preset"}`;
  benchmarkPresetId =
    button.dataset.benchmarkPresetId ??
    (button.textContent?.trim().toLowerCase() ?? "preset").replace(/\s+/g, "-");
  retrievalPresetId =
    button.dataset.retrievalPresetId ??
    resolveBenchmarkRetrievalPresetId(benchmarkPresetId);
  uploadPresetId = "";
  const source = toSafeText(button.dataset.source ?? "", "");
  const kind = button.dataset.kind ?? "";
  const nativeQueryProfile = (button.dataset.nativeQueryProfile ??
    "") as SearchFormState["nativeQueryProfile"];
  const topK = Number(button.dataset.topk ?? "6");
  fillSearchForm({
    query,
    source,
    kind: kind === "seed" || kind === "custom" ? kind : "",
    documentId: "",
    nativeQueryProfile,
    topK:
      Number.isFinite(topK) && topK > 0 ? Math.min(20, Math.floor(topK)) : 6,
    scoreThreshold: "",
  });
  setError(searchErrorEl, "");
  hideSearchResults();
  await runSearchFromValues(readSearchForm());
};

const submitAddDocument = async (event: SubmitEvent) => {
  event.preventDefault();
  setError(addErrorEl, "");
  const addValues = readAddForm();
  if (addValues.title.length === 0 || addValues.text.length === 0) {
    setError(addErrorEl, "title and text are required");
    return;
  }

  if (addValues.source.length === 0) {
    setError(addErrorEl, "source is required");
    return;
  }

  try {
    const response = await ragClient.createDocument({
      id: addValues.id.length > 0 ? addValues.id : undefined,
      title: addValues.title,
      source: addValues.source,
      format: addValues.format,
      text: addValues.text,
      chunking: {
        strategy: addValues.chunkStrategy,
      },
    });
    if (!response.ok) {
      throw new Error(response.error ?? "Failed to insert document");
    }
    showMessage(`Inserted ${response.inserted ?? addValues.title}`);
    addForm.reset();
    setAddFormDefaults();
    await refreshData();
  } catch (error) {
    setError(
      addErrorEl,
      error instanceof Error
        ? `Failed to insert: ${error.message}`
        : "Failed to insert document",
    );
  }
};

const setAddFormDefaults = () => {
  const formatField = addForm.elements.namedItem(
    "format",
  ) as HTMLSelectElement | null;
  const chunkField = addForm.elements.namedItem(
    "chunkStrategy",
  ) as HTMLSelectElement | null;
  if (formatField !== null)
    formatField.value = demoContentFormats[0] ?? "markdown";
  if (chunkField !== null)
    chunkField.value = demoChunkingStrategies[0] ?? "source_aware";
};

const reseed = async () => {
  showMessage("Reseeding defaults...");
  setError(searchErrorEl, "");
  setError(addErrorEl, "");
  try {
    const response = await ragClient.reseed();
    if (!response.ok) {
      throw new Error(response.error ?? "Reseed failed");
    }
    showMessage(`Reseed complete. Documents=${response.documents ?? 0}`);
    await refreshData();
  } catch (error) {
    showMessage(
      error instanceof Error
        ? `Reseed failed: ${error.message}`
        : "Reseed failed",
    );
  }
};

const resetCustom = async () => {
  showMessage("Resetting custom documents...");
  setError(searchErrorEl, "");
  setError(addErrorEl, "");
  try {
    const response = await ragClient.reset();
    if (!response.ok) {
      throw new Error(response.error ?? "Reset failed");
    }
    showMessage(`Reset complete. Documents=${response.documents ?? 0}`);
    hideSearchResults();
    await refreshData();
  } catch (error) {
    showMessage(
      error instanceof Error
        ? `Reset failed: ${error.message}`
        : "Reset failed",
    );
  }
};

streamForm.addEventListener("submit", submitStreamQuery);
evaluationButtonEl.addEventListener("click", () => {
  void runEvaluation();
});
qualitySuiteButtonEl.addEventListener("click", () => {
  void runSavedSuite();
});

qualityTabRowEl.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const nextView = target.getAttribute("data-quality-view");
  if (
    !nextView ||
    !["overview", "strategies", "grounding", "history"].includes(nextView)
  )
    return;
  if (
    nextView === "overview" ||
    nextView === "strategies" ||
    nextView === "grounding" ||
    nextView === "history"
  ) {
    qualityView = nextView;
  }
  renderQualityState();
});
streamActionButton.addEventListener("click", (event) => {
  if (isStreamBusy()) {
    event.preventDefault();
    ragWorkflow.cancel();
  }
});
searchForm.addEventListener("submit", submitSearch);
searchForm.addEventListener("input", renderSearchScope);
searchForm.addEventListener("change", renderSearchScope);
addForm.addEventListener("submit", submitAddDocument);
uploadFileInputEl.addEventListener("change", () => {
  selectedUploadFile = uploadFileInputEl.files?.[0] ?? null;
  uploadFileSelectionEl.hidden = selectedUploadFile === null;
  uploadFileSelectionEl.textContent =
    selectedUploadFile === null
      ? ""
      : `Selected file: ${selectedUploadFile.name}`;
});
uploadFileButtonEl.addEventListener("click", () => {
  void uploadSelectedDocumentFile();
});
documentSearchEl.addEventListener("input", () => {
  documentPage = 1;
  formatDocuments(documentsCache);
});
documentTypeFilterEl.addEventListener("change", () => {
  documentPage = 1;
  formatDocuments(documentsCache);
});
reseedButton.addEventListener("click", reseed);
resetButton.addEventListener("click", resetCustom);
refreshButton.addEventListener("click", refreshData);
syncAllButton.addEventListener("click", async () => {
  showMessage("Starting source sync...");
  try {
    const result = await ragClient.syncAllSources({ background: true });
    showMessage(
      `Started sync for ${"sources" in result ? result.sources.length : 0} source(s). Watch the sync feedback panel for progress.`,
    );
    await refreshData();
  } catch (error) {
    showMessage(
      error instanceof Error
        ? `Source sync failed: ${error.message}`
        : "Source sync failed",
    );
  }
});
syncAllBackgroundButton.addEventListener("click", async () => {
  showMessage("Queueing background sync...");
  try {
    await ragClient.syncAllSources({ background: true });
    await refreshData();
  } catch (error) {
    showMessage(
      error instanceof Error
        ? `Failed to queue background sync: ${error.message}`
        : "Failed to queue background sync",
    );
  }
});
for (const button of presetContainerEl.querySelectorAll("button")) {
  button.addEventListener("click", onPresetSearch);
}

setAddFormDefaults();
renderDocumentTypeOptions();
formatDocuments(documentsCache);
clearEvaluationResults();
renderStreamState();
renderSearchScope();
renderStateChips();
renderSectionCards();
applyActiveSection();
stateScopeChipEl.addEventListener("click", () => {
  void clearRetrievalScope();
});
stateDriverChipEl.addEventListener("click", () => {
  void clearRetrievalScope();
});
stateRerunChipEl.addEventListener("click", () => {
  void rerunLastQuery();
});
stateClearChipEl.addEventListener("click", clearAllRetrievalState);
void loadRagReadiness();
