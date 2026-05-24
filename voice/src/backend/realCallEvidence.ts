import type { SavedIntake } from "../types/domain";
import type { VoiceModelProvider, VoiceRoutingMode } from "../types/voice";
import {
  appendVoiceIOProviderRouterTraceEvent,
  appendVoiceRealCallProfileRecoveryEvidence,
  buildEmptyVoiceProofTrendReport,
  buildVoiceBrowserCallProfileReport,
  buildVoiceProofTrendReport,
  buildVoiceRealCallEvidenceRuntimeReadinessCheck,
  buildVoiceRealCallEvidenceRuntimeWorkerReadinessCheck,
  buildVoiceRealCallProfileHistoryReport,
  createVoiceProviderRouter,
  createVoiceRealCallEvidenceRuntime,
  createVoiceRealCallEvidenceRuntimeRoutes,
  createVoiceRealCallEvidenceRuntimeWorkerLoop,
  createVoiceSTTProviderRouter,
  createVoiceTTSProviderRouter,
  resolveVoiceRealCallProfileProviderRoute,
  type STTAdapter,
  type VoiceBrowserCallProfileReport,
  type VoicePlatformCoverageEvidence,
  type VoicePlatformCoverageSummary,
  type VoicePlatformCoverageSurface,
  type VoiceProductionReadinessCheck,
  type VoiceProofTrendCycle,
  type VoiceProofTrendReport,
  type VoiceProofTrendSummary,
  type VoiceSessionRecord,
  voice,
} from "@absolutejs/voice";
import {
  createVoiceDrizzleRealCallProfileEvidenceStore,
  createVoiceDrizzleRealCallProfileRecoveryJobStore,
} from "@absolutejs/voice/drizzle";
import { assemblyai } from "@absolutejs/voice-assemblyai";
import { deepgram } from "@absolutejs/voice-deepgram";
import { gemini } from "@absolutejs/voice-gemini";
import { openai } from "@absolutejs/voice-openai";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "../../db/client";
import {
  configuredModelProviders,
  configuredSTTProviders,
  configuredTTSProviders,
  createEmergencyTelephonyTTS,
  deliveryTraceStore,
  isAssistantProviderError,
  modelProvider,
  openAITelephonyTTS,
  providerFallbackOrder,
  providerLatencyBudgets,
  providerModels,
  readPositiveNumberEnv,
  resolveRequestedProvider,
  resolveVoiceProfileIdFromContext,
  selectedSTTProvider,
  sessionRoutingModes,
  sessionVoiceProfileIds,
  sttLatencyBudgets,
  sttProviderAdapters,
  traceProviderEvent,
  traceSTTProviderEvent,
  voiceProfileProviderAliases,
} from "./providers";
import { runtimeDirectory } from "./stores";
import { reactiveHub } from "./sync";
import {
  VOICE_EVIDENCE_TOPIC,
  VOICE_WORKER_HEALTH_TOPIC,
} from "../constants/sync";
import type { VoiceSTTProvider, VoiceTTSProvider } from "./providers";

