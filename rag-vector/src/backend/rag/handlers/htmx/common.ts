import { resolveRAGHTMXRenderers } from "@absolutejs/rag/ui";

export type {
  RAGBackendCapabilities,
  RAGVectorStoreStatus,
} from "@absolutejs/rag";

export type RAGSource = {
  chunkId: string;
  score: number;
  text: string;
  title?: string;
  source?: string;
};

// Self-contained HTMX fragment renderers now live in @absolutejs/rag; resolve
// them with the example's `demo-` class prefix so the existing stylesheet keeps
// working, and re-export under the original names below.
const htmxRenderers = resolveRAGHTMXRenderers({ classPrefix: "demo" });

export const renderAdminActionCards = htmxRenderers.adminActionCards;
export const renderAdminJobCards = htmxRenderers.adminJobCards;
export const renderCapabilities = htmxRenderers.capabilities;
export const renderCitations = htmxRenderers.citations;
export const renderDetailList = htmxRenderers.detailList;
export const renderNativeSource = htmxRenderers.nativeSource;
export const renderSectionDiagnosticCard = htmxRenderers.sectionDiagnosticCard;
export const renderSourceSummaries = htmxRenderers.sourceSummaries;
export const renderStageRow = htmxRenderers.stageRow;
export const renderStatusMessage = htmxRenderers.statusMessage;
export const renderStatusSummary = htmxRenderers.statusSummary;
export const renderTracePanel = htmxRenderers.tracePanel;
export const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export const formatDuration = (durationMs?: number) => {
  if (typeof durationMs !== "number" || durationMs < 0) {
    return "n/a";
  }

  return `${durationMs}ms`;
};
export const formatScore = (value: number) =>
  Number.isFinite(value) ? value.toFixed(3) : "0.000";
export const formatTime = (timestamp?: number) => {
  if (!timestamp) {
    return "n/a";
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
};
