export {};

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  evaluateVoiceAgentSquadContractEvidence,
  evaluateVoiceCampaignDialerProofEvidence,
  evaluateVoiceCampaignReadinessEvidence,
  evaluateVoiceBrowserCallProfileEvidence,
  evaluateVoiceCompetitiveCoverage,
  evaluateVoiceDataControlEvidence,
  evaluateVoiceOperationsRecordGuardrails,
  evaluateVoiceOperationsRecordProviderRecovery,
  evaluateVoiceObservabilityExportDeliveryEvidence,
  evaluateVoiceObservabilityExportReplayEvidence,
  evaluateVoiceOutcomeContractEvidence,
  evaluateVoicePlatformCoverage,
  evaluateVoicePhoneCallControlEvidence,
  evaluateVoicePhoneAssistantEvidence,
  evaluateVoiceProductionReadinessEvidence,
  evaluateVoiceProofTrendEvidence,
  buildVoiceProofTrendRecommendationReport,
  evaluateVoiceProviderContractMatrixEvidence,
  evaluateVoiceProviderRoutingContractEvidence,
  evaluateVoiceRealtimeChannelEvidence,
  evaluateVoiceRealtimeProviderContractEvidence,
  evaluateVoiceProviderSloEvidence,
  evaluateVoiceProviderStackEvidence,
  evaluateVoiceSimulationSuiteEvidence,
  evaluateVoiceTelephonyWebhookNormalizationEvidence,
  evaluateVoiceToolContractEvidence,
  evaluateVoiceMediaPipelineEvidence,
  summarizeVoiceMediaPipelineReport,
  writeVoiceMediaPipelineArtifacts,
  evaluateVoiceLiveOpsControlEvidence,
  evaluateVoiceLiveOpsEvidence,
  createVoiceEvidenceAssertion,
  runVoiceCommandProofTargets,
  runVoiceProofTargets,
  buildVoiceFailureReplay,
  buildVoicePlatformCoverageSummary,
  type VoiceCompetitiveCoverageReport,
  type VoiceAgentSquadContractReport,
  type VoiceCampaignDialerProofReport,
  type VoiceCampaignReadinessProofReport,
  type VoiceBrowserCallProfileReport,
  type VoiceDataControlReport,
  type VoiceFailureReplayReport,
  type VoiceObservabilityExportDeliveryHistory,
  type VoiceObservabilityExportReplayReport,
  type VoiceOperationsRecord,
  type VoiceOpsActionHistoryReport,
  type VoiceOpsRecoveryReport,
  type VoiceOpsStatusReport,
  type VoiceLiveOpsActionResult,
  type VoiceLiveOpsControlState,
  type VoiceMediaPipelineReport,
  type VoiceOutcomeContractSuiteReport,
  type VoicePhoneAgentSetupReport,
  type VoicePhoneAgentProductionSmokeReport,
  type VoiceProviderContractMatrixReport,
  type VoiceProviderDecisionTraceReport,
  type VoiceProviderOrchestrationReport,
  type VoiceProviderRoutingContractReport,
  type VoiceRealtimeChannelReport,
  type VoiceRealtimeProviderContractMatrixReport,
  type VoiceProviderStackCapabilityGapReport,
  type VoiceProductionReadinessReport,
  type VoiceProofTrendReport,
  type VoiceProofTrendRecommendationReport,
  type VoiceRealCallEvidenceRuntimeReport,
  type VoiceProviderSloReport,
  type VoiceSimulationSuiteReport,
  type VoiceTelephonyWebhookNormalizationEvidenceDecision,
  type VoiceTelephonyWebhookVerificationEvidenceAttempt,
  type VoiceToolContractSuiteReport,
  type VoiceProofAssertionResult as JsonAssertionResult,
  type VoiceCommandProofTarget as CommandProofTarget,
  type VoiceCommandProofTargetResult as CommandProofResult,
  type VoiceProofTarget as ProofTarget,
  type VoiceProofTargetMethod as ProofMethod,
  type VoiceProofTargetResult as ProofResult,
} from "@absolutejs/voice";

const baseUrl = (
  process.env.VOICE_DEMO_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3004"}`
).replace(/\/$/, "");
const timeoutMs = Number(process.env.VOICE_PROOF_PACK_TIMEOUT_MS ?? 30_000);
const concurrency = Math.max(
  1,
  Number(process.env.VOICE_PROOF_PACK_CONCURRENCY ?? 2),
);
const outputRoot =
  process.env.VOICE_PROOF_PACK_OUTPUT_DIR ?? ".voice-runtime/proof-pack";

const runId = new Date().toISOString().replaceAll(":", "-");
const outputDir = join(outputRoot, runId);
const webhookProofIds = {
  plivoTransfer: `proof-plivo-transfer-${runId}`,
  telnyxVoicemail: `proof-telnyx-voicemail-${runId}`,
  telnyxVoicemailControl: `proof-telnyx-voicemail-control-${runId}`,
  telnyxVoicemailSession: `proof-telnyx-voicemail-session-${runId}`,
  twilioComplete: `proof-twilio-complete-${runId}`,
  twilioNoAnswer: `proof-twilio-no-answer-${runId}`,
};

const seedTargets: ProofTarget[] = [
  {
    allowLogicalFail: true,
    kind: "json",
    method: "POST",
    name: "demoProof",
    path: "/api/demo-proof",
  },
  {
    kind: "json",
    method: "POST",
    name: "turnLatencyProof",
    path: "/api/turn-latency/proof",
  },
  {
    kind: "json",
    method: "POST",
    name: "campaignRuntimeProof",
    path: "/api/voice/campaigns/proof",
  },
  {
    kind: "json",
    method: "POST",
    name: "campaignDialerProof",
    path: "/api/voice/campaigns/dialer-proof",
  },
  {
    kind: "json",
    method: "POST",
    name: "providerSloProof",
    path: "/api/provider-slo/proof",
  },
  {
    kind: "json",
    method: "POST",
    name: "providerDecisionProof",
    path: "/api/provider-decisions/proof",
  },
  {
    kind: "json",
    method: "POST",
    name: "realtimeChannelProof",
    path: "/api/voice/realtime-channel/proof",
  },
  {
    kind: "json",
    method: "POST",
    name: "realCallEvidenceRuntimeCollect",
    path: "/api/voice/real-call-evidence-runtime/collect",
  },
  {
    body: {
      at: Date.now(),
      continuity: {
        checkedAt: Date.now(),
        inboundAudioStreams: 1,
        issues: [],
        maxObservedGapMs: 1000,
        outboundAudioStreams: 1,
        stalledInboundStreams: 0,
        stalledOutboundStreams: 0,
        status: "pass",
        streams: [
          {
            currentPackets: 999,
            direction: "inbound",
            id: "demo-browser-inbound-audio",
            packetDelta: 40,
            previousPackets: 959,
            timeDeltaMs: 1000,
          },
          {
            currentPackets: 1000,
            direction: "outbound",
            id: "demo-browser-outbound-audio",
            packetDelta: 45,
            previousPackets: 955,
            timeDeltaMs: 1000,
          },
        ],
        totalStats: 4,
      },
      report: {
        activeCandidatePairs: 1,
        bytesReceived: 240000,
        bytesSent: 210000,
        checkedAt: Date.now(),
        endedAudioTracks: 0,
        inboundPackets: 999,
        issues: [],
        jitterMs: 8,
        liveAudioTracks: 1,
        outboundPackets: 1000,
        packetLossRatio: 0.001,
        packetsLost: 1,
        roundTripTimeMs: 80,
        status: "pass",
        totalStats: 4,
      },
      scenarioId: "proof-browser-media",
      sessionId: "proof-browser-media",
    },
    kind: "json",
    method: "POST",
    name: "browserMediaProof",
    path: "/api/voice/browser-media",
  },
  {
    kind: "json",
    method: "POST",
    name: "observabilityExportDeliverySeed",
    path: "/api/voice/observability-export/deliveries",
  },
  {
    body: {
      CallSid: webhookProofIds.twilioNoAnswer,
      CallStatus: "busy",
      SipResponseCode: "486",
    },
    kind: "json",
    method: "POST",
    name: "telephonyWebhookTwilioNoAnswerSeed",
    path: "/api/telephony-webhook",
  },
  {
    body: {
      CallSid: webhookProofIds.twilioNoAnswer,
      CallStatus: "busy",
      SipResponseCode: "486",
    },
    kind: "json",
    method: "POST",
    name: "telephonyWebhookTwilioNoAnswerRetrySeed",
    path: "/api/telephony-webhook",
  },
  {
    body: {
      CallDuration: "7",
      CallSid: webhookProofIds.twilioComplete,
      CallStatus: "completed",
    },
    kind: "json",
    method: "POST",
    name: "telephonyWebhookTwilioCompleteSeed",
    path: "/api/telephony-webhook",
  },
  {
    body: {
      data: {
        id: webhookProofIds.telnyxVoicemail,
        payload: {
          answered_by: "machine_start",
          call_control_id: webhookProofIds.telnyxVoicemailControl,
          call_session_id: webhookProofIds.telnyxVoicemailSession,
          status: "completed",
        },
      },
    },
    kind: "json",
    method: "POST",
    name: "telephonyWebhookTelnyxVoicemailSeed",
    path: "/api/telnyx/webhook",
  },
  {
    body: {
      data: {
        id: webhookProofIds.telnyxVoicemail,
        payload: {
          answered_by: "machine_start",
          call_control_id: webhookProofIds.telnyxVoicemailControl,
          call_session_id: webhookProofIds.telnyxVoicemailSession,
          status: "completed",
        },
      },
    },
    kind: "json",
    method: "POST",
    name: "telephonyWebhookTelnyxVoicemailRetrySeed",
    path: "/api/telnyx/webhook",
  },
  {
    body: {
      CallUUID: webhookProofIds.plivoTransfer,
      SessionId: `proof-plivo-transfer-session-${runId}`,
      queue: "billing",
      status: "bridged",
    },
    kind: "json",
    method: "POST",
    name: "telephonyWebhookPlivoTransferSeed",
    path: "/api/plivo/webhook",
  },
  {
    body: {
      action: "operator-takeover",
      assignee: "proof-operator",
      detail: "Proof-pack live operator takeover.",
      sessionId: "demo-incident-bundle",
      tag: "proof-pack",
    },
    kind: "json",
    method: "POST",
    name: "liveOpsOperatorTakeoverSeed",
    path: "/api/voice/live-ops/action",
  },
  {
    body: {
      action: "pause-assistant",
      assignee: "proof-operator",
      detail: "Proof-pack pauses the assistant for human review.",
      sessionId: "demo-incident-bundle",
      tag: "proof-pack",
    },
    kind: "json",
    method: "POST",
    name: "liveOpsPauseAssistantSeed",
    path: "/api/voice/live-ops/action",
  },
  {
    body: {
      action: "resume-assistant",
      assignee: "proof-operator",
      detail: "Proof-pack resumes the assistant after human review.",
      sessionId: "demo-incident-bundle",
      tag: "proof-pack",
    },
    kind: "json",
    method: "POST",
    name: "liveOpsResumeAssistantSeed",
    path: "/api/voice/live-ops/action",
  },
  {
    body: {
      action: "force-handoff",
      assignee: "proof-operator",
      detail: "Proof-pack forces a handoff to the billing queue.",
      sessionId: "demo-incident-bundle",
      tag: "billing",
    },
    kind: "json",
    method: "POST",
    name: "liveOpsForceHandoffSeed",
    path: "/api/voice/live-ops/action",
  },
  {
    body: {
      actionId: "proof-pack.live-ops-evidence",
      body: {
        surface: "Live operator controls",
      },
      ok: true,
      ranAt: Date.now(),
      status: 200,
    },
    kind: "json",
    method: "POST",
    name: "opsActionAuditSeed",
    path: "/api/voice/ops-actions/audit",
  },
];

