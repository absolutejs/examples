import {
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
import { createVoiceOpsActionCenterActions } from "@absolutejs/voice/client";
import { formatReconnectState } from "../../shared/browser";
import {
  VOICE_CALL_CONTROL_ACTIONS,
  type VoiceModelProvider,
  type VoiceProfileId,
  type VoiceRoutingMode,
  type VoiceSpeechEngine,
} from "../../../shared/demo";
import { AgentSquadCard } from "../components/AgentSquadCard";
import { AssistantConfigCard } from "../components/AssistantConfigCard";
import { CampaignDialerCard } from "../components/CampaignDialerCard";
import { ConversationCard } from "../components/ConversationCard";
import { DemoChrome } from "../components/DemoChrome";
import { GuideCard } from "../components/GuideCard";
import { ProofDashboardsCard } from "../components/ProofDashboardsCard";
import { ProviderConfigCard } from "../components/ProviderConfigCard";
import { SavedCapturesCard } from "../components/SavedCapturesCard";
import { ServerHtmlCard } from "../components/ServerHtmlCard";
import { VoiceHeroCard } from "../components/VoiceHeroCard";
import { useDemoConfig } from "../hooks/useDemoConfig";
import { useImperativePanels } from "../hooks/useImperativePanels";
import { useMicrophoneCapture } from "../hooks/useMicrophoneCapture";
import { useSavedIntakes } from "../hooks/useSavedIntakes";
import { useServerHtmlPanels } from "../hooks/useServerHtmlPanels";
import { useVoiceDemoStreams } from "../hooks/useVoiceDemoStreams";

type ReactVoiceDemoProps = {
  cssPath?: string;
  initialModelProvider?: VoiceModelProvider;
  initialProfileId?: VoiceProfileId;
  initialRoutingMode?: VoiceRoutingMode;
  initialSpeechEngine?: VoiceSpeechEngine;
};

export const ReactVoiceDemo = ({
  cssPath,
  initialModelProvider = "deterministic",
  initialProfileId = "meeting-recorder",
  initialRoutingMode = "balanced",
  initialSpeechEngine = "cascaded",
}: ReactVoiceDemoProps) => {
  const {
    changeModelProvider,
    changeProfileId,
    changeRoutingMode,
    changeSpeechEngine,
    modelProvider,
    profileId,
    routingMode,
    speechEngine,
  } = useDemoConfig({
    initialModelProvider,
    initialProfileId,
    initialRoutingMode,
    initialSpeechEngine,
    onBeforeReload: () => {
      stopMic();
      resetActiveMode();
    },
  });
  const {
    activeMode,
    activeModeRef,
    bindStartMic,
    currentPrompt,
    currentVoice,
    leadMessage,
    profileSwitchGuardDecision,
    resetActiveMode,
    startMode,
    voicesRef,
  } = useVoiceDemoStreams({
    modelProvider,
    profileId,
    routingMode,
    speechEngine,
  });
  const {
    isCapturing,
    liveLatencyHTML,
    micError,
    startMic,
    stopMic,
    voiceWavePath,
  } = useMicrophoneCapture({
    activeModeRef,
    currentVoice,
    speechEngine,
    voicesRef,
  });
  bindStartMic(startMic);
  const savedIntakes = useSavedIntakes();
  const { agentSquadStatus, realCallWorkerHTML } = useServerHtmlPanels({
    sessionId: currentVoice.sessionId,
  });
  const { bargeInProofRef, liveOpsPanelRef, opsActionHistoryRef } =
    useImperativePanels({
      activeModeRef,
      currentVoice,
      stopMic,
      voicesRef,
    });
  const campaignDialerProof = useVoiceCampaignDialerProof(
    "/api/voice/campaigns/dialer-proof",
  );
  const errorMessage = micError || currentVoice.error || "None";

  const runCallControl = (
    action: (typeof VOICE_CALL_CONTROL_ACTIONS)[number],
  ) => {
    currentVoice.callControl(action);
    stopMic();
  };

  return (
    <DemoChrome cssPath={cssPath}>
      <VoiceHeroCard
        activeMode={activeMode}
        isConnected={currentVoice.isConnected}
        modelProvider={modelProvider}
        profileSwitchGuardDecision={profileSwitchGuardDecision}
        routingMode={routingMode}
        savedIntakeCount={savedIntakes.length}
      />

      <ProviderConfigCard
        changeModelProvider={changeModelProvider}
        changeProfileId={changeProfileId}
        changeRoutingMode={changeRoutingMode}
        changeSpeechEngine={changeSpeechEngine}
        modelProvider={modelProvider}
        profileId={profileId}
        routingMode={routingMode}
        speechEngine={speechEngine}
      />

      <ProofDashboardsCard />

      <ServerHtmlCard html={realCallWorkerHTML} />

      <VoicePlatformCoverage
        className="voice-card voice-provider-health-card"
        description="React renders the package coverage component against the same proof-backed route used by the server."
        intervalMs={10_000}
        limit={4}
        path="/api/voice/platform-coverage"
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

      <AgentSquadCard agentSquadStatus={agentSquadStatus} />

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

      <CampaignDialerCard campaignDialerProof={campaignDialerProof} />

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

      <GuideCard />

      <AssistantConfigCard />

      <ConversationCard
        activeMode={activeMode}
        call={currentVoice.call}
        currentPrompt={currentPrompt}
        errorMessage={errorMessage}
        isCapturing={isCapturing}
        leadMessage={leadMessage}
        partial={currentVoice.partial}
        reconnectLabel={formatReconnectState(currentVoice.reconnect)}
        runCallControl={runCallControl}
        startMode={startMode}
        status={currentVoice.status}
        stopMic={stopMic}
        turns={currentVoice.turns}
        voiceWavePath={voiceWavePath}
      />

      <SavedCapturesCard savedIntakes={savedIntakes} />
    </DemoChrome>
  );
};
