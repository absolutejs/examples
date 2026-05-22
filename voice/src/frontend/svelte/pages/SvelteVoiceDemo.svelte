<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { formatReconnectState } from "../../shared/browser";
  import {
    VOICE_CALL_CONTROL_ACTIONS,
    type VoiceDemoMode,
    type VoiceModelProvider,
    type VoiceProfileId,
    type VoiceRoutingMode,
    type VoiceSpeechEngine,
  } from "../../../shared/demo";
  import AgentSquadCard from "../components/AgentSquadCard.svelte";
  import AssistantConfigCard from "../components/AssistantConfigCard.svelte";
  import CampaignDialerCard from "../components/CampaignDialerCard.svelte";
  import ConversationCard from "../components/ConversationCard.svelte";
  import DemoChrome from "../components/DemoChrome.svelte";
  import GuideCard from "../components/GuideCard.svelte";
  import ProofDashboardsCard from "../components/ProofDashboardsCard.svelte";
  import ProviderConfigCard from "../components/ProviderConfigCard.svelte";
  import SavedCapturesCard from "../components/SavedCapturesCard.svelte";
  import ServerHtmlCard from "../components/ServerHtmlCard.svelte";
  import VoiceHeroCard from "../components/VoiceHeroCard.svelte";
  import { useDemoConfig } from "../lib/useDemoConfig.svelte";
  import { useImperativePanels } from "../lib/useImperativePanels.svelte";
  import { useMicrophoneCapture } from "../lib/useMicrophoneCapture.svelte";
  import { useSavedIntakes } from "../lib/useSavedIntakes.svelte";
  import { useServerHtmlPanels } from "../lib/useServerHtmlPanels.svelte";
  import { useVoiceDemoStreams } from "../lib/useVoiceDemoStreams.svelte";

  type SvelteVoiceDemoProps = {
    cssPath?: string;
    initialModelProvider?: VoiceModelProvider;
    initialProfileId?: VoiceProfileId;
    initialRoutingMode?: VoiceRoutingMode;
    initialSpeechEngine?: VoiceSpeechEngine;
  };

  let {
    cssPath,
    initialModelProvider = "deterministic",
    initialProfileId = "meeting-recorder",
    initialRoutingMode = "balanced",
    initialSpeechEngine = "cascaded",
  }: SvelteVoiceDemoProps = $props();

  const streams = useVoiceDemoStreams({
    modelProvider: initialModelProvider,
    onAssistantOutput: () => microphone.syncAssistantOutput(),
    profileId: initialProfileId,
    routingMode: initialRoutingMode,
    speechEngine: initialSpeechEngine,
  });
  const microphone = useMicrophoneCapture({
    getActiveVoice: () => streams.getActiveVoice(),
    getCurrentVoice: () => streams.currentVoice,
    speechEngine: initialSpeechEngine,
  });
  const config = useDemoConfig({
    initialModelProvider,
    initialProfileId,
    initialRoutingMode,
    initialSpeechEngine,
    onBeforeReload: () => {
      microphone.stopMic();
      streams.resetActiveMode();
    },
  });
  const intakes = useSavedIntakes({
    getCurrentVoice: () => streams.currentVoice,
  });
  const panels = useServerHtmlPanels();
  const imperative = useImperativePanels(
    {
      getActiveVoice: () => streams.getActiveVoice(),
      getCurrentVoice: () => streams.currentVoice,
      simulateDisconnect: () => streams.simulateDisconnect(),
      stopMic: () => microphone.stopMic(),
    },
    panels.providerSimulation,
  );

  let providerSimulationElement = $state<HTMLElement | null>(null);
  let liveOpsPanelElement = $state<HTMLElement | null>(null);
  let opsActionHistoryElement = $state<HTMLElement | null>(null);
  let bargeInProofElement = $state<HTMLElement | null>(null);

  $effect(() => imperative.attachSimulateDisconnect());
  $effect(() =>
    providerSimulationElement
      ? imperative.attachProviderSimulation(providerSimulationElement)
      : undefined,
  );
  $effect(() =>
    liveOpsPanelElement
      ? imperative.attachLiveOpsPanel(liveOpsPanelElement)
      : undefined,
  );
  $effect(() =>
    opsActionHistoryElement
      ? imperative.attachOpsActionHistory(opsActionHistoryElement)
      : undefined,
  );
  $effect(() =>
    bargeInProofElement
      ? imperative.attachBargeInProof(bargeInProofElement)
      : undefined,
  );

  const errorMessage = $derived(
    microphone.error || streams.currentVoice.error || "None",
  );

  const startMode = async (mode: VoiceDemoMode) => {
    streams.setActiveMode(mode);
    await microphone.startMic();
  };

  const runCallControl = (
    action: (typeof VOICE_CALL_CONTROL_ACTIONS)[number],
  ) => {
    streams.getActiveVoice()?.callControl(action);
    microphone.stopMic();
  };

  onMount(() => {
    streams.connect();
    panels.start();
    intakes.start();
  });

  onDestroy(() => {
    microphone.stopMic();
    intakes.stop();
    panels.stop();
    streams.destroy();
  });
