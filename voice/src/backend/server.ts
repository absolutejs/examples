import { networking, prepare } from "@absolutejs/absolute";
import {
  createVoiceFileEvalBaselineStore,
  createVoiceFileScenarioFixtureStore,
  buildVoiceMediaPipelineIncidentEvents,
  buildVoiceOperationalStatusReport,
  buildVoiceProductionReadinessReport,
  buildVoiceReadinessRecoveryActions,
  createVoicePhoneAgent,
  renderVoiceHandoffHealthHTML,
  renderVoiceProviderContractMatrixHTML,
  renderVoiceOperationsRecordHTML,
  renderVoiceSessionObservabilityHTML,
  getVoiceCampaignDialerProofStatus,
  runVoiceCampaignDialerProof,
  runVoiceCampaignProof,
  summarizeVoiceHandoffDeliveries,
  summarizeVoiceHandoffHealth,
  summarizeVoiceSessions,
  type VoiceCallReviewStore,
  type VoiceHandoffDeliveryStore,
  type VoiceOpsTaskStore,
  type VoiceProviderOrchestrationRoutesOptions,
  type VoiceSessionRecord,
  voice,
  voiceComplianceRedactionDefaults,
} from "@absolutejs/voice";
import { assemblyai } from "@absolutejs/voice-assemblyai";
import { deepgram } from "@absolutejs/voice-deepgram";
import { gemini } from "@absolutejs/voice-gemini";
import { openai } from "@absolutejs/voice-openai";
import { Elysia } from "elysia";
import { resolve } from "node:path";
import {
  filterVoiceOpsTasks,
  renderVoiceOpsPage,
  summarizeVoiceOpsTasks,
} from "./opsPage";
import { renderVoiceIntegrationEventsPage } from "./integrationsPage";
import { renderVoiceAssistantPage } from "./assistantPage";
import { pagesPlugin } from "./plugins/pagesPlugin";
import {
  filterVoiceReviews,
  findVoiceReview,
  renderVoiceReviewComparePage,
  renderVoiceReviewIndexPage,
  renderVoiceReviewPage,
} from "./reviewPage";
import { buildSavedIntake, VOICE_DEMO_PHRASE_HINTS } from "./voiceFlow";
import { isVoiceModelProvider, type SavedIntake } from "../shared/demo";
import {
  agentSquadStatusRoutes,
  assignTask,
  assistant,
  assistantConfig,
  browserCallProfilesMaxAgeMs,
  buildDemoBargeInReport,
  buildDemoCompetitiveCoverageReport,
  buildDemoGuardrailReport,
  buildDemoIncidentTimelineFailureReplay,
  buildDemoIncidentTimelineMediaPipelineReport,
  buildDemoIncidentTimelineOperationsRecord,
  buildDemoMediaPipelineReportOptions,
  buildDemoObservabilityArtifactIndex,
  buildDemoObservabilityExportReplay,
  buildDemoOpsRecoveryReport,
  buildDemoProviderContractMatrix,
  buildDemoRealtimeChannelReportOptions,
  buildDemoRealtimeProviderContractMatrixInput,
  buildDemoReconnectContractReport,
  buildDemoVoiceSessionSnapshot,
  campaignStore,
  configuredModelProviders,
  configuredSTTProviders,
  configuredTTSProviders,
  contractAwareOnTurn,
  correctDemoTurn,
  createAuditDeliveryWorker,
  createDemoProfileSwitchGuard,
  createTelephonyBridgeConfig,
  createTraceDeliveryWorker,
  deliveryRuntimeControl,
  deliverySinkDescriptors,
  deliveryTraceStore,
  demoIncidentSessionId,
  demoOutcomeContracts,
  demoToolContracts,
  demoVoiceCallDebuggerOptions,
  demoVoiceProfileIds,
  escapeHtml,
  failureReplayRoutes,
  formatCallDisposition,
  getLatestRoutingDecision,
  getProfileSwitchRecommendation,
  getTask,
  handoffAdapters,
  handoffDeliveryStore,
  latestProofTrendsMarkdownPath,
  listAssistantMemory,
  listIntakes,
  listIntegrationEvents,
  listReviews,
  listTasks,
  listTelephonyOutcomePreviews,
  liveLatencyReadinessMaxAgeMs,
  liveOpsControlRoutes,
  liveOpsRuntime,
  localCarrierWebhookVerification,
  modelProvider,
  normalizeReviewFilters,
  normalizeTaskFilters,
  observabilityExportOptions,
  openAIRealtime,
  opsRecoveryOptions,
  opsSurfaceLinks,
  persistIntake,
  plivoAuthToken,
  postCallAnalysisOptions,
  productionOnlyEnv,
  productionReadinessOptions,
  proofTrendsMaxAgeMs,
  providerFailureSimulator,
  providerOrchestrationProfile,
  providerOrchestrationRequirements,
  providerSloOptions,
  publicBaseUrl,
  readLatestBrowserCallProfiles,
  readLatestDemoVoiceProofPack,
  readLatestProofTrends,
  readLatestVapiCoverageSummary,
  readLongProofWindowCalibrationSamples,
  readRealCallProfileDefaultsReport,
  readRealCallProfileHistory,
  readReconnectProfileEvidenceSummary,
  realCallEvidenceRuntimeRoutes,
  realCallEvidenceRuntimeWorkerLoop,
  realCallProfileRecoveryJobStore,
  realtimeChannelFormat,
  receivedWebhookEnvelopes,
  recordTelephonyWebhookDecision,
  redirectToTasks,
  refreshProductionReadinessProof,
  refreshRealCallEvidenceRuntimeAfterRecovery,
  rememberSessionRoutingMode,
  renderAgentSquadContractHTML,
  renderCampaignDialerProofHTML,
  renderDemoBargeInHTML,
  renderDemoChecklistHTML,
  renderDemoProofHTML,
  renderDemoReconnectContractHTML,
  renderDeployGateHTML,
  renderGuardrailsHTML,
  renderPostCallAnalysisHTML,
  renderPromptAnswers,
  renderProofTrendsHTML,
  renderProviderRecoveryHTML,
  renderReadinessProfilesHTML,
  renderRealCallProfileRecoveryHTML,
  renderReconnectProfileEvidenceCardHTML,
  renderTelephonyOutcomePreviewHTML,
  renderTelephonyWebhookDecisionsHTML,
  renderVapiMigrationHTML,
  renderVoiceSessionsWithSupportActions,
  resolveCarrierOrigin,
  resolvePhoneAgentStreamUrl,
  resolveTelephonyWebhookVerificationUrl,
  retryVoiceHandoffDeliveries,
  runBrowserCallProfileRecoveryProof,
  runDemoAgentSquadContract,
  runDemoProofSuite,
  runDemoProviderRoutingContract,
  runDemoSTTProviderRoutingContract,
  runDemoTTSProviderRoutingContract,
  runPhoneSmokeRecoveryProof,
  runProfileSwitchGuard,
  runTelephonyWebhookVerificationProof,
  runtimeDirectory,
  runtimeStorage,
  seedDemoProviderDecisionProof,
  seedDemoProviderSloProof,
  seedDemoRealtimeChannelProof,
  seedTurnLatencyProof,
  selectedSTTProvider,
  sloCalibrationMinRuns,
  storeLiveTurnLatencyTrace,
  storeReconnectTrace,
  sttAdapter,
  sttProviderFailureSimulator,
  sttProviderSimulationStatus,
  summarizeAssistantRuns,
  summarizeProviderHealth,
  telephonyOutcomePolicy,
  telephonyOutcomeRecorder,
  telephonyWebhookIdempotencyStore,
  telephonyWebhookSecurityOptions,
  telephonyWebhookSigningSecret,
  telnyxPublicKey,
  toNumber,
  toStringValue,
  traceTimelineStore,
  updateTaskStatus,
  voiceProviderFeatures,
  voiceProviderModels,
  voiceSupportArtifactRedaction,
  webhookSigningSecret,
  webhookUrl,
  workflowScenarios,
} from "./serverSetup";
import type { VoiceSTTProvider } from "./serverSetup";