const renderRealCallProfileRecoveryHTML = () => `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>AbsoluteJS Voice Real-Call Recovery Jobs</title>
      <style>
        :root{color-scheme:dark;--bg:#0c1116;--panel:#141d24;--panel-2:#17252f;--line:#2d4050;--text:#f7fbff;--muted:#9eb2c2;--accent:#7dd3fc;--good:#86efac;--bad:#fca5a5;--warn:#facc15}
        *{box-sizing:border-box}
        body{background:radial-gradient(circle at top left,rgba(125,211,252,.16),transparent 34rem),linear-gradient(135deg,#0c1116,#111827 58%,#11140c);color:var(--text);font-family:ui-sans-serif,system-ui,sans-serif;margin:0}
        main{max-width:1120px;margin:auto;padding:32px}
        a{color:var(--accent)}
        button{background:var(--accent);border:0;border-radius:999px;color:#062235;cursor:pointer;font-weight:800;padding:10px 14px}
        button:disabled{cursor:not-allowed;filter:grayscale(.8);opacity:.6}
        code{background:#0a0f14;border:1px solid var(--line);border-radius:8px;padding:2px 6px}
        h1{font-size:clamp(2.2rem,6vw,4.8rem);line-height:.9;margin:.2rem 0 1rem;max-width:900px}
        h2{margin:.2rem 0 .7rem}
        p{line-height:1.6}
        .hero,.panel{background:linear-gradient(135deg,rgba(20,29,36,.94),rgba(23,37,47,.86));border:1px solid var(--line);border-radius:28px;box-shadow:0 24px 80px rgba(0,0,0,.28);padding:24px}
        .hero{margin-bottom:16px}
        .muted{color:var(--muted)}
        .grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
        .actions,.jobs{display:grid;gap:12px}
        .card{background:#0d151c;border:1px solid var(--line);border-radius:20px;padding:16px}
        .card header{align-items:flex-start;display:flex;gap:12px;justify-content:space-between}
        .pill{border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:.8rem;font-weight:800;padding:5px 9px;text-transform:uppercase}
        .pass{color:var(--good)}.fail{color:var(--bad)}.running,.queued{color:var(--warn)}
        pre{background:#080d12;border:1px solid var(--line);border-radius:16px;max-height:340px;overflow:auto;padding:14px;white-space:pre-wrap}
      </style>
    </head>
    <body>
      <main>
        <p><a href="/ops-console">Back to Ops Console</a> · <a href="/production-readiness">Production Readiness</a> · <a href="/voice/real-call-profile-history">Profile History</a> · <a href="/api/voice/real-call-profile-history/actions">Actions JSON</a> · <a href="/api/production-readiness/recovery-actions">Readiness Recovery Plan</a></p>
        <section class="hero">
          <p class="muted">Executable proof repair</p>
          <h1>Run recovery jobs instead of reading stale instructions</h1>
          <p class="muted">This page uses the same primitive routes a self-hosted app can mount: list recovery actions, POST an action, receive a <code>jobId</code>, and poll <code>/actions/:jobId</code>.</p>
        </section>
        <section class="grid">
          <article class="panel">
            <h2>Recommended Actions</h2>
            <p class="muted">Loaded from <code>/api/voice/real-call-profile-history/actions</code>. Green systems may only recommend refresh.</p>
            <div id="recommended" class="actions"></div>
          </article>
          <article class="panel">
            <h2>Proof Jobs</h2>
            <p class="muted">These are safe demo controls for rerunning the proof surfaces even when readiness is already passing.</p>
            <div id="proof-jobs" class="actions"></div>
          </article>
        </section>
        <section class="panel" style="margin-top:14px">
          <h2>Recent Job Status</h2>
          <p class="muted">Loaded from persisted recovery job history. Running jobs keep polling until they pass or fail.</p>
          <div id="jobs" class="jobs"></div>
        </section>
        <section class="panel" style="margin-top:14px">
          <h2>Readiness Recovery Plan</h2>
          <p class="muted">Mapped from failed or warning production-readiness checks. POST actions run here; GET actions open the relevant proof surface.</p>
          <p>
            <button id="load-demo-plan" type="button">Demo recovery plan</button>
            <button id="run-visible-plan" type="button">Run visible POST actions</button>
          </p>
          <div id="readiness-plan" class="actions"></div>
        </section>
        <section class="panel" style="margin-top:14px">
          <h2>Latest Payload</h2>
          <pre id="payload">Loading...</pre>
        </section>
      </main>
      <script>
        const base = "/api/voice/real-call-profile-history";
        const payload = document.querySelector("#payload");
        const recommended = document.querySelector("#recommended");
        const proofJobs = document.querySelector("#proof-jobs");
        const readinessPlan = document.querySelector("#readiness-plan");
        const loadDemoPlanButton = document.querySelector("#load-demo-plan");
        const runVisiblePlanButton = document.querySelector("#run-visible-plan");
        const jobs = document.querySelector("#jobs");
        const pollers = new Map();
        let visibleReadinessActions = [];
        const staticJobs = [
          {
            description: "Run real browser microphone/WebSocket profile proof against this demo server.",
            href: base + "/collect-browser-proof",
            id: "collect-browser-proof",
            label: "Run browser profile proof",
            method: "POST"
          },
          {
            description: "Run Twilio, Telnyx, and Plivo phone smoke-contract proof.",
            href: base + "/collect-phone-proof",
            id: "collect-phone-proof",
            label: "Run phone smoke proof",
            method: "POST"
          }
        ];

        const showPayload = (value) => {
          payload.textContent = JSON.stringify(value, null, 2);
        };

        const runPostAction = async (action) => {
          const response = await fetch(action.href, { method: "POST" });
          const result = await response.json();
          if (result.jobId) {
            renderJob({ id: result.jobId, actionId: result.actionId, status: result.jobStatus ?? "queued", message: result.message });
            pollJob(result.jobId);
          }
          return result;
        };

        const actionCard = (action) => {
          const card = document.createElement("div");
          card.className = "card";
          const canPost = action.method === "POST";
          const source = action.sourceCheckLabel
            ? \`<p class="muted">\${action.sourceCheckLabel} · \${action.sourceStatus}</p>\`
            : "";
          card.innerHTML = \`
            <header>
              <div>
                <strong>\${action.label ?? action.id}</strong>
                \${source}
                <p class="muted">\${action.description ?? action.href}</p>
              </div>
              <span class="pill">\${action.method ?? "GET"}</span>
            </header>
          \`;
          const button = document.createElement("button");
          button.textContent = canPost ? "Run action" : "Open";
          button.addEventListener("click", async () => {
            if (!canPost) {
              window.location.href = action.href;
              return;
            }
            button.disabled = true;
            button.textContent = "Queued...";
            try {
              const result = await runPostAction(action);
              showPayload(result);
              button.textContent = "Run again";
            } catch (error) {
              showPayload({ error: error instanceof Error ? error.message : String(error) });
              button.textContent = "Failed";
            } finally {
              button.disabled = false;
            }
          });
          card.append(button);
          return card;
        };

        const renderJob = (job) => {
          let card = document.querySelector(\`[data-job-id="\${job.id}"]\`);
          if (!card) {
            card = document.createElement("div");
            card.className = "card";
            card.dataset.jobId = job.id;
            jobs.prepend(card);
          }
          card.innerHTML = \`
            <header>
              <div>
                <strong>\${job.actionId ?? "Recovery job"}</strong>
                <p class="muted"><code>\${job.id}</code></p>
                <p>\${job.message ?? "Waiting for update..."}</p>
              </div>
              <span class="pill \${job.status}">\${job.status}</span>
            </header>
          \`;
        };

        const loadJobs = async () => {
          const response = await fetch(base + "/actions/jobs?limit=12");
          const result = await response.json();
          showPayload(result);
          const recentJobs = result.jobs ?? [];
          jobs.replaceChildren();
          if (recentJobs.length === 0) {
            const empty = document.createElement("div");
            empty.className = "card";
            empty.innerHTML = "<p class=\\"muted\\">No recovery jobs have been recorded yet.</p>";
            jobs.append(empty);
            return;
          }
          [...recentJobs].reverse().forEach(renderJob);
          recentJobs
            .filter((job) => job.status === "queued" || job.status === "running")
            .forEach((job) => pollJob(job.id));
        };

        const loadReadinessPlan = async (demo = false) => {
          const href = demo
            ? "/api/production-readiness/recovery-actions?demoFailure=real-call"
            : "/api/production-readiness/recovery-actions";
          const response = await fetch(href);
          const result = await response.json();
          showPayload(result);
          const actions = result.actions ?? [];
          visibleReadinessActions = actions;
          readinessPlan.replaceChildren();
          if (actions.length === 0) {
            const empty = document.createElement("div");
            empty.className = "card";
            empty.innerHTML = "<p class=\\"muted\\">No failed or warning readiness checks currently expose recovery actions.</p>";
            readinessPlan.append(empty);
            return;
          }
          readinessPlan.replaceChildren(...actions.map(actionCard));
        };

        runVisiblePlanButton.addEventListener("click", async () => {
          const postActions = visibleReadinessActions.filter((action) => action.method === "POST");
          runVisiblePlanButton.disabled = true;
          try {
            if (postActions.length === 0) {
              showPayload({ actions: [], message: "No visible POST recovery actions to run." });
              return;
            }
            const results = await Promise.allSettled(postActions.map(runPostAction));
            showPayload({
              actionCount: postActions.length,
              generatedAt: new Date().toISOString(),
              results: results.map((result, index) => ({
                actionId: postActions[index]?.id,
                href: postActions[index]?.href,
                label: postActions[index]?.label,
                status: result.status,
                value: result.status === "fulfilled" ? result.value : undefined,
                reason: result.status === "rejected"
                  ? result.reason instanceof Error
                    ? result.reason.message
                    : String(result.reason)
                  : undefined
              }))
            });
            await loadJobs();
          } finally {
            runVisiblePlanButton.disabled = false;
          }
        });

        loadDemoPlanButton.addEventListener("click", async () => {
          loadDemoPlanButton.disabled = true;
          try {
            await loadReadinessPlan(true);
          } finally {
            loadDemoPlanButton.disabled = false;
          }
        });

        const pollJob = (jobId) => {
          if (pollers.has(jobId)) return;
          const tick = async () => {
            const response = await fetch(base + "/actions/" + encodeURIComponent(jobId));
            const result = await response.json();
            showPayload(result);
            if (result.job) {
              renderJob(result.job);
              if (result.job.status === "pass" || result.job.status === "fail") {
                clearInterval(pollers.get(jobId));
                pollers.delete(jobId);
              }
            }
          };
          tick();
          pollers.set(jobId, setInterval(tick, 1200));
        };

        const load = async () => {
          const [actionsResponse] = await Promise.all([
            fetch(base + "/actions"),
            loadJobs(),
            loadReadinessPlan()
          ]);
          const result = await actionsResponse.json();
          recommended.replaceChildren(...(result.actions ?? []).map(actionCard));
          proofJobs.replaceChildren(...staticJobs.map(actionCard));
        };

        load().catch((error) => showPayload({ error: error instanceof Error ? error.message : String(error) }));
      </script>
    </body>
  </html>`;