const proofTargets: ProofTarget[] = [
  {
    kind: "json",
    name: "productionReadiness",
    path: "/api/production-readiness",
  },
  {
    kind: "json",
    name: "opsRecovery",
    path: "/api/voice/ops-recovery",
  },
  {
    kind: "json",
    name: "operationsRecord",
    path: "/api/voice-operations/demo-incident-bundle",
  },
  {
    allowLogicalFail: true,
    kind: "json",
    name: "failureReplay",
    path: "/api/voice-operations/demo-incident-bundle/failure-replay",
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "failureReplayPage",
    path: "/voice-operations/demo-incident-bundle/failure-replay",
    requiredText: [
      "Failure replay",
      "What failed, recovered, and reached the user",
      "Provider Path",
      "Media Path",
      "What The User Heard",
    ],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "failureReplayMarkdown",
    path: "/voice-operations/demo-incident-bundle/failure-replay.md",
    requiredText: [
      "Voice Failure Replay: demo-incident-bundle",
      "## What Failed Or Recovered",
      "## Provider Path",
      "## Media Path",
      "## What The User Heard",
      "degraded to deterministic",
    ],
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "operationsRecordPage",
    path: "/voice-operations/demo-incident-bundle",
    requiredText: [
      "Provider Decisions",
      "live-call",
      "assistant.guardrail",
      "assistant-output",
      "tool-input",
      "operations-record-guardrail-seed",
      "Failure replay",
    ],
  },
  {
    kind: "json",
    name: "sessionObservability",
    path: "/api/voice/session-observability/demo-incident-bundle",
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "sessionObservabilityPage",
    path: "/voice-observability/demo-incident-bundle",
    requiredText: [
      "Session Observability",
      "Turn Waterfalls",
      "Open operations record",
      "Download incident Markdown",
      "Open trace timeline",
    ],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "sessionObservabilityIncidentMarkdown",
    path: "/voice-observability/demo-incident-bundle/incident.md",
    requiredText: [
      "Voice session observability",
      "demo-incident-bundle",
      "Provider recovery",
      "Turn Waterfalls",
    ],
  },
  {
    kind: "json",
    name: "postCallAnalysis",
    path: "/api/voice/post-call-analysis",
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "postCallAnalysisPage",
    path: "/voice/post-call-analysis",
    requiredText: [
      "Post-call analysis proof",
      "Extracted fields",
      "Operations record",
    ],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "postCallAnalysisMarkdown",
    path: "/api/voice/post-call-analysis.md",
    requiredText: ["Voice Post-Call Analysis", "Status: pass"],
  },
  {
    allowLogicalFail: true,
    kind: "json",
    name: "guardrails",
    path: "/api/voice/guardrails",
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "guardrailsPage",
    path: "/voice/guardrails",
    requiredText: [
      "Guardrails proof",
      "Live runtime guardrail proof",
      "Blocking, warning, redaction",
      "assistant.guardrail",
    ],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "guardrailsMarkdown",
    path: "/api/voice/guardrails.md",
    requiredText: ["Voice Guardrail Report", "Status: fail"],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "incidentMarkdown",
    path: "/voice-operations/demo-incident-bundle/incident.md",
    requiredText: [
      "Voice incident handoff",
      "demo-incident-bundle",
      "Guardrail evidence",
      "assistant.guardrail assistant-output",
      "assistant.guardrail tool-input",
      "operations-record-guardrail-seed",
      "Provider decisions",
      "Provider recovery: status=degraded",
      "fallbacks=1",
      "degraded=1",
      "surface=live-call",
      "reason=live-call selected the configured model provider for the billing support turn.",
      "status=fallback",
      "status=degraded",
    ],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "incidentBundleMarkdown",
    path: "/voice-incidents/demo-incident-bundle/markdown",
    requiredText: [
      "Voice Incident Bundle",
      "Guardrail evidence",
      "assistant.guardrail assistant-output",
      "assistant.guardrail tool-input",
      "operations-record-guardrail-seed",
    ],
  },
  {
    kind: "json",
    name: "simulationSuite",
    path: "/api/voice/simulations",
  },
  {
    kind: "json",
    name: "toolContracts",
    path: "/api/tool-contracts",
  },
  {
    kind: "json",
    name: "outcomeContracts",
    path: "/api/outcome-contracts",
  },
  {
    kind: "json",
    name: "providerContracts",
    path: "/api/provider-contracts",
  },
  {
    kind: "json",
    name: "providerRoutingContract",
    path: "/api/provider-routing-contract",
  },
  {
    kind: "json",
    name: "sttProviderRoutingContract",
    path: "/api/stt-provider-routing-contract",
  },
  {
    kind: "json",
    name: "ttsProviderRoutingContract",
    path: "/api/tts-provider-routing-contract",
  },
  {
    kind: "json",
    name: "providerSlo",
    path: "/api/voice/provider-slos",
  },
  {
    kind: "json",
    name: "routingStatus",
    path: "/api/routing/latest",
  },
  {
    kind: "json",
    name: "providerOrchestration",
    path: "/api/voice/provider-orchestration",
  },
  {
    kind: "json",
    name: "providerDecisions",
    path: "/api/voice/provider-decisions",
  },
  {
    kind: "json",
    name: "realtimeChannel",
    path: "/api/voice/realtime-channel",
  },
  {
    kind: "json",
    name: "mediaPipelineCalibration",
    path: "/api/voice/media-pipeline-calibration",
  },
  {
    kind: "json",
    name: "browserMedia",
    path: "/api/voice/browser-media",
  },
  {
    kind: "json",
    name: "telephonyMedia",
    path: "/api/voice/telephony/media",
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "browserMediaPage",
    path: "/voice/browser-media",
    requiredText: [
      "AbsoluteJS Voice Browser Media Proof",
      "RTCPeerConnection.getStats()",
      "Candidate pairs",
      "Inbound streams",
      "Stalled streams",
      "Loss",
    ],
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "telephonyMediaPage",
    path: "/voice/telephony-media",
    requiredText: [
      "AbsoluteJS Voice Telephony Media Proof",
      "Carrier media serializer proof",
      "MediaFrame",
      "Started",
      "Stopped",
      "Media events",
      "Twilio",
      "Telnyx",
      "Plivo",
    ],
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "mediaPipelinePage",
    path: "/voice/media-pipeline",
    requiredText: [
      "AbsoluteJS Voice Media Pipeline Proof",
      "Native media pipeline",
      "Media quality",
      "VAD segments",
      "Interruptions",
    ],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "mediaPipelineMarkdown",
    path: "/voice/media-pipeline.md",
    requiredText: [
      "Voice Media Pipeline Proof",
      "Status: pass",
      "Media quality",
      "VAD segments",
      "Interruption frames",
    ],
  },
  {
    kind: "json",
    name: "realtimeProviderContracts",
    path: "/api/voice/realtime-provider-contracts",
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "realtimeProviderContractsPage",
    path: "/voice/realtime-provider-contracts",
    requiredText: [
      "AbsoluteJS Voice Realtime Provider Contracts",
      "Realtime provider contracts",
      "openai-realtime",
      "gemini-live",
      "Trace evidence",
    ],
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "realtimeChannelPage",
    path: "/voice/realtime-channel",
    requiredText: [
      "AbsoluteJS Voice Realtime Channel Proof",
      "Realtime / duplex readiness",
      "openai-realtime",
      "Runtime Samples",
    ],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "realtimeChannelMarkdown",
    path: "/voice/realtime-channel.md",
    requiredText: [
      "Voice Realtime Channel Proof",
      "Provider: openai-realtime",
      "Status: pass",
    ],
  },
  {
    kind: "json",
    name: "competitiveCoverage",
    path: "/api/voice/competitive-coverage",
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "competitiveCoveragePage",
    path: "/voice/competitive-coverage",
    requiredText: [
      "AbsoluteJS Voice Competitive Coverage",
      "Self-hosted market proof",
      "Provider choice and fallback",
      "failureReplay",
      "failure-replay",
    ],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "competitiveCoverageMarkdown",
    path: "/voice/competitive-coverage.md",
    requiredText: [
      "Voice Competitive Coverage",
      "Vapi-style coverage: 99.8%",
      "Provider choice and fallback",
      "Unified call log / operations record",
    ],
  },
  {
    kind: "json",
    name: "proofTrends",
    path: "/api/voice/proof-trends",
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "proofTrendsPage",
    path: "/voice/proof-trends",
    requiredText: ["Sustained proof", "Longer-running latency", "Artifact age"],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "proofTrendsMarkdown",
    path: "/voice/proof-trends.md",
    requiredText: [
      "AbsoluteJS Voice Sustained Proof Trends",
      "Runtime channel",
    ],
  },
  {
    kind: "json",
    name: "proofTrendRecommendations",
    path: "/api/voice/proof-trend-recommendations",
  },
  {
    kind: "json",
    name: "realCallProfileHistory",
    path: "/api/voice/real-call-profile-history",
  },
  {
    kind: "json",
    name: "realCallEvidenceRuntime",
    path: "/api/voice/real-call-evidence-runtime",
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "realCallEvidenceRuntimePage",
    path: "/voice/real-call-evidence-runtime",
    requiredText: [
      "Real-call evidence runtime",
      "Rolling Profile History",
      "Stored",
    ],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "realCallEvidenceRuntimeMarkdown",
    path: "/voice/real-call-evidence-runtime.md",
    requiredText: [
      "Voice Real-Call Evidence Runtime",
      "Rolling Profile History",
      "Stored evidence",
    ],
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "realCallProfileHistoryPage",
    path: "/voice/real-call-profile-history",
    requiredText: [
      "Real-Call Profile History",
      "Real-call benchmark history",
      "Profiles",
    ],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "realCallProfileHistoryMarkdown",
    path: "/voice/real-call-profile-history.md",
    requiredText: [
      "Voice Real-Call Profile History",
      "Profiles",
      "Recommendations",
    ],
  },
  {
    kind: "json",
    name: "browserCallProfiles",
    path: "/api/voice/browser-call-profiles",
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "browserCallProfilesPage",
    path: "/voice/browser-call-profiles",
    requiredText: [
      "Browser Call Profiles",
      "Real browser microphone proof",
      "Framework parity proof",
    ],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "browserCallProfilesMarkdown",
    path: "/voice/browser-call-profiles.md",
    requiredText: [
      "Voice Browser Call Profiles",
      "Passed frameworks",
      "react",
      "angular",
    ],
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "proofTrendRecommendationsPage",
    path: "/voice/proof-trend-recommendations",
    requiredText: [
      "Provider Runtime Recommendations",
      "Provider Comparison",
      "Benchmark Profiles",
      "Keep current runtime channel",
    ],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "proofTrendRecommendationsMarkdown",
    path: "/voice/proof-trend-recommendations.md",
    requiredText: [
      "Voice Provider Runtime Recommendations",
      "provider-path",
      "runtime-channel",
      "Benchmark Profiles",
    ],
  },
  {
    kind: "json",
    name: "observabilityExport",
    path: "/api/voice/observability-export",
  },
  {
    kind: "json",
    name: "observabilityArtifactIndex",
    path: "/api/voice/observability-export/artifacts",
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "observabilityLatestProofPackArtifact",
    path: "/api/voice/observability-export/artifacts/latest-proof-pack",
    requiredText: ["AbsoluteJS Voice Proof Pack", "Overall"],
  },
  {
    kind: "json",
    method: "POST",
    name: "observabilityExportDelivery",
    path: "/api/voice/observability-export/deliveries",
  },
  {
    kind: "json",
    name: "observabilityExportDeliveryHistory",
    path: "/api/voice/observability-export/deliveries",
  },
  {
    kind: "json",
    name: "observabilityExportReplay",
    path: "/api/voice/observability-export/replay",
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "observabilityExportMarkdown",
    path: "/voice/observability-export.md",
    requiredText: ["Observability Export", "Overall"],
  },
  {
    accept: "text/html,text/plain,*/*",
    kind: "text",
    name: "switchingFromVapi",
    path: "/switching-from-vapi",
    requiredText: [
      "Replace Vapi dashboard concepts with owned primitives",
      "Sustained proof trends",
      "Artifact age",
      "Web voice assistant",
      "Post-call analysis",
      "Guardrails",
      "session-observability",
      "Logs export / SIEM / warehouse",
    ],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "providerSloMarkdown",
    path: "/voice/provider-slos.md",
    requiredText: ["Voice Provider SLO Report", "Overall"],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "providerOrchestrationMarkdown",
    path: "/voice/provider-orchestration.md",
    requiredText: ["Voice Provider Orchestration", "live-call"],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "providerDecisionsMarkdown",
    path: "/voice/provider-decisions.md",
    requiredText: ["Voice Provider Decision Traces", "live-call", "Degraded:"],
  },
  {
    kind: "json",
    name: "providerStatus",
    path: "/api/provider-status",
  },
  {
    kind: "json",
    name: "turnLatency",
    path: "/api/turn-latency",
  },
  {
    kind: "json",
    name: "liveLatency",
    path: "/api/live-latency",
  },
  {
    kind: "json",
    name: "telephonyWebhookSecurity",
    path: "/api/voice/telephony/webhook-security",
  },
  {
    kind: "json",
    name: "dataControl",
    path: "/data-control.json?beforeOrAt=9999999999999&auditLimit=25&scopes=auditDeliveries,campaigns,events,incidentBundles,reviews,sessions,tasks,traceDeliveries,traces",
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "dataControlMarkdown",
    path: "/data-control.md",
    requiredText: ["Voice Data Control", "Retention"],
  },
  {
    accept: "text/markdown,text/plain,*/*",
    kind: "text",
    name: "redactedAuditMarkdown",
    path: "/data-control/audit-proof.md",
    requiredText: ["Voice Data Control Audit Proof", "Redacted sample"],
  },
  {
    kind: "json",
    name: "campaigns",
    path: "/api/voice/campaigns",
  },
  {
    kind: "json",
    name: "campaignObservability",
    path: "/api/voice/campaigns/observability",
  },
  {
    kind: "json",
    name: "campaignReadiness",
    path: "/api/voice/campaigns/readiness-proof",
  },
  {
    kind: "json",
    name: "campaignDialerProofStatus",
    path: "/api/voice/campaigns/dialer-proof",
  },
  {
    kind: "json",
    name: "phoneSetup",
    path: "/api/voice/phone/setup",
  },
  {
    kind: "json",
    name: "phoneSmokeCompleted",
    path: "/api/voice/phone/smoke-contract?provider=twilio&sessionId=proof-guided-completed",
  },
  {
    kind: "json",
    name: "phoneSmokeTransfer",
    path: "/api/voice/phone/smoke-contract?provider=twilio&sessionId=proof-transfer-billing",
  },
  {
    kind: "json",
    name: "phoneSmokeVoicemail",
    path: "/api/voice/phone/smoke-contract?provider=twilio&sessionId=proof-voicemail",
  },
  {
    kind: "json",
    name: "phoneSmokeNoAnswer",
    path: "/api/voice/phone/smoke-contract?provider=twilio&sessionId=proof-no-answer",
  },
  {
    kind: "json",
    name: "telephonyWebhookDecisions",
    path: "/api/telephony-webhook-decisions",
  },
  {
    kind: "json",
    name: "telephonyWebhookVerificationProof",
    path: "/api/telephony-webhook/verification-proof",
  },
  {
    kind: "json",
    name: "carriers",
    path: "/api/carriers",
  },
  {
    kind: "json",
    name: "deliveryRuntime",
    path: "/api/voice-delivery-runtime",
  },
  {
    kind: "json",
    name: "opsStatus",
    path: "/api/voice/ops-status",
  },
  {
    kind: "json",
    name: "opsActionHistory",
    path: "/api/voice/ops-actions/history",
  },
  {
    kind: "json",
    name: "liveOpsControl",
    path: "/api/voice/live-ops/control/demo-incident-bundle",
  },
  {
    kind: "json",
    name: "agentSquadContract",
    path: "/api/agent-squad-contract",
  },
];

