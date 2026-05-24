import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { usePageContext } from "@absolutejs/absolute/angular";
import type { VoiceRoutingDecisionSummary } from "@absolutejs/voice";
import {
  createVoiceCallDebuggerLaunchViewModel,
  defineVoiceProfileComparisonElement,
  defineVoiceProfileSwitchRecommendationElement,
  defineVoiceProviderSimulationControlsElement,
  renderVoiceReconnectProfileEvidenceHTML,
  createVoiceSessionObservabilityViewModel,
  createVoiceSessionSnapshotViewModel,
} from "@absolutejs/voice/client";
import { createVoiceOpsActionCenterActions } from "@absolutejs/voice/client";
import {
  VoiceOpsStatusService,
  VoiceOpsActionCenterService,
  VoiceCallDebuggerService,
  VoiceCampaignDialerProofService,
  VoiceDeliveryRuntimeService,
  VoiceProviderCapabilitiesService,
  VoiceProviderContractsService,
  VoiceProviderStatusService,
  VoicePlatformCoverageService,
  VoiceProofTrendsService,
  VoiceReadinessFailuresService,
  VoiceReconnectProfileEvidenceService,
  VoiceRoutingStatusService,
  VoiceSessionObservabilityService,
  VoiceSessionSnapshotService,
  VoiceStreamService,
  VoiceTraceTimelineService,
  VoiceTurnLatencyService,
  VoiceTurnQualityService,
} from "@absolutejs/voice/angular";
import {
  getVoiceLeadMessage,
  getVoiceModePrompt,
  getVoiceProfileLabel,
  getVoiceProfileSwitchGuardDecision,
  getVoiceRoutingLabel,
  getVoiceRoutePath,
  getVoiceSpeechEngineSampleRate,
} from "../../../../shared/demo";
import { FRAMEWORK_DESCRIPTIONS } from "../../../../constants/navigation";
import { VOICE_ASSISTANT_CONFIG } from "../../../../constants/assistant";
import {
  VOICE_DEMO_GUIDE_STEPS,
  VOICE_DEMO_GUIDE_TITLE,
  VOICE_DEMO_GENERAL_LABEL,
  VOICE_DEMO_GUIDED_LABEL,
  VOICE_DEMO_MIC_IDLE,
  VOICE_DEMO_MIC_LIVE,
  VOICE_DEMO_STOP_LABEL,
} from "../../../../constants/demoCopy";
import {
  VOICE_CALL_CONTROL_ACTIONS,
  VOICE_LIVE_OPS_ACTIONS,
} from "../../../../constants/demoActions";
import { VOICE_PROFILES } from "../../../../constants/voiceOptions";
import type { SavedIntake } from "../../../../types/domain";
import type {
  VoiceDemoMode,
  VoiceModelProvider,
  VoiceProfileId,
  VoiceRoutingMode,
  VoiceSpeechEngine,
} from "../../../../types/voice";
import {
  createDemoBargeInEvidence,
  createDemoLiveTurnLatencyEvidence,
  getOpsStatusLabel,
  renderDemoLiveTurnLatencyHTML,
  voiceReactiveSource,
} from "../../../../shared/browser";
import {
  VOICE_EVIDENCE_TOPIC,
  VOICE_TURN_TOPIC,
} from "../../../../constants/sync";
import type { VoiceLiveOpsAction } from "../../../../types/domain";
import { AgentSquadCardComponent } from "../../components/agent-squad-card/agent-squad-card";
import { AssistantConfigCardComponent } from "../../components/assistant-config-card/assistant-config-card";
import { CampaignDialerCardComponent } from "../../components/campaign-dialer-card/campaign-dialer-card";
import { ConversationCardComponent } from "../../components/conversation-card/conversation-card";
import { DemoChromeComponent } from "../../components/demo-chrome/demo-chrome";
import { GuideCardComponent } from "../../components/guide-card/guide-card";
import { ProofDashboardsCardComponent } from "../../components/proof-dashboards-card/proof-dashboards-card";
import { ProviderConfigCardComponent } from "../../components/provider-config-card/provider-config-card";
import { SavedCapturesCardComponent } from "../../components/saved-captures-card/saved-captures-card";
import { ServerHtmlCardComponent } from "../../components/server-html-card/server-html-card";
import { VoiceHeroCardComponent } from "../../components/voice-hero-card/voice-hero-card";
import { VoiceDemoConfigService } from "../../services/voice-demo-config.service";
import { VoiceLiveOpsService } from "../../services/voice-live-ops.service";
import { VoiceMicrophoneService } from "../../services/voice-microphone.service";
import { VoiceSavedIntakesService } from "../../services/voice-saved-intakes.service";
import { VoiceServerHtmlPanelsService } from "../../services/voice-server-html-panels.service";