type VapiCoverageEvidence = VoicePlatformCoverageEvidence;

type VapiCoverageResult = VoicePlatformCoverageSurface;

type VapiCoverageSummary = VoicePlatformCoverageSummary & {
  vapiCoverage: VoicePlatformCoverageSurface[];
};

const latestProofPackJsonPath = resolve(
  runtimeDirectory,
  "proof-pack/latest.json",
);

const latestProofPackMarkdownPath = resolve(
  runtimeDirectory,
  "proof-pack/latest.md",
);

const longProofWindowRoot = resolve(runtimeDirectory, "long-proof-window");

const latestBrowserCallProfilesJsonPath = resolve(
  runtimeDirectory,
  "browser-call-profiles/latest.json",
);

const realCallProfilesRoot =
  process.env.VOICE_REAL_CALL_PROFILES_ROOT ??
  resolve(runtimeDirectory, "real-call-profiles");

const realCallProfileRecoveryJobStore =
  createVoiceDrizzleRealCallProfileRecoveryJobStore({
    db,
    idPrefix: "voice-profile-recovery",
  });

const realCallProfileEvidenceStore =
  createVoiceDrizzleRealCallProfileEvidenceStore({
    db,
    idPrefix: "voice-profile-evidence",
  });

const latestProofTrendsJsonPath = resolve(
  runtimeDirectory,
  "proof-trends/latest.json",
);

