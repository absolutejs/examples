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
  FRAMEWORK_DESCRIPTIONS,
  getVoiceLeadMessage,
  getVoiceModePrompt,
  getVoiceProfileLabel,
  getVoiceProfileSwitchGuardDecision,
  getVoiceRoutingLabel,
  getVoiceRoutePath,
  getVoiceSpeechEngineSampleRate,
  VOICE_ASSISTANT_CONFIG,
  VOICE_DEMO_GUIDE_STEPS,
  VOICE_DEMO_GUIDE_TITLE,
  VOICE_DEMO_GENERAL_LABEL,
  VOICE_DEMO_GUIDED_LABEL,
  VOICE_DEMO_MIC_IDLE,
  VOICE_DEMO_MIC_LIVE,
  VOICE_DEMO_STOP_LABEL,
  VOICE_CALL_CONTROL_ACTIONS,
  VOICE_PROFILES,
  type SavedIntake,
  type VoiceDemoMode,
  type VoiceModelProvider,
  type VoiceProfileId,
  type VoiceRoutingMode,
  type VoiceSpeechEngine,
} from "../../../shared/demo";
import {
  createDemoBargeInEvidence,
  createDemoLiveTurnLatencyEvidence,
  getOpsStatusLabel,
  renderDemoLiveTurnLatencyHTML,
  VOICE_LIVE_OPS_ACTIONS,
  type VoiceLiveOpsAction,
} from "../../shared/browser";
import { AgentSquadCardComponent } from "../components/agent-squad-card.component";
import { AssistantConfigCardComponent } from "../components/assistant-config-card.component";
import { CampaignDialerCardComponent } from "../components/campaign-dialer-card.component";
import { ConversationCardComponent } from "../components/conversation-card.component";
import { DemoChromeComponent } from "../components/demo-chrome.component";
import { GuideCardComponent } from "../components/guide-card.component";
import { ProofDashboardsCardComponent } from "../components/proof-dashboards-card.component";
import { ProviderConfigCardComponent } from "../components/provider-config-card.component";
import { SavedCapturesCardComponent } from "../components/saved-captures-card.component";
import { ServerHtmlCardComponent } from "../components/server-html-card.component";
import { VoiceHeroCardComponent } from "../components/voice-hero-card.component";
import { VoiceDemoConfigService } from "../services/voice-demo-config.service";
import { VoiceLiveOpsService } from "../services/voice-live-ops.service";
import { VoiceMicrophoneService } from "../services/voice-microphone.service";
import { VoiceSavedIntakesService } from "../services/voice-saved-intakes.service";
import { VoiceServerHtmlPanelsService } from "../services/voice-server-html-panels.service";

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
  selector: "angular-voice-demo-page",
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,
  template: `
    <div voiceDemoChrome>
      <article
        voiceHeroCard
        [activeMode]="activeMode()"
        [description]="description"
        [isConnected]="currentVoice().isConnected()"
        [modelProvider]="modelProvider()"
        [profileSwitchGuardDecision]="profileSwitchGuardDecision()"
        [routingMode]="routingMode()"
        [savedIntakesCount]="savedIntakes().length"
      ></article>

      <article
        voiceProviderConfigCard
        [modelProvider]="modelProvider()"
        [profileId]="profileId()"
        [routingDescription]="routingDescription()"
        [routingMode]="routingMode()"
        [speechEngine]="speechEngine()"
        (modelProviderChange)="changeModelProvider($event)"
        (profileIdChange)="changeProfileId($event)"
        (routingModeChange)="changeRoutingMode($event)"
        (speechEngineChange)="changeSpeechEngine($event)"
      ></article>

      <article voiceProofDashboardsCard></article>

      <article
        class="voice-card voice-provider-health-card"
        voiceServerHtmlCard
        [html]="realCallWorkerHtml()"
      ></article>

      <article class="voice-card voice-provider-health-card">
        <span class="voice-framework-pill">Vapi Replacement Coverage</span>
        <h2>
          @if (platformCoverage.report(); as report) {
            {{ platformCoveragePassing() }}/{{ report.total }} surfaces passing
          } @else if (platformCoverage.error()) {
            Coverage unavailable
          } @else if (platformCoverage.isLoading()) {
            Checking coverage
          } @else {
            Awaiting proof pack
          }
        </h2>
        <p class="voice-footnote">
          Angular reads the package route primitive behind the switching proof,
          so the framework page proves the same replacement surface as the
          server.
        </p>
        @if (platformCoverage.report()?.coverage?.length) {
          <div class="voice-provider-health-list">
            @for (
              surface of platformCoverage.report()!.coverage.slice(0, 4);
              track surface.surface
            ) {
              <div class="voice-provider-health-item">
                <strong>{{ surface.surface }}</strong>
                <span>{{ surface.status }}</span>
                <small>{{ surface.replacement }}</small>
              </div>
            }
          </div>
        } @else {
          <p class="empty-copy">
            {{
              platformCoverage.error() ??
                "Run the proof pack to populate coverage evidence."
            }}
          </p>
        }
        <p class="voice-footnote">
          <a href="/switching-from-vapi">Open switching guide</a> ·
          <a href="/api/voice/platform-coverage">Open JSON</a>
        </p>
      </article>

      <absolute-voice-profile-comparison
        class="voice-card voice-provider-health-card"
        description="Angular renders measured profile defaults and persisted reconnect resume evidence behind each selected stack."
        interval-ms="10000"
        title="Profile + Reconnect Evidence"
      ></absolute-voice-profile-comparison>

      <div
        class="voice-card voice-provider-health-card"
        voiceServerHtmlCard
        [html]="reconnectEvidenceHtml()"
      ></div>

      <absolute-voice-profile-switch
        class="voice-card voice-provider-health-card"
        description="Angular compares latest session signals against measured profile evidence and recommends whether to switch stacks."
        interval-ms="10000"
        title="Profile Switch Recommendation"
      ></absolute-voice-profile-switch>

      <article class="voice-card voice-provider-health-card">
        <span class="voice-framework-pill">Sustained Proof Trends</span>
        <h2>
          @if (proofTrends.report(); as report) {
            {{ report.status }} ·
            {{ report.summary.cycles ?? report.cycles.length }} cycles
          } @else if (proofTrends.error()) {
            Proof trends unavailable
          } @else if (proofTrends.isLoading()) {
            Checking proof trends
          } @else {
            Awaiting trend proof
          }
        </h2>
        <p class="voice-footnote">
          Angular reads the package proof-trends primitive for freshness,
          provider p95, turn p95, and live p95.
        </p>
        @if (proofTrends.report(); as report) {
          <div class="voice-routing-grid">
            <div>
              <span>Provider p95</span>
              <strong>{{ formatMs(report.summary.maxProviderP95Ms) }}</strong>
            </div>
            <div>
              <span>Turn p95</span>
              <strong>{{ formatMs(report.summary.maxTurnP95Ms) }}</strong>
            </div>
            <div>
              <span>Live p95</span>
              <strong>{{ formatMs(report.summary.maxLiveP95Ms) }}</strong>
            </div>
            <div>
              <span>Fresh until</span>
              <strong>{{ report.freshUntil ?? "n/a" }}</strong>
            </div>
          </div>
        } @else {
          <p class="empty-copy">
            {{
              proofTrends.error() ??
                "Run the sustained proof trends script to populate evidence."
            }}
          </p>
        }
        <p class="voice-footnote">
          <a href="/voice/proof-trends">Open trends</a> ·
          <a href="/api/voice/proof-trends">Open JSON</a>
        </p>
      </article>

      <article class="voice-card voice-provider-health-card">
        <span class="voice-framework-pill">Readiness Gate Explanations</span>
        <h2>
          @if (readinessFailures.explanations().length > 0) {
            {{ readinessFailures.explanations().length }} calibrated gate
            issue(s)
          } @else if (readinessFailures.error()) {
            Readiness explanations unavailable
          } @else if (readinessFailures.isLoading()) {
            Checking readiness gates
          } @else {
            No calibrated gate issues
          }
        </h2>
        <p class="voice-footnote">
          Angular reads structured gate explanations from production readiness
          JSON so deploy blockers show observed values, thresholds, evidence, and
          remediation.
        </p>
        @if (readinessFailures.explanations().length > 0) {
          <div class="voice-routing-grid">
            @for (
              check of readinessFailures.explanations();
              track check.label
            ) {
              <div>
                <span>{{ check.status }} · {{ check.label }}</span>
                <strong>
                  {{ check.gateExplanation?.observed ?? "n/a" }}
                  /
                  {{ check.gateExplanation?.threshold ?? "n/a" }}
                  {{ check.gateExplanation?.unit ?? "" }}
                </strong>
              </div>
            }
          </div>
        } @else {
          <p class="empty-copy">
            {{
              readinessFailures.error() ??
                "No calibrated readiness gate explanations are open."
            }}
          </p>
        }
        <p class="voice-footnote">
          <a href="/production-readiness">Open readiness</a> ·
          <a href="/voice/slo-readiness-thresholds">Open thresholds</a>
        </p>
      </article>

      <article
        class="voice-card voice-provider-health-card absolute-voice-session-snapshot"
        [class.absolute-voice-session-snapshot--ready]="
          sessionSnapshotModel().status === 'ready'
        "
        [class.absolute-voice-session-snapshot--warning]="
          sessionSnapshotModel().status === 'warning'
        "
      >
        <header class="absolute-voice-session-snapshot__header">
          <span class="absolute-voice-session-snapshot__eyebrow">
            {{ sessionSnapshotModel().title }}
          </span>
          <strong class="absolute-voice-session-snapshot__label">
            {{ sessionSnapshotModel().label }}
          </strong>
        </header>
        <p class="absolute-voice-session-snapshot__description">
          {{ sessionSnapshotModel().description }}
        </p>
        @if (sessionSnapshotModel().showDownload) {
          <button
            class="absolute-voice-session-snapshot__download"
            type="button"
            (click)="downloadSessionSnapshot()"
          >
            Download support bundle
          </button>
        }
        @if (sessionSnapshotModel().rows.length > 0) {
          <dl>
            @for (row of sessionSnapshotModel().rows; track row.label) {
              <div>
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </div>
            }
          </dl>
        } @else {
          <p class="absolute-voice-session-snapshot__empty">
            Load a session snapshot to see support diagnostics.
          </p>
        }
        @if (sessionSnapshotModel().error) {
          <p class="absolute-voice-session-snapshot__error">
            {{ sessionSnapshotModel().error }}
          </p>
        }
      </article>

      <article
        class="voice-card voice-provider-health-card absolute-voice-session-observability"
        [class.absolute-voice-session-observability--ready]="
          sessionObservabilityModel().status === 'ready'
        "
        [class.absolute-voice-session-observability--warning]="
          sessionObservabilityModel().status === 'warning'
        "
      >
        <header class="absolute-voice-session-observability__header">
          <span class="absolute-voice-session-observability__eyebrow">
            {{ sessionObservabilityModel().title }}
          </span>
          <strong class="absolute-voice-session-observability__label">
            {{ sessionObservabilityModel().label }}
          </strong>
        </header>
        <p class="absolute-voice-session-observability__description">
          {{ sessionObservabilityModel().description }}
        </p>
        @if (sessionObservabilityModel().links.length > 0) {
          <p class="absolute-voice-session-observability__actions">
            @for (link of sessionObservabilityModel().links; track link.href) {
              <a [href]="link.href">{{ link.label }}</a>
            }
          </p>
        }
        @if (sessionObservabilityModel().turns.length > 0) {
          <div class="absolute-voice-session-observability__turns">
            @for (turn of sessionObservabilityModel().turns; track turn.turnId) {
              <article class="absolute-voice-session-observability__turn">
                <header>
                  <strong>{{ turn.turnId }}</strong>
                  <span>{{ turn.durationLabel }}</span>
                </header>
                <p>{{ turn.label }}</p>
              </article>
            }
          </div>
        } @else {
          <p class="absolute-voice-session-observability__empty">
            Open a voice session to see turn waterfalls.
          </p>
        }
        @if (sessionObservabilityModel().error) {
          <p class="absolute-voice-session-observability__error">
            {{ sessionObservabilityModel().error }}
          </p>
        }
      </article>

      <article
        class="voice-card voice-provider-health-card absolute-voice-call-debugger-launch"
        [class.absolute-voice-call-debugger-launch--ready]="
          callDebuggerModel().status === 'ready'
        "
        [class.absolute-voice-call-debugger-launch--warning]="
          callDebuggerModel().status === 'warning'
        "
      >
        <header class="absolute-voice-call-debugger-launch__header">
          <span class="absolute-voice-call-debugger-launch__eyebrow">
            {{ callDebuggerModel().title }}
          </span>
          <strong class="absolute-voice-call-debugger-launch__label">
            {{ callDebuggerModel().label }}
          </strong>
        </header>
        <p class="absolute-voice-call-debugger-launch__description">
          {{ callDebuggerModel().description }}
        </p>
        <a
          class="absolute-voice-call-debugger-launch__link"
          [href]="callDebuggerModel().href"
        >
          Open debugger
        </a>
        @if (callDebuggerModel().rows.length > 0) {
          <dl>
            @for (row of callDebuggerModel().rows; track row.label) {
              <div>
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </div>
            }
          </dl>
        } @else {
          <p class="absolute-voice-call-debugger-launch__empty">
            Load a call debugger report to see the latest support artifact.
          </p>
        }
        @if (callDebuggerModel().error) {
          <p class="absolute-voice-call-debugger-launch__error">
            {{ callDebuggerModel().error }}
          </p>
        }
      </article>

      <article class="voice-card voice-routing-card">
        <span class="voice-framework-pill">Routing Trace</span>
        <h2>Why this STT provider?</h2>
        <p class="voice-footnote">
          Latest router event from the self-hosted trace store.
        </p>
        @if (routingStatus.decision(); as decision) {
          <div class="voice-routing-stack">
            <div>
              <span>Profile</span>
              <strong>{{
                decision.profileLabel ?? decision.profileId ?? "None"
              }}</strong>
            </div>
            <div>
              <span>LLM</span>
              <strong>{{
                formatProviderRoute(decision.providerRoutes, "llm")
              }}</strong>
            </div>
            <div>
              <span>STT</span>
              <strong>{{
                formatProviderRoute(decision.providerRoutes, "stt")
              }}</strong>
            </div>
            <div>
              <span>TTS</span>
              <strong>{{
                formatProviderRoute(decision.providerRoutes, "tts")
              }}</strong>
            </div>
            <div>
              <span>Fallback path</span>
              <strong>{{ formatFallbackPath(decision) }}</strong>
            </div>
          </div>
          <div class="voice-routing-grid">
            <div>
              <span>Policy</span>
              <strong>{{ getVoiceRoutingLabel(decision.routing) }}</strong>
            </div>
            <div>
              <span>Provider</span>
              <strong>{{ decision.provider }}</strong>
            </div>
            <div>
              <span>Selected</span>
              <strong>{{ decision.selectedProvider }}</strong>
            </div>
            <div>
              <span>Fallback</span>
              <strong>{{ decision.fallbackProvider ?? "None" }}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{{ decision.status }}</strong>
            </div>
            <div>
              <span>Voice profile</span>
              <strong>{{
                decision.profileLabel ?? decision.profileId ?? "None"
              }}</strong>
            </div>
            <div>
              <span>Default routes</span>
              <strong>{{ formatProviderRoutes(decision.providerRoutes) }}</strong>
            </div>
            <div>
              <span>Latency budget</span>
              <strong>{{
                decision.latencyBudgetMs
                  ? decision.latencyBudgetMs + "ms"
                  : "None"
              }}</strong>
            </div>
          </div>
        } @else {
          <p class="empty-copy">
            Start a voice session to see the selected STT provider.
          </p>
        }
      </article>

      <article
        voiceAgentSquadCard
        [agentSquadStatus]="agentSquadStatus()"
      ></article>

      <article
        voiceCampaignDialerCard
        [campaignDialerProof]="campaignDialerProof"
        (runProof)="runCampaignDialerProof()"
      ></article>

      <article class="voice-card voice-provider-health-card">
        <span class="voice-framework-pill">Provider Health</span>
        <h2>
          {{
            providerStatus.providers().length
              ? providerStatus.providers().length + " tracked"
              : "Checking providers"
          }}
        </h2>
        <p class="voice-footnote">
          Live model provider health, fallback counts, and cooldown state.
        </p>
        @if (providerStatus.providers().length) {
          <div class="voice-provider-health-list">
            @for (
              provider of providerStatus.providers();
              track provider.provider
            ) {
              <div class="voice-provider-health-item">
                <strong>{{ provider.provider }}</strong>
                <span>{{ provider.status }}</span>
                <small>
                  {{ provider.runCount }} runs ·
                  {{ provider.errorCount }} errors ·
                  {{ provider.fallbackCount }} fallbacks
                </small>
              </div>
            }
          </div>
        } @else {
          <p class="empty-copy">Run assistant traffic to see provider health.</p>
        }
      </article>

      <article class="voice-card voice-provider-health-card">
        <span class="voice-framework-pill">Provider Capabilities</span>
        <h2>
          {{
            providerCapabilities.report()
              ? providerCapabilities.report()!.selected + " selected"
              : "Checking capabilities"
          }}
        </h2>
        <p class="voice-footnote">
          Configured LLM/STT providers, selected defaults, models, and feature
          coverage.
        </p>
        @if (providerCapabilities.report()?.capabilities?.length) {
          <div class="voice-provider-health-list">
            @for (
              capability of providerCapabilities.report()!.capabilities;
              track capability.kind + ":" + capability.provider
            ) {
              <div class="voice-provider-health-item">
                <strong>{{ capability.provider }} {{ capability.kind }}</strong>
                <span>{{ capability.status }}</span>
                <small>
                  {{ capability.model || "default" }} ·
                  {{
                    capability.features?.join(", ") || "features not specified"
                  }}
                </small>
              </div>
            }
          </div>
        } @else {
          <p class="empty-copy">
            Configure provider capabilities to see coverage.
          </p>
        }
      </article>

      <article class="voice-card voice-provider-health-card">
        <span class="voice-framework-pill">Provider Contracts</span>
        <h2>
          {{
            providerContracts.report()
              ? providerContracts.report()!.passed +
                "/" +
                providerContracts.report()!.total +
                " passing"
              : "Checking contracts"
          }}
        </h2>
        <p class="voice-footnote">
          Required env, latency budget, fallback, streaming, and capability
          contracts.
        </p>
        @if (providerContracts.report()?.rows?.length) {
          <div class="voice-provider-health-list">
            @for (
              row of providerContracts.report()!.rows;
              track row.kind + ":" + row.provider
            ) {
              <div class="voice-provider-health-item">
                <strong>{{ row.provider }} {{ row.kind }}</strong>
                <span>{{ row.status }}</span>
                <small>
                  {{ row.checks.length }} checks ·
                  {{ row.selected ? "selected" : "available" }}
                </small>
                @for (check of row.checks; track check.key) {
                  @if (check.remediation) {
                    <small>
                      {{ check.remediation.label }}:
                      {{ check.remediation.detail }}
                    </small>
                  }
                }
              </div>
            }
          </div>
        } @else {
          <p class="empty-copy">Configure provider contracts to see coverage.</p>
        }
      </article>

      <absolute-voice-provider-simulation
        class="voice-card voice-provider-simulation-card"
        failure-message="Prove Deepgram STT failover to AssemblyAI without changing credentials."
        failure-providers="deepgram"
        fallback-required-message="Add ASSEMBLYAI_API_KEY to enable the fallback simulation."
        fallback-required-provider="assemblyai"
        kind="stt"
        providers="deepgram,assemblyai"
      ></absolute-voice-provider-simulation>

      <article class="voice-card voice-provider-health-card">
        <span class="voice-framework-pill">Turn Quality</span>
        <h2>
          {{
            turnQuality.report()
              ? turnQuality.report()!.warnings + " warnings"
              : "Checking turns"
          }}
        </h2>
        <p class="voice-footnote">
          STT confidence, fallback selection, correction, and transcript
          coverage.
        </p>
        @if (turnQuality.report()?.turns?.length) {
          <div class="voice-provider-health-list">
            @for (
              turn of turnQuality.report()!.turns;
              track turn.sessionId + ":" + turn.turnId
            ) {
              <div class="voice-provider-health-item">
                <strong>{{ turn.text || "Empty turn" }}</strong>
                <span>{{ turn.status }}</span>
                <small>
                  {{ turn.source || "unknown" }} ·
                  {{ turn.fallbackUsed ? "fallback" : "primary" }} ·
                  confidence
                  {{
                    turn.averageConfidence === undefined
                      ? "n/a"
                      : (turn.averageConfidence * 100).toFixed(0) + "%"
                  }}
                </small>
              </div>
            }
          </div>
        } @else {
          <p class="empty-copy">Complete a turn to see quality diagnostics.</p>
        }
      </article>

      <article class="voice-card voice-provider-health-card">
        <span class="voice-framework-pill">Turn Latency</span>
        <h2>
          {{
            turnLatency.report()?.averageTotalMs
              ? turnLatency.report()!.averageTotalMs + "ms avg"
              : "Checking latency"
          }}
        </h2>
        <p class="voice-footnote">
          End-to-end turn responsiveness from transcript timing to assistant
          start.
        </p>
        <button
          class="absolute-voice-turn-latency__proof"
          type="button"
          (click)="runTurnLatencyProof()"
        >
          Run latency proof
        </button>
        @if (turnLatency.report()?.turns?.length) {
          <div class="voice-provider-health-list">
            @for (
              turn of turnLatency.report()!.turns;
              track turn.sessionId + ":" + turn.turnId
            ) {
              <div class="voice-provider-health-item">
                <strong>{{ turn.text || "Empty turn" }}</strong>
                <span>{{ turn.status }}</span>
                <small>
                  {{ turn.totalMs === undefined ? "n/a" : turn.totalMs + "ms" }}
                  · {{ turn.stages[0]?.label || "stage" }}
                </small>
              </div>
            }
          </div>
        } @else {
          <p class="empty-copy">Complete a turn to see latency diagnostics.</p>
        }
      </article>

      <article
        class="voice-card voice-workflow-card"
        [class.is-failing]="opsStatus.report()?.status === 'fail'"
      >
        <span class="voice-framework-pill">Voice Ops Status</span>
        <h2>{{ getOpsStatusLabel(opsStatus.report()) }}</h2>
        <p class="voice-footnote">
          One embedded readiness check for certified workflows, provider health,
          and handoffs.
        </p>
        <div class="voice-workflow-summary">
          <span class="pill">{{ opsStatus.report()?.passed ?? 0 }} passing</span>
          <span class="pill">{{ opsStatus.report()?.failed ?? 0 }} failing</span>
          <span class="pill">{{ opsStatus.report()?.total ?? 0 }} checks</span>
        </div>
        <p class="voice-footnote">
          <a href="/api/voice/ops-status">Open ops status</a> ·
          <a href="/evals/fixtures">Open certified fixtures</a>
        </p>
      </article>

      <article class="voice-card voice-workflow-card">
        <span class="voice-framework-pill">Delivery Runtime</span>
        <h2>
          {{
            deliveryRuntime.error()
              ? "Unavailable"
              : deliveryRuntime.report()?.isRunning
                ? "Running"
                : deliveryRuntime.report()
                  ? "Stopped"
                  : "Checking"
          }}
        </h2>
        <p class="voice-footnote">
          Audit and trace delivery worker health from the Angular service
          primitive.
        </p>
        <div class="voice-workflow-summary">
          <span class="pill"
            >{{ deliveryRuntime.report()?.summary?.audit?.pending ?? 0 }} audit
            pending</span
          >
          <span class="pill"
            >{{ deliveryRuntime.report()?.summary?.trace?.pending ?? 0 }} trace
            pending</span
          >
          <span class="pill"
            >{{
              (deliveryRuntime.report()?.summary?.audit?.deadLettered ?? 0) +
                (deliveryRuntime.report()?.summary?.trace?.deadLettered ?? 0)
            }}
            dead-lettered</span
          >
        </div>
        <p class="voice-footnote">
          <a href="/delivery-runtime">Open delivery runtime</a>
        </p>
      </article>

      <article class="voice-card voice-workflow-card">
        <span class="voice-framework-pill">Voice Ops Action Center</span>
        <h2>
          {{
            opsActionCenter.error()
              ? "Needs attention"
              : opsActionCenter.isRunning()
                ? "Running"
                : opsActionCenter.lastResult()
                  ? "Action completed"
                  : "Ready"
          }}
        </h2>
        <p class="voice-footnote">
          One Angular service primitive for readiness, delivery workers, latency
          proof, and provider failover actions.
        </p>
        <div class="voice-workflow-summary">
          @for (action of opsActionCenter.actions(); track action.id) {
            <button
              class="pill"
              type="button"
              [disabled]="opsActionCenter.isRunning() || action.disabled"
              (click)="runOpsAction(action.id)"
            >
              {{
                opsActionCenter.runningActionId() === action.id
                  ? "Working..."
                  : action.label
              }}
            </button>
          }
        </div>
        @if (opsActionCenter.error()) {
          <p class="voice-footnote">{{ opsActionCenter.error() }}</p>
        }
      </article>

      <article class="voice-card voice-live-ops-panel">
        <span class="voice-framework-pill">Live Ops</span>
        <h2>Operator intervention</h2>
        <p class="voice-footnote">
          Tag, assign, pause, take over, force handoff, or inject an instruction
          while the voice session is still running.
        </p>
        <div class="voice-live-ops-panel__session">
          <span>Active session</span>
          <strong>{{ currentVoice().sessionId() || "No active session" }}</strong>
        </div>
        <label class="voice-provider-select">
          <span>Operator</span>
          <input [value]="liveOpsAssignee()" (input)="setLiveOpsAssignee($event)" />
        </label>
        <label class="voice-provider-select">
          <span>Tag</span>
          <input [value]="liveOpsTag()" (input)="setLiveOpsTag($event)" />
        </label>
        <label class="voice-provider-select">
          <span>Detail</span>
          <input [value]="liveOpsDetail()" (input)="setLiveOpsDetail($event)" />
        </label>
        <div class="voice-actions">
          @for (action of liveOpsActions; track action.action) {
            <button
              type="button"
              [disabled]="liveOpsRunning() || !currentVoice().sessionId()"
              (click)="runLiveOpsAction(action.action)"
            >
              {{ liveOpsRunning() ? "Running" : action.label }}
            </button>
          }
        </div>
        <div voiceServerHtmlCard [html]="liveOpsResultHtml()"></div>
      </article>

      <article class="voice-card voice-workflow-card">
        <span class="voice-framework-pill">Operator Action History</span>
        <h2>Auditable actions</h2>
        <p class="voice-footnote">
          Every action-center click is recorded as audit and trace evidence.
        </p>
        <p class="voice-footnote">
          <a href="/voice/ops-actions">Open action history</a> ·
          <a href="/api/voice/ops-actions/history">Open JSON</a>
        </p>
      </article>

      <article
        class="voice-card voice-provider-health-card absolute-voice-trace-timeline"
        [class.absolute-voice-trace-timeline--failed]="
          (traceTimeline.report()?.failed ?? 0) > 0
        "
      >
        <header class="absolute-voice-trace-timeline__header">
          <span class="absolute-voice-trace-timeline__eyebrow">Voice Traces</span>
          <strong class="absolute-voice-trace-timeline__label">
            {{ traceTimeline.report()?.total ?? 0 }} recent
          </strong>
        </header>
        <p class="absolute-voice-trace-timeline__description">
          Latest call timelines from the Angular service primitive.
        </p>
        @if ((traceTimeline.report()?.sessions?.length ?? 0) > 0) {
          <div class="absolute-voice-trace-timeline__sessions">
            @for (
              session of traceTimeline.report()?.sessions?.slice(0, 2) ?? [];
              track session.sessionId
            ) {
              <article
                class="absolute-voice-trace-timeline__session"
                [class.absolute-voice-trace-timeline__session--failed]="
                  session.status === 'failed'
                "
              >
                <header>
                  <strong>{{ session.sessionId }}</strong>
                  <span>{{ session.status }}</span>
                </header>
                <p>
                  {{ session.summary.eventCount }} events ·
                  {{ session.summary.turnCount }} turns ·
                  {{ session.providers.length }} providers
                </p>
                <p class="absolute-voice-trace-timeline__actions">
                  <a href="/traces/{{ session.sessionId }}">Open timeline</a>
                  <a [href]="operationsRecordHref(session.sessionId)"
                    >Open operations record</a
                  >
                  <a [href]="incidentBundleHref(session.sessionId)"
                    >Export incident bundle</a
                  >
                </p>
              </article>
            }
          </div>
        } @else {
          <p class="absolute-voice-trace-timeline__empty">
            Run a voice session to see call timelines.
          </p>
        }
      </article>

      <div voiceServerHtmlCard [html]="bargeInProofHtml()"></div>

      <div voiceServerHtmlCard [html]="liveLatencyHtml()"></div>

      <article
        voiceGuideCard
        [guideSteps]="guideSteps"
        [guideTitle]="guideTitle"
      ></article>

      <article
        voiceAssistantConfigCard
        [assistantConfig]="assistantConfig"
      ></article>

      <article
        voiceConversationCard
        [activeMode]="activeMode()"
        [callControlActions]="callControlActions"
        [callLifecycleLabel]="callLifecycleLabel()"
        [currentPrompt]="currentPrompt()"
        [errorMessage]="errorMessage()"
        [generalLabel]="generalLabel"
        [guidedLabel]="guidedLabel"
        [idleMicCopy]="idleMicCopy"
        [isCapturing]="isCapturing()"
        [leadMessage]="leadMessage()"
        [liveMicCopy]="liveMicCopy"
        [partial]="currentVoice().partial()"
        [reconnect]="currentVoice().reconnect()"
        [status]="currentVoice().status()"
        [stopLabel]="stopLabel"
        [turns]="currentVoice().turns()"
        [wavePath]="wavePath()"
        (runCallControl)="runCallControl($event)"
        (startMode)="startMode($event)"
        (stopMic)="stopMic()"
      ></article>

      <article
        voiceSavedCapturesCard
        [savedIntakes]="savedIntakes()"
      ></article>
    </div>
  `,
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
    intervalMs: 5_000,
  });
  deliveryRuntime = inject(VoiceDeliveryRuntimeService).connect(
    "/api/voice-delivery-runtime",
    {
      intervalMs: 5_000,
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
      intervalMs: 10_000,
    },
  );
  proofTrends = inject(VoiceProofTrendsService).connect(
    "/api/voice/proof-trends",
    {
      intervalMs: 10_000,
    },
  );
  reconnectEvidence = inject(VoiceReconnectProfileEvidenceService).connect(
    "/api/voice/reconnect-profile-evidence",
    {
      intervalMs: 10_000,
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
      intervalMs: 10_000,
    },
  );
  sessionSnapshot = inject(VoiceSessionSnapshotService).connect(
    "/api/voice/session-snapshot/latest",
    {
      intervalMs: 5_000,
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
      intervalMs: 5_000,
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
      intervalMs: 5_000,
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
      intervalMs: 5_000,
    },
  );
  providerCapabilities = inject(VoiceProviderCapabilitiesService).connect(
    "/api/provider-capabilities",
    {
      intervalMs: 5_000,
    },
  );
  providerContracts = inject(VoiceProviderContractsService).connect(
    "/api/provider-contracts",
    {
      intervalMs: 5_000,
    },
  );
  routingStatus = inject(VoiceRoutingStatusService).connect(
    "/api/routing/latest",
    {
      intervalMs: 4_000,
    },
  );
  campaignDialerProof = inject(VoiceCampaignDialerProofService).connect(
    "/api/voice/campaigns/dialer-proof",
  );
  turnQuality = inject(VoiceTurnQualityService).connect("/api/turn-quality", {
    intervalMs: 5_000,
  });
  turnLatency = inject(VoiceTurnLatencyService).connect("/api/turn-latency", {
    intervalMs: 5_000,
    proofPath: "/api/turn-latency/proof",
  });
  traceTimeline = inject(VoiceTraceTimelineService).connect(
    "/api/voice-traces",
    {
      intervalMs: 5_000,
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
      sendAudio: (audio) => voice.sendAudio(audio),
      sessionId: voice.sessionId(),
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
      demoWindow.__absoluteVoiceDemoSimulateDisconnect = this.simulateDisconnect;
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
      onAudio: (audio) => {
        this.liveLatencyEvidence.recordAudio(audio);
        this.syncLiveLatencyProof();
        this.bargeInEvidence.sendAudio(audio);
      },
      sampleRateHz: getVoiceSpeechEngineSampleRate(this.speechEngine()),
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
      sessionId: this.currentVoice().sessionId(),
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
