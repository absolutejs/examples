import { useState } from "react";
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
import {
  formatReconnectState,
  voiceReactiveSource,
} from "../../../shared/browser";
import { VOICE_CALL_CONTROL_ACTIONS } from "../../../constants/demoActions";
import {
  VOICE_EVIDENCE_TOPIC,
  VOICE_TURN_TOPIC,
} from "../../../constants/sync";
import type {
  VoiceModelProvider,
  VoiceProfileId,
  VoiceRoutingMode,
  VoiceSpeechEngine,
} from "../../../types/voice";
import { AgentSquadCard } from "../components/AgentSquadCard";
import { AssistantConfigCard } from "../components/AssistantConfigCard";
import { CampaignDialerCard } from "../components/CampaignDialerCard";
import { ConversationCard } from "../components/ConversationCard";
import { DemoChrome } from "../components/DemoChrome";
import { GuideCard } from "../components/GuideCard";
import { ProofDashboardsCard } from "../components/ProofDashboardsCard";
import { VoicePipelineCard } from "../components/VoicePipelineCard";
import { SavedCapturesCard } from "../components/SavedCapturesCard";
import { ServerHtmlCard } from "../components/ServerHtmlCard";
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

const CONSOLE_TABS = [
  {
    id: "proof",
    label: "Proof & latency",
    lead: "Live latency and turn-quality proof, sustained trends, platform coverage, and incident traces — every number is read from the same proof-backed routes the package ships.",
  },
  {
    id: "providers",
    label: "Providers & routing",
    lead: "Provider health, routing decisions, capabilities and contracts, STT failover simulation, and the measured evidence behind each voice stack.",
  },
  {
    id: "ops",
    label: "Ops & observability",
    lead: "Operational status, delivery runtime, the live ops action center, session snapshots and observability, call debugging, and deploy-gate readiness.",
  },
  {
    id: "telephony",
    label: "Telephony & carriers",
    lead: "Outbound campaign dialing proof — carrier handoff, pacing, and delivery evidence.",
  },
  {
    id: "guide",
    label: "How it works",
    lead: "How the demo is wired end to end, and the assistant configuration driving every turn.",
  },
] as const;

type ConsoleTabId = (typeof CONSOLE_TABS)[number]["id"];