const commandProofTargets: CommandProofTarget[] = [
  {
    command: ["bun", "run", "smoke:live-guardrails"],
    kind: "command",
    name: "liveGuardrailsRuntime",
  },
  {
    command: ["bun", "run", "smoke:telephony:media-ops"],
    kind: "command",
    name: "telephonyMediaOperationsSmoke",
  },
];

const writeArtifact = async (name: string, content: string | Uint8Array) => {
  await Bun.write(join(outputDir, name), content);
};

const readRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const readMetric = (kind: Record<string, unknown> | undefined, key: string) => {
  const metrics = readRecord(kind?.metrics);
  const metric = readRecord(metrics?.[key]);
  return readNumber(metric?.actual);
};

const formatMs = (value: number | undefined) =>
  value === undefined ? "n/a" : `${Math.round(value)}ms`;

const formatRate = (value: number | undefined) =>
  value === undefined ? "n/a" : `${(value * 100).toFixed(2)}%`;

const evaluateProductionReadinessGateExplanations = (
  report: VoiceProductionReadinessReport | undefined,
) => {
  if (!report) {
    return {
      checksNeedingExplanation: 0,
      explainedChecks: 0,
      issues: ["Missing production readiness report."],
      ok: false,
    };
  }

  const checks = Array.isArray(report.checks) ? report.checks : [];
  const checksNeedingExplanation = checks.filter(
    (check) => check.status !== "pass",
  );
  const issues: string[] = [];

  for (const check of checksNeedingExplanation) {
    const explanation = readRecord(check.gateExplanation);
    const label = check.label || "unknown readiness check";
    const missing = [
      explanation?.observed === undefined ? "observed" : undefined,
      explanation?.threshold === undefined ? "threshold" : undefined,
      explanation?.unit === undefined ? "unit" : undefined,
      typeof explanation?.remediation !== "string" ||
      explanation.remediation.length === 0
        ? "remediation"
        : undefined,
      typeof explanation?.sourceHref !== "string" ||
      explanation.sourceHref.length === 0
        ? "sourceHref"
        : undefined,
    ].filter((item): item is string => Boolean(item));

    if (missing.length > 0) {
      issues.push(`${label} missing gateExplanation.${missing.join(", ")}`);
    }
  }

  return {
    checksNeedingExplanation: checksNeedingExplanation.length,
    explainedChecks: checksNeedingExplanation.length - issues.length,
    issues,
    ok: issues.length === 0,
  };
};

const renderObservabilityReplayHeadline = (proofResults: ProofResult[]) => {
  const productionReadiness = proofResults.find(
    (result) => result.name === "productionReadiness",
  );
  const body = readRecord(productionReadiness?.body);
  const summary = readRecord(body?.summary);
  const replay = readRecord(summary?.observabilityExportReplay);

  if (!productionReadiness || !replay) {
    return "Observability export replay proof was not captured.";
  }

  return `Observability export replay: **${String(replay.status ?? "unknown")}** with ${readNumber(replay.artifacts) ?? 0} artifact(s), ${readNumber(replay.deliveryDestinations) ?? 0} delivery destination(s), ${readNumber(replay.validationIssues) ?? 0} validation issue(s), ${readNumber(replay.failedArtifacts) ?? 0} failed artifact(s), and ${readNumber(replay.failedDeliveryDestinations) ?? 0} failed delivery destination(s).`;
};

const renderProviderSloHeadline = (proofResults: ProofResult[]) => {
  const providerSlo = proofResults.find(
    (result) => result.name === "providerSlo",
  );
  const body = readRecord(providerSlo?.body);

  if (!providerSlo || !body) {
    return "Provider SLO proof was not captured.";
  }

  const status = String(body.status ?? (providerSlo.ok ? "pass" : "fail"));
  const events = readNumber(body.events) ?? 0;
  const eventsWithLatency = readNumber(body.eventsWithLatency) ?? 0;
  const issues = Array.isArray(body.issues) ? body.issues.length : 0;
  const kinds = readRecord(body.kinds);
  const rows = ["llm", "stt", "tts"]
    .map((kindName) => {
      const kind = readRecord(kinds?.[kindName]);
      return `| ${kindName.toUpperCase()} | ${kind?.status ?? "missing"} | ${readNumber(kind?.events) ?? 0} | ${readNumber(kind?.eventsWithLatency) ?? 0} | ${formatMs(readMetric(kind, "averageElapsedMs"))} | ${formatMs(readMetric(kind, "p95ElapsedMs"))} | ${formatRate(readMetric(kind, "errorRate"))} | ${formatRate(readMetric(kind, "timeoutRate"))} | ${formatRate(readMetric(kind, "fallbackRate"))} |`;
    })
    .join("\n");

  return `Provider SLO: **${status}** across ${events} routing event(s), ${eventsWithLatency} latency sample(s), and ${issues} issue(s).

| Kind | Status | Events | Samples | Avg | P95 | Error | Timeout | Fallback |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${rows}`;
};

type VapiCoverageSurface = {
  evidence: string[];
  replacement: string;
  surface: string;
};

type VapiCoverageEvidence = {
  method: ProofMethod;
  name: string;
  ok: boolean;
  path: string;
  status?: number;
  url: string;
};

type VapiCoverageResult = {
  evidence: VapiCoverageEvidence[];
  failed: number;
  gap: string;
  missing: number;
  missingEvidence: string[];
  replacement: string;
  status: "fail" | "pass";
  surface: string;
};

const vapiCoverageSurfaces: VapiCoverageSurface[] = [
  {
    evidence: ["switchingFromVapi", "productionReadiness", "providerContracts"],
    replacement:
      "Provider-routable web voice primitives with a buyer-facing migration map.",
    surface: "Web voice assistant",
  },
  {
    evidence: [
      "phoneSetup",
      "carriers",
      "deliveryRuntime",
      "telephonyWebhookSecurity",
    ],
    replacement:
      "Self-hosted phone setup, carrier readiness, delivery runtime checks, and carrier webhook security proof.",
    surface: "Phone assistant",
  },
  {
    evidence: ["agentSquadContract"],
    replacement:
      "Typed agent squad contract for multi-assistant routing and handoff behavior.",
    surface: "Squads / multi-assistant routing",
  },
  {
    evidence: ["toolContracts", "outcomeContracts"],
    replacement:
      "Contract-tested tool calling and outcome validation before live traffic.",
    surface: "Tools and functions",
  },
  {
    evidence: [
      "guardrails",
      "guardrailsPage",
      "guardrailsMarkdown",
      "liveGuardrailsRuntime",
    ],
    replacement:
      "Local blocking and warning policy checks with redaction proof, live runtime blocking, and guardrail report artifacts.",
    surface: "Guardrails and policies",
  },
  {
    evidence: [
      "operationsRecord",
      "operationsRecordPage",
      "sessionObservability",
      "sessionObservabilityPage",
      "sessionObservabilityIncidentMarkdown",
      "incidentMarkdown",
      "incidentBundleMarkdown",
      "opsRecovery",
    ],
    replacement:
      "Operations records, per-session turn waterfalls, incident handoff markdown, and recovery evidence.",
    surface: "Call logs and incident handoff",
  },
  {
    evidence: [
      "postCallAnalysis",
      "postCallAnalysisPage",
      "postCallAnalysisMarkdown",
      "operationsRecord",
    ],
    replacement:
      "Post-call extraction, required follow-up tasks, integration delivery, and operations-record linkage.",
    surface: "Post-call analysis",
  },
  {
    evidence: [
      "providerOrchestration",
      "providerOrchestrationMarkdown",
      "providerDecisions",
      "providerDecisionsMarkdown",
      "realtimeChannel",
      "realtimeChannelPage",
      "realtimeChannelMarkdown",
      "realtimeProviderContracts",
      "realtimeProviderContractsPage",
      "providerSlo",
      "providerSloMarkdown",
      "competitiveCoverage",
      "competitiveCoveragePage",
      "competitiveCoverageMarkdown",
      "turnLatency",
      "liveLatency",
      "productionReadiness",
      "proofTrends",
      "proofTrendsPage",
      "proofTrendsMarkdown",
    ],
    replacement:
      "LLM/STT/TTS orchestration profiles, per-call provider decision traces, SLOs, latency budgets, sustained trends, and production readiness gates.",
    surface: "Monitoring and release gates",
  },
  {
    evidence: ["simulationSuite", "toolContracts", "outcomeContracts"],
    replacement:
      "Scenario simulation plus tool and outcome proof before production use.",
    surface: "Simulation testing",
  },
  {
    evidence: [
      "campaigns",
      "campaignRuntimeProof",
      "campaignObservability",
      "campaignReadiness",
      "campaignDialerProof",
      "campaignDialerProofStatus",
    ],
    replacement:
      "Campaign runtime, dialer proof, readiness checks, and campaign observability.",
    surface: "Outbound campaigns",
  },
  {
    evidence: ["opsStatus", "opsRecovery", "operationsRecord"],
    replacement:
      "Operator-facing status, recovery, and operations-record links.",
    surface: "Live operator controls",
  },
  {
    evidence: ["dataControl", "dataControlMarkdown", "redactedAuditMarkdown"],
    replacement:
      "Customer-owned data control, redaction, audit export, retention, and deletion proof.",
    surface: "Compliance controls",
  },
  {
    evidence: [
      "observabilityExport",
      "observabilityArtifactIndex",
      "observabilityLatestProofPackArtifact",
      "observabilityExportDelivery",
      "observabilityExportDeliveryHistory",
      "observabilityExportReplay",
      "observabilityExportMarkdown",
    ],
    replacement:
      "Trace, audit, proof-pack, screenshot, checksum, delivery, and replayable export evidence.",
    surface: "Logs export / SIEM / warehouse",
  },
];

type AnyProofResult = ProofResult | CommandProofResult;

const isHttpProofResult = (result: AnyProofResult): result is ProofResult =>
  "method" in result && "path" in result && "url" in result;

const buildVapiCoverage = (results: AnyProofResult[]): VapiCoverageResult[] => {
  const resultByName = new Map(results.map((result) => [result.name, result]));

  return vapiCoverageSurfaces.map((surface) => {
    const evidence = surface.evidence
      .map((name) => resultByName.get(name))
      .filter((result): result is AnyProofResult => result !== undefined);
    const missingEvidence = surface.evidence.filter(
      (name) => !resultByName.has(name),
    );
    const missing = missingEvidence.length;
    const failed = evidence.filter((result) => !result.ok).length;
    const status = missing === 0 && failed === 0 ? "pass" : "fail";

    return {
      evidence: evidence.map((result) => ({
        method: isHttpProofResult(result) ? result.method : "POST",
        name: result.name,
        ok: result.ok,
        path: isHttpProofResult(result)
          ? result.path
          : result.command.join(" "),
        status: result.status,
        url: isHttpProofResult(result) ? result.url : `command:${result.name}`,
      })),
      failed,
      gap:
        missing === 0 && failed === 0
          ? ""
          : `${missing} missing, ${failed} failing`,
      missing,
      missingEvidence,
      replacement: surface.replacement,
      status,
      surface: surface.surface,
    };
  });
};

const renderVapiCoverage = (coverage: VapiCoverageResult[]) => {
  const rows = coverage
    .map((surface) => {
      const proof = surface.evidence
        .map(
          (result) =>
            `${result.name} (${result.method} ${result.path}, ${result.status ?? "n/a"})`,
        )
        .join("<br>");

      return `| ${surface.status} | ${surface.surface} | ${surface.replacement} | ${proof || "No proof target captured."} | ${surface.gap} |`;
    })
    .join("\n");

  return `## Vapi Replacement Coverage

| Status | Surface | AbsoluteJS Voice replacement | Proof artifacts | Gap |
| --- | --- | --- | --- | --- |
${rows}`;
};

