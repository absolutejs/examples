import { type SavedIntake } from "../shared/demo";

import {
  buildVoiceMediaPipelineIncidentEvents,
  buildVoiceOperationalStatusReport,
  buildVoiceProductionReadinessReport,
  createVoiceConfiguration,
  createVoiceFileEvalBaselineStore,
  createVoiceFileScenarioFixtureStore,
  renderVoiceOperationsRecordHTML,
  renderVoiceSessionObservabilityHTML,
  type VoiceCallReviewStore,
  type VoiceHandoffDeliveryStore,
  type VoiceOpsTaskStore,
  type VoiceProviderOrchestrationRoutesOptions,
  type VoiceSessionRecord,
  voiceComplianceRedactionDefaults,
} from "@absolutejs/voice";

import { resolve } from "node:path";

import { receivedWebhookEnvelopes } from "./carrierHandoff";
import { channelDefaults } from "./channelDefaults";
import {
  campaignStore,
  demoOutcomeContracts,
  workflowScenarios,
} from "./contracts";
import {
  buildDemoCompetitiveCoverageReport,
  buildDemoGuardrailReport,
  demoToolContracts,
} from "./coverage";
import { escapeHtml } from "./helpers";
import {
  buildDemoIncidentTimelineFailureReplay,
  buildDemoIncidentTimelineMediaPipelineReport,
  buildDemoIncidentTimelineOperationsRecord,
  buildDemoMediaPipelineReportOptions,
  buildDemoRealtimeChannelReportOptions,
  buildDemoRealtimeProviderContractMatrixInput,
  opsSurfaceLinks,
} from "./mediaProofs";
import {
  buildDemoObservabilityExportReplay,
  buildDemoOpsRecoveryReport,
  demoVoiceProfileIds,
  opsRecoveryOptions,
  providerSloOptions,
  sttProviderFailureSimulator,
  sttProviderSimulationStatus,
  telephonyWebhookSecurityOptions,
} from "./observabilityExport";
import { traceTimelineStore } from "./profileSwitch";
import {
  createAuditDeliveryWorker,
  createTraceDeliveryWorker,
  deliveryRuntimeControl,
} from "./proofSeeds";
import { readLatestDemoVoiceProofPack } from "./proofSuite";
import {
  configuredModelProviders,
  configuredSTTProviders,
  configuredTTSProviders,
  deliveryTraceStore,
  modelProvider,
  providerOrchestrationProfile,
  providerOrchestrationRequirements,
  selectedSTTProvider,
  type VoiceSTTProvider,
  voiceProviderFeatures,
  voiceProviderModels,
  webhookSigningSecret,
} from "./providers";
import {
  postCallAnalysisOptions,
  readLatestVapiCoverageSummary,
  readLongProofWindowCalibrationSamples,
} from "./readinessReports";
import {
  browserCallProfilesMaxAgeMs,
  liveLatencyReadinessMaxAgeMs,
  proofTrendsMaxAgeMs,
  readLatestBrowserCallProfiles,
  readLatestProofTrends,
  readRealCallProfileDefaultsReport,
  readRealCallProfileHistory,
  realCallProfileRecoveryJobStore,
  refreshRealCallEvidenceRuntimeAfterRecovery,
  runBrowserCallProfileRecoveryProof,
  runPhoneSmokeRecoveryProof,
  sloCalibrationMinRuns,
  sttAdapter,
} from "./realCallEvidence";
import { renderSavedIntakeHtmx } from "./savedIntakeHtmx";
import {
  buildDemoObservabilityArtifactIndex,
  buildDemoVoiceSessionSnapshot,
  demoVoiceCallDebuggerOptions,
  observabilityExportOptions,
  productionReadinessOptions,
  refreshProductionReadinessProof,
} from "./sessionsProofPack";
import {
  deliverySinkDescriptors,
  demoIncidentSessionId,
  handoffDeliveryStore,
  renderVoiceSessionsWithSupportActions,
  runtimeDirectory,
  runtimeStorage,
  voiceSupportArtifactRedaction,
} from "./stores";

