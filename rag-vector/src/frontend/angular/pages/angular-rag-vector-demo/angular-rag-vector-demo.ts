import { FormsModule } from "@angular/forms";
import { ChangeDetectorRef, Component, inject } from "@angular/core";
import { RAGClientService, RAGWorkflowService } from "@absolutejs/rag/angular";
import { usePageContext, useTimers } from "@absolutejs/absolute/angular";
import { AngularRAGAuthMenuComponent } from "../../components/angular-rag-auth-menu/angular-rag-auth-menu";
import {
  buildRAGEvaluationLeaderboard,
  runRAGEvaluationSuite,
} from "@absolutejs/rag/client";
import type {
  RAGEvaluationLeaderboardEntry,
  RAGEvaluationResponse,
  RAGEvaluationSuiteRun,
} from "@absolutejs/rag";
import { createRAGClient } from "@absolutejs/rag/client";
import { buildRAGChunkPreviewNavigation } from "@absolutejs/rag/client/ui";
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
  type DemoFrameworkId,
  type DemoDocument,
  type DemoStatusView,
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
  formatEvaluationHistoryRows,
  formatEvaluationHistorySummary,
  formatEvaluationHistoryTracePresentations,
  formatEvaluationLeaderboardEntry,
  formatEvaluationHistoryDetails,
  formatGroundingEvaluationCase,
  formatGroundingEvaluationDetails,
  formatGroundingEvaluationSummary,
  formatGroundingCaseDifficultyEntry,
  formatGroundingDifficultyHistorySummary,
  formatGroundingDifficultyHistoryDetails,
  formatGroundingHistoryDetails,
  formatGroundingHistorySnapshotPresentations,
  formatGroundingHistorySummary,
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
} from "../../../demo-backends";

const initialSearchForm: SearchFormState = {
  documentId: "",
  kind: "",
  query: "",
  scoreThreshold: "",
  source: "",
  topK: 6,
};

type DemoRagReadinessState = {
  className: string;
  detail: string;
  elapsedMs: number;
  label: string;
  status: "warming" | "ready" | "failed";
};

export type Context = {
  availableBackends?: DemoBackendDescriptor[];
  mode: DemoBackendMode;
};

const initialAddForm: AddFormState = {
  chunkStrategy: "source_aware",
  format: "markdown",
  id: "",
  source: "",
  text: "",
  title: "",
};

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
const formatCitationNumbers = (values: number[]) =>
  values.map((value) => `[${value}]`).join(" ");
const savedEvaluationSuite = buildDemoEvaluationSuite();

