<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from "vue";
import {
  useVoiceStream,
  VoiceCallDebuggerLaunch,
  VoiceDeliveryRuntime,
  VoiceOpsActionCenter,
  VoiceOpsStatus,
  VoicePlatformCoverage,
  VoiceProofTrends,
  VoiceReconnectProfileEvidence,
  useVoiceProfileComparison,
  VoiceProviderCapabilities,
  VoiceProviderContracts,
  VoiceProviderSimulationControls,
  VoiceProviderStatus,
  VoiceReadinessFailures,
  VoiceRoutingStatus,
  VoiceSessionObservability,
  VoiceSessionSnapshot,
  useVoiceTraceTimeline,
  VoiceTurnLatency,
  VoiceTurnQuality,
} from "@absolutejs/voice/vue";
import {
  createVoiceProfileSwitchRecommendationStore,
  createVoiceOpsActionCenterActions,
  createVoiceProfileComparisonViewModel,
  createVoiceTraceTimelineViewModel,
  mountVoiceOpsActionHistory,
  renderVoiceProfileSwitchRecommendationHTML,
} from "@absolutejs/voice/client";
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

type VueVoiceDemoProps = {
  initialModelProvider?: VoiceModelProvider;
  initialProfileId?: VoiceProfileId;
  initialRoutingMode?: VoiceRoutingMode;
  initialSpeechEngine?: VoiceSpeechEngine;
};
type VoiceDemoWindow = typeof window & {
  __absoluteVoiceDemoSimulateDisconnect?: () => void;
};

const props = withDefaults(defineProps<VueVoiceDemoProps>(), {
  initialModelProvider: "deterministic",
  initialProfileId: "meeting-recorder",
  initialRoutingMode: "balanced",
  initialSpeechEngine: "cascaded",
});

const modelProvider = ref<VoiceModelProvider>(props.initialModelProvider);
const profileId = ref<VoiceProfileId>(props.initialProfileId);
const routingMode = ref<VoiceRoutingMode>(props.initialRoutingMode);
const speechEngine = ref<VoiceSpeechEngine>(props.initialSpeechEngine);
const guidedVoice = useVoiceStream<SavedIntake>(
  getVoiceRoutePath(
    "guided",
    modelProvider.value,
    routingMode.value,
    speechEngine.value,
    profileId.value,
  ),
  { reconnectReportPath: "/api/voice/reconnect-traces" },
);
const generalVoice = useVoiceStream<SavedIntake>(
  getVoiceRoutePath(
    "general",
    modelProvider.value,
    routingMode.value,
    speechEngine.value,
    profileId.value,
  ),
  { reconnectReportPath: "/api/voice/reconnect-traces" },
);
const traceTimeline = useVoiceTraceTimeline("/api/voice-traces", {
  intervalMs: 5_000,
});
const profileComparison = useVoiceProfileComparison(
  "/api/voice/real-call-profile-history",
  {
    intervalMs: 10_000,
  },
);
const profileComparisonModel = computed(() =>
  createVoiceProfileComparisonViewModel(
    {
      error: profileComparison.error.value,
      isLoading: profileComparison.isLoading.value,
      report: profileComparison.report.value,
      updatedAt: profileComparison.updatedAt.value,
    },
    {
      description:
        "Vue renders measured profile defaults and persisted reconnect resume evidence behind each selected stack.",
      title: "Profile + Reconnect Evidence",
    },
  ),
);
const profileSwitchRecommendation = createVoiceProfileSwitchRecommendationStore(
  "/api/voice/profile-switch-recommendation",
  {
    intervalMs: 10_000,
  },
);
const profileSwitchWidgetOptions = {
  description:
    "Vue compares latest session signals against measured profile evidence and recommends whether to switch stacks.",
  title: "Profile Switch Recommendation",
};
const profileSwitchHTML = ref(
  renderVoiceProfileSwitchRecommendationHTML(
    profileSwitchRecommendation.getSnapshot(),
    profileSwitchWidgetOptions,
  ),
);
const realCallWorkerDescription =
  "Vue renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.";