</script>

<DemoChrome {cssPath}>
  <VoiceHeroCard
    activeMode={streams.activeMode}
    isConnected={streams.currentVoice.isConnected}
    modelProvider={config.modelProvider}
    profileSwitchGuardDecision={streams.profileSwitchGuardDecision}
    routingMode={config.routingMode}
    savedIntakeCount={intakes.savedIntakes.length}
  />

  <ProviderConfigCard
    modelProvider={config.modelProvider}
    onChangeModelProvider={config.changeModelProviderFromEvent}
    onChangeProfileId={config.changeProfileIdFromEvent}
    onChangeRoutingMode={config.changeRoutingModeFromEvent}
    onChangeSpeechEngine={config.changeSpeechEngineFromEvent}
    profileId={config.profileId}
    routingMode={config.routingMode}
    speechEngine={config.speechEngine}
  />

  <ProofDashboardsCard />

  <ServerHtmlCard html={panels.realCallWorkerHTML} />

  <ServerHtmlCard html={panels.platformCoverageHTML} />

  <ServerHtmlCard html={panels.proofTrendsHTML} />

  <ServerHtmlCard html={panels.profileComparisonHTML} />

  <ServerHtmlCard html={panels.reconnectEvidenceHTML} />

  <ServerHtmlCard html={panels.profileSwitchHTML} />

  <ServerHtmlCard html={panels.readinessFailuresHTML} />

  <ServerHtmlCard html={panels.sessionSnapshotHTML} />

  <ServerHtmlCard html={panels.sessionObservabilityHTML} />

  <ServerHtmlCard html={panels.callDebuggerHTML} />

  <ServerHtmlCard
    className="voice-card voice-routing-card voice-routing-status-host"
    html={panels.routingStatusHTML}
  />

  <AgentSquadCard agentSquadStatus={intakes.agentSquadStatus} />

  <ServerHtmlCard
    className="voice-card voice-provider-health-card voice-provider-status-host"
    html={panels.providerStatusHTML}
  />

  <ServerHtmlCard
    className="voice-card voice-provider-health-card voice-provider-capabilities-host"
    html={panels.providerCapabilitiesHTML}
  />

  <ServerHtmlCard
    className="voice-card voice-provider-health-card voice-provider-contracts-host"
    html={panels.providerContractsHTML}
  />

  <div
    bind:this={providerSimulationElement}
    class="voice-card voice-provider-simulation-card voice-provider-simulation-host"
  >
    {@html panels.providerSimulationHTML}
  </div>

  <ServerHtmlCard
    className="voice-card voice-provider-health-card voice-turn-quality-host"
    html={panels.turnQualityHTML}
  />

  <ServerHtmlCard
    className="voice-card voice-provider-health-card voice-turn-latency-host"
    html={panels.turnLatencyHTML}
    onClick={panels.handleTurnLatencyClick}
  />

  <CampaignDialerCard
    campaignDialerProofReadyProviders={panels.campaignDialerProofReadyProviders}
    campaignDialerProofSnapshot={panels.campaignDialerProofSnapshot}
    onRunProof={panels.runCampaignDialerProof}
  />

  <ServerHtmlCard
    className="voice-card voice-workflow-card voice-ops-status-host"
    html={panels.opsStatusHTML}
  />

  <ServerHtmlCard
    className="voice-card voice-workflow-card voice-ops-status-host"
    html={panels.deliveryRuntimeHTML}
  />

  <ServerHtmlCard
    className="voice-card voice-workflow-card voice-ops-status-host"
    html={panels.opsActionCenterHTML}
  />

  <div bind:this={liveOpsPanelElement}></div>

  <div
    class="voice-card voice-workflow-card voice-ops-status-host"
    bind:this={opsActionHistoryElement}
  ></div>

  <ServerHtmlCard
    className="voice-card voice-provider-health-card voice-trace-timeline-host"
    html={panels.traceTimelineHTML}
  />

  <div bind:this={bargeInProofElement}></div>

  {@html microphone.liveLatencyHTML}

  <GuideCard />

  <AssistantConfigCard />

  <ConversationCard
    activeMode={streams.activeMode}
    callLifecycleLabel={streams.callLifecycleLabel}
    currentPrompt={streams.currentPrompt}
    {errorMessage}
    isCapturing={microphone.isCapturing}
    leadMessage={streams.leadMessage}
    onRunCallControl={runCallControl}
    onStartMode={startMode}
    onStopMic={() => microphone.stopMic()}
    partial={streams.currentVoice.partial}
    reconnectLabel={formatReconnectState(streams.currentVoice.reconnect)}
    status={streams.currentVoice.status}
    turns={streams.currentVoice.turns}
    wavePath={microphone.wavePath}
  />

  <SavedCapturesCard savedIntakes={intakes.savedIntakes} />
</DemoChrome>