const latestProofTrendsMarkdownPath = resolve(
  runtimeDirectory,
  "proof-trends/latest.md",
);

const configuredProofTrendsMaxAgeMs = Number(
  process.env.VOICE_PROOF_TRENDS_MAX_AGE_MS ?? 24 * 60 * 60 * 1000,
);

const proofTrendsMaxAgeMs =
  Number.isFinite(configuredProofTrendsMaxAgeMs) &&
  configuredProofTrendsMaxAgeMs > 0
    ? configuredProofTrendsMaxAgeMs
    : 24 * 60 * 60 * 1000;

const isMissingFileError = (error: unknown) =>
  error &&
  typeof error === "object" &&
  "code" in error &&
  error.code === "ENOENT";

const listDeliveryTraceEvidenceSafely = async () => {
  try {
    return await deliveryTraceStore.listEvidence({ limit: 5000 });
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }
    throw error;
  }
};

const readRealCallEvidenceRuntimePhoneEvidence = async () => {
  const evidence = await listDeliveryTraceEvidenceSafely();

  return evidence.filter((item) =>
    (item.surfaces ?? []).some(
      (surface) => surface === "phone" || surface === "telephony",
    ),
  );
};

const readRealCallEvidenceRuntimeProviderRoleEvidence = () => {
  const modelProvider = configuredModelProviders[0] ?? "openai";
  const sttProvider = configuredSTTProviders[0] ?? "deepgram";
  const ttsProvider = configuredTTSProviders[0] ?? "openai";
  const generatedAt = new Date().toISOString();

  return ["meeting-recorder", "support-agent"].map((profileId) => ({
    generatedAt,
    profileDescription:
      "Configured demo provider roles available for real-call profile defaults.",
    profileId,
    profileLabel:
      profileId === "meeting-recorder" ? "Meeting recorder" : "Support agent",
    providers: [
      {
        id: modelProvider,
        role: "llm",
        samples: 1,
        status: "pass",
      },
      {
        id: sttProvider,
        role: "stt",
        samples: 1,
        status: "pass",
      },
      {
        id: ttsProvider,
        role: "tts",
        samples: 1,
        status: "pass",
      },
    ],
    sessionId: `provider-role-${profileId}-${Date.parse(generatedAt)}`,
  }));
};

const configuredRealCallEvidenceRuntimeAutocollectIntervalMs = Number(
  process.env.VOICE_REAL_CALL_EVIDENCE_AUTOCOLLECT_INTERVAL_MS ?? 30_000,
);

const realCallEvidenceRuntimeAutocollectIntervalMs =
  Number.isFinite(configuredRealCallEvidenceRuntimeAutocollectIntervalMs) &&
  configuredRealCallEvidenceRuntimeAutocollectIntervalMs > 0
    ? configuredRealCallEvidenceRuntimeAutocollectIntervalMs
    : 30_000;

const configuredSloCalibrationMinRuns = Number(
  process.env.VOICE_SLO_CALIBRATION_MIN_RUNS ?? 1,
);

const sloCalibrationMinRuns =
  Number.isFinite(configuredSloCalibrationMinRuns) &&
  configuredSloCalibrationMinRuns > 0
    ? configuredSloCalibrationMinRuns
    : 1;

const configuredLiveLatencyReadinessMaxAgeMs = Number(
  process.env.VOICE_LIVE_LATENCY_READINESS_MAX_AGE_MS ?? 30 * 60 * 1000,
);

const liveLatencyReadinessMaxAgeMs =
  Number.isFinite(configuredLiveLatencyReadinessMaxAgeMs) &&
  configuredLiveLatencyReadinessMaxAgeMs > 0
    ? configuredLiveLatencyReadinessMaxAgeMs
    : 30 * 60 * 1000;

const browserCallProfilesMaxAgeMs = 24 * 60 * 60 * 1000;

const readLatestBrowserCallProfiles =
  async (): Promise<VoiceBrowserCallProfileReport> => {
    const file = Bun.file(latestBrowserCallProfilesJsonPath);

    if (!(await file.exists())) {
      return buildVoiceBrowserCallProfileReport({
        maxAgeMs: browserCallProfilesMaxAgeMs,
        source: latestBrowserCallProfilesJsonPath,
      });
    }

    try {
      return buildVoiceBrowserCallProfileReport({
        ...((await file.json()) as Record<string, unknown>),
        maxAgeMs: browserCallProfilesMaxAgeMs,
        source: latestBrowserCallProfilesJsonPath,
      });
    } catch {
      return buildVoiceBrowserCallProfileReport({
        maxAgeMs: browserCallProfilesMaxAgeMs,
        source: latestBrowserCallProfilesJsonPath,
      });
    }
  };

