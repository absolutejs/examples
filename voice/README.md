# AbsoluteJS Voice Example

This is a full AbsoluteJS demo app for `@absolutejs/voice`.

It exposes the same voice intake flow across:

- React
- Vue
- Svelte
- Angular
- HTML
- HTMX

The server uses:

- `@absolutejs/voice` for the WebSocket voice route
- `@absolutejs/voice-deepgram` with Deepgram Flux for STT
- `@absolutejs/voice-assemblyai` as an optional STT fallback provider
- route-level `phraseHints`
- route-level `correctTurn` with deterministic phrase correction
- `createVoiceFileRuntimeStorage(...)` for durable runtime storage
- `createVoiceAssistant(...)` as the product-level assistant surface
- assistant `artifactPlan` for built-in review, task, and integration-event recording
- assistant `support-triage` recipe for recipe-driven follow-up work
- assistant guardrails and experiment variants
- provider-neutral assistant model routing for OpenAI, Anthropic, and Gemini, with deterministic fallback when no LLM key is present

Each framework page keeps feature parity:

- start and stop microphone capture
- commit the current turn manually
- show live partial transcripts
- show committed turns and assistant replies
- show completed intakes persisted by the server
- show the exact framework-specific client primitive being used
- show the same assistant config panel
- link directly into reviews, trace timelines, and ops pages

## Run

```bash
cd ~/alex/absolutejs-voice-example
bun install
DEEPGRAM_API_KEY=... ASSEMBLYAI_API_KEY=... bun run dev
```

`ASSEMBLYAI_API_KEY` is optional. When present, the backend keeps Deepgram as the primary realtime STT provider and routes to AssemblyAI when Deepgram open/send fails, times out, or is temporarily suppressed by provider health.

Optional LLM routing:

```bash
OPENAI_API_KEY=... OPENAI_VOICE_MODEL=gpt-4.1-mini bun run dev
ANTHROPIC_API_KEY=... ANTHROPIC_VOICE_MODEL=claude-sonnet-4-5 bun run dev
GEMINI_API_KEY=... GEMINI_VOICE_MODEL=gemini-2.5-flash bun run dev
```

Provider selection is automatic in this order: OpenAI, Anthropic, Gemini, then deterministic fallback. You can force one with `VOICE_MODEL_PROVIDER=openai`, `VOICE_MODEL_PROVIDER=anthropic`, `VOICE_MODEL_PROVIDER=gemini`, or `VOICE_MODEL_PROVIDER=deterministic`.

Provider model env vars are optional. If no LLM key is present, the server keeps using the deterministic local intake model so the demo still runs with only the voice/STT key.

Then open:

- `http://localhost:3000/react`
- `http://localhost:3000/vue`
- `http://localhost:3000/svelte`
- `http://localhost:3000/angular`
- `http://localhost:3000/html`
- `http://localhost:3000/htmx`
- `http://localhost:3000/reviews`
- `http://localhost:3000/assistant`
- `http://localhost:3000/tasks`
- `http://localhost:3000/integrations`
- `http://localhost:3000/traces`
- `http://localhost:3000/barge-in`

## Recommended Pattern

The example now follows the same production pattern recommended in `@absolutejs/voice` itself:

- durable runtime storage via `createVoiceFileRuntimeStorage(...)`
- one assistant surface via `createVoiceAssistant(...)`
- provider-neutral model selection through `createOpenAIVoiceAssistantModel(...)`, `createAnthropicVoiceAssistantModel(...)`, and `createGeminiVoiceAssistantModel(...)`
- recipe-driven ops defaults via the assistant `support-triage` artifact plan
- `voice({ ops: assistant.ops, onTurn: assistant.onTurn })` to record:
  - reviews
  - follow-up tasks
  - integration events
  - assistant run analytics from trace events
- thin app-specific customization through assistant guardrails, experiments, and model logic

The persisted runtime data lives under:

- `.voice-runtime/voice-demo/sessions`
- `.voice-runtime/voice-demo/reviews`
- `.voice-runtime/voice-demo/tasks`
- `.voice-runtime/voice-demo/events`
- `.voice-runtime/voice-demo/traces`

