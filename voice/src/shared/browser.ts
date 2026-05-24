import {
  createMicrophoneCapture,
  createVoiceAudioPlayer,
  createVoiceBargeInMonitor,
  createVoiceLiveTurnLatencyMonitor,
  postVoiceLiveOpsAction as postCoreVoiceLiveOpsAction,
  type VoiceLiveTurnLatencyMonitorOptions,
  type VoiceLiveTurnLatencySnapshot,
} from "@absolutejs/voice/client";
import type {
  VoiceAudioPlayer,
  VoiceBargeInMonitor,
  VoiceBargeInReport,
  VoiceOpsStatusReport,
  VoiceRealCallEvidenceRuntimeWorkerHealthReport,
  VoiceReconnectClientState,
  VoiceStreamState,
} from "@absolutejs/voice";
import type { VoiceReactiveSource } from "@absolutejs/voice/client";
import { createSyncSubscriber } from "@absolutejs/sync/client";
import { VOICE_SYNC_PATH } from "../constants/sync";
import { VOICE_LIVE_OPS_ACTIONS } from "../constants/demoActions";
import {
  VOICE_WAVE_HEIGHT,
  VOICE_WAVE_POINTS,
  VOICE_WAVE_WIDTH,
} from "../constants/waveform";
import type {
  SavedIntake,
  VoiceAgentSquadDemoStatus,
  VoiceLiveOpsAction,
  VoiceLiveOpsActionResult,
} from "../types/domain";

// Bridges a @absolutejs/sync SSE topic to a voice widget store's reactiveSource:
// the store calls refresh() whenever the server pushes that topic, with no
// polling timer. Hand this to any widget's `reactiveSource` prop/option in place
// of `intervalMs`. The store invokes the returned cleanup on close.
export const voiceReactiveSource =
  (topic: string): VoiceReactiveSource =>
  (refresh) => {
    const subscriber = createSyncSubscriber({
      onEvent: refresh,
      topics: [topic],
      url: VOICE_SYNC_PATH,
    });

    return () => subscriber.close();
  };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const getPcmLevel = (audio: Uint8Array | ArrayBuffer) => {
  const bytes = audio instanceof Uint8Array ? audio : new Uint8Array(audio);

  if (bytes.byteLength < 2) {
    return 0;
  }

  const samples = new Int16Array(
    bytes.buffer,
    bytes.byteOffset,
    Math.floor(bytes.byteLength / 2),
  );

  if (samples.length === 0) {
    return 0;
  }

  let sumSquares = 0;

  for (const sample of samples) {
    const normalized = sample / 0x8000;
    sumSquares += normalized * normalized;
  }

  const rms = Math.sqrt(sumSquares / samples.length);

  return clamp(rms * 5.5, 0, 1);
};

const readErrorField = (
  value: Record<string, unknown>,
  key: string,
): string | null => {
  const candidate = value[key];

  if (typeof candidate === "string" && candidate.trim()) {
    return candidate;
  }

  return null;
};

export const createDemoMicrophone = (
  onAudio: (audio: Uint8Array | ArrayBuffer) => void,
  onLevel?: (level: number) => void,
  options: { sampleRateHz?: number } = {},
) => {
  let capture: ReturnType<typeof createMicrophoneCapture> | null = null;

  return {
    start: async () => {
      if (capture) {
        return;
      }

      if (typeof createMicrophoneCapture !== "function") {
        throw new Error(
          "@absolutejs/voice/client did not provide createMicrophoneCapture. Reinstall @absolutejs/voice and restart the dev server.",
        );
      }

      const nextCapture = createMicrophoneCapture({
        sampleRateHz: options.sampleRateHz ?? 16_000,
        onAudio: (audio) => {
          onLevel?.(getPcmLevel(audio));
          onAudio(audio);
        },
      });

      capture = nextCapture;

      try {
        await capture.start();
      } catch (error) {
        capture = null;
        throw error;
      }
    },
    stop: () => {
      capture?.stop();
      capture = null;
      onLevel?.(0);
    },
  };
};
export const createInitialVoiceWaveLevels = (count = VOICE_WAVE_POINTS) =>
  Array.from({ length: count }, () => 0);