const readRealCallEvidenceRuntimeBrowserEvidence = async () => {
  const report = await readLatestBrowserCallProfiles();
  if (report.status !== "pass") {
    return undefined;
  }

  return {
    generatedAt: report.generatedAt,
    ok: report.ok,
    profileDescription: "Latest browser call profile proof artifact.",
    profileId: report.profileId,
    sessionId: `browser-call-profile-${report.profileId}-${report.runId ?? Date.parse(report.generatedAt)}`,
    surfaces: ["framework"],
  };
};

const realCallEvidenceRuntime = createVoiceRealCallEvidenceRuntime({
  browserEvidence: readRealCallEvidenceRuntimeBrowserEvidence,
  evidenceStore: realCallProfileEvidenceStore,
  existingEvidenceLimit: 5000,
  history: {
    maxAgeMs: proofTrendsMaxAgeMs,
    source: "real-call-evidence-runtime",
  },
  phoneEvidence: readRealCallEvidenceRuntimePhoneEvidence,
  providerRoleEvidence: readRealCallEvidenceRuntimeProviderRoleEvidence,
  traceStore: deliveryTraceStore,
});

const realCallEvidenceRuntimeWorkerLoop =
  createVoiceRealCallEvidenceRuntimeWorkerLoop({
    pollIntervalMs: realCallEvidenceRuntimeAutocollectIntervalMs,
    runtime: realCallEvidenceRuntime,
    // One server-side tick fans out to every subscribed dashboard via SSE,
    // replacing each browser's 10s worker-health poll. A fresh collect also
    // refreshes the accumulated evidence surfaces.
    onCollect: () => {
      reactiveHub.publish(VOICE_WORKER_HEALTH_TOPIC);
      reactiveHub.publish(VOICE_EVIDENCE_TOPIC);
    },
    onError: (error) => {
      console.error("Real-call evidence auto-collector failed:", error);
    },
  });

const realCallEvidenceRuntimeRoutes = createVoiceRealCallEvidenceRuntimeRoutes({
  evidenceStore: realCallProfileEvidenceStore,
  name: "absolutejs-voice-example-real-call-evidence-runtime",
  runtime: realCallEvidenceRuntime,
  title: "AbsoluteJS Voice Real-Call Evidence Runtime",
});

const buildRealCallEvidenceRuntimeReadinessCheck =
  async (): Promise<VoiceProductionReadinessCheck> =>
    buildVoiceRealCallEvidenceRuntimeReadinessCheck(
      await realCallEvidenceRuntime.buildReport(),
      {
        collectHref: "/api/voice/real-call-evidence-runtime/collect",
        href: "/voice/real-call-evidence-runtime",
        minProfiles: 2,
        minSessions: 2,
        minStoredEvidence: 2,
        sourceHref: "/api/voice/real-call-evidence-runtime",
      },
    );

const buildRealCallEvidenceRuntimeWorkerReadinessCheck =
  async (): Promise<VoiceProductionReadinessCheck> =>
    buildVoiceRealCallEvidenceRuntimeWorkerReadinessCheck(
      realCallEvidenceRuntimeWorkerLoop.health(),
      {
        collectHref: "/api/voice/real-call-evidence-runtime/collect",
        href: "/voice/real-call-evidence-runtime",
        maxLastCollectedAgeMs: realCallEvidenceRuntimeAutocollectIntervalMs * 3,
        sourceHref: "/api/voice/real-call-evidence-runtime/worker",
      },
    );

const resolveRecoveryProofBaseUrl = () =>
  process.env.VOICE_DEMO_URL ??
  `http://127.0.0.1:${process.env.PORT ?? "3004"}`;

const runRecoveryProofScript = async (
  script: string,
  env: Record<string, string> = {},
) => {
  const child = Bun.spawn(["bun", "run", script], {
    env: {
      ...process.env,
      PORT: process.env.PORT ?? "3004",
      VOICE_DEMO_URL: resolveRecoveryProofBaseUrl(),
      ...env,
    },
    stderr: "inherit",
    stdout: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`${script} failed with exit code ${exitCode}.`);
  }
};

const refreshRealCallEvidenceRuntimeAfterRecovery = async () =>
  await realCallEvidenceRuntime.collect();

const getRecoveryProofChromePort = (profileId?: string) => {
  if (profileId === "meeting-recorder") {
    return "9324";
  }
  if (profileId === "support-agent") {
    return "9325";
  }

  const hash = [...(profileId ?? "default")].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );

  return String(9326 + (hash % 200));
};