@Component({
  imports: [FormsModule, AngularRAGAuthMenuComponent],
  providers: [RAGClientService, RAGWorkflowService],
  selector: "angular-rag-vector-demo",
  standalone: true,
  templateUrl: "./angular-rag-vector-demo.html",
})
export class AngularRAGVectorDemoComponent {
  private readonly ragClient = inject(RAGClientService);
  private readonly ragWorkflowService = inject(RAGWorkflowService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly pageContext = usePageContext<Context>();

  workflowChecks = workflowChecks;
  formatDemoMetadataSummary = formatDemoMetadataSummary;
  attributionBenchmarkNotes = attributionBenchmarkNotes;
  demoEvaluationPresets = demoEvaluationPresets;
  benchmarkOutcomeRail = benchmarkOutcomeRail;
  demoUploadPresets = demoUploadPresets;
  streamStages = streamStages;
  demoFrameworks = demoFrameworks;
  ragExampleSections = [
    {
      description:
        "Query the index, inspect sources, and prove metadata filters and attribution.",
      id: "retrieve",
      kicker: "1 · Retrieval",
      loadLabel: "Load retrieval",
      title: "Search And Verify",
    },
    {
      description:
        "Upload extracted fixtures or author custom documents, then verify searchability.",
      id: "ingest",
      kicker: "2 · Ingest",
      loadLabel: "Load ingest",
      title: "Add Documents",
    },
    {
      description:
        "Run the RAG answer workflow and inspect grounding and citations.",
      id: "workflow",
      kicker: "3 · Workflow",
      loadLabel: "Load workflow",
      title: "Grounded Streaming",
    },
    {
      description:
        "Inspect sync sources and connector-backed account bindings.",
      id: "connectors",
      kicker: "4 · Connectors",
      loadLabel: "Load connectors",
      title: "Auth-Backed Sources",
    },
    {
      description: "Run benchmark presets and compare retrieval quality.",
      id: "evaluate",
      kicker: "5 · Quality",
      loadLabel: "Load quality",
      title: "Evaluation And Release",
    },
    {
      description:
        "Inspect corpus health, sync state, admin jobs, and backend readiness.",
      id: "ops",
      kicker: "6 · Operations",
      loadLabel: "Load ops",
      title: "Diagnostics And Index Health",
    },
  ] as const;
  activeSection:
    | "overview"
    | "retrieve"
    | "ingest"
    | "workflow"
    | "connectors"
    | "evaluate"
    | "ops" = "overview";
  private hasLoadedActiveSectionData = false;
  backendOptions: DemoBackendDescriptor[] = getAvailableDemoBackends(
    this.pageContext.availableBackends,
  );
  demoContentFormats = demoContentFormats;
  demoChunkingStrategies = demoChunkingStrategies;
  selectedMode: DemoBackendMode =
    this.pageContext.mode ?? getInitialBackendMode();
  status: DemoStatusView | null = null;
  documents: DemoDocument[] = [];
  searchForm = { ...initialSearchForm };
  addForm = { ...initialAddForm };
  searchResults: SearchResponse | null = null;
  evaluation: RAGEvaluationResponse | null = null;
  savedEvaluationSuite = savedEvaluationSuite;
  suiteRuns: RAGEvaluationSuiteRun[] = [];
  evaluationLeaderboard: RAGEvaluationLeaderboardEntry[] = [];
  qualityData: DemoRetrievalQualityResponse | null = null;
  releaseData: DemoReleaseOpsResponse | null = null;
  releaseWorkspace: DemoReleaseWorkspace = "alpha";
  qualityView: "overview" | "strategies" | "grounding" | "history" = "overview";
  ops: Awaited<ReturnType<ReturnType<typeof createRAGClient>["ops"]>> | null =
    null;
  chunkPreview: DemoChunkPreview | null = null;
  chunkPreviewActiveChunkId: string | null = null;
  chunkPreviewLoading = false;
  loading = false;
  ragReadiness: DemoRagReadinessState | null = null;
  searchError = "";
  addError = "";
  uploadError = "";
  evaluationError = "";
  evaluationMessage = "";
  evaluationRunning = false;
  uploadRunning = false;
  message = "";
  releaseActionBusyId: string | null = null;
  aiModelCatalog: DemoAIModelCatalogResponse = {
    defaultModelKey: null,
    models: [],
  };
  selectedAIModelKey = "";
  streamPrompt = "How do metadata filters change retrieval quality?";
  documentPage = 1;
  documentSearchTerm = "";
  documentTypeFilter = "all";
  selectedUploadFile: File | null = null;
  supportedFileTypeOptions = SUPPORTED_FILE_TYPE_OPTIONS;
  transport = this.ragWorkflowService.connect(
    getRAGPathForMode(this.selectedMode),
  );

  connectStream() {
    this.transport = this.ragWorkflowService.connect(
      getRAGPathForMode(this.selectedMode),
    );
  }

  isStreamBusy() {
    return (
      this.transport.workflow().isRetrieving ||
      this.transport.workflow().isAnswerStreaming
    );
  }

  isStreamStageComplete(
    stage: (typeof streamStages)[number],
    currentStage: string,
  ) {
    return currentStage === "complete"
      ? stage === "complete" ||
          streamStages.indexOf(stage) < streamStages.indexOf(currentStage)
      : streamStages.indexOf(stage) <
          streamStages.indexOf(currentStage as (typeof streamStages)[number]);
  }

  getGroundingWinner() {
    return this.qualityData?.providerGroundingComparison
      ? formatGroundingProviderOverviewPresentation(
          this.qualityData.providerGroundingComparison,
        ).winnerLabel
      : "Stored workflow evaluation";
  }

  getRetrievalWinner() {
    return this.qualityData
      ? formatRetrievalComparisonOverviewPresentation(
          this.qualityData.retrievalComparison,
        ).winnerLabel
      : "Loading comparison";
  }

  getRetrievalWinnerSummary() {
    return this.qualityData
      ? formatRetrievalComparisonOverviewPresentation(
          this.qualityData.retrievalComparison,
        ).summary
      : "Running retrieval comparison...";
  }

  getRerankerWinner() {
    return this.qualityData
      ? formatRerankerComparisonOverviewPresentation(
          this.qualityData.rerankerComparison,
        ).winnerLabel
      : "Loading comparison";
  }

  getRerankerWinnerSummary() {
    return this.qualityData
      ? formatRerankerComparisonOverviewPresentation(
          this.qualityData.rerankerComparison,
        ).summary
      : "Running reranker comparison...";
  }

  getQualityOverviewRows() {
    if (!this.qualityData) {
      return [];
    }

    return formatQualityOverviewPresentation({
      groundingEvaluation: this.qualityData.groundingEvaluation,
      groundingProviderOverview: this.qualityData.providerGroundingComparison
        ? formatGroundingProviderOverviewPresentation(
            this.qualityData.providerGroundingComparison,
          )
        : undefined,
      rerankerComparison: this.qualityData.rerankerComparison,
      retrievalComparison: this.qualityData.retrievalComparison,
    }).rows;
  }

  getQualityOverviewInsights() {
    if (!this.qualityData) {
      return [];
    }

    return formatQualityOverviewNotes();
  }

  getGroundingWinnerSummary() {
    return this.qualityData?.providerGroundingComparison
      ? formatGroundingProviderOverviewPresentation(
          this.qualityData.providerGroundingComparison,
        ).summary
      : this.qualityData
        ? formatGroundingEvaluationSummary(this.qualityData.groundingEvaluation)
        : "Loading grounding comparison...";
  }

  get releasePanel() {
    return buildDemoReleasePanelState(this.releaseData);
  }

  get releaseStableReadinessSummary() {
    const { stableReadiness } = this.releasePanel;
    if (!stableReadiness) {
      return "No stable lane readiness snapshot available.";
    }

    return (
      [
        stableReadiness.gateStatus
          ? `gate ${stableReadiness.gateStatus}`
          : undefined,
        stableReadiness.requiresApproval ? "approval required" : undefined,
        stableReadiness.requiresOverride ? "override required" : undefined,
      ]
        .filter(Boolean)
        .join(" · ") ||
      (stableReadiness.reasons[0] ?? "No blockers")
    );
  }

  get releaseRemediationSummary() {
    const summary = this.releasePanel.remediationSummary;
    if (!summary) {
      return "Replay and guardrail metrics will appear after release remediation workflows run.";
    }

    return `Mutation skips ${summary.mutationSkippedReplayCount}`;
  }

  formatEvaluationSummary = formatEvaluationSummary;
  formatEvaluationHistorySummary = formatEvaluationHistorySummary;
  formatEvaluationHistoryDiff = formatEvaluationHistoryDiff;
  formatEvaluationLeaderboardEntry = formatEvaluationLeaderboardEntry;
  formatGroundingEvaluationCase = formatGroundingEvaluationCase;
  formatGroundingEvaluationDetails = formatGroundingEvaluationDetails;
  formatGroundingEvaluationSummary = formatGroundingEvaluationSummary;
  formatGroundingProviderPresentations = formatGroundingProviderPresentations;
  formatGroundingProviderOverviewPresentation =
    formatGroundingProviderOverviewPresentation;
  formatEvaluationCaseSummary = formatEvaluationCaseSummary;
  formatEvaluationExpected = formatEvaluationExpected;
  formatEvaluationRetrieved = formatEvaluationRetrieved;
  formatEvaluationMissing = formatEvaluationMissing;
  formatCitationNumbers = formatCitationNumbers;
  formatCitationDetails = formatCitationDetails;
  formatCitationExcerpt = formatCitationExcerpt;
  formatCitationLabel = formatCitationLabel;
  formatCitationSummary = formatCitationSummary;
  formatGroundingCoverage = formatGroundingCoverage;
  formatGroundedAnswerPartDetails = formatGroundedAnswerPartDetails;
  formatGroundedAnswerPartExcerpt = formatGroundedAnswerPartExcerpt;
  formatGroundingPartReferences = formatGroundingPartReferences;
  formatGroundingReferenceDetails = formatGroundingReferenceDetails;
  formatGroundingReferenceLabel = formatGroundingReferenceLabel;
  formatGroundingReferenceSummary = formatGroundingReferenceSummary;
  formatGroundingReferenceExcerpt = formatGroundingReferenceExcerpt;
  formatGroundedAnswerSectionSummaryDetails =
    formatGroundedAnswerSectionSummaryDetails;
  formatGroundedAnswerSectionSummaryExcerpt =
    formatGroundedAnswerSectionSummaryExcerpt;
  formatGroundingSummary = formatGroundingSummary;
  formatSourceSummaryDetails = formatSourceSummaryDetails;
  formatRetrievalComparisonPresentations =
    formatRetrievalComparisonPresentations;
  formatRetrievalComparisonSummary = formatRetrievalComparisonSummary;
  formatRerankerComparisonPresentations = formatRerankerComparisonPresentations;
  formatRerankerComparisonSummary = formatRerankerComparisonSummary;
  formatReadinessSummary = formatReadinessSummary;
  formatHealthSummary = formatHealthSummary;
  formatFailureSummary = formatFailureSummary;
  formatInspectionSummary = formatInspectionSummary;
  formatInspectionSamples = formatInspectionSamples;
  buildInspectionEntries = buildInspectionEntries;
  buildInspectionEntryHref = buildInspectionEntryHref;
  resolveBenchmarkRetrievalPresetId = resolveBenchmarkRetrievalPresetId;
  formatSyncSourceSummary = formatSyncSourceSummary;
  formatSyncSourceDetails = formatSyncSourceDetails;
  getWorkflowTracePresentation() {
    return buildTracePresentation(this.transport.workflow().retrieval?.trace);
  }
  formatDemoAIModelLabel = formatDemoAIModelLabel;
  isCitationPart = isCitationPart;
  adminJobLines: string[] = ["No admin jobs recorded yet."];
  evaluationLeaderboardLines: string[] = [
    "Run the saved suite to rank workflow benchmark runs.",
  ];
  qualitySummaryLines: string[] = ["Loading quality comparison..."];
  adminActionLines: string[] = ["No admin actions recorded yet."];
  syncOverviewLines: string[] = ["No sync sources configured yet."];
  syncSourceLines: string[] = ["No sync sources configured yet."];
  syncSources: Array<{
    id: string;
    label: string;
    summary: string;
    badges: string[];
    status: string;
    collapsedSummary: string;
  }> = [];
  syncDeltaChips: string[] = [];
  recentQueries: Array<{ label: string; state: SearchFormState }> = [];
  scopeDriver = "manual filters";
  restoredSharedState = false;
  restoredSharedStateSummary = "";
  retrievalPresetId = "";
  benchmarkPresetId = "";
  uploadPresetId = "";
  demoReleaseWorkspaces = demoReleaseWorkspaces;

  get retrievalScopeSummary() {
    return formatRetrievalScopeSummary(this.searchForm);
  }

  get retrievalScopeHint() {
    return formatRetrievalScopeHint(this.searchForm);
  }
  get searchSectionGroups() {
    return buildSearchSectionGroups(this.searchResults);
  }

  get sourceSummaryGroups() {
    return buildSourceSummarySectionGroups(
      this.transport.workflow().sourceSummaries,
    );
  }

  get groundingReferenceGroups() {
    return buildGroundingReferenceGroups(
      this.transport.workflow().groundingReferences,
    );
  }

  get citationGroups() {
    return buildCitationGroups(this.transport.workflow().citations);
  }

  get filteredDocuments() {
    const query = this.documentSearchTerm.trim().toLowerCase();

    return this.documents.filter((document) => {
      const matchesQuery =
        query.length === 0 ||
        document.title.toLowerCase().includes(query) ||
        document.source.toLowerCase().includes(query) ||
        document.text.toLowerCase().includes(query);
      const matchesType =
        this.documentTypeFilter === "all" ||
        this.inferDocumentExtension(document) === this.documentTypeFilter;

      return matchesQuery && matchesType;
    });
  }

  get totalDocumentPages() {
    return Math.max(
      1,
      Math.ceil(this.filteredDocuments.length / DOCUMENTS_PER_PAGE),
    );
  }

  get paginatedDocuments() {
    const start = (this.documentPage - 1) * DOCUMENTS_PER_PAGE;

    return this.filteredDocuments.slice(start, start + DOCUMENTS_PER_PAGE);
  }

  get documentPageNumbers() {
    return Array.from(
      { length: this.totalDocumentPages },
      (_, index) => index + 1,
    );
  }

  getBenchmarkHistoryLines(
    history?: DemoRetrievalQualityResponse["retrievalHistories"][string],
  ) {
    return formatEvaluationHistoryDetails(history);
  }

  getBenchmarkHistoryRows(
    history?: DemoRetrievalQualityResponse["retrievalHistories"][string],
  ) {
    return formatEvaluationHistoryRows(history);
  }

  getBenchmarkHistoryTracePresentations(
    history?: DemoRetrievalQualityResponse["retrievalHistories"][string],
  ) {
    return formatEvaluationHistoryTracePresentations(history);
  }

  getGroundingHistoryLines(
    history?: DemoRetrievalQualityResponse["providerGroundingHistories"][string],
  ) {
    return formatGroundingHistoryDetails(history);
  }

  getGroundingHistorySnapshotPresentations(
    history?: DemoRetrievalQualityResponse["providerGroundingHistories"][string],
  ) {
    return formatGroundingHistorySnapshotPresentations(history);
  }

  formatChunkNavigationNodeLabel = formatChunkNavigationNodeLabel;
  formatChunkNavigationSectionLabel = formatChunkNavigationSectionLabel;
  formatBenchmarkOutcomeRailLabel = formatBenchmarkOutcomeRailLabel;
  formatOptionalContentFormat = formatOptionalContentFormat;
  formatOptionalChunkStrategy = formatOptionalChunkStrategy;
  formatSectionDiagnosticAttributionFocus =
    formatSectionDiagnosticAttributionFocus;
  formatSectionDiagnosticChannels = formatSectionDiagnosticChannels;
  formatSectionDiagnosticCompetition = formatSectionDiagnosticCompetition;
  formatSectionDiagnosticDistributionRows =
    formatSectionDiagnosticDistributionRows;
  formatSectionDiagnosticPipeline = formatSectionDiagnosticPipeline;
  formatSectionDiagnosticStageBounds = formatSectionDiagnosticStageBounds;
  formatSectionDiagnosticStageFlow = formatSectionDiagnosticStageFlow;
  formatSectionDiagnosticStageWeightReasons =
    formatSectionDiagnosticStageWeightReasons;
  formatSectionDiagnosticStageWeightRows =
    formatSectionDiagnosticStageWeightRows;
  formatSectionDiagnosticReasons = formatSectionDiagnosticReasons;
  formatSectionDiagnosticTopEntry = formatSectionDiagnosticTopEntry;
  formatChunkSectionGroupLabel = formatChunkSectionGroupLabel;
  formatGroundingProviderCasePresentations =
    formatGroundingProviderCasePresentations;

  getGroundingDifficultyLines(
    entries: NonNullable<
      DemoRetrievalQualityResponse["providerGroundingComparison"]
    >["difficultyLeaderboard"],
  ) {
    return entries.map((entry) => formatGroundingCaseDifficultyEntry(entry));
  }

  getGroundingDifficultyHistoryLines(
    history?: DemoRetrievalQualityResponse["providerGroundingDifficultyHistory"],
  ) {
    return formatGroundingDifficultyHistoryDetails(history);
  }

  async runSavedSuite() {
    this.evaluationError = "";
    this.evaluationMessage = "";
    this.evaluationRunning = true;

    try {
      const run = await runRAGEvaluationSuite({
        suite: this.savedEvaluationSuite,
        evaluate: (input) =>
          this.ragClient.evaluate(getRAGPathForMode(this.selectedMode), input),
      });
      this.suiteRuns = [run, ...this.suiteRuns];
      this.evaluationLeaderboard = buildRAGEvaluationLeaderboard(
        this.suiteRuns,
      );
      this.evaluationLeaderboardLines =
        this.evaluationLeaderboard.length > 0
          ? this.evaluationLeaderboard.map((entry) =>
              formatEvaluationLeaderboardEntry(entry),
            )
          : ["Run the saved suite to rank workflow benchmark runs."];
      this.evaluationMessage = `Saved suite run finished in ${run.elapsedMs}ms and ranked ${this.evaluationLeaderboard.length} workflow run(s).`;
    } catch (error) {
      this.evaluationError =
        error instanceof Error
          ? `Saved suite failed: ${error.message}`
          : "Saved suite failed";
    } finally {
      this.evaluationRunning = false;
      this.flushView();
    }
  }

  async runEvaluation() {
    this.evaluationError = "";
    this.evaluationMessage = "";
    this.evaluationRunning = true;

    try {
      const response = await this.ragClient.evaluate(
        getRAGPathForMode(this.selectedMode),
        buildDemoEvaluationInput(),
      );
      this.evaluation = response;
      this.evaluationMessage = `Benchmark suite finished in ${response.elapsedMs}ms across ${response.totalCases} benchmark queries.`;
    } catch (error) {
      this.evaluationError =
        error instanceof Error
          ? `Evaluation failed: ${error.message}`
          : "Evaluation failed";
    } finally {
      this.evaluationRunning = false;
      this.flushView();
    }
  }

  submitStreamQuery(event: Event) {
    event.preventDefault();
    const prompt = this.streamPrompt.trim();
    if (prompt.length === 0) {
      this.message = "Enter a retrieval question before starting the stream.";
      this.flushView();

      return;
    }

    if (this.selectedAIModelKey.length === 0) {
      this.message = "Configure an AI provider to enable retrieval streaming.";
      this.flushView();

      return;
    }

    this.message = "";
    this.transport.query(
      buildDemoAIStreamPrompt(this.selectedAIModelKey, prompt),
    );
    this.flushView();
  }

  async executeSearch() {
    this.searchError = "";
    this.searchResults = null;

    const query = this.searchForm.query.trim();
    if (query.length === 0) {
      this.searchError = "query is required";

      return;
    }

    try {
      const payload = buildSearchPayload({
        ...this.searchForm,
        query,
        retrievalPresetId: this.retrievalPresetId || undefined,
      });
      const start = performance.now();
      const response = await fetch(
        `/demo/message/${this.selectedMode}/search`,
        {
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        },
      );
      const searchResponse = (await response.json()) as {
        ok: boolean;
        results?: Parameters<typeof buildSearchResponse>[2];
        trace?: Parameters<typeof buildSearchResponse>[4];
        error?: string;
      };
      if (!response.ok || !searchResponse.ok) {
        throw new Error(
          searchResponse.error ??
            `Search failed with status ${response.status}`,
        );
      }
      const nextState = { ...this.searchForm, query };
      void saveActiveRetrievalState("angular", this.selectedMode, {
        retrievalPresetId: this.retrievalPresetId || undefined,
        scopeDriver: this.scopeDriver,
        searchForm: nextState,
        streamModelKey: this.selectedAIModelKey || undefined,
        streamPrompt: this.streamPrompt,
      });
      this.recentQueries = [
        { label: query, state: nextState },
        ...this.recentQueries.filter(
          (entry) => JSON.stringify(entry.state) !== JSON.stringify(nextState),
        ),
      ].slice(0, 4);
      void saveRecentQueries("angular", this.selectedMode, this.recentQueries);
      this.searchResults = buildSearchResponse(
        query,
        payload,
        searchResponse.results ?? [],
        Math.round(performance.now() - start),
        searchResponse.trace,
      );
      this.flushView();
    } catch (error) {
      this.searchError =
        error instanceof Error
          ? `Search failed: ${error.message}`
          : "Search failed";
      this.flushView();
    }
  }

  openReleaseDiagnosticsTarget(targetCardId: string) {
    if (
      targetCardId === "release-promotion-candidates-card" ||
      targetCardId === "release-stable-handoff-card" ||
      targetCardId === "release-remediation-history-card"
    ) {
      document
        .getElementById("release-diagnostics")
        ?.setAttribute("open", "open");
    }
  }

  async runReleaseAction(action: {
    id: string;
    label: string;
    path: string;
    payload: { actionId: string; workspace?: DemoReleaseWorkspace };
  }) {
    this.releaseActionBusyId = action.id;
    this.addError = "";
    try {
      const response = await fetch(action.path, {
        body: JSON.stringify({
          ...action.payload,
          workspace: this.releaseWorkspace,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
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
      this.releaseData = payload.release;
      this.message =
        payload.message ??
        `${action.label} completed through the published AbsoluteJS release-control workflow.`;
    } catch (error) {
      this.addError =
        error instanceof Error
          ? error.message
          : `Release action ${action.label} failed`;
    } finally {
      this.releaseActionBusyId = null;
    }
  }

  async setReleaseWorkspace(workspace: DemoReleaseWorkspace) {
    if (this.releaseWorkspace === workspace) {
      return;
    }
    this.releaseWorkspace = workspace;
    await this.refreshData();
    this.flushView();
  }

  async refreshData() {
    this.loading = true;
    this.searchError = "";
    try {
      const [
        statusData,
        docsData,
        opsData,
        aiModelsResponse,
        qualityResponse,
        releaseResponse,
      ] = await Promise.all([
        this.ragClient.status(getRAGPathForMode(this.selectedMode)),
        this.ragClient.documents(getRAGPathForMode(this.selectedMode)),
        this.ragClient.ops(getRAGPathForMode(this.selectedMode)),
        fetch("/demo/ai-models").then((response) =>
          response.json(),
        ) as Promise<DemoAIModelCatalogResponse>,
        fetch(`/demo/quality/${this.selectedMode}`).then((response) =>
          response.json(),
        ) as Promise<DemoRetrievalQualityResponse>,
        fetch(
          `/demo/release/${this.selectedMode}?workspace=${this.releaseWorkspace}`,
        ).then((response) =>
          response.json(),
        ) as Promise<DemoReleaseOpsResponse>,
      ]);
      this.aiModelCatalog = aiModelsResponse;
      this.qualityData = qualityResponse;
      this.releaseData = releaseResponse;
      this.qualitySummaryLines = formatQualityOverviewPresentation({
        groundingEvaluation: qualityResponse.groundingEvaluation,
        groundingProviderOverview: qualityResponse.providerGroundingComparison
          ? formatGroundingProviderOverviewPresentation(
              qualityResponse.providerGroundingComparison,
            )
          : undefined,
        rerankerComparison: qualityResponse.rerankerComparison,
        retrievalComparison: qualityResponse.retrievalComparison,
      }).rows.map((row) => `${row.label}: ${row.value}`);
      this.selectedAIModelKey =
        this.selectedAIModelKey ||
        aiModelsResponse.defaultModelKey ||
        aiModelsResponse.models[0]?.key ||
        "";

      this.documents = docsData.documents as DemoDocument[];
      this.ops = opsData;
      this.adminJobLines =
        formatAdminJobList(opsData.adminJobs).length > 0
          ? formatAdminJobList(opsData.adminJobs)
          : ["No admin jobs recorded yet."];
      this.adminActionLines =
        formatAdminActionList(opsData.adminActions).length > 0
          ? formatAdminActionList(opsData.adminActions)
          : ["No admin actions recorded yet."];
      const sortedSyncSources = sortSyncSources(opsData.syncSources);
      this.syncSources = sortedSyncSources.map((source) => ({
        id: source.id,
        label: source.label,
        summary: formatSyncSourceActionSummary(source),
        badges: formatSyncSourceActionBadges(source),
        status: source.status,
        collapsedSummary: formatSyncSourceCollapsedSummary(source),
      }));
      this.syncDeltaChips = formatSyncDeltaChips(sortedSyncSources);
      this.syncOverviewLines = formatSyncSourceOverview(sortedSyncSources);
      this.syncSourceLines =
        sortedSyncSources.length > 0
          ? sortedSyncSources.flatMap((source) => [
              formatSyncSourceSummary(source),
              ...formatSyncSourceDetails(source),
            ])
          : ["No sync sources configured yet."];
      this.chunkPreview =
        this.chunkPreview !== null &&
        docsData.documents.some(
          (document) => document.id === this.chunkPreview?.document.id,
        )
          ? this.chunkPreview
          : null;
      if (this.chunkPreview === null) {
        this.chunkPreviewActiveChunkId = null;
      }
      this.status = buildStatusView(
        statusData.status,
        statusData.capabilities,
        this.documents,
        this.selectedMode,
      );
      this.message = "";
      this.flushView();
    } catch (error) {
      this.message =
        error instanceof Error
          ? `Unable to load demo data: ${error.message}`
          : "Unable to load demo data";
    } finally {
      this.loading = false;
      this.flushView();
    }
  }

  // Two dropdowns (backend + framework) instead of a 4×6 grid of links — same
  // destinations, far less header noise. Navigation happens on change.
  goToDemoPage(framework: DemoFrameworkId, backend: DemoBackendMode) {
    const target = getDemoPagePath(framework, backend);
    if (target && typeof window !== "undefined") {
      window.location.assign(target);
    }
  }

  onBackendModeChange(mode: DemoBackendMode) {
    this.selectedMode = mode;
    this.hasLoadedActiveSectionData = false;
    void this.loadRagReadiness();
    this.connectStream();
    navigateToBackendMode(mode);
  }

  setActiveSection(
    section:
      | "overview"
      | "retrieve"
      | "ingest"
      | "workflow"
      | "connectors"
      | "evaluate"
      | "ops",
  ) {
    this.activeSection = section;
    if (
      section !== "overview" &&
      !this.hasLoadedActiveSectionData &&
      !this.loading
    ) {
      this.hasLoadedActiveSectionData = true;
      void this.refreshData();
    }
  }

  async submitSearch(event: Event) {
    event.preventDefault();
    this.scopeDriver = "manual filters";
    await this.executeSearch();
  }

  clearRetrievalScope() {
    this.scopeDriver = "chip reset";
    this.searchForm = {
      ...this.searchForm,
      kind: "",
      source: "",
      documentId: "",
    };
    void saveActiveRetrievalState("angular", this.selectedMode, {
      scopeDriver: this.scopeDriver,
      searchForm: this.searchForm,
      streamModelKey: this.selectedAIModelKey || undefined,
      streamPrompt: this.streamPrompt,
    });
    if (this.searchForm.query.trim().length > 0) {
      void this.executeSearch();
    }
  }

  clearAllRetrievalState() {
    this.scopeDriver = "clear all state";
    this.searchForm = {
      ...this.searchForm,
      query: "",
      kind: "",
      source: "",
      documentId: "",
      scoreThreshold: "",
    };
    void saveActiveRetrievalState("angular", this.selectedMode, {
      scopeDriver: this.scopeDriver,
      searchForm: this.searchForm,
      streamModelKey: this.selectedAIModelKey || undefined,
      streamPrompt: this.streamPrompt,
    });
    this.searchResults = null;
    this.searchError = "";
  }

  rerunLastQuery() {
    if (this.searchForm.query.trim().length === 0) return;
    this.scopeDriver = "rerun last query";
    void this.executeSearch();
  }

  runPresetSearch(
    query: string,
    options: Partial<SearchFormState> = {},
    driver = "preset",
    presetId = "",
  ) {
    this.scopeDriver = driver;
    if (driver.startsWith("benchmark preset:")) {
      this.benchmarkPresetId = presetId;
      this.retrievalPresetId = resolveBenchmarkRetrievalPresetId(presetId);
      this.uploadPresetId = "";
    } else if (driver === "upload verification") {
      this.retrievalPresetId = "";
      this.benchmarkPresetId = "";
    } else {
      this.retrievalPresetId = presetId;
      this.benchmarkPresetId = "";
      this.uploadPresetId = "";
    }
    this.searchForm = {
      ...this.searchForm,
      ...options,
      query,
      kind:
        options.kind === "seed" || options.kind === "custom"
          ? options.kind
          : "",
      source: options.source ?? "",
      documentId: options.documentId ?? "",
      scoreThreshold: options.scoreThreshold ?? "",
      topK: options.topK ?? 6,
    };
    void saveActiveRetrievalState("angular", this.selectedMode, {
      benchmarkPresetId: this.benchmarkPresetId || undefined,
      lastUpdatedAt: Date.now(),
      retrievalPresetId: this.retrievalPresetId || undefined,
      scopeDriver: this.scopeDriver,
      searchForm: this.searchForm,
      uploadPresetId: this.uploadPresetId || undefined,
    });

    void this.executeSearch();
  }

  inferDocumentExtension(document: DemoDocument) {
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
  }

  onUploadFileChange(event: Event) {
    this.selectedUploadFile =
      (event.target as HTMLInputElement).files?.[0] ?? null;
    this.flushView();
  }

  onDocumentSearchTermChange(value: string) {
    this.documentSearchTerm = value;
    this.documentPage = 1;
  }

  onDocumentTypeFilterChange(value: string) {
    this.documentTypeFilter = value;
    this.documentPage = 1;
  }

  setDocumentPage(page: number) {
    this.documentPage = Math.min(this.totalDocumentPages, Math.max(1, page));
  }

  rerunRecentQuery(state: SearchFormState) {
    this.scopeDriver = "recent query";
    this.searchForm = state;
    void saveActiveRetrievalState("angular", this.selectedMode, {
      benchmarkPresetId: this.benchmarkPresetId || undefined,
      lastUpdatedAt: Date.now(),
      retrievalPresetId: this.retrievalPresetId || undefined,
      scopeDriver: this.scopeDriver,
      searchForm: this.searchForm,
      uploadPresetId: this.uploadPresetId || undefined,
    });
    void this.executeSearch();
  }

  runReleaseEvidenceDrill(drill: {
    query: string;
    topK: number;
    driver: string;
    benchmarkPresetId?: string;
    retrievalPresetId?: string;
  }) {
    this.runPresetSearch(
      drill.query,
      { topK: drill.topK },
      drill.driver,
      drill.benchmarkPresetId || drill.retrievalPresetId || "",
    );
    document
      .getElementById("search-results")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async ingestDemoUpload(preset: (typeof demoUploadPresets)[number]) {
    this.uploadError = "";
    this.uploadRunning = true;
    this.message = `Uploading ${preset.label}...`;
    this.flushView();
    try {
      const fixture = await fetch(getDemoUploadFixtureUrl(preset.id));
      if (!fixture.ok) {
        throw new Error(`Failed to load ${preset.fileName}: ${fixture.status}`);
      }
      const response = await this.ragClient.ingestUploads(
        getRAGPathForMode(this.selectedMode),
        buildDemoUploadIngestInput(
          preset,
          encodeArrayBufferToBase64(await fixture.arrayBuffer()),
        ),
      );
      if (!response.ok) {
        throw new Error(response.error ?? "Upload ingest failed");
      }
      this.message = `Uploaded ${preset.label}. Extracted ${response.count ?? 0} chunk(s) across ${response.documentCount ?? 1} document(s).`;
      this.uploadPresetId = preset.id;
      this.runPresetSearch(
        preset.query,
        { source: preset.expectedSources[0] ?? preset.source, topK: 6 },
        "upload verification",
      );
    } catch (error) {
      this.uploadError =
        error instanceof Error
          ? `Upload failed: ${error.message}`
          : "Upload failed";
      this.message = "";
      this.flushView();
    } finally {
      this.uploadRunning = false;
      this.flushView();
    }
  }

  async uploadSelectedDocumentFile() {
    if (!this.selectedUploadFile) {
      this.uploadError = "Choose a file before uploading.";
      this.flushView();

      return;
    }

    this.uploadError = "";
    this.uploadRunning = true;
    this.message = `Uploading ${this.selectedUploadFile.name}...`;
    this.flushView();
    try {
      const uploadedName = this.selectedUploadFile.name;
      const response = await this.ragClient.ingestUploads(
        getRAGPathForMode(this.selectedMode),
        {
          baseMetadata: {
            fileKind: "uploaded-user-file",
            kind: "custom",
          },
          uploads: [
            {
              content: encodeArrayBufferToBase64(
                await this.selectedUploadFile.arrayBuffer(),
              ),
              contentType:
                this.selectedUploadFile.type || "application/octet-stream",
              encoding: "base64",
              metadata: {
                kind: "custom",
                uploadedFrom: "angular-general-upload",
              },
              name: uploadedName,
              source: `uploads/${uploadedName}`,
              title: uploadedName,
            },
          ],
        },
      );
      if (!response.ok) {
        throw new Error(response.error ?? "Upload ingest failed");
      }
      this.message = `Uploaded ${uploadedName}. Extracted ${response.count ?? 0} chunk(s) across ${response.documentCount ?? 1} document(s).`;
      this.selectedUploadFile = null;
      this.flushView();
      await this.refreshData();
      this.runPresetSearch(
        `Explain ${uploadedName}`,
        { source: `uploads/${uploadedName}`, topK: 6 },
        "upload verification",
      );
    } catch (error) {
      this.uploadError =
        error instanceof Error
          ? `Upload failed: ${error.message}`
          : "Upload failed";
      this.message = "";
      this.flushView();
    } finally {
      this.uploadRunning = false;
      this.flushView();
    }
  }

  async submitAddDocument(event: Event) {
    event.preventDefault();
    this.addError = "";
    this.searchError = "";

    try {
      const response = await this.ragClient.createDocument(
        getRAGPathForMode(this.selectedMode),
        {
          chunking: {
            strategy: this.addForm.chunkStrategy,
          },
          format: this.addForm.format,
          id:
            this.addForm.id.trim().length > 0
              ? this.addForm.id.trim()
              : undefined,
          source: this.addForm.source.trim(),
          text: this.addForm.text.trim(),
          title: this.addForm.title.trim(),
        },
      );

      this.message = `Inserted ${response.inserted ?? this.addForm.title.trim()}`;
      this.addForm = { ...initialAddForm };
      this.flushView();
      await this.refreshData();
    } catch (error) {
      this.addError =
        error instanceof Error
          ? `Failed to insert: ${error.message}`
          : "Failed to insert document";
      this.flushView();
    }
  }

  async focusInspectionEntry(
    entry: ReturnType<typeof buildInspectionEntries>[number],
  ) {
    this.documentTypeFilter = "all";
    this.documentSearchTerm = entry.sourceQuery ?? "";
    this.documentPage = 1;
    document
      .getElementById("document-list")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (entry.documentId) {
      this.message = `Inspecting ${entry.documentId} from ops inspection.`;
      await this.inspectChunks(entry.documentId);

      return;
    }
    if (entry.source) {
      await this.runPresetSearch(
        `Source search for ${entry.source}`,
        { source: entry.source },
        `ops inspection: ${entry.source}`,
      );
      this.message = `Scoped retrieval to ${entry.source} from ops inspection.`;
    }
  }

  async inspectChunks(documentId: string) {
    this.chunkPreviewLoading = true;
    this.flushView();
    try {
      const response = await this.ragClient.documentChunks(
        getRAGPathForMode(this.selectedMode),
        documentId,
      );
      if (!response.ok) {
        throw new Error(response.error);
      }
      this.chunkPreview = response;
      this.chunkPreviewActiveChunkId =
        this.chunkPreview.chunks[0]?.chunkId ?? null;
    } catch (error) {
      this.message =
        error instanceof Error
          ? `Failed to inspect ${documentId}: ${error.message}`
          : `Failed to inspect ${documentId}`;
    } finally {
      this.chunkPreviewLoading = false;
      this.flushView();
    }
  }

  chunkIndexText(
    chunk: { metadata?: Record<string, unknown> },
    fallbackCount: number,
  ) {
    const indexValue =
      typeof chunk.metadata?.chunkIndex === "number"
        ? chunk.metadata.chunkIndex
        : 0;
    const countValue =
      typeof chunk.metadata?.chunkCount === "number"
        ? chunk.metadata.chunkCount
        : fallbackCount;

    return `chunk index: ${String(indexValue)} / count: ${String(countValue)}`;
  }

  isChunkPreviewFor(documentId: string) {
    return this.chunkPreview?.document.id === documentId;
  }

  chunkPreviewNavigation() {
    return this.chunkPreview
      ? buildRAGChunkPreviewNavigation(
          this.chunkPreview,
          this.chunkPreviewActiveChunkId ?? undefined,
        )
      : null;
  }

  activeChunkPreviewSectionDiagnostic() {
    return buildActiveChunkPreviewSectionDiagnostic(
      this.chunkPreview,
      this.chunkPreviewActiveChunkId ?? undefined,
    );
  }

  selectChunkPreviewChunk(chunkId: string) {
    this.chunkPreviewActiveChunkId = chunkId;
    this.flushView();
  }

  selectParentChunkPreviewSection() {
    const nextChunkId =
      this.chunkPreviewNavigation()?.parentSection?.leadChunkId;
    if (nextChunkId) {
      this.chunkPreviewActiveChunkId = nextChunkId;
      this.flushView();
    }
  }

  selectSiblingChunkPreviewSection(sectionId: string) {
    const nextChunkId = this.chunkPreviewNavigation()?.siblingSections.find(
      (section) => section.id === sectionId,
    )?.leadChunkId;
    if (nextChunkId) {
      this.chunkPreviewActiveChunkId = nextChunkId;
      this.flushView();
    }
  }

  selectChildChunkPreviewSection(sectionId: string) {
    const nextChunkId = this.chunkPreviewNavigation()?.childSections.find(
      (section) => section.id === sectionId,
    )?.leadChunkId;
    if (nextChunkId) {
      this.chunkPreviewActiveChunkId = nextChunkId;
      this.flushView();
    }
  }

  async deleteDocument(documentId: string) {
    try {
      const response = await this.ragClient.deleteDocument(
        getRAGPathForMode(this.selectedMode),
        documentId,
      );
      if (!response.ok) {
        throw new Error(response.error ?? "Failed to delete document");
      }
      this.message = `Deleted ${documentId}`;
      this.chunkPreview =
        this.chunkPreview?.document.id === documentId
          ? null
          : this.chunkPreview;
      if (this.chunkPreview === null) {
        this.chunkPreviewActiveChunkId = null;
      }
      this.flushView();
      await this.refreshData();
    } catch (error) {
      this.message =
        error instanceof Error
          ? `Failed to delete ${documentId}: ${error.message}`
          : "Failed to delete document";
      this.flushView();
    }
  }

  async reseed() {
    this.searchError = "";
    this.addError = "";
    try {
      this.message = "Reseeding defaults...";
      this.flushView();
      const result = await this.ragClient.reseed(
        getRAGPathForMode(this.selectedMode),
      );
      this.message = `Reseed complete. Documents=${result.documents ?? 0}`;
      this.searchResults = null;
      this.flushView();
      await this.refreshData();
    } catch (error) {
      this.message =
        error instanceof Error
          ? `Reseed failed: ${error.message}`
          : "Reseed failed";
      this.flushView();
    }
  }

  async resetCustom() {
    this.searchError = "";
    this.addError = "";
    try {
      this.message = "Resetting custom documents...";
      this.flushView();
      const result = await this.ragClient.reset(
        getRAGPathForMode(this.selectedMode),
      );
      this.message = `Reset complete. Documents=${result.documents ?? 0}`;
      this.searchResults = null;
      this.flushView();
      await this.refreshData();
    } catch (error) {
      this.message =
        error instanceof Error
          ? `Reset failed: ${error.message}`
          : "Reset failed";
      this.flushView();
    }
  }

  async syncAllSources() {
    try {
      this.message = "Starting source sync...";
      this.flushView();
      const result = await this.ragClient.syncAllSources(
        getRAGPathForMode(this.selectedMode),
        { background: true },
      );
      this.message = `Started sync for ${"sources" in result ? result.sources.length : 0} source(s). Watch the sync feedback panel for progress.`;
      this.flushView();
      await this.refreshData();
    } catch (error) {
      this.message =
        error instanceof Error
          ? `Source sync failed: ${error.message}`
          : "Source sync failed";
      this.flushView();
    }
  }

  async queueBackgroundSync() {
    try {
      this.message = "Queueing background sync...";
      this.flushView();
      await this.ragClient.syncAllSources(
        getRAGPathForMode(this.selectedMode),
        { background: true },
      );
      this.message = "Background sync queued.";
      this.flushView();
      await this.refreshData();
    } catch (error) {
      this.message =
        error instanceof Error
          ? `Failed to queue background sync: ${error.message}`
          : "Failed to queue background sync";
      this.flushView();
    }
  }

  async syncSource(id: string) {
    try {
      this.message = `Starting ${id} sync...`;
      this.flushView();
      const result = await this.ragClient.syncSource(
        getRAGPathForMode(this.selectedMode),
        id,
        { background: true },
      );
      this.message =
        "source" in result
          ? `Started ${result.source.label}. Watch the sync feedback panel for progress.`
          : `Started ${id}. Watch the sync feedback panel for progress.`;
      this.flushView();
      await this.refreshData();
    } catch (error) {
      this.message =
        error instanceof Error
          ? `Failed to sync ${id}: ${error.message}`
          : `Failed to sync ${id}`;
      this.flushView();
    }
  }

  async queueBackgroundSourceSync(id: string) {
    try {
      this.message = `Queueing ${id} in the background...`;
      this.flushView();
      const result = await this.ragClient.syncSource(
        getRAGPathForMode(this.selectedMode),
        id,
        { background: true },
      );
      this.message =
        "source" in result ? `Queued ${result.source.label}.` : `Queued ${id}.`;
      this.flushView();
      await this.refreshData();
    } catch (error) {
      this.message =
        error instanceof Error
          ? `Failed to queue ${id}: ${error.message}`
          : `Failed to queue ${id}`;
      this.flushView();
    }
  }

  formatDate(value: number) {
    return new Date(value).toLocaleString();
  }

  formatScore(value: number) {
    return value.toFixed(4);
  }

  formatContentFormat(value: AddFormState["format"] | DemoDocument["format"]) {
    return formatContentFormat(value);
  }

  formatChunkStrategy(
    value: AddFormState["chunkStrategy"] | DemoDocument["chunkStrategy"],
  ) {
    return formatChunkStrategy(value);
  }

  private readonly timers = useTimers();
  private ragReadinessTimer: ReturnType<typeof setTimeout> | null = null;
  private ragReadinessRequest = 0;

  private async loadRagReadiness() {
    const requestId = ++this.ragReadinessRequest;
    if (this.ragReadinessTimer) {
      this.timers.clearTimeout(this.ragReadinessTimer);
      this.ragReadinessTimer = null;
    }

    try {
      const response = await fetch(
        `/demo/rag-readiness/${this.selectedMode}/json`,
      );
      const next = (await response.json()) as DemoRagReadinessState;
      if (requestId !== this.ragReadinessRequest) {
        return;
      }
      this.ragReadiness = next;
      this.flushView();
      if (next.status === "warming") {
        this.ragReadinessTimer = this.timers.setTimeout(() => {
          void this.loadRagReadiness();
        }, 2000);
      }
    } catch {
      if (requestId === this.ragReadinessRequest) {
        this.ragReadiness = {
          className: "demo-rag-readiness-failed",
          detail: "Unable to load RAG readiness.",
          elapsedMs: 0,
          label: "RAG Failed",
          status: "failed",
        };
        this.flushView();
      }
    }
  }

  private flushView() {
    this.cdr.detectChanges();
  }

  ngOnInit() {
    if (typeof window !== "undefined") {
      this.connectStream();
      void loadRecentQueries("angular", this.selectedMode).then((entries) => {
        this.recentQueries = entries;
        this.flushView();
      });
      void loadActiveRetrievalState("angular", this.selectedMode).then(
        (state) => {
          if (state) {
            this.searchForm = state.searchForm;
            this.scopeDriver = state.scopeDriver;
            this.retrievalPresetId = state.retrievalPresetId ?? "";
            this.benchmarkPresetId = state.benchmarkPresetId ?? "";
            this.uploadPresetId = state.uploadPresetId ?? "";
            this.selectedAIModelKey =
              state.streamModelKey ?? this.selectedAIModelKey;
            this.streamPrompt = state.streamPrompt ?? this.streamPrompt;
            this.restoredSharedState = true;
            const label =
              this.demoUploadPresets.find(
                (preset) => preset.id === state.uploadPresetId,
              )?.label ??
              this.demoEvaluationPresets.find(
                (preset) => preset.id === state.benchmarkPresetId,
              )?.label ??
              state.retrievalPresetId ??
              "manual state";
            this.restoredSharedStateSummary = `Restored from shared demo state · ${label} · ${new Date(state.lastUpdatedAt ?? Date.now()).toLocaleString()}.`;
          } else {
            this.restoredSharedState = false;
            this.restoredSharedStateSummary = "";
          }
          this.flushView();
        },
      );
      void this.loadRagReadiness();
    }
  }
}

function isCitationPart(part: {
  type: string;
}): part is { type: "citation"; referenceNumbers: number[]; text: string } {
  return part.type === "citation";
}
