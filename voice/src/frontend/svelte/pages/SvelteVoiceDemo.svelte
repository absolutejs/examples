<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import Head from "@absolutejs/absolute/svelte/components/Head.js";
  import {
    createVoiceCallDebugger,
    createVoiceDeliveryRuntime,
    createVoiceOpsActionCenter,
    createVoiceOpsStatus,
    createVoicePlatformCoverage,
    createVoiceProfileComparison,
    createVoiceProofTrends,
    createVoiceReconnectProfileEvidence,
    createVoiceProviderCapabilities,
    createVoiceProviderContracts,
    createVoiceProviderSimulationControls,
    createVoiceProviderStatus,
    createVoiceReadinessFailures,
    createVoiceRoutingStatus,
    createVoiceSessionObservability,
    createVoiceSessionSnapshot,
    createVoiceStream,
    createVoiceTraceTimeline,
    createVoiceTurnLatency,
    createVoiceTurnQuality,
  } from "@absolutejs/voice/svelte";
  import {
    createVoiceProfileSwitchRecommendationStore,
    renderVoicePlatformCoverageHTML,
    renderVoiceProfileComparisonHTML,
    renderVoiceProfileSwitchRecommendationHTML,
    renderVoiceProofTrendsHTML,
    renderVoiceReconnectProfileEvidenceHTML,
    renderVoiceReadinessFailuresHTML,
    createVoiceOpsActionCenterActions,
    mountVoiceOpsActionHistory,
  } from "@absolutejs/voice/client";
  import type { VoiceStream, VoiceStreamState } from "@absolutejs/voice";
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
    type VoiceAgentSquadDemoStatus,
    type SavedIntake,
    type VoiceDemoMode,
    type VoiceModelProvider,
    type VoiceProfileId,
    type VoiceRoutingMode,
    type VoiceSpeechEngine,
  } from "../../../shared/demo";
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

  const createInitialVoiceState = (): VoiceStreamState<SavedIntake> => ({
    assistantTexts: [],
    assistantAudio: [],
    call: null,
    error: null,
    isConnected: false,
    partial: "",
    reconnect: {
      attempts: 0,
      maxAttempts: 0,
      status: "idle",
    },
    scenarioId: null,
    sessionMetadata: null,
    sessionId: null,
    status: "idle",
    turns: [],
  });

  type SvelteVoiceDemoProps = {
    cssPath?: string;
    initialModelProvider?: VoiceModelProvider;
    initialProfileId?: VoiceProfileId;
    initialRoutingMode?: VoiceRoutingMode;
    initialSpeechEngine?: VoiceSpeechEngine;
  };
  type VoiceDemoWindow = typeof window & {
    __absoluteVoiceDemoSimulateDisconnect?: () => void;
  };

  let {
    cssPath,
    initialModelProvider = "deterministic",
    initialProfileId = "meeting-recorder",
    initialRoutingMode = "balanced",
    initialSpeechEngine = "cascaded",
  }: SvelteVoiceDemoProps = $props();
  let activeMode = $state<VoiceDemoMode | null>(null);
  let modelProvider = $state<VoiceModelProvider>(initialModelProvider);
  let profileId = $state<VoiceProfileId>(initialProfileId);
  let routingMode = $state<VoiceRoutingMode>(initialRoutingMode);
  let speechEngine = $state<VoiceSpeechEngine>(initialSpeechEngine);
  let error = $state<string | null>(null);
  let hasStartedModes = $state<Record<VoiceDemoMode, boolean>>({
    general: false,
    guided: false,
  });
  let isCapturing = $state(false);
  let savedIntakes = $state<SavedIntake[]>([]);
  let agentSquadStatus = $state<VoiceAgentSquadDemoStatus | null>(null);
  let deliveryRuntimeHTML = $state("");
  let opsActionCenterHTML = $state("");
  let opsStatusHTML = $state("");
  let platformCoverageHTML = $state("");
  let realCallWorkerHTML = $state("");
  let profileComparisonHTML = $state("");
  let reconnectEvidenceHTML = $state("");
  let profileSwitchHTML = $state("");
  let proofTrendsHTML = $state("");
  let readinessFailuresHTML = $state("");
  let sessionSnapshotHTML = $state("");
  let sessionObservabilityHTML = $state("");
  let callDebuggerHTML = $state("");
  let providerCapabilitiesHTML = $state("");
  let providerContractsHTML = $state("");
  let providerSimulationHTML = $state("");
  let providerStatusHTML = $state("");
  let campaignDialerProofSnapshot = $state<{
    error: string | null;
    isLoading: boolean;
    report?: {
      providers: Array<{
        carrierRequests: unknown[];
        outcomes: Array<{ applied: boolean }>;
        provider: string;
      }>;
    };
    status?: { providers: string[] };
  }>({ error: null, isLoading: false });
  let routingStatusHTML = $state("");
  let traceTimelineHTML = $state("");
  let liveLatencyHTML = $state("");
  let turnLatencyHTML = $state("");
  let turnQualityHTML = $state("");
  let guidedState = $state(createInitialVoiceState());
  let generalState = $state(createInitialVoiceState());
  let waveLevels = $state(createInitialVoiceWaveLevels());
  let microphone: ReturnType<typeof createDemoMicrophone> | null = null;
  let bargeInProofElement: HTMLElement | null = null;
  let opsActionHistoryElement: HTMLElement | null = null;
  let liveOpsPanelElement: HTMLElement | null = null;
  let bargeInProof: ReturnType<typeof mountDemoBargeInProof> | null = null;
  let opsActionHistory: ReturnType<typeof mountVoiceOpsActionHistory> | null =
    null;
  let liveOpsPanel: ReturnType<typeof mountVoiceLiveOpsPanel> | null = null;
  let providerSimulationElement: HTMLElement | null = null;
  let refreshTimer: ReturnType<typeof setInterval> | null = null;
  let realCallWorkerTimer: ReturnType<typeof setInterval> | null = null;
  let guidedVoice: VoiceStream<SavedIntake> | null = null;
  let generalVoice: VoiceStream<SavedIntake> | null = null;
  const opsStatus = createVoiceOpsStatus("/api/voice/ops-status", {
    intervalMs: 5_000,
  });
  const deliveryRuntime = createVoiceDeliveryRuntime(
    "/api/voice-delivery-runtime",
    {
      intervalMs: 5_000,
    },
  );
  const opsActionCenter = createVoiceOpsActionCenter({
    actions: createVoiceOpsActionCenterActions({
      providers: ["deepgram", "assemblyai"],
    }),
  });
  const platformCoverage = createVoicePlatformCoverage(
    "/api/voice/vapi-coverage",
    {
      intervalMs: 10_000,
    },
  );
  const proofTrends = createVoiceProofTrends("/api/voice/proof-trends", {
    intervalMs: 10_000,
  });
  const profileComparison = createVoiceProfileComparison(
    "/api/voice/real-call-profile-history",
    {
      intervalMs: 10_000,
    },
  );
  const profileComparisonWidgetOptions = {
    description:
      "Svelte renders measured profile defaults and persisted reconnect resume evidence behind each selected stack.",
    title: "Profile + Reconnect Evidence",
  };
  profileComparisonHTML = renderVoiceProfileComparisonHTML(
    profileComparison.getSnapshot(),
    profileComparisonWidgetOptions,
  );
  const reconnectEvidence = createVoiceReconnectProfileEvidence(
    "/api/voice/reconnect-profile-evidence",
    {
      intervalMs: 10_000,
    },
  );
  const reconnectEvidenceWidgetOptions = {
    description:
      "Svelte renders persisted real browser reconnect/resume traces from the package reconnect evidence primitive.",
    title: "Persisted Reconnect Evidence",
  };
  reconnectEvidenceHTML = renderVoiceReconnectProfileEvidenceHTML(
    reconnectEvidence.getSnapshot(),
    reconnectEvidenceWidgetOptions,
  );
  const profileSwitchRecommendation =
    createVoiceProfileSwitchRecommendationStore(
      "/api/voice/profile-switch-recommendation",
      {
        intervalMs: 10_000,
      },
    );
  const profileSwitchWidgetOptions = {
    description:
      "Svelte compares latest session signals against measured profile evidence and recommends whether to switch stacks.",
    title: "Profile Switch Recommendation",
  };
  profileSwitchHTML = renderVoiceProfileSwitchRecommendationHTML(
    profileSwitchRecommendation.getSnapshot(),
    profileSwitchWidgetOptions,
  );
  const readinessFailures = createVoiceReadinessFailures(
    "/api/production-readiness",
    {
      intervalMs: 10_000,
    },
  );
  const readinessFailuresWidgetOptions = {
    description:
      "Svelte renders structured deploy-gate explanations from production readiness JSON when calibrated gates warn or fail.",
    title: "Readiness Gate Explanations",
  };
  readinessFailuresHTML = renderVoiceReadinessFailuresHTML(
    readinessFailures.getSnapshot(),
    readinessFailuresWidgetOptions,
  );
  const sessionSnapshot = createVoiceSessionSnapshot(
    "/api/voice/session-snapshot/latest",
    {
      description:
        "Svelte renders a downloadable support bundle with session media graph, provider routing, and turn-quality evidence.",
      intervalMs: 5_000,
      title: "Session Debug Snapshot",
    },
  );
  sessionSnapshotHTML = sessionSnapshot.getHTML();
  const sessionObservability = createVoiceSessionObservability(
    "/api/voice/session-observability/demo-incident-bundle",
    {
      description:
        "Svelte renders one per-call support report with turn waterfalls, provider recovery, tools, handoffs, guardrails, and incident handoff links.",
      intervalMs: 5_000,
      title: "Session Observability",
    },
  );
  sessionObservabilityHTML = sessionObservability.getHTML();
  const callDebugger = createVoiceCallDebugger(
    "/api/voice-call-debugger/latest",
    {
      description:
        "Svelte opens the latest full call debugger with snapshot, replay, provider path, transcript, and incident markdown.",
      intervalMs: 5_000,
      title: "Debug Latest Call",
    },
  );
  callDebuggerHTML = callDebugger.getHTML();
  const providerStatus = createVoiceProviderStatus("/api/provider-status", {
    intervalMs: 5_000,
  });
  const providerCapabilities = createVoiceProviderCapabilities(
    "/api/provider-capabilities",
    {
      intervalMs: 5_000,
    },
  );
  const providerContracts = createVoiceProviderContracts(
    "/api/provider-contracts",
    {
      intervalMs: 5_000,
    },
  );
  const providerSimulation = createVoiceProviderSimulationControls({
    failureMessage:
      "Prove Deepgram STT failover to AssemblyAI without changing credentials.",
    failureProviders: ["deepgram"],
    fallbackRequiredMessage:
      "Add ASSEMBLYAI_API_KEY to enable the fallback simulation.",
    fallbackRequiredProvider: "assemblyai",
    kind: "stt",
    providers: [{ provider: "deepgram" }, { provider: "assemblyai" }],
  });
  const routingStatus = createVoiceRoutingStatus("/api/routing/latest", {
    intervalMs: 4_000,
  });
  const turnQuality = createVoiceTurnQuality("/api/turn-quality", {
    intervalMs: 5_000,
  });
  const turnLatency = createVoiceTurnLatency("/api/turn-latency", {
    intervalMs: 5_000,
    proofLabel: "Run latency proof",
    proofPath: "/api/turn-latency/proof",
  });
  const traceTimeline = createVoiceTraceTimeline("/api/voice-traces", {
    incidentBundleBasePath: "/voice-incidents",
    intervalMs: 5_000,
    limit: 2,
    operationsRecordBasePath: "/voice-operations",
  });
  let unsubscribeGuided = () => {};
  let unsubscribeGeneral = () => {};
  let unsubscribeDeliveryRuntime = () => {};
  let unsubscribeOpsActionCenter = () => {};
  let unsubscribeOpsStatus = () => {};
  let unsubscribePlatformCoverage = () => {};
  let unsubscribeProfileComparison = () => {};
  let unsubscribeReconnectEvidence = () => {};
  let unsubscribeProfileSwitch = () => {};
  let unsubscribeProofTrends = () => {};
  let unsubscribeReadinessFailures = () => {};
  let unsubscribeSessionSnapshot = () => {};
  let unsubscribeSessionObservability = () => {};
  let unsubscribeCallDebugger = () => {};
  let unsubscribeProviderSimulation = () => {};
  let unbindProviderSimulation = () => {};
  let unsubscribeProviderCapabilities = () => {};
  let unsubscribeProviderContracts = () => {};
  let unsubscribeProviderStatus = () => {};
  let unsubscribeRoutingStatus = () => {};
  let unsubscribeTraceTimeline = () => {};
  let unsubscribeTurnLatency = () => {};
  const handleTurnLatencyClick = (event: MouseEvent) => {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest("[data-absolute-voice-turn-latency-proof]")
    ) {
      void turnLatency.runProof().catch(() => {});
    }
  };
  const runCampaignDialerProof = () => {
    campaignDialerProofSnapshot = {
      ...campaignDialerProofSnapshot,
      error: null,
      isLoading: true,
    };
    void fetch("/api/voice/campaigns/dialer-proof", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Campaign dialer proof failed: ${response.status}`);
        }
        campaignDialerProofSnapshot = {
          ...campaignDialerProofSnapshot,
          error: null,
          isLoading: false,
          report: await response.json(),
        };
      })
      .catch((error) => {
        campaignDialerProofSnapshot = {
          ...campaignDialerProofSnapshot,
          error: formatErrorMessage(error),
          isLoading: false,
        };
      });
  };
  const refreshCampaignDialerProof = () => {
    void fetch("/api/voice/campaigns/dialer-proof")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Campaign dialer proof status failed: ${response.status}`,
          );
        }
        campaignDialerProofSnapshot = {
          ...campaignDialerProofSnapshot,
          error: null,
          status: await response.json(),
        };
      })
      .catch((error) => {
        campaignDialerProofSnapshot = {
          ...campaignDialerProofSnapshot,
          error: formatErrorMessage(error),
        };
      });
  };
  let unsubscribeTurnQuality = () => {};
  let currentVoice = $derived(
    activeMode === "general" ? generalState : guidedState,
  );
  const simulateDisconnect = () =>
    (activeMode === "general"
      ? generalVoice
      : guidedVoice
    )?.simulateDisconnect();
  let campaignDialerProofReadyProviders = $derived(
    (
      campaignDialerProofSnapshot?.status?.providers ?? [
        "twilio",
        "telnyx",
        "plivo",
      ]
    ).join(", "),
  );
  const bargeInEvidence = createDemoBargeInEvidence(() => {
    const activeVoice = activeMode === "general" ? generalVoice : guidedVoice;
    return {
      assistantAudio: currentVoice.assistantAudio,
      assistantTexts: currentVoice.assistantTexts,
      sendAudio: (audio) => activeVoice?.sendAudio(audio),
      sessionId: currentVoice.sessionId,
    };
  });
  const liveLatencyEvidence = createDemoLiveTurnLatencyEvidence(() => ({
    assistantAudio: currentVoice.assistantAudio,
    assistantTexts: currentVoice.assistantTexts,
    sessionId: currentVoice.sessionId,
  }));
  liveLatencyHTML = renderDemoLiveTurnLatencyHTML(
    liveLatencyEvidence.getSnapshot(),
  );
  let wavePath = $derived(createVoiceWavePath(waveLevels));
  let errorMessage = $derived(error || currentVoice.error || "None");
  let profileSwitchGuardDecision = $derived(
    getVoiceProfileSwitchGuardDecision(currentVoice.sessionMetadata),
  );
  let currentPrompt = $derived(
    getVoiceModePrompt({
      hasStarted:
        (activeMode ? hasStartedModes[activeMode] : false) ||
        currentVoice.turns.length > 0,
      mode: activeMode,
      status: currentVoice.status,
      turnCount: currentVoice.turns.length,
    }),
  );
  let leadMessage = $derived(
    getVoiceLeadMessage({
      hasStarted:
        (activeMode ? hasStartedModes[activeMode] : false) ||
        currentVoice.turns.length > 0,
      mode: activeMode,
      status: currentVoice.status,
      turnCount: currentVoice.turns.length,
    }),
  );
  let callLifecycleLabel = $derived(
    currentVoice.call?.disposition
      ? `${currentVoice.call.disposition} after ${currentVoice.call.events.length} lifecycle event${currentVoice.call.events.length === 1 ? "" : "s"}`
      : (currentVoice.call?.events.at(-1)?.type ?? "Not started"),
  );

  const refreshIntakes = async () => {
    savedIntakes = await fetchSavedIntakes();
  };

  const refreshAgentSquadStatus = async () => {
    agentSquadStatus = await fetchAgentSquadDemoStatus(
      currentVoice.sessionId ?? undefined,
    );
  };

  const startMic = async () => {
    try {
      microphone ??= createDemoMicrophone(
        (audio) => {
          const activeVoice =
            activeMode === "general" ? generalVoice : guidedVoice;

          liveLatencyEvidence.recordAudio(audio);
          liveLatencyHTML = renderDemoLiveTurnLatencyHTML(
            liveLatencyEvidence.getSnapshot(),
          );
          bargeInEvidence.sendAudio(audio);
        },
        (level) => {
          waveLevels = pushVoiceWaveLevel(waveLevels, level);
        },
        {
          sampleRateHz: getVoiceSpeechEngineSampleRate(speechEngine),
        },
      );
      await microphone.start();
      error = null;
      isCapturing = true;
    } catch (micError) {
      microphone?.stop();
      microphone = null;
      isCapturing = false;
      waveLevels = createInitialVoiceWaveLevels();
      error = formatErrorMessage(micError);
    }
  };

  const stopMic = () => {
    microphone?.stop();
    microphone = null;
    isCapturing = false;
    waveLevels = createInitialVoiceWaveLevels();
  };

  const startMode = async (mode: VoiceDemoMode) => {
    activeMode = mode;
    hasStartedModes = { ...hasStartedModes, [mode]: true };
    await startMic();
  };

  const runCallControl = (
    action: (typeof VOICE_CALL_CONTROL_ACTIONS)[number],
  ) => {
    const activeVoice = activeMode === "general" ? generalVoice : guidedVoice;
    activeVoice?.callControl(action);
    stopMic();
  };

  const connectVoices = () => {
    unsubscribeGuided();
    unsubscribeGeneral();
    guidedVoice?.close();
    generalVoice?.close();
    guidedVoice = createVoiceStream<SavedIntake>(
      getVoiceRoutePath(
        "guided",
        modelProvider,
        routingMode,
        speechEngine,
        profileId,
      ),
      { reconnectReportPath: "/api/voice/reconnect-traces" },
    );
    generalVoice = createVoiceStream<SavedIntake>(
      getVoiceRoutePath(
        "general",
        modelProvider,
        routingMode,
        speechEngine,
        profileId,
      ),
      { reconnectReportPath: "/api/voice/reconnect-traces" },
    );
    guidedState = { ...guidedVoice.getSnapshot() };
    generalState = { ...generalVoice.getSnapshot() };
    unsubscribeGuided = guidedVoice.subscribe(() => {
      guidedState = { ...guidedVoice!.getSnapshot() };
      bargeInEvidence.syncAssistantOutput();
      liveLatencyEvidence.syncAssistantOutput();
      liveLatencyHTML = renderDemoLiveTurnLatencyHTML(
        liveLatencyEvidence.getSnapshot(),
      );
    });
    unsubscribeGeneral = generalVoice.subscribe(() => {
      generalState = { ...generalVoice!.getSnapshot() };
      bargeInEvidence.syncAssistantOutput();
      liveLatencyEvidence.syncAssistantOutput();
      liveLatencyHTML = renderDemoLiveTurnLatencyHTML(
        liveLatencyEvidence.getSnapshot(),
      );
    });
  };

  const changeModelProvider = (provider: VoiceModelProvider) => {
    stopMic();
    activeMode = null;
    modelProvider = provider;
    rememberVoiceModelProvider(provider);
    connectVoices();
  };

  const changeProfileId = (nextProfileId: VoiceProfileId) => {
    stopMic();
    activeMode = null;
    profileId = nextProfileId;
    rememberVoiceProfileId(nextProfileId);
    connectVoices();
  };

  const changeRoutingMode = (routing: VoiceRoutingMode) => {
    stopMic();
    activeMode = null;
    routingMode = routing;
    rememberVoiceRoutingMode(routing);
    connectVoices();
  };

  const changeSpeechEngine = (engine: VoiceSpeechEngine) => {
    stopMic();
    activeMode = null;
    speechEngine = engine;
    rememberVoiceSpeechEngine(engine);
    connectVoices();
  };

  const changeModelProviderFromEvent = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      changeModelProvider(target.value as VoiceModelProvider);
    }
  };

  const changeProfileIdFromEvent = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      changeProfileId(target.value as VoiceProfileId);
    }
  };

  const changeRoutingModeFromEvent = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      changeRoutingMode(target.value as VoiceRoutingMode);
    }
  };

  const changeSpeechEngineFromEvent = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLSelectElement) {
      changeSpeechEngine(target.value as VoiceSpeechEngine);
    }
  };

  const refreshRealCallWorkerHealth = async () => {
    try {
      realCallWorkerHTML = renderVoiceRealCallEvidenceWorkerHealthHTML(
        await fetchVoiceRealCallEvidenceWorkerHealth(),
        {
          description:
            "Svelte renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.",
        },
      );
    } catch (error) {
      realCallWorkerHTML = renderVoiceRealCallEvidenceWorkerHealthHTML(null, {
        description:
          "Svelte renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.",
        error: formatErrorMessage(error),
      });
    }
  };

  onMount(() => {
    connectVoices();
    const demoWindow = window as VoiceDemoWindow;
    demoWindow.__absoluteVoiceDemoSimulateDisconnect = simulateDisconnect;
    window.addEventListener(
      "absolute-voice-simulate-disconnect",
      simulateDisconnect,
    );
    unsubscribeOpsStatus = opsStatus.subscribe(() => {
      opsStatusHTML = opsStatus.getHTML();
    });
    unsubscribePlatformCoverage = platformCoverage.subscribe(() => {
      platformCoverageHTML = renderVoicePlatformCoverageHTML(
        platformCoverage.getSnapshot(),
        {
          description:
            "Svelte renders the package coverage widget against the same proof-backed route used by the server.",
          limit: 4,
          title: "Vapi Replacement Coverage",
        },
      );
    });
    unsubscribeProofTrends = proofTrends.subscribe(() => {
      proofTrendsHTML = renderVoiceProofTrendsHTML(proofTrends.getSnapshot(), {
        description:
          "Svelte renders sustained proof freshness, provider p95, turn p95, and live p95 from the package proof-trends widget.",
        title: "Sustained Proof Trends",
      });
    });
    unsubscribeProfileComparison = profileComparison.subscribe(() => {
      profileComparisonHTML = renderVoiceProfileComparisonHTML(
        profileComparison.getSnapshot(),
        profileComparisonWidgetOptions,
      );
    });
    unsubscribeReconnectEvidence = reconnectEvidence.subscribe(() => {
      reconnectEvidenceHTML = renderVoiceReconnectProfileEvidenceHTML(
        reconnectEvidence.getSnapshot(),
        reconnectEvidenceWidgetOptions,
      );
    });
    unsubscribeProfileSwitch = profileSwitchRecommendation.subscribe(() => {
      profileSwitchHTML = renderVoiceProfileSwitchRecommendationHTML(
        profileSwitchRecommendation.getSnapshot(),
        profileSwitchWidgetOptions,
      );
    });
    unsubscribeReadinessFailures = readinessFailures.subscribe(() => {
      readinessFailuresHTML = renderVoiceReadinessFailuresHTML(
        readinessFailures.getSnapshot(),
        readinessFailuresWidgetOptions,
      );
    });
    unsubscribeSessionSnapshot = sessionSnapshot.subscribe(() => {
      sessionSnapshotHTML = sessionSnapshot.getHTML();
    });
    unsubscribeSessionObservability = sessionObservability.subscribe(() => {
      sessionObservabilityHTML = sessionObservability.getHTML();
    });
    unsubscribeCallDebugger = callDebugger.subscribe(() => {
      callDebuggerHTML = callDebugger.getHTML();
    });
    unsubscribeDeliveryRuntime = deliveryRuntime.subscribe(() => {
      deliveryRuntimeHTML = deliveryRuntime.getHTML();
    });
    unsubscribeOpsActionCenter = opsActionCenter.subscribe(() => {
      opsActionCenterHTML = opsActionCenter.getHTML();
    });
    unsubscribeProviderStatus = providerStatus.subscribe(() => {
      providerStatusHTML = providerStatus.getHTML();
    });
    unsubscribeProviderCapabilities = providerCapabilities.subscribe(() => {
      providerCapabilitiesHTML = providerCapabilities.getHTML();
    });
    unsubscribeProviderContracts = providerContracts.subscribe(() => {
      providerContractsHTML = providerContracts.getHTML();
    });
    unsubscribeProviderSimulation = providerSimulation.subscribe(() => {
      providerSimulationHTML = providerSimulation.getHTML();
    });
    unsubscribeRoutingStatus = routingStatus.subscribe(() => {
      routingStatusHTML = routingStatus.getHTML();
    });
    unsubscribeTurnQuality = turnQuality.subscribe(() => {
      turnQualityHTML = turnQuality.getHTML();
    });
    unsubscribeTurnLatency = turnLatency.subscribe(() => {
      turnLatencyHTML = turnLatency.getHTML();
    });
    unsubscribeTraceTimeline = traceTimeline.subscribe(() => {
      traceTimelineHTML = traceTimeline.getHTML();
    });
    opsStatusHTML = opsStatus.getHTML();
    deliveryRuntimeHTML = deliveryRuntime.getHTML();
    opsActionCenterHTML = opsActionCenter.getHTML();
    platformCoverageHTML = renderVoicePlatformCoverageHTML(
      platformCoverage.getSnapshot(),
      {
        description:
          "Svelte renders the package coverage widget against the same proof-backed route used by the server.",
        limit: 4,
        title: "Vapi Replacement Coverage",
      },
    );
    realCallWorkerHTML = renderVoiceRealCallEvidenceWorkerHealthHTML(null, {
      description:
        "Svelte renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.",
    });
    proofTrendsHTML = renderVoiceProofTrendsHTML(proofTrends.getSnapshot(), {
      description:
        "Svelte renders sustained proof freshness, provider p95, turn p95, and live p95 from the package proof-trends widget.",
      title: "Sustained Proof Trends",
    });
    profileComparisonHTML = renderVoiceProfileComparisonHTML(
      profileComparison.getSnapshot(),
      profileComparisonWidgetOptions,
    );
    reconnectEvidenceHTML = renderVoiceReconnectProfileEvidenceHTML(
      reconnectEvidence.getSnapshot(),
      reconnectEvidenceWidgetOptions,
    );
    profileSwitchHTML = renderVoiceProfileSwitchRecommendationHTML(
      profileSwitchRecommendation.getSnapshot(),
      profileSwitchWidgetOptions,
    );
    readinessFailuresHTML = renderVoiceReadinessFailuresHTML(
      readinessFailures.getSnapshot(),
      readinessFailuresWidgetOptions,
    );
    sessionSnapshotHTML = sessionSnapshot.getHTML();
    sessionObservabilityHTML = sessionObservability.getHTML();
    callDebuggerHTML = callDebugger.getHTML();
    providerCapabilitiesHTML = providerCapabilities.getHTML();
    providerContractsHTML = providerContracts.getHTML();
    providerSimulationHTML = providerSimulation.getHTML();
    providerStatusHTML = providerStatus.getHTML();
    routingStatusHTML = routingStatus.getHTML();
    turnQualityHTML = turnQuality.getHTML();
    turnLatencyHTML = turnLatency.getHTML();
    traceTimelineHTML = traceTimeline.getHTML();
    void opsStatus.refresh().catch(() => {});
    void deliveryRuntime.refresh().catch(() => {});
    void platformCoverage.refresh().catch(() => {});
    void refreshRealCallWorkerHealth();
    void proofTrends.refresh().catch(() => {});
    void reconnectEvidence.refresh().catch(() => {});
    void profileSwitchRecommendation.refresh().catch(() => {});
    void readinessFailures.refresh().catch(() => {});
    void sessionSnapshot.refresh().catch(() => {});
    void callDebugger.refresh().catch(() => {});
    void providerCapabilities.refresh().catch(() => {});
    void providerContracts.refresh().catch(() => {});
    void providerStatus.refresh().catch(() => {});
    refreshCampaignDialerProof();
    void routingStatus.refresh().catch(() => {});
    void turnQuality.refresh().catch(() => {});
    void turnLatency.refresh().catch(() => {});
    void traceTimeline.refresh().catch(() => {});
    if (providerSimulationElement) {
      unbindProviderSimulation = providerSimulation.bind(
        providerSimulationElement,
      );
    }
    if (bargeInProofElement) {
      bargeInProof = mountDemoBargeInProof(bargeInProofElement);
    }
    if (opsActionHistoryElement) {
      opsActionHistory = mountVoiceOpsActionHistory(
        opsActionHistoryElement,
        "/api/voice/ops-actions/history",
        { intervalMs: 5_000 },
      );
    }
    if (liveOpsPanelElement) {
      liveOpsPanel = mountVoiceLiveOpsPanel(liveOpsPanelElement, {
        getSessionId: () => currentVoice.sessionId,
        onControl: ({ action, detail, tag }) => {
          const activeVoice =
            activeMode === "general" ? generalVoice : guidedVoice;
          if (!activeVoice) {
            return;
          }
          if (action === "force-handoff") {
            activeVoice.callControl({
              action: "transfer",
              metadata: { source: "live-ops" },
              reason: detail,
              target: tag,
            });
            stopMic();
          } else if (action === "escalate" || action === "operator-takeover") {
            activeVoice.callControl({
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
    }
    void refreshIntakes();
    void refreshAgentSquadStatus();
    refreshTimer = setInterval(() => {
      void refreshIntakes();
      void refreshAgentSquadStatus();
    }, 4000);
    realCallWorkerTimer = setInterval(() => {
      void refreshRealCallWorkerHealth();
    }, 10_000);
  });

  onDestroy(() => {
    if (typeof window !== "undefined") {
      const demoWindow = window as VoiceDemoWindow;
      window.removeEventListener(
        "absolute-voice-simulate-disconnect",
        simulateDisconnect,
      );
      if (
        demoWindow.__absoluteVoiceDemoSimulateDisconnect === simulateDisconnect
      ) {
        delete demoWindow.__absoluteVoiceDemoSimulateDisconnect;
      }
    }
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    if (realCallWorkerTimer) {
      clearInterval(realCallWorkerTimer);
    }
    stopMic();
    unsubscribeGuided();
    unsubscribeGeneral();
    unsubscribeDeliveryRuntime();
    unsubscribeOpsActionCenter();
    unsubscribeOpsStatus();
    unsubscribePlatformCoverage();
    unsubscribeProfileComparison();
    unsubscribeProfileSwitch();
    unsubscribeProofTrends();
    unsubscribeReadinessFailures();
    unsubscribeSessionSnapshot();
    unsubscribeSessionObservability();
    unsubscribeCallDebugger();
    unsubscribeProviderSimulation();
    readinessFailures.close();
    sessionSnapshot.close();
    sessionObservability.close();
    callDebugger.close();
    unbindProviderSimulation();
    unsubscribeProviderCapabilities();
    unsubscribeProviderContracts();
    unsubscribeProviderStatus();
    unsubscribeRoutingStatus();
    unsubscribeTraceTimeline();
    unsubscribeTurnQuality();
    unsubscribeTurnLatency();
    bargeInProof?.close();
    unsubscribeReconnectEvidence();
    opsActionHistory?.close();
    liveOpsPanel?.close();
    guidedVoice?.close();
    generalVoice?.close();
    opsStatus.close();
    platformCoverage.close();
    profileComparison.close();
    reconnectEvidence.close();
    profileSwitchRecommendation.close();
    proofTrends.close();
    deliveryRuntime.close();
    opsActionCenter.close();
    providerCapabilities.close();
    providerContracts.close();
    providerSimulation.close();
    providerStatus.close();
    routingStatus.close();
    traceTimeline.close();
    turnQuality.close();
    turnLatency.close();
  });
</script>

<Head
  title="AbsoluteJS Voice Test - Svelte"
  description="AbsoluteJS chat-style voice demo with guided and general modes in Svelte."
  {cssPath}
/>

<div class="voice-demo-page">
  <header>
    <a class="logo" href="/">
      <img src="/assets/png/absolutejs-temp.png" height="24" alt="AbsoluteJS" />
      AbsoluteJS
    </a>
    <nav>
      {#each FRAMEWORKS as framework}
        <a class:active={framework.id === "svelte"} href={framework.href}>
          {framework.label}
        </a>
      {/each}
      <a href="/reviews">Reviews</a>
      <a href="/traces">Traces</a>
      <a href="/carriers">Carriers</a>
      <a href="/phone-agent">Phone Agent</a>
    </nav>
  </header>
  <main class="voice-shell">
    <section class="voice-grid">
      <article class="voice-card voice-hero">
        <div class="voice-hero-layout">
          <div>
            <span class="voice-framework-pill">Svelte Entry Point</span>
            <h2>Chat-style voice demo in Svelte</h2>
            <p class="voice-brand-copy">{FRAMEWORK_DESCRIPTIONS.svelte}</p>
            <div class="voice-badges">
              <span class="voice-badge">Deepgram Flux</span>
              <span class="voice-badge">Phrase hint correction</span>
              <span class="voice-badge">Reconnect-aware sessions</span>
            </div>
          </div>
          <div class="voice-metrics">
            <div class="voice-metric">
              <span class="voice-metric-label">Connection</span>
              <span class="voice-metric-value"
                >{currentVoice.isConnected ? "Connected" : "Waiting"}</span
              >
            </div>
            <div class="voice-metric">
              <span class="voice-metric-label">Scenario</span>
              <span class="voice-metric-value">
                {activeMode ? getVoiceModeLabel(activeMode) : "Choose one"}
              </span>
            </div>
            <div class="voice-metric">
              <span class="voice-metric-label">Saved captures</span>
              <span class="voice-metric-value">{savedIntakes.length}</span>
            </div>
            <div class="voice-metric">
              <span class="voice-metric-label">Model</span>
              <span class="voice-metric-value"
                >{getVoiceProviderLabel(modelProvider)}</span
              >
            </div>
            <div class="voice-metric">
              <span class="voice-metric-label">Routing</span>
              <span class="voice-metric-value"
                >{getVoiceRoutingLabel(routingMode)}</span
              >
            </div>
            <div class="voice-metric">
              <span class="voice-metric-label">Guarded profile</span>
              <span class="voice-metric-value">
                {formatVoiceProfileSwitchGuardLabel(profileSwitchGuardDecision)}
              </span>
              <span class="voice-metric-label">
                {formatVoiceProfileSwitchGuardSummary(
                  profileSwitchGuardDecision,
                )}
              </span>
            </div>
          </div>
        </div>
      </article>

      <article class="voice-card voice-provider-card">
        <span class="voice-framework-pill">Model Provider</span>
        <h2>Choose the assistant brain</h2>
        <p class="voice-footnote">
          Switch providers before starting the microphone. The voice route
          receives the selected provider on every session.
        </p>
        <label class="voice-provider-select">
          <span>Provider</span>
          <select
            value={modelProvider}
            on:change={changeModelProviderFromEvent}
          >
            {#each VOICE_MODEL_PROVIDERS as provider}
              <option value={provider.id}>{provider.label}</option>
            {/each}
          </select>
        </label>
        <label class="voice-provider-select">
          <span>Voice profile</span>
          <select value={profileId} on:change={changeProfileIdFromEvent}>
            {#each VOICE_PROFILES as profile}
              <option value={profile.id}>{profile.label}</option>
            {/each}
          </select>
        </label>
        <label class="voice-provider-select">
          <span>STT routing</span>
          <select value={routingMode} on:change={changeRoutingModeFromEvent}>
            {#each VOICE_ROUTING_MODES as routing}
              <option value={routing.id}>{routing.label}</option>
            {/each}
          </select>
        </label>
        <label class="voice-provider-select">
          <span>Speech engine</span>
          <select value={speechEngine} on:change={changeSpeechEngineFromEvent}>
            {#each VOICE_SPEECH_ENGINES as engine}
              <option value={engine.id}>{engine.label}</option>
            {/each}
          </select>
        </label>
        <p class="voice-footnote">
          {getVoiceProfileLabel(profileId)} uses {VOICE_PROFILES.find(
            (item) => item.id === profileId,
          )?.description ?? "the selected real-call defaults."}
        </p>
      </article>

      <article class="voice-card voice-proof-dashboard-card">
        <span class="voice-framework-pill">Proof dashboards</span>
        <h2>Open the production evidence</h2>
        <p class="voice-footnote">
          The same trace-backed package routes work in every framework:
          interruption, live timing, turn waterfalls, readiness, and provider
          contracts.
        </p>
        <div class="voice-proof-links">
          {#each VOICE_PROOF_DASHBOARDS as dashboard}
            <a href={dashboard.href}>
              <strong>{dashboard.label}</strong>
              <span>{dashboard.description}</span>
            </a>
          {/each}
        </div>
      </article>

      <div class="voice-card voice-provider-health-card">
        {@html realCallWorkerHTML}
      </div>

      <div class="voice-card voice-provider-health-card">
        {@html platformCoverageHTML}
      </div>

      <div class="voice-card voice-provider-health-card">
        {@html proofTrendsHTML}
      </div>

      <div class="voice-card voice-provider-health-card">
        {@html profileComparisonHTML}
      </div>

      <div class="voice-card voice-provider-health-card">
        {@html reconnectEvidenceHTML}
      </div>

      <div class="voice-card voice-provider-health-card">
        {@html profileSwitchHTML}
      </div>

      <div class="voice-card voice-provider-health-card">
        {@html readinessFailuresHTML}
      </div>

      <div class="voice-card voice-provider-health-card">
        {@html sessionSnapshotHTML}
      </div>

      <div class="voice-card voice-provider-health-card">
        {@html sessionObservabilityHTML}
      </div>

      <div class="voice-card voice-provider-health-card">
        {@html callDebuggerHTML}
      </div>

      <div class="voice-card voice-routing-card voice-routing-status-host">
        {@html routingStatusHTML}
      </div>

      <article class="voice-card voice-agent-squad-card">
        <span class="voice-framework-pill">Agent Squad</span>
        <h2>Specialist routing is live</h2>
        <p class="voice-footnote">
          Say “I have a billing question about my invoice” to route from the
          front desk to billing with a compact context policy.
        </p>
        <div class="voice-routing-grid">
          <div>
            <span>Current specialist</span>
            <strong>{agentSquadStatus?.currentAgentId ?? "front-desk"}</strong>
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
        <p class="voice-footnote">
          {#if agentSquadStatus?.lastHandoff}
            {agentSquadStatus.lastHandoff.fromAgentId} → {agentSquadStatus
              .lastHandoff.targetAgentId}: {agentSquadStatus.lastHandoff
              .summary ??
              agentSquadStatus.lastHandoff.reason ??
              "handoff applied"}
          {:else}
            No specialist handoff in this session yet.
          {/if}
        </p>
        <p class="voice-footnote">
          <a href="/agent-squad-contract">Open squad contract proof</a>
        </p>
      </article>

      <div
        class="voice-card voice-provider-health-card voice-provider-status-host"
      >
        {@html providerStatusHTML}
      </div>

      <div
        class="voice-card voice-provider-health-card voice-provider-capabilities-host"
      >
        {@html providerCapabilitiesHTML}
      </div>

      <div
        class="voice-card voice-provider-health-card voice-provider-contracts-host"
      >
        {@html providerContractsHTML}
      </div>

      <div
        bind:this={providerSimulationElement}
        class="voice-card voice-provider-simulation-card voice-provider-simulation-host"
      >
        {@html providerSimulationHTML}
      </div>

      <div
        class="voice-card voice-provider-health-card voice-turn-quality-host"
      >
        {@html turnQualityHTML}
      </div>

      <div
        class="voice-card voice-provider-health-card voice-turn-latency-host"
        on:click={handleTurnLatencyClick}
      >
        {@html turnLatencyHTML}
      </div>

      <article class="voice-card voice-provider-health-card">
        <span class="voice-framework-pill">Campaign Dialer Proof</span>
        <h2>Carrier dialer dry-run</h2>
        <p class="voice-footnote">
          Twilio, Telnyx, and Plivo campaign dials run through the shared Svelte
          creator, attach campaign metadata, and resolve synthetic webhook
          outcomes.
        </p>
        <button
          class="absolute-voice-turn-latency__proof"
          type="button"
          disabled={campaignDialerProofSnapshot?.isLoading}
          on:click={runCampaignDialerProof}
        >
          {campaignDialerProofSnapshot?.isLoading
            ? "Running proof"
            : "Run campaign dialer proof"}
        </button>
        {#if campaignDialerProofSnapshot?.report?.providers?.length}
          <div class="voice-provider-health-list">
            {#each campaignDialerProofSnapshot.report.providers as provider}
              <div class="voice-provider-health-item">
                <strong>{provider.provider}</strong>
                <span>
                  {provider.outcomes.every((outcome) => outcome.applied)
                    ? "passed"
                    : "needs attention"}
                </span>
                <small>
                  {provider.carrierRequests.length} dry-run carrier request{provider
                    .carrierRequests.length === 1
                    ? ""
                    : "s"}
                </small>
              </div>
            {/each}
          </div>
        {:else}
          <p class="empty-copy">
            Ready for {campaignDialerProofReadyProviders}.
          </p>
        {/if}
        {#if campaignDialerProofSnapshot?.error}
          <p class="voice-footnote">{campaignDialerProofSnapshot.error}</p>
        {/if}
        <p class="voice-footnote">
          <a href="/voice/campaigns/dialer-proof">Open full proof</a>
        </p>
      </article>

      <div class="voice-card voice-workflow-card voice-ops-status-host">
        {@html opsStatusHTML}
      </div>

      <div class="voice-card voice-workflow-card voice-ops-status-host">
        {@html deliveryRuntimeHTML}
      </div>

      <div class="voice-card voice-workflow-card voice-ops-status-host">
        {@html opsActionCenterHTML}
      </div>

      <div bind:this={liveOpsPanelElement}></div>

      <div
        class="voice-card voice-workflow-card voice-ops-status-host"
        bind:this={opsActionHistoryElement}
      ></div>

      <div
        class="voice-card voice-provider-health-card voice-trace-timeline-host"
      >
        {@html traceTimelineHTML}
      </div>

      <div bind:this={bargeInProofElement}></div>

      {@html liveLatencyHTML}

      <article class="voice-card voice-card-side">
        <h2>{VOICE_DEMO_GUIDE_TITLE}</h2>
        <ol class="voice-guide-list">
          {#each VOICE_DEMO_GUIDE_STEPS as step}
            <li>{step}</li>
          {/each}
        </ol>
      </article>

      <article class="voice-card voice-assistant-config">
        <span class="voice-framework-pill">Assistant API</span>
        <h2>{VOICE_ASSISTANT_CONFIG.id}</h2>
        <p class="voice-footnote">
          Powered by createVoiceAssistant with a {VOICE_ASSISTANT_CONFIG.recipe} artifact
          plan.
        </p>
        <div class="voice-config-grid">
          <div>
            <div class="voice-assistant-label">Tools</div>
            <ul class="voice-compact-list">
              {#each VOICE_ASSISTANT_CONFIG.tools as item}
                <li>{item}</li>
              {/each}
            </ul>
          </div>
          <div>
            <div class="voice-assistant-label">Guardrails</div>
            <ul class="voice-compact-list">
              {#each VOICE_ASSISTANT_CONFIG.guardrails as item}
                <li>{item}</li>
              {/each}
            </ul>
          </div>
          <div>
            <div class="voice-assistant-label">Experiments</div>
            <ul class="voice-compact-list">
              {#each VOICE_ASSISTANT_CONFIG.experiments as item}
                <li>{item}</li>
              {/each}
            </ul>
          </div>
          <div>
            <div class="voice-assistant-label">Artifacts</div>
            <ul class="voice-compact-list">
              {#each VOICE_ASSISTANT_CONFIG.artifacts as item}
                <li>{item}</li>
              {/each}
            </ul>
          </div>
        </div>
        <p class="voice-footnote">
          <a href="/assistant">Open analytics</a> ·
          <a href="/tasks">Open tasks</a>
          · <a href="/integrations">Open integration events</a>
          · <a href="/barge-in">Open barge-in proof</a>
        </p>
      </article>

      <article class="voice-card voice-card-wide">
        <h2>Conversation</h2>
        <div class="voice-status-list">
          <div class="status-row">
            <span class="label">Voice status</span>
            <span class="value">{currentVoice.status}</span>
          </div>
          <div class="status-row">
            <span class="label">Reconnect</span>
            <span class="value"
              >{formatReconnectState(currentVoice.reconnect)}</span
            >
          </div>
          <div class="status-row">
            <span class="label">Current prompt</span>
            <span class="value">{currentPrompt}</span>
          </div>
          <div class="status-row">
            <span class="label">Microphone</span>
            <span class="value">
              {isCapturing ? VOICE_DEMO_MIC_LIVE : VOICE_DEMO_MIC_IDLE}
            </span>
          </div>
          <div class="status-row">
            <span class="label">Current utterance</span>
            <span class="value"
              >{currentVoice.partial || "No speech captured yet"}</span
            >
          </div>
          <div class="status-row">
            <span class="label">Errors</span>
            <span class="value">{errorMessage}</span>
          </div>
          <div class="status-row">
            <span class="label">Call lifecycle</span>
            <span class="value">{callLifecycleLabel}</span>
          </div>
        </div>
        <div class="voice-chat-list">
          <article class="voice-chat-message assistant">
            <div class="voice-chat-role">
              {activeMode ? getVoiceModeLabel(activeMode) : "Voice demo"}
            </div>
            <p class="voice-turn-text">{leadMessage}</p>
          </article>
          {#each currentVoice.turns as turn}
            <div class="voice-chat-stack">
              <article class="voice-chat-message user">
                <div class="voice-chat-role">You</div>
                <p class="voice-turn-text">{turn.text}</p>
              </article>
              {#if turn.assistantText}
                <article class="voice-chat-message assistant">
                  <div class="voice-chat-role">
                    {activeMode ? getVoiceModeLabel(activeMode) : "Guide"}
                  </div>
                  <p class="voice-turn-text">{turn.assistantText}</p>
                </article>
              {/if}
            </div>
          {/each}
          {#if currentVoice.partial}
            <article class="voice-chat-message user pending">
              <div class="voice-chat-role">Speaking</div>
              <p class="voice-turn-text">{currentVoice.partial}</p>
            </article>
          {/if}
        </div>
        <div class="voice-monitor" class:is-live={isCapturing}>
          <div class="voice-monitor-header">
            <span class="voice-monitor-label">Input monitor</span>
            <span class="voice-live-pill" class:is-live={isCapturing}>
              <span class="voice-live-dot"></span>
              {isCapturing ? "Microphone live" : "Microphone idle"}
            </span>
          </div>
          <svg
            aria-label="Microphone waveform"
            class="voice-wave"
            viewBox="0 0 320 88"
          >
            <path class="voice-wave-baseline" d="M 0 44 L 320 44" />
            <path class="voice-wave-glow" d={wavePath} />
            <path class="voice-wave-line" d={wavePath} />
          </svg>
        </div>
        <div class="voice-actions">
          {#if isCapturing}
            <button class="primary" on:click={stopMic}>
              {VOICE_DEMO_STOP_LABEL}
            </button>
          {:else}
            <button class="primary" on:click={() => void startMode("guided")}>
              {VOICE_DEMO_GUIDED_LABEL}
            </button>
            <button on:click={() => void startMode("general")}>
              {VOICE_DEMO_GENERAL_LABEL}
            </button>
          {/if}
        </div>
        <div class="voice-actions">
          {#each VOICE_CALL_CONTROL_ACTIONS as action}
            <button type="button" on:click={() => runCallControl(action)}>
              {action.label}
            </button>
          {/each}
        </div>
        <p class="voice-footnote">
          This demo uses the dev-only in-memory voice session store. Real
          deployments should replace it with Redis or Postgres.
        </p>
      </article>

      <article class="voice-card voice-hero">
        <h2>Saved captures</h2>
        <p class="voice-footnote">
          Open <a href="/reviews/latest">the latest review</a> or
          <a href="/reviews">browse all reviews</a> after a completed demo call.
        </p>
        <div class="voice-saved-list">
          {#if savedIntakes.length === 0}
            <p class="empty-copy">No saved captures yet.</p>
          {:else}
            {#each savedIntakes as intake}
              <article class="saved-item">
                <div class="saved-item-header">
                  <strong>{intake.title}</strong>
                  <span>{formatDateTime(intake.completedAt)}</span>
                </div>
                <div class="saved-item-meta">
                  <span class="pill"
                    >{getVoiceModeLabel(intake.scenarioId)}</span
                  >
                  <span class="pill"
                    >{intake.turnCount} turn{intake.turnCount === 1
                      ? ""
                      : "s"}</span
                  >
                  {#if intake.detectedName}
                    <span class="pill">{intake.detectedName}</span>
                  {/if}
                </div>
                <div class="saved-answer-list">
                  {#each intake.promptAnswers as entry}
                    <div class="saved-answer">
                      <div class="saved-answer-label">{entry.prompt}</div>
                      <p class="saved-answer-text">{entry.response}</p>
                    </div>
                  {/each}
                </div>
                <div class="voice-assistant-label">Full transcript</div>
                <p>{intake.transcript}</p>
                <p class="saved-summary">{intake.assistantSummary}</p>
              </article>
            {/each}
          {/if}
        </div>
      </article>
    </section>
    <p class="footer">
      <img src="/assets/png/absolutejs-temp.png" alt="" />
      Powered by
      <a href="https://absolutejs.com" target="_blank" rel="noopener noreferrer"
        >AbsoluteJS</a
      >
    </p>
  </main>
</div>
