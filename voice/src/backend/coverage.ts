import { type SavedIntake } from "../shared/demo";
import { networking } from "@absolutejs/absolute";
import {
  buildVoiceCompetitiveCoverageReport,
  buildVoiceGuardrailReport,
  createVoiceToolRuntimeContractDefaults,
  type VoiceCompetitiveCoverageReport,
  type VoiceCompetitiveSurface,
  type VoiceGuardrailDecision,
  type VoiceSessionRecord,
  type VoiceToolContractDefinition,
  voice,
  voiceGuardrailPolicyPresets,
} from "@absolutejs/voice";
import {
  createContractTurn,
  intakeClassifierTool,
  lifecycleRouterTool,
  reviewTaskRecorderTool,
} from "./agentSquad";
import { escapeHtml } from "./helpers";
import { assistant } from "./profileSwitch";
import {
  readLatestLiveGuardrailRuntimeProof,
  readLatestVapiCoverage,
  readLatestVapiCoverageSummary,
  renderCoverageStatus,
  renderSustainedProofStatus,
} from "./readinessReports";
import {
  latestProofPackJsonPath,
  readLatestProofTrends,
} from "./realCallEvidence";
import { demoIncidentSessionId } from "./stores";

const demoToolContracts = [
  {
    cases: [
      {
        args: {},
        context: { query: { scenarioId: "general" } },
        expect: {
          expectedResult: { mode: "general" },
          expectIdempotent: true,
          expectStatus: "ok",
          expectTimedOut: false,
        },
        id: "general-mode",
        label: "Classifies general intake context",
      },
      {
        args: {},
        context: { query: { scenarioId: "guided" } },
        expect: {
          expectedResult: { mode: "guided" },
          expectIdempotent: true,
          expectStatus: "ok",
          expectTimedOut: false,
        },
        id: "guided-mode",
        label: "Classifies guided intake context",
      },
    ],
    defaultRuntime: createVoiceToolRuntimeContractDefaults(),
    description:
      "Keeps the assistant intake classifier deterministic across route contexts.",
    id: "intake-classifier",
    label: "Intake classifier",
    tool: intakeClassifierTool,
  },
  {
    cases: [
      {
        args: {},
        expect: {
          expectedResult: {
            text: "Please transfer me to support escalation.",
          },
          expectIdempotent: true,
          expectStatus: "ok",
          expectTimedOut: false,
        },
        id: "transfer-utterance",
        label: "Preserves lifecycle routing utterance",
        turn: createContractTurn(
          "tool-contract-lifecycle-transfer",
          "Please transfer me to support escalation.",
        ),
      },
    ],
    defaultRuntime: createVoiceToolRuntimeContractDefaults(),
    description:
      "Proves lifecycle routing tools receive the exact committed caller text.",
    id: "lifecycle-router",
    label: "Lifecycle router",
    tool: lifecycleRouterTool,
  },
  {
    cases: [
      {
        args: {},
        expect: {
          expectedResult: {
            events: true,
            reviews: true,
            tasks: true,
          },
          expectIdempotent: true,
          expectStatus: "ok",
          expectTimedOut: false,
        },
        id: "store-capabilities",
        label: "Reports review/task/event store capabilities",
      },
    ],
    defaultRuntime: createVoiceToolRuntimeContractDefaults(),
    description:
      "Documents the ops stores the assistant can use for post-call artifacts.",
    id: "review-task-recorder",
    label: "Review/task recorder",
    tool: reviewTaskRecorderTool,
  },
] satisfies Array<
  VoiceToolContractDefinition<
    unknown,
    VoiceSessionRecord,
    Record<string, unknown>,
    unknown,
    SavedIntake
  >
>;

