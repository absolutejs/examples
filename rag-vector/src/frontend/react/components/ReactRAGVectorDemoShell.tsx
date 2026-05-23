import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { RAGSyncSourceRecord } from "@absolutejs/rag";
import {
  type DemoBackendMode,
  formatSyncSourceActionBadges,
  formatSyncSourceActionSummary,
  getInitialBackendMode,
  listLinkedConnectorAccounts,
  sortSyncSources,
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

type FullLabSection = Exclude<RagExampleSection, "overview" | "connectors">;

const ReactRAGVectorDemoFullLabApp = lazy(async () => {
  const module = await import("../pages/ReactRAGVectorDemoApp");

  return {
    default: module.ReactRAGVectorDemoFullLabApp,
  };
});

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
    description:
      "Query the index, inspect sources, and prove metadata filters and chunk attribution.",
    id: "retrieve",
    kicker: "1 · Retrieval",
    loadLabel: "Load retrieval",
    title: "Search And Verify",
  },
  {
    description:
      "Upload extracted fixtures or author custom documents, then verify they are searchable.",
    id: "ingest",
    kicker: "2 · Ingest",
    loadLabel: "Load ingest",
    title: "Add Documents",
  },
  {
    description:
      "Run the RAG answer workflow and inspect citations, grounding, and retrieval trace.",
    id: "workflow",
    kicker: "3 · Workflow",
    loadLabel: "Load workflow",
    title: "Grounded Streaming",
  },
  {
    description:
      "Connect Gmail, Google Contacts, and Meta grants through AbsoluteJS auth-backed bindings.",
    id: "connectors",
    kicker: "4 · Connectors",
    loadLabel: "Load connectors",
    title: "Auth-Backed Sources",
  },
  {
    description:
      "Run benchmark presets, compare retrieval quality, and inspect release-control state.",
    id: "evaluate",
    kicker: "5 · Quality",
    loadLabel: "Load quality",
    title: "Evaluation And Release",
  },
  {
    description:
      "Inspect corpus health, sync status, admin jobs, and backend readiness.",
    id: "ops",
    kicker: "6 · Operations",
    loadLabel: "Load ops",
    title: "Diagnostics And Index Health",
  },
];