type AngularVoiceDemoProps = {
  initialModelProvider: VoiceModelProvider;
  initialProfileId: VoiceProfileId;
  initialRoutingMode: VoiceRoutingMode;
  initialSpeechEngine: VoiceSpeechEngine;
};
type VoiceDemoWindow = typeof window & {
  __absoluteVoiceDemoSimulateDisconnect?: () => void;
};

export type Context = {
  initialModelProvider: VoiceModelProvider;
  initialProfileId: VoiceProfileId;
  initialRoutingMode: VoiceRoutingMode;
  initialSpeechEngine: VoiceSpeechEngine;
};

@Component({
  imports: [
    AgentSquadCardComponent,
    AssistantConfigCardComponent,
    CampaignDialerCardComponent,
    ConversationCardComponent,
    DemoChromeComponent,
    GuideCardComponent,
    ProofDashboardsCardComponent,
    ProviderConfigCardComponent,
    SavedCapturesCardComponent,
    ServerHtmlCardComponent,
    VoiceHeroCardComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  selector: "angular-voice-demo-page",
  standalone: true,
  templateUrl: "./angular-voice-demo.html",
})
class AngularVoiceDemoComponent {
  assistantConfig = VOICE_ASSISTANT_CONFIG;
  description = FRAMEWORK_DESCRIPTIONS.angular;
  guideSteps = VOICE_DEMO_GUIDE_STEPS;
  guideTitle = VOICE_DEMO_GUIDE_TITLE;
  activeMode = signal<VoiceDemoMode | null>(null);
  private readonly config = inject(VoiceDemoConfigService);
  private readonly liveOps = inject(VoiceLiveOpsService);
  private readonly microphoneService = inject(VoiceMicrophoneService);
  private readonly savedIntakesService = inject(VoiceSavedIntakesService);
  private readonly serverHtmlPanels = inject(VoiceServerHtmlPanelsService);
  private readonly pageContext = usePageContext<Context>();
  private readonly initialModelProvider = this.pageContext.initialModelProvider;
  private readonly initialProfileId = this.pageContext.initialProfileId;
  private readonly initialRoutingMode = this.pageContext.initialRoutingMode;
  private readonly initialSpeechEngine = this.pageContext.initialSpeechEngine;
  modelProvider = signal<VoiceModelProvider>(this.initialModelProvider);
  profileId = signal<VoiceProfileId>(this.initialProfileId);
  routingMode = signal<VoiceRoutingMode>(this.initialRoutingMode);
  speechEngine = signal<VoiceSpeechEngine>(this.initialSpeechEngine);
  voiceProfiles = VOICE_PROFILES;
  callControlActions = VOICE_CALL_CONTROL_ACTIONS;
  liveOpsActions = VOICE_LIVE_OPS_ACTIONS;
  getVoiceRoutingLabel = getVoiceRoutingLabel;
  getOpsStatusLabel = getOpsStatusLabel;
  hasStartedModes = signal<Record<VoiceDemoMode, boolean>>({
    general: false,
    guided: false,
  });
  agentSquadStatus = this.savedIntakesService.agentSquadStatus;
  isCapturing = this.microphoneService.isCapturing;
  micError = this.microphoneService.micError;
  bargeInProofHtml = this.serverHtmlPanels.bargeInProofHtml;
  liveLatencyHtml = signal("");
  liveOpsAssignee = this.liveOps.liveOpsAssignee;
  liveOpsDetail = this.liveOps.liveOpsDetail;
  liveOpsError = this.liveOps.liveOpsError;
  liveOpsResult = this.liveOps.liveOpsResult;
  liveOpsRunning = this.liveOps.liveOpsRunning;
  liveOpsTag = this.liveOps.liveOpsTag;
  realCallWorkerHtml = this.serverHtmlPanels.realCallWorkerHtml;
  savedIntakes = this.savedIntakesService.savedIntakes;
  generalLabel = VOICE_DEMO_GENERAL_LABEL;
  guidedLabel = VOICE_DEMO_GUIDED_LABEL;
  stopLabel = VOICE_DEMO_STOP_LABEL;
  idleMicCopy = VOICE_DEMO_MIC_IDLE;
  liveMicCopy = VOICE_DEMO_MIC_LIVE;
  liveOpsResultHtml = this.liveOps.liveOpsResultHtml;
  guidedVoice = inject(VoiceStreamService).connect<SavedIntake>(
    getVoiceRoutePath(
      "guided",
      this.modelProvider(),
      this.routingMode(),
      this.speechEngine(),
      this.profileId(),
    ),
    { reconnectReportPath: "/api/voice/reconnect-traces" },
  );
  generalVoice = inject(VoiceStreamService).connect<SavedIntake>(
    getVoiceRoutePath(
      "general",
      this.modelProvider(),
      this.routingMode(),
      this.speechEngine(),
      this.profileId(),
    ),
    { reconnectReportPath: "/api/voice/reconnect-traces" },
  );
  opsStatus = inject(VoiceOpsStatusService).connect("/api/voice/ops-status", {
    reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
  });
  deliveryRuntime = inject(VoiceDeliveryRuntimeService).connect(
    "/api/voice-delivery-runtime",
    {
      reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
    },
  );
  opsActionCenter = inject(VoiceOpsActionCenterService).connect({
    actions: createVoiceOpsActionCenterActions({
      providers: ["deepgram", "assemblyai"],
    }),
  });
  platformCoverage = inject(VoicePlatformCoverageService).connect(
    "/api/voice/platform-coverage",
    {
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
    },
  );
  proofTrends = inject(VoiceProofTrendsService).connect(
    "/api/voice/proof-trends",
    {
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
    },
  );
  reconnectEvidence = inject(VoiceReconnectProfileEvidenceService).connect(
    "/api/voice/reconnect-profile-evidence",
    {
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
    },
  );
  reconnectEvidenceHtml = computed(() =>
    renderVoiceReconnectProfileEvidenceHTML(
      {
        error: this.reconnectEvidence.error(),
        isLoading: this.reconnectEvidence.isLoading(),
        report: this.reconnectEvidence.report(),
        updatedAt: this.reconnectEvidence.updatedAt(),
      },
      {
        description:
          "Angular renders persisted real browser reconnect/resume traces from the package reconnect evidence primitive.",
        title: "Persisted Reconnect Evidence",
      },
    ),
  );
  readinessFailures = inject(VoiceReadinessFailuresService).connect(
    "/api/production-readiness",
    {
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
    },
  );
  sessionSnapshot = inject(VoiceSessionSnapshotService).connect(
    "/api/voice/session-snapshot/latest",
    {
      reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
    },
  );
  sessionSnapshotModel = computed(() =>
    createVoiceSessionSnapshotViewModel(
      {
        error: this.sessionSnapshot.error(),
        isLoading: this.sessionSnapshot.isLoading(),
        snapshot: this.sessionSnapshot.snapshot(),
        updatedAt: this.sessionSnapshot.updatedAt(),
      },
      {
        description:
          "Angular renders a downloadable support bundle with session media graph, provider routing, and turn-quality evidence.",
        title: "Session Debug Snapshot",
      },
    ),
  );
  sessionObservability = inject(VoiceSessionObservabilityService).connect(
    "/api/voice/session-observability/demo-incident-bundle",
    {
      reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
    },
  );
  sessionObservabilityModel = computed(() =>
    createVoiceSessionObservabilityViewModel(
      {
        error: this.sessionObservability.error(),
        isLoading: this.sessionObservability.isLoading(),
        report: this.sessionObservability.report(),
        updatedAt: this.sessionObservability.updatedAt(),
      },
      {
        description:
          "Angular renders one per-call support report with turn waterfalls, provider recovery, tools, handoffs, guardrails, and incident handoff links.",
        title: "Session Observability",
      },
    ),
  );
  callDebugger = inject(VoiceCallDebuggerService).connect(
    "/api/voice-call-debugger/latest",
    {
      reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
    },
  );
  callDebuggerModel = computed(() =>
    createVoiceCallDebuggerLaunchViewModel(
      "/api/voice-call-debugger/latest",
      {
        error: this.callDebugger.error(),
        isLoading: this.callDebugger.isLoading(),
        report: this.callDebugger.report(),
        updatedAt: this.callDebugger.updatedAt(),
      },
      {
        description:
          "Angular opens the latest full call debugger with snapshot, replay, provider path, transcript, and incident markdown.",
        title: "Debug Latest Call",
      },
    ),
  );
  providerStatus = inject(VoiceProviderStatusService).connect(
    "/api/provider-status",
    {
      reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
    },
  );
  providerCapabilities = inject(VoiceProviderCapabilitiesService).connect(
    "/api/provider-capabilities",
    {
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
    },
  );
  providerContracts = inject(VoiceProviderContractsService).connect(
    "/api/provider-contracts",
    {
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
    },
  );
  routingStatus = inject(VoiceRoutingStatusService).connect(
    "/api/routing/latest",
    {
      reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
    },
  );
  campaignDialerProof = inject(VoiceCampaignDialerProofService).connect(
    "/api/voice/campaigns/dialer-proof",
  );
  turnQuality = inject(VoiceTurnQualityService).connect("/api/turn-quality", {
    reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
  });
  turnLatency = inject(VoiceTurnLatencyService).connect("/api/turn-latency", {
    reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
    proofPath: "/api/turn-latency/proof",
  });
  traceTimeline = inject(VoiceTraceTimelineService).connect(
    "/api/voice-traces",
    {
      reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
    },
  );
  platformCoveragePassing = computed(
    () =>
      this.platformCoverage
        .report()
        ?.coverage.filter((surface) => surface.status === "pass").length ?? 0,
  );
  formatMs(value: unknown) {
    return typeof value === "number" && Number.isFinite(value)
      ? `${Math.round(value)}ms`
      : "n/a";
  }
  formatProviderRoutes(routes: unknown) {
    if (!routes || typeof routes !== "object") {
      return "None";
    }

    return (
      Object.entries(routes)
        .map(([role, provider]) => `${role}: ${String(provider)}`)
        .join(", ") || "None"
    );
  }
  formatProviderRoute(routes: unknown, role: "llm" | "stt" | "tts") {
    if (!routes || typeof routes !== "object") {
      return "Not configured";
    }

    const value = Reflect.get(routes, role);

    return typeof value === "string" && value.trim() ? value : "Not configured";
  }
  formatFallbackPath(decision: VoiceRoutingDecisionSummary) {
    const provider = decision.provider || "Unknown";
    const selectedProvider = decision.selectedProvider || provider;

    if (decision.fallbackProvider) {
      return `${provider} -> ${decision.fallbackProvider}`;
    }

    if (selectedProvider !== provider) {
      return `${provider} -> ${selectedProvider}`;
    }

    return `${provider} primary`;
  }
  currentVoice = computed(() =>
    this.activeMode() === "general" ? this.generalVoice : this.guidedVoice,
  );
  profileSwitchGuardDecision = computed(() =>
    getVoiceProfileSwitchGuardDecision(this.currentVoice().sessionMetadata()),
  );
  currentPrompt = computed(() =>
    getVoiceModePrompt({
      hasStarted:
        (this.activeMode()
          ? this.hasStartedModes()[this.activeMode()!]
          : false) || this.currentVoice().turns().length > 0,
      mode: this.activeMode(),
      status: this.currentVoice().status(),
      turnCount: this.currentVoice().turns().length,
    }),
  );
  leadMessage = computed(() =>
    getVoiceLeadMessage({
      hasStarted:
        (this.activeMode()
          ? this.hasStartedModes()[this.activeMode()!]
          : false) || this.currentVoice().turns().length > 0,
      mode: this.activeMode(),
      status: this.currentVoice().status(),
      turnCount: this.currentVoice().turns().length,
    }),
  );
  errorMessage = computed(
    () => this.micError() ?? this.currentVoice().error() ?? "None",
  );
  callLifecycleLabel = computed(() => {
    const call = this.currentVoice().call();

    return call?.disposition
      ? `${call.disposition} after ${call.events.length} lifecycle event${call.events.length === 1 ? "" : "s"}`
      : (call?.events.at(-1)?.type ?? "Not started");
  });
  bargeInEvidence = createDemoBargeInEvidence(() => {
    const voice = this.currentVoice();

    return {
      assistantAudio: voice.assistantAudio(),
      assistantTexts: voice.assistantTexts(),
      sessionId: voice.sessionId(),
      sendAudio: (audio) => voice.sendAudio(audio),
    };
  });
  liveLatencyEvidence = createDemoLiveTurnLatencyEvidence(() => {
    const voice = this.currentVoice();

    return {
      assistantAudio: voice.assistantAudio(),
      assistantTexts: voice.assistantTexts(),
      sessionId: voice.sessionId(),
    };
  });
  routingDescription = computed(
    () =>
      `${getVoiceProfileLabel(this.profileId())} uses ${
        this.voiceProfiles.find((item) => item.id === this.profileId())
          ?.description ?? "the selected real-call defaults."
      }`,
  );
  wavePath = this.microphoneService.wavePath;
  private simulateDisconnect = () => {
    this.currentVoice().simulateDisconnect();
  };

  constructor() {
    defineVoiceProfileComparisonElement();
    defineVoiceProfileSwitchRecommendationElement();
    defineVoiceProviderSimulationControlsElement();
    effect(() => {
      const voice = this.currentVoice();
      voice.assistantAudio().length;
      voice.assistantTexts().length;
      voice.sessionId();
      queueMicrotask(() => this.syncLiveLatencyProof());
    });
    if (typeof window !== "undefined") {
      const demoWindow: VoiceDemoWindow = window;
      demoWindow.__absoluteVoiceDemoSimulateDisconnect =
        this.simulateDisconnect;
      window.addEventListener(
        "absolute-voice-simulate-disconnect",
        this.simulateDisconnect,
      );
      this.serverHtmlPanels.start();
      this.savedIntakesService.start(
        () => this.currentVoice().sessionId() || undefined,
      );
      this.syncLiveLatencyProof();
    }
  }

  downloadSessionSnapshot() {
    const snapshot = this.sessionSnapshot.snapshot();
    if (!snapshot) {
      return;
    }

    const href = URL.createObjectURL(this.sessionSnapshot.download());
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `voice-session-${snapshot.sessionId}.snapshot.json`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  startMic() {
    return this.microphoneService.start({
      sampleRateHz: getVoiceSpeechEngineSampleRate(this.speechEngine()),
      onAudio: (audio) => {
        this.liveLatencyEvidence.recordAudio(audio);
        this.syncLiveLatencyProof();
        this.bargeInEvidence.sendAudio(audio);
      },
    });
  }

  stopMic() {
    this.microphoneService.stop();
  }

  changeModelProvider(provider: VoiceModelProvider) {
    this.stopMic();
    this.config.applyModelProvider(provider);
  }

  changeProfileId(profileId: VoiceProfileId) {
    this.stopMic();
    this.config.applyProfileId(profileId);
  }

  changeRoutingMode(routing: VoiceRoutingMode) {
    this.stopMic();
    this.config.applyRoutingMode(routing);
  }

  changeSpeechEngine(engine: VoiceSpeechEngine) {
    this.stopMic();
    this.config.applySpeechEngine(engine);
  }

  async startMode(mode: VoiceDemoMode) {
    this.activeMode.set(mode);
    this.hasStartedModes.update((current) => ({
      ...current,
      [mode]: true,
    }));
    await this.startMic();
  }

  runCallControl(action: (typeof VOICE_CALL_CONTROL_ACTIONS)[number]) {
    this.currentVoice().callControl(action);
    this.stopMic();
  }

  runTurnLatencyProof() {
    void this.turnLatency.runProof().catch(() => {});
  }

  runCampaignDialerProof() {
    void this.campaignDialerProof.runProof().catch(() => {});
  }

  runOpsAction(actionId: string) {
    void this.opsActionCenter.run(actionId).catch(() => {});
  }

  setLiveOpsAssignee(event: Event) {
    this.liveOps.setLiveOpsAssignee(event);
  }

  setLiveOpsTag(event: Event) {
    this.liveOps.setLiveOpsTag(event);
  }

  setLiveOpsDetail(event: Event) {
    this.liveOps.setLiveOpsDetail(event);
  }

  runLiveOpsAction(action: VoiceLiveOpsAction) {
    return this.liveOps.runLiveOpsAction(action, {
      sessionId: this.currentVoice().sessionId(),
      applySideEffects: ({ action: appliedAction, detail, tag }) => {
        if (appliedAction === "force-handoff") {
          this.currentVoice().callControl({
            action: "transfer",
            metadata: { source: "live-ops" },
            reason: detail,
            target: tag,
          });
          this.stopMic();
        } else if (
          appliedAction === "escalate" ||
          appliedAction === "operator-takeover"
        ) {
          this.currentVoice().callControl({
            action: "escalate",
            metadata: {
              source: "live-ops",
              takeover: appliedAction === "operator-takeover",
            },
            reason: detail,
          });
          this.stopMic();
        } else if (appliedAction === "pause-assistant") {
          this.stopMic();
        }
      },
    });
  }

  operationsRecordHref(sessionId: string) {
    return `/voice-operations/${encodeURIComponent(sessionId)}`;
  }

  incidentBundleHref(sessionId: string) {
    return `/voice-incidents/${encodeURIComponent(sessionId)}/markdown`;
  }

  syncLiveLatencyProof() {
    this.liveLatencyEvidence.syncAssistantOutput();
    this.liveLatencyHtml.set(
      renderDemoLiveTurnLatencyHTML(this.liveLatencyEvidence.getSnapshot()),
    );
  }

  ngOnDestroy() {
    if (typeof window !== "undefined") {
      const demoWindow: VoiceDemoWindow = window;
      window.removeEventListener(
        "absolute-voice-simulate-disconnect",
        this.simulateDisconnect,
      );
      if (
        demoWindow.__absoluteVoiceDemoSimulateDisconnect ===
        this.simulateDisconnect
      ) {
        delete demoWindow.__absoluteVoiceDemoSimulateDisconnect;
      }
    }
    this.savedIntakesService.stop();
    this.serverHtmlPanels.stop();
    this.stopMic();
    this.guidedVoice.close();
    this.generalVoice.close();
    this.opsStatus.close();
    this.deliveryRuntime.close();
    this.opsActionCenter.close();
    this.platformCoverage.close();
    this.proofTrends.close();
    this.reconnectEvidence.close();
    this.sessionSnapshot.close();
    this.callDebugger.close();
    this.providerCapabilities.close();
    this.providerContracts.close();
    this.providerStatus.close();
    this.campaignDialerProof.close();
    this.routingStatus.close();
    this.turnQuality.close();
    this.turnLatency.close();
  }
}

export const factory = (_props: AngularVoiceDemoProps) =>
  AngularVoiceDemoComponent;

export default AngularVoiceDemoComponent;
