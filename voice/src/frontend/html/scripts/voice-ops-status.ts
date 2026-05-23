import {
  createVoicePlatformCoverageStore,
  createVoiceOpsActionCenterActions,
  defineVoiceCallDebuggerLaunchElement,
  defineVoiceDeliveryRuntimeElement,
  defineVoiceOpsStatusElement,
  defineVoiceProfileComparisonElement,
  defineVoiceProfileSwitchRecommendationElement,
  defineVoiceProviderCapabilitiesElement,
  defineVoiceProviderContractsElement,
  defineVoiceProviderSimulationControlsElement,
  defineVoiceProviderStatusElement,
  defineVoiceRoutingStatusElement,
  defineVoiceSessionObservabilityElement,
  defineVoiceSessionSnapshotElement,
  defineVoiceTraceTimelineElement,
  defineVoiceTurnLatencyElement,
  defineVoiceTurnQualityElement,
  mountVoiceOpsActionCenter,
  mountVoiceOpsActionHistory,
  mountVoiceProofTrends,
  mountVoiceReadinessFailures,
  renderVoicePlatformCoverageHTML,
} from "@absolutejs/voice/client";
import { mountDemoBargeInProof } from "../../../shared/browser";
import { mountVoiceLiveOpsPanel } from "../../../shared/browser";

defineVoiceCallDebuggerLaunchElement();
defineVoiceDeliveryRuntimeElement();
defineVoiceOpsStatusElement();
defineVoiceProfileComparisonElement();
defineVoiceProfileSwitchRecommendationElement();
defineVoiceProviderCapabilitiesElement();
defineVoiceProviderContractsElement();
defineVoiceProviderSimulationControlsElement();
defineVoiceProviderStatusElement();
defineVoiceRoutingStatusElement();
defineVoiceSessionObservabilityElement();
defineVoiceSessionSnapshotElement();
defineVoiceTraceTimelineElement();
defineVoiceTurnLatencyElement();
defineVoiceTurnQualityElement();

const bargeInProofHost = document.querySelector("#barge-in-proof-card");
if (bargeInProofHost instanceof HTMLElement) {
  mountDemoBargeInProof(bargeInProofHost);
}

const framework = document.body.dataset.framework ?? "htmx";
const platformCoverageHost = document.querySelector("#platform-coverage-card");
if (platformCoverageHost instanceof HTMLElement) {
  const platformCoverage = createVoicePlatformCoverageStore(
    "/api/voice/platform-coverage",
    {
      intervalMs: 10_000,
    },
  );
  const renderPlatformCoverage = () => {
    platformCoverageHost.innerHTML = renderVoicePlatformCoverageHTML(
      platformCoverage.getSnapshot(),
      {
        description: `${framework.toUpperCase()} renders the package coverage widget against the same proof-backed route used by the server.`,
        limit: 4,
        title: "Vapi Replacement Coverage",
      },
    );
  };
  platformCoverage.subscribe(renderPlatformCoverage);
  renderPlatformCoverage();
  void platformCoverage.refresh().catch(() => {});
}

const proofTrendsHost = document.querySelector("#proof-trends-card");
if (proofTrendsHost instanceof HTMLElement) {
  mountVoiceProofTrends(proofTrendsHost, "/api/voice/proof-trends", {
    description: `${framework.toUpperCase()} renders sustained proof freshness and p95 metrics from the package proof-trends widget.`,
    intervalMs: 10_000,
    title: "Sustained Proof Trends",
  });
}

const readinessFailuresHost = document.querySelector(
  "#readiness-failures-card",
);
if (readinessFailuresHost instanceof HTMLElement) {
  mountVoiceReadinessFailures(
    readinessFailuresHost,
    "/api/production-readiness",
    {
      description: `${framework.toUpperCase()} renders structured deploy-gate explanations from production readiness JSON when calibrated gates warn or fail.`,
      intervalMs: 10_000,
      title: "Readiness Gate Explanations",
    },
  );
}

for (const actionCenter of document.querySelectorAll(
  "[data-voice-ops-action-center]",
)) {
  if (actionCenter instanceof HTMLElement) {
    mountVoiceOpsActionCenter(actionCenter, {
      actions: createVoiceOpsActionCenterActions({
        providers: ["deepgram", "assemblyai"],
      }),
    });
  }
}

for (const actionHistory of document.querySelectorAll(
  "[data-voice-ops-action-history]",
)) {
  if (actionHistory instanceof HTMLElement) {
    mountVoiceOpsActionHistory(
      actionHistory,
      "/api/voice/ops-actions/history",
      {
        intervalMs: 5_000,
      },
    );
  }
}

for (const liveOpsPanel of document.querySelectorAll("#live-ops-panel")) {
  if (liveOpsPanel instanceof HTMLElement) {
    mountVoiceLiveOpsPanel(liveOpsPanel, {
      getSessionId: () => {
        const sync = document.querySelector("#voice-htmx-sync");
        const route = sync?.getAttribute("hx-get");
        if (!route) {
          return undefined;
        }

        return new URL(route, window.location.origin).searchParams.get(
          "sessionId",
        );
      },
    });
  }
}