const vapiMigrationItems = [
  {
    absolute:
      "Framework voice route with mic UI, transcripts, reconnect state, barge-in, and live latency proof.",
    concept: "Web voice assistant",
    proofHref: "/react",
    proofLabel: "Open React demo",
    statusHref: "/api/production-readiness",
  },
  {
    absolute:
      "Carrier-owned Twilio, Telnyx, or Plivo setup with copy-ready URLs, carrier matrix, and smoke proof.",
    concept: "Phone assistant",
    proofHref: "/phone-agent",
    proofLabel: "Open phone setup",
    statusHref: "/api/voice/phone/setup",
  },
  {
    absolute:
      "Code-owned specialist graph with handoff policy, context policy, per-specialist tools, and trace evidence.",
    concept: "Squads / multi-assistant routing",
    proofHref: "/agent-squad-contract",
    proofLabel: "Open squad contract",
    statusHref: "/api/agent-squad-contract",
  },
  {
    absolute:
      "Agent tools, deterministic tool contracts, audit events, integration events, and operations-record links.",
    coverageSurface: "Tools and functions",
    concept: "Tools / functions",
    proofHref: "/tool-contracts",
    proofLabel: "Open tool contracts",
    statusHref: "/api/tool-contracts",
  },
  {
    absolute:
      "Local guardrail policies block unsafe assistant output, warn/redact sensitive transcript data, and produce traceable JSON/Markdown proof.",
    coverageSurface: "Guardrails and policies",
    concept: "Guardrails / policies",
    proofHref: "/voice/guardrails",
    proofLabel: "Open guardrails proof",
    statusHref: "/api/voice/guardrails",
  },
  {
    absolute:
      "One self-hosted operations record and session-observability page linking transcript, turn waterfalls, replay, provider choices, tools, handoffs, reviews, tasks, audit, and delivery attempts.",
    coverageSurface: "Call logs and incident handoff",
    concept: "Call logs",
    proofHref: "/voice-observability/demo-incident-bundle",
    proofLabel: "Open session observability",
    statusHref: "/api/voice/session-observability/demo-incident-bundle",
  },
  {
    absolute:
      "Post-call analysis proof validates extracted fields, required follow-up tasks, delivery events, and the linked operations record.",
    coverageSurface: "Post-call analysis",
    concept: "Post-call analysis",
    proofHref: "/voice/post-call-analysis",
    proofLabel: "Open post-call proof",
    statusHref: "/api/voice/post-call-analysis",
  },
  {
    absolute:
      "Readiness gates, recovery report, provider SLOs, delivery runtime, and deploy-gate JSON.",
    coverageSurface: "Monitoring and release gates",
    concept: "Monitoring / issue detection",
    proofHref: "/production-readiness",
    proofLabel: "Open readiness",
    statusHref: "/api/production-readiness",
  },
  {
    absolute:
      "Scenario simulations, fixture evals, tool contracts, outcome contracts, provider routing contracts, and baseline comparisons.",
    concept: "Simulation testing",
    proofHref: "/voice/simulations",
    proofLabel: "Open simulations",
    statusHref: "/api/voice/simulations",
  },
  {
    absolute:
      "Self-hosted recipient import, consent/dedupe, retries, quiet hours, rate limits, carrier dry-run proof, and campaign readiness.",
    concept: "Outbound campaigns",
    proofHref: "/voice/campaigns",
    proofLabel: "Open campaigns",
    statusHref: "/api/voice/campaigns/readiness-proof",
  },
  {
    absolute:
      "Pause, resume, takeover, injected operator instructions, action-center helpers, and operator action audit history.",
    concept: "Live operator controls",
    proofHref: "/ops-console",
    proofLabel: "Open ops console",
    statusHref: "/api/voice/ops-recovery",
  },
  {
    absolute:
      "Customer-owned storage, redaction defaults, retention dry-run/apply, redacted audit export, and provider-key recommendations.",
    concept: "Compliance controls",
    proofHref: "/data-control",
    proofLabel: "Open data control",
    statusHref: "/data-control.json",
  },
  {
    absolute:
      "Manifest, artifact index, delivery receipts, replay proof, and file/webhook/S3/SQLite/Postgres export destinations.",
    concept: "Logs export / SIEM / warehouse",
    proofHref: "/voice/observability-export",
    proofLabel: "Open export",
    statusHref: "/api/voice/observability-export/replay",
  },
] satisfies Array<{
  absolute: string;
  concept: string;
  coverageSurface?: string;
  proofHref: string;
  proofLabel: string;
  statusHref: string;
}>;