const readSyncBindingOptions = (
  source: RAGSyncSourceRecord,
): SyncBindingOption[] => {
  const metadata =
    source.metadata && typeof source.metadata === "object"
      ? source.metadata
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
      ? source.metadata
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

// Thrown when /demo/sync-sources returns 401 (signed out). Connectors are
// auth-backed, so this is an expected state, not a failure to retry.
class ConnectorAuthRequiredError extends Error {}

const loadConnectorSyncSources = async (selectedMode: DemoBackendMode) => {
  const response = await fetch(`/demo/sync-sources/${selectedMode}`, {
    headers: { Accept: "application/json" },
  });
  if (response.status === 401) {
    throw new ConnectorAuthRequiredError("Sign in to use linked connectors.");
  }
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

export const ReactRAGVectorDemoShell = ({ mode }: DemoProps) => {
  const selectedMode = mode ?? getInitialBackendMode();
  const [syncSources, setSyncSources] = useState<RAGSyncSourceRecord[]>([]);
  const [syncSourcesLoading, setSyncSourcesLoading] = useState(false);
  const [syncSourcesError, setSyncSourcesError] = useState("");
  const [ragReadiness, setRagReadiness] =
    useState<DemoRagReadinessState | null>(null);
  const [message, setMessage] = useState("");
  const [syncPending, setSyncPending] = useState<SyncPendingState | null>(null);
  const [activeSection, setActiveSection] =
    useState<RagExampleSection>("overview");
  const [hasLoadedConnectorState, setHasLoadedConnectorState] = useState(false);

  const sortedSyncSources = useMemo(
    () => sortSyncSources(syncSources),
    [syncSources],
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
  const activeSectionConfig = ragExampleSections.find(
    (section) => section.id === activeSection,
  );
  const shouldMountFullLab =
    activeSection !== "overview" && activeSection !== "connectors";

  const loadSyncSources = async ({ quiet = false } = {}) => {
    if (!quiet) {
      setSyncSourcesLoading(true);
    }
    setSyncSourcesError("");

    try {
      const payload = await loadConnectorSyncSources(selectedMode);
      setSyncSources(payload.syncSources);
    } catch (error) {
      setSyncSourcesError(
        error instanceof ConnectorAuthRequiredError
          ? "Sign in (top-right) to load linked connector state."
          : error instanceof Error
            ? `Unable to load connector state: ${error.message}`
            : "Unable to load connector state",
      );
    } finally {
      // Mark loaded even on failure so the effect that triggers this load
      // doesn't re-fire every time the loading flag toggles — a 401 (signed
      // out) would otherwise loop forever.
      setHasLoadedConnectorState(true);
      if (!quiet) {
        setSyncSourcesLoading(false);
      }
    }
  };

  const syncConnectors = async (sourceId?: string) => {
    setSyncPending(
      sourceId
        ? { background: true, scope: "source", sourceId }
        : { background: true, scope: "all" },
    );
    setMessage(
      sourceId ? `Starting ${sourceId} sync...` : "Starting connector sync...",
    );

    try {
      await postConnectorSync(selectedMode, sourceId);
      const payload = await loadConnectorSyncSources(selectedMode);
      setSyncSources(payload.syncSources);
      setHasLoadedConnectorState(true);
      setMessage(
        sourceId
          ? `Queued ${sourceId}. Refresh to watch document counts change.`
          : "Queued connector sync. Refresh to watch document counts change.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Connector sync failed: ${error.message}`
          : "Connector sync failed",
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
      setSyncSources(payload.syncSources);
      setHasLoadedConnectorState(true);
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

  useEffect(() => {
    setSyncSources([]);
    setSyncSourcesError("");
    setHasLoadedConnectorState(false);
  }, [selectedMode]);

  useEffect(() => {
    if (
      activeSection !== "connectors" ||
      hasLoadedConnectorState ||
      syncSourcesLoading
    ) {
      return;
    }

    void loadSyncSources();
  }, [
    activeSection,
    hasLoadedConnectorState,
    selectedMode,
    syncSourcesLoading,
  ]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadRagReadiness = async () => {
      try {
        const response = await fetch(
          `/demo/rag-readiness/${selectedMode}/json`,
        );
        if (!response.ok) {
          throw new Error(await response.text());
        }

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

    void loadRagReadiness();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [selectedMode]);

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
          One Elysia route to ingest, retrieve, and stream grounded answers with
          citations over a stuffed multi-format knowledge base.
        </p>
        <p className="demo-metadata">
          Built on <code>@absolutejs/ai</code> and <code>@absolutejs/rag</code>,
          with <code>@absolutejs/rag/ui</code> diagnostics on this page.
        </p>

        {message && <p className="demo-banner">{message}</p>}
        {syncSourcesError && <p className="demo-error">{syncSourcesError}</p>}

        <p className="demo-metadata">
          Pick a capability — the core RAG flow is{" "}
          <strong>Search &amp; verify</strong> then{" "}
          <strong>Grounded streaming</strong>.
        </p>
        <div className="demo-section-card-grid">
          {ragExampleSections.map((section) => (
            <button
              className={
                activeSection === section.id
                  ? "demo-section-card demo-section-card-active"
                  : "demo-section-card"
              }
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              type="button"
            >
              <span>{section.kicker}</span>
              <strong>{section.title}</strong>
              <p>{section.description}</p>
              <small>
                {activeSection === section.id ? "Loaded" : section.loadLabel}
              </small>
            </button>
          ))}
        </div>
      </section>

      {activeSection === "connectors" && (
        <>
          <section className="demo-card demo-connector-focus">
            <div className="demo-connector-layout">
              <article className="demo-result-item">
                <h2>1. Connect Providers</h2>
                <p className="demo-metadata">
                  These are connector grants, not login identities. They attach
                  API access to your signed-in AbsoluteJS account.
                </p>
                <div className="demo-provider-card-grid">
                  {connectorProviders.map((provider) => (
                    <a
                      className="demo-provider-card"
                      href={provider.href}
                      key={provider.key}
                    >
                      <img alt="" aria-hidden="true" src={provider.iconPath} />
                      <strong>{provider.label}</strong>
                      <span>{provider.description}</span>
                    </a>
                  ))}
                </div>
              </article>

              <article className="demo-result-item">
                <h2>2. Verify Linked Accounts</h2>
                <p className="demo-metadata">
                  These are the exact auth-backed bindings RAG will use for this
                  account.
                </p>
                {syncSourcesLoading ? (
                  <p className="demo-release-pending">
                    <span aria-hidden="true" className="demo-inline-spinner" />
                    Loading linked connector state...
                  </p>
                ) : linkedConnectorAccounts.length > 0 ? (
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
                            <span>RAG source</span>
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
                    No linked connector bindings are resolved yet. Use the
                    connector buttons above after signing in.
                  </p>
                )}
              </article>
            </div>
          </section>

          <section className="demo-card">
            <div className="demo-sync-section-heading">
              <div>
                <span className="demo-hero-kicker">Connector proof</span>
                <h2>3. Select Binding And Sync</h2>
                <p className="demo-metadata">
                  Everything needed to prove Gmail and Contacts ingestion is
                  kept in this section.
                </p>
              </div>
              <div className="demo-actions">
                <button
                  disabled={syncSourcesLoading}
                  onClick={() => void loadSyncSources()}
                  type="button"
                >
                  {syncSourcesLoading
                    ? "Loading connector state..."
                    : "Reload connector state"}
                </button>
                <button
                  disabled={syncPending !== null}
                  onClick={() => void syncConnectors()}
                  type="button"
                >
                  {syncPending?.scope === "all"
                    ? "Queueing sync..."
                    : "Sync all connector sources"}
                </button>
              </div>
            </div>
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
                      key={source.id}
                    >
                      <div className="demo-sync-source-header">
                        <div>
                          <h3>{source.label}</h3>
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
                          onClick={() => void syncConnectors(source.id)}
                          type="button"
                        >
                          {syncPending?.scope === "source" &&
                          syncPending.sourceId === source.id
                            ? "Queueing..."
                            : "Sync this source"}
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
                              <option value="">
                                Auto select first binding
                              </option>
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
                <article className="demo-result-item">
                  <h3>
                    {syncSourcesLoading
                      ? "Loading connector sources"
                      : "No connector sources loaded"}
                  </h3>
                  <p className="demo-metadata">
                    {syncSourcesLoading
                      ? "Connector bindings are being resolved for the signed-in AbsoluteJS account."
                      : "If you are signed in and have granted Google connector access, reload connector state. If this stays empty, the connector providers or auth database are not wired into this example."}
                  </p>
                </article>
              )}
            </div>
          </section>
        </>
      )}

      {shouldMountFullLab && (
        <section className="demo-card demo-full-lab-entry">
          <div>
            <span className="demo-hero-kicker">
              {activeSectionConfig?.kicker ?? "RAG lane"}
            </span>
            <h2>{activeSectionConfig?.title ?? "RAG package lab"}</h2>
            <p className="demo-metadata">
              {activeSectionConfig?.description ??
                "This lane mounts the RAG client on demand."}{" "}
              This is the part that mounts <code>useRAG()</code>, so stream and
              data clients start only after selection.
            </p>
          </div>
          <button onClick={() => setActiveSection("overview")} type="button">
            Close lane
          </button>
        </section>
      )}

      {shouldMountFullLab && (
        <Suspense
          fallback={
            <section className="demo-card demo-full-lab-placeholder">
              <h2>Loading RAG lane</h2>
              <p className="demo-metadata">
                Loading the selected RAG client surface.
              </p>
            </section>
          }
        >
          <ReactRAGVectorDemoFullLabApp
            activeSection={activeSection}
            mode={selectedMode}
            showConnectorFocus={false}
          />
        </Suspense>
      )}
    </main>
  );
};
