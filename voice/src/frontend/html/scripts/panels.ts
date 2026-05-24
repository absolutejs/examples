import {
  createVoiceCampaignDialerProofStore,
  createVoicePlatformCoverageStore,
  mountVoiceOpsStatus,
  mountVoiceProfileComparison,
  mountVoiceProfileSwitchRecommendation,
  mountVoiceProofTrends,
  mountVoiceProviderCapabilities,
  mountVoiceProviderContracts,
  mountVoiceProviderSimulationControls,
  mountVoiceProviderStatus,
  mountVoiceReadinessFailures,
  mountVoiceReconnectProfileEvidence,
  mountVoiceRoutingStatus,
  mountVoiceTurnQuality,
  renderVoicePlatformCoverageHTML,
} from "@absolutejs/voice/client";
import { createSyncSubscriber } from "@absolutejs/sync/client";
import {
  fetchVoiceRealCallEvidenceWorkerHealth,
  formatErrorMessage,
  mountDemoBargeInProof,
  renderVoiceRealCallEvidenceWorkerHealthHTML,
  voiceReactiveSource,
} from "../../../shared/browser";
import {
  VOICE_EVIDENCE_TOPIC,
  VOICE_SYNC_PATH,
  VOICE_TURN_TOPIC,
  VOICE_WORKER_HEALTH_TOPIC,
} from "../../../constants/sync";
import { escapeHtml } from "./format";
import type { VoiceDemoElements } from "./dom";

const PLATFORM_COVERAGE_LIMIT = 4;

type PanelsInput = {
  elements: VoiceDemoElements;
  framework: string;
};