const renderMarkdown = (input: {
  baseUrl: string;
  campaignDialerProofEvidenceAssertion: JsonAssertionResult;
  campaignReadinessEvidenceAssertion: JsonAssertionResult;
  competitiveCoverageAssertion: JsonAssertionResult;
  dataControlEvidenceAssertion: JsonAssertionResult;
  generatedAt: string;
  agentSquadContractEvidenceAssertion: JsonAssertionResult;
  guardrailEvidenceAssertion: JsonAssertionResult;
  observabilityExportDeliveryAssertion: JsonAssertionResult;
  observabilityExportReplayAssertion: JsonAssertionResult;
  liveOpsControlEvidenceAssertion: JsonAssertionResult;
  liveOpsEvidenceAssertion: JsonAssertionResult;
  ok: boolean;
  outcomeContractEvidenceAssertion: JsonAssertionResult;
  outputDir: string;
  platformCoverageAssertion: JsonAssertionResult;
  phoneCallControlEvidenceAssertion: JsonAssertionResult;
  phoneAssistantEvidenceAssertion: JsonAssertionResult;
  telephonyWebhookIdempotencyEvidenceAssertion: JsonAssertionResult;
  telephonyWebhookNormalizationEvidenceAssertion: JsonAssertionResult;
  telephonyWebhookVerificationEvidenceAssertion: JsonAssertionResult;
  productionReadinessEvidenceAssertion: JsonAssertionResult;
  browserCallProfileEvidenceAssertion: JsonAssertionResult;
  proofTrendEvidenceAssertion: JsonAssertionResult;
  proofTrendRecommendationAssertion: JsonAssertionResult;
  realCallEvidenceRuntimeAssertion: JsonAssertionResult;
  providerContractMatrixEvidenceAssertion: JsonAssertionResult;
  providerDecisionEvidenceAssertion: JsonAssertionResult;
  failureReplayEvidenceAssertion: JsonAssertionResult;
  operationsRecordProviderDecisionEvidenceAssertion: JsonAssertionResult;
  providerOrchestrationEvidenceAssertion: JsonAssertionResult;
  mediaPipelineCalibrationAssertion: JsonAssertionResult;
  realtimeChannelEvidenceAssertion: JsonAssertionResult;
  realtimeProviderContractEvidenceAssertion: JsonAssertionResult;
  providerRoutingContractEvidenceAssertion: JsonAssertionResult;
  providerSloEvidenceAssertion: JsonAssertionResult;
  providerStackEvidenceAssertion: JsonAssertionResult;
  productionReadinessGateExplanationAssertion: JsonAssertionResult;
  simulationSuiteEvidenceAssertion: JsonAssertionResult;
  toolContractEvidenceAssertion: JsonAssertionResult;
  proofResults: ProofResult[];
  commandResults: CommandProofResult[];
  runId: string;
  seedResults: ProofResult[];
  vapiCoverage: VapiCoverageResult[];
}) => {
  const allResults = [
    ...input.seedResults,
    ...input.proofResults,
    ...input.commandResults,
  ];
  const rows = allResults
    .map((result) => {
      const request = isHttpProofResult(result)
        ? `${result.method} ${result.path}`
        : result.command.join(" ");
      return `| ${result.ok ? "pass" : "fail"} | ${result.name} | ${request} | ${result.status ?? ""} | ${result.elapsedMs} | ${result.error ?? ""} |`;
    })
    .join("\n");

  const failures = allResults
    .filter((result) => !result.ok)
    .map(
      (result) =>
        `- ${result.name}: ${result.error ?? `HTTP ${result.status}`}`,
    )
    .join("\n");

  return `# AbsoluteJS Voice Proof Pack

Generated: ${input.generatedAt}

Base URL: ${input.baseUrl}

Run ID: ${input.runId}

Output directory: \`${input.outputDir}\`

Overall: **${input.ok ? "pass" : "fail"}**

## Headline Proof

${renderProviderSloHeadline(input.proofResults)}

${renderObservabilityReplayHeadline(input.proofResults)}

${renderVapiCoverage(input.vapiCoverage)}

Guardrail evidence assertion: **${input.guardrailEvidenceAssertion.ok ? "pass" : "fail"}**.

Provider SLO evidence assertion: **${input.providerSloEvidenceAssertion.ok ? "pass" : "fail"}**.

Provider orchestration evidence assertion: **${input.providerOrchestrationEvidenceAssertion.ok ? "pass" : "fail"}**.

Realtime channel evidence assertion: **${input.realtimeChannelEvidenceAssertion.ok ? "pass" : "fail"}**.

Media pipeline calibration assertion: **${input.mediaPipelineCalibrationAssertion.ok ? "pass" : "fail"}**.

Realtime provider contract assertion: **${input.realtimeProviderContractEvidenceAssertion.ok ? "pass" : "fail"}**.

Provider decision evidence assertion: **${input.providerDecisionEvidenceAssertion.ok ? "pass" : "fail"}**.

Failure replay evidence assertion: **${input.failureReplayEvidenceAssertion.ok ? "pass" : "fail"}**.


Operations-record provider decision assertion: **${input.operationsRecordProviderDecisionEvidenceAssertion.ok ? "pass" : "fail"}**.

Production readiness evidence assertion: **${input.productionReadinessEvidenceAssertion.ok ? "pass" : "fail"}**.

Browser call profile evidence assertion: **${input.browserCallProfileEvidenceAssertion.ok ? "pass" : "fail"}**.

Real-call evidence runtime assertion: **${input.realCallEvidenceRuntimeAssertion.ok ? "pass" : "fail"}**.

Production readiness gate explanations assertion: **${input.productionReadinessGateExplanationAssertion.ok ? "pass" : "fail"}**.

Campaign readiness assertion: **${input.campaignReadinessEvidenceAssertion.ok ? "pass" : "fail"}**.

Campaign dialer proof assertion: **${input.campaignDialerProofEvidenceAssertion.ok ? "pass" : "fail"}**.

Data-control evidence assertion: **${input.dataControlEvidenceAssertion.ok ? "pass" : "fail"}**.

Phone assistant evidence assertion: **${input.phoneAssistantEvidenceAssertion.ok ? "pass" : "fail"}**.

Phone call-control evidence assertion: **${input.phoneCallControlEvidenceAssertion.ok ? "pass" : "fail"}**.

Telephony webhook normalization assertion: **${input.telephonyWebhookNormalizationEvidenceAssertion.ok ? "pass" : "fail"}**.

Telephony webhook idempotency assertion: **${input.telephonyWebhookIdempotencyEvidenceAssertion.ok ? "pass" : "fail"}**.

Telephony webhook verification assertion: **${input.telephonyWebhookVerificationEvidenceAssertion.ok ? "pass" : "fail"}**.

Live-ops evidence assertion: **${input.liveOpsEvidenceAssertion.ok ? "pass" : "fail"}**.

Live-ops control transition assertion: **${input.liveOpsControlEvidenceAssertion.ok ? "pass" : "fail"}**.

Tool contract assertion: **${input.toolContractEvidenceAssertion.ok ? "pass" : "fail"}**.

Outcome contract assertion: **${input.outcomeContractEvidenceAssertion.ok ? "pass" : "fail"}**.

Simulation suite assertion: **${input.simulationSuiteEvidenceAssertion.ok ? "pass" : "fail"}**.

Sustained proof trend assertion: **${input.proofTrendEvidenceAssertion.ok ? "pass" : "fail"}**.

Provider/runtime recommendation assertion: **${input.proofTrendRecommendationAssertion.ok ? "pass" : "fail"}**.

Provider contract matrix assertion: **${input.providerContractMatrixEvidenceAssertion.ok ? "pass" : "fail"}**.

Provider routing contract assertion: **${input.providerRoutingContractEvidenceAssertion.ok ? "pass" : "fail"}**.

Provider stack assertion: **${input.providerStackEvidenceAssertion.ok ? "pass" : "fail"}**.

Agent squad contract assertion: **${input.agentSquadContractEvidenceAssertion.ok ? "pass" : "fail"}**.

Platform coverage evidence assertion: **${input.platformCoverageAssertion.ok ? "pass" : "fail"}**.

Competitive coverage assertion: **${input.competitiveCoverageAssertion.ok ? "pass" : "fail"}**.

Observability export delivery assertion: **${input.observabilityExportDeliveryAssertion.ok ? "pass" : "fail"}**.

Observability export replay assertion: **${input.observabilityExportReplayAssertion.ok ? "pass" : "fail"}**.

## Results

| Status | Artifact | Request | HTTP | ms | Error |
| --- | --- | --- | --- | ---: | --- |
${rows}

## Failures

${failures || "No failing proof artifacts."}

## Demo Narrative

1. Open \`/switching-from-vapi\` and \`/voice/competitive-coverage\` to map hosted-platform expectations to owned AbsoluteJS Voice primitives, depth scores, and proof URLs.
2. Open a framework page and start a browser voice session.
3. Open \`/voice-operations/:sessionId\` to show the call-log replacement.
4. Open \`/production-readiness\` to show release gates.
5. Open \`/voice/provider-slos\` to show LLM/STT/TTS latency, timeout, fallback, and unresolved-error budgets.
6. Open \`/voice/proof-trends\` to show sustained provider, latency, recovery, and readiness trends across repeated cycles.
7. Open \`/voice/post-call-analysis\` to show extracted-field, task, delivery, and operations-record proof for post-call workflow.
8. Open \`/voice/guardrails\` to show local blocking, warning, and redaction policy proof.
9. Open \`/voice/observability-export\` and \`/api/voice/observability-export/artifacts\` to show customer-owned trace, audit, operations-record, SLO, incident, proof-pack evidence, checksums, and downloadable artifacts.
10. Open \`/voice/simulations\`, \`/tool-contracts\`, and \`/outcome-contracts\` to show pre-production proof.
11. Open \`/data-control\` to show customer-owned storage, redaction, audit export, and guarded deletion.

`;
};

await mkdir(outputDir, { recursive: true });

const generatedAt = new Date().toISOString();
await Bun.write(
  join(outputRoot, "latest.json"),
  `${JSON.stringify(
    {
      generatedAt,
      ok: false,
      outputDir,
      runId,
      status: "running",
    },
    null,
    2,
  )}\n`,
);
await Bun.write(
  join(outputRoot, "latest.md"),
  [
    "# AbsoluteJS Voice Proof Pack",
    "",
    `Generated: ${generatedAt}`,
    "",
    "Overall: running",
    "",
    "This in-progress artifact is replaced by the completed proof-pack summary at the end of the run.",
    "",
  ].join("\n"),
);
const orderedSeedNames = new Set([
  "liveOpsOperatorTakeoverSeed",
  "liveOpsPauseAssistantSeed",
  "liveOpsResumeAssistantSeed",
  "liveOpsForceHandoffSeed",
]);
const parallelSeedTargets = seedTargets.filter(
  (target) => !orderedSeedNames.has(target.name),
);
const orderedSeedTargets = seedTargets.filter((target) =>
  orderedSeedNames.has(target.name),
);
const runTargets = (targets: ProofTarget[], targetConcurrency = concurrency) =>
  runVoiceProofTargets(targets, {
    baseUrl,
    concurrency: targetConcurrency,
    timeoutMs,
    writeArtifact: ({ content, name }) => writeArtifact(name, content),
  });

const seedResults = await runTargets(parallelSeedTargets);
seedResults.push(...(await runTargets(orderedSeedTargets, 1)));
const proofResults = await runTargets(proofTargets);
const commandResults = await runVoiceCommandProofTargets(commandProofTargets, {
  execute: async (target) => {
    const proc = Bun.spawn(target.command, {
      env: {
        ...process.env,
        PORT: process.env.PORT ?? "3004",
        VOICE_DEMO_URL: baseUrl,
      },
      stderr: "pipe",
      stdout: "pipe",
    });
    const [stdout, stderr, status] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    return {
      status,
      stderr,
      stdout,
    };
  },
  writeArtifact: ({ content, name }) => writeArtifact(name, content),
});
const operationsRecord = proofResults.find(
  (result) => result.name === "operationsRecord",
)?.body as VoiceOperationsRecord | undefined;
const operationRecordProviderDecisions =
  operationsRecord?.providerDecisions ?? [];
const operationRecordProviderRecoveryReport = operationsRecord
  ? evaluateVoiceOperationsRecordProviderRecovery(operationsRecord, {
      minDegraded: 1,
      minFallbacks: 1,
      minSelected: 1,
      recoveryStatus: "degraded",
      requiredReasonIncludes: ["latency budget"],
      requiredSelectedProviders: ["deterministic"],
      requiredStatuses: ["degraded", "fallback", "selected"],
      requiredSurfaces: ["live-call"],
    })
  : undefined;