const competitiveCoverageSurfaces = [
  {
    buyerNeed: "Ship a browser voice agent inside an owned AbsoluteJS app.",
    competitors: ["Vapi", "Pipecat"],
    coverage: "covered",
    depth: "advantage",
    evidence: [
      {
        href: "/switching-from-vapi",
        kind: "docs",
        name: "switchingFromVapi",
        status: "pass",
      },
      {
        href: "/production-readiness",
        kind: "readiness",
        name: "productionReadiness",
        required: true,
        status: "pass",
      },
      { href: "/traces", kind: "route", name: "traceTimeline", status: "pass" },
    ],
    frameworkPrimitives: ["react", "vue", "svelte", "angular", "html", "htmx"],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Browser voice agent",
    why: "Framework-native hooks, composables, services, widgets, reconnect, barge-in, traces, and readiness proof are app-owned instead of widget-only.",
    nextMove: "Keep first-success docs current as proof routes evolve.",
  },
  {
    buyerNeed:
      "Create and verify phone agents through the team's own carrier account.",
    competitors: ["Vapi", "Retell", "LiveKit"],
    coverage: "covered",
    depth: "parity",
    evidence: [
      {
        href: "/api/voice/phone/setup?format=html",
        kind: "route",
        name: "phoneSetup",
        required: true,
        status: "pass",
      },
      {
        href: "/api/voice/telephony/webhook-security",
        kind: "readiness",
        name: "telephonyWebhookSecurity",
        required: true,
        status: "pass",
      },
      {
        href: "/voice/phone/smoke-contract",
        kind: "proof",
        name: "phoneSmoke",
        status: "pass",
      },
    ],
    frameworkPrimitives: ["server routes", "carrier setup JSON/HTML"],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Phone voice agent",
    why: "Carrier bridges, setup reports, webhook security, smoke proof, and outcome normalization are present, while hosted providers still win on click-to-buy-number provisioning.",
    nextMove:
      "Improve carrier setup UX without owning phone-number provisioning.",
  },
  {
    buyerNeed: "Compose specialist assistants with traceable handoffs.",
    competitors: ["Vapi"],
    coverage: "covered",
    depth: "parity",
    evidence: [
      {
        href: "/agent-squad-contract",
        kind: "proof",
        name: "agentSquadContract",
        required: true,
        status: "pass",
      },
      {
        href: "/traces",
        kind: "route",
        name: "agentHandoffTraces",
        status: "pass",
      },
    ],
    frameworkPrimitives: ["react", "vue", "svelte", "angular", "html"],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Squads / multi-assistant routing",
    why: "Agent Squad provides specialist routing, context policy, handoff summaries, durable state, traces, contracts, and framework-visible specialist state.",
    nextMove: "Keep specialist examples and operations-record links obvious.",
  },
  {
    buyerNeed:
      "Call tools and prove business outcomes before production traffic.",
    competitors: ["Vapi", "Retell", "Bland"],
    coverage: "covered",
    depth: "advantage",
    evidence: [
      {
        href: "/tool-contracts",
        kind: "proof",
        name: "toolContracts",
        required: true,
        status: "pass",
      },
      {
        href: "/outcome-contracts",
        kind: "proof",
        name: "outcomeContracts",
        required: true,
        status: "pass",
      },
    ],
    frameworkPrimitives: ["server routes", "contract reports"],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Tools and business actions",
    why: "Tool contracts, outcome contracts, audit hooks, ops tasks, integration events, and operation-linked failures are stronger for code-owned apps.",
    nextMove: "Add more real-session tool workflow recipes.",
  },
  {
    buyerNeed:
      "Enforce policy locally with traceable blocking and warning proof.",
    competitors: ["Bland", "Vapi"],
    coverage: "covered",
    depth: "advantage",
    evidence: [
      {
        href: "/voice/guardrails",
        kind: "proof",
        name: "guardrails",
        required: true,
        status: "pass",
      },
      {
        href: "/api/voice/guardrails.md",
        kind: "proof",
        name: "guardrailsMarkdown",
        status: "pass",
      },
    ],
    frameworkPrimitives: ["server routes", "runtime policy"],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Guardrails and policy enforcement",
    why: "Guardrails are code-owned runtime policies with blocking/warning proof, trace evidence, incident summaries, and proof-pack integration.",
    nextMove:
      "Keep recipes primitive-first instead of creating a policy builder.",
  },
  {
    buyerNeed:
      "Choose providers, route by surface, and prove fallback recovery.",
    competitors: ["Vapi", "Pipecat"],
    coverage: "covered",
    depth: "advantage",
    evidence: [
      {
        href: "/voice/provider-orchestration",
        kind: "readiness",
        name: "providerOrchestration",
        required: true,
        status: "pass",
      },
      {
        href: "/voice/provider-decisions",
        kind: "proof",
        name: "providerDecisions",
        required: true,
        status: "pass",
      },
      {
        href: "/voice/provider-slos",
        kind: "proof",
        name: "providerSlo",
        required: true,
        status: "pass",
      },
      {
        href: "/voice-operations/demo-incident-bundle",
        kind: "operations-record",
        name: "providerRecoveryOperationsRecord",
        status: "pass",
      },
      {
        href: "/voice-operations/demo-incident-bundle/failure-replay",
        kind: "failure-replay",
        name: "failureReplay",
        required: true,
        status: "pass",
      },
    ],
    frameworkPrimitives: [
      "server routes",
      "provider profiles",
      "trace reports",
    ],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Provider choice and fallback",
    why: "Provider profiles, cost/latency/quality routing, circuit breakers, SLOs, decision traces, fallback recovery, operations-record recovery evidence, and caller-heard failure replay are first-class.",
    nextMove:
      "Keep provider recovery and caller-heard replay visible as headline proof-pack advantages.",
  },
  {
    buyerNeed:
      "Monitor call quality and block bad deploys without a hosted dashboard.",
    competitors: ["Vapi", "Retell", "Bland"],
    coverage: "covered",
    depth: "advantage",
    evidence: [
      {
        href: "/production-readiness",
        kind: "readiness",
        name: "productionReadinessGate",
        required: true,
        status: "pass",
      },
      {
        href: "/ops-recovery",
        kind: "readiness",
        name: "opsRecovery",
        status: "pass",
      },
      {
        href: "/voice/proof-trends",
        kind: "proof",
        name: "proofTrends",
        status: "pass",
      },
    ],
    frameworkPrimitives: ["readiness routes", "ops routes", "proof trends"],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Monitoring, issues, and release gates",
    why: "Monitors, issues, notifier receipts, ops recovery, SLO calibration, proof trends, and production readiness are customer-owned.",
    nextMove: "Keep export/schema/readiness cohesion tight.",
  },
  {
    buyerNeed: "Open one call log and understand the full lifecycle.",
    competitors: ["Vapi", "Retell", "Bland"],
    coverage: "covered",
    depth: "advantage",
    evidence: [
      {
        href: "/voice-operations/demo-incident-bundle",
        kind: "operations-record",
        name: "operationsRecord",
        required: true,
        status: "pass",
      },
      {
        href: "/voice-operations/demo-incident-bundle/incident.md",
        kind: "proof",
        name: "incidentMarkdown",
        status: "pass",
      },
      {
        href: "/voice-operations/demo-incident-bundle/failure-replay",
        kind: "failure-replay",
        name: "failureReplay",
        required: true,
        status: "pass",
      },
      {
        href: "/voice-operations/demo-incident-bundle/failure-replay.md",
        kind: "proof",
        name: "failureReplayMarkdown",
        status: "pass",
      },
    ],
    frameworkPrimitives: [
      "server routes",
      "incident markdown",
      "failure replay",
    ],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Unified call log / operations record",
    why: "Operations records link trace, replay, transcript, provider decisions, tools, guardrails, handoffs, audit, reviews, tasks, delivery attempts, failure replay, and incident Markdown.",
    nextMove:
      "Keep every new proof surface linking back to operations records and failure replay where caller-heard context matters.",
  },
  {
    buyerNeed: "Extract post-call data and trigger follow-up workflow.",
    competitors: ["Vapi", "Retell", "Bland"],
    coverage: "covered",
    depth: "parity",
    evidence: [
      {
        href: "/voice/post-call-analysis",
        kind: "proof",
        name: "postCallAnalysis",
        required: true,
        status: "pass",
      },
      {
        href: "/voice-operations/demo-incident-bundle",
        kind: "operations-record",
        name: "postCallOperationsRecord",
        status: "pass",
      },
    ],
    frameworkPrimitives: ["server routes", "review/task/integration events"],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Post-call analysis and workflows",
    why: "Extraction, required task creation, delivery proof, and operations-record linkage exist; hosted dashboards still have smoother built-in call-record UX.",
    nextMove: "Add more workflow recipes and proof-pack examples.",
  },
  {
    buyerNeed: "Run simulations and regressions before production.",
    competitors: ["Retell", "Bland", "Pipecat"],
    coverage: "covered",
    depth: "advantage",
    evidence: [
      {
        href: "/voice/simulations",
        kind: "proof",
        name: "simulationSuite",
        required: true,
        status: "pass",
      },
      {
        href: "/evals/scenarios",
        kind: "proof",
        name: "evals",
        status: "pass",
      },
    ],
    frameworkPrimitives: [
      "server routes",
      "fixture stores",
      "contract reports",
    ],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Simulation and regression testing",
    why: "Evals, fixtures, simulations, baselines, operation-linked failures, and readiness gates live in the repo and CI path.",
    nextMove: "Make scenario authoring easier without creating an app kit.",
  },
  {
    buyerNeed: "Run outbound campaigns through owned carrier infrastructure.",
    competitors: ["Retell", "Bland"],
    coverage: "covered",
    depth: "parity",
    evidence: [
      {
        href: "/voice/campaigns",
        kind: "route",
        name: "campaigns",
        required: true,
        status: "pass",
      },
      {
        href: "/api/voice/campaigns/readiness-proof",
        kind: "readiness",
        name: "campaignReadiness",
        status: "pass",
      },
      {
        href: "/voice/campaigns/dialer-proof",
        kind: "proof",
        name: "campaignDialerProof",
        status: "pass",
      },
    ],
    frameworkPrimitives: ["server routes", "campaign runtime"],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Outbound campaigns",
    why: "Campaign queues, imports, consent, retries, quiet hours, carrier dry-runs, and readiness proof exist, while Retell/Bland still lead dashboard-led campaign UX.",
    nextMove:
      "Improve docs/primitives without building a hosted dialer dashboard.",
  },
  {
    buyerNeed: "Let a human safely intervene during live automation.",
    competitors: ["Vapi", "Retell"],
    coverage: "covered",
    depth: "advantage",
    evidence: [
      { href: "/live-ops", kind: "route", name: "liveOps", status: "pass" },
      {
        href: "/ops-actions",
        kind: "operations-record",
        name: "liveOpsAudit",
        status: "pass",
      },
    ],
    frameworkPrimitives: ["react", "vue", "svelte", "angular", "html"],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Live operator controls",
    why: "Runtime pause/resume/takeover, injected instructions, action-center primitives, audit/trace evidence, and framework integrations are code-owned.",
    nextMove: "Keep live-ops evidence visible in all framework examples.",
  },
  {
    buyerNeed: "Export voice evidence to owned storage, SIEM, or warehouse.",
    competitors: ["Vapi", "Retell", "Bland"],
    coverage: "covered",
    depth: "advantage",
    evidence: [
      {
        href: "/voice/observability-export",
        kind: "proof",
        name: "observabilityExport",
        required: true,
        status: "pass",
      },
      {
        href: "/api/voice/observability-export/replay",
        kind: "proof",
        name: "observabilityExportReplay",
        status: "pass",
      },
    ],
    frameworkPrimitives: ["server routes", "export manifests"],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Customer-owned observability export",
    why: "Export/replay, schema validation, delivery, redaction, readiness gating, and operations-record links support owned incident and warehouse workflows.",
    nextMove: "Make export manifests the default release/incident artifact.",
  },
  {
    buyerNeed: "Control data retention, redaction, and audit export.",
    competitors: ["Vapi", "Retell", "Bland"],
    coverage: "covered",
    depth: "advantage",
    evidence: [
      {
        href: "/data-control",
        kind: "readiness",
        name: "dataControl",
        required: true,
        status: "pass",
      },
      {
        href: "/data-control.md",
        kind: "docs",
        name: "dataControlMarkdown",
        status: "pass",
      },
    ],
    frameworkPrimitives: ["server routes", "storage recipes"],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Compliance and data control",
    why: "Retention, redaction, zero-retention helpers, guarded deletion, customer storage, audit export, and provider-key guidance are app-owned.",
    nextMove: "Keep docs precise and avoid certification claims.",
  },
  {
    buyerNeed:
      "Prove realtime quality across latency, interruption, reconnect, and provider stages.",
    competitors: ["Vapi", "LiveKit"],
    coverage: "covered",
    depth: "parity",
    evidence: [
      {
        href: "/voice/proof-trends",
        kind: "proof",
        name: "proofTrends",
        required: true,
        status: "pass",
      },
      {
        href: "/voice/slo-readiness-thresholds",
        kind: "readiness",
        name: "sloReadinessThresholds",
        status: "pass",
      },
      { href: "/barge-in", kind: "proof", name: "bargeIn", status: "pass" },
      {
        href: "/voice/reconnect-contract",
        kind: "proof",
        name: "reconnectContract",
        status: "pass",
      },
    ],
    frameworkPrimitives: ["client traces", "server reports"],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Latency, interruption, and reconnect confidence",
    why: "Live p50/p95, provider-stage timings, barge-in, reconnect contracts, long-window proof, SLO artifacts, and readiness gates exist.",
    nextMove:
      "Build sustained benchmark history and tune defaults from real runs.",
  },
  {
    buyerNeed:
      "Use direct realtime/duplex providers when they are the right execution engine.",
    competitors: ["OpenAI Realtime"],
    coverage: "covered",
    depth: "parity",
    evidence: [
      {
        href: "/api/voice/realtime-channel",
        kind: "proof",
        name: "realtimeChannel",
        required: true,
        status: "pass",
      },
      {
        href: "/voice/realtime-channel",
        kind: "proof",
        name: "realtimeChannelPage",
        status: "pass",
      },
      {
        href: "/voice/realtime-channel.md",
        kind: "proof",
        name: "realtimeChannelMarkdown",
        status: "pass",
      },
      {
        href: "/api/voice/media-pipeline",
        kind: "proof",
        name: "mediaPipelineCalibration",
        required: true,
        status: "pass",
      },
      {
        href: "/voice/media-pipeline",
        kind: "proof",
        name: "mediaPipelinePage",
        status: "pass",
      },
      {
        href: "/voice/media-pipeline.md",
        kind: "proof",
        name: "mediaPipelineMarkdown",
        status: "pass",
      },
      {
        href: "/api/voice/realtime-provider-contracts",
        kind: "proof",
        name: "realtimeProviderContracts",
        required: true,
        status: "pass",
      },
      {
        href: "/voice/realtime-provider-contracts",
        kind: "proof",
        name: "realtimeProviderContractsPage",
        status: "pass",
      },
      {
        href: "/provider-contracts",
        kind: "proof",
        name: "providerContracts",
        status: "pass",
      },
      {
        href: "/voice/provider-orchestration",
        kind: "readiness",
        name: "providerOrchestrationRealtimeSurface",
        status: "pass",
      },
    ],
    frameworkPrimitives: [
      "server adapters",
      "provider profiles",
      "runtime-channel proof",
      "media-pipeline calibration",
      "realtime provider contracts",
    ],
    operationsRecord: "linked",
    readinessGate: "present",
    surface: "Direct realtime/duplex providers",
    why: "OpenAI Realtime adapter path, browser capture negotiation, raw PCM realtime format proof, native media-pipeline calibration, first assistant audio latency, provider contracts, and cascaded STT/LLM/TTS fallback are all app-owned.",
    nextMove:
      "Expand native media-pipeline proof from calibration into transport, resampling, VAD, and interruption primitives.",
  },
  {
    buyerNeed: "Build visual workflows without code.",
    competitors: ["Bland", "Retell", "Vapi"],
    coverage: "intentional-gap",
    depth: "intentional-gap",
    operationsRecord: "not-applicable",
    readinessGate: "not-applicable",
    remainingGap:
      "No-code visual flow builders are not the AbsoluteJS Voice lane.",
    surface: "No-code visual builder",
    why: "AbsoluteJS Voice should provide code-first flow primitives, diagrams, and recipes, not a builder-owned app kit.",
    nextMove: "Avoid app kits; add lightweight diagrams/docs only.",
  },
  {
    buyerNeed: "Provision phone numbers from a hosted dashboard.",
    competitors: ["Vapi", "LiveKit"],
    coverage: "intentional-gap",
    depth: "intentional-gap",
    operationsRecord: "not-applicable",
    readinessGate: "not-applicable",
    remainingGap:
      "Hosted number purchasing/provisioning stays with carriers or media platforms.",
    surface: "Hosted phone-number provisioning",
    why: "AbsoluteJS Voice should guide carrier setup and verify config, not become a telco platform.",
    nextMove: "Keep setup reports copy-ready and adapter-friendly.",
  },
  {
    buyerNeed: "Own raw SIP/media infrastructure.",
    competitors: ["LiveKit"],
    coverage: "intentional-gap",
    depth: "intentional-gap",
    operationsRecord: "not-applicable",
    readinessGate: "not-applicable",
    remainingGap:
      "LiveKit owns SIP trunks, rooms, RTP/SRTP, DTMF, REFER, dispatch, and media networking.",
    surface: "SIP/media infrastructure",
    why: "AbsoluteJS Voice should own app-level media pipeline primitives without becoming a hosted telco dashboard.",
    nextMove: "Expose adapter seams when needed.",
  },
] satisfies VoiceCompetitiveSurface[];

