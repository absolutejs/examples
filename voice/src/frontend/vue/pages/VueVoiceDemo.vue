<script setup lang="ts">
import { ref } from "vue";
import {
  VoiceCallDebuggerLaunch,
  VoiceDeliveryRuntime,
  VoiceOpsActionCenter,
  VoiceOpsStatus,
  VoicePlatformCoverage,
  VoiceProofTrends,
  VoiceProviderCapabilities,
  VoiceProviderContracts,
  VoiceProviderSimulationControls,
  VoiceProviderStatus,
  VoiceReadinessFailures,
  VoiceReconnectProfileEvidence,
  VoiceRoutingStatus,
  VoiceSessionObservability,
  VoiceSessionSnapshot,
  VoiceTurnLatency,
  VoiceTurnQuality,
} from "@absolutejs/voice/vue";
import { createVoiceOpsActionCenterActions } from "@absolutejs/voice/client";
import { voiceReactiveSource } from "../../../shared/browser";
import { VOICE_CALL_CONTROL_ACTIONS } from "../../../constants/demoActions";
import {
  VOICE_EVIDENCE_TOPIC,
  VOICE_TURN_TOPIC,
} from "../../../constants/sync";
import type {
  VoiceDemoMode,
  VoiceModelProvider,
  VoiceProfileId,
  VoiceRoutingMode,
  VoiceSpeechEngine,
} from "../../../types/voice";
import AgentSquadCard from "../components/AgentSquadCard.vue";
import AssistantConfigCard from "../components/AssistantConfigCard.vue";
import CampaignDialerCard from "../components/CampaignDialerCard.vue";
import ConversationCard from "../components/ConversationCard.vue";
import DemoChrome from "../components/DemoChrome.vue";
import GuideCard from "../components/GuideCard.vue";
import ProofDashboardsCard from "../components/ProofDashboardsCard.vue";
import ProviderConfigCard from "../components/ProviderConfigCard.vue";
import SavedCapturesCard from "../components/SavedCapturesCard.vue";
import ServerHtmlCard from "../components/ServerHtmlCard.vue";
import VoiceHeroCard from "../components/VoiceHeroCard.vue";
import { useDemoConfig } from "../composables/useDemoConfig";
import { useImperativePanels } from "../composables/useImperativePanels";
import { useMicrophoneCapture } from "../composables/useMicrophoneCapture";
import { useSavedIntakes } from "../composables/useSavedIntakes";
import { useServerHtmlPanels } from "../composables/useServerHtmlPanels";
import { useVoiceDemoStreams } from "../composables/useVoiceDemoStreams";

type VueVoiceDemoProps = {
  initialModelProvider?: VoiceModelProvider;
  initialProfileId?: VoiceProfileId;
  initialRoutingMode?: VoiceRoutingMode;
  initialSpeechEngine?: VoiceSpeechEngine;
};

const props = withDefaults(defineProps<VueVoiceDemoProps>(), {
  initialModelProvider: "deterministic",
  initialProfileId: "meeting-recorder",
  initialRoutingMode: "balanced",
  initialSpeechEngine: "cascaded",
});

// Reactive push instead of polling: widgets refresh on SSE push for their
// dashboard group, with no per-widget interval timer.
const turnSource = voiceReactiveSource(VOICE_TURN_TOPIC);
const evidenceSource = voiceReactiveSource(VOICE_EVIDENCE_TOPIC);

const activeMode = ref<VoiceDemoMode | null>(null);
const hasStartedModes = ref<Record<VoiceDemoMode, boolean>>({
  general: false,
  guided: false,
});
const micError = ref<string | null>(null);

const {
  changeModelProviderFromEvent,
  changeProfileIdFromEvent,
  changeRoutingModeFromEvent,
  changeSpeechEngineFromEvent,
  modelProvider,
  profileId,
  routingMode,
  speechEngine,
} = useDemoConfig({
  initialModelProvider: props.initialModelProvider,
  initialProfileId: props.initialProfileId,
  initialRoutingMode: props.initialRoutingMode,
  initialSpeechEngine: props.initialSpeechEngine,
  onBeforeReload: () => stopMic(),
});

const {
  callLifecycleLabel,
  currentPrompt,
  currentVoice,
  errorMessage,
  leadMessage,
  profileComparisonModel,
  profileSwitchGuardDecision,
  traceTimelineModel,
} = useVoiceDemoStreams({
  activeMode,
  hasStartedModes,
  micError,
  modelProvider,
  profileId,
  routingMode,
  speechEngine,
});

const { isCapturing, liveLatencyHTML, startMic, stopMic, wavePath } =
  useMicrophoneCapture({ currentVoice, micError, speechEngine });

const {
  agentSquadStatus,
  refreshAgentSquadStatus,
  refreshIntakes,
  savedIntakes,
} = useSavedIntakes({ currentVoice });

const {
  campaignDialerProof,
  campaignDialerProofReadyProviders,
  profileSwitchHTML,
  realCallWorkerHTML,
  runCampaignDialerProof,
} = useServerHtmlPanels();

const { bargeInProofEl, liveOpsPanelEl, opsActionHistoryEl } =
  useImperativePanels({
    currentVoice,
    refreshAgentSquadStatus,
    refreshIntakes,
    stopMic,
  });

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
</script>