export const createVoiceWavePath = (
  levels: number[],
  width = VOICE_WAVE_WIDTH,
  height = VOICE_WAVE_HEIGHT,
) => {
  const samples =
    levels.length > 1
      ? levels
      : createInitialVoiceWaveLevels(VOICE_WAVE_POINTS);
  const step = width / (samples.length - 1);
  const center = height / 2;
  const maxAmplitude = height * 0.34;
  const peakLevel = Math.max(...samples, 0);

  if (peakLevel <= 0.015) {
    return `M 0 ${center} L ${width} ${center}`;
  }

  const points = samples.map((level, index) => {
    const phase = index * 0.76;
    const wobble = Math.sin(phase) * 0.78 + Math.sin(phase * 0.41) * 0.22;
    const amplitude = level * maxAmplitude;
    const x = step * index;
    const y = clamp(center + wobble * amplitude, 8, height - 8);

    return { x, y };
  });

  if (points.length === 0) {
    return `M 0 ${center} L ${width} ${center}`;
  }

  let path = `M ${points[0]?.x ?? 0} ${points[0]?.y ?? center}`;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (!previous || !current) {
      continue;
    }

    const controlX = (previous.x + current.x) / 2;
    path += ` Q ${controlX} ${previous.y} ${current.x} ${current.y}`;
  }

  return path;
};
export const fetchAgentSquadDemoStatus = async (sessionId?: string) => {
  const url = new URL("/api/agent-squad/status", window.location.origin);
  if (sessionId) {
    url.searchParams.set("sessionId", sessionId);
  }

  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as VoiceAgentSquadDemoStatus;
};
export const fetchBargeInReport = async () => {
  const response = await fetch("/api/voice-barge-in");

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as VoiceBargeInReport;
};
export const fetchSavedIntakes = async () => {
  const response = await fetch("/api/intakes");

  if (!response.ok) {
    return [] as SavedIntake[];
  }

  return (await response.json()) as SavedIntake[];
};
export const fetchVoiceRealCallEvidenceWorkerHealth = async (
  path = "/api/voice/real-call-evidence-runtime/worker",
) => {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Worker health request failed with ${response.status}`);
  }

  return (await response.json()) as VoiceRealCallEvidenceRuntimeWorkerHealthReport;
};
export const formatDateTime = (value: number) =>
  new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
export const formatErrorMessage = (error: unknown): string => {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const direct =
      readErrorField(record, "message") ??
      readErrorField(record, "reason") ??
      readErrorField(record, "description");

    if (direct) {
      return direct;
    }

    if ("error" in record) {
      return formatErrorMessage(record.error);
    }

    if ("cause" in record) {
      return formatErrorMessage(record.cause);
    }

    try {
      return JSON.stringify(error);
    } catch {}
  }

  return "Unexpected error";
};
export const formatReconnectState = (reconnect: VoiceReconnectClientState) => {
  const pieces: string[] = [reconnect.status];

  if (reconnect.attempts > 0 || reconnect.maxAttempts > 0) {
    pieces.push(`${reconnect.attempts}/${reconnect.maxAttempts} attempts`);
  }

  if (reconnect.nextAttemptAt) {
    const waitMs = Math.max(0, reconnect.nextAttemptAt - Date.now());
    pieces.push(`retry in ${Math.ceil(waitMs / 100) / 10}s`);
  }

  return pieces.join(" · ");
};
export const getOpsStatusLabel = (report?: VoiceOpsStatusReport | null) => {
  if (!report) {
    return "Checking";
  }

  return report.status === "pass" ? "Passing" : "Needs attention";
};
export const mountVoiceRealCallEvidenceWorkerHealth = (
  element: Element | null,
  path = "/api/voice/real-call-evidence-runtime/worker",
  options: {
    description?: string;
    intervalMs?: number;
    title?: string;
  } = {},
) => {
  let closed = false;
  let timer: number | undefined;

  const render = async () => {
    if (!(element instanceof HTMLElement) || closed) {
      return;
    }

    try {
      const health = await fetchVoiceRealCallEvidenceWorkerHealth(path);
      element.innerHTML = renderVoiceRealCallEvidenceWorkerHealthHTML(health, {
        description: options.description,
        title: options.title,
      });
    } catch (error) {
      element.innerHTML = renderVoiceRealCallEvidenceWorkerHealthHTML(null, {
        description: options.description,
        error: formatErrorMessage(error),
        title: options.title,
      });
    }
  };

  void render();
  timer = window.setInterval(render, options.intervalMs ?? 10_000);

  return {
    refresh: render,
    close: () => {
      closed = true;
      if (timer !== undefined) {
        window.clearInterval(timer);
      }
    },
  };
};
export const pushVoiceWaveLevel = (
  levels: number[],
  nextLevel: number,
  count = VOICE_WAVE_POINTS,
) => {
  const next = levels.slice(-(count - 1));
  next.push(clamp(nextLevel, 0, 1));

  while (next.length < count) {
    next.unshift(0);
  }

  return next;
};
export const reloadWithVoiceSearchParam = (param: string, value: string) => {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set(param, value);
  window.location.href = nextUrl.toString();
};
export const renderVoiceRealCallEvidenceWorkerHealthHTML = (
  health: VoiceRealCallEvidenceRuntimeWorkerHealthReport | null,
  options: {
    description?: string;
    error?: string | null;
    title?: string;
  } = {},
) => {
  const title = options.title ?? "Real-Call Evidence Collector";
  const description =
    options.description ??
    "Shows whether rolling real-call evidence is being collected automatically or only when manually triggered.";

  if (options.error) {
    return `<span class="voice-framework-pill">${escapeHtml(title)}</span>
<h2>Collector status unavailable</h2>
<p class="voice-footnote">${escapeHtml(options.error)}</p>
<p class="voice-footnote"><a href="/api/voice/real-call-evidence-runtime/worker">Open worker JSON</a></p>`;
  }

  if (!health) {
    return `<span class="voice-framework-pill">${escapeHtml(title)}</span>
<h2>Checking collector</h2>
<p class="voice-footnote">${escapeHtml(description)}</p>`;
  }

  const mode = health.isRunning ? "Automatic" : "Manual";
  const headline = health.isRunning
    ? "Auto-collector running"
    : "Manual evidence collection";
  const lastCollected = health.lastCollectedAt
    ? new Date(health.lastCollectedAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not collected yet";
  const lastTick = health.lastTickAt
    ? new Date(health.lastTickAt).toLocaleTimeString("en-US", {
        timeStyle: "short",
      })
    : "No tick yet";

  return `<span class="voice-framework-pill">${escapeHtml(title)}</span>
<h2>${headline}</h2>
<p class="voice-footnote">${escapeHtml(description)}</p>
<div class="voice-provider-health-list">
  <div class="voice-provider-health-item">
    <strong>Mode</strong>
    <span>${escapeHtml(mode)}</span>
    <small>${health.isRunning ? "Continuous runtime evidence is enabled." : "Set VOICE_REAL_CALL_EVIDENCE_AUTOCOLLECT=1 to run continuously."}</small>
  </div>
  <div class="voice-provider-health-item">
    <strong>Collections</strong>
    <span>${String(health.collectCount)}</span>
    <small>Last collected: ${escapeHtml(lastCollected)}</small>
  </div>
  <div class="voice-provider-health-item">
    <strong>State</strong>
    <span>${escapeHtml(health.status)}</span>
    <small>Last tick: ${escapeHtml(lastTick)}</small>
  </div>
</div>
${health.error ? `<p class="voice-footnote">${escapeHtml(health.error)}</p>` : ""}
<p class="voice-footnote"><a href="/voice/real-call-evidence-runtime">Open evidence runtime</a> · <a href="/api/voice/real-call-evidence-runtime/worker">Worker JSON</a></p>`;
};

const formatLatency = (value?: number) =>
  typeof value === "number" ? `${Math.round(value)}ms` : "Not measured";

const createBargeInTestChunk = () => {
  const sampleRateHz = 16_000;
  const durationSeconds = 5;
  const sampleCount = sampleRateHz * durationSeconds;
  const chunk = new Uint8Array(sampleCount * 2);
  const view = new DataView(chunk.buffer);

  for (let index = 0; index < sampleCount; index += 1) {
    const seconds = index / sampleRateHz;
    const carrier = Math.sin(2 * Math.PI * 440 * seconds);
    const pulse = 0.55 + 0.25 * Math.sin(2 * Math.PI * 2.2 * seconds);
    const fadeIn = Math.min(1, seconds / 0.08);
    const fadeOut = Math.min(1, (durationSeconds - seconds) / 0.18);
    const sample = Math.max(
      -1,
      Math.min(1, carrier * pulse * fadeIn * fadeOut),
    );
    view.setInt16(index * 2, Math.round(sample * 0x7fff), true);
  }

  return {
    chunk,
    format: {
      channels: 1 as const,
      container: "raw" as const,
      encoding: "pcm_s16le" as const,
      sampleRateHz,
    },
    receivedAt: Date.now(),
    turnId: "barge-in-test",
  };
};

const formatBargeInStatus = (status?: VoiceBargeInReport["status"]) => {
  if (!status || status === "empty") {
    return {
      className: "empty",
      copy: "Waiting for an interruption",
      label: "No proof yet",
    };
  }

  if (status === "pass") {
    return {
      className: "pass",
      copy: "Assistant playback stopped inside the latency budget.",
      label: "Barge-in passing",
    };
  }

  if (status === "warn") {
    return {
      className: "warn",
      copy: "Interruption was detected but playback stop latency is not complete.",
      label: "Needs a full playback interruption",
    };
  }

  return {
    className: "fail",
    copy: "At least one interruption missed the latency budget.",
    label: "Barge-in failing",
  };
};

export const mountDemoBargeInProof = (
  element: HTMLElement,
  options: { intervalMs?: number } = {},
) => {
  let isClosed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let report: VoiceBargeInReport | null = null;
  let errorMessage: string | null = null;
  let testState: "idle" | "running" | "done" = "idle";
  let testPlayer: VoiceAudioPlayer | null = null;
  let testCapture: ReturnType<typeof createMicrophoneCapture> | null = null;

  const render = () => {
    element.innerHTML = renderDemoBargeInProofHTML(report, {
      error: errorMessage,
      testState,
    });
  };

  const refresh = async () => {
    try {
      report = await fetchBargeInReport();
      errorMessage = null;
      if (!isClosed) {
        render();
      }
    } catch (error) {
      errorMessage = formatErrorMessage(error);
      if (!isClosed) {
        render();
      }
    }
  };

  const stopTest = () => {
    testCapture?.stop();
    testCapture = null;
  };

  const runTest = async () => {
    if (testState === "running") {
      return;
    }

    const monitor = createVoiceBargeInMonitor({
      path: "/api/voice-barge-in",
      thresholdMs: 250,
    });
    const assistantAudio = [createBargeInTestChunk()];
    let hasInterrupted = false;

    testState = "running";
    errorMessage = null;
    render();
    stopTest();
    void testPlayer?.close();
    testPlayer = createVoiceAudioPlayer({
      assistantAudio,
      subscribe: () => () => {},
    });

    try {
      testCapture = createMicrophoneCapture({
        sampleRateHz: 16_000,
        onAudio: (audio) => {
          if (
            hasInterrupted ||
            !testPlayer?.isPlaying ||
            getPcmLevel(audio) < 0.04
          ) {
            return;
          }

          hasInterrupted = true;
          stopTest();
          monitor.recordRequested({
            reason: "manual-audio",
            sessionId: "barge-in-proof-test",
          });
          void testPlayer.interrupt().then(() => {
            monitor.recordStopped({
              latencyMs: testPlayer?.lastInterruptLatencyMs,
              playbackStopLatencyMs: testPlayer?.lastPlaybackStopLatencyMs,
              reason: "manual-audio",
              sessionId: "barge-in-proof-test",
            });
            testState = "done";
            void refresh();
          });
        },
      });

      await testCapture.start();
      await testPlayer.start();
      setTimeout(() => {
        if (hasInterrupted || isClosed) {
          return;
        }

        stopTest();
        monitor.recordSkipped({
          reason: "manual-audio",
          sessionId: "barge-in-proof-test",
        });
        testState = "done";
        void refresh();
      }, 5_500);
    } catch (error) {
      stopTest();
      void testPlayer?.close();
      testState = "idle";
      errorMessage = formatErrorMessage(error);
      render();
    }
  };

  const onClick = (event: Event) => {
    const { target } = event;
    if (
      target instanceof HTMLElement &&
      target.closest("[data-barge-in-test]")
    ) {
      void runTest();
    }
  };

  element.addEventListener("click", onClick);
  render();
  void refresh();
  timer = setInterval(refresh, options.intervalMs ?? 3_000);

  return {
    refresh,
    close: () => {
      isClosed = true;
      element.removeEventListener("click", onClick);
      stopTest();
      void testPlayer?.close();
      if (timer) {
        clearInterval(timer);
      }
    },
  };
};
export const renderDemoBargeInProofHTML = (
  report: VoiceBargeInReport | null,
  input?: string | null | { error?: string | null; testState?: string | null },
) => {
  const status = formatBargeInStatus(report?.status);
  const lastEvent = report?.lastEvent;
  const sessions = report?.sessions ?? [];
  const error = typeof input === "string" ? input : input?.error;
  const testState = typeof input === "string" ? null : input?.testState;

  return `<article class="voice-card voice-barge-in-proof voice-barge-in-proof--${status.className}">
  <header class="voice-barge-in-proof__header">
    <span class="voice-framework-pill">Live Barge-in Proof</span>
    <strong>${escapeHtml(status.label)}</strong>
  </header>
  <p class="voice-footnote">${escapeHtml(error || status.copy)}</p>
  <div class="voice-barge-in-proof__actions">
    <button type="button" data-barge-in-test>
      ${testState === "running" ? "Listening - speak now" : "Try barge-in test"}
    </button>
    <span>${escapeHtml(testState === "running" ? "A local assistant test clip is playing. Talk over it." : testState === "done" ? "Test submitted. Results refresh automatically." : "Runs locally through the browser audio player.")}</span>
  </div>
  <div class="voice-barge-in-proof__grid">
    <div>
      <span>Interrupt latency</span>
      <strong>${escapeHtml(formatLatency(lastEvent?.latencyMs))}</strong>
    </div>
    <div>
      <span>Playback stop</span>
      <strong>${escapeHtml(formatLatency(lastEvent?.playbackStopLatencyMs))}</strong>
    </div>
    <div>
      <span>Passed</span>
      <strong>${report?.passed ?? 0}</strong>
    </div>
    <div>
      <span>Failed</span>
      <strong>${report?.failed ?? 0}</strong>
    </div>
  </div>
  ${
    lastEvent
      ? `<p class="voice-footnote">Last ${escapeHtml(lastEvent.status)} event: ${escapeHtml(lastEvent.reason)}${lastEvent.sessionId ? ` · ${escapeHtml(lastEvent.sessionId)}` : ""}</p>`
      : `<p class="voice-footnote">Start assistant audio, speak over it, then open this card for measured proof.</p>`
  }
  ${
    sessions.length
      ? `<div class="voice-barge-in-proof__sessions">${sessions
          .slice(0, 2)
          .map(
            (session) => `<div>
      <strong>${escapeHtml(session.sessionId)}</strong>
      <span>${session.passed} pass · ${session.failed} fail · ${escapeHtml(formatLatency(session.averageLatencyMs))}</span>
    </div>`,
          )
          .join("")}</div>`
      : ""
  }
  <a href="/barge-in">Open barge-in dashboard</a>
</article>`;
};

type DemoBargeInVoice<TResult = unknown> = Pick<
  VoiceStreamState<TResult>,
  "assistantAudio" | "assistantTexts" | "sessionId"
> & {
  sendAudio: (audio: Uint8Array | ArrayBuffer) => void;
};

export const createDemoBargeInEvidence = <TResult = unknown>(
  getVoice: () => DemoBargeInVoice<TResult>,
  options: {
    recentAssistantWindowMs?: number;
    speechThreshold?: number;
    thresholdMs?: number;
  } = {},
) => {
  const monitor: VoiceBargeInMonitor = createVoiceBargeInMonitor({
    path: "/api/voice-barge-in",
    thresholdMs: options.thresholdMs ?? 250,
  });
  const subscribers = new Set<() => void>();
  let player: VoiceAudioPlayer | null = null;
  let lastAssistantAt = 0;
  let lastAssistantAudioCount = 0;
  let lastAssistantTextCount = 0;

  const getPlayer = () => {
    if (player) {
      return player;
    }

    player = createVoiceAudioPlayer({
      get assistantAudio() {
        return getVoice().assistantAudio;
      },
      subscribe: (subscriber) => {
        subscribers.add(subscriber);

        return () => {
          subscribers.delete(subscriber);
        };
      },
    });

    return player;
  };

  const notifyAssistantOutput = () => {
    for (const subscriber of subscribers) {
      subscriber();
    }
  };

  const syncAssistantOutput = () => {
    const voice = getVoice();
    const audioCount = voice.assistantAudio.length;
    const textCount = voice.assistantTexts.length;

    if (
      audioCount > lastAssistantAudioCount ||
      textCount > lastAssistantTextCount
    ) {
      lastAssistantAt = Date.now();
    }

    lastAssistantAudioCount = audioCount;
    lastAssistantTextCount = textCount;

    if (audioCount > 0) {
      notifyAssistantOutput();
      void getPlayer()
        .start()
        .catch(() => {});
    }
  };

  const sendAudio = (audio: Uint8Array | ArrayBuffer) => {
    syncAssistantOutput();

    const voice = getVoice();
    const isRecentAssistantOutput =
      Date.now() - lastAssistantAt <=
      (options.recentAssistantWindowMs ?? 4_000);
    const isSpeechLike =
      getPcmLevel(audio) >= (options.speechThreshold ?? 0.04);

    if (isSpeechLike && player?.isPlaying) {
      monitor.recordRequested({
        reason: "manual-audio",
        sessionId: voice.sessionId,
      });
      void player.interrupt().then(() => {
        monitor.recordStopped({
          latencyMs: player?.lastInterruptLatencyMs,
          playbackStopLatencyMs: player?.lastPlaybackStopLatencyMs,
          reason: "manual-audio",
          sessionId: voice.sessionId,
        });
      });
    } else if (isRecentAssistantOutput && isSpeechLike) {
      monitor.recordSkipped({
        reason: "manual-audio",
        sessionId: voice.sessionId,
      });
    }

    voice.sendAudio(audio);
  };

  return {
    getSnapshot: monitor.getSnapshot,
    sendAudio,
    subscribe: monitor.subscribe,
    syncAssistantOutput,
    close: () => {
      void player?.close();
      player = null;
      subscribers.clear();
    },
  };
};

type DemoLiveTurnLatencyVoice<TResult = unknown> = Pick<
  VoiceStreamState<TResult>,
  "assistantAudio" | "assistantTexts" | "sessionId"
>;

const formatLatencyMs = (value?: number) =>
  typeof value === "number" ? `${Math.round(value)}ms` : "n/a";

export const createDemoLiveTurnLatencyEvidence = <TResult = unknown>(
  getVoice: () => DemoLiveTurnLatencyVoice<TResult>,
  options: VoiceLiveTurnLatencyMonitorOptions = {},
) => {
  const monitor = createVoiceLiveTurnLatencyMonitor({
    reportPath: "/api/live-turn-latency",
    ...options,
  });
  const syncAssistantOutput = () => {
    monitor.observe(getVoice());
  };

  return {
    getSnapshot: monitor.getSnapshot,
    subscribe: monitor.subscribe,
    syncAssistantOutput,
    recordAudio: (audio: Uint8Array | ArrayBuffer) => {
      syncAssistantOutput();
      monitor.recordAudio(audio);
    },
  };
};
export const postVoiceLiveOpsAction = async (input: {
  action: VoiceLiveOpsAction;
  assignee?: string;
  detail?: string;
  sessionId: string | null | undefined;
  tag?: string;
}) =>
  (await postCoreVoiceLiveOpsAction(
    {
      ...input,
      sessionId: input.sessionId ?? "",
    },
    { actionPath: "/api/voice/live-ops/action" },
  )) as VoiceLiveOpsActionResult;
export const renderDemoLiveTurnLatencyHTML = (
  snapshot: VoiceLiveTurnLatencySnapshot,
) => {
  const label =
    snapshot.pending?.startedAt !== undefined
      ? "Measuring live turn"
      : snapshot.averageLatencyMs !== undefined
        ? `${formatLatencyMs(snapshot.averageLatencyMs)} avg`
        : "Waiting for speech";
  const last = snapshot.pending ?? snapshot.lastEvent;
  const rows: Array<[string, string]> = [
    ["Status", snapshot.status],
    ["Last live turn", formatLatencyMs(last?.latencyMs)],
    ["Target", `< ${formatLatencyMs(snapshot.thresholdMs)}`],
    ["Passed", String(snapshot.passed)],
  ];

  return `<article class="voice-card voice-live-latency-proof voice-live-latency-proof--${escapeHtml(snapshot.status)}">
  <span class="voice-framework-pill">Live Latency Proof</span>
  <h2>${escapeHtml(label)}</h2>
  <p class="voice-footnote">Measures real browser speech audio sent to the voice websocket until the next assistant audio or text is observed.</p>
  <div class="voice-live-latency-proof__grid">
    ${rows
      .map(
        ([name, value]) => `<div>
      <span>${escapeHtml(name)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>`,
      )
      .join("")}
  </div>
  ${
    last
      ? `<p class="voice-footnote">Session ${escapeHtml(last.sessionId ?? "pending")} · ${escapeHtml(last.status)}</p>`
      : `<p class="voice-footnote">Start the microphone and speak; this card updates when the assistant responds.</p>`
  }
</article>`;
};
export const renderVoiceLiveOpsResultHTML = (
  result: VoiceLiveOpsActionResult | null,
  error?: string | null,
) => {
  if (error) {
    return `<p class="voice-footnote voice-live-ops-error">${escapeHtml(error)}</p>`;
  }
  if (!result) {
    return `<p class="voice-footnote">Run an action during a live call to record trace and audit evidence.</p>`;
  }

  const control = result.control
    ? ` Control: ${escapeHtml(result.control.status)}.`
    : "";

  return `<p class="voice-footnote">Recorded ${escapeHtml(result.action)} for ${escapeHtml(result.sessionId)}.${control} <a href="${escapeHtml(result.operationsRecordHref)}">Open operations record</a> · <a href="${escapeHtml(result.incidentBundleHref)}">Export incident bundle</a>${result.taskHref ? ` · <a href="${escapeHtml(result.taskHref)}">Open tasks</a>` : ""}</p>`;
};

const renderVoiceLiveOpsPanelHTML = (input: {
  assignee?: string;
  detail?: string;
  error?: string | null;
  isRunning?: boolean;
  result?: VoiceLiveOpsActionResult | null;
  sessionId?: string | null;
  tag?: string;
}) => {
  const sessionId = input.sessionId || "No active session";
  const disabled = input.isRunning || !input.sessionId;

  return `<article class="voice-card voice-live-ops-panel">
  <span class="voice-framework-pill">Live Ops</span>
  <h2>Operator intervention</h2>
  <p class="voice-footnote">Tag, assign, pause, take over, force handoff, or inject an instruction while the voice session is still running.</p>
  <div class="voice-live-ops-panel__session"><span>Active session</span><strong>${escapeHtml(sessionId)}</strong></div>
  <label class="voice-provider-select"><span>Operator</span><input data-live-ops-assignee value="${escapeHtml(input.assignee ?? "demo-operator")}" /></label>
  <label class="voice-provider-select"><span>Tag</span><input data-live-ops-tag value="${escapeHtml(input.tag ?? "needs-review")}" /></label>
  <label class="voice-provider-select"><span>Detail</span><input data-live-ops-detail value="${escapeHtml(input.detail ?? "Operator marked this live session.")}" /></label>
  <div class="voice-actions">
    ${VOICE_LIVE_OPS_ACTIONS.map(
      (action) =>
        `<button data-live-ops-action="${action.action}" ${disabled ? "disabled" : ""} type="button">${input.isRunning ? "Running" : escapeHtml(action.label)}</button>`,
    ).join("")}
  </div>
  ${renderVoiceLiveOpsResultHTML(input.result ?? null, input.error)}
</article>`;
};

export const mountVoiceLiveOpsPanel = (
  element: HTMLElement,
  options: {
    getSessionId: () => string | null | undefined;
    onControl?: (input: {
      action: VoiceLiveOpsAction;
      assignee: string;
      detail: string;
      result: VoiceLiveOpsActionResult;
      tag: string;
    }) => void;
  },
) => {
  let assignee = "demo-operator";
  let detail = "Operator marked this live session.";
  let error: string | null = null;
  let isRunning = false;
  let result: VoiceLiveOpsActionResult | null = null;
  let tag = "needs-review";

  const syncInputs = () => {
    const assigneeInput = element.querySelector("[data-live-ops-assignee]");
    const detailInput = element.querySelector("[data-live-ops-detail]");
    const tagInput = element.querySelector("[data-live-ops-tag]");
    if (assigneeInput instanceof HTMLInputElement) {
      assignee = assigneeInput.value;
    }
    if (detailInput instanceof HTMLInputElement) {
      detail = detailInput.value;
    }
    if (tagInput instanceof HTMLInputElement) {
      tag = tagInput.value;
    }
  };

  const render = () => {
    element.innerHTML = renderVoiceLiveOpsPanelHTML({
      assignee,
      detail,
      error,
      isRunning,
      result,
      sessionId: options.getSessionId(),
      tag,
    });
  };

  const onClick = async (event: Event) => {
    const button =
      event.target instanceof Element
        ? event.target.closest("[data-live-ops-action]")
        : null;
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const action = button.dataset.liveOpsAction as
      | VoiceLiveOpsAction
      | undefined;
    if (!action) {
      return;
    }

    syncInputs();
    isRunning = true;
    error = null;
    render();

    try {
      result = await postVoiceLiveOpsAction({
        action,
        assignee,
        detail,
        sessionId: options.getSessionId(),
        tag,
      });
      options.onControl?.({
        action,
        assignee,
        detail,
        result,
        tag,
      });
    } catch (caught) {
      error = formatErrorMessage(caught);
    } finally {
      isRunning = false;
      render();
    }
  };

  const onInput = () => {
    syncInputs();
  };

  element.addEventListener("click", onClick);
  element.addEventListener("input", onInput);
  render();

  const timer = setInterval(render, 1_000);

  return {
    render,
    close: () => {
      clearInterval(timer);
      element.removeEventListener("click", onClick);
      element.removeEventListener("input", onInput);
    },
  };
};