const realCallWorkerHTML = ref(
  renderVoiceRealCallEvidenceWorkerHealthHTML(null, {
    description: realCallWorkerDescription,
  }),
);
const refreshRealCallWorkerHealth = async () => {
  try {
    realCallWorkerHTML.value = renderVoiceRealCallEvidenceWorkerHealthHTML(
      await fetchVoiceRealCallEvidenceWorkerHealth(),
      { description: realCallWorkerDescription },
    );
  } catch (error) {
    realCallWorkerHTML.value = renderVoiceRealCallEvidenceWorkerHealthHTML(
      null,
      {
        description: realCallWorkerDescription,
        error: formatErrorMessage(error),
      },
    );
  }
};
type CampaignDialerProofSnapshot = {
  error: string | null;
  isLoading: boolean;
  report?: {
    providers: Array<{
      carrierRequests: unknown[];
      outcomes: Array<{ applied: boolean }>;
      provider: string;
    }>;
  };
  status?: {
    providers: string[];
  };
};
const campaignDialerProof = ref<CampaignDialerProofSnapshot>({
  error: null,
  isLoading: false,
});
const campaignDialerProofReadyProviders = computed(() =>
  (
    campaignDialerProof.value.status?.providers ?? ["twilio", "telnyx", "plivo"]
  ).join(", "),
);
const refreshCampaignDialerProof = async () => {
  const response = await fetch("/api/voice/campaigns/dialer-proof");
  if (!response.ok) {
    throw new Error(`Campaign dialer proof status failed: ${response.status}`);
  }
  campaignDialerProof.value = {
    ...campaignDialerProof.value,
    error: null,
    status: await response.json(),
  };
};
const runCampaignDialerProof = async () => {
  campaignDialerProof.value = {
    ...campaignDialerProof.value,
    error: null,
    isLoading: true,
  };
  try {
    const response = await fetch("/api/voice/campaigns/dialer-proof", {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Campaign dialer proof failed: ${response.status}`);
    }
    campaignDialerProof.value = {
      ...campaignDialerProof.value,
      error: null,
      isLoading: false,
      report: await response.json(),
    };
  } catch (error) {
    campaignDialerProof.value = {
      ...campaignDialerProof.value,
      error: formatErrorMessage(error),
      isLoading: false,
    };
  }
};
const activeMode = ref<VoiceDemoMode | null>(null);
const isCapturing = ref(false);
const hasStartedModes = ref<Record<VoiceDemoMode, boolean>>({
  general: false,
  guided: false,
});
const micError = ref<string | null>(null);
const savedIntakes = ref<SavedIntake[]>([]);
const agentSquadStatus = ref<VoiceAgentSquadDemoStatus | null>(null);
const waveLevels = ref(createInitialVoiceWaveLevels());
const bargeInProofEl = ref<HTMLElement | null>(null);
const opsActionHistoryEl = ref<HTMLElement | null>(null);
const liveOpsPanelEl = ref<HTMLElement | null>(null);
const liveLatencyHTML = ref("");
let microphone: ReturnType<typeof createDemoMicrophone> | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let realCallWorkerTimer: ReturnType<typeof setInterval> | null = null;
let bargeInProof: ReturnType<typeof mountDemoBargeInProof> | null = null;
let opsActionHistory: ReturnType<typeof mountVoiceOpsActionHistory> | null =
  null;
let liveOpsPanel: ReturnType<typeof mountVoiceLiveOpsPanel> | null = null;
let unsubscribeProfileSwitch = () => {};
const currentVoice = computed(() =>
  activeMode.value === "general" ? generalVoice : guidedVoice,
);
const bargeInEvidence = createDemoBargeInEvidence(() => {
  const voice = currentVoice.value;
  return {
    assistantAudio: voice.assistantAudio.value,
    assistantTexts: voice.assistantTexts.value,
    sendAudio: voice.sendAudio,
    sessionId: voice.sessionId.value,
  };
});
const liveLatencyEvidence = createDemoLiveTurnLatencyEvidence(() => {
  const voice = currentVoice.value;
  return {
    assistantAudio: voice.assistantAudio.value,
    assistantTexts: voice.assistantTexts.value,
    sessionId: voice.sessionId.value,
  };
});
liveLatencyHTML.value = renderDemoLiveTurnLatencyHTML(
  liveLatencyEvidence.getSnapshot(),
);
const wavePath = computed(() => createVoiceWavePath(waveLevels.value));
const errorMessage = computed(
  () => micError.value || currentVoice.value.error.value || "None",
);
const profileSwitchGuardDecision = computed(() =>
  getVoiceProfileSwitchGuardDecision(currentVoice.value.sessionMetadata.value),
);
const currentPrompt = computed(() =>
  getVoiceModePrompt({
    hasStarted:
      (activeMode.value ? hasStartedModes.value[activeMode.value] : false) ||
      currentVoice.value.turns.value.length > 0,
    mode: activeMode.value,
    status: currentVoice.value.status.value,
    turnCount: currentVoice.value.turns.value.length,
  }),
);
const leadMessage = computed(() =>
  getVoiceLeadMessage({
    hasStarted:
      (activeMode.value ? hasStartedModes.value[activeMode.value] : false) ||
      currentVoice.value.turns.value.length > 0,
    mode: activeMode.value,
    status: currentVoice.value.status.value,
    turnCount: currentVoice.value.turns.value.length,
  }),
);
const callLifecycleLabel = computed(() => {
  const call = currentVoice.value.call.value;
  return call?.disposition
    ? `${call.disposition} after ${call.events.length} lifecycle event${call.events.length === 1 ? "" : "s"}`
    : (call?.events.at(-1)?.type ?? "Not started");
});
const traceTimelineModel = computed(() =>
  createVoiceTraceTimelineViewModel(
    {
      error: traceTimeline.error.value,
      isLoading: traceTimeline.isLoading.value,
      report: traceTimeline.report.value,
      updatedAt: traceTimeline.updatedAt.value,
    },
    {
      incidentBundleBasePath: "/voice-incidents",
      limit: 2,
      operationsRecordBasePath: "/voice-operations",
    },
  ),
);
watchEffect(() => {
  currentVoice.value.assistantAudio.value.length;
  currentVoice.value.assistantTexts.value.length;
  currentVoice.value.sessionId.value;
  bargeInEvidence.syncAssistantOutput();
  liveLatencyEvidence.syncAssistantOutput();
  liveLatencyHTML.value = renderDemoLiveTurnLatencyHTML(
    liveLatencyEvidence.getSnapshot(),
  );
});

const refreshIntakes = async () => {
  savedIntakes.value = await fetchSavedIntakes();
};

const refreshAgentSquadStatus = async () => {
  agentSquadStatus.value = await fetchAgentSquadDemoStatus(
    currentVoice.value.sessionId.value || undefined,
  );
};

const startMic = async () => {
  try {
    microphone ??= createDemoMicrophone(
      (audio) => {
        liveLatencyEvidence.recordAudio(audio);
        liveLatencyHTML.value = renderDemoLiveTurnLatencyHTML(
          liveLatencyEvidence.getSnapshot(),
        );
        bargeInEvidence.sendAudio(audio);
      },
      (level) => {
        waveLevels.value = pushVoiceWaveLevel(waveLevels.value, level);
      },
      {
        sampleRateHz: getVoiceSpeechEngineSampleRate(speechEngine.value),
      },
    );
    await microphone.start();
    micError.value = null;
    isCapturing.value = true;
  } catch (error) {
    microphone?.stop();
    microphone = null;
    isCapturing.value = false;
    waveLevels.value = createInitialVoiceWaveLevels();
    micError.value = formatErrorMessage(error);
  }
};

const stopMic = () => {
  microphone?.stop();
  microphone = null;
  isCapturing.value = false;
  waveLevels.value = createInitialVoiceWaveLevels();
};

const changeModelProvider = (provider: VoiceModelProvider) => {
  stopMic();
  rememberVoiceModelProvider(provider);
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("provider", provider);
  window.location.href = nextUrl.toString();
};

const changeProfileId = (nextProfileId: VoiceProfileId) => {
  stopMic();
  rememberVoiceProfileId(nextProfileId);
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("voiceProfile", nextProfileId);
  window.location.href = nextUrl.toString();
};

const changeRoutingMode = (routing: VoiceRoutingMode) => {
  stopMic();
  rememberVoiceRoutingMode(routing);
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("routing", routing);
  window.location.href = nextUrl.toString();
};

const changeSpeechEngine = (engine: VoiceSpeechEngine) => {
  stopMic();
  rememberVoiceSpeechEngine(engine);
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set("engine", engine);
  window.location.href = nextUrl.toString();
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

const startMode = async (mode: VoiceDemoMode) => {
  activeMode.value = mode;
  hasStartedModes.value = {
    ...hasStartedModes.value,
    [mode]: true,
  };
  await startMic();
};

const runCallControl = (
  action: (typeof VOICE_CALL_CONTROL_ACTIONS)[number],
) => {
  currentVoice.value.callControl(action);
  stopMic();
};
const simulateDisconnect = () => currentVoice.value.simulateDisconnect();

onMounted(() => {
  const demoWindow = window as VoiceDemoWindow;
  demoWindow.__absoluteVoiceDemoSimulateDisconnect = simulateDisconnect;
  window.addEventListener(
    "absolute-voice-simulate-disconnect",
    simulateDisconnect,
  );
  unsubscribeProfileSwitch = profileSwitchRecommendation.subscribe(() => {
    profileSwitchHTML.value = renderVoiceProfileSwitchRecommendationHTML(
      profileSwitchRecommendation.getSnapshot(),
      profileSwitchWidgetOptions,
    );
  });
  void profileSwitchRecommendation.refresh().catch(() => {});
  void refreshRealCallWorkerHealth();
  if (bargeInProofEl.value) {
    bargeInProof = mountDemoBargeInProof(bargeInProofEl.value);
  }
  if (opsActionHistoryEl.value) {
    opsActionHistory = mountVoiceOpsActionHistory(
      opsActionHistoryEl.value,
      "/api/voice/ops-actions/history",
      { intervalMs: 5_000 },
    );
  }
  if (liveOpsPanelEl.value) {
    liveOpsPanel = mountVoiceLiveOpsPanel(liveOpsPanelEl.value, {
      getSessionId: () => currentVoice.value.sessionId.value,
      onControl: ({ action, detail, tag }) => {
        if (action === "force-handoff") {
          currentVoice.value.callControl({
            action: "transfer",
            metadata: { source: "live-ops" },
            reason: detail,
            target: tag,
          });
          stopMic();
        } else if (action === "escalate" || action === "operator-takeover") {
          currentVoice.value.callControl({
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
  void refreshCampaignDialerProof().catch((error) => {
    campaignDialerProof.value = {
      ...campaignDialerProof.value,
      error: formatErrorMessage(error),
    };
  });
  refreshTimer = setInterval(() => {
    void refreshIntakes();
    void refreshAgentSquadStatus();
  }, 4_000);
  realCallWorkerTimer = setInterval(() => {
    void refreshRealCallWorkerHealth();
  }, 10_000);
  void refreshAgentSquadStatus();
});

onUnmounted(() => {
  const demoWindow = window as VoiceDemoWindow;
  window.removeEventListener(
    "absolute-voice-simulate-disconnect",
    simulateDisconnect,
  );
  if (demoWindow.__absoluteVoiceDemoSimulateDisconnect === simulateDisconnect) {
    delete demoWindow.__absoluteVoiceDemoSimulateDisconnect;
  }
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  if (realCallWorkerTimer) {
    clearInterval(realCallWorkerTimer);
  }
  bargeInProof?.close();
  opsActionHistory?.close();
  liveOpsPanel?.close();
  unsubscribeProfileSwitch();
  profileSwitchRecommendation.close();
  stopMic();
});
</script>

<template>
  <div class="voice-demo-page">
    <header>
      <a class="logo" href="/">
        <img
          alt="AbsoluteJS"
          height="24"
          src="/assets/png/absolutejs-temp.png"
        />
        AbsoluteJS
      </a>
      <nav>
        <a
          v-for="framework in FRAMEWORKS"
          :key="framework.id"
          :class="{ active: framework.id === 'vue' }"
          :href="framework.href"
        >
          {{ framework.label }}
        </a>
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
              <span class="voice-framework-pill">Vue Composable</span>
              <h2>Chat-style voice demo in Vue</h2>
              <p class="voice-brand-copy">
                {{ FRAMEWORK_DESCRIPTIONS.vue }}
              </p>
              <div class="voice-badges">
                <span class="voice-badge">Deepgram Flux</span>
                <span class="voice-badge">Phrase hint correction</span>
                <span class="voice-badge">Reconnect-aware sessions</span>
              </div>
            </div>
            <div class="voice-metrics">
              <div class="voice-metric">
                <span class="voice-metric-label">Connection</span>
                <span class="voice-metric-value">
                  {{ currentVoice.isConnected.value ? "Connected" : "Waiting" }}
                </span>
              </div>
              <div class="voice-metric">
                <span class="voice-metric-label">Scenario</span>
                <span class="voice-metric-value">
                  {{
                    activeMode ? getVoiceModeLabel(activeMode) : "Choose one"
                  }}
                </span>
              </div>
              <div class="voice-metric">
                <span class="voice-metric-label">Saved captures</span>
                <span class="voice-metric-value">{{
                  savedIntakes.length
                }}</span>
              </div>
              <div class="voice-metric">
                <span class="voice-metric-label">Model</span>
                <span class="voice-metric-value">
                  {{ getVoiceProviderLabel(modelProvider) }}
                </span>
              </div>
              <div class="voice-metric">
                <span class="voice-metric-label">Routing</span>
                <span class="voice-metric-value">
                  {{ getVoiceRoutingLabel(routingMode) }}
                </span>
              </div>
              <div class="voice-metric">
                <span class="voice-metric-label">Guarded profile</span>
                <span class="voice-metric-value">
                  {{
                    formatVoiceProfileSwitchGuardLabel(
                      profileSwitchGuardDecision,
                    )
                  }}
                </span>
                <span class="voice-metric-label">
                  {{
                    formatVoiceProfileSwitchGuardSummary(
                      profileSwitchGuardDecision,
                    )
                  }}
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
              :value="modelProvider"
              @change="changeModelProviderFromEvent"
            >
              <option
                v-for="provider in VOICE_MODEL_PROVIDERS"
                :key="provider.id"
                :value="provider.id"
              >
                {{ provider.label }}
              </option>
            </select>
          </label>
          <label class="voice-provider-select">
            <span>Voice profile</span>
            <select :value="profileId" @change="changeProfileIdFromEvent">
              <option
                v-for="profile in VOICE_PROFILES"
                :key="profile.id"
                :value="profile.id"
              >
                {{ profile.label }}
              </option>
            </select>
          </label>
          <label class="voice-provider-select">
            <span>STT routing</span>
            <select :value="routingMode" @change="changeRoutingModeFromEvent">
              <option
                v-for="routing in VOICE_ROUTING_MODES"
                :key="routing.id"
                :value="routing.id"
              >
                {{ routing.label }}
              </option>
            </select>
          </label>
          <label class="voice-provider-select">
            <span>Speech engine</span>
            <select :value="speechEngine" @change="changeSpeechEngineFromEvent">
              <option
                v-for="engine in VOICE_SPEECH_ENGINES"
                :key="engine.id"
                :value="engine.id"
              >
                {{ engine.label }}
              </option>
            </select>
          </label>
          <p class="voice-footnote">
            {{
              getVoiceProfileLabel(profileId) +
              " uses " +
              (VOICE_PROFILES.find((item) => item.id === profileId)
                ?.description ?? "the selected real-call defaults.")
            }}
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
            <a
              v-for="dashboard in VOICE_PROOF_DASHBOARDS"
              :key="dashboard.href"
              :href="dashboard.href"
            >
              <strong>{{ dashboard.label }}</strong>
              <span>{{ dashboard.description }}</span>
            </a>
          </div>
        </article>

        <div
          class="voice-card voice-provider-health-card"
          v-html="realCallWorkerHTML"
        ></div>

        <VoicePlatformCoverage
          class="voice-card voice-provider-health-card"
          description="Vue renders the package coverage component against the same proof-backed route used by the server."
          :interval-ms="10000"
          :limit="4"
          path="/api/voice/platform-coverage"
          title="Vapi Replacement Coverage"
        />

        <VoiceProofTrends
          class="voice-card voice-provider-health-card"
          description="Vue renders sustained proof freshness, provider p95, turn p95, and live p95 from the package proof-trends widget."
          :interval-ms="10000"
          path="/api/voice/proof-trends"
          title="Sustained Proof Trends"
        />

        <section
          class="voice-card voice-provider-health-card absolute-voice-profile-comparison"
          :class="`absolute-voice-profile-comparison--${profileComparisonModel.status}`"
        >
          <header class="absolute-voice-profile-comparison__header">
            <span class="absolute-voice-profile-comparison__eyebrow">
              {{ profileComparisonModel.title }}
            </span>
            <strong class="absolute-voice-profile-comparison__label">
              {{ profileComparisonModel.label }}
            </strong>
          </header>
          <p class="absolute-voice-profile-comparison__description">
            {{ profileComparisonModel.description }}
          </p>
          <div
            v-if="profileComparisonModel.profiles.length"
            class="absolute-voice-profile-comparison__profiles"
          >
            <article
              v-for="profile in profileComparisonModel.profiles"
              :key="profile.profileId"
              class="absolute-voice-profile-comparison__profile"
              :class="`absolute-voice-profile-comparison__profile--${profile.status}`"
            >
              <header>
                <span>{{ profile.status }}</span>
                <strong>{{ profile.label }}</strong>
              </header>
              <p>{{ profile.providerRoutes }}</p>
              <div>
                <span v-for="metric in profile.evidence" :key="metric.label">
                  <small>{{ metric.label }}</small>
                  <b>{{ metric.value }}</b>
                </span>
              </div>
              <em>{{ profile.nextMove }}</em>
            </article>
          </div>
          <p v-else class="absolute-voice-profile-comparison__empty">
            {{
              profileComparisonModel.error ??
              "Run real-call profile collection to populate profile comparisons."
            }}
          </p>
        </section>

        <VoiceReconnectProfileEvidence
          class="voice-card voice-provider-health-card"
          description="Vue renders persisted real browser reconnect/resume traces from the package reconnect evidence primitive."
          :interval-ms="10000"
          path="/api/voice/reconnect-profile-evidence"
          title="Persisted Reconnect Evidence"
        />

        <div
          class="voice-card voice-provider-health-card"
          v-html="profileSwitchHTML"
        ></div>

        <VoiceReadinessFailures
          class="voice-card voice-provider-health-card"
          description="Vue renders structured deploy-gate explanations from production readiness JSON when calibrated gates warn or fail."
          :interval-ms="10000"
          path="/api/production-readiness"
          title="Readiness Gate Explanations"
        />

        <VoiceSessionSnapshot
          class="voice-card voice-provider-health-card"
          description="Vue renders a downloadable support bundle with session media graph, provider routing, and turn-quality evidence."
          :interval-ms="5000"
          path="/api/voice/session-snapshot/latest"
          title="Session Debug Snapshot"
        />

        <VoiceSessionObservability
          class="voice-card voice-provider-health-card"
          description="Vue renders one per-call support report with turn waterfalls, provider recovery, tools, handoffs, guardrails, and incident handoff links."
          :interval-ms="5000"
          path="/api/voice/session-observability/demo-incident-bundle"
          title="Session Observability"
        />

        <VoiceCallDebuggerLaunch
          class="voice-card voice-provider-health-card"
          description="Vue opens the latest full call debugger with snapshot, replay, provider path, transcript, and incident markdown."
          :interval-ms="5000"
          path="/api/voice-call-debugger/latest"
          title="Debug Latest Call"
        />

        <VoiceRoutingStatus
          class="voice-card voice-routing-card"
          :interval-ms="4000"
        />

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
              <strong>{{
                agentSquadStatus?.currentAgentId ?? "front-desk"
              }}</strong>
            </div>
            <div>
              <span>Context policy</span>
              <strong>{{
                agentSquadStatus?.contextPolicy ??
                "handoff-summary-current-turn"
              }}</strong>
            </div>
            <div>
              <span>Handoffs</span>
              <strong>{{ agentSquadStatus?.handoffCount ?? 0 }}</strong>
            </div>
            <div>
              <span>Messages sent</span>
              <strong>{{ agentSquadStatus?.messageCount ?? "ready" }}</strong>
            </div>
          </div>
          <p class="voice-footnote">
            <template v-if="agentSquadStatus?.lastHandoff">
              {{ agentSquadStatus.lastHandoff.fromAgentId }} →
              {{ agentSquadStatus.lastHandoff.targetAgentId }}:
              {{
                agentSquadStatus.lastHandoff.summary ??
                agentSquadStatus.lastHandoff.reason ??
                "handoff applied"
              }}
            </template>
            <template v-else
              >No specialist handoff in this session yet.</template
            >
          </p>
          <p class="voice-footnote">
            <a href="/agent-squad-contract">Open squad contract proof</a>
          </p>
        </article>

        <VoiceProviderStatus
          class="voice-card voice-provider-health-card"
          :interval-ms="5000"
        />

        <VoiceProviderCapabilities
          class="voice-card voice-provider-health-card"
          :interval-ms="5000"
        />

        <VoiceProviderContracts
          class="voice-card voice-provider-health-card"
          :interval-ms="5000"
        />

        <VoiceProviderSimulationControls
          class="voice-card voice-provider-simulation-card"
          failure-message="Prove Deepgram STT failover to AssemblyAI without changing credentials."
          :failure-providers="['deepgram']"
          fallback-required-message="Add ASSEMBLYAI_API_KEY to enable the fallback simulation."
          fallback-required-provider="assemblyai"
          kind="stt"
          :providers="[{ provider: 'deepgram' }, { provider: 'assemblyai' }]"
        />

        <VoiceTurnQuality
          class="voice-card voice-provider-health-card"
          :interval-ms="5000"
        />

        <VoiceTurnLatency
          class="voice-card voice-provider-health-card"
          :interval-ms="5000"
          proof-label="Run latency proof"
          proof-path="/api/turn-latency/proof"
        />

        <article class="voice-card voice-provider-health-card">
          <span class="voice-framework-pill">Campaign Dialer Proof</span>
          <h2>Carrier dialer dry-run</h2>
          <p class="voice-footnote">
            Twilio, Telnyx, and Plivo campaign dials run through the shared Vue
            composable, attach campaign metadata, and resolve synthetic webhook
            outcomes.
          </p>
          <button
            class="absolute-voice-turn-latency__proof"
            type="button"
            :disabled="campaignDialerProof.isLoading"
            @click="runCampaignDialerProof"
          >
            {{
              campaignDialerProof.isLoading
                ? "Running proof"
                : "Run campaign dialer proof"
            }}
          </button>
          <div
            v-if="campaignDialerProof.report?.providers?.length"
            class="voice-provider-health-list"
          >
            <div
              v-for="provider in campaignDialerProof.report.providers"
              :key="provider.provider"
              class="voice-provider-health-item"
            >
              <strong>{{ provider.provider }}</strong>
              <span>{{
                provider.outcomes.every((outcome) => outcome.applied)
                  ? "passed"
                  : "needs attention"
              }}</span>
              <small>
                {{ provider.carrierRequests.length }} dry-run carrier request{{
                  provider.carrierRequests.length === 1 ? "" : "s"
                }}
              </small>
            </div>
          </div>
          <p v-else class="empty-copy">
            Ready for {{ campaignDialerProofReadyProviders }}.
          </p>
          <p v-if="campaignDialerProof.error" class="voice-footnote">
            {{ campaignDialerProof.error }}
          </p>
          <p class="voice-footnote">
            <a href="/voice/campaigns/dialer-proof">Open full proof</a>
          </p>
        </article>

        <VoiceOpsStatus
          class="voice-card voice-workflow-card"
          :interval-ms="5000"
        />

        <VoiceDeliveryRuntime
          class="voice-card voice-workflow-card"
          :interval-ms="5000"
        />

        <VoiceOpsActionCenter
          class="voice-card voice-workflow-card"
          :actions="
            createVoiceOpsActionCenterActions({
              providers: ['deepgram', 'assemblyai'],
            })
          "
        />

        <div ref="liveOpsPanelEl" />

        <div ref="opsActionHistoryEl" class="voice-card voice-workflow-card" />

        <article
          class="voice-card voice-provider-health-card absolute-voice-trace-timeline"
          :class="`absolute-voice-trace-timeline--${traceTimelineModel.status}`"
        >
          <header class="absolute-voice-trace-timeline__header">
            <span class="absolute-voice-trace-timeline__eyebrow">
              {{ traceTimelineModel.title }}
            </span>
            <strong class="absolute-voice-trace-timeline__label">
              {{ traceTimelineModel.label }}
            </strong>
          </header>
          <p class="absolute-voice-trace-timeline__description">
            {{ traceTimelineModel.description }}
          </p>
          <div
            v-if="traceTimelineModel.sessions.length"
            class="absolute-voice-trace-timeline__sessions"
          >
            <article
              v-for="session in traceTimelineModel.sessions"
              :key="session.sessionId"
              class="absolute-voice-trace-timeline__session"
              :class="`absolute-voice-trace-timeline__session--${session.status}`"
            >
              <header>
                <strong>{{ session.sessionId }}</strong>
                <span>{{ session.status }}</span>
              </header>
              <p>
                {{ session.label }} · {{ session.durationLabel }} ·
                {{ session.providerLabel }}
              </p>
              <p class="absolute-voice-trace-timeline__actions">
                <a :href="session.detailHref">Open timeline</a>
                <a
                  v-if="session.operationsRecordHref"
                  :href="session.operationsRecordHref"
                >
                  Open operations record
                </a>
                <a
                  v-if="session.incidentBundleHref"
                  :href="session.incidentBundleHref"
                >
                  Export incident bundle
                </a>
              </p>
            </article>
          </div>
          <p v-else class="absolute-voice-trace-timeline__empty">
            Run a voice session to see call timelines.
          </p>
        </article>

        <div ref="bargeInProofEl" />

        <div v-html="liveLatencyHTML" />

        <article class="voice-card voice-card-side">
          <h2>{{ VOICE_DEMO_GUIDE_TITLE }}</h2>
          <ol class="voice-guide-list">
            <li v-for="step in VOICE_DEMO_GUIDE_STEPS" :key="step">
              {{ step }}
            </li>
          </ol>
        </article>

        <article class="voice-card voice-assistant-config">
          <span class="voice-framework-pill">Assistant API</span>
          <h2>{{ VOICE_ASSISTANT_CONFIG.id }}</h2>
          <p class="voice-footnote">
            Powered by createVoiceAssistant with a
            {{ VOICE_ASSISTANT_CONFIG.recipe }} artifact plan.
          </p>
          <div class="voice-config-grid">
            <div>
              <div class="voice-assistant-label">Tools</div>
              <ul class="voice-compact-list">
                <li v-for="item in VOICE_ASSISTANT_CONFIG.tools" :key="item">
                  {{ item }}
                </li>
              </ul>
            </div>
            <div>
              <div class="voice-assistant-label">Guardrails</div>
              <ul class="voice-compact-list">
                <li
                  v-for="item in VOICE_ASSISTANT_CONFIG.guardrails"
                  :key="item"
                >
                  {{ item }}
                </li>
              </ul>
            </div>
            <div>
              <div class="voice-assistant-label">Experiments</div>
              <ul class="voice-compact-list">
                <li
                  v-for="item in VOICE_ASSISTANT_CONFIG.experiments"
                  :key="item"
                >
                  {{ item }}
                </li>
              </ul>
            </div>
            <div>
              <div class="voice-assistant-label">Artifacts</div>
              <ul class="voice-compact-list">
                <li
                  v-for="item in VOICE_ASSISTANT_CONFIG.artifacts"
                  :key="item"
                >
                  {{ item }}
                </li>
              </ul>
            </div>
          </div>
          <p class="voice-footnote">
            <a href="/assistant">Open analytics</a> ·
            <a href="/tasks">Open tasks</a> ·
            <a href="/integrations">Open integration events</a> ·
            <a href="/barge-in">Open barge-in proof</a>
          </p>
        </article>

        <article class="voice-card voice-card-wide">
          <h2>Conversation</h2>
          <div class="voice-status-list">
            <div class="status-row">
              <span class="label">Voice status</span>
              <span class="value">{{ currentVoice.status.value }}</span>
            </div>
            <div class="status-row">
              <span class="label">Reconnect</span>
              <span class="value">{{
                formatReconnectState(currentVoice.reconnect.value)
              }}</span>
            </div>
            <div class="status-row">
              <span class="label">Current prompt</span>
              <span class="value">{{ currentPrompt }}</span>
            </div>
            <div class="status-row">
              <span class="label">Microphone</span>
              <span class="value">{{
                isCapturing ? VOICE_DEMO_MIC_LIVE : VOICE_DEMO_MIC_IDLE
              }}</span>
            </div>
            <div class="status-row">
              <span class="label">Current utterance</span>
              <span class="value">
                {{ currentVoice.partial.value || "No speech captured yet" }}
              </span>
            </div>
            <div class="status-row">
              <span class="label">Errors</span>
              <span class="value">{{ errorMessage }}</span>
            </div>
            <div class="status-row">
              <span class="label">Call lifecycle</span>
              <span class="value">{{ callLifecycleLabel }}</span>
            </div>
          </div>
          <div class="voice-chat-list">
            <article class="voice-chat-message assistant">
              <div class="voice-chat-role">
                {{ activeMode ? getVoiceModeLabel(activeMode) : "Voice demo" }}
              </div>
              <p class="voice-turn-text">{{ leadMessage }}</p>
            </article>
            <div
              v-for="turn in currentVoice.turns.value"
              :key="turn.id"
              class="voice-chat-stack"
            >
              <article class="voice-chat-message user">
                <div class="voice-chat-role">You</div>
                <p class="voice-turn-text">{{ turn.text }}</p>
              </article>
              <article
                v-if="turn.assistantText"
                class="voice-chat-message assistant"
              >
                <div class="voice-chat-role">
                  {{ activeMode ? getVoiceModeLabel(activeMode) : "Guide" }}
                </div>
                <p class="voice-turn-text">{{ turn.assistantText }}</p>
              </article>
            </div>
            <article
              v-if="currentVoice.partial.value"
              class="voice-chat-message user pending"
            >
              <div class="voice-chat-role">Speaking</div>
              <p class="voice-turn-text">{{ currentVoice.partial.value }}</p>
            </article>
          </div>
          <div :class="['voice-monitor', { 'is-live': isCapturing }]">
            <div class="voice-monitor-header">
              <span class="voice-monitor-label">Input monitor</span>
              <span :class="['voice-live-pill', { 'is-live': isCapturing }]">
                <span class="voice-live-dot"></span>
                {{ isCapturing ? "Microphone live" : "Microphone idle" }}
              </span>
            </div>
            <svg
              aria-label="Microphone waveform"
              class="voice-wave"
              viewBox="0 0 320 88"
            >
              <path class="voice-wave-baseline" d="M 0 44 L 320 44" />
              <path class="voice-wave-glow" :d="wavePath" />
              <path class="voice-wave-line" :d="wavePath" />
            </svg>
          </div>
          <div class="voice-actions">
            <template v-if="isCapturing">
              <button class="primary" @click="stopMic">
                {{ VOICE_DEMO_STOP_LABEL }}
              </button>
            </template>
            <template v-else>
              <button class="primary" @click="startMode('guided')">
                {{ VOICE_DEMO_GUIDED_LABEL }}
              </button>
              <button @click="startMode('general')">
                {{ VOICE_DEMO_GENERAL_LABEL }}
              </button>
            </template>
          </div>
          <div class="voice-actions">
            <button
              v-for="action in VOICE_CALL_CONTROL_ACTIONS"
              :key="action.action"
              type="button"
              @click="runCallControl(action)"
            >
              {{ action.label }}
            </button>
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
            <a href="/reviews">browse all reviews</a> after a completed demo
            call.
          </p>
          <div class="voice-saved-list">
            <p v-if="savedIntakes.length === 0" class="empty-copy">
              No saved captures yet.
            </p>
            <article
              v-for="intake in savedIntakes"
              :key="intake.id"
              class="saved-item"
            >
              <div class="saved-item-header">
                <strong>{{ intake.title }}</strong>
                <span>{{ formatDateTime(intake.completedAt) }}</span>
              </div>
              <div class="saved-item-meta">
                <span class="pill">{{
                  getVoiceModeLabel(intake.scenarioId)
                }}</span>
                <span class="pill"
                  >{{ intake.turnCount }} turn{{
                    intake.turnCount === 1 ? "" : "s"
                  }}</span
                >
                <span v-if="intake.detectedName" class="pill">
                  {{ intake.detectedName }}
                </span>
              </div>
              <div class="saved-answer-list">
                <div
                  v-for="entry in intake.promptAnswers"
                  :key="entry.prompt"
                  class="saved-answer"
                >
                  <div class="saved-answer-label">{{ entry.prompt }}</div>
                  <p class="saved-answer-text">{{ entry.response }}</p>
                </div>
              </div>
              <div class="voice-assistant-label">Full transcript</div>
              <p>{{ intake.transcript }}</p>
              <p class="saved-summary">{{ intake.assistantSummary }}</p>
            </article>
          </div>
        </article>
      </section>
      <p class="footer">
        <img src="/assets/png/absolutejs-temp.png" alt="" />
        Powered by
        <a
          href="https://absolutejs.com"
          target="_blank"
          rel="noopener noreferrer"
          >AbsoluteJS</a
        >
      </p>
    </main>
  </div>
</template>
