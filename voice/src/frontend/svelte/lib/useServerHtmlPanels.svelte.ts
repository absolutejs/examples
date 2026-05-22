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
} from "@absolutejs/voice/client";
import {
  fetchVoiceRealCallEvidenceWorkerHealth,
  formatErrorMessage,
  renderVoiceRealCallEvidenceWorkerHealthHTML,
} from "../../shared/browser";

const REAL_CALL_WORKER_INTERVAL_MS = 10_000;
const REAL_CALL_WORKER_DESCRIPTION =
  "Svelte renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.";

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
  status?: { providers: string[] };
};

type ServerHtmlPanels = {
  readonly callDebuggerHTML: string;
  readonly campaignDialerProofReadyProviders: string;
  readonly campaignDialerProofSnapshot: CampaignDialerProofSnapshot;
  readonly deliveryRuntimeHTML: string;
  handleTurnLatencyClick: (event: MouseEvent) => void;
  readonly opsActionCenterHTML: string;
  readonly opsStatusHTML: string;
  readonly platformCoverageHTML: string;
  readonly profileComparisonHTML: string;
  readonly profileSwitchHTML: string;
  readonly proofTrendsHTML: string;
  readonly providerCapabilitiesHTML: string;
  readonly providerContractsHTML: string;
  providerSimulation: { bind: (element: Element) => () => void };
  readonly providerSimulationHTML: string;
  readonly providerStatusHTML: string;
  readonly readinessFailuresHTML: string;
  readonly realCallWorkerHTML: string;
  readonly reconnectEvidenceHTML: string;
  refreshCampaignDialerProof: () => void;
  runCampaignDialerProof: () => void;
  readonly routingStatusHTML: string;
  readonly sessionObservabilityHTML: string;
  readonly sessionSnapshotHTML: string;
  start: () => void;
  stop: () => void;
  readonly traceTimelineHTML: string;
  readonly turnLatencyHTML: string;
  readonly turnQualityHTML: string;
};

export const useServerHtmlPanels = (): ServerHtmlPanels => {
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
  let routingStatusHTML = $state("");
  let traceTimelineHTML = $state("");
  let turnLatencyHTML = $state("");
  let turnQualityHTML = $state("");
  let campaignDialerProofSnapshot = $state<CampaignDialerProofSnapshot>({
    error: null,
    isLoading: false,
  });
  let realCallWorkerTimer: ReturnType<typeof setInterval> | null = null;

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
    "/api/voice/platform-coverage",
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
  let unsubscribeProviderCapabilities = () => {};
  let unsubscribeProviderContracts = () => {};
  let unsubscribeProviderStatus = () => {};
  let unsubscribeRoutingStatus = () => {};
  let unsubscribeTraceTimeline = () => {};
  let unsubscribeTurnLatency = () => {};
  let unsubscribeTurnQuality = () => {};

  const campaignDialerProofReadyProviders = $derived(
    (
      campaignDialerProofSnapshot?.status?.providers ?? [
        "twilio",
        "telnyx",
        "plivo",
      ]
    ).join(", "),
  );

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

  const refreshRealCallWorkerHealth = async () => {
    try {
      realCallWorkerHTML = renderVoiceRealCallEvidenceWorkerHealthHTML(
        await fetchVoiceRealCallEvidenceWorkerHealth(),
        {
          description: REAL_CALL_WORKER_DESCRIPTION,
        },
      );
    } catch (error) {
      realCallWorkerHTML = renderVoiceRealCallEvidenceWorkerHealthHTML(null, {
        description: REAL_CALL_WORKER_DESCRIPTION,
        error: formatErrorMessage(error),
      });
    }
  };

  const start = () => {
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
      description: REAL_CALL_WORKER_DESCRIPTION,
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
    realCallWorkerTimer = setInterval(() => {
      void refreshRealCallWorkerHealth();
    }, REAL_CALL_WORKER_INTERVAL_MS);
  };

  const stop = () => {
    if (realCallWorkerTimer) {
      clearInterval(realCallWorkerTimer);
    }
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
    unsubscribeProviderCapabilities();
    unsubscribeProviderContracts();
    unsubscribeProviderStatus();
    unsubscribeRoutingStatus();
    unsubscribeTraceTimeline();
    unsubscribeTurnQuality();
    unsubscribeTurnLatency();
    unsubscribeReconnectEvidence();
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
  };

  return {
    get callDebuggerHTML() {
      return callDebuggerHTML;
    },
    get campaignDialerProofReadyProviders() {
      return campaignDialerProofReadyProviders;
    },
    get campaignDialerProofSnapshot() {
      return campaignDialerProofSnapshot;
    },
    get deliveryRuntimeHTML() {
      return deliveryRuntimeHTML;
    },
    handleTurnLatencyClick,
    get opsActionCenterHTML() {
      return opsActionCenterHTML;
    },
    get opsStatusHTML() {
      return opsStatusHTML;
    },
    get platformCoverageHTML() {
      return platformCoverageHTML;
    },
    get profileComparisonHTML() {
      return profileComparisonHTML;
    },
    get profileSwitchHTML() {
      return profileSwitchHTML;
    },
    get proofTrendsHTML() {
      return proofTrendsHTML;
    },
    get providerCapabilitiesHTML() {
      return providerCapabilitiesHTML;
    },
    get providerContractsHTML() {
      return providerContractsHTML;
    },
    providerSimulation,
    get providerSimulationHTML() {
      return providerSimulationHTML;
    },
    get providerStatusHTML() {
      return providerStatusHTML;
    },
    get readinessFailuresHTML() {
      return readinessFailuresHTML;
    },
    get realCallWorkerHTML() {
      return realCallWorkerHTML;
    },
    get reconnectEvidenceHTML() {
      return reconnectEvidenceHTML;
    },
    refreshCampaignDialerProof,
    runCampaignDialerProof,
    get routingStatusHTML() {
      return routingStatusHTML;
    },
    get sessionObservabilityHTML() {
      return sessionObservabilityHTML;
    },
    get sessionSnapshotHTML() {
      return sessionSnapshotHTML;
    },
    start,
    stop,
    get traceTimelineHTML() {
      return traceTimelineHTML;
    },
    get turnLatencyHTML() {
      return turnLatencyHTML;
    },
    get turnQualityHTML() {
      return turnQualityHTML;
    },
  };
};