const operationsRecordProviderDecisionEvidenceAssertion: JsonAssertionResult = {
  kind: "json-assertion",
  name: "operationsRecordProviderDecisionEvidence",
  ok: operationRecordProviderRecoveryReport?.ok === true,
  summary: {
    decisions: operationRecordProviderDecisions.map((decision) => ({
      provider: decision.provider,
      reason: decision.reason,
      selectedProvider: decision.selectedProvider,
      status: decision.status,
      surface: decision.surface,
      type: decision.type,
    })),
    issues: operationRecordProviderRecoveryReport?.issues ?? [
      "Missing operationsRecord proof result body.",
    ],
    summary: operationRecordProviderRecoveryReport,
    total: operationRecordProviderDecisions.length,
  },
};
const fetchedFailureReplay = proofResults.find(
  (result) => result.name === "failureReplay",
)?.body as VoiceFailureReplayReport | undefined;
const builtFailureReplay = operationsRecord
  ? buildVoiceFailureReplay(operationsRecord, {
      operationsRecordHref: "/voice-operations/demo-incident-bundle",
    })
  : undefined;
const failureReplay = fetchedFailureReplay ?? builtFailureReplay;
const failureReplayIssues = [
  !failureReplay ? "Missing failure replay proof result body." : undefined,
  failureReplay && failureReplay.status !== "degraded"
    ? `Expected failure replay status degraded, got ${failureReplay.status}.`
    : undefined,
  failureReplay && failureReplay.providers.fallbacks < 1
    ? "Expected at least one provider fallback in failure replay."
    : undefined,
  failureReplay && failureReplay.providers.degraded < 1
    ? "Expected at least one provider degradation in failure replay."
    : undefined,
  failureReplay &&
  !failureReplay.providers.steps.some(
    (step) =>
      step.status === "degraded" &&
      (step.fallbackProvider === "deterministic" ||
        step.selectedProvider === "deterministic"),
  )
    ? "Missing deterministic degradation step in failure replay."
    : undefined,
  failureReplay && failureReplay.summary.userHeard.length < 1
    ? "Missing user-heard assistant output in failure replay."
    : undefined,
].filter((issue): issue is string => typeof issue === "string");
const failureReplayEvidenceAssertion: JsonAssertionResult = {
  kind: "json-assertion",
  name: "failureReplayEvidence",
  ok: failureReplayIssues.length === 0,
  summary: {
    issues: failureReplayIssues,
    media: failureReplay?.media,
    ok: failureReplay?.ok,
    providers: failureReplay?.providers,
    status: failureReplay?.status,
    userHeard: failureReplay?.summary.userHeard,
  },
};
const guardrailEvidenceReport = operationsRecord
  ? evaluateVoiceOperationsRecordGuardrails(operationsRecord, {
      minBlocked: 2,
      proofs: ["operations-record-guardrail-seed"],
      ruleIds: ["support.no-medical-advice", "support.tool-input-policy"],
      stages: ["assistant-output", "tool-input"],
      statuses: ["fail"],
      toolNames: ["lookup_invoice"],
    })
  : undefined;
const guardrailEvidenceAssertion: JsonAssertionResult = operationsRecord
  ? {
      kind: "json-assertion",
      name: "operationsRecordGuardrailEvidence",
      ok: guardrailEvidenceReport?.ok === true,
      summary: guardrailEvidenceReport as unknown as Record<string, unknown>,
    }
  : {
      kind: "json-assertion",
      name: "operationsRecordGuardrailEvidence",
      ok: false,
      summary: {
        issues: ["Missing operationsRecord proof result body."],
      },
    };
const providerSloReport = proofResults.find(
  (result) => result.name === "providerSlo",
)?.body as VoiceProviderSloReport | undefined;
const providerSloEvidenceReport = providerSloReport
  ? evaluateVoiceProviderSloEvidence(providerSloReport, {
      fallbackKinds: ["llm"],
      maxP95ElapsedMs: {
        llm: 4_500,
        stt: 1_500,
        tts: 2_200,
      },
      maxStatus: "pass",
      maxTimeouts: 0,
      maxUnresolvedErrors: 0,
      minEvents: 6,
      minFallbacks: 1,
      minLatencySamples: 6,
      requiredKinds: ["llm", "stt", "tts"],
    })
  : undefined;
const providerSloEvidenceAssertion: JsonAssertionResult = providerSloReport
  ? {
      kind: "json-assertion",
      name: "providerSloEvidence",
      ok: providerSloEvidenceReport?.ok === true,
      summary: providerSloEvidenceReport as unknown as Record<string, unknown>,
    }
  : {
      kind: "json-assertion",
      name: "providerSloEvidence",
      ok: false,
      summary: {
        issues: ["Missing providerSlo proof result body."],
      },
    };
const providerOrchestrationReport = proofResults.find(
  (result) => result.name === "providerOrchestration",
)?.body as VoiceProviderOrchestrationReport | undefined;
const providerOrchestrationIssues =
  providerOrchestrationReport?.issues.map((issue) => issue.message) ?? [];
const providerOrchestrationEvidenceAssertion: JsonAssertionResult =
  providerOrchestrationReport
    ? {
        kind: "json-assertion",
        name: "providerOrchestrationEvidence",
        ok:
          providerOrchestrationReport.status === "pass" &&
          providerOrchestrationReport.summary.surfaces >= 4 &&
          providerOrchestrationReport.summary.providers >= 3,
        summary: {
          issues: providerOrchestrationIssues,
          profileId: providerOrchestrationReport.profileId,
          status: providerOrchestrationReport.status,
          summary: providerOrchestrationReport.summary,
          surfaces: providerOrchestrationReport.surfaces.map((surface) => ({
            providers: surface.providers,
            status: surface.status,
            surface: surface.surface,
          })),
        },
      }
    : {
        kind: "json-assertion",
        name: "providerOrchestrationEvidence",
        ok: false,
        summary: {
          issues: ["Missing providerOrchestration proof result body."],
        },
      };
const providerDecisionReport = proofResults.find(
  (result) => result.name === "providerDecisions",
)?.body as VoiceProviderDecisionTraceReport | undefined;
const providerDecisionIssues =
  providerDecisionReport?.issues.map((issue) => issue.message) ?? [];
const providerDecisionEvidenceAssertion: JsonAssertionResult =
  providerDecisionReport
    ? {
        kind: "json-assertion",
        name: "providerDecisionEvidence",
        ok:
          providerDecisionReport.status === "pass" &&
          providerDecisionReport.summary.decisions >= 4 &&
          providerDecisionReport.summary.fallbacks >= 1 &&
          providerDecisionReport.summary.degraded >= 1 &&
          providerDecisionReport.summary.surfaces >= 4 &&
          providerDecisionReport.summary.providers >= 3,
        summary: {
          issues: providerDecisionIssues,
          status: providerDecisionReport.status,
          summary: providerDecisionReport.summary,
          surfaces: providerDecisionReport.surfaces.map((surface) => ({
            degraded: surface.degraded,
            decisions: surface.decisions,
            fallbacks: surface.fallbacks,
            providers: surface.providers,
            status: surface.status,
            surface: surface.surface,
          })),
        },
      }
    : {
        kind: "json-assertion",
        name: "providerDecisionEvidence",
        ok: false,
        summary: {
          issues: ["Missing providerDecisions proof result body."],
        },
      };
const productionReadinessReport = proofResults.find(
  (result) => result.name === "productionReadiness",
)?.body as VoiceProductionReadinessReport | undefined;
const productionReadinessEvidenceReport = productionReadinessReport
  ? evaluateVoiceProductionReadinessEvidence(productionReadinessReport, {
      requireStatus: "pass",
      requiredChecks: [
        "Browser media transport",
        "Browser call profile evidence",
        "Campaign readiness proof",
        "Media pipeline quality",
        "Ops recovery",
        "Provider orchestration profiles",
        "Provider SLO gates",
        "Session health",
      ],
    })
  : undefined;
const productionReadinessEvidenceAssertion: JsonAssertionResult =
  createVoiceEvidenceAssertion({
    evidence: productionReadinessEvidenceReport,
    missingIssue: "Missing productionReadiness proof result body.",
    name: "productionReadinessEvidence",
  });
const browserCallProfileReport = proofResults.find(
  (result) => result.name === "browserCallProfiles",
)?.body as VoiceBrowserCallProfileReport | undefined;
const browserCallProfileEvidenceReport = browserCallProfileReport
  ? evaluateVoiceBrowserCallProfileEvidence(browserCallProfileReport, {
      maxAgeMs: 24 * 60 * 60 * 1000,
      minOpenSocketsPerFramework: 1,
      minSentBytesPerFramework: 1,
      requiredFrameworks: ["react", "vue", "svelte", "angular", "html", "htmx"],
    })
  : undefined;
const browserCallProfileEvidenceAssertion: JsonAssertionResult =
  browserCallProfileReport
    ? {
        kind: "json-assertion",
        name: "browserCallProfileEvidence",
        ok: browserCallProfileEvidenceReport?.ok === true,
        summary: browserCallProfileEvidenceReport as unknown as Record<
          string,
          unknown
        >,
      }
    : {
        kind: "json-assertion",
        name: "browserCallProfileEvidence",
        ok: false,
        summary: {
          issues: ["Missing browserCallProfiles proof result body."],
        },
      };
const productionReadinessGateExplanationReport =
  evaluateProductionReadinessGateExplanations(productionReadinessReport);
const productionReadinessGateExplanationAssertion: JsonAssertionResult = {
  kind: "json-assertion",
  name: "productionReadinessGateExplanations",
  ok: productionReadinessGateExplanationReport.ok,
  summary: productionReadinessGateExplanationReport as unknown as Record<
    string,
    unknown
  >,
};
const campaignReadinessReport = proofResults.find(
  (result) => result.name === "campaignReadiness",
)?.body as VoiceCampaignReadinessProofReport | undefined;
const campaignReadinessEvidenceReport = campaignReadinessReport
  ? evaluateVoiceCampaignReadinessEvidence(campaignReadinessReport, {
      maxFailedChecks: 0,
      minAcceptedImports: 1,
      minRejectedImports: 3,
      minTotalImports: 4,
      requiredBlockedReasons: [
        "outside-attempt-window",
        "quiet-hours",
        "rate-limit",
        "retry-backoff",
      ],
      requiredChecks: [
        "recipient-import-validation",
        "attempt-window-block",
        "quiet-hours-block",
        "allowed-attempt",
        "rate-limit-block",
        "retry-backoff-block",
        "retry-to-max-attempts",
      ],
    })
  : undefined;
const campaignReadinessEvidenceAssertion: JsonAssertionResult =
  createVoiceEvidenceAssertion({
    evidence: campaignReadinessEvidenceReport,
    missingIssue: "Missing campaignReadiness proof result body.",
    name: "campaignReadinessEvidence",
  });
const campaignDialerProofReport = seedResults.find(
  (result) => result.name === "campaignDialerProof",
)?.body as VoiceCampaignDialerProofReport | undefined;
const campaignDialerProofEvidenceReport = campaignDialerProofReport
  ? evaluateVoiceCampaignDialerProofEvidence(campaignDialerProofReport, {
      maxFailedProviders: 0,
      minCarrierRequests: 3,
      minProviders: 3,
      minSuccessfulOutcomes: 3,
      requiredProviders: ["twilio", "telnyx", "plivo"],
    })
  : undefined;
const campaignDialerProofEvidenceAssertion: JsonAssertionResult =
  createVoiceEvidenceAssertion({
    evidence: campaignDialerProofEvidenceReport,
    missingIssue: "Missing campaignDialerProof seed result body.",
    name: "campaignDialerProofEvidence",
  });
const dataControlReport = proofResults.find(
  (result) => result.name === "dataControl",
)?.body as VoiceDataControlReport | undefined;
const dataControlEvidenceReport = dataControlReport
  ? evaluateVoiceDataControlEvidence(dataControlReport, {
      minAuditExportEvents: 1,
      minConfiguredStorage: 7,
      minProviderKeys: 6,
      requiredControls: ["artifact", "audit", "queue", "session", "workflow"],
      requiredProviderKeys: [
        "Anthropic",
        "AssemblyAI",
        "Deepgram",
        "ElevenLabs",
        "Gemini",
        "OpenAI",
        "Twilio",
      ],
      requiredRetentionScopes: [
        "auditDeliveries",
        "campaigns",
        "events",
        "incidentBundles",
        "reviews",
        "sessions",
        "tasks",
        "traceDeliveries",
        "traces",
      ],
      requiredStorage: [
        "Audit events",
        "Audit/trace delivery queues",
        "Call reviews",
        "Campaign records",
        "Incident bundles",
        "Integration events",
        "Ops tasks",
        "Sessions",
        "Trace events",
      ],
    })
  : undefined;
const dataControlEvidenceAssertion: JsonAssertionResult = dataControlReport
  ? {
      kind: "json-assertion",
      name: "dataControlEvidence",
      ok: dataControlEvidenceReport?.ok === true,
      summary: dataControlEvidenceReport as unknown as Record<string, unknown>,
    }
  : {
      kind: "json-assertion",
      name: "dataControlEvidence",
      ok: false,
      summary: {
        issues: ["Missing dataControl proof result body."],
      },
    };
