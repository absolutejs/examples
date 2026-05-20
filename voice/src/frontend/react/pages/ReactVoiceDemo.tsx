import { Head } from "@absolutejs/absolute/react/components";
import { useEffect, useRef, useState } from "react";
import type { VoiceTurnRecord } from "@absolutejs/voice";
import {
  useVoiceStream,
  useVoiceCampaignDialerProof,
  VoiceCallDebuggerLaunch,
  VoiceDeliveryRuntime,
  VoiceOpsActionCenter,
  VoiceOpsStatus,
  VoicePlatformCoverage,
  VoiceProfileComparison,
  VoiceReconnectProfileEvidence,
  VoiceProfileSwitchRecommendation,
  VoiceProofTrends,
  VoiceProviderCapabilities,
  VoiceProviderContracts,
  VoiceProviderSimulationControls,
  VoiceProviderStatus,
  VoiceReadinessFailures,
  VoiceRoutingStatus,
  VoiceSessionObservability,
  VoiceSessionSnapshot,
  VoiceTraceTimeline,
  VoiceTurnLatency,
  VoiceTurnQuality,
} from "@absolutejs/voice/react";
import {
  createVoiceOpsActionCenterActions,
  mountVoiceOpsActionHistory,
} from "@absolutejs/voice/client";
import {
  createInitialVoiceWaveLevels,
  createVoiceWavePath,
  createDemoBargeInEvidence,
  createDemoLiveTurnLatencyEvidence,
  createDemoMicrophone,
  fetchAgentSquadDemoStatus,
  fetchVoiceRealCallEvidenceWorkerHealth,
  fetchSavedIntakes,
  formatErrorMessage,
  formatDateTime,
  formatReconnectState,
  mountDemoBargeInProof,
  mountVoiceLiveOpsPanel,
  pushVoiceWaveLevel,
  renderDemoLiveTurnLatencyHTML,
  renderVoiceRealCallEvidenceWorkerHealthHTML,
} from "../../shared/browser";
import {
  FRAMEWORKS,
  FRAMEWORK_DESCRIPTIONS,
  getVoiceLeadMessage,
  getVoiceModeLabel,
  getVoiceModePrompt,
  getVoiceProfileLabel,
  getVoiceProfileSwitchGuardDecision,
  getVoiceProviderLabel,
  getVoiceRoutingLabel,
  getVoiceRoutePath,
  getVoiceSpeechEngineSampleRate,
  formatVoiceProfileSwitchGuardLabel,
  formatVoiceProfileSwitchGuardSummary,
  rememberVoiceModelProvider,
  rememberVoiceProfileId,
  rememberVoiceRoutingMode,
  rememberVoiceSpeechEngine,
  VOICE_ASSISTANT_CONFIG,
  VOICE_DEMO_GUIDE_STEPS,
  VOICE_DEMO_GUIDE_TITLE,
  VOICE_DEMO_GENERAL_LABEL,
  VOICE_DEMO_GUIDED_LABEL,
  VOICE_DEMO_MIC_IDLE,
  VOICE_DEMO_MIC_LIVE,
  VOICE_DEMO_STOP_LABEL,
  VOICE_CALL_CONTROL_ACTIONS,
  VOICE_MODEL_PROVIDERS,
  VOICE_PROOF_DASHBOARDS,
  VOICE_PROFILES,
  VOICE_ROUTING_MODES,
  VOICE_SPEECH_ENGINES,
  type VoiceDemoMode,
  type VoiceModelProvider,
  type VoiceProfileId,
  type VoiceRoutingMode,
  type VoiceSpeechEngine,
  type VoiceAgentSquadDemoStatus,
  type SavedIntake,
} from "../../../shared/demo";

type ReactVoiceDemoProps = {
  cssPath?: string;
  initialModelProvider?: VoiceModelProvider;
  initialProfileId?: VoiceProfileId;
  initialRoutingMode?: VoiceRoutingMode;
  initialSpeechEngine?: VoiceSpeechEngine;
};

type ReactVoiceDemoStream = ReturnType<typeof useVoiceStream<SavedIntake>>;
type VoiceDemoWindow = typeof window & {
  __absoluteVoiceDemoSimulateDisconnect?: () => void;
};

const EMPTY_VOICE: ReactVoiceDemoStream = {
  assistantTexts: [] as string[],
  assistantAudio: [] as Array<{
    chunk: Uint8Array;
    format: {
      channels: 1 | 2;
      container: "raw";
      encoding: "alaw" | "mulaw" | "pcm_s16le";
      sampleRateHz: number;
    };
    receivedAt: number;
    turnId?: string;
  }>,
  call: null,
  callControl: () => {},
  close: () => {},
  endTurn: () => {},
  error: null as string | null,
  isConnected: false,
  partial: "",
  reconnect: {
    attempts: 0,
    maxAttempts: 0,
    status: "idle",
  },
  scenarioId: null as string | null,
  sendAudio: (_audio: Uint8Array | ArrayBuffer) => {},
  sessionMetadata: null,
  sessionId: "",
  simulateDisconnect: () => {},
  status: "idle" as const,
  turns: [] as VoiceTurnRecord<SavedIntake>[],
};