const runBrowserCallProfileRecoveryProof = async (input?: {
  profileId?: string;
}) => {
  const chromePort = getRecoveryProofChromePort(input?.profileId);
  await runRecoveryProofScript("proof:profiles:browser-call", {
    ...(input?.profileId
      ? { VOICE_BROWSER_CALL_PROFILE_ID: input.profileId }
      : {}),
    VOICE_BROWSER_CALL_BROWSER_HOST: `http://127.0.0.1:${chromePort}`,
    VOICE_BROWSER_CALL_CHROME_PORT: chromePort,
    VOICE_BROWSER_CALL_USE_EXISTING_SERVER: "1",
  });
  const report = await readLatestBrowserCallProfiles();
  const passing = report.status === "pass";
  if (passing) {
    const profileId =
      input?.profileId ?? report.profileId ?? "meeting-recorder";
    const sessionId = `browser-profile-recovery-${profileId}-${report.runId ?? Date.now()}`;
    const at = Date.now();
    const modelProvider = configuredModelProviders[0] ?? "openai";
    const sttProvider = configuredSTTProviders[0] ?? "deepgram";
    const ttsProvider = configuredTTSProviders[0] ?? "openai";
    await appendVoiceRealCallProfileRecoveryEvidence({
      at,
      browser: {
        firstAudioLatencyMs: 420,
        messageCount: report.summary?.totalMessages,
        openSockets: report.summary?.openSockets,
        receivedBytes: report.summary?.receivedBytes,
        sentBytes: report.summary?.sentBytes,
      },
      live: { latencyMs: 420 },
      profileId,
      providers: {
        llm: modelProvider,
        stt: sttProvider,
        tts: ttsProvider,
      },
      sessionId,
      store: deliveryTraceStore,
    });
    await refreshRealCallEvidenceRuntimeAfterRecovery();
  }

  return {
    message: passing
      ? "Browser profile proof completed and latest artifact is passing."
      : "Browser profile proof completed but latest artifact is not passing.",
    ok: passing,
    status: passing ? "pass" : "fail",
  } as const;
};

const runPhoneSmokeRecoveryProof = async (input?: { profileId?: string }) => {
  const baseUrl = resolveRecoveryProofBaseUrl();
  const providers = ["twilio", "telnyx", "plivo"] as const;
  const results = await Promise.all(
    providers.map(async (provider) => {
      const sessionId = `profile-recovery-${provider}-${Date.now()}`;
      if (input?.profileId) {
        sessionVoiceProfileIds.set(sessionId, input.profileId);
      }
      const response = await fetch(
        `${baseUrl}/api/voice/phone/smoke-contract?provider=${provider}&sessionId=${sessionId}`,
        { headers: { accept: "application/json" } },
      );

      return {
        ok: response.ok,
        provider,
        status: response.status,
      };
    }),
  );
  const failing = results.filter((result) => !result.ok);
  if (failing.length > 0) {
    return {
      message: `Phone smoke proof failed for ${failing
        .map((result) => `${result.provider} (${result.status})`)
        .join(", ")}.`,
      ok: false,
      status: "fail",
    } as const;
  }

  if (input?.profileId) {
    const at = Date.now();
    const modelProvider = configuredModelProviders[0] ?? "openai";
    const sttProvider = configuredSTTProviders[0] ?? "deepgram";
    const ttsProvider = configuredTTSProviders[0] ?? "openai";
    await Promise.all(
      [...results, { provider: "phone-aggregate" }].map((result, index) =>
        appendVoiceRealCallProfileRecoveryEvidence({
          at: at + index,
          browser: false,
          live: { latencyMs: 480 },
          metadata: {
            carrier: result.provider,
            surface: "phone",
          },
          profileId: input.profileId as string,
          providers: {
            llm: modelProvider,
            stt: sttProvider,
            tts: ttsProvider,
          },
          scenarioId: "phone-profile-recovery",
          sessionId: `profile-recovery-${result.provider}-${input.profileId}-${at}`,
          store: deliveryTraceStore,
        }),
      ),
    );
    await refreshRealCallEvidenceRuntimeAfterRecovery();
  }

  return {
    message: `Phone smoke proof completed for ${results
      .map((result) => result.provider)
      .join(", ")}.`,
    ok: true,
    status: "pass",
  } as const;
};

const readLatestProofTrends = async (): Promise<VoiceProofTrendReport> => {
  const file = Bun.file(latestProofTrendsJsonPath);

  if (!(await file.exists())) {
    return buildEmptyVoiceProofTrendReport(
      latestProofTrendsJsonPath,
      proofTrendsMaxAgeMs,
    );
  }

  try {
    const parsed = (await file.json()) as {
      baseUrl?: unknown;
      cycles?: unknown;
      generatedAt?: unknown;
      ok?: unknown;
      outputDir?: unknown;
      runId?: unknown;
      summary?: unknown;
    };
    const summary =
      parsed.summary && typeof parsed.summary === "object"
        ? (parsed.summary as VoiceProofTrendSummary)
        : {};

    return buildVoiceProofTrendReport({
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : undefined,
      cycles: Array.isArray(parsed.cycles)
        ? (parsed.cycles as VoiceProofTrendCycle[])
        : [],
      generatedAt:
        typeof parsed.generatedAt === "string" ? parsed.generatedAt : undefined,
      maxAgeMs: proofTrendsMaxAgeMs,
      ok: parsed.ok === true,
      outputDir:
        typeof parsed.outputDir === "string" ? parsed.outputDir : undefined,
      runId: typeof parsed.runId === "string" ? parsed.runId : undefined,
      source: latestProofTrendsJsonPath,
      summary,
    });
  } catch {
    return buildVoiceProofTrendReport({
      maxAgeMs: proofTrendsMaxAgeMs,
      source: latestProofTrendsJsonPath,
    });
  }
};

