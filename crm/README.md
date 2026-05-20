# @absolutejs/crm example

One page per framework (React / Vue / Svelte / Angular / HTML / HTMX) demonstrating the same CRM lead-capture flow against `@absolutejs/crm`. Backend wires a stub adapter so the example runs without real Salesforce/HubSpot credentials.

```bash
bun install
bun dev
```

Visit `http://localhost:3000` for the framework picker. Each page submits to the same backend, which writes through the CRM runtime → local entity store. The "Recent contacts" panel polls the local store so you can see writes land in real time.

## What the example demonstrates

- `createCRMRuntime` wiring with `localEntityStore` enabled (bidirectional sync activated)
- A custom stub `CRMAdapter` so the example is self-contained
- `createVoiceLeadCapturePathway`-style flow but as a plain HTML form per framework
- Shared brand styles in `src/frontend/styles/indexes/crm-demo.css`
- Shared types + framework metadata in `src/shared/demo.ts`