export const voiceConfig = createVoiceConfiguration<
  unknown,
  VoiceSessionRecord,
  SavedIntake
>({
  ...channelDefaults("/voice/intake"),
  path: "/voice/intake",
  stt: sttAdapter,
  htmx: renderSavedIntakeHtmx,
  opsStatus: {
    deliverySinks: {
      auditDeliveries: {
        href: "/audit/deliveries",
        store: runtimeStorage.auditDeliveries,
      },
      traceDeliveries: {
        href: "/traces/deliveries",
        store: runtimeStorage.traceDeliveries,
      },
    },
    include: {
      quality: false,
      sessions: false,
    },
    links: opsSurfaceLinks,
    llmProviders: configuredModelProviders,
    preferFixtureWorkflows: true,
    sttProviders: configuredSTTProviders,
    store: deliveryTraceStore,
  },
  opsConsole: {
    deliverySinks: {
      auditDeliveries: {
        href: "/audit/deliveries",
        store: runtimeStorage.auditDeliveries,
      },
      sinks: deliverySinkDescriptors,
      traceDeliveries: {
        href: "/traces/deliveries",
        store: runtimeStorage.traceDeliveries,
      },
    },
    links: opsSurfaceLinks,
    llmProviders: configuredModelProviders,
    store: deliveryTraceStore,
    sttProviders: configuredSTTProviders,
    title: "AbsoluteJS Voice Demo Ops Console",
    ttsProviders: configuredTTSProviders,
  },
  quality: {
    links: opsSurfaceLinks,
    store: deliveryTraceStore,
  },
  eval: {
    baselineStore: createVoiceFileEvalBaselineStore(
      resolve(runtimeDirectory, "eval-baseline.json"),
    ),
    fixtureStore: createVoiceFileScenarioFixtureStore(
      resolve(
        process.cwd(),
        "src",
        "backend",
        "fixtures",
        "voice-scenario-fixtures.json",
      ),
    ),
    links: opsSurfaceLinks,
    operationsRecordHref: "/voice-operations/:sessionId",
    scenarios: workflowScenarios,
    store: deliveryTraceStore,
    title: "AbsoluteJS Voice Demo Evals",
  },
  providerHealth: {
    providers: configuredModelProviders,
    store: deliveryTraceStore,
  },
  providerCapability: {
    features: voiceProviderFeatures,
    htmlPath: "/provider-capabilities",
    llmProviders: configuredModelProviders,
    models: voiceProviderModels,
    selected: {
      llm: modelProvider,
      stt: selectedSTTProvider,
    },
    store: deliveryTraceStore,
    sttProviders: configuredSTTProviders,
  },
  assistantHealth: {
    htmlPath: "/assistant-health",
    providers: configuredModelProviders,
    store: deliveryTraceStore,
  },
  handoffHealth: {
    htmlPath: "/handoffs",
    store: deliveryTraceStore,
  },
  sessionList: {
    htmlPath: "/sessions",
    operationsRecordHref: "/voice-operations/:sessionId",
    replayHref: (session) => "/sessions/" + session.sessionId,
    render: renderVoiceSessionsWithSupportActions,
    store: deliveryTraceStore,
  },
  sessionReplay: {
    htmlPath: "/sessions/:sessionId",
    store: deliveryTraceStore,
  },
  sessionSnapshot: {
    source: buildDemoVoiceSessionSnapshot,
  },
  callDebugger: demoVoiceCallDebuggerOptions(),
  sessionObservability: {
    audit: runtimeStorage.audit,
    callDebuggerHref: "/voice-call-debugger/:sessionId",
    htmlPath: "/voice-observability/:sessionId",
    incidentPath: "/voice-observability/:sessionId/incident.md",
    operationsRecordHref: "/voice-operations/:sessionId",
    redact: voiceSupportArtifactRedaction,
    render: (report) =>
      renderVoiceSessionObservabilityHTML(report, {
        title: "AbsoluteJS Voice Session Observability",
      }),
    store: deliveryTraceStore,
    traceTimelineHref: "/traces/:sessionId",
  },
  operationsRecord: {
    audit: runtimeStorage.audit,
    htmlPath: "/voice-operations/:sessionId",
    mediaPipeline: () => buildDemoIncidentTimelineMediaPipelineReport(),
    redact: voiceSupportArtifactRedaction,
    render: (record) => {
      const failureReplayHref = `/voice-operations/${encodeURIComponent(record.sessionId)}/failure-replay`;
      const failureReplayLink = `<a href="${escapeHtml(failureReplayHref)}">Failure replay</a>`;
      return renderVoiceOperationsRecordHTML(record, {
        incidentHref: `/voice-operations/${encodeURIComponent(record.sessionId)}/incident.md`,
        title: "AbsoluteJS Voice Operations Record",
      }).replace(
        '<a href="#incident-handoff">Incident handoff</a>',
        `<a href="#incident-handoff">Incident handoff</a>${failureReplayLink}`,
      );
    },
    store: deliveryTraceStore,
    title: "AbsoluteJS Voice Operations Record",
  },
  incidentBundle: {
    audit: runtimeStorage.audit,
    markdownPath: "/voice-incidents/:sessionId/markdown",
    redact: voiceSupportArtifactRedaction,
    store: deliveryTraceStore,
    title: "AbsoluteJS Voice Incident Bundle",
  },
  resilience: {
    llmProviders: configuredModelProviders,
    store: deliveryTraceStore,
    sttProviders: configuredSTTProviders,
    sttSimulation: {
      failureMessage:
        "Simulate Deepgram failure to prove the realtime route falls back to AssemblyAI without changing provider credentials.",
      failureProviders: ["deepgram"],
      fallbackRequiredMessage:
        "Add ASSEMBLYAI_API_KEY to enable the real fallback provider.",
      fallbackRequiredProvider: "assemblyai",
      providers: sttProviderSimulationStatus(),
      run: (provider, mode) =>
        sttProviderFailureSimulator.run(provider as VoiceSTTProvider, mode),
    },
    ttsProviders: configuredTTSProviders,
  },
  providerSlo: {
    ...providerSloOptions,
    store: deliveryTraceStore,
    title: "AbsoluteJS Voice Demo Provider SLOs",
  },
  providerOrchestration: {
    name: "absolutejs-voice-example-provider-orchestration",
    profile: providerOrchestrationProfile,
    requirements: providerOrchestrationRequirements,
    title: "AbsoluteJS Voice Demo Provider Orchestration",
  } as unknown as VoiceProviderOrchestrationRoutesOptions,
  providerDecisionTrace: {
    minDegraded: 1,
    minDecisions: 4,
    minFallbacks: 1,
    name: "absolutejs-voice-example-provider-decisions",
    requiredFallbackProviders: ["deterministic"],
    requiredReasonIncludes: ["latency budget"],
    requiredStatuses: ["fallback", "degraded"],
    requiredSurfaces: [
      "background-summary",
      "live-call",
      "live-stt",
      "telephony-tts",
    ],
    store: deliveryTraceStore,
    title: "AbsoluteJS Voice Demo Provider Decision Traces",
  },
  telephonyWebhookSecurity: {
    options: telephonyWebhookSecurityOptions(),
  },
  browserMedia: {
    store: runtimeStorage.traces,
    title: "AbsoluteJS Voice Browser Media Proof",
  },
  telephonyMedia: {
    store: runtimeStorage.traces,
    title: "AbsoluteJS Voice Telephony Media Proof",
  },
  productionReadiness: productionReadinessOptions({
    fast: true,
    includeObservabilityExport: false,
    refresh: false,
  }),
  opsRecovery: {
    ...opsRecoveryOptions(),
    title: "AbsoluteJS Voice Demo Ops Recovery",
  },
  observabilityExport: {
    ...observabilityExportOptions(),
    artifactIndex: buildDemoObservabilityArtifactIndex,
    title: "AbsoluteJS Voice Demo Observability Export",
  },
  proofPack: {
    source: readLatestDemoVoiceProofPack,
  },
  observabilityExportReplay: {
    source: buildDemoObservabilityExportReplay,
    title: "AbsoluteJS Voice Demo Observability Export Replay",
  },
  dataControl: {
    audit: runtimeStorage.audit,
    auditDeliveries: runtimeStorage.auditDeliveries,
    campaigns: runtimeStorage.campaigns,
    events: runtimeStorage.events,
    incidentBundles: runtimeStorage.incidentBundles,
    providerKeys: [
      {
        env: "OPENAI_API_KEY",
        name: "OpenAI",
        recommendation:
          "Use only server-side for LLM and optional Realtime/TTS provider calls.",
        required: false,
      },
      {
        env: "ANTHROPIC_API_KEY",
        name: "Anthropic",
        recommendation: "Use only server-side for the LLM fallback provider.",
        required: false,
      },
      {
        env: "GEMINI_API_KEY",
        name: "Gemini",
        recommendation: "Use only server-side for the LLM fallback provider.",
        required: false,
      },
      {
        env: "DEEPGRAM_API_KEY",
        name: "Deepgram",
        recommendation:
          "Required for the primary realtime STT provider in this demo.",
        required: true,
      },
      {
        env: "ASSEMBLYAI_API_KEY",
        name: "AssemblyAI",
        recommendation:
          "Use only server-side for the realtime STT fallback provider.",
        required: false,
      },
      {
        env: "ELEVENLABS_API_KEY",
        name: "ElevenLabs",
        recommendation: "Use only server-side for optional TTS provider calls.",
        required: false,
      },
      {
        env: "TWILIO_AUTH_TOKEN",
        name: "Twilio",
        recommendation:
          "Keep telephony credentials server-side and route call control through AbsoluteJS.",
        required: false,
      },
      {
        env: "TELNYX_API_KEY",
        name: "Telnyx",
        recommendation:
          "Keep carrier API keys server-side and pair webhook logs with audit retention.",
        required: false,
      },
      {
        env: "PLIVO_AUTH_TOKEN",
        name: "Plivo",
        recommendation:
          "Keep carrier auth tokens server-side and redact them from support exports.",
        required: false,
      },
    ],
    redact: voiceComplianceRedactionDefaults,
    reviews: runtimeStorage.reviews as unknown as VoiceCallReviewStore,
    session: runtimeStorage.session,
    tasks: runtimeStorage.tasks as unknown as VoiceOpsTaskStore,
    traceDeliveries: runtimeStorage.traceDeliveries,
    traces: runtimeStorage.traces,
  },
  auditDelivery: {
    store: runtimeStorage.auditDeliveries,
    title: "AbsoluteJS Voice Demo Audit Deliveries",
    worker: createAuditDeliveryWorker(),
  },
  traceDelivery: {
    store: runtimeStorage.traceDeliveries,
    title: "AbsoluteJS Voice Demo Trace Deliveries",
    worker: createTraceDeliveryWorker(),
  },
  deliverySink: {
    auditDeliveries: {
      href: "/audit/deliveries",
      store: runtimeStorage.auditDeliveries,
    },
    sinks: deliverySinkDescriptors,
    title: "AbsoluteJS Voice Demo Delivery Sinks",
    traceDeliveries: {
      href: "/traces/deliveries",
      store: runtimeStorage.traceDeliveries,
    },
  },
  deliveryRuntime: {
    runtime: deliveryRuntimeControl,
    title: "AbsoluteJS Voice Demo Delivery Runtime",
  },
  operationalStatus: {
    deliveryRuntime: deliveryRuntimeControl,
    links: {
      deliveryRuntime: "/delivery-runtime",
      productionReadiness: "/production-readiness",
      proofPack: "/voice/proof-pack",
    },
    productionReadiness: () =>
      buildVoiceProductionReadinessReport(
        productionReadinessOptions({
          fast: true,
          includeObservabilityExport: false,
          refresh: false,
        }),
      ),
    proofPack: () => readLatestDemoVoiceProofPack.getStatus(),
    title: "AbsoluteJS Voice Demo Operational Status",
  },
  incidentTimeline: {
    actionHandlers: {
      "delivery.retry": async ({ actionId }) => {
        const result = await deliveryRuntimeControl.tick();

        return {
          actionId,
          detail: JSON.stringify(result),
          ok: true,
          status: "completed",
        };
      },
      "proof.rerun": async ({ actionId }) => {
        await refreshProductionReadinessProof();

        return {
          actionId,
          href: "/voice/proof-pack",
          ok: true,
          status: "refreshed",
        };
      },
      "readiness.refresh": async ({ actionId }) => {
        await buildVoiceProductionReadinessReport(
          productionReadinessOptions({
            fast: true,
            includeObservabilityExport: false,
            refresh: true,
          }),
        );

        return {
          actionId,
          href: "/production-readiness",
          ok: true,
          status: "refreshed",
        };
      },
      "support.bundle": async ({ action, actionId }) => {
        await buildDemoVoiceSessionSnapshot({
          sessionId: action.sessionId ?? demoIncidentSessionId,
        });

        return {
          actionId,
          href: action.href,
          ok: true,
          status: "generated",
        };
      },
    },
    audit: runtimeStorage.audit,
    extraEvents: async () =>
      buildVoiceMediaPipelineIncidentEvents(
        await buildDemoIncidentTimelineMediaPipelineReport(),
        { source: "demo-media-pipeline" },
      ),
    failureReplays: async () => [
      await buildDemoIncidentTimelineFailureReplay(),
    ],
    links: {
      callDebugger: (sessionId) =>
        `/voice-call-debugger/${encodeURIComponent(sessionId)}`,
      deliveryRuntime: "/delivery-runtime",
      failureReplay: (sessionId) =>
        `/voice-operations/${encodeURIComponent(sessionId)}/failure-replay`,
      operationalStatus: "/voice/operational-status",
      operationsRecords: (sessionId) =>
        `/voice-operations/${encodeURIComponent(sessionId)}`,
      productionReadiness: "/production-readiness",
      proofPack: "/voice/proof-pack",
      supportBundle: (sessionId) =>
        `/voice-incidents/${encodeURIComponent(sessionId)}/markdown`,
    },
    operationalStatus: () =>
      buildVoiceOperationalStatusReport({
        deliveryRuntime: deliveryRuntimeControl,
        links: {
          deliveryRuntime: "/delivery-runtime",
          productionReadiness: "/production-readiness",
          proofPack: "/voice/proof-pack",
        },
        productionReadiness: () =>
          buildVoiceProductionReadinessReport(
            productionReadinessOptions({
              fast: true,
              includeObservabilityExport: false,
              refresh: false,
            }),
          ),
        proofPack: () => readLatestDemoVoiceProofPack.getStatus(),
      }),
    operationsRecords: async () => [
      await buildDemoIncidentTimelineOperationsRecord(),
    ],
    opsRecovery: buildDemoOpsRecoveryReport,
    title: "AbsoluteJS Voice Demo Incident Timeline",
    trace: deliveryTraceStore,
  },
  opsActionAudit: {
    audit: runtimeStorage.audit,
    trace: deliveryTraceStore,
  },
  diagnostics: {
    store: deliveryTraceStore,
    title: "AbsoluteJS Voice Demo Diagnostics",
  },
  traceTimeline: {
    operationsRecordHref: "/voice-operations/:sessionId",
    store: traceTimelineStore,
  },
  toolContract: {
    contracts: demoToolContracts,
    htmlPath: "/tool-contracts",
    operationsRecordHref: "/voice-operations/:sessionId",
    title: "AbsoluteJS Voice Demo Tool Contracts",
  },
  simulationSuite: {
    actionLinks: {
      fixtures: "/evals/fixtures",
      outcomes: "/outcome-contracts",
      scenarios: "/evals/scenarios",
      sessions: "/quality",
      tools: "/tool-contracts",
    },
    htmlPath: "/voice/simulations",
    operationsRecordHref: "/voice-operations/:sessionId",
    store: deliveryTraceStore,
    thresholds: {
      maxProviderAverageLatencyMs: 5_000,
    },
    scenarios: workflowScenarios,
    fixtureStore: createVoiceFileScenarioFixtureStore(
      resolve(
        process.cwd(),
        "src",
        "backend",
        "fixtures",
        "voice-scenario-fixtures.json",
      ),
    ),
    tools: demoToolContracts,
    outcomes: {
      contracts: demoOutcomeContracts,
      events: runtimeStorage.events,
      handoffs: handoffDeliveryStore as unknown as VoiceHandoffDeliveryStore,
      reviews: runtimeStorage.reviews,
      sessions: runtimeStorage.session,
      tasks: runtimeStorage.tasks,
    },
    title: "AbsoluteJS Voice Demo Simulation Suite",
  },
  liveLatency: {
    htmlPath: "/live-latency",
    store: deliveryTraceStore,
    title: "AbsoluteJS Voice Demo Live Latency",
  },
  turnLatency: {
    htmlPath: "/turn-latency",
    store: runtimeStorage.session,
    title: "AbsoluteJS Voice Demo Turn Latency",
    traceStore: runtimeStorage.traces,
  },
  turnQuality: {
    htmlPath: "/turn-quality",
    store: runtimeStorage.session,
    title: "AbsoluteJS Voice Demo Turn Quality",
  },
  outcomeContract: {
    contracts: demoOutcomeContracts,
    events: runtimeStorage.events,
    handoffs: handoffDeliveryStore as unknown as VoiceHandoffDeliveryStore,
    htmlPath: "/outcome-contracts",
    operationsRecordHref: "/voice-operations/:sessionId",
    reviews: runtimeStorage.reviews,
    sessions: runtimeStorage.session,
    tasks: runtimeStorage.tasks,
    title: "AbsoluteJS Voice Demo Outcome Contracts",
  },
  campaign: {
    htmlPath: "/voice/campaigns",
    operationsRecordHref: "/voice-operations/:sessionId",
    store: campaignStore,
    title: "AbsoluteJS Voice Demo Campaigns",
  },
  opsWebhookReceiver: {
    onEnvelope: ({ envelope }) => {
      receivedWebhookEnvelopes.unshift(envelope);
      receivedWebhookEnvelopes.splice(12);
    },
    signingSecret: webhookSigningSecret,
  },
  profileSwitchPolicyProof: {
    allowedProfileIds: [...demoVoiceProfileIds],
    audit: runtimeStorage.audit,
    defaults: () => readRealCallProfileDefaultsReport(),
    metadata: {
      source: "absolutejs-voice-example",
    },
    observed: {
      currentProfileId: "meeting-recorder",
      fallbackUsed: true,
      providerP95Ms: 950,
      turnWarnings: 3,
    },
    title: "Voice Profile Switch Policy Proof",
  },
  profileSwitchLiveDecision: {
    audit: runtimeStorage.audit,
    limit: 50,
    title: "Voice Profile Switch Live Decisions",
    trace: deliveryTraceStore,
  },
  profileSwitchReadiness: {
    audit: runtimeStorage.audit,
    autoMode: true,
    limit: 50,
    maxAutoAppliedRatio: 1,
    policyProof: {
      allowedProfileIds: [...demoVoiceProfileIds],
      audit: runtimeStorage.audit,
      defaults: () => readRealCallProfileDefaultsReport(),
      metadata: {
        source: "absolutejs-voice-example",
      },
      observed: {
        currentProfileId: "meeting-recorder",
        fallbackUsed: true,
        providerP95Ms: 950,
        turnWarnings: 3,
      },
    },
    title: "Voice Profile Switch Readiness",
    trace: deliveryTraceStore,
  },
  proofTrend: {
    maxAgeMs: proofTrendsMaxAgeMs,
    name: "absolutejs-voice-example-proof-trends",
    source: readLatestProofTrends,
  },
  proofTrendRecommendation: {
    maxAgeMs: proofTrendsMaxAgeMs,
    name: "absolutejs-voice-example-proof-trend-recommendations",
    source: readLatestProofTrends,
    title: "AbsoluteJS Voice Provider Runtime Recommendations",
  },
  realCallProfileHistory: {
    maxAgeMs: proofTrendsMaxAgeMs,
    name: "absolutejs-voice-example-real-call-profile-history",
    source: readRealCallProfileHistory,
    title: "AbsoluteJS Voice Real-Call Profile History",
  },
  realCallProfileRecoveryAction: {
    asyncActionIds: ["collect-browser-proof", "collect-phone-proof"],
    handlers: {
      "collect-browser-proof": ({ profileId }) =>
        runBrowserCallProfileRecoveryProof({ profileId }),
      "collect-phone-proof": ({ profileId }) =>
        runPhoneSmokeRecoveryProof({ profileId }),
      "collect-provider-role-evidence": async () => {
        const runtimeReport =
          await refreshRealCallEvidenceRuntimeAfterRecovery();
        const report = runtimeReport.history;
        const actionableProfiles = report.defaults.summary.actionableProfiles;
        const passing = actionableProfiles >= 2;

        return {
          ok: passing,
          report,
          status: passing ? "pass" : "fail",
          message: `${actionableProfiles}/${report.defaults.summary.profileCount} real-call profiles have actionable provider defaults.`,
        };
      },
      refresh: async () => {
        await readRealCallProfileDefaultsReport();
        await refreshProductionReadinessProof();

        return {
          message:
            "Real-call profile history and production readiness proof refreshed.",
        };
      },
    },
    jobStore: realCallProfileRecoveryJobStore,
    maxAgeMs: proofTrendsMaxAgeMs,
    minActionableProfiles: 2,
    minCycles: 10,
    name: "absolutejs-voice-example-real-call-profile-recovery-actions",
    requiredProfileIds: ["meeting-recorder", "support-agent"],
    requiredProviderRoles: ["llm", "stt", "tts"],
    source: readRealCallProfileHistory,
  },
  browserCallProfile: {
    maxAgeMs: browserCallProfilesMaxAgeMs,
    name: "absolutejs-voice-example-browser-call-profiles",
    source: readLatestBrowserCallProfiles,
    title: "AbsoluteJS Voice Browser Call Profiles",
  },
  sloCalibration: {
    minPassingRuns: sloCalibrationMinRuns,
    name: "absolutejs-voice-example-slo-calibration",
    source: readLongProofWindowCalibrationSamples,
  },
  sloReadinessThreshold: {
    liveLatencyMaxAgeMs: liveLatencyReadinessMaxAgeMs,
    minPassingRuns: sloCalibrationMinRuns,
    name: "absolutejs-voice-example-slo-readiness-thresholds",
    source: readLongProofWindowCalibrationSamples,
    title: "AbsoluteJS Voice Calibration -> Active Readiness Gate",
  },
  postCallAnalysis: {
    name: "absolutejs-voice-example-post-call-analysis",
    source: ({ reviewId, sessionId }) =>
      postCallAnalysisOptions({ reviewId, sessionId }),
  },
  guardrail: {
    name: "absolutejs-voice-example-guardrails",
    source: buildDemoGuardrailReport,
  },
  platformCoverage: {
    name: "absolutejs-voice-example-vapi-coverage",
    source: readLatestVapiCoverageSummary,
  },
  mediaPipeline: {
    name: "absolutejs-voice-example-media-pipeline",
    source: buildDemoMediaPipelineReportOptions,
    title: "AbsoluteJS Voice Media Pipeline Proof",
  },
  realtimeChannel: {
    name: "absolutejs-voice-example-realtime-channel",
    provider: "openai-realtime",
    source: buildDemoRealtimeChannelReportOptions,
    title: "AbsoluteJS Voice Realtime Channel Proof",
  },
  realtimeProviderContract: {
    matrix: buildDemoRealtimeProviderContractMatrixInput,
    name: "absolutejs-voice-example-realtime-provider-contracts",
    title: "AbsoluteJS Voice Realtime Provider Contracts",
  },
  competitiveCoverage: {
    name: "absolutejs-voice-example-competitive-coverage",
    source: buildDemoCompetitiveCoverageReport,
    title: "AbsoluteJS Voice Competitive Coverage",
  },
});