const phoneSetupReport = proofResults.find(
  (result) => result.name === "phoneSetup",
)?.body as VoicePhoneAgentSetupReport | undefined;
const phoneAssistantEvidenceReport = phoneSetupReport
  ? evaluateVoicePhoneAssistantEvidence(phoneSetupReport, {
      dialerProof: campaignDialerProofReport,
      maxCarrierFailures: 0,
      maxCarrierWarnings: 0,
      maxFailedDialerProviders: 0,
      minCarriers: 3,
      minDialerCarrierRequests: 3,
      minReadyCarriers: 3,
      minSmokePassing: 3,
      minSuccessfulDialerOutcomes: 3,
      requiredDialerProviders: ["plivo", "telnyx", "twilio"],
      requiredLifecycleStages: [
        "answered",
        "assistant-response",
        "completed",
        "media-started",
        "no-answer",
        "ringing",
        "transcript",
        "transfer",
        "voicemail",
      ],
      requiredProviders: ["plivo", "telnyx", "twilio"],
      requireDialerProof: true,
    })
  : undefined;
const phoneAssistantEvidenceAssertion: JsonAssertionResult = phoneSetupReport
  ? {
      kind: "json-assertion",
      name: "phoneAssistantEvidence",
      ok: phoneAssistantEvidenceReport?.ok === true,
      summary: phoneAssistantEvidenceReport as unknown as Record<
        string,
        unknown
      >,
    }
  : {
      kind: "json-assertion",
      name: "phoneAssistantEvidence",
      ok: false,
      summary: {
        issues: ["Missing phoneSetup proof result body."],
      },
    };
const phoneCallControlSmokeReports = [
  "phoneSmokeCompleted",
  "phoneSmokeTransfer",
  "phoneSmokeVoicemail",
  "phoneSmokeNoAnswer",
]
  .map(
    (name) =>
      proofResults.find((result) => result.name === name)?.body as
        | VoicePhoneAgentProductionSmokeReport
        | undefined,
  )
  .filter((report): report is VoicePhoneAgentProductionSmokeReport =>
    Boolean(report),
  );
const phoneCallControlEvidenceReport = evaluateVoicePhoneCallControlEvidence({
  maxFailedSmokeReports: 0,
  minPassingSmokeReports: 4,
  productionSmokes: phoneCallControlSmokeReports,
  requiredLifecycleStages: ["completed", "no-answer", "transfer", "voicemail"],
  requiredOutcomes: ["completed", "no-answer", "transfer", "voicemail"],
  requiredProviders: ["twilio"],
  setup: phoneSetupReport,
});
const phoneCallControlEvidenceAssertion: JsonAssertionResult = {
  kind: "json-assertion",
  name: "phoneCallControlEvidence",
  ok: phoneCallControlEvidenceReport.ok,
  summary: phoneCallControlEvidenceReport as unknown as Record<string, unknown>,
};
const telephonyWebhookDecisionsReport = proofResults.find(
  (result) => result.name === "telephonyWebhookDecisions",
)?.body as
  | {
      decisions?: VoiceTelephonyWebhookNormalizationEvidenceDecision[];
    }
  | undefined;
const telephonyWebhookVerificationProofReport = proofResults.find(
  (result) => result.name === "telephonyWebhookVerificationProof",
)?.body as
  | {
      attempts?: VoiceTelephonyWebhookVerificationEvidenceAttempt[];
    }
  | undefined;
const telephonyWebhookNormalizationEvidenceReport =
  evaluateVoiceTelephonyWebhookNormalizationEvidence({
    decisions: telephonyWebhookDecisionsReport?.decisions ?? [],
    maxMissingSessionIds: 0,
    minDecisions: 4,
    requiredActions: ["complete", "no-answer", "transfer", "voicemail"],
    requiredDispositions: [
      "completed",
      "no-answer",
      "transferred",
      "voicemail",
    ],
    requiredProviders: ["plivo", "telnyx", "twilio"],
    requireRouteResults: true,
  });
const telephonyWebhookNormalizationEvidenceAssertion: JsonAssertionResult =
  createVoiceEvidenceAssertion({
    evidence: telephonyWebhookNormalizationEvidenceReport,
    name: "telephonyWebhookNormalizationEvidence",
  });
const telephonyWebhookIdempotencyEvidenceReport =
  evaluateVoiceTelephonyWebhookNormalizationEvidence({
    decisions: telephonyWebhookDecisionsReport?.decisions ?? [],
    maxDuplicateCampaignOutcomesApplied: 0,
    minDuplicateIdempotencyKeys: 2,
    minDuplicates: 2,
    requiredDuplicateProviders: ["telnyx", "twilio"],
    requireRouteResults: true,
  });
const telephonyWebhookIdempotencyEvidenceAssertion: JsonAssertionResult =
  createVoiceEvidenceAssertion({
    evidence: telephonyWebhookIdempotencyEvidenceReport,
    name: "telephonyWebhookIdempotencyEvidence",
  });
const telephonyWebhookVerificationEvidenceReport =
  evaluateVoiceTelephonyWebhookNormalizationEvidence({
    maxRejectedVerificationSideEffects: 0,
    minRejectedVerificationAttempts: 3,
    minReplayRejectedVerificationAttempts: 2,
    requiredReplayRejectedVerificationProviders: ["plivo", "telnyx"],
    requiredRejectedVerificationProviders: ["plivo", "telnyx", "twilio"],
    verificationAttempts:
      telephonyWebhookVerificationProofReport?.attempts ?? [],
  });
const telephonyWebhookVerificationEvidenceAssertion: JsonAssertionResult =
  createVoiceEvidenceAssertion({
    evidence: telephonyWebhookVerificationEvidenceReport,
    name: "telephonyWebhookVerificationEvidence",
  });
const opsRecoveryReport = proofResults.find(
  (result) => result.name === "opsRecovery",
)?.body as VoiceOpsRecoveryReport | undefined;
const opsStatusReport = proofResults.find(
  (result) => result.name === "opsStatus",
)?.body as VoiceOpsStatusReport | undefined;
const opsActionHistoryReport = proofResults.find(
  (result) => result.name === "opsActionHistory",
)?.body as VoiceOpsActionHistoryReport | undefined;
const liveOpsEvidenceReport = evaluateVoiceLiveOpsEvidence({
  actionHistory: opsActionHistoryReport,
  maxActionHistoryFailures: 0,
  maxOpsRecoveryIssues: 0,
  minActionHistoryEntries: 1,
  minOperationsRecordHandoffs: 1,
  operationsRecord,
  opsRecovery: opsRecoveryReport,
  opsStatus: opsStatusReport,
  requireOperationsRecordAudit: true,
  requiredHistoryActions: ["proof-pack.live-ops-evidence"],
});
const liveOpsEvidenceAssertion: JsonAssertionResult = {
  kind: "json-assertion",
  name: "liveOpsEvidence",
  ok: liveOpsEvidenceReport.ok,
  summary: liveOpsEvidenceReport as unknown as Record<string, unknown>,
};
const liveOpsControlResult = proofResults.find(
  (result) => result.name === "liveOpsControl",
)?.body as { control?: VoiceLiveOpsControlState | null } | undefined;
const liveOpsControlActionResults = seedResults
  .filter((result) =>
    [
      "liveOpsOperatorTakeoverSeed",
      "liveOpsPauseAssistantSeed",
      "liveOpsResumeAssistantSeed",
      "liveOpsForceHandoffSeed",
    ].includes(result.name),
  )
  .map((result) => result.body as Partial<VoiceLiveOpsActionResult>);
const liveOpsControlEvidenceReport = evaluateVoiceLiveOpsControlEvidence({
  finalControl: liveOpsControlResult?.control,
  maxFailedActions: 0,
  minSnapshots: 4,
  requireFinalAssistantPaused: true,
  requireFinalOperatorTakeover: false,
  requiredActions: [
    "force-handoff",
    "operator-takeover",
    "pause-assistant",
    "resume-assistant",
  ],
  requiredStatuses: [
    "assistant-paused",
    "assistant-resumed",
    "handoff-forced",
    "operator-takeover",
  ],
  results: liveOpsControlActionResults,
});
const liveOpsControlEvidenceAssertion: JsonAssertionResult = {
  kind: "json-assertion",
  name: "liveOpsControlEvidence",
  ok: liveOpsControlEvidenceReport.ok,
  summary: liveOpsControlEvidenceReport as unknown as Record<string, unknown>,
};
const toolContractReport = proofResults.find(
  (result) => result.name === "toolContracts",
)?.body as VoiceToolContractSuiteReport | undefined;
const toolContractEvidenceReport = toolContractReport
  ? evaluateVoiceToolContractEvidence(toolContractReport, {
      maxFailed: 0,
      maxIssues: 0,
      maxTimedOut: 0,
      minCases: 4,
      minContracts: 3,
      requireOperationRecordHrefs: true,
      requiredCaseStatuses: ["ok"],
      requiredContractIds: [
        "intake-classifier",
        "lifecycle-router",
        "review-task-recorder",
      ],
      requiredToolNames: [
        "intake_classifier",
        "lifecycle_router",
        "review_task_recorder",
      ],
    })
  : undefined;
const toolContractEvidenceAssertion: JsonAssertionResult = toolContractReport
  ? {
      kind: "json-assertion",
      name: "toolContractEvidence",
      ok: toolContractEvidenceReport?.ok === true,
      summary: toolContractEvidenceReport as unknown as Record<string, unknown>,
    }
  : {
      kind: "json-assertion",
      name: "toolContractEvidence",
      ok: false,
      summary: {
        issues: ["Missing toolContracts proof result body."],
      },
    };
const outcomeContractReport = proofResults.find(
  (result) => result.name === "outcomeContracts",
)?.body as VoiceOutcomeContractSuiteReport | undefined;
const outcomeContractEvidenceReport = outcomeContractReport
  ? evaluateVoiceOutcomeContractEvidence(outcomeContractReport, {
      maxFailed: 0,
      maxIssues: 0,
      minContracts: 5,
      minHandoffs: 1,
      minIntegrationEvents: 5,
      minOperationsRecordHrefs: 5,
      minReviews: 5,
      minSessions: 5,
      minTasks: 4,
      requiredContractIds: [
        "completed-call-artifacts",
        "escalation-call-artifacts",
        "no-answer-call-artifacts",
        "transfer-call-artifacts",
        "voicemail-call-artifacts",
      ],
      requireOperationRecordHrefs: true,
    })
  : undefined;
const outcomeContractEvidenceAssertion: JsonAssertionResult =
  outcomeContractReport
    ? {
        kind: "json-assertion",
        name: "outcomeContractEvidence",
        ok: outcomeContractEvidenceReport?.ok === true,
        summary: outcomeContractEvidenceReport as unknown as Record<
          string,
          unknown
        >,
      }
    : {
        kind: "json-assertion",
        name: "outcomeContractEvidence",
        ok: false,
        summary: {
          issues: ["Missing outcomeContracts proof result body."],
        },
      };
const simulationSuiteReport = proofResults.find(
  (result) => result.name === "simulationSuite",
)?.body as VoiceSimulationSuiteReport | undefined;
const simulationSuiteEvidenceReport = simulationSuiteReport
  ? evaluateVoiceSimulationSuiteEvidence(simulationSuiteReport, {
      maxActions: 0,
      maxFailed: 0,
      minPassed: 5,
      minSections: 5,
      requiredSections: [
        "fixtures",
        "outcomes",
        "scenarios",
        "sessions",
        "tools",
      ],
      sectionMinimums: {
        fixtures: 1,
        outcomes: 5,
        scenarios: 3,
        sessions: 1,
        tools: 3,
      },
    })
  : undefined;
const simulationSuiteEvidenceAssertion: JsonAssertionResult =
  simulationSuiteReport
    ? {
        kind: "json-assertion",
        name: "simulationSuiteEvidence",
        ok: simulationSuiteEvidenceReport?.ok === true,
        summary: simulationSuiteEvidenceReport as unknown as Record<
          string,
          unknown
        >,
      }
    : {
        kind: "json-assertion",
        name: "simulationSuiteEvidence",
        ok: false,
        summary: {
          issues: ["Missing simulationSuite proof result body."],
        },
      };
const observabilityExportDeliveryHistory = proofResults.find(
  (result) => result.name === "observabilityExportDeliveryHistory",
)?.body as VoiceObservabilityExportDeliveryHistory | undefined;
const observabilityExportDeliveryReport = observabilityExportDeliveryHistory
  ? evaluateVoiceObservabilityExportDeliveryEvidence(
      observabilityExportDeliveryHistory,
      {
        maxFailed: 0,
        maxFailedExportReceipts: 0,
        maxFailedReceipts: 0,
        maxLatestSuccessAgeMs: 2 * 60 * 60 * 1000,
        minDelivered: 1,
        minReceipts: 1,
        minTotalDestinations: 1,
        requiredDestinationKinds: ["file"],
      },
    )
  : undefined;
