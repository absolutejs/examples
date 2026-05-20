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

The same flow is available from scripts and HTTP endpoints.

```bash
bun run simulate:provider-failure openai gemini
```

```bash
curl -X POST 'http://localhost:3000/api/provider-simulate/failure?provider=openai'
curl -X POST 'http://localhost:3000/api/provider-simulate/recovery?provider=openai'
curl 'http://localhost:3000/api/provider-status'
```

The simulator uses local fake model adapters. It does not call OpenAI, Anthropic, Gemini, Deepgram, or any other external provider.

## Provider Shootout

Run the same assistant cases against every configured model provider in parallel:

```bash
bun run bench:assistant:providers
```

The runner always includes the deterministic baseline and automatically includes OpenAI, Anthropic, and Gemini when their API keys are present. Use `VOICE_SHOOTOUT_PROVIDERS=openai,anthropic,gemini` to restrict the run. Results are written to `.voice-runtime/shootouts`, or to `VOICE_SHOOTOUT_OUTPUT_DIR` when set.

## Readiness Smoke

Use the readiness smoke runner before a demo or after changing voice primitives:

```bash
bun run smoke:readiness:server
```

That starts the demo on `PORT=3004` when `PORT` is not already set, waits for `/api/production-readiness`, runs the smoke checks, and stops the server. If you already have the server running, use:

```bash
bun run smoke:readiness
```

The smoke runner checks the readiness, carrier, data-control, ops-recovery, provider capability, handoff, and ops status endpoints in parallel. Local development can still report `readinessStatus: "fail"` when production-only gates are missing, such as a public carrier webhook URL or live carrier credentials. The default smoke passes when the control-plane endpoints are reachable and returning valid JSON.

If your machine is busy or another agent is compiling at the same time, increase `VOICE_READINESS_SERVER_WAIT_MS` in `.env` to give `absolute dev` more time to start. `VOICE_READINESS_SERVER_POLL_MS`, `VOICE_READINESS_SERVER_OUTPUT_LINES`, and `VOICE_READINESS_SMOKE_TIMEOUT_MS` are also available for local tuning.

Carrier checks default to `VOICE_DEMO_CARRIER_READINESS=local`, which proves the self-hosted phone-agent routes with localhost URLs. Set `VOICE_DEMO_CARRIER_READINESS=production` when using a public HTTPS/WSS URL and real carrier signing credentials.

For production-like environments where every readiness gate should pass:

```bash
VOICE_DEMO_CARRIER_READINESS=production VOICE_READINESS_SMOKE_STRICT=true bun run smoke:readiness
```

## Proof Pack Artifacts

Use the proof pack runner when you need current artifacts for the competitive plan, a sales demo, or a release note:

```bash
bun run proof:pack:server
```

That starts the demo on `PORT=3004` when `PORT` is not already set, waits for `/api/production-readiness`, refreshes browser-call profile evidence in an isolated runtime, refreshes real-call profile history against the clean proof runtime, seeds proof endpoints in parallel, fetches the proof surfaces in parallel, writes timestamped artifacts under `.voice-runtime/proof-pack/<run-id>/`, and updates `.voice-runtime/proof-pack/latest.json` plus `.voice-runtime/proof-pack/latest.md`.

The headline proof includes production readiness, six-framework browser microphone/WebSocket profile evidence, provider SLOs for LLM/STT/TTS latency and fallback budgets, customer-owned observability export, simulation results, data-control exports, campaign proof, delivery-runtime proof, and the operations-record incident bundle.

If the demo server is already running, use:

```bash
bun run proof:pack
```

Set `VOICE_PROOF_PACK_OUTPUT_DIR` to change the artifact directory. `VOICE_PROOF_PACK_TIMEOUT_MS`, `VOICE_PROOF_PACK_SERVER_WAIT_MS`, `VOICE_PROOF_PACK_SERVER_POLL_MS`, and `VOICE_PROOF_PACK_SERVER_OUTPUT_LINES` are available for slower local machines or busy agent sessions.