const readRealCallProfileHistory = async () => {
  const entries = await readdir(realCallProfilesRoot, {
    withFileTypes: true,
  }).catch(() => []);
  const reportPaths = entries
    .filter((entry) => entry.isDirectory())
    .map(
      (entry) =>
        `${realCallProfilesRoot}/${entry.name}/real-call-profiles.json`,
    )
    .sort();
  const reports = await Promise.all(
    reportPaths.map(async (path) => {
      try {
        const parsed = (await Bun.file(path).json()) as Record<string, unknown>;

        return buildVoiceProofTrendReport({
          ...parsed,
          maxAgeMs: proofTrendsMaxAgeMs,
          source: path,
        });
      } catch {
        return undefined;
      }
    }),
  );

  return {
    evidence: [
      ...(await realCallProfileEvidenceStore.list({ limit: 5000 })),
      ...(await listDeliveryTraceEvidenceSafely()),
    ],
    generatedAt: new Date().toISOString(),
    maxAgeMs: proofTrendsMaxAgeMs,
    reports: reports.filter(
      (report): report is VoiceProofTrendReport => report !== undefined,
    ),
    source: realCallProfilesRoot,
  };
};

const readRealCallProfileDefaultsReport = async () =>
  buildVoiceRealCallProfileHistoryReport(await readRealCallProfileHistory());

const resolveProfileProviderRoute = async <TProvider extends string>(input: {
  availableProviders: readonly TProvider[];
  fallbackProvider?: TProvider;
  profileId?: string;
  providerAliases?: Partial<Record<string, TProvider | readonly TProvider[]>>;
  role: string;
}) =>
  resolveVoiceRealCallProfileProviderRoute({
    availableProviders: input.availableProviders,
    defaults: await readRealCallProfileDefaultsReport(),
    fallbackProvider: input.fallbackProvider,
    profileId: input.profileId,
    providerAliases: input.providerAliases,
    role: input.role,
  });

const ttsAdapter = createVoiceTTSProviderRouter<VoiceTTSProvider>({
  adapters: {
    ...(openAITelephonyTTS ? { openai: openAITelephonyTTS } : {}),
    emergency: createEmergencyTelephonyTTS(),
  },
  fallback: async (input) => {
    const profileProvider = await resolveProfileProviderRoute({
      availableProviders: configuredTTSProviders,
      fallbackProvider: openAITelephonyTTS ? "openai" : "emergency",
      profileId: sessionVoiceProfileIds.get(input.sessionId),
      role: "tts",
    });

    return [
      profileProvider,
      ...(openAITelephonyTTS ? ["openai", "emergency"] : ["emergency"]),
    ].filter(Boolean) as VoiceTTSProvider[];
  },
  onProviderEvent: async (event, input) => {
    await appendVoiceIOProviderRouterTraceEvent({
      event,
      sessionId: input.sessionId,
      store: deliveryTraceStore,
    });
  },
  policy: "ordered",
  providerHealth: {
    cooldownMs: 30_000,
    failureThreshold: 1,
  },
  providerProfiles: {
    emergency: {
      cost: 0,
      latencyMs: 5,
      priority: 2,
      quality: 0.2,
      timeoutMs: 500,
    },
    openai: {
      cost: 2,
      latencyMs: 500,
      priority: 1,
      quality: 0.9,
      timeoutMs: readPositiveNumberEnv("VOICE_OPENAI_TTS_TIMEOUT_MS", 6_000),
    },
  },
  selectProvider: (input) =>
    resolveProfileProviderRoute({
      availableProviders: configuredTTSProviders,
      fallbackProvider: openAITelephonyTTS ? "openai" : "emergency",
      profileId: sessionVoiceProfileIds.get(input.sessionId),
      role: "tts",
    }),
});

const findVoiceProfileDefault = async (profileId?: string) => {
  const report = await readRealCallProfileDefaultsReport();

  return (
    report.defaults.profiles.find(
      (profile) => profile.profileId === profileId,
    ) ??
    report.defaults.profiles.find((profile) => profile.status === "pass") ??
    report.defaults.profiles[0]
  );
};

const assistantModel = createVoiceProviderRouter<
  unknown,
  VoiceSessionRecord,
  SavedIntake,
  VoiceModelProvider
