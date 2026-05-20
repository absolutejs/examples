import type { DemoBackendMode } from "../../../frontend/demo-backends";
import type { createRAGSyncScheduler } from "@absolutejs/rag";
import type { createRagDemoState } from "./ragDemoState";

type RagDemoState = ReturnType<typeof createRagDemoState>;
type RagStartupResult = Awaited<ReturnType<RagDemoState["initialize"]>>;
type RagSyncScheduler = ReturnType<typeof createRAGSyncScheduler>;

export type RagStartupSnapshot =
  | {
      status: "warming";
      startedAt: number;
      elapsedMs: number;
    }
  | {
      status: "ready";
      startedAt: number;
      completedAt: number;
      elapsedMs: number;
      startup: RagStartupResult;
    }
  | {
      status: "failed";
      startedAt: number;
      completedAt: number;
      elapsedMs: number;
      errorMessage: string;
    };

const formatDuration = (duration: number) => {
  if (duration < 1000) {
    return `${duration.toFixed(2)}ms`;
  }

  if (duration < 60_000) {
    return `${(duration / 1000).toFixed(2)}s`;
  }

  return `${(duration / 60_000).toFixed(2)}m`;
};

const formatRagStartupLog = (startup: RagStartupResult) => {
  const backendLines = Object.entries(startup.startupStatus).map(
    ([mode, value]) =>
      `    - ${mode}: ${value.chunkCount} chunks in ${formatDuration(value.elapsedMs)}`,
  );

  return [
    "RAG init complete",
    "  Backends:",
    ...backendLines,
    `  Documents: ${startup.seedDocs.length}`,
    "  Phases:",
    `    - sync sources: ${formatDuration(startup.timings.syncSourceLoadMs)}`,
    `    - seed docs: ${formatDuration(startup.timings.seedDocumentLoadMs)}`,
    `    - vector rebuild: ${formatDuration(startup.timings.vectorRebuildMs)}`,
    `  Total: ${formatDuration(startup.timings.totalRagInitMs)}`,
  ].join("\n");
};