For longer proof windows that tune SLO, monitor, latency, interruption, reconnect, and notifier defaults from fresh traces:

```bash
bun run proof:long-window
```

That starts one demo server, runs sustained proof trends with a longer default window, then runs the proof pack against the same fresh trace set. It writes `.voice-runtime/long-proof-window/<run-id>/long-proof-window.json`, `.voice-runtime/long-proof-window/<run-id>/long-proof-window.md`, and updates `.voice-runtime/long-proof-window/latest.*`. The runner rejects stale `latest.json` files so the summary only reflects artifacts generated after the current long-window run started.

Tune the window with `VOICE_LONG_PROOF_TREND_CYCLES`, `VOICE_LONG_PROOF_TREND_INTERVAL_MS`, and `VOICE_LONG_PROOF_LIVE_SAMPLES_PER_CYCLE`. The defaults are intentionally longer than the normal demo proof pack.

To capture a real browser microphone/WebSocket profile for the proof history:

```bash
bun run proof:profiles:real-calls
```

That collector now seeds provider SLO proof, opens each framework demo in headless Chrome with a fake microphone, starts the realtime voice flow, records `/voice/realtime` WebSocket bytes/messages, and writes `.voice-runtime/browser-call-profiles/latest.json` plus `.voice-runtime/real-call-profiles/latest.json`. The demo serves that package-normalized browser profile at `/api/voice/browser-call-profiles`, `/voice/browser-call-profiles`, and `/voice/browser-call-profiles.md` through `createVoiceBrowserCallProfileRoutes(...)`. It also serves aggregated real-call benchmark history and provider/runtime recommendations at `/api/voice/real-call-profile-history`, `/voice/real-call-profile-history`, and `/voice/real-call-profile-history.md` through `createVoiceRealCallProfileHistoryRoutes(...)`. Set `VOICE_BROWSER_CALL_FRAMEWORKS=react,vue,svelte,angular,html,htmx` to override the default all-framework pass, `VOICE_REAL_CALL_BROWSER_CAPTURE=0` to skip the browser pass, or `VOICE_REAL_CALL_BROWSER_CAPTURE_REQUIRED=1` when a missing Chrome/browser capture should fail the run.

The demo also mounts `/api/voice/slo-calibration`, `/voice/slo-calibration.md`, `/api/voice/slo-readiness-thresholds`, `/voice/slo-readiness-thresholds`, and `/voice/slo-readiness-thresholds.md`. Those routes consume long proof-window history and recommend provider, live-latency, turn-latency, interruption, reconnect, monitor-run, and notifier-delivery thresholds through the package-level `createVoiceSloCalibrationRoutes(...)` and `createVoiceSloReadinessThresholdRoutes(...)` primitives. The readable readiness-threshold page shows the exact calibrated gates currently driving production readiness. The long-window runner writes runtime calibration samples from barge-in proof events, reconnect resume proof, proof-pack monitor/readiness route timing, and proof-pack delivery timing. Set `VOICE_SLO_CALIBRATION_MIN_RUNS` when you want the route to require multiple long-window runs before treating the calibration as ready.

Production readiness also uses `createVoiceSloThresholdProfile(...)` plus `createVoiceSloReadinessThresholdOptions(...)` to feed calibrated provider SLO, live-latency, barge-in, reconnect, monitor-run, and notifier-delivery thresholds back into the demo gate. The live-latency gate only considers recent samples, controlled by `VOICE_LIVE_LATENCY_READINESS_MAX_AGE_MS`, so old demo traces do not pollute the current calibrated deploy gate.

To generate the proof pack plus buyer-facing screenshots in one run:

```bash
bun run proof:screenshots
```

That writes screenshots for `/production-readiness`, the framework-level readiness gate explanations widget, `/voice/provider-slos`, `/voice/provider-orchestration`, `/voice/provider-decisions`, `/voice/simulations`, `/voice-operations/demo-incident-bundle`, and `/switching-from-vapi` under `.voice-runtime/proof-pack/<run-id>/screenshots/` and appends the screenshot index to `latest.md`.

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