## Provider Routing And Failover

Every framework page includes the same provider selector. The selected provider is sent to the voice route as `?provider=openai`, `?provider=anthropic`, `?provider=gemini`, or `?provider=deterministic`.

The backend routes every assistant turn through `createVoiceProviderRouter(...)` from `@absolutejs/voice`:

- `prefer-selected` keeps the user-selected provider first.
- configured fallback order is OpenAI, Anthropic, Gemini, then deterministic.
- adaptive provider health suppresses providers after provider errors or rate limits.
- rate-limit suppressions cool down for 120 seconds in this demo.
- successful recovery retries clear active suppression while preserving historical error counts.

Provider status is visible in `/assistant` and `/api/provider-status`.

Provider contract readiness is visible in `/provider-contracts` and `/api/provider-contracts`. The backend uses the package-level `createVoiceProviderContractMatrixPreset("phone-agent", ...)` primitive to turn the configured LLM, STT, and TTS providers into one deploy-checkable matrix:

```ts
const contracts = createVoiceProviderContractMatrixPreset("phone-agent", {
  env: process.env,
  providers: {
    llm: configuredModelProviders,
    stt: configuredSTTProviders,
    tts: openAITelephonyTTS ? ["openai", "emergency"] : ["emergency"],
  },
  selected: {
    llm: modelProvider,
    stt: selectedSTTProvider,
    tts: openAITelephonyTTS ? "openai" : "emergency",
  },
  remediationHref: "/provider-contracts",
});
```

That one primitive proves configured state, required env, declared capabilities, streaming support, fallback coverage, and latency budgets without depending on a hosted dashboard.

Status meanings:

- `healthy`: the provider has a successful recent run and is eligible.
- `suppressed`: the provider is temporarily skipped by the router; `suppressionRemainingMs` shows the cooldown.
- `recoverable`: a previous suppression expired and the provider can be retried.
- `rate-limited`: a rate-limit error was seen without active cooldown timing.
- `degraded`: the latest provider event is still a failure.
- `idle`: no provider activity yet.

Use `/assistant` to demo failover without burning model quota:

- Click `Simulate openai failure`, `Simulate anthropic failure`, or `Simulate gemini failure`.
- The simulator emits a fake HTTP 429 through the same router health path.
- The selected provider becomes `suppressed`.
- The router falls back to the next eligible provider.
- Click `Retry ... recovery` to retry that provider directly and move it back to `healthy`.

The same flow is available from the UI buttons above and HTTP endpoints.

```bash
curl -X POST 'http://localhost:3000/api/provider-simulate/failure?provider=openai'
curl -X POST 'http://localhost:3000/api/provider-simulate/recovery?provider=openai'
curl 'http://localhost:3000/api/provider-status'
```

The simulator uses local fake model adapters. It does not call OpenAI, Anthropic, Gemini, Deepgram, or any other external provider.

## What To Demo

A good end-to-end demo flow is:

1. Open `/demo-checklist` for the canonical presentation path.
2. Open `/switching-from-vapi` when the buyer asks how Vapi dashboard concepts map to AbsoluteJS-owned primitives and proof URLs.
3. Open any framework page.
4. Complete a guided or general voice flow.
5. Say one of the lifecycle phrases if you want a non-default outcome:
   - `transfer me to billing`
   - `escalate this`
   - `send it to voicemail`
   - `no answer`