export const createRagStartupController = ({
  ragDemoState,
  syncScheduler,
}: {
  ragDemoState: RagDemoState;
  syncScheduler: RagSyncScheduler;
}) => {
  let ragStartupStartedAt = Date.now();
  let ragStartupSnapshot: RagStartupSnapshot = {
    status: "warming",
    startedAt: ragStartupStartedAt,
    elapsedMs: 0,
  };
  let ragStartupPromise: Promise<RagStartupResult | null> | null = null;
  let ragStartupScheduled = false;

  const start = () => {
    if (ragStartupPromise) {
      return ragStartupPromise;
    }

    ragStartupStartedAt = Date.now();
    ragStartupSnapshot = {
      status: "warming",
      startedAt: ragStartupStartedAt,
      elapsedMs: 0,
    };

    ragStartupPromise = ragDemoState
      .initialize()
      .then(async (startup) => {
        const completedAt = Date.now();
        ragStartupSnapshot = {
          status: "ready",
          startedAt: ragStartupStartedAt,
          completedAt,
          elapsedMs: completedAt - ragStartupStartedAt,
          startup,
        };
        console.log(formatRagStartupLog(startup));

        await syncScheduler.start();
        return startup;
      })
      .catch((error) => {
        const completedAt = Date.now();
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        ragStartupSnapshot = {
          status: "failed",
          startedAt: ragStartupStartedAt,
          completedAt,
          elapsedMs: completedAt - ragStartupStartedAt,
          errorMessage,
        };
        console.error(
          `RAG init failed after ${formatDuration(completedAt - ragStartupStartedAt)}: ${errorMessage}`,
        );
        return null;
      });

    return ragStartupPromise;
  };

  const schedule = () => {
    if (ragStartupPromise || ragStartupScheduled) {
      return;
    }

    ragStartupScheduled = true;
    setTimeout(() => {
      ragStartupScheduled = false;
      void start();
    }, 0);
  };

  const getSnapshot = (): RagStartupSnapshot => {
    if (ragStartupSnapshot.status === "warming") {
      return {
        ...ragStartupSnapshot,
        elapsedMs: Date.now() - ragStartupSnapshot.startedAt,
      };
    }

    return ragStartupSnapshot;
  };

  const formatSummary = (snapshot: RagStartupSnapshot) => {
    if (snapshot.status === "ready") {
      return `Knowledge base ready after ${formatDuration(snapshot.elapsedMs)}.`;
    }

    if (snapshot.status === "failed") {
      return `Knowledge base startup failed after ${formatDuration(snapshot.elapsedMs)}.`;
    }

    return `Knowledge base warming up for ${formatDuration(snapshot.elapsedMs)}.`;
  };

  const renderPendingPanel = (id: string, title: string, detail: string) =>
    [
      `<div id="${id}" class="demo-results">`,
      `<h3>${title}</h3>`,
      `<p class="demo-banner">${detail}</p>`,
      "</div>",
    ].join("");

  const renderWarmupPanel = (mode: DemoBackendMode) => {
    const snapshot = getSnapshot();
    const pollAttributes =
      snapshot.status === "warming"
        ? ` hx-get="/demo/ops/${mode}" hx-trigger="load delay:2s" hx-swap="outerHTML"`
        : "";
    const headline =
      snapshot.status === "failed"
        ? "Knowledge Base Warmup Failed"
        : "Knowledge Base Warming Up";
    const detail =
      snapshot.status === "failed"
        ? snapshot.errorMessage
        : `${formatSummary(snapshot)} The page shell is live, but retrieval, sync, and diagnostics unlock after vector rebuild finishes.`;

    return [
      `<div id="ops-panel" class="demo-results"${pollAttributes}>`,
      `<h3>${headline}</h3>`,
      `<p class="demo-banner">${detail}</p>`,
      '<ul class="demo-detail-list">',
      `<li>Elapsed startup time: ${formatDuration(snapshot.elapsedMs)}</li>`,
      snapshot.status === "warming"
        ? "<li>This panel will refresh automatically when the knowledge base becomes ready.</li>"
        : "<li>Check the server logs for the startup failure and restart after fixing the underlying issue.</li>",
      "</ul>",
      "</div>",
    ].join("");
  };

  const renderMutationBlockedResponse = (
    mode: DemoBackendMode,
    message: string,
  ) =>
    [
      '<div id="mutation-status" hx-swap-oob="innerHTML">',
      '<div class="demo-results">',
      `<p class="demo-banner">${message}</p>`,
      "</div>",
      "</div>",
      '<div id="htmx-ops" hx-swap-oob="innerHTML">',
      renderWarmupPanel(mode),
      "</div>",
    ].join("");

  const getReadinessPayload = () => {
    schedule();
    const snapshot = getSnapshot();
    const className =
      snapshot.status === "ready"
        ? "demo-rag-readiness-ready"
        : snapshot.status === "failed"
          ? "demo-rag-readiness-failed"
          : "demo-rag-readiness-warming";
    const label =
      snapshot.status === "ready"
        ? "RAG Ready"
        : snapshot.status === "failed"
          ? "RAG Failed"
          : "RAG Warming";
    const detail =
      snapshot.status === "ready"
        ? `Knowledge base initialized in ${formatDuration(snapshot.elapsedMs)}.`
        : snapshot.status === "failed"
          ? snapshot.errorMessage
          : `Knowledge base warming for ${formatDuration(snapshot.elapsedMs)}.`;

    return {
      className,
      detail,
      elapsedMs: snapshot.elapsedMs,
      label,
      status: snapshot.status,
    };
  };

  const renderHeaderBadge = (mode: DemoBackendMode) => {
    schedule();
    const payload = getReadinessPayload();
    const pollAttributes =
      payload.status === "warming"
        ? ` hx-get="/demo/rag-readiness/${mode}" hx-trigger="load delay:2s" hx-swap="outerHTML"`
        : "";

    return [
      `<div id="rag-readiness-badge" class="demo-rag-readiness ${payload.className}"${pollAttributes}>`,
      `<strong>${payload.label}</strong>`,
      `<span>${payload.detail}</span>`,
      "</div>",
    ].join("");
  };

  return {
    formatDuration,
    formatSummary,
    getReadinessPayload,
    getSnapshot,
    renderHeaderBadge,
    renderMutationBlockedResponse,
    renderPendingPanel,
    renderWarmupPanel,
    schedule,
    start,
  };
};
