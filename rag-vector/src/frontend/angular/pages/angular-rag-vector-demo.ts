import { FormsModule } from "@angular/forms";
import { ChangeDetectorRef, Component, inject } from "@angular/core";
import { RAGClientService, RAGWorkflowService } from "@absolutejs/rag/angular";
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
} from "../../demo-backends";

const initialSearchForm: SearchFormState = {
  query: "",
  topK: 6,
  scoreThreshold: "",
  kind: "",
  source: "",
  documentId: "",
};

type DemoRagReadinessState = {
  className: string;
  detail: string;
  elapsedMs: number;
  label: string;
  status: "warming" | "ready" | "failed";
};

type AngularRAGVectorDemoProps = {
  availableBackends?: DemoBackendDescriptor[];
  mode: DemoBackendMode;
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
  imports: [FormsModule],
  providers: [RAGClientService, RAGWorkflowService],
  selector: "angular-rag-vector-demo",
  standalone: true,
  template: `
    <div class="rag-demo-page">
      <header>
        <div class="header-left">
          <a class="logo" href="/">
            <img
              src="/assets/png/absolutejs-temp.png"
              height="24"
              alt="AbsoluteJS"
            />
            AbsoluteJS
          </a>
        </div>
        <nav>
          @for (backend of backendOptions; track backend.id) {
            <div class="demo-nav-row">
              <span
                [class]="
                  backend.id === selectedMode
                    ? 'demo-nav-row-label active'
                    : 'demo-nav-row-label'
                "
                >{{ backend.label }}</span
              >
              @for (framework of demoFrameworks; track framework.id) {
                <a
                  [href]="
                    backend.available
                      ? getDemoPagePath(framework.id, backend.id)
                      : null
                  "
                  [class.active]="
                    framework.id === 'angular' && backend.id === selectedMode
                  "
                  [class.disabled]="!backend.available"
                  [attr.aria-disabled]="!backend.available"
                  [attr.title]="backend.available ? null : backend.reason"
                  >{{ framework.label }}</a
                >
              }
            </div>
          }
        </nav>
      </header>

      <main class="demo-layout">
        <section class="demo-card">
          <span class="demo-hero-kicker">Angular workflow surface</span>
          <h1>AbsoluteJS RAG Workflow Demo - Angular</h1>
          @if (ragReadiness) {
            <div [class]="'demo-rag-readiness ' + ragReadiness.className">
              <strong>{{ ragReadiness.label }}</strong
              ><span>{{ ragReadiness.detail }}</span>
            </div>
          } @else {
            <p class="demo-metadata">Loading RAG readiness...</p>
          }
          <p>
            Use one route to ingest, sync, retrieve, stream grounded answers,
            and inspect ops health against the same stuffed multi-format
            knowledge base.
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
                PDF, Office, archive, image, audio, video, EPUB, email,
                markdown, and legacy files on one page.
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
            @for (section of ragExampleSections; track section.id) {
              <button
                [class]="
                  activeSection === section.id
                    ? 'demo-section-card demo-section-card-active'
                    : 'demo-section-card'
                "
                (click)="setActiveSection(section.id)"
                type="button"
              >
                <span>{{ section.kicker }}</span>
                <strong>{{ section.title }}</strong>
                <p>{{ section.description }}</p>
                <small>{{
                  activeSection === section.id ? "Loaded" : section.loadLabel
                }}</small>
              </button>
            }
          </div>
        </section>

        @if (activeSection === "overview") {
          <section class="demo-card demo-full-lab-placeholder">
            <h2>Choose a RAG capability card</h2>
            <p class="demo-metadata">
              Angular now follows the same card-driven demo structure as React.
              Pick a lane to show that part of the RAG package example.
            </p>
          </section>
        }

        <div
          [class]="
            activeSection === 'overview'
              ? 'demo-results demo-section-hidden'
              : 'demo-results'
          "
        >
          <h3>Sync Feedback</h3>
          <p class="demo-metadata">
            Run a sync, ingest, reset, or delete action to see the latest
            mutation summary here.
          </p>
          <p class="demo-metadata">
            This panel stays on the same route as diagnostics and retrieval so
            ops feedback is always visible.
          </p>
          @if (message) {
            <p class="demo-banner">{{ message }}</p>
          }
          @if (loading) {
            <p class="demo-banner">Loading status and documents...</p>
          }
          @if (restoredSharedState) {
            <p class="demo-banner">{{ restoredSharedStateSummary }}</p>
          }
        </div>
        @if (
          status && activeSection !== "overview" && activeSection !== "ingest"
        ) {
          <section class="demo-grid">
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

              @if (status.native.fallbackReason) {
                <p class="demo-metadata">{{ status.native.fallbackReason }}</p>
              }
              <p class="demo-metadata">{{ status.reranker.summary }}</p>
              <p class="demo-metadata">
                Backend capabilities:
                <strong>{{ status.capabilities.join(" · ") }}</strong>
              </p>
              @if (ops) {
                <div class="demo-results">
                  <h3>Knowledge Base Operations</h3>
                  <ul class="demo-detail-list">
                    @for (
                      line of formatReadinessSummary(ops.readiness);
                      track line
                    ) {
                      <li>{{ line }}</li>
                    }
                  </ul>
                  <ul class="demo-detail-list">
                    @for (line of formatHealthSummary(ops.health); track line) {
                      <li>{{ line }}</li>
                    }
                  </ul>
                  <ul class="demo-detail-list">
                    @for (
                      line of [
                        ...formatFailureSummary(ops.health),
                        ...formatInspectionSummary(ops.health),
                        ...formatInspectionSamples(ops.health),
                      ];
                      track line
                    ) {
                      <li>{{ line }}</li>
                    }
                    @for (
                      entry of buildInspectionEntries(ops.health);
                      track entry.id
                    ) {
                      <li>
                        <div class="demo-inspection-action-row">
                          <button
                            type="button"
                            (click)="focusInspectionEntry(entry)"
                          >
                            {{
                              entry.documentId
                                ? "Inspect " + entry.kind
                                : "Search source"
                            }}
                            · {{ entry.label }}</button
                          ><a
                            class="demo-inspection-link"
                            [href]="
                              buildInspectionEntryHref(selectedMode, entry)
                            "
                            >Open standalone view</a
                          >
                        </div>
                      </li>
                    }
                  </ul>
                  <p
                    [class]="
                      'demo-release-card-state demo-release-card-state-' +
                      releasePanel.releaseStateBadge.tone
                    "
                  >
                    State · {{ releasePanel.releaseStateBadge.label }}
                  </p>
                  <div class="demo-result-grid">
                    <article class="demo-result-item">
                      <h4>Sync Sources</h4>
                      <div class="demo-actions">
                        <button (click)="syncAllSources()" type="button">
                          Sync all sources
                        </button>
                        <button (click)="queueBackgroundSync()" type="button">
                          Queue background sync
                        </button>
                      </div>
                      <div class="demo-badge-row">
                        @for (chip of syncDeltaChips; track chip) {
                          <span class="demo-state-chip">{{
                            chip.replace(/^sync /, "")
                          }}</span>
                        }
                      </div>
                      <div class="demo-stat-grid">
                        @for (line of syncOverviewLines; track line) {
                          <article class="demo-stat-card">
                            <span class="demo-stat-label">Sync overview</span
                            ><strong>{{
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
                        }
                      </div>
                      <ul class="demo-detail-list">
                        @for (line of syncSourceLines; track line) {
                          <li>{{ line }}</li>
                        }
                      </ul>
                      <div class="demo-actions">
                        @for (source of syncSources; track source.id) {
                          <details
                            [attr.open]="source.status === 'failed' ? '' : null"
                            [class.demo-sync-action-failed]="
                              source.status === 'failed'
                            "
                            class="demo-sync-action-details"
                          >
                            <summary>{{ source.collapsedSummary }}</summary>
                            <div class="demo-sync-action-group">
                              <div class="demo-actions">
                                <button
                                  (click)="syncSource(source.id)"
                                  type="button"
                                >
                                  Sync {{ source.label }}
                                </button>
                                <button
                                  (click)="queueBackgroundSourceSync(source.id)"
                                  type="button"
                                >
                                  Queue {{ source.label }}
                                </button>
                                @if (source.status === "failed") {
                                  <button
                                    (click)="syncSource(source.id)"
                                    type="button"
                                  >
                                    Retry now
                                  </button>
                                  <button
                                    (click)="
                                      queueBackgroundSourceSync(source.id)
                                    "
                                    type="button"
                                  >
                                    Retry in background
                                  </button>
                                }
                              </div>
                              <p class="demo-metadata demo-sync-action-meta">
                                {{ source.summary }}
                              </p>
                              @if (source.badges.length > 0) {
                                <div class="demo-badge-row">
                                  @for (badge of source.badges; track badge) {
                                    <span class="demo-badge">{{ badge }}</span>
                                  }
                                </div>
                              }
                            </div>
                          </details>
                        }
                      </div>
                    </article>
                    <article class="demo-result-item">
                      <h4>Admin Jobs</h4>
                      <ul class="demo-detail-list">
                        @for (line of adminJobLines; track line) {
                          <li>{{ line }}</li>
                        }
                      </ul>
                    </article>
                    <article class="demo-result-item">
                      <h4>Recent Admin Actions</h4>
                      <ul class="demo-detail-list">
                        @for (line of adminActionLines; track line) {
                          <li>{{ line }}</li>
                        }
                      </ul>
                    </article>
                  </div>
                </div>
              }
              <div class="demo-actions">
                <button (click)="reseed()" type="button">
                  Re-seed defaults
                </button>
                <button (click)="resetCustom()" type="button">
                  Reset custom docs
                </button>
                <button (click)="refreshData()" type="button">Refresh</button>
              </div>
            </article>

            <article class="demo-card">
              <h2>Retrieve And Verify</h2>
              <p class="demo-metadata">
                This section is powered by the AbsoluteJS Angular RAG
                primitives. Run a query, then confirm the returned chunk text
                and source label match the indexed source list below.
              </p>
              <div class="demo-preset-grid">
                <button
                  type="button"
                  (click)="
                    runPresetSearch(
                      'How do metadata filters change retrieval quality?',
                      { kind: 'seed' },
                      'preset: filter behavior',
                      'filter-behavior'
                    )
                  "
                >
                  Filter behavior
                </button>
                <button
                  type="button"
                  (click)="
                    runPresetSearch(
                      'What should I verify after ingesting a new source?',
                      {},
                      'preset: verify ingestion',
                      'verify-ingestion'
                    )
                  "
                >
                  Verify ingestion
                </button>
                <button
                  type="button"
                  (click)="
                    runPresetSearch(
                      'List support policies for shipping and returns.',
                      { source: 'guide/demo.md' },
                      'preset: source filter',
                      'source-filter'
                    )
                  "
                >
                  Source filter
                </button>
                <button
                  type="button"
                  (click)="
                    runPresetSearch(
                      'Why should metadata be stable?',
                      { source: 'guides/metadata.md' },
                      'preset: metadata discipline',
                      'metadata-discipline'
                    )
                  "
                >
                  Metadata discipline
                </button>
                <button
                  type="button"
                  (click)="
                    runPresetSearch(
                      'Which aurora launch packet phrase shows late interaction can match precise wording without splitting the parent document?',
                      {},
                      'preset: late interaction',
                      'hybrid'
                    )
                  "
                >
                  Late interaction / multivector
                </button>
                <button
                  type="button"
                  (click)="
                    runPresetSearch(
                      'Which synced site discovery guide says discovery diagnostics stay visible on the same sync surface as every other source?',
                      {
                        source: 'sync/site/demo/sync-fixtures/site/docs/guide',
                      },
                      'preset: site discovery',
                      'site-discovery'
                    )
                  "
                >
                  Site discovery (sync first)
                </button>
              </div>
              <form class="demo-search-form" (submit)="submitSearch($event)">
                <label for="query">Query</label>
                <input
                  id="query"
                  name="query"
                  [(ngModel)]="searchForm.query"
                  [ngModelOptions]="{ standalone: true }"
                  placeholder="e.g. How do metadata filters work?"
                  required
                  type="text"
                />

                <label for="topK">Top K</label>
                <input
                  id="topK"
                  max="20"
                  min="1"
                  name="topK"
                  [(ngModel)]="searchForm.topK"
                  [ngModelOptions]="{ standalone: true }"
                  type="number"
                />

                <label for="scoreThreshold">Minimum score (0-1)</label>
                <input
                  id="scoreThreshold"
                  name="scoreThreshold"
                  [(ngModel)]="searchForm.scoreThreshold"
                  [ngModelOptions]="{ standalone: true }"
                  placeholder="optional"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                />

                <label for="kind">Kind filter</label>
                <select
                  id="kind"
                  name="kind"
                  [(ngModel)]="searchForm.kind"
                  [ngModelOptions]="{ standalone: true }"
                >
                  <option value="">Any</option>
                  <option value="seed">Seed</option>
                  <option value="custom">Custom</option>
                </select>

                <label for="source">Source filter</label>
                <input
                  [class.demo-filter-active]="
                    searchForm.source.trim().length > 0
                  "
                  id="source"
                  name="source"
                  [(ngModel)]="searchForm.source"
                  (ngModelChange)="scopeDriver = 'manual filters'"
                  [ngModelOptions]="{ standalone: true }"
                  placeholder="e.g. guide/demo.md"
                  type="text"
                />

                <label for="documentId">Document ID filter</label>
                <input
                  [class.demo-filter-active]="
                    searchForm.documentId.trim().length > 0
                  "
                  id="documentId"
                  name="documentId"
                  [(ngModel)]="searchForm.documentId"
                  (ngModelChange)="scopeDriver = 'manual filters'"
                  [ngModelOptions]="{ standalone: true }"
                  placeholder="e.g. rag-demo"
                  type="text"
                />

                <button type="submit">Search index</button>
              </form>
              <div class="demo-results demo-release-card">
                <h3>Release Control</h3>
                <p class="demo-metadata">
                  This panel exercises the same AbsoluteJS release-control
                  surface that backs retrieval baselines, lane readiness,
                  incidents, and remediation execution tracking.
                </p>
                <div class="demo-release-hero">
                  <div class="demo-release-hero-copy">
                    <p class="demo-release-kicker">
                      AbsoluteJS release workflow
                    </p>
                    <p class="demo-release-banner">
                      {{ releasePanel.releaseHero }}
                    </p>
                    <p class="demo-release-summary">
                      {{ releasePanel.releaseHeroSummary }}
                    </p>
                    <p class="demo-metadata">
                      {{ releasePanel.releaseHeroMeta }}
                    </p>
                    <p class="demo-metadata">
                      {{ releasePanel.releaseScopeNote }}
                    </p>
                    <div class="demo-release-pills">
                      @for (
                        pill of releasePanel.releaseHeroPills;
                        track pill.label
                      ) {
                        @if (pill.targetCardId || pill.targetActivityId) {
                          <a
                            [class]="
                              'demo-release-pill demo-release-pill-' + pill.tone
                            "
                            [href]="
                              '#' + (pill.targetActivityId ?? pill.targetCardId)
                            "
                            (click)="
                              openReleaseDiagnosticsTarget(pill.targetCardId)
                            "
                            ><span class="demo-release-pill-label">{{
                              pill.label
                            }}</span
                            ><span class="demo-release-pill-value">{{
                              pill.value
                            }}</span></a
                          >
                        } @else {
                          <span
                            [class]="
                              'demo-release-pill demo-release-pill-' + pill.tone
                            "
                            ><span class="demo-release-pill-label">{{
                              pill.label
                            }}</span
                            ><span class="demo-release-pill-value">{{
                              pill.value
                            }}</span></span
                          >
                        }
                      }
                    </div>
                    <div class="demo-release-scenario-switcher">
                      @for (entry of demoReleaseWorkspaces; track entry.id) {
                        <span
                          [class]="
                            'demo-release-scenario-chip demo-release-workspace-chip' +
                            (releaseWorkspace === entry.id
                              ? ' demo-release-scenario-chip-active'
                              : '')
                          "
                          ><button
                            type="button"
                            [disabled]="releaseWorkspace === entry.id"
                            [title]="entry.description"
                            (click)="setReleaseWorkspace(entry.id)"
                          >
                            Workspace · {{ entry.label }}
                          </button></span
                        >
                      }
                    </div>
                    <div class="demo-release-path">
                      @for (
                        step of releasePanel.releasePathSteps;
                        track step.id
                      ) {
                        <article
                          [class]="
                            'demo-release-path-step demo-release-path-step-' +
                            step.status
                          "
                        >
                          <div class="demo-release-path-step-header">
                            <h4>{{ step.label }}</h4>
                            <span
                              [class]="
                                'demo-release-path-status demo-release-path-status-' +
                                step.status
                              "
                              >{{ step.status }}</span
                            >
                          </div>
                          <p>{{ step.summary }}</p>
                          <p class="demo-release-path-detail">
                            {{ step.detail }}
                          </p>
                          @if (step.action) {
                            <button
                              class="demo-release-path-action"
                              type="button"
                              [disabled]="
                                releaseActionBusyId === step.action.id
                              "
                              (click)="runReleaseAction(step.action)"
                            >
                              {{
                                releaseActionBusyId === step.action.id
                                  ? "Running " + step.action.label + "..."
                                  : step.action.label
                              }}
                            </button>
                          }
                        </article>
                      }
                    </div>
                  </div>
                  <div class="demo-release-action-rail">
                    <span class="demo-release-action-label">Live actions</span>
                    <div class="demo-release-action-state">
                      <span class="demo-release-action-state-badge"
                        >Scenario ·
                        {{
                          releasePanel.scenario?.label ?? "Blocked stable lane"
                        }}</span
                      ><span
                        [class]="
                          'demo-release-action-delta-badge demo-release-action-delta-badge-' +
                          releasePanel.releaseRailDeltaChip.tone
                        "
                        >{{ releasePanel.releaseRailDeltaChip.label }}</span
                      ><span
                        [class]="
                          'demo-release-action-delta-badge demo-release-action-delta-badge-' +
                          releasePanel.railIncidentPostureChip.tone
                        "
                        >Incident posture ·
                        {{ releasePanel.railIncidentPostureChip.label }}</span
                      ><span
                        [class]="
                          'demo-release-action-delta-badge demo-release-action-delta-badge-' +
                          releasePanel.railGateChip.tone
                        "
                        >Gate posture ·
                        {{ releasePanel.railGateChip.label }}</span
                      ><span
                        [class]="
                          'demo-release-action-delta-badge demo-release-action-delta-badge-' +
                          releasePanel.railApprovalChip.tone
                        "
                        >Approval posture ·
                        {{ releasePanel.railApprovalChip.label }}</span
                      ><span
                        [class]="
                          'demo-release-action-delta-badge demo-release-action-delta-badge-' +
                          releasePanel.railRemediationChip.tone
                        "
                        >Remediation posture ·
                        {{ releasePanel.railRemediationChip.label }}</span
                      >
                    </div>
                    <div class="demo-release-rail-meta">
                      @if (
                        releasePanel.releaseRailUpdateSource.targetCardId ||
                        releasePanel.releaseRailUpdateSource.targetActivityId
                      ) {
                        <a
                          [class]="
                            'demo-release-activity-lane demo-release-activity-lane-' +
                            releasePanel.releaseRailUpdateSource.tone
                          "
                          [href]="
                            '#' +
                            (releasePanel.releaseRailUpdateSource
                              .targetActivityId ??
                              releasePanel.releaseRailUpdateSource.targetCardId)
                          "
                          (click)="
                            openReleaseDiagnosticsTarget(
                              releasePanel.releaseRailUpdateSource.targetCardId
                            )
                          "
                          >{{ releasePanel.releaseRailUpdateSource.label }}</a
                        >
                      } @else {
                        <span
                          [class]="
                            'demo-release-activity-lane demo-release-activity-lane-' +
                            releasePanel.releaseRailUpdateSource.tone
                          "
                          >{{
                            releasePanel.releaseRailUpdateSource.label
                          }}</span
                        >
                      }
                      <p class="demo-release-updated">
                        {{ releasePanel.releaseRailUpdatedLabel }}
                      </p>
                    </div>
                    @if (releaseActionBusyId) {
                      <p class="demo-release-pending">
                        Pending action ·
                        {{
                          releasePanel.actions.find(
                            (entry) => entry.id === releaseActionBusyId
                          )?.label ?? releaseActionBusyId
                        }}
                      </p>
                    }
                    @if (releasePanel.latestReleaseAction) {
                      <details
                        [class]="
                          'demo-collapsible demo-release-action-latest demo-release-action-latest-' +
                          releasePanel.latestReleaseAction.tone
                        "
                      >
                        <summary>
                          Latest action ·
                          {{ releasePanel.latestReleaseAction.title }}
                        </summary>
                        @if (releasePanel.latestReleaseAction.detail) {
                          <p>{{ releasePanel.latestReleaseAction.detail }}</p>
                        }
                        <p class="demo-release-next-step">
                          {{ releasePanel.latestReleaseAction.nextStep }}
                        </p>
                      </details>
                    }
                    <details
                      [class]="
                        'demo-collapsible demo-release-rail-callout demo-release-rail-callout-' +
                        releasePanel.releaseRailCallout.tone
                      "
                    >
                      <summary>
                        {{ releasePanel.releaseRailCallout.title }}
                      </summary>
                      <p>{{ releasePanel.releaseRailCallout.message }}</p>
                      @if (releasePanel.releaseRailCallout.detail) {
                        <p>{{ releasePanel.releaseRailCallout.detail }}</p>
                      }
                      <p class="demo-release-next-step">
                        {{ releasePanel.releaseRailCallout.nextStep }}
                      </p>
                    </details>
                    @if (releasePanel.recentReleaseActivity.length) {
                      <div class="demo-release-activity-stack">
                        <span class="demo-release-action-subtitle"
                          >Recent activity</span
                        >
                        @for (
                          entry of releasePanel.recentReleaseActivity;
                          track entry.id
                        ) {
                          <a
                            [id]="entry.id"
                            [class]="
                              'demo-release-activity demo-release-activity-' +
                              entry.tone
                            "
                            [href]="'#' + entry.targetCardId"
                            (click)="
                              openReleaseDiagnosticsTarget(entry.targetCardId)
                            "
                            ><span
                              [class]="
                                'demo-release-activity-lane demo-release-activity-lane-' +
                                entry.tone
                              "
                              >{{ entry.laneLabel }}</span
                            ><strong>{{ entry.title }}</strong>
                            @if (entry.detail) {
                              · {{ entry.detail }}
                            }
                          </a>
                        }
                      </div>
                    }
                    <div class="demo-release-action-group">
                      <span class="demo-release-action-subtitle">Release</span>
                      <div class="demo-release-actions">
                        @for (
                          action of releasePanel.primaryReleaseActions;
                          track action.id
                        ) {
                          <button
                            [class]="
                              'demo-release-action demo-release-action-' +
                              (action.tone ?? 'neutral')
                            "
                            type="button"
                            [disabled]="releaseActionBusyId === action.id"
                            [title]="action.description"
                            (click)="runReleaseAction(action)"
                          >
                            {{
                              releaseActionBusyId === action.id
                                ? "Running " + action.label + "..."
                                : action.label
                            }}
                          </button>
                        }
                      </div>
                      @if (releasePanel.secondaryReleaseActions.length > 0) {
                        <details
                          class="demo-collapsible demo-release-more-actions"
                        >
                          <summary>More actions</summary>
                          <div class="demo-release-actions">
                            @for (
                              action of releasePanel.secondaryReleaseActions;
                              track action.id
                            ) {
                              <button
                                [class]="
                                  'demo-release-action demo-release-action-' +
                                  (action.tone ?? 'neutral')
                                "
                                type="button"
                                [disabled]="releaseActionBusyId === action.id"
                                [title]="action.description"
                                (click)="runReleaseAction(action)"
                              >
                                {{
                                  releaseActionBusyId === action.id
                                    ? "Running " + action.label + "..."
                                    : action.label
                                }}
                              </button>
                            }
                          </div>
                        </details>
                      }
                    </div>
                    @if (releasePanel.handoffActions.length > 0) {
                      <div class="demo-release-action-group">
                        <span class="demo-release-action-subtitle"
                          >Handoff</span
                        >
                        <div class="demo-release-actions">
                          @for (
                            action of releasePanel.handoffActions;
                            track action.id
                          ) {
                            <button
                              [class]="
                                'demo-release-action demo-release-action-' +
                                (action.tone ?? 'neutral')
                              "
                              type="button"
                              [disabled]="releaseActionBusyId === action.id"
                              [title]="action.description"
                              (click)="runReleaseAction(action)"
                            >
                              {{
                                releaseActionBusyId === action.id
                                  ? "Running " + action.label + "..."
                                  : action.label
                              }}
                            </button>
                          }
                        </div>
                      </div>
                    }
                    <div class="demo-release-action-group">
                      <span class="demo-release-action-subtitle"
                        >Evidence drills</span
                      >
                      <div class="demo-release-actions">
                        @for (
                          drill of releasePanel.releaseEvidenceDrills;
                          track drill.id
                        ) {
                          <button
                            [class]="
                              'demo-release-action demo-release-action-' +
                              (drill.active ? 'primary' : 'neutral')
                            "
                            type="button"
                            (click)="runReleaseEvidenceDrill(drill)"
                          >
                            {{ drill.label }}
                          </button>
                        }
                      </div>
                      @for (
                        drill of releasePanel.releaseEvidenceDrills;
                        track drill.id
                      ) {
                        <p class="demo-metadata">
                          <strong>{{ drill.classificationLabel }}:</strong>
                          {{ drill.summary }} Expected source ·
                          {{ drill.expectedSource }}
                        </p>
                        <p class="demo-metadata">
                          {{ drill.traceExpectation }}
                        </p>
                      }
                    </div>
                  </div>
                </div>
                <div class="demo-stat-grid">
                  <article class="demo-stat-card">
                    <span class="demo-stat-label">Stable baseline</span
                    ><strong>{{
                      releasePanel.stableBaseline?.label ?? "Not promoted"
                    }}</strong>
                    <p>
                      {{
                        releasePanel.stableBaseline
                          ? releasePanel.stableBaseline.retrievalId +
                            " · v" +
                            releasePanel.stableBaseline.version +
                            (releasePanel.stableBaseline.approvedBy
                              ? " · approved by " +
                                releasePanel.stableBaseline.approvedBy
                              : "")
                          : "No stable baseline has been promoted yet."
                      }}
                    </p>
                  </article>
                  <article class="demo-stat-card">
                    <span class="demo-stat-label">Canary baseline</span
                    ><strong>{{
                      releasePanel.canaryBaseline?.label ?? "Not promoted"
                    }}</strong>
                    <p>
                      {{
                        releasePanel.canaryBaseline
                          ? releasePanel.canaryBaseline.retrievalId +
                            " · v" +
                            releasePanel.canaryBaseline.version +
                            (releasePanel.canaryBaseline.approvedAt
                              ? " · " +
                                formatDate(
                                  releasePanel.canaryBaseline.approvedAt
                                )
                              : "")
                          : "No canary baseline has been promoted yet."
                      }}
                    </p>
                  </article>
                  <article class="demo-stat-card">
                    <span class="demo-stat-label">Stable readiness</span
                    ><strong>{{
                      releasePanel.stableReadiness?.ready ? "Ready" : "Blocked"
                    }}</strong>
                    <p>{{ releasePanel.stableReadinessStatSummary }}</p>
                  </article>
                  <article class="demo-stat-card">
                    <span class="demo-stat-label">Remediation guardrails</span
                    ><strong>{{
                      releasePanel.remediationSummary
                        ? releasePanel.remediationSummary.replayCount +
                          " replays · " +
                          releasePanel.remediationSummary
                            .guardrailBlockedCount +
                          " blocked"
                        : "No remediation executions"
                    }}</strong>
                    <p>{{ releasePanel.remediationGuardrailSummary }}</p>
                  </article>
                </div>
                <div class="demo-result-grid">
                  <article class="demo-result-item">
                    <h4>Blocker comparison</h4>
                    <p class="demo-score-headline">
                      {{
                        releasePanel.scenarioClassificationLabel
                          ? "Active blocker · " +
                            releasePanel.scenarioClassificationLabel
                          : "Compare both blocker classes"
                      }}
                    </p>
                    <div class="demo-result-grid">
                      @for (
                        card of releasePanel.releaseBlockerComparisonCards;
                        track card.id
                      ) {
                        <article class="demo-result-item">
                          <h4>
                            {{ card.label }}{{ card.active ? " · active" : "" }}
                          </h4>
                          @for (line of card.detailLines; track line) {
                            <p class="demo-metadata">{{ line }}</p>
                          }
                        </article>
                      }
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
                    @for (
                      line of releasePanel.runtimePlannerHistoryLines;
                      track line
                    ) {
                      <p class="demo-metadata">{{ line }}</p>
                    }
                  </article>
                  <article
                    id="release-benchmark-snapshots-card"
                    class="demo-result-item"
                  >
                    <h4>Adaptive planner benchmark</h4>
                    <p class="demo-score-headline">
                      {{ releasePanel.benchmarkSnapshotSummary }}
                    </p>
                    @for (
                      line of releasePanel.benchmarkSnapshotLines;
                      track line
                    ) {
                      <p class="demo-metadata">{{ line }}</p>
                    }
                  </article>
                  <article
                    id="release-active-deltas-card"
                    class="demo-result-item"
                  >
                    <h4>Active blocker deltas</h4>
                    <p class="demo-score-headline">
                      {{ releasePanel.activeBlockerDeltaSummary }}
                    </p>
                    @for (
                      line of releasePanel.activeBlockerDeltaLines;
                      track line
                    ) {
                      <p class="demo-metadata">{{ line }}</p>
                    }
                  </article>
                  <article
                    id="release-lane-readiness-card"
                    class="demo-result-item"
                  >
                    <h4>Lane readiness</h4>
                    <div class="demo-key-value-grid">
                      @for (
                        entry of releasePanel.laneReadinessEntries;
                        track entry.targetRolloutLabel
                      ) {
                        <div class="demo-key-value-row">
                          <span>{{ entry.targetRolloutLabel ?? "lane" }}</span
                          ><strong>{{
                            entry.ready ? "ready" : "blocked"
                          }}</strong>
                        </div>
                        @for (
                          reason of entry.reasons.slice(0, 2);
                          track reason
                        ) {
                          <p class="demo-metadata">{{ reason }}</p>
                        }
                      }
                    </div>
                  </article>
                  <article class="demo-result-item">
                    <h4>Lane recommendations</h4>
                    <div class="demo-insight-stack">
                      @if (releasePanel.releaseRecommendations.length > 0) {
                        @for (
                          entry of releasePanel.releaseRecommendations;
                          track entry.groupKey +
                            ":" +
                            entry.targetRolloutLabel +
                            ":" +
                            entry.recommendedAction
                        ) {
                          <p class="demo-insight-card">
                            <strong
                              >{{ entry.targetRolloutLabel ?? "lane" }} ·
                              {{
                                entry.classificationLabel ??
                                  "release recommendation"
                              }}:</strong
                            >
                            {{ entry.recommendedAction.replaceAll("_", " ")
                            }}{{
                              entry.reasons[0] ? " · " + entry.reasons[0] : ""
                            }}
                          </p>
                        }
                      } @else {
                        <p class="demo-insight-card">
                          No lane recommendations are available yet.
                        </p>
                      }
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
                    @for (
                      line of releasePanel.incidentClassificationDetailLines;
                      track line
                    ) {
                      <p class="demo-metadata">{{ line }}</p>
                    }
                    <div class="demo-insight-stack">
                      @for (
                        incident of releasePanel.recentIncidents.slice(0, 3);
                        track incident.kind + ":" + incident.triggeredAt
                      ) {
                        <p class="demo-insight-card">
                          <strong
                            >{{ incident.targetRolloutLabel ?? "lane" }} ·
                            {{ incident.kind }} ·
                            {{
                              incident.classificationLabel ??
                                "general regression"
                            }}</strong
                          ><br />{{ incident.message }}
                        </p>
                      }
                    </div>
                  </article>
                  <article
                    id="release-remediation-history-card"
                    class="demo-result-item"
                  >
                    <h4>Remediation execution history</h4>
                    @for (
                      line of releasePanel.remediationDetailLines;
                      track line
                    ) {
                      <p class="demo-metadata">{{ line }}</p>
                    }
                    <div class="demo-key-value-grid">
                      @for (
                        entry of releasePanel.recentIncidentRemediationExecutions.slice(
                          0,
                          4
                        );
                        track entry.executedAt ?? $index
                      ) {
                        <div class="demo-key-value-row">
                          <span>{{ entry.action?.kind ?? "execution" }}</span
                          ><strong
                            >{{ entry.code
                            }}{{ entry.idempotentReplay ? " · replay" : ""
                            }}{{
                              entry.blockedByGuardrail ? " · blocked" : ""
                            }}</strong
                          >
                        </div>
                      }
                    </div>
                  </article>
                </div>
                <details class="demo-collapsible demo-release-diagnostics">
                  <summary>
                    Advanced release diagnostics ·
                    {{ releasePanel.releaseDiagnosticsSummary }}
                  </summary>
                  <p class="demo-release-updated">
                    {{ releasePanel.releaseDiagnosticsUpdatedLabel }}
                  </p>
                  <p
                    [class]="
                      'demo-release-card-state demo-release-card-state-' +
                      releasePanel.releaseStateBadge.tone
                    "
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
                        @if (releasePanel.releaseCandidates.length > 0) {
                          @for (
                            candidate of releasePanel.releaseCandidates.slice(
                              0,
                              3
                            );
                            track candidate.targetRolloutLabel +
                              ":" +
                              candidate.candidateRetrievalId +
                              ":" +
                              $index
                          ) {
                            <div class="demo-key-value-row">
                              <span
                                >{{ candidate.targetRolloutLabel ?? "lane" }} ·
                                {{
                                  candidate.candidateRetrievalId ?? "candidate"
                                }}</span
                              ><strong>{{ candidate.reviewStatus }}</strong>
                            </div>
                            <p class="demo-metadata">
                              {{
                                candidate.reasons[0] ??
                                  "No release reasons recorded."
                              }}
                            </p>
                          }
                        } @else {
                          <p class="demo-metadata">
                            No promotion candidates recorded yet.
                          </p>
                        }
                      </div>
                    </article>
                    <article class="demo-result-item">
                      <h4>Release alerts</h4>
                      <div class="demo-insight-stack">
                        @if (releasePanel.releaseAlerts.length > 0) {
                          @for (
                            alert of releasePanel.releaseAlerts.slice(0, 4);
                            track alert.kind + ":" + $index
                          ) {
                            <p class="demo-insight-card">
                              <strong
                                >{{ alert.targetRolloutLabel ?? "lane" }} ·
                                {{ alert.kind }} ·
                                {{
                                  alert.classificationLabel ??
                                    "general regression"
                                }}</strong
                              ><br />{{ alert.message ?? "No alert detail" }}
                            </p>
                          }
                        } @else {
                          <p class="demo-insight-card">
                            No release alerts are active.
                          </p>
                        }
                      </div>
                    </article>
                    <article
                      id="release-policy-history-card"
                      class="demo-result-item"
                    >
                      <h4>Policy history</h4>
                      @for (
                        line of releasePanel.policyHistoryDetailLines;
                        track line
                      ) {
                        <p class="demo-metadata">{{ line }}</p>
                      }
                      <div class="demo-insight-stack">
                        @if (releasePanel.policyHistoryEntries.length > 0) {
                          @for (
                            entry of releasePanel.policyHistoryEntries;
                            track entry.id
                          ) {
                            <p class="demo-insight-card">
                              <strong>{{ entry.title }}</strong
                              ><br />{{ entry.detail }}
                            </p>
                          }
                        } @else {
                          <p class="demo-insight-card">
                            {{ releasePanel.policyHistorySummary }}
                          </p>
                        }
                      </div>
                    </article>
                    <article
                      id="release-audit-surfaces-card"
                      class="demo-result-item"
                    >
                      <h4>Audit surfaces</h4>
                      <div class="demo-insight-stack">
                        @if (releasePanel.auditSurfaceEntries.length > 0) {
                          @for (
                            entry of releasePanel.auditSurfaceEntries;
                            track entry.id
                          ) {
                            <p class="demo-insight-card">
                              <strong>{{ entry.title }}</strong
                              ><br />{{ entry.detail }}
                            </p>
                          }
                        } @else {
                          <p class="demo-insight-card">
                            {{ releasePanel.auditSurfaceSummary }}
                          </p>
                        }
                      </div>
                    </article>
                    <article
                      id="release-polling-surfaces-card"
                      class="demo-result-item"
                    >
                      <h4>Polling surfaces</h4>
                      <div class="demo-insight-stack">
                        @for (
                          entry of releasePanel.pollingSurfaceEntries;
                          track entry.id
                        ) {
                          <p class="demo-insight-card">
                            <strong>{{ entry.title }}</strong
                            ><br />{{ entry.detail }}
                          </p>
                        }
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
                        @if (releasePanel.handoffIncidents.length > 0) {
                          @for (
                            incident of releasePanel.handoffIncidents.slice(
                              0,
                              2
                            );
                            track incident.id ?? $index
                          ) {
                            <p class="demo-insight-card">
                              <strong
                                >{{ incident.status ?? "incident" }} ·
                                {{ incident.kind ?? "handoff_stale" }}</strong
                              ><br />{{
                                incident.message ?? "No handoff incident detail"
                              }}
                            </p>
                          }
                        } @else {
                          <p class="demo-insight-card">
                            No handoff incidents recorded.
                          </p>
                        }
                        @for (
                          entry of releasePanel.handoffIncidentHistory.slice(
                            0,
                            3
                          );
                          track (entry.incidentId ?? $index) +
                            ":" +
                            (entry.recordedAt ?? 0)
                        ) {
                          <p class="demo-insight-card">
                            <strong>{{ entry.action ?? "history" }}</strong
                            ><br />{{ entry.notes
                            }}{{ entry.recordedAt ? " · event recorded" : "" }}
                          </p>
                        }
                      </div>
                    </article>
                    <article
                      id="release-stable-handoff-card"
                      class="demo-result-item"
                    >
                      <h4>Stable handoff</h4>
                      <div class="demo-key-value-grid">
                        @if (releasePanel.stableHandoff) {
                          <div class="demo-key-value-row">
                            <span
                              >{{
                                releasePanel.stableHandoff.sourceRolloutLabel
                              }}
                              ->
                              {{
                                releasePanel.stableHandoff.targetRolloutLabel
                              }}</span
                            ><strong>{{
                              releasePanel.stableHandoff.readyForHandoff
                                ? "ready"
                                : "blocked"
                            }}</strong>
                          </div>
                          <p class="demo-metadata">
                            {{
                              releasePanel.stableHandoff.candidateRetrievalId
                                ? "candidate " +
                                  releasePanel.stableHandoff
                                    .candidateRetrievalId
                                : "No candidate retrieval is attached to the handoff yet."
                            }}{{
                              releasePanel.stableHandoffDecision?.kind
                                ? " · latest " +
                                  releasePanel.stableHandoffDecision.kind
                                : ""
                            }}
                          </p>
                          @for (
                            reason of releasePanel.stableHandoffDisplayReasons;
                            track reason
                          ) {
                            <p class="demo-metadata">{{ reason }}</p>
                          }
                          @if (releasePanel.stableHandoffAutoCompleteLabel) {
                            <p class="demo-metadata">
                              {{ releasePanel.stableHandoffAutoCompleteLabel }}
                            </p>
                          }
                          <div class="demo-key-value-row">
                            <span>Drift events</span
                            ><strong>{{
                              releasePanel.stableHandoffDrift?.totalCount ?? 0
                            }}</strong>
                          </div>
                        } @else {
                          <p class="demo-metadata">
                            No stable handoff posture is available yet.
                          </p>
                        }
                      </div>
                    </article>
                  </div>
                </details>
              </div>
              @if (searchError) {
                <div class="demo-error">{{ searchError }}</div>
              }
              @if (searchResults) {
                <div class="demo-results">
                  <p>
                    {{ searchResults.count }} results for “{{
                      searchResults.query
                    }}” in {{ searchResults.elapsedMs }}ms
                  </p>
                  <p class="demo-metadata">{{ retrievalScopeSummary }}</p>
                  <p class="demo-metadata">
                    Scope changed by: {{ scopeDriver }}
                  </p>
                  <p class="demo-metadata">
                    Reranking is active: AbsoluteJS reorders the first vector
                    hits with the built-in heuristic provider before these
                    results render.
                  </p>
                  <p class="demo-metadata">
                    Verification rule: a good result shows chunk text that
                    answers the query and a source label you can trace back to
                    the indexed source list.
                  </p>
                  @if (searchResults.storyHighlights.length > 0) {
                    <div class="demo-results">
                      <h3>Retrieval Story</h3>
                      @for (line of searchResults.storyHighlights; track line) {
                        <p class="demo-metadata">{{ line }}</p>
                      }
                    </div>
                  }
                  @if (searchResults.attributionOverview.length > 0) {
                    <div class="demo-results">
                      <h3>Attribution Overview</h3>
                      @for (
                        line of searchResults.attributionOverview;
                        track line
                      ) {
                        <p class="demo-metadata">{{ line }}</p>
                      }
                    </div>
                  }
                  @if (searchResults.sectionDiagnostics.length > 0) {
                    <div class="demo-results">
                      <h3>Section Diagnostics</h3>
                      <div class="demo-result-grid">
                        @for (
                          diagnostic of searchResults.sectionDiagnostics;
                          track diagnostic.key
                        ) {
                          <article class="demo-result-item">
                            <h4>{{ diagnostic.label }}</h4>
                            <p class="demo-result-source">
                              {{ diagnostic.summary }}
                            </p>
                            <p class="demo-metadata">
                              {{ formatSectionDiagnosticChannels(diagnostic) }}
                            </p>
                            <p class="demo-metadata">
                              {{
                                formatSectionDiagnosticAttributionFocus(
                                  diagnostic
                                )
                              }}
                            </p>
                            <p class="demo-metadata">
                              {{ formatSectionDiagnosticPipeline(diagnostic) }}
                            </p>
                            @if (formatSectionDiagnosticStageFlow(diagnostic)) {
                              <p class="demo-metadata">
                                {{
                                  formatSectionDiagnosticStageFlow(diagnostic)
                                }}
                              </p>
                            }
                            @if (
                              formatSectionDiagnosticStageBounds(diagnostic)
                            ) {
                              <p class="demo-metadata">
                                {{
                                  formatSectionDiagnosticStageBounds(diagnostic)
                                }}
                              </p>
                            }
                            @for (
                              line of formatSectionDiagnosticStageWeightRows(
                                diagnostic
                              );
                              track line
                            ) {
                              <p class="demo-metadata">{{ line }}</p>
                            }
                            <p class="demo-metadata">
                              {{ formatSectionDiagnosticTopEntry(diagnostic) }}
                            </p>
                            @if (
                              formatSectionDiagnosticCompetition(diagnostic)
                            ) {
                              <p class="demo-metadata">
                                {{
                                  formatSectionDiagnosticCompetition(diagnostic)
                                }}
                              </p>
                            }
                            @if (
                              formatSectionDiagnosticReasons(diagnostic)
                                .length > 0 ||
                              formatSectionDiagnosticStageWeightReasons(
                                diagnostic
                              ).length > 0
                            ) {
                              <div class="demo-badge-row">
                                @for (
                                  reason of formatSectionDiagnosticReasons(
                                    diagnostic
                                  );
                                  track reason
                                ) {
                                  <span class="demo-state-chip">{{
                                    reason
                                  }}</span>
                                }
                                @for (
                                  reason of formatSectionDiagnosticStageWeightReasons(
                                    diagnostic
                                  );
                                  track reason
                                ) {
                                  <span class="demo-state-chip">{{
                                    reason
                                  }}</span>
                                }
                              </div>
                            }
                            @for (
                              line of formatSectionDiagnosticDistributionRows(
                                diagnostic
                              );
                              track line
                            ) {
                              <p class="demo-metadata">{{ line }}</p>
                            }
                          </article>
                        }
                      </div>
                    </div>
                  }
                  <div class="demo-result-grid">
                    @for (group of searchSectionGroups; track group.id) {
                      <article class="demo-result-item" [id]="group.targetId">
                        <h3>{{ group.label }}</h3>
                        <p class="demo-result-source">{{ group.summary }}</p>
                        @if (group.jumps.length > 0) {
                          <div class="demo-badge-row">
                            @for (jump of group.jumps; track jump.id) {
                              <a
                                class="demo-state-chip"
                                [href]="'#' + jump.targetId"
                                >{{ jump.label }}</a
                              >
                            }
                          </div>
                        }
                        <div class="demo-result-grid">
                          @for (chunk of group.chunks; track chunk.chunkId) {
                            <article
                              class="demo-result-item"
                              [id]="chunk.targetId"
                            >
                              <h4>{{ chunk.title }}</h4>
                              <p class="demo-result-score">
                                score: {{ formatScore(chunk.score) }}
                              </p>
                              <p class="demo-result-source">
                                source: {{ chunk.source }}
                              </p>
                              @if (chunk.labels?.contextLabel) {
                                <p class="demo-metadata">
                                  {{ chunk.labels?.contextLabel }}
                                </p>
                              }
                              @if (chunk.labels?.locatorLabel) {
                                <p class="demo-metadata">
                                  {{ chunk.labels?.locatorLabel }}
                                </p>
                              }
                              @if (chunk.labels?.provenanceLabel) {
                                <p class="demo-metadata">
                                  {{ chunk.labels?.provenanceLabel }}
                                </p>
                              }
                              @for (
                                line of formatDemoMetadataSummary(
                                  chunk.metadata
                                );
                                track line
                              ) {
                                <p class="demo-metadata">{{ line }}</p>
                              }
                              <p class="demo-result-text">{{ chunk.text }}</p>
                            </article>
                          }
                        </div>
                      </article>
                    }
                  </div>
                </div>
              }

              <div class="demo-results">
                <h3>Benchmark Retrieval</h3>
                <p class="demo-metadata">
                  This section uses the Angular RAG client service to run a
                  built-in benchmark suite. Each case names the source we expect
                  retrieval to surface so you can compare expected, retrieved,
                  and missing evidence directly.
                </p>
                <div class="demo-preset-grid">
                  @for (preset of demoEvaluationPresets; track preset.id) {
                    <button
                      type="button"
                      [title]="preset.description"
                      (click)="
                        runPresetSearch(
                          preset.query,
                          { source: preset.expectedSources[0] },
                          'benchmark preset: ' + preset.label,
                          preset.id
                        )
                      "
                    >
                      {{ preset.label }}
                    </button>
                  }
                </div>
                <div class="demo-actions">
                  <button
                    type="button"
                    [disabled]="evaluationRunning"
                    (click)="runEvaluation()"
                  >
                    {{
                      evaluationRunning
                        ? "Running benchmark suite..."
                        : "Run benchmark suite"
                    }}
                  </button>
                </div>
                @if (evaluationMessage) {
                  <p class="demo-metadata">{{ evaluationMessage }}</p>
                }
                @if (evaluationError) {
                  <div class="demo-error">{{ evaluationError }}</div>
                }
                @if (evaluation) {
                  <p class="demo-metadata">
                    Benchmark summary: {{ formatEvaluationSummary(evaluation) }}
                  </p>
                  <div class="demo-result-grid">
                    @for (entry of evaluation.cases; track entry.caseId) {
                      <article
                        class="demo-result-item demo-evaluation-card"
                        [class.demo-evaluation-pass]="entry.status === 'pass'"
                        [class.demo-evaluation-partial]="
                          entry.status === 'partial'
                        "
                        [class.demo-evaluation-fail]="entry.status === 'fail'"
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
                    }
                  </div>
                }
              </div>

              <div class="demo-results">
                <h3>Retrieval Quality Tooling</h3>
                <p class="demo-metadata">
                  This section now behaves like an evaluation dashboard instead
                  of a log dump. The summary cards answer who is winning, the
                  strategy tab shows why, the grounding tab keeps case
                  drill-downs collapsed until needed, and the history tab only
                  expands when you want regression detail.
                </p>
                <div class="demo-pill-row">
                  <span class="demo-pill"
                    >{{
                      savedEvaluationSuite.label ?? savedEvaluationSuite.id
                    }}
                    · {{ savedEvaluationSuite.input.cases.length }} cases</span
                  >
                </div>
                <div class="demo-actions">
                  <button
                    [disabled]="evaluationRunning"
                    (click)="runSavedSuite()"
                    type="button"
                  >
                    {{
                      evaluationRunning
                        ? "Running saved suite..."
                        : "Run saved suite"
                    }}
                  </button>
                </div>
                <div class="demo-tab-row">
                  @for (
                    view of ["overview", "strategies", "grounding", "history"];
                    track view
                  ) {
                    <button
                      [class]="
                        qualityView === view
                          ? 'demo-tab demo-tab-active'
                          : 'demo-tab'
                      "
                      (click)="qualityView = $any(view)"
                      type="button"
                    >
                      {{ view[0].toUpperCase() + view.slice(1) }}
                    </button>
                  }
                </div>
                <div class="demo-stat-grid">
                  <article class="demo-stat-card">
                    <span class="demo-stat-label">Saved suite leader</span>
                    <strong>{{
                      evaluationLeaderboard[0]?.label ?? "Run the saved suite"
                    }}</strong>
                    <p>
                      {{
                        evaluationLeaderboard[0]
                          ? formatEvaluationLeaderboardEntry(
                              evaluationLeaderboard[0]
                            )
                          : "The leaderboard will rank repeated workflow benchmark runs."
                      }}
                    </p>
                  </article>
                  <article class="demo-stat-card">
                    <span class="demo-stat-label">Retrieval winner</span>
                    <strong>{{ getRetrievalWinner() }}</strong>
                    <p>{{ getRetrievalWinnerSummary() }}</p>
                  </article>
                  <article class="demo-stat-card">
                    <span class="demo-stat-label">Reranker winner</span>
                    <strong>{{ getRerankerWinner() }}</strong>
                    <p>{{ getRerankerWinnerSummary() }}</p>
                  </article>
                  <article class="demo-stat-card">
                    <span class="demo-stat-label">Grounding winner</span>
                    <strong>{{ getGroundingWinner() }}</strong>
                    <p>{{ getGroundingWinnerSummary() }}</p>
                  </article>
                </div>
                @if (qualityData && qualityView === "overview") {
                  <div class="demo-result-grid">
                    <article class="demo-result-item">
                      <h4>Winners at a glance</h4>
                      <div class="demo-key-value-grid">
                        @for (
                          row of getQualityOverviewRows();
                          track row.label + ":" + row.value
                        ) {
                          <div class="demo-key-value-row">
                            <span>{{ row.label }}</span
                            ><strong>{{ row.value }}</strong>
                          </div>
                        }
                      </div>
                    </article>
                    <article class="demo-result-item">
                      <h4>Why this matters</h4>
                      <div class="demo-insight-stack">
                        @for (
                          insight of getQualityOverviewInsights();
                          track insight
                        ) {
                          <p class="demo-insight-card">{{ insight }}</p>
                        }
                      </div>
                    </article>
                  </div>
                }
                @if (qualityData && qualityView === "strategies") {
                  <div class="demo-result-grid">
                    @for (
                      card of formatRetrievalComparisonPresentations(
                        qualityData.retrievalComparison
                      );
                      track card.id
                    ) {
                      <article class="demo-result-item demo-score-card">
                        <h4>{{ card.label }}</h4>
                        <p class="demo-score-headline">{{ card.summary }}</p>
                        <div
                          class="demo-key-value-grid demo-trace-summary-grid"
                        >
                          @for (row of card.traceSummaryRows; track row.label) {
                            <div class="demo-key-value-row">
                              <span>{{ row.label }}</span
                              ><strong>{{ row.value }}</strong>
                            </div>
                          }
                        </div>
                        <details class="demo-collapsible demo-trace-diff">
                          <summary>
                            <span>Trace diff vs leader</span
                            ><strong>{{ card.diffLabel }}</strong>
                          </summary>
                          <div
                            class="demo-collapsible-content demo-trace-diff-grid"
                          >
                            @for (row of card.diffRows; track row.label) {
                              <div class="demo-key-value-row">
                                <span>{{ row.label }}</span
                                ><strong>{{ row.value }}</strong>
                              </div>
                            }
                          </div>
                        </details>
                      </article>
                    }
                  </div>
                  <div class="demo-result-grid">
                    @for (
                      card of formatRerankerComparisonPresentations(
                        qualityData.rerankerComparison
                      );
                      track card.id
                    ) {
                      <article class="demo-result-item demo-score-card">
                        <h4>{{ card.label }}</h4>
                        <p class="demo-score-headline">{{ card.summary }}</p>
                        <div
                          class="demo-key-value-grid demo-trace-summary-grid"
                        >
                          @for (row of card.traceSummaryRows; track row.label) {
                            <div class="demo-key-value-row">
                              <span>{{ row.label }}</span
                              ><strong>{{ row.value }}</strong>
                            </div>
                          }
                        </div>
                        <details class="demo-collapsible demo-trace-diff">
                          <summary>
                            <span>Trace diff vs leader</span
                            ><strong>{{ card.diffLabel }}</strong>
                          </summary>
                          <div
                            class="demo-collapsible-content demo-trace-diff-grid"
                          >
                            @for (row of card.diffRows; track row.label) {
                              <div class="demo-key-value-row">
                                <span>{{ row.label }}</span
                                ><strong>{{ row.value }}</strong>
                              </div>
                            }
                          </div>
                        </details>
                      </article>
                    }
                  </div>
                }
                @if (qualityData && qualityView === "grounding") {
                  <div class="demo-result-grid">
                    @for (
                      entry of qualityData.groundingEvaluation.cases;
                      track entry.caseId
                    ) {
                      <details class="demo-result-item demo-collapsible">
                        <summary>
                          <span>{{ entry.label ?? entry.caseId }}</span
                          ><strong>{{
                            formatGroundingEvaluationCase(entry)
                          }}</strong>
                        </summary>
                        <div class="demo-collapsible-content">
                          @for (
                            line of formatGroundingEvaluationDetails(entry);
                            track line
                          ) {
                            <p class="demo-metadata">{{ line }}</p>
                          }
                        </div>
                      </details>
                    }
                  </div>
                  @if (qualityData.providerGroundingComparison) {
                    <div class="demo-result-grid">
                      @for (
                        card of formatGroundingProviderPresentations(
                          qualityData.providerGroundingComparison.entries
                        );
                        track card.id
                      ) {
                        <article class="demo-result-item demo-score-card">
                          <h4>{{ card.label }}</h4>
                          <p class="demo-score-headline">{{ card.summary }}</p>
                        </article>
                      }
                      <article class="demo-result-item">
                        <h4>Hardest cases</h4>
                        <div class="demo-pill-row">
                          @for (
                            line of getGroundingDifficultyLines(
                              qualityData.providerGroundingComparison
                                .difficultyLeaderboard
                            );
                            track line
                          ) {
                            <span class="demo-pill">{{ line }}</span>
                          }
                        </div>
                      </article>
                    </div>
                    <div class="demo-result-grid">
                      @for (
                        card of formatGroundingProviderCasePresentations(
                          qualityData.providerGroundingComparison
                            .caseComparisons
                        );
                        track card.caseId
                      ) {
                        <details class="demo-result-item demo-collapsible">
                          <summary>
                            <span>{{ card.label }}</span
                            ><strong>{{ card.summary }}</strong>
                          </summary>
                          <div class="demo-collapsible-content">
                            @for (row of card.rows; track row.label) {
                              <div class="demo-key-value-row">
                                <span>{{ row.label }}</span
                                ><strong>{{ row.value }}</strong>
                              </div>
                            }
                          </div>
                        </details>
                      }
                    </div>
                  }
                }
                @if (qualityData && qualityView === "history") {
                  <div class="demo-result-grid">
                    @for (
                      entry of qualityData.retrievalComparison.entries;
                      track entry.retrievalId
                    ) {
                      <details class="demo-result-item demo-collapsible">
                        <summary>
                          <span>{{ entry.label }} history</span
                          ><strong>{{
                            getBenchmarkHistoryLines(
                              qualityData.retrievalHistories[entry.retrievalId]
                            )[0] ?? "No runs yet"
                          }}</strong>
                        </summary>
                        <div class="demo-collapsible-content">
                          @for (
                            row of getBenchmarkHistoryRows(
                              qualityData.retrievalHistories[entry.retrievalId]
                            );
                            track row.label
                          ) {
                            <div class="demo-key-value-row">
                              <span>{{ row.label }}</span
                              ><strong>{{ row.value }}</strong>
                            </div>
                          }
                          <div class="demo-result-grid">
                            @for (
                              traceCase of getBenchmarkHistoryTracePresentations(
                                qualityData.retrievalHistories[
                                  entry.retrievalId
                                ]
                              );
                              track traceCase.caseId
                            ) {
                              <details
                                class="demo-result-item demo-collapsible"
                              >
                                <summary>
                                  <span>{{ traceCase.label }}</span
                                  ><strong>{{ traceCase.summary }}</strong>
                                </summary>
                                <div class="demo-collapsible-content">
                                  @for (
                                    row of traceCase.rows;
                                    track row.label
                                  ) {
                                    <div class="demo-key-value-row">
                                      <span>{{ row.label }}</span
                                      ><strong>{{ row.value }}</strong>
                                    </div>
                                  }
                                </div>
                              </details>
                            }
                          </div>
                        </div>
                      </details>
                    }
                    @for (
                      entry of qualityData.rerankerComparison.entries;
                      track entry.rerankerId
                    ) {
                      <details class="demo-result-item demo-collapsible">
                        <summary>
                          <span>{{ entry.label }} history</span
                          ><strong>{{
                            getBenchmarkHistoryLines(
                              qualityData.rerankerHistories[entry.rerankerId]
                            )[0] ?? "No runs yet"
                          }}</strong>
                        </summary>
                        <div class="demo-collapsible-content">
                          @for (
                            row of getBenchmarkHistoryRows(
                              qualityData.rerankerHistories[entry.rerankerId]
                            );
                            track row.label
                          ) {
                            <div class="demo-key-value-row">
                              <span>{{ row.label }}</span
                              ><strong>{{ row.value }}</strong>
                            </div>
                          }
                          <div class="demo-result-grid">
                            @for (
                              traceCase of getBenchmarkHistoryTracePresentations(
                                qualityData.rerankerHistories[entry.rerankerId]
                              );
                              track traceCase.caseId
                            ) {
                              <details
                                class="demo-result-item demo-collapsible"
                              >
                                <summary>
                                  <span>{{ traceCase.label }}</span
                                  ><strong>{{ traceCase.summary }}</strong>
                                </summary>
                                <div class="demo-collapsible-content">
                                  @for (
                                    row of traceCase.rows;
                                    track row.label
                                  ) {
                                    <div class="demo-key-value-row">
                                      <span>{{ row.label }}</span
                                      ><strong>{{ row.value }}</strong>
                                    </div>
                                  }
                                </div>
                              </details>
                            }
                          </div>
                        </div>
                      </details>
                    }
                    @if (qualityData.providerGroundingComparison) {
                      @for (
                        entry of qualityData.providerGroundingComparison
                          .entries;
                        track entry.providerKey
                      ) {
                        <details class="demo-result-item demo-collapsible">
                          <summary>
                            <span>{{ entry.label }} history</span
                            ><strong>{{
                              getGroundingHistoryLines(
                                qualityData.providerGroundingHistories[
                                  entry.providerKey
                                ]
                              )[0] ?? "No runs yet"
                            }}</strong>
                          </summary>
                          <div class="demo-collapsible-content">
                            @for (
                              line of getGroundingHistoryLines(
                                qualityData.providerGroundingHistories[
                                  entry.providerKey
                                ]
                              ).slice(1);
                              track line
                            ) {
                              <p class="demo-metadata">{{ line }}</p>
                            }
                            @if (
                              getGroundingHistorySnapshotPresentations(
                                qualityData.providerGroundingHistories[
                                  entry.providerKey
                                ]
                              ).length
                            ) {
                              <div class="demo-result-grid">
                                @for (
                                  snapshot of getGroundingHistorySnapshotPresentations(
                                    qualityData.providerGroundingHistories[
                                      entry.providerKey
                                    ]
                                  );
                                  track snapshot.caseId
                                ) {
                                  <details
                                    class="demo-result-item demo-collapsible"
                                  >
                                    <summary>
                                      <span>{{ snapshot.label }}</span
                                      ><strong>{{ snapshot.summary }}</strong>
                                    </summary>
                                    <div class="demo-collapsible-content">
                                      @for (
                                        row of snapshot.rows;
                                        track row.label + row.value
                                      ) {
                                        <p class="demo-key-value-row">
                                          <strong>{{ row.label }}</strong
                                          ><span>{{ row.value }}</span>
                                        </p>
                                      }
                                    </div>
                                  </details>
                                }
                              </div>
                            }
                          </div>
                        </details>
                      }
                      <details class="demo-result-item demo-collapsible">
                        <summary>
                          <span>Grounding difficulty history</span
                          ><strong>{{
                            getGroundingDifficultyHistoryLines(
                              qualityData.providerGroundingDifficultyHistory
                            )[0] ?? "No history yet"
                          }}</strong>
                        </summary>
                        <div class="demo-collapsible-content">
                          @for (
                            line of getGroundingDifficultyHistoryLines(
                              qualityData.providerGroundingDifficultyHistory
                            ).slice(1);
                            track line
                          ) {
                            <p class="demo-metadata">{{ line }}</p>
                          }
                        </div>
                      </details>
                    }
                  </div>
                }
              </div>

              <div class="demo-results demo-quality-card">
                <h3>Active Retrieval Scope</h3>
                <div class="demo-badge-row">
                  <span class="demo-state-chip">{{
                    retrievalScopeSummary
                  }}</span>
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
                    [disabled]="
                      searchForm.query.trim().length === 0 &&
                      searchForm.source.trim().length === 0 &&
                      searchForm.documentId.trim().length === 0 &&
                      searchForm.kind.length === 0
                    "
                    (click)="clearRetrievalScope()"
                    type="button"
                  >
                    Clear scope
                  </button>
                  <button
                    [disabled]="searchForm.query.trim().length === 0"
                    (click)="rerunLastQuery()"
                    type="button"
                  >
                    Rerun query
                  </button>
                  <button (click)="clearAllRetrievalState()" type="button">
                    Clear search
                  </button>
                </div>
                @if (recentQueries.length > 0) {
                  <p class="demo-section-caption">Recent Searches</p>
                  <div class="demo-badge-row">
                    @for (
                      entry of recentQueries;
                      track entry.label +
                        entry.state.source +
                        entry.state.documentId +
                        entry.state.kind
                    ) {
                      <button
                        class="demo-state-chip"
                        (click)="rerunRecentQuery(entry.state)"
                        type="button"
                      >
                        {{ entry.label }}
                      </button>
                    }
                  </div>
                }
              </div>

              <div class="demo-stream-panel">
                <h3>Stream Retrieval Workflow</h3>
                <p class="demo-metadata">
                  This page uses <code>RAGClientService</code> for the broader
                  demo, and this stream section proves the canonical
                  <code>RAGWorkflowService</code> contract directly.
                </p>
                <form
                  class="demo-stream-form"
                  (submit)="submitStreamQuery($event)"
                >
                  <label for="streamModelKey">Answer model</label>
                  <select
                    id="streamModelKey"
                    name="streamModelKey"
                    [(ngModel)]="selectedAIModelKey"
                    [ngModelOptions]="{ standalone: true }"
                  >
                    @if (aiModelCatalog.models.length === 0) {
                      <option value="">Configure an AI provider</option>
                    }
                    @for (model of aiModelCatalog.models; track model.key) {
                      <option [value]="model.key">
                        {{ formatDemoAIModelLabel(model) }}
                      </option>
                    }
                  </select>
                  <p class="demo-metadata">
                    Model switching stays on the official AbsoluteJS plugin path
                    by selecting the provider and model sent with the retrieval
                    stream request.
                  </p>
                  <label for="streamQuery">Question</label>
                  <input
                    id="streamQuery"
                    name="streamQuery"
                    [(ngModel)]="streamPrompt"
                    [ngModelOptions]="{ standalone: true }"
                    placeholder="e.g. What should I verify after ingesting a new source?"
                    type="text"
                  />
                  <div class="demo-actions">
                    @if (!isStreamBusy()) {
                      <button type="submit">Ask with retrieval stream</button>
                    }
                    @if (isStreamBusy()) {
                      <button type="button" (click)="transport.cancel()">
                        Cancel
                      </button>
                    }
                  </div>
                </form>
                <div class="demo-result-grid">
                  <article class="demo-result-item">
                    <h4>Workflow Contract</h4>
                    <ul class="demo-detail-list">
                      <li>Canonical entry point: RAGWorkflowService</li>
                      <li>Connected page surface: transport</li>
                      <li>Snapshot stage: {{ transport.state().stage }}</li>
                      <li>
                        Live stage field: {{ transport.workflow().stage }}
                      </li>
                      <li>
                        Snapshot sources: {{ transport.state().sources.length }}
                      </li>
                      <li>
                        Snapshot running:
                        {{ transport.state().isRunning ? "yes" : "no" }}
                      </li>
                    </ul>
                  </article>
                  <article class="demo-result-item">
                    <h4>Workflow Proof</h4>
                    <ul class="demo-detail-list">
                      <li>
                        Retrieved:
                        {{ transport.state().hasRetrieved ? "yes" : "no" }}
                      </li>
                      <li>
                        Has sources:
                        {{ transport.state().hasSources ? "yes" : "no" }}
                      </li>
                      <li>
                        Citation count:
                        {{ transport.workflow().citations.length }}
                      </li>
                      <li>
                        Grounding coverage:
                        {{ transport.workflow().groundedAnswer.coverage }}
                      </li>
                    </ul>
                  </article>
                </div>
                <div class="demo-stage-row">
                  @for (stage of streamStages; track stage) {
                    <span
                      class="{{
                        transport.workflow().stage === stage
                          ? 'demo-stage-pill current'
                          : 'demo-stage-pill'
                      }} {{
                        isStreamStageComplete(stage, transport.workflow().stage)
                          ? 'complete'
                          : ''
                      }}"
                      >{{ stage }}</span
                    >
                  }
                </div>
                @if (transport.workflow().retrieval) {
                  <dl class="demo-stream-stats">
                    <div>
                      <dt>Retrieval started</dt>
                      <dd>
                        {{
                          transport.workflow().retrieval?.retrievalStartedAt
                            ? formatDate(
                                transport.workflow().retrieval
                                  ?.retrievalStartedAt ?? 0
                              )
                            : "n/a"
                        }}
                      </dd>
                    </div>
                    <div>
                      <dt>Retrieval duration</dt>
                      <dd>
                        {{
                          transport.workflow().retrieval?.retrievalDurationMs ??
                            0
                        }}ms
                      </dd>
                    </div>
                    <div>
                      <dt>Retrieved sources</dt>
                      <dd>
                        {{
                          transport.workflow().retrieval?.sources?.length ?? 0
                        }}
                      </dd>
                    </div>
                    <div>
                      <dt>Current stage</dt>
                      <dd>{{ transport.workflow().stage }}</dd>
                    </div>
                  </dl>
                }
                @if (transport.workflow().retrieval?.trace) {
                  <div class="demo-results">
                    <h4>Workflow Retrieval Trace</h4>
                    <p class="demo-metadata">
                      This is the retrieval trace attached to the workflow
                      answer path. It explains how the answer workflow found
                      evidence before grounding and citations were built.
                    </p>
                    <div class="demo-stat-grid">
                      @for (
                        row of getWorkflowTracePresentation().stats;
                        track row.label
                      ) {
                        <article class="demo-stat-card">
                          <p class="demo-section-caption">{{ row.label }}</p>
                          <strong>{{ row.value }}</strong>
                        </article>
                      }
                    </div>
                    <div class="demo-key-value-list">
                      @for (
                        row of getWorkflowTracePresentation().details;
                        track row.label
                      ) {
                        <p class="demo-key-value-row">
                          <strong>{{ row.label }}</strong
                          ><span>{{ row.value }}</span>
                        </p>
                      }
                    </div>
                    <div class="demo-result-grid">
                      @for (
                        step of getWorkflowTracePresentation().steps;
                        track $index
                      ) {
                        <details
                          class="demo-collapsible demo-result-item"
                          [attr.open]="$index === 0 ? '' : null"
                        >
                          <summary>
                            <strong>{{ $index + 1 }}. {{ step.label }}</strong>
                          </summary>
                          <div class="demo-key-value-list">
                            @for (row of step.rows; track row.label) {
                              <p class="demo-key-value-row">
                                <strong>{{ row.label }}</strong>
                                <span>{{ row.value }}</span>
                              </p>
                            }
                          </div>
                        </details>
                      }
                    </div>
                  </div>
                }
                @if (transport.workflow().error) {
                  <div class="demo-error">{{ transport.workflow().error }}</div>
                }
                @if (transport.workflow().latestAssistantMessage?.thinking) {
                  <div class="demo-stream-block">
                    <h4>Thinking</h4>
                    <p class="demo-result-text">
                      {{
                        transport.workflow().latestAssistantMessage?.thinking
                      }}
                    </p>
                  </div>
                }
                @if (transport.workflow().latestAssistantMessage?.content) {
                  <div class="demo-stream-block">
                    <h4>Answer</h4>
                    <p class="demo-result-text">
                      {{ transport.workflow().latestAssistantMessage?.content }}
                    </p>
                  </div>
                }
                @if (transport.workflow().latestAssistantMessage?.content) {
                  <div class="demo-results">
                    <h4>Answer Grounding</h4>
                    <p
                      [class]="
                        'demo-grounding-badge demo-grounding-' +
                        transport.workflow().groundedAnswer.coverage
                      "
                    >
                      {{
                        formatGroundingCoverage(
                          transport.workflow().groundedAnswer.coverage
                        )
                      }}
                    </p>
                    <ul class="demo-detail-list">
                      @for (
                        line of formatGroundingSummary(
                          transport.workflow().groundedAnswer
                        );
                        track line
                      ) {
                        <li>{{ line }}</li>
                      }
                    </ul>
                    @if (
                      transport
                        .workflow()
                        .groundedAnswer.parts.some(isCitationPart)
                    ) {
                      <div class="demo-result-grid">
                        @for (
                          part of transport.workflow().groundedAnswer.parts;
                          track $index
                        ) {
                          @if (part.type === "citation") {
                            <article
                              class="demo-result-item demo-grounding-card"
                            >
                              <p class="demo-citation-badge">
                                {{
                                  formatGroundingPartReferences(
                                    part.referenceNumbers
                                  )
                                }}
                              </p>
                              @for (
                                line of formatGroundedAnswerPartDetails(part);
                                track line
                              ) {
                                <p class="demo-metadata">{{ line }}</p>
                              }
                              <p class="demo-result-text">
                                {{ formatGroundedAnswerPartExcerpt(part) }}
                              </p>
                            </article>
                          }
                        }
                      </div>
                    }
                  </div>
                }
                @if (
                  transport.workflow().groundedAnswer.sectionSummaries.length >
                  0
                ) {
                  <div class="demo-results">
                    <h4>Grounding by Section</h4>
                    <div class="demo-result-grid">
                      @for (
                        summary of transport.workflow().groundedAnswer
                          .sectionSummaries;
                        track summary.key
                      ) {
                        <article class="demo-result-item demo-grounding-card">
                          <h3>{{ summary.label }}</h3>
                          <p class="demo-result-source">
                            {{ summary.summary }}
                          </p>
                          @for (
                            line of formatGroundedAnswerSectionSummaryDetails(
                              summary
                            );
                            track line
                          ) {
                            <p class="demo-metadata">{{ line }}</p>
                          }
                          <p class="demo-result-text">
                            {{
                              summary.references[0]?.excerpt ??
                                summary.references[0]?.text ??
                                ""
                            }}
                          </p>
                        </article>
                      }
                    </div>
                  </div>
                }
                @if (transport.workflow().groundingReferences.length > 0) {
                  <div class="demo-results">
                    <h4>Grounding Reference Map</h4>
                    <p class="demo-metadata">
                      Each reference resolves answer citations back to concrete
                      evidence with page, sheet, slide, archive, or thread
                      context when available.
                    </p>
                    <div class="demo-result-grid">
                      @for (group of groundingReferenceGroups; track group.id) {
                        <article class="demo-result-item" [id]="group.targetId">
                          <h3>{{ group.label }}</h3>
                          <p class="demo-result-source">{{ group.summary }}</p>
                          <div class="demo-result-grid">
                            @for (
                              reference of group.references;
                              track reference.chunkId
                            ) {
                              <article
                                class="demo-result-item demo-grounding-card"
                              >
                                <p class="demo-citation-badge">
                                  [{{ reference.number }}]
                                  {{ formatGroundingReferenceLabel(reference) }}
                                </p>
                                <p class="demo-result-score">
                                  {{
                                    formatGroundingReferenceSummary(reference)
                                  }}
                                </p>
                                @for (
                                  line of formatGroundingReferenceDetails(
                                    reference
                                  );
                                  track line
                                ) {
                                  <p class="demo-metadata">{{ line }}</p>
                                }
                                <p class="demo-result-text">
                                  {{
                                    formatGroundingReferenceExcerpt(reference)
                                  }}
                                </p>
                              </article>
                            }
                          </div>
                        </article>
                      }
                    </div>
                  </div>
                }
                @if (transport.workflow().sourceSummaries.length > 0) {
                  <div class="demo-results">
                    <h4>Evidence Sources</h4>
                    <div class="demo-result-grid">
                      @for (group of sourceSummaryGroups; track group.id) {
                        <article class="demo-result-item" [id]="group.targetId">
                          <h3>{{ group.label }}</h3>
                          <p class="demo-result-source">{{ group.summary }}</p>
                          <div class="demo-result-grid">
                            @for (
                              summary of group.summaries;
                              track summary.key
                            ) {
                              <article class="demo-result-item">
                                <h4>{{ summary.label }}</h4>
                                @for (
                                  line of formatSourceSummaryDetails(summary);
                                  track line
                                ) {
                                  <p class="demo-metadata">{{ line }}</p>
                                }
                                <p class="demo-result-text">
                                  {{ summary.excerpt }}
                                </p>
                              </article>
                            }
                          </div>
                        </article>
                      }
                    </div>
                  </div>
                }
                @if (transport.workflow().citations.length > 0) {
                  <div class="demo-results">
                    <h4>Citation Trail</h4>
                    <p class="demo-metadata">
                      Each citation maps a concrete retrieved chunk to a stable
                      reference number you can carry into the answer UI.
                    </p>
                    <div class="demo-result-grid">
                      @for (group of citationGroups; track group.id) {
                        <article class="demo-result-item" [id]="group.targetId">
                          <h3>{{ group.label }}</h3>
                          <p class="demo-result-source">{{ group.summary }}</p>
                          <div class="demo-result-grid">
                            @for (
                              citation of group.citations;
                              track citation.chunkId;
                              let index = $index
                            ) {
                              <article
                                class="demo-result-item demo-citation-card"
                              >
                                <p class="demo-citation-badge">
                                  [{{ index + 1 }}]
                                  {{ formatCitationLabel(citation) }}
                                </p>
                                <p class="demo-result-score">
                                  {{ formatCitationSummary(citation) }}
                                </p>
                                @for (
                                  line of formatCitationDetails(citation);
                                  track line
                                ) {
                                  <p class="demo-metadata">{{ line }}</p>
                                }
                                <p class="demo-result-text">
                                  {{ formatCitationExcerpt(citation) }}
                                </p>
                              </article>
                            }
                          </div>
                        </article>
                      }
                    </div>
                  </div>
                }
              </div>
            </article>
          </section>
        }

        @if (activeSection === "ingest") {
          <section class="demo-grid">
            <article class="demo-card">
              <h2>Ingest Document</h2>
              <p class="demo-metadata">
                Add a document, choose its source format and chunking strategy,
                then verify how AbsoluteJS indexes it.
              </p>
              <div class="demo-results">
                <h3>Upload Extracted Fixtures</h3>
                <p class="demo-metadata">
                  These buttons use the AbsoluteJS Angular client ingestUploads
                  surface directly. Each fixture is fetched from the local demo
                  corpus, sent through the published upload ingest route, and
                  then verified with a retrieval query against the uploaded
                  source path.
                </p>
                <p class="demo-metadata">
                  Upload fixtures validate the extractor pipeline immediately.
                  The managed document list below stays focused on authored
                  example documents, while uploaded binaries are verified
                  through retrieval.
                </p>
                <div class="demo-preset-grid">
                  @for (preset of demoUploadPresets; track preset.id) {
                    <button
                      [disabled]="uploadRunning"
                      [attr.title]="preset.description"
                      (click)="ingestDemoUpload(preset)"
                      type="button"
                    >
                      {{ preset.label }}
                    </button>
                  }
                </div>
                <div class="demo-upload-row">
                  <input
                    [attr.accept]="
                      supportedFileTypeOptions
                        .slice(1)
                        .map((entry) => entry[0])
                        .join(',')
                    "
                    type="file"
                    (change)="onUploadFileChange($event)"
                  />
                  <button
                    [disabled]="uploadRunning || selectedUploadFile === null"
                    (click)="uploadSelectedDocumentFile()"
                    type="button"
                  >
                    Upload file
                  </button>
                </div>
                @if (selectedUploadFile) {
                  <p class="demo-metadata">
                    Selected file: {{ selectedUploadFile.name }}
                  </p>
                }
                @if (uploadError) {
                  <div class="demo-error">{{ uploadError }}</div>
                }
              </div>
              <form class="demo-add-form" (submit)="submitAddDocument($event)">
                <label for="customId">Optional ID</label>
                <input
                  id="customId"
                  name="id"
                  [(ngModel)]="addForm.id"
                  [ngModelOptions]="{ standalone: true }"
                  type="text"
                />

                <label for="customTitle">Title</label>
                <input
                  id="customTitle"
                  name="title"
                  [(ngModel)]="addForm.title"
                  [ngModelOptions]="{ standalone: true }"
                  required
                  type="text"
                />

                <label for="customSource">Source</label>
                <input
                  id="customSource"
                  name="source"
                  [(ngModel)]="addForm.source"
                  [ngModelOptions]="{ standalone: true }"
                  required
                  placeholder="e.g. onboarding-guide.md"
                  type="text"
                />

                <label for="customFormat">Source format</label>
                <select
                  id="customFormat"
                  name="format"
                  [(ngModel)]="addForm.format"
                  [ngModelOptions]="{ standalone: true }"
                >
                  @for (format of demoContentFormats; track format) {
                    <option [value]="format">
                      {{ formatContentFormat(format) }}
                    </option>
                  }
                </select>

                <label for="customChunkStrategy">Chunking strategy</label>
                <select
                  id="customChunkStrategy"
                  name="chunkStrategy"
                  [(ngModel)]="addForm.chunkStrategy"
                  [ngModelOptions]="{ standalone: true }"
                >
                  @for (strategy of demoChunkingStrategies; track strategy) {
                    <option [value]="strategy">
                      {{ formatChunkStrategy(strategy) }}
                    </option>
                  }
                </select>

                <label for="customText">Text</label>
                <textarea
                  id="customText"
                  name="text"
                  [(ngModel)]="addForm.text"
                  [ngModelOptions]="{ standalone: true }"
                  required
                  rows="6"
                ></textarea>

                <button type="submit">Ingest document and rebuild index</button>
              </form>
              @if (addError) {
                <div class="demo-error">{{ addError }}</div>
              }
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
                        (document) => document.kind === "seed"
                      ).length
                    }}
                    seed ·
                    {{
                      filteredDocuments.filter(
                        (document) => document.kind === "custom"
                      ).length
                    }}
                    custom
                  </p>
                </article>
              </div>
              <div class="demo-source-filter-row">
                <input
                  [ngModel]="documentSearchTerm"
                  (ngModelChange)="onDocumentSearchTermChange($event)"
                  [ngModelOptions]="{ standalone: true }"
                  placeholder="Search indexed sources by title, source, or text"
                  type="text"
                />
                <select
                  [ngModel]="documentTypeFilter"
                  (ngModelChange)="onDocumentTypeFilterChange($event)"
                  [ngModelOptions]="{ standalone: true }"
                >
                  @for (entry of supportedFileTypeOptions; track entry[0]) {
                    <option [value]="entry[0]">{{ entry[1] }}</option>
                  }
                </select>
              </div>
              <div class="demo-pagination-row">
                <p class="demo-metadata">
                  Showing {{ paginatedDocuments.length }} of
                  {{ filteredDocuments.length }} matching documents
                </p>
                <div class="demo-pagination-controls">
                  <button
                    [disabled]="documentPage <= 1"
                    (click)="setDocumentPage(documentPage - 1)"
                    type="button"
                  >
                    Prev
                  </button>
                  @for (pageNumber of documentPageNumbers; track pageNumber) {
                    <button
                      [class]="
                        pageNumber === documentPage
                          ? 'demo-page-button demo-page-button-active'
                          : 'demo-page-button'
                      "
                      (click)="setDocumentPage(pageNumber)"
                      type="button"
                    >
                      {{ pageNumber }}
                    </button>
                  }
                  <button
                    [disabled]="documentPage >= totalDocumentPages"
                    (click)="setDocumentPage(documentPage + 1)"
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
              <div class="demo-document-list" id="document-list">
                @if (paginatedDocuments.length === 0) {
                  <p class="demo-metadata">
                    No indexed sources match the current filters.
                  </p>
                }
                @if (paginatedDocuments.length > 0) {
                  @for (doc of paginatedDocuments; track doc.id) {
                    <details
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
                          <button type="button" (click)="inspectChunks(doc.id)">
                            Inspect chunks
                          </button>
                          <button
                            type="button"
                            (click)="
                              runPresetSearch(
                                'Source search for ' + doc.source,
                                { source: doc.source },
                                'row action: source ' + doc.source
                              )
                            "
                          >
                            Search source
                          </button>
                          <button
                            type="button"
                            (click)="
                              runPresetSearch(
                                'Explain ' + doc.title,
                                { documentId: doc.id },
                                'row action: document ' + doc.id
                              )
                            "
                          >
                            Search document
                          </button>
                          @if (doc.kind === "custom") {
                            <button
                              type="button"
                              (click)="deleteDocument(doc.id)"
                            >
                              Delete
                            </button>
                          }
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
                            <span>Chunks</span
                            ><strong>{{ doc.chunkCount }}</strong>
                          </div>
                          @for (
                            line of formatDemoMetadataSummary(doc.metadata);
                            track line
                          ) {
                            <div class="demo-key-value-row">
                              <span>Metadata</span><strong>{{ line }}</strong>
                            </div>
                          }
                        </div>
                        <p class="demo-document-preview">{{ doc.text }}</p>
                        <div class="demo-inline-preview">
                          @if (
                            chunkPreviewLoading && !isChunkPreviewFor(doc.id)
                          ) {
                            <p class="demo-metadata">
                              Preparing chunk preview...
                            </p>
                          }
                          @if (
                            !chunkPreviewLoading && isChunkPreviewFor(doc.id)
                          ) {
                            @if (chunkPreview; as preview) {
                              <p class="demo-section-caption">Chunk Preview</p>
                              <p class="demo-metadata">
                                {{ preview.document.title }} ·
                                {{
                                  formatOptionalContentFormat(
                                    preview.document.format
                                  )
                                }}
                                ·
                                {{
                                  formatOptionalChunkStrategy(
                                    preview.document.chunkStrategy
                                  )
                                }}
                                · {{ preview.chunks.length }} chunk(s)
                              </p>
                              <article class="demo-result-item">
                                <h3>Normalized text</h3>
                                <p class="demo-result-text">
                                  {{ preview.normalizedText }}
                                </p>
                              </article>
                              @if (chunkPreviewNavigation(); as navigation) {
                                @if (navigation.activeNode) {
                                  <div class="demo-chunk-nav">
                                    <div class="demo-chunk-nav-row">
                                      <button
                                        type="button"
                                        [disabled]="!navigation.previousNode"
                                        (click)="
                                          navigation.previousNode &&
                                            selectChunkPreviewChunk(
                                              navigation.previousNode.chunkId
                                            )
                                        "
                                      >
                                        Previous chunk
                                      </button>
                                      <p class="demo-metadata">
                                        {{
                                          formatChunkNavigationSectionLabel(
                                            navigation
                                          )
                                        }}
                                        ·
                                        {{
                                          formatChunkNavigationNodeLabel(
                                            navigation.activeNode
                                          )
                                        }}
                                      </p>
                                      <button
                                        type="button"
                                        [disabled]="!navigation.nextNode"
                                        (click)="
                                          navigation.nextNode &&
                                            selectChunkPreviewChunk(
                                              navigation.nextNode.chunkId
                                            )
                                        "
                                      >
                                        Next chunk
                                      </button>
                                    </div>
                                    @if (navigation.sectionNodes.length > 1) {
                                      <div class="demo-chunk-nav-strip">
                                        @for (
                                          node of navigation.sectionNodes;
                                          track node.chunkId
                                        ) {
                                          <button
                                            type="button"
                                            [class]="
                                              node.chunkId ===
                                              chunkPreviewActiveChunkId
                                                ? 'demo-chunk-nav-chip demo-chunk-nav-chip-active'
                                                : 'demo-chunk-nav-chip'
                                            "
                                            (click)="
                                              selectChunkPreviewChunk(
                                                node.chunkId
                                              )
                                            "
                                          >
                                            {{
                                              formatChunkNavigationNodeLabel(
                                                node
                                              )
                                            }}
                                          </button>
                                        }
                                      </div>
                                    }
                                    @if (
                                      navigation.parentSection ||
                                      navigation.siblingSections.length > 0 ||
                                      navigation.childSections.length > 0
                                    ) {
                                      <div class="demo-chunk-nav-strip">
                                        @if (navigation.parentSection) {
                                          <button
                                            type="button"
                                            class="demo-chunk-nav-chip"
                                            (click)="
                                              selectParentChunkPreviewSection()
                                            "
                                          >
                                            Parent ·
                                            {{
                                              formatChunkSectionGroupLabel(
                                                navigation.parentSection
                                              )
                                            }}
                                          </button>
                                        }
                                        @for (
                                          section of navigation.siblingSections;
                                          track section.id
                                        ) {
                                          <button
                                            type="button"
                                            class="demo-chunk-nav-chip"
                                            (click)="
                                              selectSiblingChunkPreviewSection(
                                                section.id
                                              )
                                            "
                                          >
                                            Sibling ·
                                            {{
                                              formatChunkSectionGroupLabel(
                                                section
                                              )
                                            }}
                                          </button>
                                        }
                                        @for (
                                          section of navigation.childSections;
                                          track section.id
                                        ) {
                                          <button
                                            type="button"
                                            class="demo-chunk-nav-chip"
                                            (click)="
                                              selectChildChunkPreviewSection(
                                                section.id
                                              )
                                            "
                                          >
                                            Child ·
                                            {{
                                              formatChunkSectionGroupLabel(
                                                section
                                              )
                                            }}
                                          </button>
                                        }
                                      </div>
                                    }
                                  </div>
                                }
                              }
                              @if (
                                activeChunkPreviewSectionDiagnostic();
                                as diagnostic
                              ) {
                                <article class="demo-result-item">
                                  <h3>Active Section Diagnostic</h3>
                                  <p class="demo-result-source">
                                    {{ diagnostic.label }}
                                  </p>
                                  <p class="demo-metadata">
                                    {{ diagnostic.summary }}
                                  </p>
                                  <p class="demo-metadata">
                                    {{
                                      formatSectionDiagnosticChannels(
                                        diagnostic
                                      )
                                    }}
                                  </p>
                                  <p class="demo-metadata">
                                    {{
                                      formatSectionDiagnosticPipeline(
                                        diagnostic
                                      )
                                    }}
                                  </p>
                                  @if (
                                    formatSectionDiagnosticStageFlow(diagnostic)
                                  ) {
                                    <p class="demo-metadata">
                                      {{
                                        formatSectionDiagnosticStageFlow(
                                          diagnostic
                                        )
                                      }}
                                    </p>
                                  }
                                  @if (
                                    formatSectionDiagnosticStageBounds(
                                      diagnostic
                                    )
                                  ) {
                                    <p class="demo-metadata">
                                      {{
                                        formatSectionDiagnosticStageBounds(
                                          diagnostic
                                        )
                                      }}
                                    </p>
                                  }
                                  @for (
                                    line of formatSectionDiagnosticStageWeightRows(
                                      diagnostic
                                    );
                                    track line
                                  ) {
                                    <p class="demo-metadata">{{ line }}</p>
                                  }
                                  <p class="demo-metadata">
                                    {{
                                      formatSectionDiagnosticTopEntry(
                                        diagnostic
                                      )
                                    }}
                                  </p>
                                  @if (
                                    formatSectionDiagnosticCompetition(
                                      diagnostic
                                    )
                                  ) {
                                    <p class="demo-metadata">
                                      {{
                                        formatSectionDiagnosticCompetition(
                                          diagnostic
                                        )
                                      }}
                                    </p>
                                  }
                                  @if (
                                    formatSectionDiagnosticReasons(diagnostic)
                                      .length > 0 ||
                                    formatSectionDiagnosticStageWeightReasons(
                                      diagnostic
                                    ).length > 0
                                  ) {
                                    <div class="demo-badge-row">
                                      @for (
                                        reason of formatSectionDiagnosticReasons(
                                          diagnostic
                                        );
                                        track reason
                                      ) {
                                        <span class="demo-state-chip">{{
                                          reason
                                        }}</span>
                                      }
                                      @for (
                                        reason of formatSectionDiagnosticStageWeightReasons(
                                          diagnostic
                                        );
                                        track reason
                                      ) {
                                        <span class="demo-state-chip">{{
                                          reason
                                        }}</span>
                                      }
                                    </div>
                                  }
                                  @for (
                                    line of formatSectionDiagnosticDistributionRows(
                                      diagnostic
                                    );
                                    track line
                                  ) {
                                    <p class="demo-metadata">{{ line }}</p>
                                  }
                                </article>
                              }
                              <div class="demo-result-grid">
                                @for (
                                  chunk of preview.chunks;
                                  track chunk.chunkId
                                ) {
                                  <article
                                    [class]="
                                      chunk.chunkId ===
                                      chunkPreviewActiveChunkId
                                        ? 'demo-result-item demo-result-item-active'
                                        : 'demo-result-item'
                                    "
                                  >
                                    <h3>{{ chunk.chunkId }}</h3>
                                    <p class="demo-result-source">
                                      source:
                                      {{
                                        chunk.source ?? preview.document.source
                                      }}
                                    </p>
                                    <p class="demo-metadata">
                                      {{
                                        chunkIndexText(
                                          chunk,
                                          preview.chunks.length
                                        )
                                      }}
                                    </p>
                                    <p class="demo-result-text">
                                      {{ chunk.text }}
                                    </p>
                                  </article>
                                }
                              </div>
                            }
                          }
                        </div>
                      </div>
                    </details>
                  }
                }
              </div>
            </article>
          </section>
        }
      </main>
    </div>
  `,
})
export class AngularRAGVectorDemoComponent {
  private readonly ragClient = inject(RAGClientService);
  private readonly ragWorkflowService = inject(RAGWorkflowService);
  private readonly cdr = inject(ChangeDetectorRef);

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
  getDemoPagePath = getDemoPagePath;
  backendOptions: DemoBackendDescriptor[] = getAvailableDemoBackends();
  demoContentFormats = demoContentFormats;
  demoChunkingStrategies = demoChunkingStrategies;
  selectedMode: DemoBackendMode = getInitialBackendMode();
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
          streamStages.indexOf(stage) <
            streamStages.indexOf(currentStage as (typeof streamStages)[number])
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
      retrievalComparison: this.qualityData.retrievalComparison,
      rerankerComparison: this.qualityData.rerankerComparison,
      groundingEvaluation: this.qualityData.groundingEvaluation,
      groundingProviderOverview: this.qualityData.providerGroundingComparison
        ? formatGroundingProviderOverviewPresentation(
            this.qualityData.providerGroundingComparison,
          )
        : undefined,
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
    const stableReadiness = this.releasePanel.stableReadiness;
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
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
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
        searchForm: nextState,
        scopeDriver: this.scopeDriver,
        retrievalPresetId: this.retrievalPresetId || undefined,
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...action.payload,
          workspace: this.releaseWorkspace,
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
        retrievalComparison: qualityResponse.retrievalComparison,
        rerankerComparison: qualityResponse.rerankerComparison,
        groundingEvaluation: qualityResponse.groundingEvaluation,
        groundingProviderOverview: qualityResponse.providerGroundingComparison
          ? formatGroundingProviderOverviewPresentation(
              qualityResponse.providerGroundingComparison,
            )
          : undefined,
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
      searchForm: this.searchForm,
      scopeDriver: this.scopeDriver,
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
      searchForm: this.searchForm,
      scopeDriver: this.scopeDriver,
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
      searchForm: this.searchForm,
      scopeDriver: this.scopeDriver,
      lastUpdatedAt: Date.now(),
      retrievalPresetId: this.retrievalPresetId || undefined,
      benchmarkPresetId: this.benchmarkPresetId || undefined,
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
      searchForm: this.searchForm,
      scopeDriver: this.scopeDriver,
      lastUpdatedAt: Date.now(),
      retrievalPresetId: this.retrievalPresetId || undefined,
      benchmarkPresetId: this.benchmarkPresetId || undefined,
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
              name: uploadedName,
              source: `uploads/${uploadedName}`,
              title: uploadedName,
              contentType:
                this.selectedUploadFile.type || "application/octet-stream",
              encoding: "base64",
              content: encodeArrayBufferToBase64(
                await this.selectedUploadFile.arrayBuffer(),
              ),
              metadata: {
                kind: "custom",
                uploadedFrom: "angular-general-upload",
              },
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
          id:
            this.addForm.id.trim().length > 0
              ? this.addForm.id.trim()
              : undefined,
          title: this.addForm.title.trim(),
          source: this.addForm.source.trim(),
          format: this.addForm.format,
          text: this.addForm.text.trim(),
          chunking: {
            strategy: this.addForm.chunkStrategy,
          },
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
      this.chunkPreview = response as DemoChunkPreview;
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

  private ragReadinessTimer: ReturnType<typeof setTimeout> | null = null;
  private ragReadinessRequest = 0;

  private async loadRagReadiness() {
    const requestId = ++this.ragReadinessRequest;
    if (this.ragReadinessTimer) {
      clearTimeout(this.ragReadinessTimer);
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
        this.ragReadinessTimer = setTimeout(() => {
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

  ngOnDestroy() {
    if (this.ragReadinessTimer) {
      clearTimeout(this.ragReadinessTimer);
    }
  }

  ngOnInit() {
    if (typeof window !== "undefined") {
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

export const factory = (props: AngularRAGVectorDemoProps) => {
  const component = new AngularRAGVectorDemoComponent();
  component.backendOptions = getAvailableDemoBackends(props.availableBackends);
  component.selectedMode = props.mode;
  component.connectStream();
  return component;
};
export default AngularRAGVectorDemoComponent;

function isCitationPart(part: {
  type: string;
}): part is { type: "citation"; referenceNumbers: number[]; text: string } {
  return part.type === "citation";
}
