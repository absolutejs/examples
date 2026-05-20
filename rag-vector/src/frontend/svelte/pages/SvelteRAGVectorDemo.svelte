<script lang="ts">
  import { createRAG } from "@absolutejs/rag/svelte";
  import type { RAGEvaluationResponse } from "@absolutejs/rag";
  import { derived, get } from "svelte/store";
  import {
    type AddFormState,
    type DemoActiveRetrievalState,
    type DemoAIModelCatalogResponse,
    type DemoReleaseOpsResponse,
    type DemoReleaseWorkspace,
    type DemoRetrievalQualityResponse,
    type DemoBackendDescriptor,
    type DemoBackendMode,
    type DemoChunkingStrategy,
    type DemoContentFormat,
    type DemoChunkPreview,
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
    formatGroundingHistorySnapshots,
    formatGroundingHistoryArtifactTrail,
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

  type RagExampleSection =
    | "overview"
    | "retrieve"
    | "ingest"
    | "workflow"
    | "connectors"
    | "evaluate"
    | "ops";
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
      description:
        "Inspect sync sources and connector-backed account bindings.",
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

  let documents: DemoDocument[] = [];
  export let availableBackends: DemoBackendDescriptor[] | undefined = undefined;
  export let cssPath: string | undefined = undefined;
  export let mode: DemoBackendMode = "sqlite-native";
  let selectedMode: DemoBackendMode = mode ?? getInitialBackendMode();
  let activeSection: RagExampleSection = "overview";
  const backendOptions = getAvailableDemoBackends(availableBackends);
  const rag = createRAG(getRAGPathForMode(selectedMode), {
    autoLoadStatus: false,
    autoLoadOps: false,
  });
  const documentsStore = rag.documents.documents;
  const chunkPreviewStore = rag.chunkPreview.preview;
  const chunkPreviewLoadingStore = rag.chunkPreview.isLoading;
  const chunkPreviewNavigationStore = rag.chunkPreview.navigation;
  const activeChunkPreviewIdStore = rag.chunkPreview.activeChunkId;
  const evaluationErrorStore = rag.evaluate.error;
  const evaluationIsEvaluatingStore = rag.evaluate.isEvaluating;
  const evaluationStore = rag.evaluate.lastResponse;
  const evaluationSuitesStore = rag.evaluate.suites;
  const evaluationLeaderboardStore = rag.evaluate.leaderboard;
  const ingestIsIngestingStore = rag.ingest.isIngesting;
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
  const evaluationSuite = buildDemoEvaluationSuite();
  let aiModelCatalog: DemoAIModelCatalogResponse = {
    defaultModelKey: null,
    models: [],
  };
  let qualityData: DemoRetrievalQualityResponse | null = null;
  let releaseData: DemoReleaseOpsResponse | null = null;
  let releaseActionBusyId: string | null = null;
  let releaseWorkspace: DemoReleaseWorkspace = "alpha";
  let qualityView: "overview" | "strategies" | "grounding" | "history" =
    "overview";
  let selectedAIModelKey = "";
  let streamPrompt = "How do metadata filters change retrieval quality?";
  let ragReadinessTimer: ReturnType<typeof setTimeout> | null = null;
  let ragReadinessRequest = 0;
  const workflow = rag.workflow;
  const streamLatestMessageStore = workflow.latestAssistantMessage;
  const streamRetrievalStore = workflow.retrieval;
  const streamGroundedAnswerStore = workflow.groundedAnswer;
  const streamGroundingReferencesStore = workflow.groundingReferences;
  const streamCitationsStore = workflow.citations;
  const streamSourceSummariesStore = workflow.sourceSummaries;
  $: streamSourceSummaryGroups = buildSourceSummarySectionGroups(
    $streamSourceSummariesStore,
  );
  $: streamGroundingReferenceGroups = buildGroundingReferenceGroups(
    $streamGroundingReferencesStore,
  );
  $: streamCitationGroups = buildCitationGroups($streamCitationsStore);
  const streamStageStore = workflow.stage;
  const streamWorkflowStateStore = workflow.state;
  const streamErrorStore = workflow.error;
  const streamBusyStore = derived(
    [workflow.isRetrieving, workflow.isAnswerStreaming],
    ([$isRetrieving, $isAnswerStreaming]) =>
      $isRetrieving || $isAnswerStreaming,
  );
  $: workflowTracePresentation = buildTracePresentation(
    $streamRetrievalStore?.trace,
  );
  const opsErrorStore = rag.ops.error;
  const opsReadinessStore = rag.ops.readiness;
  const opsHealthStore = rag.ops.health;
  const opsAdminJobsStore = rag.ops.adminJobs;
  const opsAdminActionsStore = rag.ops.adminActions;
  const opsSyncSourcesStore = rag.ops.syncSources;
  $: releasePanel = buildDemoReleasePanelState(releaseData);
  $: releasePendingLabel = releaseActionBusyId
    ? (() => {
        const action = releasePanel.actions.find(
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

  function openReleaseDiagnosticsTarget(targetCardId: string) {
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

  let status: DemoStatusView | null = null;
  let searchForm: SearchFormState = {
    query: "",
    topK: 6,
    scoreThreshold: "",
    kind: "",
    source: "",
    documentId: "",
  };
  let searchResults: SearchResponse | null = null;
  $: searchSectionGroups = buildSearchSectionGroups(searchResults);
  $: activeChunkPreviewSectionDiagnostic =
    buildActiveChunkPreviewSectionDiagnostic(
      $chunkPreviewStore,
      $activeChunkPreviewIdStore,
    );
  let addForm: AddFormState = {
    id: "",
    title: "",
    source: "",
    format: "markdown",
    chunkStrategy: "source_aware",
    text: "",
  };
  let searchError = "";
  let addError = "";
  let uploadError = "";
  let evaluationMessage = "";
  let message = "";
  let loading = false;
  let ragReadiness: DemoRagReadinessState | null = null;
  let documentPage = 1;
  let documentSearchTerm = "";
  let documentTypeFilter = "all";
  let selectedUploadFile: File | null = null;
  let hasLoadedActiveSectionData = false;
  let scopeDriver = "manual filters";
  let recentQueries: Array<{ label: string; state: SearchFormState }> = [];
  let hydratedRecentQueries = false;
  let hydratedActiveRetrievalState = false;
  let restoredSharedState = false;
  let restoredSharedStateSummary = "";
  let retrievalPresetId = "";
  let benchmarkPresetId = "";
  let uploadPresetId = "";
  $: sortedSyncSources = sortSyncSources($opsSyncSourcesStore);
  $: syncOverviewLines = formatSyncSourceOverview(sortedSyncSources);
  $: retrievalScopeSummary = formatRetrievalScopeSummary(searchForm);
  $: retrievalScopeHint = formatRetrievalScopeHint(searchForm);
  $: filteredDocuments = documents.filter((document) => {
    const query = documentSearchTerm.trim().toLowerCase();
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
  $: totalDocumentPages = Math.max(
    1,
    Math.ceil(filteredDocuments.length / DOCUMENTS_PER_PAGE),
  );
  $: paginatedDocuments = filteredDocuments.slice(
    (documentPage - 1) * DOCUMENTS_PER_PAGE,
    documentPage * DOCUMENTS_PER_PAGE,
  );
  $: if (documentPage > totalDocumentPages) {
    documentPage = totalDocumentPages;
  }
  $: if (documentPage < 1) {
    documentPage = 1;
  }

  let hasBootstrapped = false;

  if (typeof window !== "undefined" && !hasBootstrapped) {
    hasBootstrapped = true;
    queueMicrotask(() => {
      void loadRecentQueries("svelte", selectedMode).then((entries) => {
        recentQueries = entries;
        hydratedRecentQueries = true;
      });
      void loadActiveRetrievalState("svelte", selectedMode).then((state) => {
        if (state) {
          searchForm = state.searchForm;
          scopeDriver = state.scopeDriver;
          retrievalPresetId = state.retrievalPresetId ?? "";
          benchmarkPresetId = state.benchmarkPresetId ?? "";
          uploadPresetId = state.uploadPresetId ?? "";
          selectedAIModelKey = state.streamModelKey ?? selectedAIModelKey;
          streamPrompt = state.streamPrompt ?? streamPrompt;
          restoredSharedState = true;
          const label =
            demoUploadPresets.find(
              (preset) => preset.id === state.uploadPresetId,
            )?.label ??
            demoEvaluationPresets.find(
              (preset) => preset.id === state.benchmarkPresetId,
            )?.label ??
            state.retrievalPresetId ??
            "manual state";
          restoredSharedStateSummary = `Restored from shared demo state · ${label} · ${new Date(state.lastUpdatedAt ?? Date.now()).toLocaleString()}.`;
        } else {
          restoredSharedState = false;
          restoredSharedStateSummary = "";
        }
        hydratedActiveRetrievalState = true;
      });
      void loadRagReadiness();
    });
  }

  $: if (
    activeSection !== "overview" &&
    !hasLoadedActiveSectionData &&
    !loading
  ) {
    hasLoadedActiveSectionData = true;
    void refreshData();
  }

  $: if (hydratedRecentQueries) {
    void saveRecentQueries("svelte", selectedMode, recentQueries);
  }

  $: if (hydratedActiveRetrievalState) {
    const state: DemoActiveRetrievalState = {
      searchForm,
      scopeDriver,
      lastUpdatedAt: Date.now(),
      retrievalPresetId: retrievalPresetId || undefined,
      benchmarkPresetId: benchmarkPresetId || undefined,
      uploadPresetId: uploadPresetId || undefined,
      streamModelKey: selectedAIModelKey || undefined,
      streamPrompt,
    };
    void saveActiveRetrievalState("svelte", selectedMode, state);
  }

  const runReleaseAction = async (action: {
    id: string;
    label: string;
    path: string;
    payload: { actionId: string; workspace?: DemoReleaseWorkspace };
  }) => {
    releaseActionBusyId = action.id;
    addError = "";
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
        throw new Error(`Release action ${action.label} failed`);
      }
      releaseData = payload.release;
      message =
        payload.message ??
        `${action.label} completed through the published AbsoluteJS release-control workflow.`;
    } catch (error) {
      addError =
        error instanceof Error
          ? error.message
          : `Release action ${action.label} failed`;
    } finally {
      releaseActionBusyId = null;
    }
  };

  const loadRagReadiness = async () => {
    const requestId = ++ragReadinessRequest;
    if (ragReadinessTimer) {
      clearTimeout(ragReadinessTimer);
      ragReadinessTimer = null;
    }

    try {
      const response = await fetch(`/demo/rag-readiness/${selectedMode}/json`);
      const next = (await response.json()) as DemoRagReadinessState;
      if (requestId !== ragReadinessRequest) {
        return;
      }
      ragReadiness = next;
      if (next.status === "warming") {
        ragReadinessTimer = setTimeout(() => {
          void loadRagReadiness();
        }, 2000);
      }
    } catch {
      if (requestId === ragReadinessRequest) {
        ragReadiness = {
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
    loading = true;
    searchError = "";
    try {
      const [
        documentsData,
        statusData,
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
      aiModelCatalog = aiModelsResponse;
      qualityData = qualityResponse;
      releaseData = releaseResponse;
      rag.evaluate.saveSuite(evaluationSuite);
      selectedAIModelKey =
        selectedAIModelKey ||
        aiModelsResponse.defaultModelKey ||
        aiModelsResponse.models[0]?.key ||
        "";
      documents = documentsData.documents as DemoDocument[];
      const currentChunkPreview = get(
        chunkPreviewStore,
      ) as DemoChunkPreview | null;
      if (
        currentChunkPreview !== null &&
        !documentsData.documents.some(
          (document) => document.id === currentChunkPreview.document.id,
        )
      ) {
        rag.chunkPreview.clear();
      }
      status = buildStatusView(
        statusData.status,
        statusData.capabilities,
        documents,
        selectedMode,
      );
      message = "";
    } catch (error) {
      message =
        error instanceof Error ? error.message : "Unable to load demo data";
    } finally {
      loading = false;
    }
  };

  const onSearchInput = (event: Event) => {
    const { name, value } = event.target as
      | HTMLInputElement
      | HTMLSelectElement;

    if (name === "topK") {
      searchForm = {
        ...searchForm,
        topK: Number(value) || searchForm.topK,
      };
      return;
    }

    if (name === "kind") {
      searchForm = {
        ...searchForm,
        kind: value === "seed" || value === "custom" ? value : "",
      };
      return;
    }

    searchForm = {
      ...searchForm,
      [name]: value,
    };
  };

  const onAddInput = (event: Event) => {
    const { name, value } = event.target as
      | HTMLInputElement
      | HTMLTextAreaElement;
    addForm = {
      ...addForm,
      [name]: value,
    };
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

  const executeSearch = async () => {
    searchError = "";
    searchResults = null;

    const query = searchForm.query.trim();
    if (query.length === 0) {
      searchError = "query is required";
      return;
    }

    try {
      const payload = buildSearchPayload({
        ...searchForm,
        query,
        retrievalPresetId: retrievalPresetId || undefined,
      });
      const start = performance.now();
      const response = await fetch(`/demo/message/${selectedMode}/search`, {
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
      const nextState = { ...searchForm, query };
      recentQueries = [
        { label: query, state: nextState },
        ...recentQueries.filter(
          (entry) => JSON.stringify(entry.state) !== JSON.stringify(nextState),
        ),
      ].slice(0, 4);
      searchResults = buildSearchResponse(
        query,
        payload,
        results,
        Math.round(performance.now() - start),
        parsed.trace,
      );
    } catch (error) {
      searchError = error instanceof Error ? error.message : "Search failed";
    }
  };

  const focusInspectionEntry = async (
    entry: ReturnType<typeof buildInspectionEntries>[number],
  ) => {
    documentTypeFilter = "all";
    documentSearchTerm = entry.sourceQuery ?? "";
    documentPage = 1;
    document
      .getElementById("document-list")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (entry.documentId) {
      message = `Inspecting ${entry.documentId} from ops inspection.`;
      await inspectChunks(entry.documentId);
      return;
    }
    if (entry.source) {
      searchForm = {
        ...searchForm,
        source: entry.source,
        documentId: "",
        query: `Source search for ${entry.source}`,
      };
      scopeDriver = `ops inspection: ${entry.source}`;
      message = `Scoped retrieval to ${entry.source} from ops inspection.`;
      await executeSearch();
    }
  };

  const submitSearch = async (event: SubmitEvent) => {
    event.preventDefault();
    scopeDriver = "manual filters";
    await executeSearch();
  };

  const clearRetrievalScope = () => {
    searchForm = { ...searchForm, kind: "", source: "", documentId: "" };
    scopeDriver = "chip reset";
    if (searchForm.query.trim().length > 0) {
      void executeSearch();
    }
  };

  const clearAllRetrievalState = () => {
    searchForm = {
      ...searchForm,
      query: "",
      kind: "",
      source: "",
      documentId: "",
      scoreThreshold: "",
    };
    searchResults = null;
    searchError = "";
    scopeDriver = "clear all state";
  };

  const rerunLastQuery = () => {
    if (searchForm.query.trim().length === 0) return;
    scopeDriver = "rerun last query";
    void executeSearch();
  };

  const rerunRecentQuery = (state: SearchFormState) => {
    searchForm = state;
    scopeDriver = "recent query";
    void executeSearch();
  };

  const submitStreamQuery = (event: SubmitEvent) => {
    event.preventDefault();
    const prompt = streamPrompt.trim();
    if (prompt.length === 0) {
      message = "Enter a retrieval question before starting the stream.";
      return;
    }
    if (selectedAIModelKey.length === 0) {
      message = "Configure an AI provider to enable retrieval streaming.";
      return;
    }

    message = "";
    workflow.query(buildDemoAIStreamPrompt(selectedAIModelKey, prompt));
  };

  const runSavedSuite = async () => {
    evaluationMessage = "";

    try {
      const run = await rag.evaluate.runSuite(evaluationSuite);
      evaluationMessage = `Saved suite run finished in ${run.elapsedMs}ms and ranked ${get(evaluationLeaderboardStore).length} workflow run(s).`;
    } catch (error) {
      evaluationMessage =
        error instanceof Error
          ? `Saved suite failed: ${error.message}`
          : "Saved suite failed";
    }
  };

  const runEvaluation = async () => {
    evaluationMessage = "";

    try {
      const response = await rag.evaluate.evaluate(buildDemoEvaluationInput());
      evaluationMessage = `Benchmark suite finished in ${response.elapsedMs}ms across ${response.totalCases} benchmark queries.`;
    } catch (error) {
      evaluationMessage =
        error instanceof Error
          ? `Evaluation failed: ${error.message}`
          : "Evaluation failed";
    }
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

  const runPresetSearch = (
    query: string,
    options: Partial<SearchFormState> = {},
    driver = "preset",
    presetId = "",
  ) => {
    searchForm = {
      ...searchForm,
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
    scopeDriver = driver;
    if (driver.startsWith("benchmark preset:")) {
      benchmarkPresetId = presetId;
      retrievalPresetId = resolveBenchmarkRetrievalPresetId(presetId);
      uploadPresetId = "";
    } else if (driver === "upload verification") {
      retrievalPresetId = "";
      benchmarkPresetId = "";
    } else {
      retrievalPresetId = presetId;
      benchmarkPresetId = "";
      uploadPresetId = "";
    }

    void executeSearch();
  };

  const runReleaseEvidenceDrill = (
    drill: (typeof releasePanel.releaseEvidenceDrills)[number],
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

  const ingestDemoUpload = async (
    preset: (typeof demoUploadPresets)[number],
  ) => {
    uploadError = "";
    message = `Uploading ${preset.label}...`;
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
      message = `Uploaded ${preset.label}. Extracted ${result.count ?? 0} chunk(s) across ${result.documentCount ?? 1} document(s).`;
      uploadPresetId = preset.id;
      runPresetSearch(
        preset.query,
        { source: preset.expectedSources[0] ?? preset.source, topK: 6 },
        "upload verification",
      );
    } catch (error) {
      uploadError =
        error instanceof Error
          ? `Upload failed: ${error.message}`
          : "Upload failed";
      message = "";
    }
  };

  const uploadSelectedFile = async () => {
    if (!selectedUploadFile) {
      uploadError = "Choose a file before uploading.";
      return;
    }

    uploadError = "";
    message = `Uploading ${selectedUploadFile.name}...`;
    try {
      const uploadedName = selectedUploadFile.name;
      const result = await rag.ingest.ingestUploads({
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
              uploadedFrom: "svelte-general-upload",
            },
          },
        ],
      });
      message = `Uploaded ${uploadedName}. Extracted ${result.count ?? 0} chunk(s) across ${result.documentCount ?? 1} document(s).`;
      selectedUploadFile = null;
      await refreshData();
      runPresetSearch(
        `Explain ${uploadedName}`,
        { source: `uploads/${uploadedName}`, topK: 6 },
        "upload verification",
      );
    } catch (error) {
      uploadError =
        error instanceof Error
          ? `Upload failed: ${error.message}`
          : "Upload failed";
      message = "";
    }
  };

  const submitAddDocument = async (event: SubmitEvent) => {
    event.preventDefault();
    addError = "";
    searchError = "";

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

      message = `Inserted ${response.inserted ?? addForm.title.trim()}`;
      addForm = {
        id: "",
        title: "",
        source: "",
        format: "markdown",
        chunkStrategy: "source_aware",
        text: "",
      };
      await refreshData();
    } catch (error) {
      addError =
        error instanceof Error ? error.message : "Failed to insert document";
    }
  };

  const inspectChunks = async (id: string) => {
    try {
      await rag.chunkPreview.inspect(id);
    } catch (error) {
      message =
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
      message = `Deleted ${id}`;
      const currentChunkPreview = get(
        chunkPreviewStore,
      ) as DemoChunkPreview | null;
      if (currentChunkPreview?.document.id === id) {
        rag.chunkPreview.clear();
      }
      await refreshData();
    } catch (error) {
      message =
        error instanceof Error
          ? `Failed to delete ${id}: ${error.message}`
          : "Failed to delete document";
    }
  };

  const reseed = async () => {
    try {
      message = "Reseeding defaults...";
      const result = await rag.index.reseed();
      message = `Reseed complete. Documents=${result.documents ?? 0}`;
      searchResults = null;
      await refreshData();
    } catch (error) {
      message =
        error instanceof Error
          ? `Reseed failed: ${error.message}`
          : "Reseed failed";
    }
  };

  const resetCustom = async () => {
    try {
      message = "Resetting custom documents...";
      const result = await rag.index.reset();
      message = `Reset complete. Documents=${result.documents ?? 0}`;
      searchResults = null;
      await refreshData();
    } catch (error) {
      message =
        error instanceof Error
          ? `Reset failed: ${error.message}`
          : "Reset failed";
    }
  };

  const syncAllSources = async () => {
    try {
      message = "Starting source sync...";
      const result = await rag.index.syncAllSources({ background: true });
      message = `Started sync for ${"sources" in result ? result.sources.length : 0} source(s). Watch the sync feedback panel for progress.`;
      await refreshData();
    } catch (error) {
      message =
        error instanceof Error
          ? `Source sync failed: ${error.message}`
          : "Source sync failed";
    }
  };

  const queueBackgroundSync = async () => {
    try {
      message = "Queueing background sync...";
      await rag.index.syncAllSources({ background: true });
      message = "Background sync queued.";
      await refreshData();
    } catch (error) {
      message =
        error instanceof Error
          ? `Failed to queue background sync: ${error.message}`
          : "Failed to queue background sync";
    }
  };

  const syncSource = async (id: string) => {
    try {
      message = `Starting ${id} sync...`;
      const result = await rag.index.syncSource(id, { background: true });
      message =
        "source" in result
          ? `Started ${result.source.label}. Watch the sync feedback panel for progress.`
          : `Started ${id}. Watch the sync feedback panel for progress.`;
      await refreshData();
    } catch (error) {
      message =
        error instanceof Error
          ? `Failed to sync ${id}: ${error.message}`
          : `Failed to sync ${id}`;
    }
  };

  const queueBackgroundSourceSync = async (id: string) => {
    try {
      message = `Queueing ${id} in the background...`;
      const result = await rag.index.syncSource(id, { background: true });
      message =
        "source" in result ? `Queued ${result.source.label}.` : `Queued ${id}.`;
      await refreshData();
    } catch (error) {
      message =
        error instanceof Error
          ? `Failed to queue ${id}: ${error.message}`
          : `Failed to queue ${id}`;
    }
  };
</script>

<svelte:head>
  <title>AbsoluteJS RAG Workflow Demo - Svelte</title>
  <meta
    name="description"
    content="AbsoluteJS RAG vector demo with native SQLite retrieval, metadata filters, and document indexing."
  />
  {#if cssPath}
    <link rel="stylesheet" href={cssPath} />
  {/if}
</svelte:head>

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
      {#each backendOptions as backend}
        <div class="demo-nav-row">
          <span
            class={backend.id === selectedMode
              ? "demo-nav-row-label active"
              : "demo-nav-row-label"}
          >
            {backend.label}
          </span>
          {#each demoFrameworks as framework}
            <a
              class={[
                framework.id === "svelte" && backend.id === selectedMode
                  ? "active"
                  : "",
                backend.available ? "" : "disabled",
              ]
                .filter(Boolean)
                .join(" ")}
              href={backend.available
                ? getDemoPagePath(framework.id, backend.id)
                : undefined}
              aria-disabled={!backend.available}
              title={backend.available ? undefined : backend.reason}
            >
              {framework.label}
            </a>
          {/each}
        </div>
      {/each}
    </nav>
  </header>

  <main class="demo-layout">
    <section class="demo-card">
      <span class="demo-hero-kicker">Svelte workflow surface</span>
      <h1>AbsoluteJS RAG Workflow Demo - Svelte</h1>
      {#if ragReadiness}
        <div class={`demo-rag-readiness ${ragReadiness.className}`}>
          <strong>{ragReadiness.label}</strong>
          <span>{ragReadiness.detail}</span>
        </div>
      {:else}
        <p class="demo-metadata">Loading RAG readiness...</p>
      {/if}
      <p>
        Use one route to ingest, sync, retrieve, stream grounded answers, and
        inspect ops health against the same stuffed multi-format knowledge base.
      </p>
      <p class="demo-metadata">
        Pinned to <code
          >@absolutejs/absolute@0.19.0-beta.655 + @absolutejs/ai@0.0.5 +
          @absolutejs/rag@0.0.5</code
        >
        and surfacing the shared <code>@absolutejs/ai + @absolutejs/rag</code>
        plus <code>@absolutejs/rag/ui</code> diagnostics on this page.
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
            Exercise directory, URL, storage, and email sync adapters alongside
            ingest mutations, benchmarks, and admin status.
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
        {#each ragExampleSections as section}
          <button
            class={activeSection === section.id
              ? "demo-section-card demo-section-card-active"
              : "demo-section-card"}
            on:click={() => (activeSection = section.id)}
            type="button"
          >
            <span>{section.kicker}</span>
            <strong>{section.title}</strong>
            <p>{section.description}</p>
            <small
              >{activeSection === section.id
                ? "Loaded"
                : section.loadLabel}</small
            >
          </button>
        {/each}
      </div>
    </section>

    {#if activeSection === "overview"}
      <section class="demo-card demo-full-lab-placeholder">
        <h2>Choose a RAG capability card</h2>
        <p class="demo-metadata">
          Svelte now follows the same card-driven demo structure as React. Pick
          a lane to show that part of the RAG package example.
        </p>
      </section>
    {/if}

    <div
      class={activeSection === "overview"
        ? "demo-results demo-section-hidden"
        : "demo-results"}
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
      {#if message}
        <p class="demo-banner">{message}</p>
      {/if}
      {#if restoredSharedState}
        <p class="demo-banner">{restoredSharedStateSummary}</p>
      {/if}
      {#if loading}
        <p class="demo-banner">Loading status and documents...</p>
      {/if}
    </div>
    {#if status && activeSection !== "overview" && activeSection !== "ingest"}
      <section class="demo-grid">
        <article class="demo-card">
          <h2>Diagnostics</h2>
          <dl class="demo-stat-grid">
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

          {#if status.native.fallbackReason}
            <p class="demo-metadata">{status.native.fallbackReason}</p>
          {/if}
          <p class="demo-metadata">{status.reranker.summary}</p>
          <p class="demo-metadata">
            Backend capabilities: <strong
              >{status.capabilities.join(" · ")}</strong
            >
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
                <p class="demo-release-banner">{releasePanel.releaseHero}</p>
                <p class="demo-release-summary">
                  {releasePanel.releaseHeroSummary}
                </p>
                <p class="demo-metadata">{releasePanel.releaseHeroMeta}</p>
                <p class="demo-metadata">{releasePanel.releaseScopeNote}</p>
                <div class="demo-release-pills">
                  {#each releasePanel.releaseHeroPills as pill (`release-pill-${pill.label}`)}
                    {#if pill.targetCardId || pill.targetActivityId}
                      <a
                        class={`demo-release-pill demo-release-pill-${pill.tone}`}
                        href={`#${pill.targetActivityId ?? pill.targetCardId}`}
                        on:click={() =>
                          openReleaseDiagnosticsTarget(pill.targetCardId)}
                      >
                        <span class="demo-release-pill-label">{pill.label}</span
                        >
                        <span class="demo-release-pill-value">{pill.value}</span
                        >
                      </a>
                    {:else}
                      <span
                        class={`demo-release-pill demo-release-pill-${pill.tone}`}
                      >
                        <span class="demo-release-pill-label">{pill.label}</span
                        >
                        <span class="demo-release-pill-value">{pill.value}</span
                        >
                      </span>
                    {/if}
                  {/each}
                </div>
                <div class="demo-release-scenario-switcher">
                  {#each demoReleaseWorkspaces as entry (`release-workspace-${entry.id}`)}
                    <span
                      class={`demo-release-scenario-chip demo-release-workspace-chip${releaseWorkspace === entry.id ? " demo-release-scenario-chip-active" : ""}`}
                    >
                      <button
                        type="button"
                        on:click={() => {
                          releaseWorkspace = entry.id;
                          void refreshData();
                        }}
                        disabled={releaseWorkspace === entry.id}
                        title={entry.description}
                      >
                        Workspace · {entry.label}
                      </button>
                    </span>
                  {/each}
                  {#each releasePanel.releaseScenarioActions as entry (`release-scenario-${entry.id}`)}
                    <span
                      class={`demo-release-scenario-chip${entry.active ? " demo-release-scenario-chip-active" : ""}`}
                    >
                      {#if entry.action}
                        <button
                          type="button"
                          on:click={() => runReleaseAction(entry.action!)}
                          disabled={entry.active ||
                            releaseActionBusyId === entry.action.id}
                          title={entry.action.description}
                        >
                          {releaseActionBusyId === entry.action.id
                            ? `Running ${entry.action.label}...`
                            : entry.label}
                        </button>
                      {:else}
                        <span>{entry.label}</span>
                      {/if}
                    </span>
                  {/each}
                </div>
                <div class="demo-release-path">
                  {#each releasePanel.releasePathSteps as step (`release-path-${step.id}`)}
                    <article
                      class={`demo-release-path-step demo-release-path-step-${step.status}`}
                    >
                      <div class="demo-release-path-step-header">
                        <h4>{step.label}</h4>
                        <span
                          class={`demo-release-path-status demo-release-path-status-${step.status}`}
                          >{step.status}</span
                        >
                      </div>
                      <p>{step.summary}</p>
                      <p class="demo-release-path-detail">{step.detail}</p>
                      {#if step.action}
                        <button
                          class="demo-release-path-action"
                          type="button"
                          on:click={() => runReleaseAction(step.action!)}
                          disabled={releaseActionBusyId === step.action.id}
                        >
                          {releaseActionBusyId === step.action.id
                            ? `Running ${step.action.label}...`
                            : step.action.label}
                        </button>
                      {/if}
                    </article>
                  {/each}
                </div>
              </div>
              <div class="demo-release-action-rail">
                <span class="demo-release-action-label">Live actions</span>
                <div class="demo-release-action-state">
                  <span class="demo-release-action-state-badge"
                    >Scenario · {releasePanel.scenario?.label ??
                      "Blocked stable lane"}</span
                  >
                  <span
                    class={`demo-release-action-delta-badge demo-release-action-delta-badge-${releasePanel.releaseRailDeltaChip.tone}`}
                    >{releasePanel.releaseRailDeltaChip.label}</span
                  >
                  <span
                    class={`demo-release-action-delta-badge demo-release-action-delta-badge-${releasePanel.railIncidentPostureChip.tone}`}
                    >Incident posture · {releasePanel.railIncidentPostureChip
                      .label}</span
                  >
                  <span
                    class={`demo-release-action-delta-badge demo-release-action-delta-badge-${releasePanel.railGateChip.tone}`}
                    >Gate posture · {releasePanel.railGateChip.label}</span
                  >
                  <span
                    class={`demo-release-action-delta-badge demo-release-action-delta-badge-${releasePanel.railApprovalChip.tone}`}
                    >Approval posture · {releasePanel.railApprovalChip
                      .label}</span
                  >
                  <span
                    class={`demo-release-action-delta-badge demo-release-action-delta-badge-${releasePanel.railRemediationChip.tone}`}
                    >Remediation posture · {releasePanel.railRemediationChip
                      .label}</span
                  >
                </div>
                <div class="demo-release-rail-meta">
                  {#if releasePanel.releaseRailUpdateSource.targetCardId || releasePanel.releaseRailUpdateSource.targetActivityId}<a
                      class={`demo-release-activity-lane demo-release-activity-lane-${releasePanel.releaseRailUpdateSource.tone}`}
                      href={`#${releasePanel.releaseRailUpdateSource.targetActivityId ?? releasePanel.releaseRailUpdateSource.targetCardId}`}
                      on:click={() =>
                        openReleaseDiagnosticsTarget(
                          releasePanel.releaseRailUpdateSource.targetCardId,
                        )}>{releasePanel.releaseRailUpdateSource.label}</a
                    >{:else}<span
                      class={`demo-release-activity-lane demo-release-activity-lane-${releasePanel.releaseRailUpdateSource.tone}`}
                      >{releasePanel.releaseRailUpdateSource.label}</span
                    >{/if}
                  <p class="demo-release-updated">
                    {releasePanel.releaseRailUpdatedLabel}
                  </p>
                </div>
                {#if releasePendingLabel}
                  <p class="demo-release-pending">{releasePendingLabel}</p>
                {/if}
                {#if releasePanel.latestReleaseAction}
                  <details
                    class={`demo-collapsible demo-release-action-latest demo-release-action-latest-${releasePanel.latestReleaseAction.tone}`}
                  >
                    <summary
                      >Latest action · {releasePanel.latestReleaseAction
                        .title}</summary
                    >
                    {#if releasePanel.latestReleaseAction.detail}
                      <p>{releasePanel.latestReleaseAction.detail}</p>
                    {/if}
                    <p class="demo-release-next-step">
                      {releasePanel.latestReleaseAction.nextStep}
                    </p>
                  </details>
                {/if}
                <details
                  class={`demo-collapsible demo-release-rail-callout demo-release-rail-callout-${releasePanel.releaseRailCallout.tone}`}
                >
                  <summary>{releasePanel.releaseRailCallout.title}</summary>
                  <p>{releasePanel.releaseRailCallout.message}</p>
                  {#if releasePanel.releaseRailCallout.detail}
                    <p>{releasePanel.releaseRailCallout.detail}</p>
                  {/if}
                  <p class="demo-release-next-step">
                    {releasePanel.releaseRailCallout.nextStep}
                  </p>
                </details>
                {#if releasePanel.recentReleaseActivity.length}
                  <div class="demo-release-activity-stack">
                    <span class="demo-release-action-subtitle"
                      >Recent activity</span
                    >
                    {#each releasePanel.recentReleaseActivity as entry (`release-activity-${entry.laneLabel}-${entry.title}-${entry.detail}`)}
                      <a
                        id={entry.id}
                        class={`demo-release-activity demo-release-activity-${entry.tone}`}
                        href={`#${entry.targetCardId}`}
                        on:click={() =>
                          openReleaseDiagnosticsTarget(entry.targetCardId)}
                        ><span
                          class={`demo-release-activity-lane demo-release-activity-lane-${entry.tone}`}
                          >{entry.laneLabel}</span
                        ><strong>{entry.title}</strong>{entry.detail
                          ? ` · ${entry.detail}`
                          : ""}</a
                      >
                    {/each}
                  </div>
                {/if}
                <div class="demo-release-action-group">
                  <span class="demo-release-action-subtitle">Release</span>
                  <div class="demo-release-actions">
                    {#each releasePanel.primaryReleaseActions as action (`release-action-${action.id}`)}
                      <button
                        class={`demo-release-action demo-release-action-${action.tone ?? "neutral"}`}
                        type="button"
                        on:click={() => runReleaseAction(action)}
                        disabled={releaseActionBusyId === action.id}
                        title={action.description}
                      >
                        {releaseActionBusyId === action.id
                          ? `Running ${action.label}...`
                          : action.label}
                      </button>
                    {/each}
                  </div>
                  {#if releasePanel.secondaryReleaseActions.length > 0}
                    <details class="demo-collapsible demo-release-more-actions">
                      <summary>More actions</summary>
                      <div class="demo-release-actions">
                        {#each releasePanel.secondaryReleaseActions as action (`secondary-release-action-${action.id}`)}
                          <button
                            class={`demo-release-action demo-release-action-${action.tone ?? "neutral"}`}
                            type="button"
                            on:click={() => runReleaseAction(action)}
                            disabled={releaseActionBusyId === action.id}
                            title={action.description}
                          >
                            {releaseActionBusyId === action.id
                              ? `Running ${action.label}...`
                              : action.label}
                          </button>
                        {/each}
                      </div>
                    </details>
                  {/if}
                </div>
                {#if releasePanel.handoffActions.length > 0}
                  <div class="demo-release-action-group">
                    <span class="demo-release-action-subtitle">Handoff</span>
                    <div class="demo-release-actions">
                      {#each releasePanel.handoffActions as action (`handoff-action-${action.id}`)}
                        <button
                          class={`demo-release-action demo-release-action-${action.tone ?? "neutral"}`}
                          type="button"
                          on:click={() => runReleaseAction(action)}
                          disabled={releaseActionBusyId === action.id}
                          title={action.description}
                        >
                          {releaseActionBusyId === action.id
                            ? `Running ${action.label}...`
                            : action.label}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
                <div class="demo-release-action-group">
                  <span class="demo-release-action-subtitle"
                    >Evidence drills</span
                  >
                  <div class="demo-release-actions">
                    {#each releasePanel.releaseEvidenceDrills as drill (`release-drill-${drill.id}`)}
                      <button
                        class={`demo-release-action demo-release-action-${drill.active ? "primary" : "neutral"}`}
                        type="button"
                        on:click={() => runReleaseEvidenceDrill(drill)}
                      >
                        {drill.label}
                      </button>
                    {/each}
                  </div>
                  {#each releasePanel.releaseEvidenceDrills as drill (`release-drill-detail-${drill.id}`)}
                    <p class="demo-metadata">
                      <strong>{drill.classificationLabel}:</strong>
                      {drill.summary} Expected source · {drill.expectedSource}
                    </p>
                    <p class="demo-metadata">{drill.traceExpectation}</p>
                  {/each}
                </div>
              </div>
            </div>
            <div class="demo-stat-grid">
              <article class="demo-stat-card">
                <span class="demo-stat-label">Stable baseline</span>
                <strong
                  >{releasePanel.stableBaseline?.label ??
                    "Not promoted"}</strong
                >
                <p>
                  {#if releasePanel.stableBaseline}
                    {releasePanel.stableBaseline.retrievalId} · v{releasePanel
                      .stableBaseline.version}{releasePanel.stableBaseline
                      .approvedBy
                      ? ` · approved by ${releasePanel.stableBaseline.approvedBy}`
                      : ""}
                  {:else}
                    No stable baseline has been promoted yet.
                  {/if}
                </p>
              </article>
              <article class="demo-stat-card">
                <span class="demo-stat-label">Canary baseline</span>
                <strong
                  >{releasePanel.canaryBaseline?.label ??
                    "Not promoted"}</strong
                >
                <p>
                  {#if releasePanel.canaryBaseline}
                    {releasePanel.canaryBaseline.retrievalId} · v{releasePanel
                      .canaryBaseline.version}{releasePanel.canaryBaseline
                      .approvedAt
                      ? ` · ${formatDate(releasePanel.canaryBaseline.approvedAt)}`
                      : ""}
                  {:else}
                    No canary baseline has been promoted yet.
                  {/if}
                </p>
              </article>
              <article class="demo-stat-card">
                <span class="demo-stat-label">Stable readiness</span>
                <strong
                  >{releasePanel.stableReadiness?.ready
                    ? "Ready"
                    : "Blocked"}</strong
                >
                <p>
                  {#if releasePanel.stableReadiness}
                    {releasePanel.stableReadinessStatSummary}
                  {:else}
                    No stable lane readiness snapshot available.
                  {/if}
                </p>
              </article>
              <article class="demo-stat-card">
                <span class="demo-stat-label">Remediation guardrails</span>
                <strong
                  >{releasePanel.remediationSummary
                    ? `${releasePanel.remediationSummary.guardrailBlockedCount} blocked · ${releasePanel.remediationSummary.replayCount} replays`
                    : "No remediation executions"}</strong
                >
                <p>{releasePanel.remediationGuardrailSummary}</p>
              </article>
            </div>
            <p
              class={`demo-release-card-state demo-release-card-state-${releasePanel.releaseStateBadge.tone}`}
            >
              State · {releasePanel.releaseStateBadge.label}
            </p>
            <div class="demo-result-grid">
              <article class="demo-result-item">
                <h4>Blocker comparison</h4>
                <p class="demo-score-headline">
                  {releasePanel.scenarioClassificationLabel
                    ? `Active blocker · ${releasePanel.scenarioClassificationLabel}`
                    : "Compare both blocker classes"}
                </p>
                <div class="demo-result-grid">
                  {#each releasePanel.releaseBlockerComparisonCards as card (`blocker-card-${card.id}`)}
                    <article class="demo-result-item">
                      <h4>{card.label}{card.active ? " · active" : ""}</h4>
                      {#each card.detailLines as line (`${card.id}-${line}`)}
                        <p class="demo-metadata">{line}</p>
                      {/each}
                    </article>
                  {/each}
                </div>
              </article>
              <article
                class="demo-result-item"
                id="release-runtime-history-card"
              >
                <h4>Runtime planner history</h4>
                <p class="demo-score-headline">
                  {releasePanel.runtimePlannerHistorySummary}
                </p>
                {#each releasePanel.runtimePlannerHistoryLines as line (`runtime-planner-${line}`)}
                  <p class="demo-metadata">{line}</p>
                {/each}
              </article>
              <article
                class="demo-result-item"
                id="release-benchmark-snapshots-card"
              >
                <h4>Adaptive planner benchmark</h4>
                <p class="demo-score-headline">
                  {releasePanel.benchmarkSnapshotSummary}
                </p>
                {#each releasePanel.benchmarkSnapshotLines as line (`benchmark-snapshot-${line}`)}
                  <p class="demo-metadata">{line}</p>
                {/each}
              </article>
              <article class="demo-result-item" id="release-active-deltas-card">
                <h4>Active blocker deltas</h4>
                <p class="demo-score-headline">
                  {releasePanel.activeBlockerDeltaSummary}
                </p>
                {#each releasePanel.activeBlockerDeltaLines as line (`active-blocker-delta-${line}`)}
                  <p class="demo-metadata">{line}</p>
                {/each}
              </article>
              <article
                class="demo-result-item"
                id="release-lane-readiness-card"
              >
                <h4>Lane readiness</h4>
                <div class="demo-key-value-grid">
                  {#each releasePanel.laneReadinessEntries as entry (`lane-readiness-${entry.targetRolloutLabel}`)}
                    <div class="demo-key-value-row">
                      <span>{entry.targetRolloutLabel ?? "lane"}</span>
                      <strong>{entry.ready ? "ready" : "blocked"}</strong>
                    </div>
                    {#each entry.reasons.slice(0, 2) as reason (`${entry.targetRolloutLabel}-${reason}`)}
                      <p class="demo-metadata">{reason}</p>
                    {/each}
                  {/each}
                </div>
              </article>
              <article class="demo-result-item">
                <h4>Lane recommendations</h4>
                <div class="demo-insight-stack">
                  {#if releasePanel.releaseRecommendations.length > 0}
                    {#each releasePanel.releaseRecommendations as entry (`${entry.groupKey}:${entry.targetRolloutLabel}:${entry.recommendedAction}`)}
                      <p class="demo-insight-card">
                        <strong
                          >{entry.targetRolloutLabel ?? "lane"} · {entry.classificationLabel ??
                            "release recommendation"}:</strong
                        >
                        {entry.recommendedAction.replaceAll("_", " ")}{entry
                          .reasons[0]
                          ? ` · ${entry.reasons[0]}`
                          : ""}
                      </p>
                    {/each}
                  {:else}
                    <p class="demo-insight-card">
                      No lane recommendations are available yet.
                    </p>
                  {/if}
                </div>
              </article>
              <article
                class="demo-result-item"
                id="release-open-incidents-card"
              >
                <h4>Open incidents</h4>
                <p class="demo-score-headline">
                  {releasePanel.incidentSummaryLabel}
                </p>
                {#each releasePanel.incidentClassificationDetailLines as line (`incident-detail-${line}`)}
                  <p class="demo-metadata">{line}</p>
                {/each}
                <div class="demo-insight-stack">
                  {#each releasePanel.recentIncidents.slice(0, 3) as incident (`${incident.kind}:${incident.triggeredAt}`)}
                    <p class="demo-insight-card">
                      <strong
                        >{incident.targetRolloutLabel ?? "lane"} · {incident.kind}
                        · {incident.classificationLabel ??
                          "general regression"}</strong
                      ><br />{incident.message}
                    </p>
                  {/each}
                </div>
              </article>
              <article
                class="demo-result-item"
                id="release-remediation-history-card"
              >
                <h4>Remediation execution history</h4>
                {#each releasePanel.remediationDetailLines as line (`remediation-detail-${line}`)}
                  <p class="demo-metadata">{line}</p>
                {/each}
                <div class="demo-key-value-grid">
                  {#each releasePanel.recentIncidentRemediationExecutions.slice(0, 4) as entry, index (`remediation-execution-${index}`)}
                    <div class="demo-key-value-row">
                      <span>{entry.action?.kind ?? "execution"}</span>
                      <strong
                        >{entry.code}{entry.idempotentReplay
                          ? " · replay"
                          : ""}{entry.blockedByGuardrail
                          ? " · blocked"
                          : ""}</strong
                      >
                    </div>
                  {/each}
                </div>
              </article>
            </div>
            <details
              class="demo-collapsible demo-release-diagnostics"
              id="release-diagnostics"
            >
              <summary
                >Advanced release diagnostics · {releasePanel.releaseDiagnosticsSummary}</summary
              >
              <p class="demo-release-updated">
                {releasePanel.releaseDiagnosticsUpdatedLabel}
              </p>
              <p
                class={`demo-release-card-state demo-release-card-state-${releasePanel.releaseStateBadge.tone}`}
              >
                State · {releasePanel.releaseStateBadge.label}
              </p>
              <div class="demo-result-grid">
                <article
                  class="demo-result-item"
                  id="release-promotion-candidates-card"
                >
                  <h4>Promotion candidates</h4>
                  <div class="demo-key-value-grid">
                    {#if releasePanel.releaseCandidates.length > 0}
                      {#each releasePanel.releaseCandidates.slice(0, 3) as candidate, index (`promotion-candidate-${candidate.targetRolloutLabel}-${index}`)}
                        <div class="demo-key-value-row">
                          <span
                            >{candidate.targetRolloutLabel ?? "lane"} · {candidate.candidateRetrievalId ??
                              "candidate"}</span
                          >
                          <strong>{candidate.reviewStatus}</strong>
                        </div>
                        <p class="demo-metadata">
                          {candidate.reasons[0] ??
                            "No release reasons recorded."}
                        </p>
                      {/each}
                    {:else}
                      <p class="demo-metadata">
                        No promotion candidates recorded yet.
                      </p>
                    {/if}
                  </div>
                </article>
                <article class="demo-result-item">
                  <h4>Release alerts</h4>
                  <div class="demo-insight-stack">
                    {#if releasePanel.releaseAlerts.length > 0}
                      {#each releasePanel.releaseAlerts.slice(0, 4) as alert, index (`${alert.kind}-${index}`)}
                        <p class="demo-insight-card">
                          <strong
                            >{alert.targetRolloutLabel ?? "lane"} · {alert.kind} ·
                            {alert.classificationLabel ??
                              "general regression"}</strong
                          ><br />{alert.message ?? "No alert detail"}
                        </p>
                      {/each}
                    {:else}
                      <p class="demo-insight-card">
                        No release alerts are active.
                      </p>
                    {/if}
                  </div>
                </article>
                <article
                  class="demo-result-item"
                  id="release-policy-history-card"
                >
                  <h4>Policy history</h4>
                  {#each releasePanel.policyHistoryDetailLines as line (`policy-detail-${line}`)}
                    <p class="demo-metadata">{line}</p>
                  {/each}
                  <div class="demo-insight-stack">
                    {#if releasePanel.policyHistoryEntries.length > 0}
                      {#each releasePanel.policyHistoryEntries as entry (entry.id)}
                        <p class="demo-insight-card">
                          <strong>{entry.title}</strong><br />{entry.detail}
                        </p>
                      {/each}
                    {:else}
                      <p class="demo-insight-card">
                        {releasePanel.policyHistorySummary}
                      </p>
                    {/if}
                  </div>
                </article>
                <article
                  class="demo-result-item"
                  id="release-audit-surfaces-card"
                >
                  <h4>Audit surfaces</h4>
                  <div class="demo-insight-stack">
                    {#if releasePanel.auditSurfaceEntries.length > 0}
                      {#each releasePanel.auditSurfaceEntries as entry (entry.id)}
                        <p class="demo-insight-card">
                          <strong>{entry.title}</strong><br />{entry.detail}
                        </p>
                      {/each}
                    {:else}
                      <p class="demo-insight-card">
                        {releasePanel.auditSurfaceSummary}
                      </p>
                    {/if}
                  </div>
                </article>
                <article
                  class="demo-result-item"
                  id="release-polling-surfaces-card"
                >
                  <h4>Polling surfaces</h4>
                  <div class="demo-insight-stack">
                    {#each releasePanel.pollingSurfaceEntries as entry (entry.id)}
                      <p class="demo-insight-card">
                        <strong>{entry.title}</strong><br />{entry.detail}
                      </p>
                    {/each}
                  </div>
                </article>
                <article
                  class="demo-result-item"
                  id="release-handoff-incidents-card"
                >
                  <h4>Handoff incidents</h4>
                  <p class="demo-score-headline">
                    {releasePanel.stableHandoffIncidentSummaryLabel}
                  </p>
                  <div class="demo-insight-stack">
                    {#if releasePanel.handoffIncidents.length > 0}
                      {#each releasePanel.handoffIncidents.slice(0, 2) as incident, index (`${incident.id ?? index}`)}
                        <p class="demo-insight-card">
                          <strong
                            >{incident.status ?? "incident"} · {incident.kind ??
                              "handoff_stale"}</strong
                          ><br />{incident.message ??
                            "No handoff incident detail"}
                        </p>
                      {/each}
                    {:else}
                      <p class="demo-insight-card">
                        No handoff incidents recorded.
                      </p>
                    {/if}
                    {#each releasePanel.handoffIncidentHistory.slice(0, 3) as entry, index (`${entry.incidentId ?? index}-${entry.recordedAt ?? 0}`)}
                      <p class="demo-insight-card">
                        <strong>{entry.action ?? "history"}</strong><br />{[
                          entry.notes,
                          entry.recordedAt
                            ? new Date(entry.recordedAt).toLocaleString()
                            : undefined,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    {/each}
                  </div>
                </article>
                <article
                  class="demo-result-item"
                  id="release-stable-handoff-card"
                >
                  <h4>Stable handoff</h4>
                  <div class="demo-key-value-grid">
                    {#if releasePanel.stableHandoff}
                      <div class="demo-key-value-row">
                        <span
                          >{releasePanel.stableHandoff.sourceRolloutLabel} -&gt; {releasePanel
                            .stableHandoff.targetRolloutLabel}</span
                        >
                        <strong
                          >{releasePanel.stableHandoff.readyForHandoff
                            ? "ready"
                            : "blocked"}</strong
                        >
                      </div>
                      <p class="demo-metadata">
                        {releasePanel.stableHandoff.candidateRetrievalId
                          ? `candidate ${releasePanel.stableHandoff.candidateRetrievalId}`
                          : "No candidate retrieval is attached to the handoff yet."}
                        {releasePanel.stableHandoffDecision?.kind
                          ? ` · latest ${releasePanel.stableHandoffDecision.kind}`
                          : ""}
                      </p>
                      {#each releasePanel.stableHandoffDisplayReasons as reason (`stable-handoff-${reason}`)}
                        <p class="demo-metadata">{reason}</p>
                      {/each}
                      {#if releasePanel.stableHandoffAutoComplete}
                        <p class="demo-metadata">
                          {releasePanel.stableHandoffAutoCompleteLabel}
                        </p>
                      {/if}
                      <div class="demo-key-value-row">
                        <span>Drift events</span>
                        <strong
                          >{releasePanel.stableHandoffDrift?.totalCount ??
                            0}</strong
                        >
                      </div>
                    {:else}
                      <p class="demo-metadata">
                        No stable handoff posture is available yet.
                      </p>
                    {/if}
                  </div>
                </article>
              </div>
            </details>
          </div>
          <div class="demo-actions">
            <button on:click={reseed} type="button">Re-seed defaults</button>
            <button on:click={resetCustom} type="button"
              >Reset custom docs</button
            >
            <button on:click={refreshData} type="button">Refresh</button>
          </div>
        </article>

        <article class="demo-card">
          <h2>Retrieve And Verify</h2>
          <p class="demo-metadata">
            This section is powered by <code>createRAG</code>. Run a query, then
            confirm the returned chunk text and source label match the indexed
            source list below.
          </p>
          <div class="demo-preset-grid">
            <button
              type="button"
              on:click={() =>
                runPresetSearch(
                  "How do metadata filters change retrieval quality?",
                  { kind: "seed" },
                  "preset: filter behavior",
                  "filter-behavior",
                )}
            >
              Filter behavior
            </button>
            <button
              type="button"
              on:click={() =>
                runPresetSearch(
                  "What should I verify after ingesting a new source?",
                  {},
                  "preset: verify ingestion",
                  "verify-ingestion",
                )}
            >
              Verify ingestion
            </button>
            <button
              type="button"
              on:click={() =>
                runPresetSearch(
                  "List support policies for shipping and returns.",
                  { source: "guide/demo.md" },
                  "preset: source filter",
                  "source-filter",
                )}
            >
              Source filter
            </button>
            <button
              type="button"
              on:click={() =>
                runPresetSearch(
                  "Why should metadata be stable?",
                  { source: "guides/metadata.md" },
                  "preset: metadata discipline",
                  "metadata-discipline",
                )}
            >
              Metadata discipline
            </button>
            <button
              type="button"
              on:click={() =>
                runPresetSearch(
                  "Which aurora launch packet phrase shows late interaction can match precise wording without splitting the parent document?",
                  {},
                  "preset: late interaction",
                  "hybrid",
                )}
            >
              Late interaction / multivector
            </button>
            <button
              type="button"
              on:click={() =>
                runPresetSearch(
                  "Which synced site discovery guide says discovery diagnostics stay visible on the same sync surface as every other source?",
                  { source: "sync/site/demo/sync-fixtures/site/docs/guide" },
                  "preset: site discovery",
                  "site-discovery",
                )}
            >
              Site discovery (sync first)
            </button>
          </div>
          <form class="demo-search-form" on:submit={submitSearch}>
            <label for="query">Query</label>
            <input
              id="query"
              name="query"
              on:input={onSearchInput}
              placeholder="e.g. How do metadata filters work?"
              required
              type="text"
              value={searchForm.query}
            />

            <label for="topK">Top K</label>
            <input
              id="topK"
              max={20}
              min={1}
              name="topK"
              on:input={onSearchInput}
              type="number"
              value={searchForm.topK}
            />

            <label for="scoreThreshold">Minimum score (0-1)</label>
            <input
              id="scoreThreshold"
              name="scoreThreshold"
              on:input={onSearchInput}
              placeholder="optional"
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={searchForm.scoreThreshold}
            />

            <label for="kind">Kind filter</label>
            <select
              id="kind"
              name="kind"
              on:change={onSearchInput}
              value={searchForm.kind}
            >
              <option value="">Any</option>
              <option value="seed">Seed</option>
              <option value="custom">Custom</option>
            </select>

            <label for="source">Source filter</label>
            <input
              class:demo-filter-active={searchForm.source.trim().length > 0}
              id="source"
              name="source"
              on:input={(event) => {
                scopeDriver = "manual filters";
                onSearchInput(event);
              }}
              placeholder="e.g. guide/demo.md"
              type="text"
              value={searchForm.source}
            />

            <label for="documentId">Document ID filter</label>
            <input
              class:demo-filter-active={searchForm.documentId.trim().length > 0}
              id="documentId"
              name="documentId"
              on:input={(event) => {
                scopeDriver = "manual filters";
                onSearchInput(event);
              }}
              placeholder="e.g. rag-demo"
              type="text"
              value={searchForm.documentId}
            />

            <button type="submit">Search index</button>
          </form>
          <div class="demo-results">
            <h3>Active Retrieval Scope</h3>
            <div class="demo-badge-row">
              <span class="demo-state-chip">{retrievalScopeSummary}</span>
              <span class="demo-state-chip"
                >Changed by: {scopeDriver.replace(
                  /^row action: /,
                  "row action · ",
                )}</span
              >
              <span class="demo-state-chip"
                >Results: {searchResults?.count ?? 0}</span
              >
            </div>
            <p class="demo-metadata">{retrievalScopeHint}</p>
            <div class="demo-actions">
              <button
                disabled={searchForm.query.trim().length === 0 &&
                  searchForm.source.trim().length === 0 &&
                  searchForm.documentId.trim().length === 0 &&
                  searchForm.kind.length === 0}
                on:click={clearRetrievalScope}
                type="button">Clear scope</button
              >
              <button
                disabled={searchForm.query.trim().length === 0}
                on:click={rerunLastQuery}
                type="button">Rerun query</button
              >
              <button on:click={clearAllRetrievalState} type="button"
                >Clear search</button
              >
            </div>
            {#if recentQueries.length > 0}
              <p class="demo-section-caption">Recent Searches</p>
              <div class="demo-badge-row">
                {#each recentQueries as entry, index (`recent-query-${index}`)}
                  <button
                    class="demo-state-chip"
                    on:click={() => rerunRecentQuery(entry.state)}
                    type="button">{entry.label}</button
                  >
                {/each}
              </div>
            {/if}
          </div>
          {#if searchError}
            <p class="demo-error">{searchError}</p>
          {/if}
          {#if searchResults}
            <div class="demo-results">
              <p>
                {searchResults.count} results for “{searchResults.query}” in {searchResults.elapsedMs}ms
              </p>
              <p class="demo-metadata">{retrievalScopeSummary}</p>
              <p class="demo-metadata">Scope changed by: {scopeDriver}</p>
              <p class="demo-metadata">
                Reranking is active: AbsoluteJS reorders the first vector hits
                with the built-in heuristic provider before these results
                render.
              </p>
              <p class="demo-metadata">
                Verification rule: a good result shows chunk text that answers
                the query and a source label you can trace back to the indexed
                source list.
              </p>
              {#if searchResults.storyHighlights.length > 0}
                <div class="demo-results">
                  <h3>Retrieval Story</h3>
                  {#each searchResults.storyHighlights as line}<p
                      class="demo-metadata"
                    >
                      {line}
                    </p>{/each}
                </div>
              {/if}
              {#if searchResults.attributionOverview.length > 0}
                <div class="demo-results">
                  <h3>Attribution Overview</h3>
                  {#each searchResults.attributionOverview as line}<p
                      class="demo-metadata"
                    >
                      {line}
                    </p>{/each}
                </div>
              {/if}
              {#if searchResults.sectionDiagnostics.length > 0}
                <div class="demo-results">
                  <h3>Section Diagnostics</h3>
                  <div class="demo-result-grid">
                    {#each searchResults.sectionDiagnostics as diagnostic}
                      <article class="demo-result-item">
                        <h4>{diagnostic.label}</h4>
                        <p class="demo-result-source">{diagnostic.summary}</p>
                        <p class="demo-metadata">
                          {formatSectionDiagnosticChannels(diagnostic)}
                        </p>
                        <p class="demo-metadata">
                          {formatSectionDiagnosticAttributionFocus(diagnostic)}
                        </p>
                        <p class="demo-metadata">
                          {formatSectionDiagnosticPipeline(diagnostic)}
                        </p>
                        {#if formatSectionDiagnosticStageFlow(diagnostic)}<p
                            class="demo-metadata"
                          >
                            {formatSectionDiagnosticStageFlow(diagnostic)}
                          </p>{/if}
                        {#if formatSectionDiagnosticStageBounds(diagnostic)}<p
                            class="demo-metadata"
                          >
                            {formatSectionDiagnosticStageBounds(diagnostic)}
                          </p>{/if}
                        {#each formatSectionDiagnosticStageWeightRows(diagnostic) as line}
                          <p class="demo-metadata">{line}</p>
                        {/each}
                        <p class="demo-metadata">
                          {formatSectionDiagnosticTopEntry(diagnostic)}
                        </p>
                        {#if formatSectionDiagnosticCompetition(diagnostic)}<p
                            class="demo-metadata"
                          >
                            {formatSectionDiagnosticCompetition(diagnostic)}
                          </p>{/if}
                        {#if formatSectionDiagnosticReasons(diagnostic).length > 0}
                          <div class="demo-badge-row">
                            {#each formatSectionDiagnosticReasons(diagnostic) as reason}
                              <span class="demo-state-chip">{reason}</span>
                            {/each}
                            {#each formatSectionDiagnosticStageWeightReasons(diagnostic) as reason}
                              <span class="demo-state-chip">{reason}</span>
                            {/each}
                          </div>
                        {/if}
                        {#each formatSectionDiagnosticDistributionRows(diagnostic) as line}
                          <p class="demo-metadata">{line}</p>
                        {/each}
                      </article>
                    {/each}
                  </div>
                </div>
              {/if}
              <div class="demo-result-grid">
                {#each searchSectionGroups as group}
                  <article class="demo-result-item" id={group.targetId}>
                    <h3>{group.label}</h3>
                    <p class="demo-result-source">{group.summary}</p>
                    {#if group.jumps.length > 0}
                      <div class="demo-badge-row">
                        {#each group.jumps as jump}
                          <a class="demo-state-chip" href={`#${jump.targetId}`}
                            >{jump.label}</a
                          >
                        {/each}
                      </div>
                    {/if}
                    <div class="demo-result-grid">
                      {#each group.chunks as chunk}
                        <article class="demo-result-item" id={chunk.targetId}>
                          <h4>{chunk.title}</h4>
                          <p class="demo-result-score">
                            score: {formatScore(chunk.score)}
                          </p>
                          <p class="demo-result-source">
                            source: {chunk.source}
                          </p>
                          {#if chunk.labels?.contextLabel}<p
                              class="demo-metadata"
                            >
                              {chunk.labels.contextLabel}
                            </p>{/if}
                          {#if chunk.labels?.locatorLabel}<p
                              class="demo-metadata"
                            >
                              {chunk.labels.locatorLabel}
                            </p>{/if}
                          {#if chunk.labels?.provenanceLabel}<p
                              class="demo-metadata"
                            >
                              {chunk.labels.provenanceLabel}
                            </p>{/if}
                          {#each formatDemoMetadataSummary(chunk.metadata) as line}
                            <p class="demo-metadata">{line}</p>
                          {/each}
                          <p class="demo-result-text">{chunk.text}</p>
                        </article>
                      {/each}
                    </div>
                  </article>
                {/each}
              </div>
            </div>
          {/if}

          <div class="demo-results">
            <h3>Benchmark Retrieval</h3>
            <p class="demo-metadata">
              This section uses <code>createRAG().evaluate</code> to run a built-in
              benchmark suite. Each case names the source we expect retrieval to surface
              so you can compare expected, retrieved, and missing evidence directly.
            </p>
            <div class="demo-badge-row">
              {#each benchmarkOutcomeRail as entry}
                <span class="demo-state-chip" title={entry.summary}
                  >{formatBenchmarkOutcomeRailLabel(
                    entry,
                    benchmarkPresetId,
                  )}</span
                >
              {/each}
            </div>
            <div class="demo-preset-grid">
              {#each demoEvaluationPresets as preset}
                <button
                  type="button"
                  title={preset.description}
                  on:click={() =>
                    runPresetSearch(
                      preset.query,
                      { source: preset.expectedSources[0] ?? "" },
                      `benchmark preset: ${preset.label}`,
                      preset.id,
                    )}
                >
                  {preset.label}
                </button>
              {/each}
            </div>
            <div class="demo-actions">
              <button
                disabled={$evaluationIsEvaluatingStore}
                on:click={runEvaluation}
                type="button"
              >
                {$evaluationIsEvaluatingStore
                  ? "Running benchmark suite..."
                  : "Run benchmark suite"}
              </button>
            </div>
            {#if evaluationMessage}
              <p class="demo-metadata">{evaluationMessage}</p>
            {/if}
            {#if $evaluationErrorStore}
              <p class="demo-error">{$evaluationErrorStore}</p>
            {/if}
            {#if $evaluationStore}
              <p class="demo-metadata">
                Benchmark summary: {formatEvaluationSummary(
                  $evaluationStore as RAGEvaluationResponse,
                )}
              </p>
              <div class="demo-result-grid">
                {#each $evaluationStore.cases as entry}
                  <article
                    class={`demo-result-item demo-evaluation-card demo-evaluation-${entry.status}`}
                  >
                    <h4>{entry.label ?? entry.caseId}</h4>
                    <p class="demo-result-source">{entry.query}</p>
                    <p class="demo-evaluation-status">
                      {entry.status.toUpperCase()}
                    </p>
                    <p class="demo-metadata">
                      {formatEvaluationCaseSummary(entry)}
                    </p>
                    <p class="demo-metadata">
                      expected: {formatEvaluationExpected(entry)}
                    </p>
                    <p class="demo-metadata">
                      retrieved: {formatEvaluationRetrieved(entry)}
                    </p>
                    <p class="demo-result-text">
                      missing: {formatEvaluationMissing(entry)}
                    </p>
                  </article>
                {/each}
              </div>
            {/if}
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
              {#each $evaluationSuitesStore.length > 0 ? $evaluationSuitesStore : [evaluationSuite] as suite (suite.id)}
                <span class="demo-pill"
                  >{suite.label ?? suite.id} · {suite.input.cases.length} cases</span
                >
              {/each}
            </div>
            <div class="demo-actions">
              <button
                disabled={$evaluationIsEvaluatingStore}
                on:click={runSavedSuite}
                type="button"
                >{$evaluationIsEvaluatingStore
                  ? "Running saved suite..."
                  : "Run saved suite"}</button
              >
            </div>
            <div class="demo-tab-row">
              {#each ["overview", "strategies", "grounding", "history"] as view}
                <button
                  class={qualityView === view
                    ? "demo-tab demo-tab-active"
                    : "demo-tab"}
                  on:click={() => (qualityView = view as typeof qualityView)}
                  type="button">{view[0].toUpperCase() + view.slice(1)}</button
                >
              {/each}
            </div>
            <div class="demo-stat-grid">
              <article class="demo-stat-card">
                <span class="demo-stat-label">Saved suite leader</span>
                <strong
                  >{$evaluationLeaderboardStore[0]?.label ??
                    "Run the saved suite"}</strong
                >
                <p>
                  {$evaluationLeaderboardStore[0]
                    ? formatEvaluationLeaderboardEntry(
                        $evaluationLeaderboardStore[0],
                      )
                    : "The leaderboard will rank repeated workflow benchmark runs."}
                </p>
              </article>
              <article class="demo-stat-card">
                <span class="demo-stat-label">Retrieval winner</span>
                <strong
                  >{qualityData
                    ? formatRetrievalComparisonOverviewPresentation(
                        qualityData.retrievalComparison,
                      ).winnerLabel
                    : "Loading comparison"}</strong
                >
                <p>
                  {qualityData
                    ? formatRetrievalComparisonOverviewPresentation(
                        qualityData.retrievalComparison,
                      ).summary
                    : "Running retrieval comparison..."}
                </p>
              </article>
              <article class="demo-stat-card">
                <span class="demo-stat-label">Reranker winner</span>
                <strong
                  >{qualityData
                    ? formatRerankerComparisonOverviewPresentation(
                        qualityData.rerankerComparison,
                      ).winnerLabel
                    : "Loading comparison"}</strong
                >
                <p>
                  {qualityData
                    ? formatRerankerComparisonOverviewPresentation(
                        qualityData.rerankerComparison,
                      ).summary
                    : "Running reranker comparison..."}
                </p>
              </article>
              <article class="demo-stat-card">
                <span class="demo-stat-label">Grounding winner</span>
                <strong
                  >{qualityData?.providerGroundingComparison
                    ? formatGroundingProviderOverviewPresentation(
                        qualityData.providerGroundingComparison,
                      ).winnerLabel
                    : "Stored workflow evaluation"}</strong
                >
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
            {#if qualityData}
              {#if qualityView === "overview"}
                <div class="demo-result-grid">
                  <article class="demo-result-item">
                    <h4>Winners at a glance</h4>
                    <div class="demo-key-value-grid">
                      {#each formatQualityOverviewPresentation( { retrievalComparison: qualityData.retrievalComparison, rerankerComparison: qualityData.rerankerComparison, groundingEvaluation: qualityData.groundingEvaluation, groundingProviderOverview: qualityData.providerGroundingComparison ? formatGroundingProviderOverviewPresentation(qualityData.providerGroundingComparison) : undefined }, ).rows as row, index (`quality-overview-${index}`)}
                        <div class="demo-key-value-row">
                          <span>{row.label}</span>
                          <strong>{row.value}</strong>
                        </div>
                      {/each}
                    </div>
                  </article>
                  <article class="demo-result-item">
                    <h4>Why this matters</h4>
                    <div class="demo-insight-stack">
                      {#each formatQualityOverviewNotes() as insight}
                        <p class="demo-insight-card">{insight}</p>
                      {/each}
                    </div>
                  </article>
                </div>
              {/if}
              {#if qualityView === "strategies"}
                <div class="demo-result-grid">
                  {#each formatRetrievalComparisonPresentations(qualityData.retrievalComparison) as card (card.id)}
                    <article class="demo-result-item demo-score-card">
                      <h4>{card.label}</h4>
                      <p class="demo-score-headline">{card.summary}</p>
                      <div class="demo-key-value-grid demo-trace-summary-grid">
                        {#each card.traceSummaryRows as row (`${card.id}-${row.label}`)}
                          <div class="demo-key-value-row">
                            <span>{row.label}</span>
                            <strong>{row.value}</strong>
                          </div>
                        {/each}
                      </div>
                      <details class="demo-collapsible demo-trace-diff">
                        <summary>
                          <span>Trace diff vs leader</span>
                          <strong>{card.diffLabel}</strong>
                        </summary>
                        <div
                          class="demo-collapsible-content demo-trace-diff-grid"
                        >
                          {#each card.diffRows as row (`${card.id}-diff-${row.label}`)}
                            <div class="demo-key-value-row">
                              <span>{row.label}</span>
                              <strong>{row.value}</strong>
                            </div>
                          {/each}
                        </div>
                      </details>
                    </article>
                  {/each}
                </div>
                <div class="demo-result-grid">
                  {#each formatRerankerComparisonPresentations(qualityData.rerankerComparison) as card (card.id)}
                    <article class="demo-result-item demo-score-card">
                      <h4>{card.label}</h4>
                      <p class="demo-score-headline">{card.summary}</p>
                      <div class="demo-key-value-grid demo-trace-summary-grid">
                        {#each card.traceSummaryRows as row (`${card.id}-${row.label}`)}
                          <div class="demo-key-value-row">
                            <span>{row.label}</span>
                            <strong>{row.value}</strong>
                          </div>
                        {/each}
                      </div>
                      <details class="demo-collapsible demo-trace-diff">
                        <summary>
                          <span>Trace diff vs leader</span>
                          <strong>{card.diffLabel}</strong>
                        </summary>
                        <div
                          class="demo-collapsible-content demo-trace-diff-grid"
                        >
                          {#each card.diffRows as row (`${card.id}-diff-${row.label}`)}
                            <div class="demo-key-value-row">
                              <span>{row.label}</span>
                              <strong>{row.value}</strong>
                            </div>
                          {/each}
                        </div>
                      </details>
                    </article>
                  {/each}
                </div>
              {/if}
              {#if qualityView === "grounding"}
                <div class="demo-result-grid">
                  {#each qualityData.groundingEvaluation.cases as entry (`grounding-${entry.caseId}`)}
                    <details class="demo-result-item demo-collapsible">
                      <summary>
                        <span>{entry.label ?? entry.caseId}</span>
                        <strong>{formatGroundingEvaluationCase(entry)}</strong>
                      </summary>
                      <div class="demo-collapsible-content">
                        {#each formatGroundingEvaluationDetails(entry) as line, index (`${entry.caseId}-${index}`)}
                          <p class="demo-metadata">{line}</p>
                        {/each}
                      </div>
                    </details>
                  {/each}
                </div>
                {#if qualityData.providerGroundingComparison}
                  <div class="demo-result-grid">
                    {#each formatGroundingProviderPresentations(qualityData.providerGroundingComparison.entries) as card (`provider-grounding-${card.id}`)}
                      <article class="demo-result-item demo-score-card">
                        <h4>{card.label}</h4>
                        <p class="demo-score-headline">{card.summary}</p>
                      </article>
                    {/each}
                    <article class="demo-result-item">
                      <h4>Hardest cases</h4>
                      <div class="demo-pill-row">
                        {#each qualityData.providerGroundingComparison.difficultyLeaderboard as entry (`provider-grounding-difficulty-${entry.caseId}`)}
                          <span class="demo-pill"
                            >{formatGroundingCaseDifficultyEntry(entry)}</span
                          >
                        {/each}
                      </div>
                    </article>
                  </div>
                  <div class="demo-result-grid">
                    {#each formatGroundingProviderCasePresentations(qualityData.providerGroundingComparison.caseComparisons) as card (`provider-grounding-case-${card.caseId}`)}
                      <details class="demo-result-item demo-collapsible">
                        <summary>
                          <span>{card.label}</span>
                          <strong>{card.summary}</strong>
                        </summary>
                        <div class="demo-collapsible-content">
                          {#each card.rows as row (`${card.caseId}-${row.label}`)}
                            <div class="demo-key-value-row">
                              <span>{row.label}</span>
                              <strong>{row.value}</strong>
                            </div>
                          {/each}
                        </div>
                      </details>
                    {/each}
                  </div>
                {/if}
              {/if}
              {#if qualityView === "history"}
                <div class="demo-result-grid">
                  {#each qualityData.retrievalComparison.entries as entry (entry.retrievalId)}
                    <details class="demo-result-item demo-collapsible">
                      <summary>
                        <span>{entry.label} history</span>
                        <strong
                          >{formatEvaluationHistorySummary(
                            qualityData.retrievalHistories[entry.retrievalId],
                          )[0] ?? "No runs yet"}</strong
                        >
                      </summary>
                      <div class="demo-collapsible-content">
                        {#each formatEvaluationHistoryRows(qualityData.retrievalHistories[entry.retrievalId]) as row (`${entry.retrievalId}-${row.label}`)}
                          <div class="demo-key-value-row">
                            <span>{row.label}</span><strong>{row.value}</strong>
                          </div>
                        {/each}
                        <div class="demo-result-grid">
                          {#each formatEvaluationHistoryTracePresentations(qualityData.retrievalHistories[entry.retrievalId]) as traceCase (`${entry.retrievalId}-trace-${traceCase.caseId}`)}
                            <details class="demo-result-item demo-collapsible">
                              <summary
                                ><span>{traceCase.label}</span><strong
                                  >{traceCase.summary}</strong
                                ></summary
                              >
                              <div class="demo-collapsible-content">
                                {#each traceCase.rows as row (`${entry.retrievalId}-${traceCase.caseId}-${row.label}`)}
                                  <div class="demo-key-value-row">
                                    <span>{row.label}</span><strong
                                      >{row.value}</strong
                                    >
                                  </div>
                                {/each}
                              </div>
                            </details>
                          {/each}
                        </div>
                      </div>
                    </details>
                  {/each}
                  {#each qualityData.rerankerComparison.entries as entry (entry.rerankerId)}
                    <details class="demo-result-item demo-collapsible">
                      <summary>
                        <span>{entry.label} history</span>
                        <strong
                          >{formatEvaluationHistorySummary(
                            qualityData.rerankerHistories[entry.rerankerId],
                          )[0] ?? "No runs yet"}</strong
                        >
                      </summary>
                      <div class="demo-collapsible-content">
                        {#each formatEvaluationHistoryRows(qualityData.rerankerHistories[entry.rerankerId]) as row (`${entry.rerankerId}-${row.label}`)}
                          <div class="demo-key-value-row">
                            <span>{row.label}</span><strong>{row.value}</strong>
                          </div>
                        {/each}
                        <div class="demo-result-grid">
                          {#each formatEvaluationHistoryTracePresentations(qualityData.rerankerHistories[entry.rerankerId]) as traceCase (`${entry.rerankerId}-trace-${traceCase.caseId}`)}
                            <details class="demo-result-item demo-collapsible">
                              <summary
                                ><span>{traceCase.label}</span><strong
                                  >{traceCase.summary}</strong
                                ></summary
                              >
                              <div class="demo-collapsible-content">
                                {#each traceCase.rows as row (`${entry.rerankerId}-${traceCase.caseId}-${row.label}`)}
                                  <div class="demo-key-value-row">
                                    <span>{row.label}</span><strong
                                      >{row.value}</strong
                                    >
                                  </div>
                                {/each}
                              </div>
                            </details>
                          {/each}
                        </div>
                      </div>
                    </details>
                  {/each}
                  {#if qualityData.providerGroundingComparison}
                    {#each qualityData.providerGroundingComparison.entries as entry (`provider-grounding-history-${entry.providerKey}`)}
                      <details class="demo-result-item demo-collapsible">
                        <summary>
                          <span>{entry.label} history</span>
                          <strong
                            >{formatGroundingHistorySummary(
                              qualityData.providerGroundingHistories[
                                entry.providerKey
                              ],
                            )[0] ?? "No runs yet"}</strong
                          >
                        </summary>
                        <div class="demo-collapsible-content">
                          {#each formatGroundingHistoryDetails(qualityData.providerGroundingHistories[entry.providerKey]) as line, index (`${entry.providerKey}-${index}`)}
                            <p class="demo-metadata">{line}</p>
                          {/each}
                          <div class="demo-result-grid">
                            {#each formatGroundingHistorySnapshotPresentations(qualityData.providerGroundingHistories[entry.providerKey]) as snapshot (`${entry.providerKey}-snapshot-${snapshot.caseId}`)}
                              <details
                                class="demo-result-item demo-collapsible"
                              >
                                <summary
                                  ><span>{snapshot.label}</span><strong
                                    >{snapshot.summary}</strong
                                  ></summary
                                >
                                <div class="demo-collapsible-content">
                                  {#each snapshot.rows as row (`${entry.providerKey}-${snapshot.caseId}-${row.label}`)}
                                    <div class="demo-key-value-row">
                                      <span>{row.label}</span><strong
                                        >{row.value}</strong
                                      >
                                    </div>
                                  {/each}
                                </div>
                              </details>
                            {/each}
                          </div>
                        </div>
                      </details>
                    {/each}
                    <details class="demo-result-item demo-collapsible">
                      <summary>
                        <span>Grounding difficulty history</span>
                        <strong
                          >{formatGroundingDifficultyHistorySummary(
                            qualityData.providerGroundingDifficultyHistory,
                          )[0] ?? "No history yet"}</strong
                        >
                      </summary>
                      <div class="demo-collapsible-content">
                        {#each formatGroundingDifficultyHistoryDetails(qualityData.providerGroundingDifficultyHistory) as line, index (`provider-grounding-difficulty-${index}`)}
                          <p class="demo-metadata">{line}</p>
                        {/each}
                      </div>
                    </details>
                  {/if}
                </div>
              {/if}
            {/if}
          </div>

          <div class="demo-results demo-quality-card">
            <h3>Knowledge Base Operations</h3>
            {#if $opsErrorStore}
              <p class="demo-error">{$opsErrorStore}</p>
            {/if}
            <ul class="demo-detail-list">
              {#each formatReadinessSummary($opsReadinessStore) as line}
                <li>{line}</li>
              {/each}
            </ul>
            <ul class="demo-detail-list">
              {#each formatHealthSummary($opsHealthStore) as line}
                <li>{line}</li>
              {/each}
            </ul>
            <ul class="demo-detail-list">
              {#each [...formatFailureSummary($opsHealthStore), ...formatInspectionSummary($opsHealthStore), ...formatInspectionSamples($opsHealthStore)] as line}
                <li>{line}</li>
              {/each}
            </ul>
            {#if buildInspectionEntries($opsHealthStore).length > 0}
              <div class="demo-inspection-actions">
                {#each buildInspectionEntries($opsHealthStore) as entry (entry.id)}
                  <div class="demo-inspection-action-row">
                    <button
                      type="button"
                      on:click={() => void focusInspectionEntry(entry)}
                      >{entry.documentId
                        ? `Inspect ${entry.kind}`
                        : "Search source"} · {entry.label}</button
                    >
                    <a
                      class="demo-inspection-link"
                      href={buildInspectionEntryHref(selectedMode, entry)}
                      >Open standalone view</a
                    >
                  </div>
                {/each}
              </div>
            {/if}
            <div class="demo-result-grid">
              <article class="demo-result-item">
                <h4>Sync Sources</h4>
                <div class="demo-actions">
                  <button on:click={syncAllSources} type="button"
                    >Sync all sources</button
                  >
                  <button on:click={queueBackgroundSync} type="button"
                    >Queue background sync</button
                  >
                </div>
                <div class="demo-badge-row">
                  {#each formatSyncDeltaChips(sortedSyncSources) as chip, index (`sync-delta-${index}`)}
                    <span class="demo-state-chip"
                      >{chip.replace(/^sync /, "")}</span
                    >
                  {/each}
                </div>
                <div class="demo-stat-grid">
                  {#each syncOverviewLines as line, index (`sync-overview-${index}`)}
                    <article class="demo-stat-card">
                      <span class="demo-stat-label">Sync overview</span>
                      <strong
                        >{line.includes(":")
                          ? line.slice(0, line.indexOf(":"))
                          : "Sync overview"}</strong
                      >
                      <p>
                        {line.includes(":")
                          ? line.slice(line.indexOf(":") + 1).trim()
                          : line}
                      </p>
                    </article>
                  {/each}
                </div>
                <ul class="demo-detail-list">
                  {#each sortedSyncSources.length > 0 ? sortedSyncSources.flatMap( (source) => [formatSyncSourceSummary(source), ...formatSyncSourceDetails(source)], ) : ["No sync sources configured yet."] as line}
                    <li>{line}</li>
                  {/each}
                </ul>
                <div class="demo-actions">
                  {#each sortedSyncSources as source}
                    <details
                      class:demo-sync-action-failed={source.status === "failed"}
                      class="demo-sync-action-details"
                      open={source.status === "failed"}
                    >
                      <summary
                        >{formatSyncSourceCollapsedSummary(source)}</summary
                      >
                      <div class="demo-sync-action-group">
                        <div class="demo-actions">
                          <button
                            on:click={() => syncSource(source.id)}
                            type="button">Sync {source.label}</button
                          >
                          <button
                            on:click={() =>
                              queueBackgroundSourceSync(source.id)}
                            type="button">Queue {source.label}</button
                          >
                          {#if source.status === "failed"}
                            <button
                              on:click={() => syncSource(source.id)}
                              type="button">Retry now</button
                            >
                            <button
                              on:click={() =>
                                queueBackgroundSourceSync(source.id)}
                              type="button">Retry in background</button
                            >
                          {/if}
                        </div>
                        <p class="demo-metadata demo-sync-action-meta">
                          {formatSyncSourceActionSummary(source)}
                        </p>
                        {#if formatSyncSourceActionBadges(source).length > 0}
                          <div class="demo-badge-row">
                            {#each formatSyncSourceActionBadges(source) as badge, index (`${source.id}-${index}`)}
                              <span class="demo-badge">{badge}</span>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </details>
                  {/each}
                </div>
              </article>
              <article class="demo-result-item">
                <h4>Admin Jobs</h4>
                <ul class="demo-detail-list">
                  {#each formatAdminJobList($opsAdminJobsStore).length > 0 ? formatAdminJobList($opsAdminJobsStore) : ["No admin jobs recorded yet."] as line}
                    <li>{line}</li>
                  {/each}
                </ul>
              </article>
              <article class="demo-result-item">
                <h4>Recent Admin Actions</h4>
                <ul class="demo-detail-list">
                  {#each formatAdminActionList($opsAdminActionsStore).length > 0 ? formatAdminActionList($opsAdminActionsStore) : ["No admin actions recorded yet."] as line}
                    <li>{line}</li>
                  {/each}
                </ul>
              </article>
            </div>
          </div>

          <div class="demo-stream-panel">
            <h3>Stream Retrieval Workflow</h3>
            <p class="demo-metadata">
              This page composes <code>createRAG()</code> for the broader demo,
              and this stream section proves the explicit workflow contract
              through <code>createRAG().workflow</code>.
            </p>
            <form
              class="demo-stream-form"
              on:submit|preventDefault={submitStreamQuery}
            >
              <label for="stream-model-key">Answer model</label>
              <select id="stream-model-key" bind:value={selectedAIModelKey}>
                {#if aiModelCatalog.models.length === 0}
                  <option value="">Configure an AI provider</option>
                {:else}
                  {#each aiModelCatalog.models as model}
                    <option value={model.key}
                      >{formatDemoAIModelLabel(model)}</option
                    >
                  {/each}
                {/if}
              </select>
              <p class="demo-metadata">
                Model switching stays on the official AbsoluteJS plugin path by
                selecting the provider and model sent with the retrieval stream
                request.
              </p>
              <label for="stream-query">Question</label>
              <input
                id="stream-query"
                bind:value={streamPrompt}
                placeholder="e.g. What should I verify after ingesting a new source?"
                type="text"
              />
              <div class="demo-actions">
                {#if !$streamBusyStore}
                  <button type="submit">Ask with retrieval stream</button>
                {:else}
                  <button on:click={workflow.cancel} type="button"
                    >Cancel</button
                  >
                {/if}
              </div>
            </form>
            <div class="demo-result-grid">
              <article class="demo-result-item">
                <h4>Workflow Contract</h4>
                <ul class="demo-detail-list">
                  <li>Explicit workflow surface: createRAG().workflow</li>
                  <li>Snapshot stage: {$streamWorkflowStateStore.stage}</li>
                  <li>Live stage field: {$streamStageStore}</li>
                  <li>
                    Snapshot sources: {$streamWorkflowStateStore.sources.length}
                  </li>
                  <li>
                    Snapshot running: {$streamWorkflowStateStore.isRunning
                      ? "yes"
                      : "no"}
                  </li>
                </ul>
              </article>
              <article class="demo-result-item">
                <h4>Workflow Proof</h4>
                <ul class="demo-detail-list">
                  <li>
                    Retrieved: {$streamWorkflowStateStore.hasRetrieved
                      ? "yes"
                      : "no"}
                  </li>
                  <li>
                    Has sources: {$streamWorkflowStateStore.hasSources
                      ? "yes"
                      : "no"}
                  </li>
                  <li>Citation count: {$streamCitationsStore.length}</li>
                  <li>
                    Grounding coverage: {$streamGroundedAnswerStore.coverage}
                  </li>
                </ul>
              </article>
            </div>
            <div class="demo-stage-row">
              {#each streamStages as stage}
                <span
                  class={[
                    "demo-stage-pill",
                    $streamStageStore === stage ? "current" : "",
                    isStreamStageComplete(stage, $streamStageStore)
                      ? "complete"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}>{stage}</span
                >
              {/each}
            </div>
            {#if $streamRetrievalStore}
              <dl class="demo-stream-stats">
                <div>
                  <dt>Retrieval started</dt>
                  <dd>
                    {$streamRetrievalStore.retrievalStartedAt
                      ? formatDate($streamRetrievalStore.retrievalStartedAt)
                      : "n/a"}
                  </dd>
                </div>
                <div>
                  <dt>Retrieval duration</dt>
                  <dd>{$streamRetrievalStore.retrievalDurationMs ?? 0}ms</dd>
                </div>
                <div>
                  <dt>Retrieved sources</dt>
                  <dd>{$streamRetrievalStore.sources.length}</dd>
                </div>
                <div>
                  <dt>Current stage</dt>
                  <dd>{$streamStageStore}</dd>
                </div>
              </dl>
            {/if}
            {#if $streamRetrievalStore?.trace}
              <div class="demo-results">
                <h4>Workflow Retrieval Trace</h4>
                <p class="demo-metadata">
                  This is the retrieval trace attached to the workflow answer
                  path. It explains how the answer workflow found evidence
                  before grounding and citations were built.
                </p>
                <div class="demo-stat-grid">
                  {#each workflowTracePresentation.stats as row}
                    <article class="demo-stat-card">
                      <p class="demo-section-caption">{row.label}</p>
                      <strong>{row.value}</strong>
                    </article>
                  {/each}
                </div>
                <div class="demo-key-value-list">
                  {#each workflowTracePresentation.details as row}
                    <p class="demo-key-value-row">
                      <strong>{row.label}</strong><span>{row.value}</span>
                    </p>
                  {/each}
                </div>
                <div class="demo-result-grid">
                  {#each workflowTracePresentation.steps as step, index}
                    <details
                      class="demo-collapsible demo-result-item"
                      open={index === 0}
                    >
                      <summary>
                        <strong>{index + 1}. {step.label}</strong>
                      </summary>
                      <div class="demo-key-value-list">
                        {#each step.rows as row}
                          <p class="demo-key-value-row">
                            <strong>{row.label}</strong>
                            <span>{row.value}</span>
                          </p>
                        {/each}
                      </div>
                    </details>
                  {/each}
                </div>
              </div>
            {/if}
            {#if $streamErrorStore}
              <p class="demo-error">{$streamErrorStore}</p>
            {/if}
            {#if $streamLatestMessageStore?.thinking}
              <div class="demo-stream-block">
                <h4>Thinking</h4>
                <p class="demo-result-text">
                  {$streamLatestMessageStore.thinking}
                </p>
              </div>
            {/if}
            {#if $streamLatestMessageStore?.content}
              <div class="demo-stream-block">
                <h4>Answer</h4>
                <p class="demo-result-text">
                  {$streamLatestMessageStore.content}
                </p>
              </div>
            {/if}
            {#if $streamLatestMessageStore?.content}
              <div class="demo-results">
                <h4>Answer Grounding</h4>
                <p
                  class={[
                    "demo-grounding-badge",
                    `demo-grounding-${$streamGroundedAnswerStore.coverage}`,
                  ].join(" ")}
                >
                  {formatGroundingCoverage($streamGroundedAnswerStore.coverage)}
                </p>
                <ul class="demo-detail-list">
                  {#each formatGroundingSummary($streamGroundedAnswerStore) as line}
                    <li>{line}</li>
                  {/each}
                </ul>
                {#if $streamGroundedAnswerStore.parts.some((part) => part.type === "citation")}
                  <div class="demo-result-grid">
                    {#each $streamGroundedAnswerStore.parts.filter((part) => part.type === "citation") as part, index}
                      <article class="demo-result-item demo-grounding-card">
                        <p class="demo-citation-badge">
                          {formatGroundingPartReferences(part.referenceNumbers)}
                        </p>
                        {#each formatGroundedAnswerPartDetails(part) as line}
                          <p class="demo-metadata">{line}</p>
                        {/each}
                        <p class="demo-result-text">
                          {formatGroundedAnswerPartExcerpt(part)}
                        </p>
                      </article>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
            {#if $streamGroundedAnswerStore.sectionSummaries.length > 0}
              <div class="demo-results">
                <h4>Grounding by Section</h4>
                <div class="demo-result-grid">
                  {#each $streamGroundedAnswerStore.sectionSummaries as summary}
                    <article class="demo-result-item demo-grounding-card">
                      <h3>{summary.label}</h3>
                      <p class="demo-result-source">{summary.summary}</p>
                      {#each formatGroundedAnswerSectionSummaryDetails(summary) as line}
                        <p class="demo-metadata">{line}</p>
                      {/each}
                      <p class="demo-result-text">
                        {formatGroundedAnswerSectionSummaryExcerpt(summary)}
                      </p>
                    </article>
                  {/each}
                </div>
              </div>
            {/if}
            {#if $streamGroundingReferencesStore.length > 0}
              <div class="demo-results">
                <h4>Grounding Reference Map</h4>
                <p class="demo-metadata">
                  Each reference resolves answer citations back to concrete
                  evidence with page, sheet, slide, archive, or thread context
                  when available.
                </p>
                <div class="demo-result-grid">
                  {#each streamGroundingReferenceGroups as group}
                    <article class="demo-result-item" id={group.targetId}>
                      <h3>{group.label}</h3>
                      <p class="demo-result-source">{group.summary}</p>
                      <div class="demo-result-grid">
                        {#each group.references as reference}
                          <article class="demo-result-item demo-grounding-card">
                            <p class="demo-citation-badge">
                              [{reference.number}] {formatGroundingReferenceLabel(
                                reference,
                              )}
                            </p>
                            <p class="demo-result-score">
                              {formatGroundingReferenceSummary(reference)}
                            </p>
                            {#each formatGroundingReferenceDetails(reference) as line}
                              <p class="demo-metadata">{line}</p>
                            {/each}
                            <p class="demo-result-text">
                              {formatGroundingReferenceExcerpt(reference)}
                            </p>
                          </article>
                        {/each}
                      </div>
                    </article>
                  {/each}
                </div>
              </div>
            {/if}
            {#if $streamSourceSummariesStore.length > 0}
              <div class="demo-results">
                <h4>Evidence Sources</h4>
                <div class="demo-result-grid">
                  {#each streamSourceSummaryGroups as group}
                    <article class="demo-result-item" id={group.targetId}>
                      <h3>{group.label}</h3>
                      <p class="demo-result-source">{group.summary}</p>
                      <div class="demo-result-grid">
                        {#each group.summaries as summary}
                          <article class="demo-result-item">
                            <h4>{summary.label}</h4>
                            {#each formatSourceSummaryDetails(summary) as line}
                              <p class="demo-metadata">{line}</p>
                            {/each}
                            <p class="demo-result-text">{summary.excerpt}</p>
                          </article>
                        {/each}
                      </div>
                    </article>
                  {/each}
                </div>
              </div>
            {/if}
            {#if $streamCitationsStore.length > 0}
              <div class="demo-results">
                <h4>Citation Trail</h4>
                <p class="demo-metadata">
                  Each citation maps a concrete retrieved chunk to a stable
                  reference number you can carry into the answer UI.
                </p>
                <div class="demo-result-grid">
                  {#each streamCitationGroups as group}
                    <article class="demo-result-item" id={group.targetId}>
                      <h3>{group.label}</h3>
                      <p class="demo-result-source">{group.summary}</p>
                      <div class="demo-result-grid">
                        {#each group.citations as citation, index}
                          <article class="demo-result-item demo-citation-card">
                            <p class="demo-citation-badge">
                              [{index + 1}] {formatCitationLabel(citation)}
                            </p>
                            <p class="demo-result-score">
                              {formatCitationSummary(citation)}
                            </p>
                            {#each formatCitationDetails(citation) as line}
                              <p class="demo-metadata">{line}</p>
                            {/each}
                            <p class="demo-result-text">
                              {formatCitationExcerpt(citation)}
                            </p>
                          </article>
                        {/each}
                      </div>
                    </article>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </article>
      </section>
    {/if}

    {#if activeSection === "ingest"}<section class="demo-grid">
        <article class="demo-card">
          <h2>Ingest Document</h2>
          <p class="demo-metadata">
            Add a document, choose its source format and chunking strategy, then
            verify how AbsoluteJS indexes it.
          </p>
          <div class="demo-results">
            <h3>Upload Extracted Fixtures</h3>
            <p class="demo-metadata">
              These buttons use <code>createRAG().ingest.ingestUploads</code> directly.
              Each fixture is fetched from the local demo corpus, sent through the
              published upload ingest route, and then verified with a retrieval query
              against the uploaded source path.
            </p>
            <p class="demo-metadata">
              Upload fixtures validate the extractor pipeline immediately. The
              managed document list below stays focused on authored example
              documents, while uploaded binaries are verified through retrieval.
            </p>
            <div class="demo-preset-grid">
              {#each demoUploadPresets as preset (preset.id)}
                <button
                  disabled={$ingestIsIngestingStore}
                  title={preset.description}
                  type="button"
                  on:click={() => void ingestDemoUpload(preset)}
                >
                  {preset.label}
                </button>
              {/each}
            </div>
            <div class="demo-upload-row">
              <input
                accept={SUPPORTED_FILE_TYPE_OPTIONS.slice(1)
                  .map((entry) => entry[0])
                  .join(",")}
                type="file"
                on:change={(event) => {
                  selectedUploadFile =
                    (event.currentTarget as HTMLInputElement).files?.[0] ??
                    null;
                }}
              />
              <button
                disabled={$ingestIsIngestingStore ||
                  selectedUploadFile === null}
                type="button"
                on:click={() => void uploadSelectedFile()}
              >
                Upload file
              </button>
            </div>
            {#if selectedUploadFile}
              <p class="demo-metadata">
                Selected file: {selectedUploadFile.name}
              </p>
            {/if}
            {#if uploadError}<p class="demo-error">{uploadError}</p>{/if}
          </div>
          <form class="demo-add-form" on:submit={submitAddDocument}>
            <label for="customId">Optional ID</label>
            <input
              id="customId"
              name="id"
              on:input={onAddInput}
              type="text"
              value={addForm.id}
            />
            <label for="customTitle">Title</label>
            <input
              id="customTitle"
              name="title"
              on:input={onAddInput}
              required
              type="text"
              value={addForm.title}
            />
            <label for="customSource">Source</label>
            <input
              id="customSource"
              name="source"
              on:input={onAddInput}
              required
              placeholder="e.g. onboarding-guide.md"
              type="text"
              value={addForm.source}
            />
            <label for="customFormat">Source format</label>
            <select
              id="customFormat"
              name="format"
              on:change={onAddInput}
              value={addForm.format}
            >
              {#each demoContentFormats as format}
                <option value={format}>{formatContentFormat(format)}</option>
              {/each}
            </select>
            <label for="customChunkStrategy">Chunking strategy</label>
            <select
              id="customChunkStrategy"
              name="chunkStrategy"
              on:change={onAddInput}
              value={addForm.chunkStrategy}
            >
              {#each demoChunkingStrategies as strategy}
                <option value={strategy}>{formatChunkStrategy(strategy)}</option
                >
              {/each}
            </select>
            <label for="customText">Text</label>
            <textarea
              id="customText"
              name="text"
              on:input={onAddInput}
              required
              rows="6">{addForm.text}</textarea
            >
            <button type="submit">Ingest document and rebuild index</button>
          </form>
          {#if addError}
            <p class="demo-error">{addError}</p>
          {/if}
        </article>

        <article class="demo-card">
          <h2>Indexed Sources</h2>
          <div class="demo-stat-grid">
            <article class="demo-stat-card">
              <span class="demo-stat-label">Indexed documents</span>
              <strong>{filteredDocuments.length}</strong>
              <p>
                {filteredDocuments.filter(
                  (document) => document.kind === "seed",
                ).length} seed · {filteredDocuments.filter(
                  (document) => document.kind === "custom",
                ).length} custom
              </p>
            </article>
          </div>
          <div class="demo-source-filter-row">
            <input
              bind:value={documentSearchTerm}
              placeholder="Search indexed sources by title, source, or text"
              type="text"
              on:input={() => {
                documentPage = 1;
              }}
            />
            <select
              bind:value={documentTypeFilter}
              on:change={() => {
                documentPage = 1;
              }}
            >
              {#each SUPPORTED_FILE_TYPE_OPTIONS as [value, label]}
                <option {value}>{label}</option>
              {/each}
            </select>
          </div>
          <div class="demo-pagination-row">
            <p class="demo-metadata">
              Showing {paginatedDocuments.length} of {filteredDocuments.length} matching
              documents
            </p>
            <div class="demo-pagination-controls">
              <button
                disabled={documentPage <= 1}
                type="button"
                on:click={() => (documentPage = Math.max(1, documentPage - 1))}
                >Prev</button
              >
              {#each Array.from({ length: totalDocumentPages }, (_, index) => index + 1) as pageNumber}
                <button
                  class={pageNumber === documentPage
                    ? "demo-page-button demo-page-button-active"
                    : "demo-page-button"}
                  type="button"
                  on:click={() => (documentPage = pageNumber)}
                >
                  {pageNumber}
                </button>
              {/each}
              <button
                disabled={documentPage >= totalDocumentPages}
                type="button"
                on:click={() =>
                  (documentPage = Math.min(
                    totalDocumentPages,
                    documentPage + 1,
                  ))}>Next</button
              >
            </div>
          </div>
          <div class="demo-document-list" id="document-list">
            {#if paginatedDocuments.length === 0}
              <p class="demo-metadata">
                No indexed sources match the current filters.
              </p>
            {:else}
              {#each paginatedDocuments as doc}
                <details class="demo-document-item demo-document-collapsible">
                  <summary>
                    <div class="demo-document-header">
                      <div>
                        <h3>{doc.title}</h3>
                        <p class="demo-metadata">
                          {doc.source} · {doc.kind} · {doc.chunkCount} chunk(s)
                        </p>
                      </div>
                      <div class="demo-badge-row">
                        <span class="demo-badge"
                          >{formatContentFormat(doc.format)}</span
                        >
                        <span class="demo-badge"
                          >{formatChunkStrategy(doc.chunkStrategy)}</span
                        >
                        <span class="demo-badge"
                          >chunk target {doc.chunkSize} chars</span
                        >
                      </div>
                    </div>
                  </summary>
                  <div class="demo-collapsible-content">
                    <div class="demo-actions">
                      <button
                        type="button"
                        on:click={() => inspectChunks(doc.id)}
                        >Inspect chunks</button
                      >
                      <button
                        type="button"
                        on:click={() =>
                          runPresetSearch(
                            `Source search for ${doc.source}`,
                            { source: doc.source },
                            `row action: source ${doc.source}`,
                          )}
                      >
                        Search source
                      </button>
                      <button
                        type="button"
                        on:click={() =>
                          runPresetSearch(
                            `Explain ${doc.title}`,
                            { documentId: doc.id },
                            `row action: document ${doc.id}`,
                          )}
                      >
                        Search document
                      </button>
                      {#if doc.kind === "custom"}
                        <button
                          type="button"
                          on:click={() => deleteDocument(doc.id)}>Delete</button
                        >
                      {/if}
                    </div>
                    <div class="demo-key-value-grid">
                      <div class="demo-key-value-row">
                        <span>Source</span><strong>{doc.source}</strong>
                      </div>
                      <div class="demo-key-value-row">
                        <span>Created</span><strong
                          >{formatDate(doc.createdAt)}</strong
                        >
                      </div>
                      <div class="demo-key-value-row">
                        <span>Kind</span><strong>{doc.kind}</strong>
                      </div>
                      <div class="demo-key-value-row">
                        <span>Chunks</span><strong>{doc.chunkCount}</strong>
                      </div>
                      {#each formatDemoMetadataSummary(doc.metadata) as line}
                        <div class="demo-key-value-row">
                          <span>Metadata</span><strong>{line}</strong>
                        </div>
                      {/each}
                    </div>
                    <p class="demo-document-preview">{doc.text}</p>
                    <div class="demo-inline-preview">
                      {#if $chunkPreviewLoadingStore && $chunkPreviewStore?.document.id !== doc.id}
                        <p class="demo-metadata">Preparing chunk preview...</p>
                      {:else if $chunkPreviewStore?.document.id === doc.id}
                        <p class="demo-section-caption">Chunk Preview</p>
                        <p class="demo-metadata">
                          {$chunkPreviewStore.document.title} · {formatContentFormat(
                            $chunkPreviewStore.document
                              .format as DemoContentFormat,
                          )} · {formatChunkStrategy(
                            $chunkPreviewStore.document
                              .chunkStrategy as DemoChunkingStrategy,
                          )} · {$chunkPreviewStore.chunks.length} chunk(s)
                        </p>
                        <article class="demo-result-item">
                          <h3>Normalized text</h3>
                          <p class="demo-result-text">
                            {$chunkPreviewStore.normalizedText}
                          </p>
                        </article>
                        {#if $chunkPreviewNavigationStore?.activeNode}
                          <div class="demo-chunk-nav">
                            <div class="demo-chunk-nav-row">
                              <button
                                disabled={!$chunkPreviewNavigationStore.previousNode}
                                on:click={() =>
                                  $chunkPreviewNavigationStore.previousNode &&
                                  rag.chunkPreview.selectChunk(
                                    $chunkPreviewNavigationStore.previousNode
                                      .chunkId,
                                  )}
                                type="button">Previous chunk</button
                              >
                              <p class="demo-metadata">
                                {formatChunkNavigationSectionLabel(
                                  $chunkPreviewNavigationStore,
                                )} · {formatChunkNavigationNodeLabel(
                                  $chunkPreviewNavigationStore.activeNode,
                                )}
                              </p>
                              <button
                                disabled={!$chunkPreviewNavigationStore.nextNode}
                                on:click={() =>
                                  $chunkPreviewNavigationStore.nextNode &&
                                  rag.chunkPreview.selectChunk(
                                    $chunkPreviewNavigationStore.nextNode
                                      .chunkId,
                                  )}
                                type="button">Next chunk</button
                              >
                            </div>
                            {#if $chunkPreviewNavigationStore.sectionNodes.length > 1}
                              <div class="demo-chunk-nav-strip">
                                {#each $chunkPreviewNavigationStore.sectionNodes as node}
                                  <button
                                    class={node.chunkId ===
                                    $activeChunkPreviewIdStore
                                      ? "demo-chunk-nav-chip demo-chunk-nav-chip-active"
                                      : "demo-chunk-nav-chip"}
                                    on:click={() =>
                                      rag.chunkPreview.selectChunk(
                                        node.chunkId,
                                      )}
                                    type="button"
                                  >
                                    {formatChunkNavigationNodeLabel(node)}
                                  </button>
                                {/each}
                              </div>
                            {/if}
                            {#if $chunkPreviewNavigationStore.parentSection || $chunkPreviewNavigationStore.siblingSections.length > 0 || $chunkPreviewNavigationStore.childSections.length > 0}
                              <div class="demo-chunk-nav-strip">
                                {#if $chunkPreviewNavigationStore.parentSection}
                                  <button
                                    class="demo-chunk-nav-chip"
                                    on:click={() =>
                                      rag.chunkPreview.selectParentSection()}
                                    type="button"
                                  >
                                    Parent · {formatChunkSectionGroupLabel(
                                      $chunkPreviewNavigationStore.parentSection,
                                    )}
                                  </button>
                                {/if}
                                {#each $chunkPreviewNavigationStore.siblingSections as section}
                                  <button
                                    class="demo-chunk-nav-chip"
                                    on:click={() =>
                                      rag.chunkPreview.selectSiblingSection(
                                        section.id,
                                      )}
                                    type="button"
                                  >
                                    Sibling · {formatChunkSectionGroupLabel(
                                      section,
                                    )}
                                  </button>
                                {/each}
                                {#each $chunkPreviewNavigationStore.childSections as section}
                                  <button
                                    class="demo-chunk-nav-chip"
                                    on:click={() =>
                                      rag.chunkPreview.selectChildSection(
                                        section.id,
                                      )}
                                    type="button"
                                  >
                                    Child · {formatChunkSectionGroupLabel(
                                      section,
                                    )}
                                  </button>
                                {/each}
                              </div>
                            {/if}
                          </div>
                        {/if}
                        {#if activeChunkPreviewSectionDiagnostic}
                          <article class="demo-result-item">
                            <h3>Active Section Diagnostic</h3>
                            <p class="demo-result-source">
                              {activeChunkPreviewSectionDiagnostic.label}
                            </p>
                            <p class="demo-metadata">
                              {activeChunkPreviewSectionDiagnostic.summary}
                            </p>
                            <p class="demo-metadata">
                              {formatSectionDiagnosticChannels(
                                activeChunkPreviewSectionDiagnostic,
                              )}
                            </p>
                            <p class="demo-metadata">
                              {formatSectionDiagnosticPipeline(
                                activeChunkPreviewSectionDiagnostic,
                              )}
                            </p>
                            {#if formatSectionDiagnosticStageFlow(activeChunkPreviewSectionDiagnostic)}<p
                                class="demo-metadata"
                              >
                                {formatSectionDiagnosticStageFlow(
                                  activeChunkPreviewSectionDiagnostic,
                                )}
                              </p>{/if}
                            {#if formatSectionDiagnosticStageBounds(activeChunkPreviewSectionDiagnostic)}<p
                                class="demo-metadata"
                              >
                                {formatSectionDiagnosticStageBounds(
                                  activeChunkPreviewSectionDiagnostic,
                                )}
                              </p>{/if}
                            {#each formatSectionDiagnosticStageWeightRows(activeChunkPreviewSectionDiagnostic) as line}
                              <p class="demo-metadata">{line}</p>
                            {/each}
                            <p class="demo-metadata">
                              {formatSectionDiagnosticTopEntry(
                                activeChunkPreviewSectionDiagnostic,
                              )}
                            </p>
                            {#if formatSectionDiagnosticCompetition(activeChunkPreviewSectionDiagnostic)}<p
                                class="demo-metadata"
                              >
                                {formatSectionDiagnosticCompetition(
                                  activeChunkPreviewSectionDiagnostic,
                                )}
                              </p>{/if}
                            {#if formatSectionDiagnosticReasons(activeChunkPreviewSectionDiagnostic).length > 0}
                              <div class="demo-badge-row">
                                {#each formatSectionDiagnosticReasons(activeChunkPreviewSectionDiagnostic) as reason}
                                  <span class="demo-state-chip">{reason}</span>
                                {/each}
                                {#each formatSectionDiagnosticStageWeightReasons(activeChunkPreviewSectionDiagnostic) as reason}
                                  <span class="demo-state-chip">{reason}</span>
                                {/each}
                              </div>
                            {/if}
                            {#each formatSectionDiagnosticDistributionRows(activeChunkPreviewSectionDiagnostic) as line}
                              <p class="demo-metadata">{line}</p>
                            {/each}
                          </article>
                        {/if}
                        <div class="demo-result-grid">
                          {#each $chunkPreviewStore.chunks as chunk}
                            <article
                              class={chunk.chunkId ===
                              $activeChunkPreviewIdStore
                                ? "demo-result-item demo-result-item-active"
                                : "demo-result-item"}
                            >
                              <h3>{chunk.chunkId}</h3>
                              <p class="demo-result-source">
                                source: {chunk.source ??
                                  $chunkPreviewStore.document.source}
                              </p>
                              <p class="demo-metadata">
                                {chunkIndexText(
                                  chunk,
                                  $chunkPreviewStore.chunks.length,
                                )}
                              </p>
                              <p class="demo-result-text">{chunk.text}</p>
                            </article>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  </div>
                </details>
              {/each}
            {/if}
          </div>
        </article>
      </section>{/if}
  </main>
</div>