export const ReactVoiceDemo = ({
  cssPath,
  initialModelProvider = "deterministic",
  initialProfileId = "meeting-recorder",
  initialRoutingMode = "balanced",
  initialSpeechEngine = "cascaded",
}: ReactVoiceDemoProps) => {
  const [activeTab, setActiveTab] = useState<ConsoleTabId>("proof");
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

  const leadFor = (id: ConsoleTabId) =>
    CONSOLE_TABS.find((tab) => tab.id === id)?.lead;

  return (
    <DemoChrome cssPath={cssPath}>
      <div className="voice-stagewrap">
        <VoicePipelineCard
          changeModelProvider={changeModelProvider}
          changeProfileId={changeProfileId}
          changeRoutingMode={changeRoutingMode}
          changeSpeechEngine={changeSpeechEngine}
          isConnected={currentVoice.isConnected}
          modelProvider={modelProvider}
          profileId={profileId}
          routingMode={routingMode}
          speechEngine={speechEngine}
        />

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
      </div>

      <div className="voice-console">
        <div
          aria-label="Voice platform surfaces"
          className="voice-tabs"
          role="tablist"
        >
          {CONSOLE_TABS.map((tab) => (
            <button
              aria-controls={`voice-panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              className="voice-tab"
              id={`voice-tab-${tab.id}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section
          aria-labelledby="voice-tab-proof"
          className="voice-tabpanel"
          hidden={activeTab !== "proof"}
          id="voice-panel-proof"
          role="tabpanel"
        >
          <p className="voice-tabpanel-lead">{leadFor("proof")}</p>
          <div className="voice-grid">
            <ProofDashboardsCard />

            <VoiceTurnLatency
              className="voice-card voice-provider-health-card voice-turn-detail"
              reactiveSource={voiceReactiveSource(VOICE_TURN_TOPIC)}
              proofLabel="Run latency proof"
              proofPath="/api/turn-latency/proof"
            />

            <VoiceTurnQuality
              className="voice-card voice-provider-health-card voice-turn-detail"
              reactiveSource={voiceReactiveSource(VOICE_TURN_TOPIC)}
            />

            <VoiceProofTrends
              className="voice-card voice-provider-health-card"
              description="Sustained proof freshness, provider p95, turn p95, and live p95 from the package proof-trends widget."
              reactiveSource={voiceReactiveSource(VOICE_EVIDENCE_TOPIC)}
              path="/api/voice/proof-trends"
              title="Sustained Proof Trends"
            />

            <VoicePlatformCoverage
              className="voice-card voice-provider-health-card"
              description="Package coverage rendered against the same proof-backed route used by the server."
              reactiveSource={voiceReactiveSource(VOICE_EVIDENCE_TOPIC)}
              limit={4}
              path="/api/voice/platform-coverage"
              title="Vapi Replacement Coverage"
            />

            <VoiceTraceTimeline
              className="voice-card voice-provider-health-card"
              incidentBundleBasePath="/voice-incidents"
              reactiveSource={voiceReactiveSource(VOICE_TURN_TOPIC)}
              limit={2}
              operationsRecordBasePath="/voice-operations"
            />

            <div className="voice-grid-slot" ref={bargeInProofRef} />

            <div
              className="voice-grid-slot"
              dangerouslySetInnerHTML={{ __html: liveLatencyHTML }}
            />
          </div>
        </section>

        <section
          aria-labelledby="voice-tab-providers"
          className="voice-tabpanel"
          hidden={activeTab !== "providers"}
          id="voice-panel-providers"
          role="tabpanel"
        >
          <p className="voice-tabpanel-lead">{leadFor("providers")}</p>
          <div className="voice-grid">
            <VoiceProviderStatus
              className="voice-card voice-provider-health-card"
              reactiveSource={voiceReactiveSource(VOICE_TURN_TOPIC)}
            />

            <VoiceRoutingStatus
              className="voice-card voice-routing-card"
              reactiveSource={voiceReactiveSource(VOICE_TURN_TOPIC)}
            />

            <VoiceProviderCapabilities
              className="voice-card voice-provider-health-card voice-card-full"
              reactiveSource={voiceReactiveSource(VOICE_EVIDENCE_TOPIC)}
            />

            <VoiceProviderContracts
              className="voice-card voice-provider-health-card voice-card-full"
              reactiveSource={voiceReactiveSource(VOICE_EVIDENCE_TOPIC)}
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

            <VoiceProfileComparison
              className="voice-card voice-provider-health-card"
              description="Measured profile defaults and persisted reconnect resume evidence showing why each voice stack was selected."
              reactiveSource={voiceReactiveSource(VOICE_EVIDENCE_TOPIC)}
              path="/api/voice/real-call-profile-history"
              title="Profile + Reconnect Evidence"
            />

            <VoiceProfileSwitchRecommendation
              className="voice-card voice-provider-health-card"
              description="Compares the latest session signals against measured profile evidence and recommends whether to switch stacks."
              reactiveSource={voiceReactiveSource(VOICE_EVIDENCE_TOPIC)}
              path="/api/voice/profile-switch-recommendation"
              title="Profile Switch Recommendation"
            />

            <VoiceReconnectProfileEvidence
              className="voice-card voice-provider-health-card"
              description="Persisted real browser reconnect/resume traces from the package reconnect evidence primitive."
              reactiveSource={voiceReactiveSource(VOICE_EVIDENCE_TOPIC)}
              path="/api/voice/reconnect-profile-evidence"
              title="Persisted Reconnect Evidence"
            />
          </div>
        </section>

        <section
          aria-labelledby="voice-tab-ops"
          className="voice-tabpanel"
          hidden={activeTab !== "ops"}
          id="voice-panel-ops"
          role="tabpanel"
        >
          <p className="voice-tabpanel-lead">{leadFor("ops")}</p>
          <div className="voice-grid">
            <VoiceOpsStatus
              className="voice-card voice-workflow-card"
              reactiveSource={voiceReactiveSource(VOICE_TURN_TOPIC)}
            />

            <VoiceDeliveryRuntime
              className="voice-card voice-workflow-card"
              reactiveSource={voiceReactiveSource(VOICE_TURN_TOPIC)}
            />

            <VoiceOpsActionCenter
              actions={createVoiceOpsActionCenterActions({
                providers: ["deepgram", "assemblyai"],
              })}
              className="voice-card voice-workflow-card"
            />

            <div className="voice-grid-slot" ref={liveOpsPanelRef} />

            <div
              className="voice-card voice-workflow-card"
              ref={opsActionHistoryRef}
            />

            <VoiceSessionSnapshot
              className="voice-card voice-provider-health-card"
              description="Downloadable support bundle with session media graph, provider routing, and turn-quality evidence."
              reactiveSource={voiceReactiveSource(VOICE_TURN_TOPIC)}
              path="/api/voice/session-snapshot/latest"
              title="Session Debug Snapshot"
            />

            <VoiceSessionObservability
              className="voice-card voice-provider-health-card"
              description="One per-call support report with turn waterfalls, provider recovery, tools, handoffs, guardrails, and incident handoff links."
              reactiveSource={voiceReactiveSource(VOICE_TURN_TOPIC)}
              path="/api/voice/session-observability/demo-incident-bundle"
              title="Session Observability"
            />

            <VoiceCallDebuggerLaunch
              className="voice-card voice-provider-health-card"
              description="Opens the latest full call debugger with snapshot, replay, provider path, transcript, and incident markdown."
              reactiveSource={voiceReactiveSource(VOICE_TURN_TOPIC)}
              path="/api/voice-call-debugger/latest"
              title="Debug Latest Call"
            />

            <VoiceReadinessFailures
              className="voice-card voice-provider-health-card"
              description="Structured deploy-gate explanations from production readiness JSON when calibrated gates warn or fail."
              reactiveSource={voiceReactiveSource(VOICE_EVIDENCE_TOPIC)}
              path="/api/production-readiness"
              title="Readiness Gate Explanations"
            />

            <ServerHtmlCard html={realCallWorkerHTML} />

            <AgentSquadCard agentSquadStatus={agentSquadStatus} />
          </div>
        </section>

        <section
          aria-labelledby="voice-tab-telephony"
          className="voice-tabpanel"
          hidden={activeTab !== "telephony"}
          id="voice-panel-telephony"
          role="tabpanel"
        >
          <p className="voice-tabpanel-lead">{leadFor("telephony")}</p>
          <div className="voice-grid">
            <CampaignDialerCard campaignDialerProof={campaignDialerProof} />
          </div>
        </section>

        <section
          aria-labelledby="voice-tab-guide"
          className="voice-tabpanel"
          hidden={activeTab !== "guide"}
          id="voice-panel-guide"
          role="tabpanel"
        >
          <p className="voice-tabpanel-lead">{leadFor("guide")}</p>
          <div className="voice-grid">
            <GuideCard />
            <AssistantConfigCard />
          </div>
        </section>
      </div>
    </DemoChrome>
  );
};