<template>
  <DemoChrome>
    <VoiceHeroCard
      :active-mode="activeMode"
      :is-connected="currentVoice.isConnected.value"
      :model-provider="modelProvider"
      :profile-switch-guard-decision="profileSwitchGuardDecision"
      :routing-mode="routingMode"
      :saved-capture-count="savedIntakes.length"
    />

    <ProviderConfigCard
      :model-provider="modelProvider"
      :on-change-model-provider="changeModelProviderFromEvent"
      :on-change-profile-id="changeProfileIdFromEvent"
      :on-change-routing-mode="changeRoutingModeFromEvent"
      :on-change-speech-engine="changeSpeechEngineFromEvent"
      :profile-id="profileId"
      :routing-mode="routingMode"
      :speech-engine="speechEngine"
    />

    <ProofDashboardsCard />

    <ServerHtmlCard
      class="voice-card voice-provider-health-card"
      :html="realCallWorkerHTML"
    />

    <VoicePlatformCoverage
      class="voice-card voice-provider-health-card"
      description="Vue renders the package coverage component against the same proof-backed route used by the server."
      :limit="4"
      path="/api/voice/platform-coverage"
      :reactive-source="evidenceSource"
      title="Vapi Replacement Coverage"
    />

    <VoiceProofTrends
      class="voice-card voice-provider-health-card"
      description="Vue renders sustained proof freshness, provider p95, turn p95, and live p95 from the package proof-trends widget."
      path="/api/voice/proof-trends"
      :reactive-source="evidenceSource"
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
      path="/api/voice/reconnect-profile-evidence"
      :reactive-source="evidenceSource"
      title="Persisted Reconnect Evidence"
    />

    <ServerHtmlCard
      class="voice-card voice-provider-health-card"
      :html="profileSwitchHTML"
    />

    <VoiceReadinessFailures
      class="voice-card voice-provider-health-card"
      description="Vue renders structured deploy-gate explanations from production readiness JSON when calibrated gates warn or fail."
      path="/api/production-readiness"
      :reactive-source="evidenceSource"
      title="Readiness Gate Explanations"
    />

    <VoiceSessionSnapshot
      class="voice-card voice-provider-health-card"
      description="Vue renders a downloadable support bundle with session media graph, provider routing, and turn-quality evidence."
      path="/api/voice/session-snapshot/latest"
      :reactive-source="turnSource"
      title="Session Debug Snapshot"
    />

    <VoiceSessionObservability
      class="voice-card voice-provider-health-card"
      description="Vue renders one per-call support report with turn waterfalls, provider recovery, tools, handoffs, guardrails, and incident handoff links."
      path="/api/voice/session-observability/demo-incident-bundle"
      :reactive-source="turnSource"
      title="Session Observability"
    />

    <VoiceCallDebuggerLaunch
      class="voice-card voice-provider-health-card"
      description="Vue opens the latest full call debugger with snapshot, replay, provider path, transcript, and incident markdown."
      path="/api/voice-call-debugger/latest"
      :reactive-source="turnSource"
      title="Debug Latest Call"
    />

    <VoiceRoutingStatus
      class="voice-card voice-routing-card"
      :reactive-source="turnSource"
    />

    <AgentSquadCard :agent-squad-status="agentSquadStatus" />

    <VoiceProviderStatus
      class="voice-card voice-provider-health-card"
      :reactive-source="turnSource"
    />

    <VoiceProviderCapabilities
      class="voice-card voice-provider-health-card"
      :reactive-source="evidenceSource"
    />

    <VoiceProviderContracts
      class="voice-card voice-provider-health-card"
      :reactive-source="evidenceSource"
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
      :reactive-source="turnSource"
    />

    <VoiceTurnLatency
      class="voice-card voice-provider-health-card"
      proof-label="Run latency proof"
      proof-path="/api/turn-latency/proof"
      :reactive-source="turnSource"
    />

    <CampaignDialerCard
      :campaign-dialer-proof="campaignDialerProof"
      :campaign-dialer-proof-ready-providers="campaignDialerProofReadyProviders"
      :on-run-proof="runCampaignDialerProof"
    />

    <VoiceOpsStatus
      class="voice-card voice-workflow-card"
      :reactive-source="turnSource"
    />

    <VoiceDeliveryRuntime
      class="voice-card voice-workflow-card"
      :reactive-source="turnSource"
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

    <ServerHtmlCard :html="liveLatencyHTML" />

    <GuideCard />

    <AssistantConfigCard />

    <ConversationCard
      :active-mode="activeMode"
      :call-lifecycle-label="callLifecycleLabel"
      :current-prompt="currentPrompt"
      :error-message="errorMessage"
      :is-capturing="isCapturing"
      :lead-message="leadMessage"
      :on-run-call-control="runCallControl"
      :on-start-mode="startMode"
      :on-stop-mic="stopMic"
      :partial="currentVoice.partial.value"
      :reconnect="currentVoice.reconnect.value"
      :status="currentVoice.status.value"
      :turns="currentVoice.turns.value"
      :wave-path="wavePath"
    />

    <SavedCapturesCard :saved-intakes="savedIntakes" />
  </DemoChrome>
</template>