const observabilityExportDeliveryAssertion: JsonAssertionResult =
  observabilityExportDeliveryHistory
    ? {
        kind: "json-assertion",
        name: "observabilityExportDeliveryEvidence",
        ok: observabilityExportDeliveryReport?.ok === true,
        summary: observabilityExportDeliveryReport as unknown as Record<
          string,
          unknown
        >,
      }
    : {
        kind: "json-assertion",
        name: "observabilityExportDeliveryEvidence",
        ok: false,
        summary: {
          issues: [
            "Missing observabilityExportDeliveryHistory proof result body.",
          ],
        },
      };
const observabilityExportReplay = proofResults.find(
  (result) => result.name === "observabilityExportReplay",
)?.body as VoiceObservabilityExportReplayReport | undefined;
const observabilityExportReplayReport = observabilityExportReplay
  ? evaluateVoiceObservabilityExportReplayEvidence(observabilityExportReplay, {
      maxFailedArtifacts: 0,
      maxFailedDeliveryDestinations: 0,
      maxIssues: 0,
      maxValidationIssues: 0,
      minArtifacts: 1,
      minDeliveryDestinations: 1,
      requiredRecordKinds: ["artifact-index", "delivery-receipt", "manifest"],
    })
  : undefined;
const observabilityExportReplayAssertion: JsonAssertionResult =
  observabilityExportReplay
    ? {
        kind: "json-assertion",
        name: "observabilityExportReplayEvidence",
        ok: observabilityExportReplayReport?.ok === true,
        summary: observabilityExportReplayReport as unknown as Record<
          string,
          unknown
        >,
      }
    : {
        kind: "json-assertion",
        name: "observabilityExportReplayEvidence",
        ok: false,
        summary: {
          issues: ["Missing observabilityExportReplay proof result body."],
        },
      };
const proofTrendReport = proofResults.find(
  (result) => result.name === "proofTrends",
)?.body as VoiceProofTrendReport | undefined;
const proofTrendEvidenceReport = proofTrendReport
  ? evaluateVoiceProofTrendEvidence(proofTrendReport, {
      maxAgeMs: 2 * 60 * 60 * 1000,
      maxLiveP95Ms: 800,
      maxProviderP95Ms: 4_500,
      maxRuntimeBackpressureEvents: 0,
      maxRuntimeFirstAudioLatencyMs: 600,
      maxRuntimeInterruptionP95Ms: 300,
      maxRuntimeJitterMs: 30,
      maxRuntimeTimestampDriftMs: 800,
      maxTurnP95Ms: 700,
      minCycles: 6,
      minLiveLatencySamples: 50,
      minProviderSloEventsWithLatency: 6,
      minRuntimeChannelSamples: 4,
      minTurnLatencySamples: 10,
    })
  : undefined;
const proofTrendEvidenceAssertion: JsonAssertionResult = proofTrendReport
  ? {
      kind: "json-assertion",
      name: "proofTrendEvidence",
      ok: proofTrendEvidenceReport?.ok === true,
      summary: proofTrendEvidenceReport as unknown as Record<string, unknown>,
    }
  : {
      kind: "json-assertion",
      name: "proofTrendEvidence",
      ok: false,
      summary: {
        issues: ["Missing proofTrends proof result body."],
      },
    };
const proofTrendRecommendations = proofResults.find(
  (result) => result.name === "proofTrendRecommendations",
)?.body as VoiceProofTrendRecommendationReport | undefined;
const builtProofTrendRecommendations = proofTrendReport
  ? buildVoiceProofTrendRecommendationReport(proofTrendReport)
  : undefined;
const proofTrendRecommendationReport =
  proofTrendRecommendations ?? builtProofTrendRecommendations;
const proofTrendRecommendationIssues = [
  !proofTrendRecommendationReport
    ? "Missing proof trend recommendation report."
    : undefined,
  proofTrendRecommendationReport &&
  proofTrendRecommendationReport.summary.keepCurrentProviderPath !== true
    ? "Expected proof trend recommendations to keep the current provider path."
    : undefined,
  proofTrendRecommendationReport &&
  proofTrendRecommendationReport.summary.keepCurrentRuntimeChannel !== true
    ? "Expected proof trend recommendations to keep the current runtime channel."
    : undefined,
  proofTrendRecommendationReport &&
  !proofTrendRecommendationReport.recommendations.some(
    (item) => item.surface === "provider-path" && item.status === "pass",
  )
    ? "Missing passing provider-path recommendation."
    : undefined,
  proofTrendRecommendationReport &&
  !proofTrendRecommendationReport.recommendations.some(
    (item) => item.surface === "runtime-channel" && item.status === "pass",
  )
    ? "Missing passing runtime-channel recommendation."
    : undefined,
  proofTrendRecommendationReport &&
  (proofTrendRecommendationReport.profiles?.length ?? 0) < 4
    ? "Expected at least four benchmark-profile recommendations."
    : undefined,
  proofTrendRecommendationReport &&
  ![
    "meeting-recorder",
    "support-agent",
    "appointment-scheduler",
    "noisy-phone-call",
  ].every(
    (profileId) =>
      proofTrendRecommendationReport.profiles?.some(
        (profile) => profile.id === profileId && profile.status === "pass",
      ) === true,
  )
    ? "Expected meeting-recorder, support-agent, appointment-scheduler, and noisy-phone-call profiles to pass."
    : undefined,
].filter((issue): issue is string => typeof issue === "string");
const proofTrendRecommendationAssertion: JsonAssertionResult = {
  kind: "json-assertion",
  name: "proofTrendRecommendationEvidence",
  ok: proofTrendRecommendationIssues.length === 0,
  summary: {
    issues: proofTrendRecommendationIssues,
    profiles: proofTrendRecommendationReport?.profiles,
    recommendations: proofTrendRecommendationReport?.recommendations,
    status: proofTrendRecommendationReport?.status,
    summary: proofTrendRecommendationReport?.summary,
  },
};
const realCallEvidenceRuntimeReport = proofResults.find(
  (result) => result.name === "realCallEvidenceRuntime",
)?.body as VoiceRealCallEvidenceRuntimeReport | undefined;
const realCallEvidenceRuntimeIssues = [
  !realCallEvidenceRuntimeReport
    ? "Missing real-call evidence runtime report."
    : undefined,
  realCallEvidenceRuntimeReport && realCallEvidenceRuntimeReport.ok !== true
    ? `Expected real-call evidence runtime to pass, found ${realCallEvidenceRuntimeReport.status}.`
    : undefined,
  realCallEvidenceRuntimeReport &&
  realCallEvidenceRuntimeReport.summary.storedEvidence < 2
    ? `Expected at least two stored real-call evidence records, found ${realCallEvidenceRuntimeReport.summary.storedEvidence}.`
    : undefined,
  realCallEvidenceRuntimeReport &&
  realCallEvidenceRuntimeReport.summary.sessions < 2
    ? `Expected at least two real-call evidence sessions, found ${realCallEvidenceRuntimeReport.summary.sessions}.`
    : undefined,
  realCallEvidenceRuntimeReport &&
  realCallEvidenceRuntimeReport.summary.profiles < 2
    ? `Expected at least two real-call evidence profiles, found ${realCallEvidenceRuntimeReport.summary.profiles}.`
    : undefined,
].filter((issue): issue is string => typeof issue === "string");
const realCallEvidenceRuntimeAssertion: JsonAssertionResult = {
  kind: "json-assertion",
  name: "realCallEvidenceRuntimeEvidence",
  ok: realCallEvidenceRuntimeIssues.length === 0,
  summary: {
    issues: realCallEvidenceRuntimeIssues,
    report: realCallEvidenceRuntimeReport
      ? {
          generatedAt: realCallEvidenceRuntimeReport.generatedAt,
          source: realCallEvidenceRuntimeReport.source,
          status: realCallEvidenceRuntimeReport.status,
          summary: realCallEvidenceRuntimeReport.summary,
        }
      : undefined,
  },
};
const providerContractMatrix = proofResults.find(
  (result) => result.name === "providerContracts",
)?.body as VoiceProviderContractMatrixReport | undefined;
const providerContractMatrixEvidenceReport = providerContractMatrix
  ? evaluateVoiceProviderContractMatrixEvidence(providerContractMatrix, {
      maxFailed: 0,
      maxStatus: "pass",
      maxWarned: 0,
      minRows: 2,
      requiredCheckKeys: [
        "configured",
        "env",
        "latencyBudget",
        "fallback",
        "streaming",
        "capabilities",
      ],
      requiredKinds: ["llm", "stt", "tts"],
      requiredProviders: ["deepgram", "openai"],
      selectedKinds: ["llm", "stt", "tts"],
    })
  : undefined;
const providerContractMatrixEvidenceAssertion: JsonAssertionResult =
  providerContractMatrix
    ? {
        kind: "json-assertion",
        name: "providerContractMatrixEvidence",
        ok: providerContractMatrixEvidenceReport?.ok === true,
        summary: providerContractMatrixEvidenceReport as unknown as Record<
          string,
          unknown
        >,
      }
    : {
        kind: "json-assertion",
        name: "providerContractMatrixEvidence",
        ok: false,
        summary: {
          issues: ["Missing providerContracts proof result body."],
        },
      };
const providerStackReport = productionReadinessReport?.summary.providerStack as
  | VoiceProviderStackCapabilityGapReport
  | undefined;
const providerStackEvidenceReport = providerStackReport
  ? evaluateVoiceProviderStackEvidence(providerStackReport, {
      maxMissing: 0,
      maxStatus: "pass",
      requiredCapabilities: {
        llm: ["tool calling", "JSON result shaping", "fallback routing"],
        stt: ["realtime STT", "VAD events"],
        tts: ["streaming speech", "barge-in friendly"],
      },
      requiredKinds: ["llm", "stt", "tts"],
      requiredProviders: ["deepgram", "openai"],
    })
  : undefined;
const providerStackEvidenceAssertion: JsonAssertionResult = providerStackReport
  ? {
      kind: "json-assertion",
      name: "providerStackEvidence",
      ok: providerStackEvidenceReport?.ok === true,
      summary: providerStackEvidenceReport as unknown as Record<
        string,
        unknown
      >,
    }
  : {
      kind: "json-assertion",
      name: "providerStackEvidence",
      ok: false,
      summary: {
        issues: ["Missing productionReadiness.summary.providerStack."],
      },
    };
const providerRoutingContractReports = [
  proofResults.find((result) => result.name === "providerRoutingContract")
    ?.body,
  proofResults.find((result) => result.name === "sttProviderRoutingContract")
    ?.body,
  proofResults.find((result) => result.name === "ttsProviderRoutingContract")
    ?.body,
].filter(Boolean) as VoiceProviderRoutingContractReport[];
const providerRoutingContractEvidenceReport =
  providerRoutingContractReports.length > 0
    ? evaluateVoiceProviderRoutingContractEvidence(
        providerRoutingContractReports,
        {
          maxFailed: 0,
          maxIssues: 0,
          minContracts: 3,
          minEvents: 3,
          requiredKinds: ["llm", "stt", "tts"],
          requiredProviders: ["deepgram", "openai"],
          requiredScenarioIds: [
            "provider-routing-contract",
            "stt-provider-routing-contract",
            "tts-provider-routing-contract",
          ],
          requiredSelectedProviders: ["deepgram", "openai"],
        },
      )
    : undefined;
const providerRoutingContractEvidenceAssertion: JsonAssertionResult =
  createVoiceEvidenceAssertion({
    evidence: providerRoutingContractEvidenceReport,
    missingIssue: "Missing provider routing contract proof result body.",
    name: "providerRoutingContractEvidence",
  });
const agentSquadContractReport = proofResults.find(
  (result) => result.name === "agentSquadContract",
)?.body as VoiceAgentSquadContractReport | undefined;
const agentSquadContractEvidenceReport = agentSquadContractReport
  ? evaluateVoiceAgentSquadContractEvidence([agentSquadContractReport], {
      maxFailed: 0,
      maxIssues: 0,
      minContracts: 1,
      minHandoffs: 2,
      requiredContractIds: ["demo-billing-route"],
      requiredFinalAgentIds: ["billing", "support"],
      requiredHandoffStatuses: ["allowed", "blocked"],
      requiredHandoffTargets: ["billing", "legal"],
      requiredScenarioIds: ["demo-billing-route"],
    })
  : undefined;
const agentSquadContractEvidenceAssertion: JsonAssertionResult =
  agentSquadContractEvidenceReport
    ? {
        kind: "json-assertion",
        name: "agentSquadContractEvidence",
        ok: agentSquadContractEvidenceReport.ok,
        summary: agentSquadContractEvidenceReport as unknown as Record<
          string,
          unknown
        >,
      }
    : {
        kind: "json-assertion",
        name: "agentSquadContractEvidence",
        ok: false,
        summary: {
          issues: ["Missing agentSquadContract proof result body."],
        },
      };