const buildDemoCompetitiveCoverageReport =
  async (): Promise<VoiceCompetitiveCoverageReport> => {
    const latest = await readLatestVapiCoverageSummary();

    return buildVoiceCompetitiveCoverageReport({
      generatedAt: new Date().toISOString(),
      marketCoverageEstimate: "93-95%",
      notes: [
        "Scored for a self-hosted AbsoluteJS buyer, not a hosted-dashboard buyer.",
        "Intentional gaps are adapter seams or product-scope decisions, not missing core voice primitives.",
      ],
      source: latest.source ?? latestProofPackJsonPath,
      surfaces: competitiveCoverageSurfaces,
      vapiCoverageEstimate: "99.8%",
    });
  };

const buildDemoGuardrailReport = () => {
  const checkedAt = Date.now();
  const decisions: VoiceGuardrailDecision[] = [
    {
      allowed: false,
      checkedAt,
      content: "I can give medical advice and diagnose this issue.",
      findings: [
        {
          action: "block",
          description:
            "Blocks final legal, medical, or financial advice claims that should route to a human or qualified professional.",
          label: "Regulated advice",
          ruleId: "regulated-advice",
          stage: "assistant-output",
        },
      ],
      redactedContent: "I can give medical advice and diagnose this issue.",
      sessionId: demoIncidentSessionId,
      stage: "assistant-output",
      status: "blocked",
      turnId: "demo-guardrail-block",
    },
    {
      allowed: true,
      checkedAt: checkedAt + 1,
      content: "My card is 4111 1111 1111 1111.",
      findings: [
        {
          action: "warn",
          description:
            "Warns when payment-card-like data appears in transcripts or tool payloads.",
          label: "Payment card-like data",
          ruleId: "payment-card-like-data",
          stage: "transcript",
        },
      ],
      redactedContent: "My card is [redacted-card].",
      sessionId: demoIncidentSessionId,
      stage: "transcript",
      status: "warn",
      turnId: "demo-guardrail-warn",
    },
    {
      allowed: true,
      checkedAt: checkedAt + 2,
      content: "I can route you to billing support.",
      findings: [],
      redactedContent: "I can route you to billing support.",
      sessionId: demoIncidentSessionId,
      stage: "assistant-output",
      status: "pass",
      turnId: "demo-guardrail-pass",
    },
  ];

  return buildVoiceGuardrailReport({
    decisions,
    policies: [voiceGuardrailPolicyPresets.supportSafeDefaults],
  });
};