const { absolutejs, manifest } = await prepare();

const server = new Elysia()
  .use(absolutejs)
  .use(pagesPlugin(manifest))
  .use(
    voice<unknown, VoiceSessionRecord, SavedIntake>({
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
        path: "/ops-console",
        store: deliveryTraceStore,
        sttProviders: configuredSTTProviders,
        title: "AbsoluteJS Voice Demo Ops Console",
        ttsProviders: configuredTTSProviders,
      },
      quality: {
        links: opsSurfaceLinks,
        path: "/quality",
        store: deliveryTraceStore,
      },
      eval: {
        baselineStore: createVoiceFileEvalBaselineStore(
          resolve(runtimeDirectory, "eval-baseline.json"),
        ),
        fixtureStore: createVoiceFileScenarioFixtureStore(
          resolve(import.meta.dir, "fixtures", "voice-scenario-fixtures.json"),
        ),
        links: opsSurfaceLinks,
        operationsRecordHref: "/voice-operations/:sessionId",
        path: "/evals",
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
        path: "/api/voice-handoffs",
        store: deliveryTraceStore,
      },
      sessionList: {
        htmlPath: "/sessions",
        operationsRecordHref: "/voice-operations/:sessionId",
        path: "/api/voice-sessions",
        replayHref: (session) => "/sessions/" + session.sessionId,
        render: renderVoiceSessionsWithSupportActions,
        store: deliveryTraceStore,
      },
      sessionReplay: {
        htmlPath: "/sessions/:sessionId",
        path: "/api/voice-sessions/:sessionId/replay",
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
        path: "/api/voice/session-observability/:sessionId",
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
        path: "/api/voice-operations/:sessionId",
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
        path: "/api/voice-incidents/:sessionId",
        redact: voiceSupportArtifactRedaction,
        store: deliveryTraceStore,
        title: "AbsoluteJS Voice Incident Bundle",
      },
      resilience: {
        llmProviders: configuredModelProviders,
        path: "/resilience",
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
        path: "/data-control",
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
            recommendation:
              "Use only server-side for the LLM fallback provider.",
            required: false,
          },
          {
            env: "GEMINI_API_KEY",
            name: "Gemini",
            recommendation:
              "Use only server-side for the LLM fallback provider.",
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
            recommendation:
              "Use only server-side for optional TTS provider calls.",
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
        path: "/diagnostics",
        store: deliveryTraceStore,
        title: "AbsoluteJS Voice Demo Diagnostics",
      },
      traceTimeline: {
        htmlPath: "/traces",
        operationsRecordHref: "/voice-operations/:sessionId",
        path: "/api/voice-traces",
        store: traceTimelineStore,
      },
      toolContract: {
        contracts: demoToolContracts,
        htmlPath: "/tool-contracts",
        operationsRecordHref: "/voice-operations/:sessionId",
        path: "/api/tool-contracts",
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
        path: "/api/voice/simulations",
        store: deliveryTraceStore,
        thresholds: {
          maxProviderAverageLatencyMs: 5_000,
        },
        scenarios: workflowScenarios,
        fixtureStore: createVoiceFileScenarioFixtureStore(
          resolve(import.meta.dir, "fixtures", "voice-scenario-fixtures.json"),
        ),
        tools: demoToolContracts,
        outcomes: {
          contracts: demoOutcomeContracts,
          events: runtimeStorage.events,
          handoffs:
            handoffDeliveryStore as unknown as VoiceHandoffDeliveryStore,
          reviews: runtimeStorage.reviews,
          sessions: runtimeStorage.session,
          tasks: runtimeStorage.tasks,
        },
        title: "AbsoluteJS Voice Demo Simulation Suite",
      },
      liveLatency: {
        htmlPath: "/live-latency",
        path: "/api/live-latency",
        store: deliveryTraceStore,
        title: "AbsoluteJS Voice Demo Live Latency",
      },
      turnLatency: {
        htmlPath: "/turn-latency",
        path: "/api/turn-latency",
        store: runtimeStorage.session,
        title: "AbsoluteJS Voice Demo Turn Latency",
        traceStore: runtimeStorage.traces,
      },
      turnQuality: {
        htmlPath: "/turn-quality",
        path: "/api/turn-quality",
        store: runtimeStorage.session,
        title: "AbsoluteJS Voice Demo Turn Quality",
      },
      outcomeContract: {
        contracts: demoOutcomeContracts,
        events: runtimeStorage.events,
        handoffs: handoffDeliveryStore as unknown as VoiceHandoffDeliveryStore,
        htmlPath: "/outcome-contracts",
        operationsRecordHref: "/voice-operations/:sessionId",
        path: "/api/outcome-contracts",
        reviews: runtimeStorage.reviews,
        sessions: runtimeStorage.session,
        tasks: runtimeStorage.tasks,
        title: "AbsoluteJS Voice Demo Outcome Contracts",
      },
      campaign: {
        htmlPath: "/voice/campaigns",
        operationsRecordHref: "/voice-operations/:sessionId",
        path: "/api/voice/campaigns",
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
        path: "/api/voice/proof-trends",
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
            const actionableProfiles =
              report.defaults.summary.actionableProfiles;
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
        path: "/api/voice/real-call-profile-history",
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
        path: "/api/voice/post-call-analysis",
        source: ({ reviewId, sessionId }) =>
          postCallAnalysisOptions({ reviewId, sessionId }),
      },
      guardrail: {
        name: "absolutejs-voice-example-guardrails",
        path: "/api/voice/guardrails",
        source: buildDemoGuardrailReport,
      },
      platformCoverage: {
        name: "absolutejs-voice-example-vapi-coverage",
        path: "/api/voice/vapi-coverage",
        source: readLatestVapiCoverageSummary,
      },
      mediaPipeline: {
        htmlPath: "/voice/media-pipeline",
        markdownPath: "/voice/media-pipeline.md",
        name: "absolutejs-voice-example-media-pipeline",
        path: "/api/voice/media-pipeline-calibration",
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
      htmx: ({ result }) => {
        if (!result) {
          return `<p class="empty-copy">No saved captures yet.</p>`;
        }

        return `<article class="saved-item">
  <div class="saved-item-header">
    <strong>${escapeHtml(result.title)}</strong>
    <span>${new Date(result.completedAt).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    })}</span>
  </div>
  <p>${escapeHtml(result.transcript)}</p>
  <div class="saved-item-meta">
    <span class="pill">${escapeHtml(result.scenarioId === "guided" ? "Guided test" : "General recording")}</span>
    <span class="pill">${result.turnCount} turn${result.turnCount === 1 ? "" : "s"}</span>
    ${result.callDisposition ? `<span class="pill">${escapeHtml(formatCallDisposition(result.callDisposition) ?? result.callDisposition)}</span>` : ""}
    ${result.callTarget ? `<span class="pill">${escapeHtml(result.callTarget)}</span>` : ""}
    ${result.detectedName ? `<span class="pill">${escapeHtml(result.detectedName)}</span>` : ""}
  </div>
  <div class="saved-answer-list">
    ${renderPromptAnswers(result.promptAnswers)}
  </div>
  <div class="voice-assistant-label">Full transcript</div>
  <p>${escapeHtml(result.transcript)}</p>
  <p class="saved-summary">${escapeHtml(result.assistantSummary)}</p>
</article>`;
      },
      onComplete: async ({ session }) => {
        const result = session.turns
          .toReversed()
          .find((turn) => turn.result !== undefined)?.result as
          | SavedIntake
          | undefined;
        const savedIntake = result ?? buildSavedIntake(session);
        persistIntake(savedIntake);
      },
      handoff:
        handoffAdapters.length > 0
          ? {
              adapters: handoffAdapters,
              deliveryQueue: handoffDeliveryStore,
            }
          : undefined,
      ops: assistant.ops,
      correctTurn: correctDemoTurn,
      phraseHints: async (input) => {
        await rememberSessionRoutingMode(input);
        return VOICE_DEMO_PHRASE_HINTS;
      },
      profileSwitchGuard: createDemoProfileSwitchGuard("/voice/intake"),
      onTurn: contractAwareOnTurn,
      path: "/voice/intake",
      preset: "reliability",
      session: runtimeStorage.session,
      stt: sttAdapter,
      liveOps: liveOpsRuntime,
    }),
  )
  .use(
    openAIRealtime
      ? voice<unknown, VoiceSessionRecord, SavedIntake>({
          correctTurn: correctDemoTurn,
          handoff:
            handoffAdapters.length > 0
              ? {
                  adapters: handoffAdapters,
                  deliveryQueue: handoffDeliveryStore,
                }
              : undefined,
          onComplete: async ({ session }) => {
            const result = session.turns
              .toReversed()
              .find((turn) => turn.result !== undefined)?.result as
              | SavedIntake
              | undefined;
            const savedIntake = result ?? buildSavedIntake(session);
            persistIntake(savedIntake);
          },
          onTurn: contractAwareOnTurn,
          ops: assistant.ops,
          path: "/voice/realtime",
          phraseHints: async (input) => {
            await rememberSessionRoutingMode(input);
            return VOICE_DEMO_PHRASE_HINTS;
          },
          profileSwitchGuard: createDemoProfileSwitchGuard("/voice/realtime"),
          preset: "reliability",
          realtime: openAIRealtime,
          realtimeInputFormat: realtimeChannelFormat,
          session: runtimeStorage.session,
          trace: deliveryTraceStore,
          liveOps: liveOpsRuntime,
        })
      : new Elysia(),
  )
  .get("/api/provider-contracts", () => buildDemoProviderContractMatrix())
  .get(
    "/provider-contracts",
    () =>
      new Response(
        renderVoiceProviderContractMatrixHTML(
          buildDemoProviderContractMatrix(),
          {
            title: "AbsoluteJS Voice Provider Contracts",
          },
        ),
        {
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        },
      ),
  )
  .use(failureReplayRoutes)
  .post("/api/provider-slo/proof", async () =>
    Response.json(await seedDemoProviderSloProof()),
  )
  .post("/api/provider-decisions/proof", async () =>
    Response.json(await seedDemoProviderDecisionProof()),
  )
  .get("/api/voice/reconnect-contract", async () =>
    Response.json(await buildDemoReconnectContractReport()),
  )
  .get("/api/voice/reconnect-profile-evidence", async () =>
    Response.json(await readReconnectProfileEvidenceSummary()),
  )
  .get(
    "/voice/reconnect-profile-evidence-card",
    async () =>
      new Response(await renderReconnectProfileEvidenceCardHTML(), {
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      }),
  )
  .get(
    "/voice/reconnect-contract",
    async () =>
      new Response(
        await renderDemoReconnectContractHTML(
          await buildDemoReconnectContractReport(),
        ),
        {
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        },
      ),
  )
  .get("/api/production-readiness/recovery-actions", async ({ query }) => {
    try {
      let report;
      try {
        report = await buildVoiceProductionReadinessReport(
          productionReadinessOptions({
            fast: true,
            includeObservabilityExport: false,
            refresh: false,
          }),
        );
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("ENOENT")) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
        report = await buildVoiceProductionReadinessReport(
          productionReadinessOptions({
            fast: true,
            includeObservabilityExport: false,
            refresh: false,
          }),
        );
      }

      const checks =
        query.demoFailure === "real-call"
          ? [
              ...report.checks,
              {
                actions: [
                  {
                    description:
                      "Demo-only synthetic issue: run browser profile proof as the recovery job.",
                    href: "/api/voice/real-call-profile-history/collect-browser-proof",
                    label: "Run browser profile proof",
                    method: "POST" as const,
                  },
                  {
                    description:
                      "Demo-only synthetic issue: run phone smoke proof as the recovery job.",
                    href: "/api/voice/real-call-profile-history/collect-phone-proof",
                    label: "Run phone smoke proof",
                    method: "POST" as const,
                  },
                  {
                    description:
                      "Open the persisted recovery job history surface.",
                    href: "/voice/real-call-profile-recovery",
                    label: "Open recovery jobs",
                  },
                ],
                detail:
                  "Demo-only synthetic warning for showing the readiness recovery loop while production readiness is green.",
                href: "/voice/real-call-profile-recovery",
                label: "Demo real-call recovery loop",
                status: "warn" as const,
                value: "synthetic",
              },
            ]
          : report.checks;

      return Response.json(buildVoiceReadinessRecoveryActions(checks));
    } catch (error) {
      return Response.json(
        {
          actions: [],
          error: error instanceof Error ? error.message : String(error),
          generatedAt: new Date().toISOString(),
          sourceChecks: 0,
        },
        { status: 500 },
      );
    }
  })
  .get("/api/voice/proof-pack/refresh-status", () =>
    Response.json(readLatestDemoVoiceProofPack.getStatus()),
  )
  .get("/data-control/audit-proof.md", async () => {
    const events = await runtimeStorage.audit.list({ limit: 25 });
    const rows = events
      .map((event) => {
        const resource = event.resource
          ? `${event.resource.type}:${event.resource.id}`
          : "n/a";
        return `| ${new Date(event.at).toISOString()} | ${event.type} | ${event.outcome} | ${resource} |`;
      })
      .join("\n");

    return new Response(
      `# Voice Data Control Audit Proof

Redacted sample of the latest ${events.length} audit event(s). Payloads are intentionally omitted from this proof surface; use the full audit export only when you need the complete customer-owned record.

| At | Type | Outcome | Resource |
| --- | --- | --- | --- |
${rows || "| n/a | n/a | n/a | n/a |"}
`,
      {
        headers: {
          "content-type": "text/markdown; charset=utf-8",
        },
      },
    );
  })
  .get("/api/voice-barge-in", async () =>
    Response.json(await buildDemoBargeInReport()),
  )
  .post("/api/voice-barge-in", async ({ body }) => {
    const input =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const at = toNumber(input.at);
    const id = toStringValue(input.id);
    const reason = toStringValue(input.reason);
    const status = toStringValue(input.status);

    if (!at || !id || !reason || !status) {
      return Response.json(
        { error: "Invalid barge-in event." },
        { status: 400 },
      );
    }

    await deliveryTraceStore.append({
      at,
      metadata: {
        source: "browser",
      },
      payload: input,
      sessionId: toStringValue(input.sessionId) ?? "unknown",
      type: "client.barge_in",
    });

    return Response.json({ ok: true });
  })
  .get(
    "/barge-in",
    async () =>
      new Response(await renderDemoBargeInHTML(), {
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      }),
  )
  .get("/api/agent-squad-contract", () => runDemoAgentSquadContract())
  .use(agentSquadStatusRoutes as unknown as Elysia)
  .get("/api/provider-routing-contract", () => runDemoProviderRoutingContract())
  .get("/api/stt-provider-routing-contract", () =>
    runDemoSTTProviderRoutingContract(),
  )
  .get("/api/tts-provider-routing-contract", () =>
    runDemoTTSProviderRoutingContract(),
  )
  .get("/agent-squad-contract", async ({ set }) => {
    set.headers["content-type"] = "text/html; charset=utf-8";
    return renderAgentSquadContractHTML();
  })
  .post("/api/turn-latency/proof", () => seedTurnLatencyProof())
  .post("/api/live-turn-latency", ({ body }) => storeLiveTurnLatencyTrace(body))
  .post("/api/voice/reconnect-traces", ({ body }) => storeReconnectTrace(body))
  .use(liveOpsControlRoutes)
  .post("/api/demo-proof", ({ request }) => runDemoProofSuite(request))
  .get(
    "/demo-proof",
    () =>
      new Response(renderDemoProofHTML(), {
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      }),
  )
  .use(
    createVoicePhoneAgent<unknown, VoiceSessionRecord, SavedIntake>({
      matrix: {
        path: "/api/carriers",
        title: "AbsoluteJS Voice Demo Carrier Matrix",
      },
      setup: {
        path: "/api/voice/phone/setup",
        title: "AbsoluteJS Voice Demo Phone Agent",
      },
      productionSmoke: {
        htmlPath: "/voice/phone/smoke-contract",
        path: "/api/voice/phone/smoke-contract",
        store: runtimeStorage.traces,
        title: "AbsoluteJS Voice Demo Phone Call-Control Smoke",
      },
      carriers: [
        {
          provider: "telnyx",
          options: {
            bridge: createTelephonyBridgeConfig(),
            context: {},
            outcomePolicy: telephonyOutcomePolicy,
            setup: {
              path: "/api/telnyx/setup",
              requiredEnv: productionOnlyEnv({
                TELNYX_PUBLIC_KEY: telnyxPublicKey,
                VOICE_DEMO_PUBLIC_BASE_URL: publicBaseUrl,
              }),
              title: "AbsoluteJS Voice Demo Telnyx Setup",
            },
            smoke: {
              path: "/api/telnyx/smoke",
              title: "AbsoluteJS Voice Demo Telnyx Smoke Test",
            },
            streamPath: "/api/telnyx/stream",
            texml: {
              path: "/api/telnyx/voice",
              response: {
                codec: "PCMU",
                streamName: "absolutejs-voice-demo",
                track: "inbound_track",
              },
              streamUrl: resolvePhoneAgentStreamUrl,
            },
            webhook: {
              idempotency: {
                store: telephonyWebhookIdempotencyStore,
              },
              onDecision: async (input) => {
                await recordTelephonyWebhookDecision("telnyx", input);
              },
              path: "/api/telnyx/webhook",
              publicKey: telnyxPublicKey,
              verify: localCarrierWebhookVerification,
            },
          },
        },
        {
          provider: "plivo",
          options: {
            bridge: createTelephonyBridgeConfig(),
            context: {},
            outcomePolicy: telephonyOutcomePolicy,
            setup: {
              path: "/api/plivo/setup",
              requiredEnv: productionOnlyEnv({
                PLIVO_AUTH_TOKEN: plivoAuthToken,
                VOICE_DEMO_PUBLIC_BASE_URL: publicBaseUrl,
              }),
              title: "AbsoluteJS Voice Demo Plivo Setup",
            },
            smoke: {
              path: "/api/plivo/smoke",
              title: "AbsoluteJS Voice Demo Plivo Smoke Test",
            },
            streamPath: "/api/plivo/stream",
            answer: {
              path: "/api/plivo/voice",
              response: {
                audioTrack: "inbound",
                bidirectional: true,
                contentType: "audio/x-mulaw;rate=8000",
                keepCallAlive: true,
              },
              streamUrl: resolvePhoneAgentStreamUrl,
            },
            webhook: {
              authToken: plivoAuthToken,
              idempotency: {
                store: telephonyWebhookIdempotencyStore,
              },
              onDecision: async (input) => {
                await recordTelephonyWebhookDecision("plivo", input);
              },
              path: "/api/plivo/webhook",
              verificationUrl: publicBaseUrl
                ? `${publicBaseUrl.replace(/\/$/, "")}/api/plivo/webhook`
                : undefined,
              verify: localCarrierWebhookVerification,
            },
          },
        },
        {
          provider: "twilio",
          options: {
            ...createTelephonyBridgeConfig(),
            ops: assistant.ops,
            outcomePolicy: telephonyOutcomePolicy,
            setup: {
              path: "/api/twilio/setup",
              requiredEnv: productionOnlyEnv({
                VOICE_DEMO_PUBLIC_BASE_URL: publicBaseUrl,
                VOICE_DEMO_TELEPHONY_WEBHOOK_SECRET:
                  telephonyWebhookSigningSecret,
              }),
              title: "AbsoluteJS Voice Demo Twilio Setup",
            },
            smoke: {
              path: "/api/twilio/smoke",
              title: "AbsoluteJS Voice Demo Twilio Smoke Test",
            },
            streamPath: "/api/twilio/stream",
            twiml: {
              parameters: ({ query }) => ({
                scenarioId:
                  typeof query.scenarioId === "string"
                    ? query.scenarioId
                    : "guided",
                sessionId:
                  typeof query.sessionId === "string"
                    ? query.sessionId
                    : undefined,
              }),
              path: "/api/twilio/voice",
              streamName: "absolutejs-voice-demo",
              streamUrl: resolvePhoneAgentStreamUrl,
            },
            webhook: {
              idempotency: {
                store: telephonyWebhookIdempotencyStore,
              },
              onDecision: async (input) => {
                await recordTelephonyWebhookDecision("twilio", input);
              },
              path: "/api/telephony-webhook",
              signingSecret: telephonyWebhookSigningSecret,
              verificationUrl: resolveTelephonyWebhookVerificationUrl(
                "/api/telephony-webhook",
              ),
              verify: localCarrierWebhookVerification,
            },
          },
        },
      ],
    }).routes,
  )
  .post("/api/voice/campaigns/proof", () =>
    runVoiceCampaignProof({ store: campaignStore }),
  )
  .get("/api/voice/campaigns/dialer-proof", () =>
    getVoiceCampaignDialerProofStatus({
      runPath: "/api/voice/campaigns/dialer-proof",
    }),
  )
  .post("/api/voice/campaigns/dialer-proof", ({ request }) =>
    runVoiceCampaignDialerProof({
      baseUrl: resolveCarrierOrigin(request),
      store: campaignStore,
    }),
  )
  .get(
    "/voice/campaigns/dialer-proof",
    () =>
      new Response(renderCampaignDialerProofHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  )
  .get("/api/intakes", () => listIntakes())
  .get("/api/routing/latest", async () => await getLatestRoutingDecision())
  .get(
    "/api/voice/profile-switch-recommendation",
    async () => await getProfileSwitchRecommendation(),
  )
  .post(
    "/api/voice/profile-switch-guard",
    async ({ query }) => await runProfileSwitchGuard(query),
  )
  .get("/api/assistant-config", () => assistantConfig)
  .get("/api/assistant-summary", async () => summarizeAssistantRuns())
  .get("/api/telephony-outcomes", () => ({
    generatedAt: Date.now(),
    policy: telephonyOutcomePolicy,
    previews: listTelephonyOutcomePreviews(),
  }))
  .get("/api/telephony-webhook-decisions", () => {
    const decisions = telephonyOutcomeRecorder.list();
    return {
      decisions,
      generatedAt: Date.now(),
      total: decisions.length,
    };
  })
  .get(
    "/api/telephony-webhook/verification-proof",
    async () => await runTelephonyWebhookVerificationProof(),
  )
  .get("/phone-agent", ({ redirect }) =>
    redirect("/api/voice/phone/setup?format=html"),
  )
  .get("/carriers", ({ redirect }) => redirect("/api/carriers?format=html"))
  .get(
    "/telephony-outcomes",
    () =>
      new Response(renderTelephonyOutcomePreviewHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  )
  .get(
    "/telephony-webhook-decisions",
    () =>
      new Response(renderTelephonyWebhookDecisionsHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  )
  .get(
    "/demo-checklist",
    () =>
      new Response(renderDemoChecklistHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  )
  .get(
    "/voice/real-call-profile-recovery",
    () =>
      new Response(renderRealCallProfileRecoveryHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  )
  .use(realCallEvidenceRuntimeRoutes)
  .get("/api/voice/real-call-evidence-runtime/worker", () =>
    realCallEvidenceRuntimeWorkerLoop.health(),
  )
  .get(
    "/voice/proof-trends",
    async () =>
      new Response(await renderProofTrendsHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  )
  .get("/voice/proof-trends.md", async () => {
    const file = Bun.file(latestProofTrendsMarkdownPath);
    if (await file.exists()) {
      return new Response(await file.text(), {
        headers: { "content-type": "text/markdown; charset=utf-8" },
      });
    }

    return new Response(
      "# AbsoluteJS Voice Sustained Proof Trends\n\nNo sustained trend artifact found. Run `bun run proof:trends`.\n",
      {
        headers: { "content-type": "text/markdown; charset=utf-8" },
      },
    );
  })
  .get(
    "/voice/post-call-analysis",
    async () =>
      new Response(await renderPostCallAnalysisHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  )
  .get(
    "/voice/guardrails",
    async () =>
      new Response(await renderGuardrailsHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  )
  .post("/api/voice/realtime-channel/proof", async () =>
    seedDemoRealtimeChannelProof(),
  )
  .get(
    "/switching-from-vapi",
    async () =>
      new Response(await renderVapiMigrationHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  )
  .get(
    "/provider-recovery",
    async () =>
      new Response(await renderProviderRecoveryHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  )
  .get(
    "/deploy-gate",
    async () =>
      new Response(await renderDeployGateHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  )
  .get(
    "/readiness-profiles",
    () =>
      new Response(renderReadinessProfilesHTML(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      }),
  )
  .post("/api/voice-handoffs/retry", async () => retryVoiceHandoffDeliveries())
  .post("/api/provider-simulate/failure", async ({ query }) => {
    const provider =
      typeof query.provider === "string" && isVoiceModelProvider(query.provider)
        ? query.provider
        : undefined;

    if (!provider || provider === "deterministic") {
      return {
        error:
          "Set ?provider=openai, ?provider=anthropic, or ?provider=gemini.",
      };
    }
    if (!configuredModelProviders.includes(provider)) {
      return {
        error: `${provider} is not configured in this environment.`,
      };
    }

    return providerFailureSimulator.run(provider, "failure");
  })
  .post("/api/provider-simulate/recovery", async ({ query }) => {
    const provider =
      typeof query.provider === "string" && isVoiceModelProvider(query.provider)
        ? query.provider
        : undefined;

    if (!provider || provider === "deterministic") {
      return {
        error:
          "Set ?provider=openai, ?provider=anthropic, or ?provider=gemini.",
      };
    }
    if (!configuredModelProviders.includes(provider)) {
      return {
        error: `${provider} is not configured in this environment.`,
      };
    }

    return providerFailureSimulator.run(provider, "recovery");
  })
  .get("/api/assistant-memory", async () => listAssistantMemory())
  .get("/api/reviews", async ({ query }) => {
    const reviews = await listReviews();
    return filterVoiceReviews(reviews, normalizeReviewFilters(query));
  })
  .get(
    "/api/reviews/latest",
    async () =>
      (await listReviews())[0] ?? { error: "No review artifact found" },
  )
  .get("/api/reviews/:reviewId", async ({ params }) => {
    const review = await runtimeStorage.reviews.get(params.reviewId);
    return review ?? { error: "Review not found" };
  })
  .get("/api/tasks", async ({ query }) =>
    filterVoiceOpsTasks(await listTasks(), normalizeTaskFilters(query)),
  )
  .get("/api/tasks/summary", async () =>
    summarizeVoiceOpsTasks(await listTasks()),
  )
  .get(
    "/api/tasks/:taskId",
    async ({ params }) =>
      (await getTask(params.taskId)) ?? { error: "Task not found" },
  )
  .get("/api/integrations/events", async () => await listIntegrationEvents())
  .get(
    "/reviews",
    async ({ query }) =>
      new Response(
        renderVoiceReviewIndexPage(
          await listReviews(),
          normalizeReviewFilters(query),
        ),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        },
      ),
  )
  .get(
    "/reviews/latest",
    async () =>
      new Response(renderVoiceReviewPage((await listReviews())[0] ?? null), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      }),
  )
  .get(
    "/tasks",
    async ({ query }) =>
      new Response(
        renderVoiceOpsPage(await listTasks(), normalizeTaskFilters(query)),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        },
      ),
  )
  .get(
    "/integrations",
    async () =>
      new Response(
        renderVoiceIntegrationEventsPage(await listIntegrationEvents(), {
          receivedWebhookCount: receivedWebhookEnvelopes.length,
          receiverPath: "/api/voice-ops/webhook",
          signingEnabled: Boolean(webhookSigningSecret),
          webhookUrl,
        }),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        },
      ),
  )
  .get("/handoffs", async () => {
    const handoffDeliveries = await Promise.resolve(
      handoffDeliveryStore.list(),
    );
    const [handoffHealth, handoffQueue] = await Promise.all([
      summarizeVoiceHandoffHealth({ store: deliveryTraceStore }),
      Promise.resolve(summarizeVoiceHandoffDeliveries(handoffDeliveries)),
    ]);

    return new Response(
      `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AbsoluteJS Voice Handoffs</title>
  <style>
    :root { color-scheme: dark; }
    body { background: #0b0d10; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; }
    main { max-width: 1080px; margin: 0 auto; display: grid; gap: 16px; }
    section, article { background: #13161b; border: 1px solid #232833; border-radius: 18px; padding: 20px; }
    .voice-handoff-health-grid, .voice-handoff-health-columns { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    .voice-handoff-health-grid article, .voice-handoff-health-columns article, .voice-handoff-health-events article { background: #0f1217; border: 1px solid #232833; border-radius: 16px; padding: 16px; }
    .voice-handoff-health-events { display: grid; gap: 14px; }
    .voice-handoff-health-events article.failed { border-color: rgba(239, 68, 68, 0.7); }
    .voice-handoff-health-events article.delivered { border-color: rgba(34, 197, 94, 0.5); }
    .voice-handoff-health-event-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .handoff-queue-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
    .handoff-queue-grid article { background: #0f1217; }
    .handoff-metric { font-size: 2rem; font-weight: 800; margin: 0; }
    .handoff-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
    button { background: #f59e0b; border: 0; border-radius: 999px; color: #111827; cursor: pointer; font-weight: 800; padding: 10px 16px; }
    button:disabled { cursor: wait; opacity: 0.55; }
    #handoff-retry-result { color: #d4d4d8; }
    span, small { color: #a1a1aa; }
    a { color: #f59e0b; }
  </style>
  <script>
    async function retryHandoffs(button) {
      button.disabled = true;
      const result = document.getElementById("handoff-retry-result");
      result.textContent = "Retrying queued handoffs...";
      try {
        const response = await fetch("/api/voice-handoffs/retry", { method: "POST" });
        const payload = await response.json();
        if (payload.error) {
          result.textContent = payload.error;
          button.disabled = false;
          return;
        }
        result.textContent = "Retried " + payload.attempted + " queued handoff(s). Reloading...";
        window.location.reload();
      } catch (error) {
        result.textContent = error instanceof Error ? error.message : String(error);
        button.disabled = false;
      }
    }
  </script>
</head>
<body>
  <main>
    <section>
      <h1>Voice handoffs</h1>
      <p>Trace-backed transfer and escalation delivery health with replay links and a durable retry queue.</p>
      <p><a href="/assistant">Assistant control plane</a> · <a href="/resilience">Resilience</a> · <a href="/sessions">Sessions</a> · <a href="/tasks">Tasks</a> · <a href="/integrations">Integrations</a></p>
    </section>
    <section>
      <h2>Delivery queue</h2>
      <div class="handoff-queue-grid">
        <article><span>Total</span><p class="handoff-metric">${handoffQueue.total}</p></article>
        <article><span>Pending</span><p class="handoff-metric">${handoffQueue.pending}</p></article>
        <article><span>Retry eligible</span><p class="handoff-metric">${handoffQueue.retryEligible}</p></article>
        <article><span>Failed</span><p class="handoff-metric">${handoffQueue.failed}</p></article>
        <article><span>Delivered</span><p class="handoff-metric">${handoffQueue.delivered}</p></article>
      </div>
      <div class="handoff-actions">
        <button type="button" onclick="retryHandoffs(this)">Retry queued handoffs</button>
        <span id="handoff-retry-result">${handoffAdapters.length > 0 ? "Ready to drain pending and failed deliveries." : "Set VOICE_DEMO_HANDOFF_WEBHOOK_URL to enable delivery retries."}</span>
      </div>
      <p><small>Queue file: ${escapeHtml(resolve(runtimeDirectory, "handoff-deliveries.json"))}</small></p>
    </section>
    <section>
      ${renderVoiceHandoffHealthHTML(handoffHealth)}
    </section>
  </main>
</body>
</html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      },
    );
  })
  .get(
    "/sessions",
    async () =>
      new Response(
        `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AbsoluteJS Voice Sessions</title>
  <style>
    :root { color-scheme: dark; }
    body { background: #0b0d10; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; }
    main { max-width: 1080px; margin: 0 auto; display: grid; gap: 16px; }
    section, article { background: #13161b; border: 1px solid #232833; border-radius: 18px; padding: 20px; }
    .voice-sessions-list { display: grid; gap: 14px; }
    .voice-session-card { background: #0f1217; border: 1px solid #232833; border-radius: 16px; padding: 16px; }
    .voice-session-card.failed { border-color: rgba(239, 68, 68, 0.7); }
    .voice-session-card.healthy { border-color: rgba(34, 197, 94, 0.5); }
    .voice-session-card-header { align-items: center; display: flex; gap: 8px; justify-content: space-between; margin-bottom: 12px; }
    .voice-session-support-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 0; }
    dl { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); margin: 0; }
    dl div { background: #13161b; border: 1px solid #232833; border-radius: 12px; padding: 10px; }
    dt { color: #a1a1aa; }
    dd { margin: 4px 0 0; font-weight: 700; }
    a { color: #f59e0b; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>Voice sessions</h1>
      <p>Searchable trace-backed sessions with direct replay links.</p>
      <p><a href="/assistant">Assistant control plane</a> · <a href="/resilience">Resilience</a> · <a href="/reviews">Reviews</a> · <a href="/tasks">Tasks</a> · <a href="/handoffs">Handoffs</a></p>
    </section>
    <section>
      ${renderVoiceSessionsWithSupportActions(await summarizeVoiceSessions({ store: deliveryTraceStore }))}
    </section>
  </main>
</body>
</html>`,
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        },
      ),
  )
  .get(
    "/assistant",
    async () =>
      new Response(
        renderVoiceAssistantPage(
          await summarizeAssistantRuns(),
          await listAssistantMemory(),
          assistantConfig,
          await summarizeProviderHealth(),
        ),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        },
      ),
  )
  .get("/tasks/:taskId/assign", async ({ params, query }) => {
    const owner =
      typeof query.owner === "string" && query.owner.trim()
        ? query.owner.trim()
        : "ops-demo";
    await assignTask(params.taskId, owner);
    return redirectToTasks();
  })
  .get("/tasks/:taskId/start", async ({ params }) => {
    const task = await getTask(params.taskId);
    if (task) {
      await updateTaskStatus(params.taskId, {
        actor: task.assignee ?? "ops-demo",
        detail: "Work started",
        status: "in-progress",
      });
    }
    return redirectToTasks();
  })
  .get("/tasks/:taskId/complete", async ({ params }) => {
    const task = await getTask(params.taskId);
    if (task) {
      await updateTaskStatus(params.taskId, {
        actor: task.assignee ?? "ops-demo",
        detail: "Marked done",
        status: "done",
      });
    }
    return redirectToTasks();
  })
  .get("/tasks/:taskId/reopen", async ({ params }) => {
    const task = await getTask(params.taskId);
    if (task) {
      await updateTaskStatus(params.taskId, {
        actor: task.assignee ?? "ops-demo",
        detail: "Task reopened",
        status: "open",
      });
    }
    return redirectToTasks();
  })
  .get("/reviews/compare", async ({ query }) => {
    const reviews = await listReviews();
    const leftId =
      typeof query.left === "string" && query.left.trim()
        ? query.left
        : undefined;
    const rightId =
      typeof query.right === "string" && query.right.trim()
        ? query.right
        : reviews[0]?.id;
    const left = leftId
      ? findVoiceReview(reviews, leftId)
      : (reviews[0] ?? null);
    const right = rightId
      ? findVoiceReview(reviews, rightId)
      : (reviews[1] ?? null);

    return new Response(renderVoiceReviewComparePage(left, right), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  })
  .get(
    "/reviews/:reviewId",
    async ({ params }) =>
      new Response(
        renderVoiceReviewPage(
          findVoiceReview(await listReviews(), params.reviewId),
        ),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        },
      ),
  )
  .use(networking as unknown as Elysia)
  .on("error", (error) => {
    const { request } = error;
    console.error(
      `Voice example error on ${request.method} ${request.url}: ${error.message}`,
    );
  });

export type Server = typeof server;
export default server;