const vapiCoverage = buildVapiCoverage([
  ...seedResults,
  ...proofResults,
  ...commandResults,
]);
const platformCoverageReport = evaluateVoicePlatformCoverage(
  buildVoicePlatformCoverageSummary({
    coverage: vapiCoverage,
    generatedAt,
    ok: vapiCoverage.every((surface) => surface.status === "pass"),
    outputDir,
    runId,
    source: "proof-pack-runtime",
  }),
  {
    maxFailedSurfaces: 0,
    minSurfaces: 13,
    requiredEvidence: [
      "productionReadiness",
      "operationsRecord",
      "providerSlo",
      "providerOrchestration",
      "competitiveCoverage",
      "observabilityExport",
      "liveGuardrailsRuntime",
    ],
    requiredSurfaces: [
      "Call logs and incident handoff",
      "Guardrails and policies",
      "Logs export / SIEM / warehouse",
      "Monitoring and release gates",
      "Web voice assistant",
    ],
  },
);
const platformCoverageAssertion: JsonAssertionResult = {
  kind: "json-assertion",
  name: "platformCoverageEvidence",
  ok: platformCoverageReport.ok,
  summary: platformCoverageReport as unknown as Record<string, unknown>,
};
const competitiveCoverage = proofResults.find(
  (result) => result.name === "competitiveCoverage",
)?.body as VoiceCompetitiveCoverageReport | undefined;
const competitiveCoverageReport = competitiveCoverage
  ? evaluateVoiceCompetitiveCoverage(competitiveCoverage, {
      maxFailedSurfaces: 0,
      maxMissingSurfaces: 0,
      minAdvantageSurfaces: 8,
      minSurfaces: 18,
      requireOperationsRecordLinks: true,
      requireReadinessGates: true,
      requiredEvidence: [
        "failureReplay",
        "operationsRecord",
        "providerDecisions",
        "providerOrchestration",
        "providerSlo",
        "productionReadiness",
      ],
      requiredSurfaces: [
        "Browser voice agent",
        "Provider choice and fallback",
        "Unified call log / operations record",
        "SIP/media infrastructure",
      ],
    })
  : undefined;
const competitiveCoverageAssertion: JsonAssertionResult = competitiveCoverage
  ? {
      kind: "json-assertion",
      name: "competitiveCoverageEvidence",
      ok: competitiveCoverageReport?.ok === true,
      summary: competitiveCoverageReport as unknown as Record<string, unknown>,
    }
  : {
      kind: "json-assertion",
      name: "competitiveCoverageEvidence",
      ok: false,
      summary: {
        issues: ["Missing competitiveCoverage proof result body."],
      },
    };
const realtimeChannel = proofResults.find(
  (result) => result.name === "realtimeChannel",
)?.body as VoiceRealtimeChannelReport | undefined;
const realtimeChannelEvidenceReport = realtimeChannel
  ? evaluateVoiceRealtimeChannelEvidence(realtimeChannel, {
      maxFirstAudioLatencyMs: 800,
      minAssistantAudioSamples: 1,
      minInputAudioSamples: 1,
      requireBrowserCapture: true,
      requireOperationsRecordHref: true,
      requirePass: true,
      requireReadinessHref: true,
    })
  : undefined;
const realtimeChannelEvidenceAssertion: JsonAssertionResult = realtimeChannel
  ? {
      kind: "json-assertion",
      name: "realtimeChannelEvidence",
      ok: realtimeChannelEvidenceReport?.ok === true,
      summary: realtimeChannelEvidenceReport as unknown as Record<
        string,
        unknown
      >,
    }
  : {
      kind: "json-assertion",
      name: "realtimeChannelEvidence",
      ok: false,
      summary: {
        issues: ["Missing realtimeChannel proof result body."],
      },
    };
const mediaPipelineCalibration = proofResults.find(
  (result) => result.name === "mediaPipelineCalibration",
)?.body as VoiceMediaPipelineReport | undefined;
const mediaPipelineCalibrationEvidence = mediaPipelineCalibration
  ? evaluateVoiceMediaPipelineEvidence(mediaPipelineCalibration, {
      maxFirstAudioLatencyMs: 800,
      maxInterruptionLatencyMs: 250,
      maxMediaBackpressureEvents: 0,
      maxMediaGapMs: 800,
      maxMediaJitterMs: 40,
      maxMediaTimestampDriftMs: 800,
      maxTransportBackpressureEvents: 0,
      minAssistantAudioFrames: 1,
      minInputAudioFrames: 1,
      minMediaSpeechRatio: 0.8,
      minProcessorGraphEmittedFrames: 5,
      minProcessorGraphNodes: 3,
      minTransportInputFrames: 1,
      minTransportOutputFrames: 1,
      minTraceLinkedFrames: 4,
      minVadSegments: 1,
      requireInterruptionFrame: true,
      requirePass: true,
      requireProcessorGraph: true,
      requireQualityPass: true,
      requireResamplingReady: true,
      requireTransportConnected: true,
    })
  : undefined;
const mediaPipelineArtifactWriteResult = mediaPipelineCalibration
  ? await writeVoiceMediaPipelineArtifacts({
      dir: outputDir,
      hrefBase: "./",
      report: mediaPipelineCalibration,
    })
  : undefined;
const mediaPipelineCalibrationAssertion: JsonAssertionResult = {
  kind: "json-assertion",
  name: "mediaPipelineCalibration",
  ok: mediaPipelineCalibrationEvidence?.ok === true,
  summary: mediaPipelineCalibration
    ? {
        ...summarizeVoiceMediaPipelineReport(mediaPipelineCalibration, {
          artifacts: mediaPipelineArtifactWriteResult?.hrefs,
        }),
        proofIssues: mediaPipelineCalibrationEvidence?.issues ?? [],
      }
    : {
        issues: ["Missing mediaPipelineCalibration proof result body."],
      },
};
const realtimeProviderContracts = proofResults.find(
  (result) => result.name === "realtimeProviderContracts",
)?.body as VoiceRealtimeProviderContractMatrixReport | undefined;
const realtimeProviderContractEvidenceReport = realtimeProviderContracts
  ? evaluateVoiceRealtimeProviderContractEvidence(realtimeProviderContracts, {
      maxFailed: 0,
      maxStatus: "warn",
      maxWarned: 2,
      minRows: 2,
      requiredCheckKeys: [
        "configured",
        "env",
        "capabilities",
        "realtimeChannel",
        "latencyBudget",
        "fallback",
        "traceEvidence",
        "readiness",
      ],
      requiredProviders: ["gemini-live", "openai-realtime"],
      requireSelected: true,
    })
  : undefined;
const realtimeProviderContractEvidenceAssertion: JsonAssertionResult =
  realtimeProviderContracts
    ? {
        kind: "json-assertion",
        name: "realtimeProviderContractEvidence",
        ok: realtimeProviderContractEvidenceReport?.ok === true,
        summary: realtimeProviderContractEvidenceReport as unknown as Record<
          string,
          unknown
        >,
      }
    : {
        kind: "json-assertion",
        name: "realtimeProviderContractEvidence",
        ok: false,
        summary: {
          issues: ["Missing realtimeProviderContracts proof result body."],
        },
      };
const ok =
  seedResults.every((result) => result.ok) &&
  proofResults.every((result) => result.ok) &&
  commandResults.every((result) => result.ok) &&
  guardrailEvidenceAssertion.ok &&
  providerSloEvidenceAssertion.ok &&
  providerOrchestrationEvidenceAssertion.ok &&
  providerDecisionEvidenceAssertion.ok &&
  failureReplayEvidenceAssertion.ok &&
  operationsRecordProviderDecisionEvidenceAssertion.ok &&
  productionReadinessEvidenceAssertion.ok &&
  browserCallProfileEvidenceAssertion.ok &&
  campaignReadinessEvidenceAssertion.ok &&
  campaignDialerProofEvidenceAssertion.ok &&
  dataControlEvidenceAssertion.ok &&
  toolContractEvidenceAssertion.ok &&
  outcomeContractEvidenceAssertion.ok &&
  simulationSuiteEvidenceAssertion.ok &&
  observabilityExportDeliveryAssertion.ok &&
  observabilityExportReplayAssertion.ok &&
  liveOpsEvidenceAssertion.ok &&
  liveOpsControlEvidenceAssertion.ok &&
  phoneAssistantEvidenceAssertion.ok &&
  phoneCallControlEvidenceAssertion.ok &&
  telephonyWebhookIdempotencyEvidenceAssertion.ok &&
  telephonyWebhookNormalizationEvidenceAssertion.ok &&
  telephonyWebhookVerificationEvidenceAssertion.ok &&
  proofTrendEvidenceAssertion.ok &&
  proofTrendRecommendationAssertion.ok &&
  realCallEvidenceRuntimeAssertion.ok &&
  providerContractMatrixEvidenceAssertion.ok &&
  providerRoutingContractEvidenceAssertion.ok &&
  realtimeChannelEvidenceAssertion.ok &&
  mediaPipelineCalibrationAssertion.ok &&
  realtimeProviderContractEvidenceAssertion.ok &&
  providerStackEvidenceAssertion.ok &&
  productionReadinessGateExplanationAssertion.ok &&
  agentSquadContractEvidenceAssertion.ok &&
  platformCoverageAssertion.ok &&
  competitiveCoverageAssertion.ok;

const summary = {
  agentSquadContractEvidenceAssertion,
  baseUrl,
  campaignDialerProofEvidenceAssertion,
  campaignReadinessEvidenceAssertion,
  competitiveCoverageAssertion,
  dataControlEvidenceAssertion,
  generatedAt,
  failureReplayEvidenceAssertion,
  guardrailEvidenceAssertion,
  liveOpsControlEvidenceAssertion,
  liveOpsEvidenceAssertion,
  observabilityExportDeliveryAssertion,
  observabilityExportReplayAssertion,
  ok,
  operationsRecordProviderDecisionEvidenceAssertion,
  outcomeContractEvidenceAssertion,
  platformCoverageAssertion,
  phoneAssistantEvidenceAssertion,
  phoneCallControlEvidenceAssertion,
  telephonyWebhookIdempotencyEvidenceAssertion,
  telephonyWebhookNormalizationEvidenceAssertion,
  telephonyWebhookVerificationEvidenceAssertion,
  productionReadinessEvidenceAssertion,
  browserCallProfileEvidenceAssertion,
  productionReadinessGateExplanationAssertion,
  proofTrendEvidenceAssertion,
  proofTrendRecommendationAssertion,
  realCallEvidenceRuntimeAssertion,
  providerContractMatrixEvidenceAssertion,
  providerDecisionEvidenceAssertion,
  providerOrchestrationEvidenceAssertion,
  mediaPipelineCalibrationAssertion,
  realtimeChannelEvidenceAssertion,
  realtimeProviderContractEvidenceAssertion,
  providerRoutingContractEvidenceAssertion,
  providerSloEvidenceAssertion,
  providerStackEvidenceAssertion,
  simulationSuiteEvidenceAssertion,
  toolContractEvidenceAssertion,
  commandResults: commandResults.map(({ body: _body, ...result }) => result),
  outputDir,
  proofResults: proofResults.map(({ body: _body, ...result }) => result),
  runId,
  seedResults: seedResults.map(({ body: _body, ...result }) => result),
  timeoutMs,
  vapiCoverage,
};
const markdown = renderMarkdown({
  agentSquadContractEvidenceAssertion,
  baseUrl,
  campaignDialerProofEvidenceAssertion,
  campaignReadinessEvidenceAssertion,
  competitiveCoverageAssertion,
  dataControlEvidenceAssertion,
  generatedAt,
  failureReplayEvidenceAssertion,
  guardrailEvidenceAssertion,
  liveOpsControlEvidenceAssertion,
  liveOpsEvidenceAssertion,
  observabilityExportDeliveryAssertion,
  observabilityExportReplayAssertion,
  ok,
  operationsRecordProviderDecisionEvidenceAssertion,
  outcomeContractEvidenceAssertion,
  platformCoverageAssertion,
  phoneAssistantEvidenceAssertion,
  phoneCallControlEvidenceAssertion,
  telephonyWebhookIdempotencyEvidenceAssertion,
  telephonyWebhookNormalizationEvidenceAssertion,
  telephonyWebhookVerificationEvidenceAssertion,
  productionReadinessEvidenceAssertion,
  browserCallProfileEvidenceAssertion,
  productionReadinessGateExplanationAssertion,
  proofTrendEvidenceAssertion,
  proofTrendRecommendationAssertion,
  realCallEvidenceRuntimeAssertion,
  providerContractMatrixEvidenceAssertion,
  providerDecisionEvidenceAssertion,
  providerOrchestrationEvidenceAssertion,
  mediaPipelineCalibrationAssertion,
  realtimeChannelEvidenceAssertion,
  realtimeProviderContractEvidenceAssertion,
  providerRoutingContractEvidenceAssertion,
  providerSloEvidenceAssertion,
  providerStackEvidenceAssertion,
  simulationSuiteEvidenceAssertion,
  toolContractEvidenceAssertion,
  commandResults,
  outputDir,
  proofResults,
  runId,
  seedResults,
  vapiCoverage,
});

await writeArtifact("summary.json", `${JSON.stringify(summary, null, 2)}\n`);
await writeArtifact("proof-pack.md", markdown);
await Bun.write(
  join(outputRoot, "latest.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);
await Bun.write(join(outputRoot, "latest.md"), markdown);

console.log(JSON.stringify(summary, null, 2));

if (!ok) {
  process.exit(1);
}