6. Open `/production-readiness` to show the pass/fail control-plane report.
7. Open `/voice/provider-orchestration`, `/voice/provider-decisions`, and `/voice/provider-slos` to show code-owned provider policy, per-call provider selection reasons, plus LLM/STT/TTS latency, p95, timeout, fallback, and unresolved-error budgets backed by current proof-pack traces.
8. Open `/phone-agent`, `/carriers`, and `/telephony-webhook-decisions` to show self-hosted carrier readiness.
9. Open `/reviews` to inspect the call artifact.
10. Open `/traces` to inspect the per-call provider timeline.
10. Open `/barge-in` to inspect interruption latency evidence.
11. Open `/ops-recovery` to show provider fallback recovery, unresolved failures, delivery backlog, handoff failures, live-ops interventions, and latency SLOs.
12. Open `/voice/observability-export` to show the customer-owned evidence manifest for traces, audits, operations records, provider SLOs, proof-pack artifacts, and delivery health.
13. Open `/data-control` to show redaction, audit exports, retention dry-runs, guarded deletion, storage posture, and provider-key posture.
14. Open `/delivery-sinks` to show how audit and trace delivery queues can swap file sinks for webhook, S3, SQLite, or Postgres sinks.
15. Open `/voice/simulations` to show pre-production proof across sessions, scenarios, fixtures, tools, and outcomes.
16. Open `/assistant`, `/tasks`, and `/integrations` for deeper assistant, follow-up work, and outbound event details.

The demo uses the support-triage recipe, so completed calls create triage review tasks, escalations route to `support-escalations`, transfers create handoff checks, and voicemail/no-answer outcomes create callback work.

## Delivery Sinks

Open `/delivery-sinks` to inspect the delivery primitive. The demo writes runtime trace exports into `runtimeStorage.traceDeliveries` and writes audit evidence for those exports into `runtimeStorage.auditDeliveries`. Production readiness consumes those same stores, so the UI proves export health without caring whether the sink is file-backed, webhook-backed, S3-backed, SQLite-backed, or Postgres-backed.

Set `VOICE_DELIVERY_SINK=file|webhook|s3|postgres|sqlite` to change the sink descriptors shown in `/delivery-sinks`, `/ops-console`, and `/production-readiness`. In `webhook` and `s3` modes, the drain endpoints use `createVoiceDeliveryRuntimePresetConfig` plus `createVoiceDeliveryRuntime` from the package: `VOICE_DELIVERY_WEBHOOK_URL` receives signed JSON envelopes, and `VOICE_DELIVERY_S3_BUCKET=s3://bucket/prefix` writes audit/trace JSON objects through Bun's native S3 client.

Open `/delivery-runtime` for the package-level worker control plane. It shows audit and trace queue summaries and exposes one manual tick action for both delivery workers.

The current example uses file-backed stores for local demos and mounts:

- `/audit/deliveries`
- `/traces/deliveries`
- `/api/voice-audit-deliveries/drain`
- `/api/voice-trace-deliveries/drain`

Swap the store/worker layer to actually deliver to external infrastructure; keep the voice flow, descriptor, and readiness wiring the same.

## Data Control

Open `/data-control` to inspect the package-level compliance primitive mounted by the demo. It proves the self-hosted deployment owns its storage posture, redaction defaults, provider-key recommendations, redacted audit exports, retention dry-runs, and guarded deletion flow without depending on a hosted dashboard.

The mounted package routes are:

- `/data-control`
- `/data-control.json`
- `/data-control.md`
- `/data-control/audit.json`
- `/data-control/audit.md`
- `/data-control/audit.html`
- `/data-control/retention/plan`
- `/data-control/retention/apply`

`/data-control/retention/apply` requires `confirm: "apply-retention-policy"` in the request body. Use `/data-control/retention/plan` first for dry-run proof.

## Ops Recovery

Open `/ops-recovery` to inspect the package-level recovery primitive mounted by the demo. It rolls provider fallback recovery, unresolved provider failures, audit and trace delivery health, handoff delivery health, live-ops interventions, failed sessions, and latency SLOs into one operator-facing report.

The mounted package routes are:

- `/ops-recovery`
- `/api/voice/ops-recovery`
- `/api/voice/ops-recovery.md`

## Notes

- The example now uses published beta versions of `@absolutejs/voice` and `@absolutejs/voice-deepgram`, not local `file:` dependencies.
- API keys stay in local environment files only. `.env`, `.env.*`, runtime data, and build outputs are ignored.
- The route uses the recommended package path for this demo: Deepgram Flux plus phrase hints and deterministic correction.
- The example still keeps its own richer review UI, but runtime review/task/event creation is handled by the core package.
