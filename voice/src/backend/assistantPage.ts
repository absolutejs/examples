import type {
  VoiceAssistantMemoryRecord,
  VoiceAssistantRunsSummary,
} from "@absolutejs/voice";
import { VOICE_ASSISTANT_CONFIG } from "../constants/assistant";

type VoiceAssistantPageConfig = Omit<
  typeof VOICE_ASSISTANT_CONFIG,
  "modelProvider"
> & {
  availableProviders?: string[];
  modelProvider: string;
};

type VoiceProviderHealth = {
  averageElapsedMs?: number;
  errorCount: number;
  fallbackCount: number;
  lastError?: string;
  lastErrorAt?: number;
  lastSuccessAt?: number;
  provider: string;
  recommended: boolean;
  runCount: number;
  status:
    | "healthy"
    | "idle"
    | "rate-limited"
    | "degraded"
    | "recoverable"
    | "suppressed";
  suppressionRemainingMs?: number;
  suppressedUntil?: number;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const renderCountMap = (values: Record<string, number>) => {
  const entries = Object.entries(values).sort(
    (left, right) => right[1] - left[1],
  );

  if (entries.length === 0) {
    return `<p class="empty">No data yet.</p>`;
  }

  return `<div class="metric-list">${entries
    .map(
      ([label, value]) => `
        <div class="metric-row">
          <span>${escapeHtml(label)}</span>
          <strong>${value}</strong>
        </div>
      `,
    )
    .join("")}</div>`;
};

const renderProviderHealth = (providers: VoiceProviderHealth[]) => {
  if (providers.length === 0) {
    return `<p class="empty">No provider status yet.</p>`;
  }

  return `<div class="provider-grid">${providers
    .map((provider) => {
      const suppressionSeconds =
        typeof provider.suppressionRemainingMs === "number"
          ? Math.ceil(provider.suppressionRemainingMs / 1000)
          : undefined;

      return `
        <article class="provider-card ${escapeHtml(provider.status)}">
          <div class="provider-card-header">
            <h3>${escapeHtml(provider.provider)}</h3>
            <span class="pill">${escapeHtml(provider.status)}${provider.recommended ? " · recommended" : ""}</span>
          </div>
          <div class="metric-list">
            <div class="metric-row"><span>Runs</span><strong>${provider.runCount}</strong></div>
            <div class="metric-row"><span>Avg latency</span><strong>${provider.averageElapsedMs ?? 0}ms</strong></div>
            <div class="metric-row"><span>Errors</span><strong>${provider.errorCount}</strong></div>
            <div class="metric-row"><span>Fallbacks</span><strong>${provider.fallbackCount}</strong></div>
          </div>
          ${suppressionSeconds ? `<p class="empty">Temporarily suppressed for ${suppressionSeconds}s.</p>` : ""}
          ${provider.lastError ? `<p class="empty">${escapeHtml(provider.lastError)}</p>` : ""}
        </article>
      `;
    })
    .join("")}</div>`;
};

const renderFailoverControls = (providers: string[] = []) => {
  const simulatedProviders = providers.filter(
    (provider) => provider !== "deterministic",
  );

  if (simulatedProviders.length === 0) {
    return `<p class="empty">No external model providers are configured for failover simulation.</p>`;
  }

  return `<div class="failover-panel">
    <p class="empty">Trigger a simulated HTTP 429 for a provider. The router should suppress it, fall back to another provider, and refresh this page with the updated status.</p>
    <div class="failover-actions">
      ${simulatedProviders
        .map(
          (provider) =>
            `<button type="button" data-provider="${escapeHtml(provider)}">Simulate ${escapeHtml(provider)} failure</button>`,
        )
        .join("")}
    </div>
    <p class="empty">Retry a provider after its cooldown expires to mark it healthy again without waiting for a voice turn.</p>
    <div class="failover-actions">
      ${simulatedProviders
        .map(
          (provider) =>
            `<button type="button" data-recover-provider="${escapeHtml(provider)}">Retry ${escapeHtml(provider)} recovery</button>`,
        )
        .join("")}
    </div>
    <p id="failover-replay" class="empty" hidden></p>
    <pre id="failover-output" class="failover-output" hidden></pre>
  </div>`;
};

export const renderVoiceAssistantPage = (
  summary: VoiceAssistantRunsSummary,
  memories: VoiceAssistantMemoryRecord[] = [],
  config: VoiceAssistantPageConfig = VOICE_ASSISTANT_CONFIG,
  providerHealth: VoiceProviderHealth[] = [],
) => {
  const assistant = summary.assistants[0];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AbsoluteJS Voice Assistant</title>
  <style>
    :root { color-scheme: dark; }
    body { background: #09090b; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; }
    main { max-width: 1120px; margin: 0 auto; display: grid; gap: 16px; }
    section, article { background: #13161b; border: 1px solid #27272a; border-radius: 20px; padding: 20px; }
    .grid { display: grid; gap: 14px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .wide-grid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .stat { background: #0f1217; border: 1px solid #27272a; border-radius: 16px; padding: 16px; }
    .stat span, .empty { color: #a1a1aa; }
    .stat strong { display: block; font-size: 1.8rem; margin-top: 6px; }
    .metric-list { display: grid; gap: 8px; }
    .metric-row { align-items: center; background: #0f1217; border: 1px solid #27272a; border-radius: 12px; display: flex; justify-content: space-between; padding: 10px 12px; }
    .pill-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .pill { background: #0f1217; border: 1px solid #3f3f46; border-radius: 999px; color: #d4d4d8; padding: 6px 10px; }
    .provider-grid { display: grid; gap: 14px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .provider-card { background: #0f1217; border: 1px solid #27272a; border-radius: 16px; padding: 16px; }
    .provider-card.healthy { border-color: rgba(34, 197, 94, 0.5); }
    .provider-card.degraded, .provider-card.rate-limited { border-color: rgba(245, 158, 11, 0.6); }
    .provider-card.recoverable { border-color: rgba(59, 130, 246, 0.65); }
    .provider-card.suppressed { border-color: rgba(239, 68, 68, 0.7); }
    .provider-card-header { align-items: center; display: flex; gap: 8px; justify-content: space-between; margin-bottom: 12px; }
    .provider-card-header h3 { margin: 0; }
    .failover-panel { display: grid; gap: 12px; }
    .failover-actions { display: flex; flex-wrap: wrap; gap: 10px; }
    button { background: #f59e0b; border: 0; border-radius: 999px; color: #111827; cursor: pointer; font-weight: 700; padding: 10px 14px; }
    button:disabled { cursor: wait; opacity: 0.65; }
    .failover-output { background: #0f1217; border: 1px solid #27272a; border-radius: 12px; color: #d4d4d8; overflow: auto; padding: 12px; white-space: pre-wrap; }
    a { color: #f59e0b; }
    @media (max-width: 800px) { .grid, .wide-grid, .provider-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>Assistant control plane</h1>
      <p>This page summarizes assistant trace events from <code>createVoiceAssistant(...)</code>: variants, outcomes, guardrails, tools, memory, and artifact plans.</p>
      <p><a href="/react">Back to demo</a> · <a href="/resilience">Resilience</a> · <a href="/sessions">Sessions</a> · <a href="/handoffs">Handoffs</a> · <a href="/reviews">Reviews</a> · <a href="/tasks">Tasks</a> · <a href="/integrations">Integrations</a></p>
    </section>
    <section>
      <h2>${escapeHtml(config.id)}</h2>
      <div class="pill-list">
        <span class="pill">recipe: ${escapeHtml(config.recipe)}</span>
        <span class="pill">model: ${escapeHtml(config.modelProvider)}</span>
        ${(config.availableProviders ?? []).map((provider) => `<span class="pill">available: ${escapeHtml(provider)}</span>`).join("")}
        ${config.tools.map((tool) => `<span class="pill">${escapeHtml(tool)}</span>`).join("")}
      </div>
    </section>
    <section>
      <h2>Provider status</h2>
      ${renderProviderHealth(providerHealth)}
    </section>
    <section>
      <h2>Test provider failover</h2>
      ${renderFailoverControls(config.availableProviders)}
    </section>
    <section class="grid">
      <article class="stat"><span>Runs</span><strong>${assistant?.runCount ?? 0}</strong></article>
      <article class="stat"><span>Sessions</span><strong>${assistant?.sessions ?? 0}</strong></article>
      <article class="stat"><span>Guardrails</span><strong>${assistant?.guardrailCount ?? 0}</strong></article>
      <article class="stat"><span>Avg latency</span><strong>${assistant?.averageElapsedMs ?? 0}ms</strong></article>
    </section>
    <section class="wide-grid">
      <article><h2>Outcomes</h2>${renderCountMap(assistant?.outcomes ?? {})}</article>
      <article><h2>Variants</h2>${renderCountMap(assistant?.variants ?? {})}</article>
      <article><h2>Tools</h2>${renderCountMap(assistant?.toolCalls ?? {})}</article>
      <article><h2>Memory ops</h2>${renderCountMap(assistant?.memory ?? {})}</article>
      <article><h2>Artifact plans</h2>${renderCountMap(assistant?.artifactPlans ?? {})}</article>
      <article><h2>Stored memory</h2>${
        memories.length
          ? `<div class="metric-list">${memories
              .map(
                (memory) => `
                  <div class="metric-row">
                    <span>${escapeHtml(memory.namespace)} / ${escapeHtml(memory.key)}</span>
                    <strong>${escapeHtml(String(memory.value))}</strong>
                  </div>
                `,
              )
              .join("")}</div>`
          : `<p class="empty">No memory records yet. Complete a call with “my name is ...” to persist one.</p>`
      }</article>
    </section>
  </main>
  <script>
    const output = document.getElementById("failover-output");
    const replay = document.getElementById("failover-replay");
    const showReplay = (body) => {
      if (!replay) return;
      if (body && typeof body.replayHref === "string") {
        replay.hidden = false;
        replay.innerHTML = '<a href="' + body.replayHref.replace(/"/g, "&quot;") + '">Open replay for this simulation</a>';
      } else {
        replay.hidden = true;
        replay.textContent = "";
      }
    };
    for (const button of document.querySelectorAll("[data-provider]")) {
      button.addEventListener("click", async () => {
        const provider = button.getAttribute("data-provider");
        if (!provider) return;
        button.disabled = true;
        if (output) {
          output.hidden = false;
          output.textContent = "Simulating " + provider + " failure...";
        }
        try {
          const response = await fetch("/api/provider-simulate/failure?provider=" + encodeURIComponent(provider), {
            method: "POST"
          });
          const body = await response.json();
          if (output) {
            output.textContent = JSON.stringify(body, null, 2);
          }
          showReplay(body);
          window.setTimeout(() => window.location.reload(), 500);
        } catch (error) {
          if (output) {
            output.textContent = error instanceof Error ? error.message : String(error);
          }
        } finally {
          button.disabled = false;
        }
      });
    }
    for (const button of document.querySelectorAll("[data-recover-provider]")) {
      button.addEventListener("click", async () => {
        const provider = button.getAttribute("data-recover-provider");
        if (!provider) return;
        button.disabled = true;
        if (output) {
          output.hidden = false;
          output.textContent = "Retrying " + provider + " recovery...";
        }
        try {
          const response = await fetch("/api/provider-simulate/recovery?provider=" + encodeURIComponent(provider), {
            method: "POST"
          });
          const body = await response.json();
          if (output) {
            output.textContent = JSON.stringify(body, null, 2);
          }
          showReplay(body);
          window.setTimeout(() => window.location.reload(), 500);
        } catch (error) {
          if (output) {
            output.textContent = error instanceof Error ? error.message : String(error);
          }
        } finally {
          button.disabled = false;
        }
      });
    }
  </script>
</body>
</html>`;
};