const renderGuardrailsHTML = async () => {
  const report = buildDemoGuardrailReport();
  const liveProof = await readLatestLiveGuardrailRuntimeProof();
  const rows = report.decisions
    .map(
      (decision) =>
        `<tr><td>${escapeHtml(decision.status)}</td><td>${escapeHtml(decision.stage)}</td><td>${escapeHtml(decision.allowed ? "allowed" : "blocked")}</td><td>${escapeHtml(decision.findings.map((finding) => finding.label).join(", ") || "none")}</td></tr>`,
    )
    .join("");
  const findings = report.decisions
    .flatMap((decision) => decision.findings)
    .map(
      (finding) =>
        `<li>${escapeHtml(finding.action)} · ${escapeHtml(finding.ruleId)} · ${escapeHtml(finding.label)}</li>`,
    )
    .join("");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Voice Guardrails Proof</title>
      <style>
        body{background:#0d1117;color:#f8fafc;font-family:ui-sans-serif,system-ui,sans-serif;margin:0}
        main{max-width:1040px;margin:auto;padding:32px}
        a{color:#93c5fd}
        .hero{background:linear-gradient(135deg,rgba(248,113,113,.16),rgba(14,165,233,.13));border:1px solid #263241;border-radius:28px;margin-bottom:18px;padding:28px}
        .eyebrow{color:#fca5a5;font-size:.78rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
        h1{font-size:clamp(2.2rem,5vw,4.5rem);line-height:.92;margin:.2rem 0 1rem}
        .muted{color:#a8b3bd}
        .metrics{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin:18px 0}
        .metrics div,section,table{background:#151b23;border:1px solid #263241;border-radius:18px}
        .metrics div,section{padding:16px}
        .metrics span{color:#a8b3bd;display:block;font-size:.72rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
        .metrics strong{display:block;font-size:1.7rem;margin-top:6px}
        table{border-collapse:collapse;overflow:hidden;width:100%}
        td,th{border-bottom:1px solid #263241;padding:12px;text-align:left}
        .live-proof{background:${liveProof.ok ? "rgba(20,83,45,.28)" : "rgba(127,29,29,.28)"};border-color:${liveProof.ok ? "rgba(34,197,94,.5)" : "rgba(248,113,113,.55)"};margin:18px 0}
        .live-proof strong{display:block;font-size:1.5rem;margin:.25rem 0}
        code{background:#0b1117;border:1px solid #263241;border-radius:8px;padding:2px 6px}
      </style>
    </head>
    <body>
      <main>
        <p><a href="/switching-from-vapi">Switching from Vapi</a> · <a href="/api/voice/guardrails">JSON</a> · <a href="/api/voice/guardrails.md">Markdown</a></p>
        <section class="hero">
          <p class="eyebrow">Guardrails proof</p>
          <h1>Blocking, warning, redaction, and traceable policy decisions</h1>
          <p class="muted">This proves a Vapi/Bland-style guardrail surface as code-owned primitives: policies are local, reports are JSON/Markdown, and decisions can be emitted as <code>assistant.guardrail</code> trace events.</p>
        </section>
        <section class="live-proof">
          <p class="eyebrow">Live runtime guardrail proof</p>
          <strong>${escapeHtml(liveProof.ok ? "PASS" : "FAIL")}</strong>
          <p class="muted">Runs <code>${escapeHtml(liveProof.command)}</code> and verifies a real WebSocket voice turn blocks unsafe <code>tool-input</code> and <code>assistant-output</code> before unsafe text reaches the client.</p>
          <p class="muted">Exit ${escapeHtml(String(liveProof.status ?? "n/a"))}${liveProof.elapsedMs === undefined ? "" : ` · ${escapeHtml(String(liveProof.elapsedMs))}ms`}${liveProof.outputDir ? ` · <code>${escapeHtml(liveProof.outputDir)}</code>` : ""}</p>
          ${liveProof.error ? `<p class="muted">${escapeHtml(liveProof.error)}</p>` : ""}
        </section>
        <div class="metrics">
          <div><span>Status</span><strong>${escapeHtml(report.status.toUpperCase())}</strong></div>
          <div><span>Decisions</span><strong>${report.total}</strong></div>
          <div><span>Blocked</span><strong>${report.summary.blocked}</strong></div>
          <div><span>Warned</span><strong>${report.summary.warned}</strong></div>
          <div><span>Passed</span><strong>${report.summary.passed}</strong></div>
        </div>
        <h2>Policy Decisions</h2>
        <table><thead><tr><th>Status</th><th>Stage</th><th>Allowed</th><th>Findings</th></tr></thead><tbody>${rows}</tbody></table>
        <h2>Findings</h2>
        <section><ul>${findings || "<li>No findings.</li>"}</ul></section>
      </main>
    </body>
  </html>`;
};

const renderVapiMigrationHTML = async () => {
  const [coverage, proofTrends] = await Promise.all([
    readLatestVapiCoverage(),
    readLatestProofTrends(),
  ]);
  const coverageBySurface = new Map(
    coverage
      .filter((coverage) => typeof coverage.surface === "string")
      .map((coverage) => [coverage.surface as string, coverage]),
  );
  const rows = vapiMigrationItems
    .map(
      (item) => `<article>
        <div>
          <p class="eyebrow">${escapeHtml(item.concept)}</p>
          <h2>${escapeHtml(item.absolute)}</h2>
          <p><a href="${escapeHtml(item.proofHref)}">${escapeHtml(item.proofLabel)}</a> · <a href="${escapeHtml(item.statusHref)}">Status JSON</a></p>
          ${renderCoverageStatus(coverageBySurface.get(item.coverageSurface ?? item.concept))}
        </div>
      </article>`,
    )
    .join("");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Switching From Vapi To AbsoluteJS Voice</title>
      <style>
        body{background:#0e1218;color:#f8f3e7;font-family:ui-sans-serif,system-ui,sans-serif;margin:0}
        main{max-width:1120px;margin:auto;padding:32px}
        a{color:#93c5fd}
        .hero{background:linear-gradient(135deg,rgba(147,197,253,.18),rgba(45,212,191,.12));border:1px solid #263241;border-radius:30px;margin-bottom:18px;padding:28px}
        .eyebrow{color:#5eead4;font-size:.78rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
        .muted{color:#a8b3bd}
        .grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
        article{background:#151b23;border:1px solid #263241;border-radius:22px;padding:18px}
        h1{font-size:clamp(2.4rem,6vw,5rem);line-height:.9;margin:.2rem 0 1rem}
        h2{font-size:1.05rem;line-height:1.45;margin:.35rem 0 .8rem}
        p{line-height:1.6}
        .callout{background:#101820;border:1px solid #263241;border-radius:22px;margin:18px 0;padding:18px}
        .coverage{border-radius:16px;margin-top:14px;padding:12px}
        .coverage strong{display:inline-flex;font-size:.74rem;font-weight:900;letter-spacing:.12em;margin-bottom:8px}
        .coverage span{color:#a8b3bd}
        .coverage ul{display:grid;gap:6px;list-style:none;margin:8px 0 0;padding:0}
        .coverage li{font-size:.86rem;line-height:1.35}
        .coverage-pass{background:rgba(20,83,45,.24);border:1px solid rgba(34,197,94,.42)}
        .coverage-fail,.coverage-missing{background:rgba(127,29,29,.24);border:1px solid rgba(248,113,113,.46)}
        .gap{color:#fecaca;margin:.2rem 0 .5rem}
        .trend{background:#151b23;border:1px solid #263241;border-radius:24px;display:grid;gap:18px;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);margin:18px 0;padding:20px}
        .trend h2{font-size:1.4rem;margin:.25rem 0 .5rem}
        .trend-pass{border-color:rgba(34,197,94,.42)}
        .trend-fail{border-color:rgba(248,113,113,.46)}
        .trend-metrics{display:grid;gap:10px;grid-template-columns:repeat(2,minmax(0,1fr))}
        .trend-metrics div{background:#0f1620;border:1px solid #263241;border-radius:16px;padding:12px}
        .trend-metrics span{color:#a8b3bd;display:block;font-size:.72rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}
        .trend-metrics strong{display:block;font-size:1rem;margin-top:5px}
        code{background:#0b1117;border:1px solid #263241;border-radius:8px;padding:2px 6px}
        @media (max-width:760px){.trend{grid-template-columns:1fr}.trend-metrics{grid-template-columns:1fr}}
      </style>
    </head>
    <body>
      <main>
        <p><a href="/ops-console">Back to Ops Console</a> · <a href="/demo-checklist">Demo Checklist</a> · <a href="/production-readiness">Production Readiness</a></p>
        <section class="hero">
          <p class="eyebrow">Hosted platform migration checklist</p>
          <h1>Replace Vapi dashboard concepts with owned primitives</h1>
          <p class="muted">This page maps the surfaces a Vapi buyer expects to the AbsoluteJS Voice route, report, contract, or proof URL that already lives inside this app.</p>
        </section>
        <section class="callout">
          <p>Migration rule: start with the voice route, operations record, readiness gate, provider contracts, and customer-owned observability export. Add campaigns, live-ops, or compliance controls only when that app needs them.</p>
          <p class="muted">Live coverage status is read from <code>.voice-runtime/proof-pack/latest.json</code>; stale or missing proof is shown directly on each surface.</p>
        </section>
        ${renderSustainedProofStatus(proofTrends)}
        <section class="grid">${rows}</section>
      </main>
    </body>
  </html>`;
};

export {
  buildDemoCompetitiveCoverageReport,
  buildDemoGuardrailReport,
  demoToolContracts,
  renderGuardrailsHTML,
  renderVapiMigrationHTML,
};