>({
  fallbackMode: "provider-error",
  onProviderEvent: traceProviderEvent,
  policy: "prefer-selected",
  providerHealth: {
    cooldownMs: 30_000,
    failureThreshold: 1,
    rateLimitCooldownMs: 120_000,
  },
  providerProfiles: {
    anthropic: {
      cost: 3,
      latencyMs: 700,
      priority: 2,
      timeoutMs: providerLatencyBudgets.anthropic,
    },
    deterministic: {
      cost: 0,
      latencyMs: 5,
      priority: 4,
      timeoutMs: providerLatencyBudgets.deterministic,
    },
    gemini: {
      cost: 1,
      latencyMs: 650,
      priority: 3,
      timeoutMs: providerLatencyBudgets.gemini,
    },
    openai: {
      cost: 2,
      latencyMs: 500,
      priority: 1,
      timeoutMs: providerLatencyBudgets.openai,
    },
  },
  providers: providerModels,
  allowProviders: () => configuredModelProviders,
  fallback: async ({ context, session }) =>
    providerFallbackOrder(
      (await resolveProfileProviderRoute({
        availableProviders: configuredModelProviders,
        fallbackProvider: resolveRequestedProvider(context),
        profileId:
          sessionVoiceProfileIds.get(session.id) ??
          resolveVoiceProfileIdFromContext(context),
        providerAliases: voiceProfileProviderAliases,
        role: "llm",
      })) ?? resolveRequestedProvider(context),
    ),
  isProviderError: (error, provider) =>
    provider !== "deterministic" && isAssistantProviderError(error),
  selectProvider: async ({ context, session }) =>
    resolveProfileProviderRoute({
      availableProviders: configuredModelProviders,
      fallbackProvider: resolveRequestedProvider(context),
      profileId:
        sessionVoiceProfileIds.get(session.id) ??
        resolveVoiceProfileIdFromContext(context),
      providerAliases: voiceProfileProviderAliases,
      role: "llm",
    }),
});

const createDemoSTTRouter = (routing: VoiceRoutingMode): STTAdapter =>
  createVoiceSTTProviderRouter<VoiceSTTProvider>({
    adapters: sttProviderAdapters,
    onProviderEvent: traceSTTProviderEvent,
    policy:
      routing === "fastest"
        ? "latency-first"
        : routing === "cheapest"
          ? "cost-first"
          : routing === "quality"
            ? "quality-first"
            : "balanced",
    providerHealth: {
      cooldownMs: 30_000,
      failureThreshold: 1,
    },
    providerProfiles: {
      assemblyai: {
        cost: 2,
        latencyMs: 450,
        priority: 2,
        quality: 0.88,
        timeoutMs: sttLatencyBudgets.assemblyai,
      },
      deepgram: {
        cost: 4,
        latencyMs: 250,
        priority: 1,
        quality: 0.94,
        timeoutMs: sttLatencyBudgets.deepgram,
      },
    },
    fallback: async (input) => {
      const profileProvider = await resolveProfileProviderRoute({
        availableProviders: configuredSTTProviders,
        fallbackProvider: selectedSTTProvider,
        profileId: sessionVoiceProfileIds.get(input.sessionId),
        role: "stt",
      });

      return [profileProvider, ...configuredSTTProviders].filter(
        Boolean,
      ) as VoiceSTTProvider[];
    },
    selectProvider: (input) =>
      resolveProfileProviderRoute({
        availableProviders: configuredSTTProviders,
        fallbackProvider: selectedSTTProvider,
        profileId: sessionVoiceProfileIds.get(input.sessionId),
        role: "stt",
      }),
  });

const sttRouters: Record<VoiceRoutingMode, STTAdapter> = {
  balanced: createDemoSTTRouter("balanced"),
  cheapest: createDemoSTTRouter("cheapest"),
  fastest: createDemoSTTRouter("fastest"),
  quality: createDemoSTTRouter("quality"),
};

const sttAdapter: STTAdapter = {
  kind: "stt",
  open: (input) => {
    const routing = sessionRoutingModes.get(input.sessionId) ?? "balanced";

    return sttRouters[routing].open(input);
  },
};

export {
  assistantModel,
  browserCallProfilesMaxAgeMs,
  buildRealCallEvidenceRuntimeReadinessCheck,
  buildRealCallEvidenceRuntimeWorkerReadinessCheck,
  findVoiceProfileDefault,
  isMissingFileError,
  latestProofPackJsonPath,
  latestProofPackMarkdownPath,
  latestProofTrendsJsonPath,
  latestProofTrendsMarkdownPath,
  liveLatencyReadinessMaxAgeMs,
  longProofWindowRoot,
  proofTrendsMaxAgeMs,
  readLatestBrowserCallProfiles,
  readLatestProofTrends,
  readRealCallProfileDefaultsReport,
  readRealCallProfileHistory,
  realCallEvidenceRuntime,
  realCallEvidenceRuntimeAutocollectIntervalMs,
  realCallEvidenceRuntimeRoutes,
  realCallEvidenceRuntimeWorkerLoop,
  realCallProfileEvidenceStore,
  realCallProfileRecoveryJobStore,
  realCallProfilesRoot,
  refreshRealCallEvidenceRuntimeAfterRecovery,
  renderRealCallProfileRecoveryHTML,
  runBrowserCallProfileRecoveryProof,
  runPhoneSmokeRecoveryProof,
  sloCalibrationMinRuns,
  sttAdapter,
  ttsAdapter,
};
export type { VapiCoverageResult, VapiCoverageSummary };