export const mountVoicePanels = (input: PanelsInput) => {
  const { elements, framework } = input;
  const opsStatus = mountVoiceOpsStatus(
    elements.workflowStatusHost,
    "/api/voice/ops-status",
    {
      reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
    },
  );
  const proofTrends = mountVoiceProofTrends(
    elements.proofTrendsHost,
    "/api/voice/proof-trends",
    {
      description: `${framework.toUpperCase()} renders sustained proof freshness and p95 metrics from the package proof-trends widget.`,
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
      title: "Sustained Proof Trends",
    },
  );
  const profileComparison = mountVoiceProfileComparison(
    elements.profileComparisonHost,
    "/api/voice/real-call-profile-history",
    {
      description: `${framework.toUpperCase()} renders measured profile defaults and persisted reconnect resume evidence behind each selected stack.`,
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
      title: "Profile + Reconnect Evidence",
    },
  );
  const reconnectEvidence = mountVoiceReconnectProfileEvidence(
    elements.reconnectEvidenceHost,
  );
  const profileSwitchRecommendation = mountVoiceProfileSwitchRecommendation(
    elements.profileSwitchHost,
    "/api/voice/profile-switch-recommendation",
    {
      description: `${framework.toUpperCase()} compares latest session signals against measured profile evidence and recommends whether to switch stacks.`,
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
      title: "Profile Switch Recommendation",
    },
  );
  const readinessFailures = mountVoiceReadinessFailures(
    elements.readinessFailuresHost,
    "/api/production-readiness",
    {
      description: `${framework.toUpperCase()} renders structured deploy-gate explanations from production readiness JSON when calibrated gates warn or fail.`,
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
      title: "Readiness Gate Explanations",
    },
  );
  const platformCoverage = createVoicePlatformCoverageStore(
    "/api/voice/platform-coverage",
    {
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
    },
  );
  const providerStatus = mountVoiceProviderStatus(
    elements.providerStatusHost,
    "/api/provider-status",
    {
      reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
    },
  );
  const providerCapabilities = mountVoiceProviderCapabilities(
    elements.providerCapabilitiesHost,
    "/api/provider-capabilities",
    {
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
    },
  );
  const providerContracts = mountVoiceProviderContracts(
    elements.providerContractsHost,
    "/api/provider-contracts",
    {
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
    },
  );
  const providerSimulation = mountVoiceProviderSimulationControls(
    elements.providerSimulationHost,
    {
      failureMessage:
        "Prove Deepgram STT failover to AssemblyAI without changing credentials.",
      failureProviders: ["deepgram"],
      fallbackRequiredMessage:
        "Add ASSEMBLYAI_API_KEY to enable the fallback simulation.",
      fallbackRequiredProvider: "assemblyai",
      kind: "stt",
      providers: [{ provider: "deepgram" }, { provider: "assemblyai" }],
    },
  );
  const campaignDialerProof = createVoiceCampaignDialerProofStore(
    "/api/voice/campaigns/dialer-proof",
  );
  const routingStatus = mountVoiceRoutingStatus(
    elements.routingDecisionRoot,
    "/api/routing/latest",
    {
      reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
    },
  );
  const turnQuality = mountVoiceTurnQuality(
    elements.turnQualityHost,
    "/api/turn-quality",
    {
      reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
    },
  );
  // Reactive worker-health: render once, then refetch only when the server
  // pushes VOICE_WORKER_HEALTH_TOPIC (republished per worker collect tick).
  const realCallWorkerDescription = `${framework.toUpperCase()} renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.`;
  const renderRealCallWorkerHealth = async () => {
    try {
      elements.realCallWorkerHost.innerHTML =
        renderVoiceRealCallEvidenceWorkerHealthHTML(
          await fetchVoiceRealCallEvidenceWorkerHealth(),
          { description: realCallWorkerDescription },
        );
    } catch (error) {
      elements.realCallWorkerHost.innerHTML =
        renderVoiceRealCallEvidenceWorkerHealthHTML(null, {
          description: realCallWorkerDescription,
          error: formatErrorMessage(error),
        });
    }
  };
  void renderRealCallWorkerHealth();
  const realCallWorkerSubscriber = createSyncSubscriber({
    onEvent: () => void renderRealCallWorkerHealth(),
    topics: [VOICE_WORKER_HEALTH_TOPIC],
    url: VOICE_SYNC_PATH,
  });
  const renderPlatformCoverage = () => {
    elements.platformCoverageHost.innerHTML = renderVoicePlatformCoverageHTML(
      platformCoverage.getSnapshot(),
      {
        description: `${framework.toUpperCase()} renders the package coverage widget against the same proof-backed route used by the server.`,
        limit: PLATFORM_COVERAGE_LIMIT,
        title: "Vapi Replacement Coverage",
      },
    );
  };
  const unsubscribePlatformCoverage = platformCoverage.subscribe(
    renderPlatformCoverage,
  );
  renderPlatformCoverage();
  void platformCoverage.refresh().catch(() => {});
  const renderCampaignDialerProof = () => {
    const snapshot = campaignDialerProof.getSnapshot();
    const providers =
      snapshot.report?.providers.map((provider) => ({
        label: provider.provider,
        passed: provider.outcomes.every((outcome) => outcome.applied),
        requests: provider.carrierRequests.length,
      })) ?? [];
    elements.campaignDialerProofHost.innerHTML = `<span class="voice-framework-pill">Campaign Dialer Proof</span>
    <h2>Carrier dialer dry-run</h2>
    <p class="voice-footnote">Twilio, Telnyx, and Plivo campaign dials run through the shared browser store, attach campaign metadata, and resolve synthetic webhook outcomes.</p>
    <button class="absolute-voice-turn-latency__proof" type="button" ${snapshot.isLoading ? "disabled" : ""} id="campaign-dialer-proof-run">${snapshot.isLoading ? "Running proof" : "Run campaign dialer proof"}</button>
    ${
      providers.length
        ? `<div class="voice-provider-health-list">${providers
            .map(
              (provider) => `<div class="voice-provider-health-item">
        <strong>${escapeHtml(provider.label)}</strong>
        <span>${provider.passed ? "passed" : "needs attention"}</span>
        <small>${provider.requests} dry-run carrier request${provider.requests === 1 ? "" : "s"}</small>
      </div>`,
            )
            .join("")}</div>`
        : `<p class="empty-copy">Ready for ${escapeHtml((snapshot.status?.providers ?? ["twilio", "telnyx", "plivo"]).join(", "))}.</p>`
    }
    ${snapshot.error ? `<p class="voice-footnote">${escapeHtml(snapshot.error)}</p>` : ""}
    <p class="voice-footnote"><a href="/voice/campaigns/dialer-proof">Open full proof</a></p>`;
    elements.campaignDialerProofHost
      .querySelector("#campaign-dialer-proof-run")
      ?.addEventListener("click", () => {
        void campaignDialerProof.runProof().catch(() => {});
      });
  };
  const unsubscribeCampaignDialerProof = campaignDialerProof.subscribe(
    renderCampaignDialerProof,
  );
  renderCampaignDialerProof();
  void campaignDialerProof.refresh().catch(() => {});
  const bargeInProof = mountDemoBargeInProof(elements.bargeInProofHost);

  const close = () => {
    opsStatus.close();
    proofTrends.close();
    readinessFailures.close();
    platformCoverage.close();
    unsubscribePlatformCoverage();
    providerCapabilities.close();
    providerContracts.close();
    campaignDialerProof.close();
    unsubscribeCampaignDialerProof();
    providerSimulation.close();
    providerStatus.close();
    routingStatus.close();
    turnQuality.close();
    realCallWorkerSubscriber.close();
    bargeInProof.close();
  };

  return {
    close,
    profileComparison,
    profileSwitchRecommendation,
    reconnectEvidence,
  };
};