export const ReactVoiceDemo = ({
  cssPath,
  initialModelProvider = "deterministic",
  initialProfileId = "meeting-recorder",
  initialRoutingMode = "balanced",
  initialSpeechEngine = "cascaded",
}: ReactVoiceDemoProps) => {
  const microphoneRef = useRef<ReturnType<typeof createDemoMicrophone> | null>(
    null,
  );
  const opsActionHistoryRef = useRef<HTMLDivElement | null>(null);
  const liveOpsPanelRef = useRef<HTMLDivElement | null>(null);
  const bargeInProofRef = useRef<HTMLDivElement | null>(null);
  const bargeInRef = useRef<ReturnType<
    typeof createDemoBargeInEvidence
  > | null>(null);
  const liveLatencyRef = useRef<ReturnType<
    typeof createDemoLiveTurnLatencyEvidence
  > | null>(null);
  const activeModeRef = useRef<VoiceDemoMode | null>(null);
  const voicesRef = useRef({ general: EMPTY_VOICE, guided: EMPTY_VOICE });
  const [modelProvider] = useState<VoiceModelProvider>(initialModelProvider);
  const [profileId] = useState<VoiceProfileId>(initialProfileId);
  const [routingMode] = useState<VoiceRoutingMode>(initialRoutingMode);
  const [speechEngine] = useState<VoiceSpeechEngine>(initialSpeechEngine);
  const guidedVoice =
    useVoiceStream<SavedIntake>(
      getVoiceRoutePath(
        "guided",
        modelProvider,
        routingMode,
        speechEngine,
        profileId,
      ),
      { reconnectReportPath: "/api/voice/reconnect-traces" },
    ) ?? EMPTY_VOICE;
  const generalVoice =
    useVoiceStream<SavedIntake>(
      getVoiceRoutePath(
        "general",
        modelProvider,
        routingMode,
        speechEngine,
        profileId,
      ),
      { reconnectReportPath: "/api/voice/reconnect-traces" },
    ) ?? EMPTY_VOICE;
  voicesRef.current = { general: generalVoice, guided: guidedVoice };
  const campaignDialerProof = useVoiceCampaignDialerProof(
    "/api/voice/campaigns/dialer-proof",
  );
  const [activeMode, setActiveMode] = useState<VoiceDemoMode | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasStartedModes, setHasStartedModes] = useState<
    Record<VoiceDemoMode, boolean>
  >({
    general: false,
    guided: false,
  });
  const [micError, setMicError] = useState<string | null>(null);
  const [savedIntakes, setSavedIntakes] = useState<SavedIntake[]>([]);
  const [agentSquadStatus, setAgentSquadStatus] =
    useState<VoiceAgentSquadDemoStatus | null>(null);
  const [realCallWorkerHTML, setRealCallWorkerHTML] = useState(() =>
    renderVoiceRealCallEvidenceWorkerHealthHTML(null, {
      description:
        "React renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.",
    }),
  );
  const [waveLevels, setWaveLevels] = useState(createInitialVoiceWaveLevels);
  const [liveLatencyHTML, setLiveLatencyHTML] = useState(() =>
    renderDemoLiveTurnLatencyHTML(
      createDemoLiveTurnLatencyEvidence(() => EMPTY_VOICE).getSnapshot(),
    ),
  );
  const currentVoice = activeMode === "general" ? generalVoice : guidedVoice;
  useEffect(() => {
    const demoWindow = window as VoiceDemoWindow;
    const simulateDisconnect = () => currentVoice.simulateDisconnect();
    demoWindow.__absoluteVoiceDemoSimulateDisconnect = simulateDisconnect;
    window.addEventListener(
      "absolute-voice-simulate-disconnect",
      simulateDisconnect,
    );
    return () => {
      window.removeEventListener(
        "absolute-voice-simulate-disconnect",
        simulateDisconnect,
      );
      if (
        demoWindow.__absoluteVoiceDemoSimulateDisconnect === simulateDisconnect
      ) {
        delete demoWindow.__absoluteVoiceDemoSimulateDisconnect;
      }
    };
  }, [currentVoice]);
  const profileSwitchGuardDecision = getVoiceProfileSwitchGuardDecision(
    currentVoice.sessionMetadata,
  );
  useEffect(() => {
    bargeInRef.current?.syncAssistantOutput();
    liveLatencyRef.current?.syncAssistantOutput();
    if (liveLatencyRef.current) {
      setLiveLatencyHTML(
        renderDemoLiveTurnLatencyHTML(liveLatencyRef.current.getSnapshot()),
      );
    }
  }, [
    currentVoice.assistantAudio.length,
    currentVoice.assistantTexts.length,
    currentVoice.sessionId,
  ]);
  useEffect(() => {
    const refresh = () => {
      void fetchSavedIntakes().then(setSavedIntakes);
    };

    refresh();
    const intervalId = window.setInterval(refresh, 4_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const refresh = async () => {
      try {
        setRealCallWorkerHTML(
          renderVoiceRealCallEvidenceWorkerHealthHTML(
            await fetchVoiceRealCallEvidenceWorkerHealth(),
            {
              description:
                "React renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.",
            },
          ),
        );
      } catch (error) {
        setRealCallWorkerHTML(
          renderVoiceRealCallEvidenceWorkerHealthHTML(null, {
            description:
              "React renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.",
            error: formatErrorMessage(error),
          }),
        );
      }
    };

    void refresh();
    const intervalId = window.setInterval(refresh, 10_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      void fetchAgentSquadDemoStatus(currentVoice.sessionId || undefined).then(
        setAgentSquadStatus,
      );
    };

    refresh();
    const intervalId = window.setInterval(refresh, 3_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentVoice.sessionId]);

  useEffect(
    () => () => {
      microphoneRef.current?.stop();
    },
    [],
  );
  useEffect(() => {
    if (!bargeInProofRef.current) {
      return;
    }

    const proof = mountDemoBargeInProof(bargeInProofRef.current);
    return () => proof.close();
  }, []);
  useEffect(() => {
    if (!opsActionHistoryRef.current) {
      return;
    }

    const history = mountVoiceOpsActionHistory(
      opsActionHistoryRef.current,
      "/api/voice/ops-actions/history",
      { intervalMs: 5_000 },
    );
    return () => history.close();
  }, []);
  useEffect(() => {
    if (!liveOpsPanelRef.current) {
      return;
    }

    const panel = mountVoiceLiveOpsPanel(liveOpsPanelRef.current, {
      getSessionId: () =>
        activeModeRef.current === "general"
          ? voicesRef.current.general.sessionId
          : voicesRef.current.guided.sessionId,
      onControl: ({ action, detail, tag }) => {
        const voice =
          activeModeRef.current === "general"
            ? voicesRef.current.general
            : voicesRef.current.guided;
        if (action === "force-handoff") {
          voice.callControl({
            action: "transfer",
            metadata: { source: "live-ops" },
            reason: detail,
            target: tag,
          });
          stopMic();
        } else if (action === "escalate" || action === "operator-takeover") {
          voice.callControl({
            action: "escalate",
            metadata: {
              source: "live-ops",
              takeover: action === "operator-takeover",
            },
            reason: detail,
          });
          stopMic();
        } else if (action === "pause-assistant") {
          stopMic();
        }
      },
    });
    return () => panel.close();
  }, []);

  const startMic = async () => {
    try {
      const microphone =
        microphoneRef.current ??
        createDemoMicrophone(
          (audio) => {
            bargeInRef.current ??= createDemoBargeInEvidence(() =>
              activeModeRef.current === "general"
                ? voicesRef.current.general
                : voicesRef.current.guided,
            );
            liveLatencyRef.current ??= createDemoLiveTurnLatencyEvidence(() =>
              activeModeRef.current === "general"
                ? voicesRef.current.general
                : voicesRef.current.guided,
            );
            liveLatencyRef.current.recordAudio(audio);
            setLiveLatencyHTML(
              renderDemoLiveTurnLatencyHTML(
                liveLatencyRef.current.getSnapshot(),
              ),
            );
            bargeInRef.current.sendAudio(audio);
          },
          (level) => {
            setWaveLevels((current) => pushVoiceWaveLevel(current, level));
          },
          {
            sampleRateHz: getVoiceSpeechEngineSampleRate(speechEngine),
          },
        );
      microphoneRef.current = microphone;
      await microphone.start();
      setMicError(null);
      setIsCapturing(true);
    } catch (error) {
      microphoneRef.current?.stop();
      microphoneRef.current = null;
      setIsCapturing(false);
      setWaveLevels(createInitialVoiceWaveLevels());
      setMicError(formatErrorMessage(error));
    }
  };

  const stopMic = () => {
    microphoneRef.current?.stop();
    microphoneRef.current = null;
    setIsCapturing(false);
    setWaveLevels(createInitialVoiceWaveLevels());
  };

  const runCallControl = (
    action: (typeof VOICE_CALL_CONTROL_ACTIONS)[number],
  ) => {
    currentVoice.callControl(action);
    stopMic();
  };

  const changeModelProvider = (provider: VoiceModelProvider) => {
    stopMic();
    activeModeRef.current = null;
    setActiveMode(null);
    rememberVoiceModelProvider(provider);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("provider", provider);
    window.location.href = nextUrl.toString();
  };

  const changeProfileId = (nextProfileId: VoiceProfileId) => {
    stopMic();
    activeModeRef.current = null;
    setActiveMode(null);
    rememberVoiceProfileId(nextProfileId);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("voiceProfile", nextProfileId);
    window.location.href = nextUrl.toString();
  };

  const changeRoutingMode = (routing: VoiceRoutingMode) => {
    stopMic();
    activeModeRef.current = null;
    setActiveMode(null);
    rememberVoiceRoutingMode(routing);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("routing", routing);
    window.location.href = nextUrl.toString();
  };

  const changeSpeechEngine = (engine: VoiceSpeechEngine) => {
    stopMic();
    activeModeRef.current = null;
    setActiveMode(null);
    rememberVoiceSpeechEngine(engine);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("engine", engine);
    window.location.href = nextUrl.toString();
  };

  const startMode = async (mode: VoiceDemoMode) => {
    activeModeRef.current = mode;
    setActiveMode(mode);
    setHasStartedModes((current) => ({
      ...current,
      [mode]: true,
    }));
    await startMic();
  };

  const voiceWavePath = createVoiceWavePath(waveLevels);
  const errorMessage = micError || currentVoice.error || "None";
  const currentPrompt = getVoiceModePrompt({
    hasStarted:
      (activeMode ? hasStartedModes[activeMode] : false) ||
      currentVoice.turns.length > 0,
    mode: activeMode,
    status: currentVoice.status,
    turnCount: currentVoice.turns.length,
  });
  const leadMessage = getVoiceLeadMessage({
    hasStarted:
      (activeMode ? hasStartedModes[activeMode] : false) ||
      currentVoice.turns.length > 0,
    mode: activeMode,
    status: currentVoice.status,
    turnCount: currentVoice.turns.length,
  });

  return (
    <html lang="en">
      <Head
        cssPath={cssPath}
        description="AbsoluteJS chat-style voice demo with guided and general modes in React."
        title="AbsoluteJS Voice Test - React"
      />
      <body className="voice-demo-page">
        <header>
          <a className="logo" href="/">
            <img
              alt="AbsoluteJS"
              height={24}
              src="/assets/png/absolutejs-temp.png"
            />
            AbsoluteJS
          </a>
          <nav>
            {FRAMEWORKS.map((framework) => (
              <a
                key={framework.id}
                className={framework.id === "react" ? "active" : undefined}
                href={framework.href}
              >
                {framework.label}
              </a>
            ))}
            <a href="/reviews">Reviews</a>
            <a href="/traces">Traces</a>
            <a href="/carriers">Carriers</a>
            <a href="/phone-agent">Phone Agent</a>
          </nav>
        </header>
        <main className="voice-shell">
          <section className="voice-grid">
            <article className="voice-card voice-hero">
              <div className="voice-hero-layout">
                <div>
                  <span className="voice-framework-pill">React Hook</span>
                  <h2>Chat-style voice demo in React</h2>
                  <p className="voice-brand-copy">
                    {FRAMEWORK_DESCRIPTIONS.react}
                  </p>
                  <div className="voice-badges">
                    <span className="voice-badge">Deepgram Flux</span>
                    <span className="voice-badge">Phrase hint correction</span>
                    <span className="voice-badge">
                      Reconnect-aware sessions
                    </span>
                  </div>
                </div>
                <div className="voice-metrics">
                  <div className="voice-metric">
                    <span className="voice-metric-label">Connection</span>
                    <span className="voice-metric-value">
                      {currentVoice.isConnected ? "Connected" : "Waiting"}
                    </span>
                  </div>
                  <div className="voice-metric">
                    <span className="voice-metric-label">Scenario</span>
                    <span className="voice-metric-value">
                      {activeMode
                        ? getVoiceModeLabel(activeMode)
                        : "Choose one"}
                    </span>
                  </div>
                  <div className="voice-metric">
                    <span className="voice-metric-label">Saved captures</span>
                    <span className="voice-metric-value">
                      {savedIntakes.length}
                    </span>
                  </div>
                  <div className="voice-metric">
                    <span className="voice-metric-label">Model</span>
                    <span className="voice-metric-value">
                      {getVoiceProviderLabel(modelProvider)}
                    </span>
                  </div>
                  <div className="voice-metric">
                    <span className="voice-metric-label">Routing</span>
                    <span className="voice-metric-value">
                      {getVoiceRoutingLabel(routingMode)}
                    </span>
                  </div>
                  <div className="voice-metric">
                    <span className="voice-metric-label">Guarded profile</span>
                    <span className="voice-metric-value">
                      {formatVoiceProfileSwitchGuardLabel(
                        profileSwitchGuardDecision,
                      )}
                    </span>
                    <span className="voice-metric-label">
                      {formatVoiceProfileSwitchGuardSummary(
                        profileSwitchGuardDecision,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </article>

            <article className="voice-card voice-provider-card">
              <span className="voice-framework-pill">Model Provider</span>
              <h2>Choose the assistant brain</h2>
              <p className="voice-footnote">
                Switch providers before starting the microphone. The voice route
                receives the selected provider on every session.
              </p>
              <label className="voice-provider-select">
                <span>Provider</span>
                <select
                  value={modelProvider}
                  onChange={(event) =>
                    changeModelProvider(
                      event.currentTarget.value as VoiceModelProvider,
                    )
                  }
                >
                  {VOICE_MODEL_PROVIDERS.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="voice-provider-select">
                <span>Voice profile</span>
                <select
                  value={profileId}
                  onChange={(event) =>
                    changeProfileId(event.currentTarget.value as VoiceProfileId)
                  }
                >
                  {VOICE_PROFILES.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="voice-provider-select">
                <span>STT routing</span>
                <select
                  value={routingMode}
                  onChange={(event) =>
                    changeRoutingMode(
                      event.currentTarget.value as VoiceRoutingMode,
                    )
                  }
                >
                  {VOICE_ROUTING_MODES.map((routing) => (
                    <option key={routing.id} value={routing.id}>
                      {routing.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="voice-provider-select">
                <span>Speech engine</span>
                <select
                  value={speechEngine}
                  onChange={(event) =>
                    changeSpeechEngine(
                      event.currentTarget.value as VoiceSpeechEngine,
                    )
                  }
                >
                  {VOICE_SPEECH_ENGINES.map((engine) => (
                    <option key={engine.id} value={engine.id}>
                      {engine.label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="voice-footnote">
                {getVoiceProfileLabel(profileId)} uses{" "}
                {VOICE_PROFILES.find((item) => item.id === profileId)
                  ?.description ?? "the selected real-call defaults."}
              </p>
            </article>

            <article className="voice-card voice-proof-dashboard-card">
              <span className="voice-framework-pill">Proof dashboards</span>
              <h2>Open the production evidence</h2>
              <p className="voice-footnote">
                The same trace-backed package routes work in every framework:
                interruption, live timing, turn waterfalls, readiness, and
                provider contracts.
              </p>
              <div className="voice-proof-links">
                {VOICE_PROOF_DASHBOARDS.map((dashboard) => (
                  <a href={dashboard.href} key={dashboard.href}>
                    <strong>{dashboard.label}</strong>
                    <span>{dashboard.description}</span>
                  </a>
                ))}
              </div>
            </article>

            <article
              className="voice-card voice-provider-health-card"
              dangerouslySetInnerHTML={{ __html: realCallWorkerHTML }}
            />

            <VoicePlatformCoverage
              className="voice-card voice-provider-health-card"
              description="React renders the package coverage component against the same proof-backed route used by the server."
              intervalMs={10_000}
              limit={4}
              path="/api/voice/vapi-coverage"
              title="Vapi Replacement Coverage"
            />

            <VoiceProofTrends
              className="voice-card voice-provider-health-card"
              description="React renders sustained proof freshness, provider p95, turn p95, and live p95 from the package proof-trends widget."
              intervalMs={10_000}
              path="/api/voice/proof-trends"
              title="Sustained Proof Trends"
            />

            <VoiceProfileComparison
              className="voice-card voice-provider-health-card"
              description="React renders measured profile defaults and persisted reconnect resume evidence so users can see why each voice stack was selected."
              intervalMs={10_000}
              path="/api/voice/real-call-profile-history"
              title="Profile + Reconnect Evidence"
            />

            <VoiceReconnectProfileEvidence
              className="voice-card voice-provider-health-card"
              description="React renders persisted real browser reconnect/resume traces from the package reconnect evidence primitive."
              intervalMs={10_000}
              path="/api/voice/reconnect-profile-evidence"
              title="Persisted Reconnect Evidence"
            />

            <VoiceProfileSwitchRecommendation
              className="voice-card voice-provider-health-card"
              description="React compares the latest session signals against measured profile evidence and recommends whether to switch stacks."
              intervalMs={10_000}
              path="/api/voice/profile-switch-recommendation"
              title="Profile Switch Recommendation"
            />

            <VoiceReadinessFailures
              className="voice-card voice-provider-health-card"
              description="React renders structured deploy-gate explanations from production readiness JSON when calibrated gates warn or fail."
              intervalMs={10_000}
              path="/api/production-readiness"
              title="Readiness Gate Explanations"
            />

            <VoiceSessionSnapshot
              className="voice-card voice-provider-health-card"
              description="React renders a downloadable support bundle with session media graph, provider routing, and turn-quality evidence."
              intervalMs={5_000}
              path="/api/voice/session-snapshot/latest"
              title="Session Debug Snapshot"
            />

            <VoiceSessionObservability
              className="voice-card voice-provider-health-card"
              description="React renders one per-call support report with turn waterfalls, provider recovery, tools, handoffs, guardrails, and incident handoff links."
              intervalMs={5_000}
              path="/api/voice/session-observability/demo-incident-bundle"
              title="Session Observability"
            />

            <VoiceCallDebuggerLaunch
              className="voice-card voice-provider-health-card"
              description="React opens the latest full call debugger with snapshot, replay, provider path, transcript, and incident markdown."
              intervalMs={5_000}
              path="/api/voice-call-debugger/latest"
              title="Debug Latest Call"
            />

            <VoiceRoutingStatus
              className="voice-card voice-routing-card"
              intervalMs={4_000}
            />

            <article className="voice-card voice-agent-squad-card">
              <span className="voice-framework-pill">Agent Squad</span>
              <h2>Specialist routing is live</h2>
              <p className="voice-footnote">
                Say “I have a billing question about my invoice” to route from
                the front desk to billing with a compact context policy.
              </p>
              <div className="voice-routing-grid">
                <div>
                  <span>Current specialist</span>
                  <strong>
                    {agentSquadStatus?.currentAgentId ?? "front-desk"}
                  </strong>
                </div>
                <div>
                  <span>Context policy</span>
                  <strong>
                    {agentSquadStatus?.contextPolicy ??
                      "handoff-summary-current-turn"}
                  </strong>
                </div>
                <div>
                  <span>Handoffs</span>
                  <strong>{agentSquadStatus?.handoffCount ?? 0}</strong>
                </div>
                <div>
                  <span>Messages sent</span>
                  <strong>{agentSquadStatus?.messageCount ?? "ready"}</strong>
                </div>
              </div>
              <p className="voice-footnote">
                {agentSquadStatus?.lastHandoff
                  ? `${agentSquadStatus.lastHandoff.fromAgentId} → ${agentSquadStatus.lastHandoff.targetAgentId}: ${agentSquadStatus.lastHandoff.summary ?? agentSquadStatus.lastHandoff.reason ?? "handoff applied"}`
                  : "No specialist handoff in this session yet."}
              </p>
              <p className="voice-footnote">
                <a href="/agent-squad-contract">Open squad contract proof</a>
              </p>
            </article>

            <VoiceProviderStatus
              className="voice-card voice-provider-health-card"
              intervalMs={5_000}
            />

            <VoiceProviderCapabilities
              className="voice-card voice-provider-health-card"
              intervalMs={5_000}
            />

            <VoiceProviderContracts
              className="voice-card voice-provider-health-card"
              intervalMs={5_000}
            />

            <VoiceProviderSimulationControls
              className="voice-card voice-provider-simulation-card"
              failureMessage="Prove Deepgram STT failover to AssemblyAI without changing credentials."
              failureProviders={["deepgram"]}
              fallbackRequiredMessage="Add ASSEMBLYAI_API_KEY to enable the fallback simulation."
              fallbackRequiredProvider="assemblyai"
              kind="stt"
              providers={[{ provider: "deepgram" }, { provider: "assemblyai" }]}
            />

            <VoiceTurnQuality
              className="voice-card voice-provider-health-card"
              intervalMs={5_000}
            />

            <VoiceTurnLatency
              className="voice-card voice-provider-health-card"
              intervalMs={5_000}
              proofLabel="Run latency proof"
              proofPath="/api/turn-latency/proof"
            />

            <article className="voice-card voice-provider-health-card">
              <span className="voice-framework-pill">
                Campaign Dialer Proof
              </span>
              <h2>Carrier dialer dry-run</h2>
              <p className="voice-footnote">
                Twilio, Telnyx, and Plivo campaign dials run through the shared
                React hook, attach campaign metadata, and resolve synthetic
                webhook outcomes.
              </p>
              <button
                className="absolute-voice-turn-latency__proof"
                disabled={campaignDialerProof.isLoading}
                onClick={() => {
                  void campaignDialerProof.runProof().catch(() => {});
                }}
                type="button"
              >
                {campaignDialerProof.isLoading
                  ? "Running proof"
                  : "Run campaign dialer proof"}
              </button>
              <div className="voice-provider-health-list">
                {(campaignDialerProof.report?.providers ?? []).map(
                  (provider) => (
                    <div
                      className="voice-provider-health-item"
                      key={provider.provider}
                    >
                      <strong>{provider.provider}</strong>
                      <span>
                        {provider.outcomes.every((outcome) => outcome.applied)
                          ? "passed"
                          : "needs attention"}
                      </span>
                      <small>
                        {provider.carrierRequests.length} dry-run carrier
                        request
                        {provider.carrierRequests.length === 1 ? "" : "s"}
                      </small>
                    </div>
                  ),
                )}
              </div>
              {campaignDialerProof.error ? (
                <p className="voice-footnote">{campaignDialerProof.error}</p>
              ) : null}
              {!campaignDialerProof.report ? (
                <p className="empty-copy">
                  Ready for{" "}
                  {(
                    campaignDialerProof.status?.providers ?? [
                      "twilio",
                      "telnyx",
                      "plivo",
                    ]
                  ).join(", ")}
                  .
                </p>
              ) : null}
              <p className="voice-footnote">
                <a href="/voice/campaigns/dialer-proof">Open full proof</a>
              </p>
            </article>

            <VoiceOpsStatus
              className="voice-card voice-workflow-card"
              intervalMs={5_000}
            />

            <VoiceDeliveryRuntime
              className="voice-card voice-workflow-card"
              intervalMs={5_000}
            />

            <VoiceOpsActionCenter
              actions={createVoiceOpsActionCenterActions({
                providers: ["deepgram", "assemblyai"],
              })}
              className="voice-card voice-workflow-card"
            />

            <div ref={liveOpsPanelRef} />

            <div
              className="voice-card voice-workflow-card"
              ref={opsActionHistoryRef}
            />

            <VoiceTraceTimeline
              className="voice-card voice-provider-health-card"
              intervalMs={5_000}
              limit={2}
              operationsRecordBasePath="/voice-operations"
              incidentBundleBasePath="/voice-incidents"
            />

            <div ref={bargeInProofRef} />

            <div dangerouslySetInnerHTML={{ __html: liveLatencyHTML }} />

            <article className="voice-card voice-card-side">
              <h2>{VOICE_DEMO_GUIDE_TITLE}</h2>
              <ol className="voice-guide-list">
                {VOICE_DEMO_GUIDE_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>

            <article className="voice-card voice-assistant-config">
              <span className="voice-framework-pill">Assistant API</span>
              <h2>{VOICE_ASSISTANT_CONFIG.id}</h2>
              <p className="voice-footnote">
                Powered by createVoiceAssistant with a{" "}
                {VOICE_ASSISTANT_CONFIG.recipe} artifact plan.
              </p>
              <div className="voice-config-grid">
                <div>
                  <div className="voice-assistant-label">Tools</div>
                  <ul className="voice-compact-list">
                    {VOICE_ASSISTANT_CONFIG.tools.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="voice-assistant-label">Guardrails</div>
                  <ul className="voice-compact-list">
                    {VOICE_ASSISTANT_CONFIG.guardrails.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="voice-assistant-label">Experiments</div>
                  <ul className="voice-compact-list">
                    {VOICE_ASSISTANT_CONFIG.experiments.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="voice-assistant-label">Artifacts</div>
                  <ul className="voice-compact-list">
                    {VOICE_ASSISTANT_CONFIG.artifacts.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="voice-footnote">
                <a href="/assistant">Open analytics</a> ·{" "}
                <a href="/tasks">Open tasks</a> ·{" "}
                <a href="/integrations">Open integration events</a>
                {" · "}
                <a href="/barge-in">Open barge-in proof</a>
              </p>
            </article>

            <article className="voice-card voice-card-wide">
              <h2>Conversation</h2>
              <div className="voice-status-list">
                <div className="status-row">
                  <span className="label">Voice status</span>
                  <span className="value">{currentVoice.status}</span>
                </div>
                <div className="status-row">
                  <span className="label">Reconnect</span>
                  <span className="value">
                    {formatReconnectState(currentVoice.reconnect)}
                  </span>
                </div>
                <div className="status-row">
                  <span className="label">Current prompt</span>
                  <span className="value">{currentPrompt}</span>
                </div>
                <div className="status-row">
                  <span className="label">Microphone</span>
                  <span className="value">
                    {isCapturing ? VOICE_DEMO_MIC_LIVE : VOICE_DEMO_MIC_IDLE}
                  </span>
                </div>
                <div className="status-row">
                  <span className="label">Current utterance</span>
                  <span className="value">
                    {currentVoice.partial || "No speech captured yet"}
                  </span>
                </div>
                <div className="status-row">
                  <span className="label">Errors</span>
                  <span className="value">{errorMessage}</span>
                </div>
                <div className="status-row">
                  <span className="label">Call lifecycle</span>
                  <span className="value">
                    {currentVoice.call?.disposition
                      ? `${currentVoice.call.disposition} after ${currentVoice.call.events.length} lifecycle event${currentVoice.call.events.length === 1 ? "" : "s"}`
                      : (currentVoice.call?.events.at(-1)?.type ??
                        "Not started")}
                  </span>
                </div>
              </div>
              <div className="voice-chat-list">
                <article className="voice-chat-message assistant">
                  <div className="voice-chat-role">
                    {activeMode ? getVoiceModeLabel(activeMode) : "Voice demo"}
                  </div>
                  <p className="voice-turn-text">{leadMessage}</p>
                </article>
                {currentVoice.turns.map((turn) => (
                  <div className="voice-chat-stack" key={turn.id}>
                    <article className="voice-chat-message user">
                      <div className="voice-chat-role">You</div>
                      <p className="voice-turn-text">{turn.text}</p>
                    </article>
                    {turn.assistantText ? (
                      <article className="voice-chat-message assistant">
                        <div className="voice-chat-role">
                          {activeMode ? getVoiceModeLabel(activeMode) : "Guide"}
                        </div>
                        <p className="voice-turn-text">{turn.assistantText}</p>
                      </article>
                    ) : null}
                  </div>
                ))}
                {currentVoice.partial ? (
                  <article className="voice-chat-message user pending">
                    <div className="voice-chat-role">Speaking</div>
                    <p className="voice-turn-text">{currentVoice.partial}</p>
                  </article>
                ) : null}
              </div>
              <div className={`voice-monitor${isCapturing ? " is-live" : ""}`}>
                <div className="voice-monitor-header">
                  <span className="voice-monitor-label">Input monitor</span>
                  <span
                    className={`voice-live-pill${isCapturing ? " is-live" : ""}`}
                  >
                    <span className="voice-live-dot" />
                    {isCapturing ? "Microphone live" : "Microphone idle"}
                  </span>
                </div>
                <svg
                  aria-label="Microphone waveform"
                  className="voice-wave"
                  viewBox="0 0 320 88"
                >
                  <path className="voice-wave-baseline" d="M 0 44 L 320 44" />
                  <path className="voice-wave-glow" d={voiceWavePath} />
                  <path className="voice-wave-line" d={voiceWavePath} />
                </svg>
              </div>
              <div className="voice-actions">
                {isCapturing ? (
                  <button className="primary" onClick={() => void stopMic()}>
                    {VOICE_DEMO_STOP_LABEL}
                  </button>
                ) : (
                  <>
                    <button
                      className="primary"
                      onClick={() => void startMode("guided")}
                    >
                      {VOICE_DEMO_GUIDED_LABEL}
                    </button>
                    <button onClick={() => void startMode("general")}>
                      {VOICE_DEMO_GENERAL_LABEL}
                    </button>
                  </>
                )}
              </div>
              <div className="voice-actions">
                {VOICE_CALL_CONTROL_ACTIONS.map((action) => (
                  <button
                    key={action.action}
                    type="button"
                    onClick={() => runCallControl(action)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
              <p className="voice-footnote">
                This demo uses the dev-only in-memory voice session store. Real
                deployments should replace it with Redis or Postgres.
              </p>
            </article>

            <article className="voice-card voice-hero">
              <h2>Saved captures</h2>
              <p className="voice-footnote">
                Open <a href="/reviews/latest">the latest review</a> or{" "}
                <a href="/reviews">browse all reviews</a> after a completed demo
                call.
              </p>
              <div className="voice-saved-list">
                {savedIntakes.length === 0 ? (
                  <p className="empty-copy">No saved captures yet.</p>
                ) : (
                  savedIntakes.map((intake) => (
                    <article className="saved-item" key={intake.id}>
                      <div className="saved-item-header">
                        <strong>{intake.title}</strong>
                        <span>{formatDateTime(intake.completedAt)}</span>
                      </div>
                      <div className="saved-item-meta">
                        <span className="pill">
                          {getVoiceModeLabel(intake.scenarioId)}
                        </span>
                        <span className="pill">
                          {intake.turnCount} turn
                          {intake.turnCount === 1 ? "" : "s"}
                        </span>
                        {intake.detectedName ? (
                          <span className="pill">{intake.detectedName}</span>
                        ) : null}
                      </div>
                      <div className="saved-answer-list">
                        {intake.promptAnswers.map((entry) => (
                          <div className="saved-answer" key={entry.prompt}>
                            <div className="saved-answer-label">
                              {entry.prompt}
                            </div>
                            <p className="saved-answer-text">
                              {entry.response}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="voice-assistant-label">
                        Full transcript
                      </div>
                      <p>{intake.transcript}</p>
                      <p className="saved-summary">{intake.assistantSummary}</p>
                    </article>
                  ))
                )}
              </div>
            </article>
          </section>
          <p className="footer">
            <img alt="" src="/assets/png/absolutejs-temp.png" />
            Powered by{" "}
            <a
              href="https://absolutejs.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              AbsoluteJS
            </a>
          </p>
        </main>
      </body>
    </html>
  );
};
