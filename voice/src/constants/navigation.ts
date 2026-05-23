import type { FrameworkId } from "../types/voice";

export const FRAMEWORK_DESCRIPTIONS: Record<FrameworkId, string> = {
  angular:
    "Angular uses VoiceStreamService to expose computed signals from the shared voice connection.",
  html: "HTML uses the plain client primitive directly and keeps the page reactive with a lightweight DOM renderer.",
  htmx: "HTMX uses the plugin-owned HTMX render route and package bootstrap so the page stays declarative and never ships its own voice controller.",
  react:
    "React uses useVoiceStream so the page reacts to partials, committed turns, and completion state without custom wiring.",
  svelte:
    "Svelte uses the framework entrypoint and subscribes to the shared voice stream for local reactive state.",
  vue: "Vue uses the voice composable so refs stay aligned with the same client transport and reconnect lifecycle.",
};
export const FRAMEWORKS: Array<{
  id: FrameworkId;
  href: string;
  label: string;
}> = [
  { href: "/react", id: "react", label: "React" },
  { href: "/svelte", id: "svelte", label: "Svelte" },
  { href: "/vue", id: "vue", label: "Vue" },
  { href: "/angular", id: "angular", label: "Angular" },
  { href: "/html", id: "html", label: "HTML" },
  { href: "/htmx", id: "htmx", label: "HTMX" },
];
export const VOICE_PROOF_DASHBOARDS = [
  {
    description:
      "One action runs the demo proof suite and links every surface.",
    href: "/demo-proof",
    label: "Run full proof",
  },
  {
    description: "Interruption stop latency from browser barge-in events.",
    href: "/barge-in",
    label: "Barge-in",
  },
  {
    description: "Speech-to-assistant timing from live browser traces.",
    href: "/live-latency",
    label: "Live latency",
  },
  {
    description: "Turn waterfall from speech detection through first audio.",
    href: "/turn-latency",
    label: "Turn waterfall",
  },
  {
    description:
      "Repeated provider, turn, live-latency, recovery, and readiness trends.",
    href: "/voice/proof-trends",
    label: "Sustained trends",
  },
  {
    description: "Session timelines across providers, tools, and recovery.",
    href: "/traces",
    label: "Trace timelines",
  },
  {
    description:
      "Single-session trace, audit, handoff, and tool support record.",
    href: "/voice-operations/demo-incident-bundle",
    label: "Operations record",
  },
  {
    description:
      "Copyable incident handoff generated from the operations record.",
    href: "/voice-operations/demo-incident-bundle/incident.md",
    label: "Incident handoff",
  },
  {
    description: "Redacted Markdown export for support and incident response.",
    href: "/voice-incidents/demo-incident-bundle/markdown",
    label: "Incident bundle",
  },
  {
    description: "Deploy gate for runtime, providers, sinks, and proof.",
    href: "/production-readiness",
    label: "Readiness",
  },
  {
    description:
      "Provider fallback, queue failures, handoffs, live ops, and latency SLOs.",
    href: "/ops-recovery",
    label: "Ops recovery",
  },
  {
    description:
      "Redaction, retention dry-runs, audit exports, and provider key posture.",
    href: "/data-control",
    label: "Data control",
  },
  {
    description: "Configured provider capability and fallback matrix.",
    href: "/provider-contracts",
    label: "Provider contracts",
  },
  {
    description:
      "Auto, recommend, off, allowed, blocked, and max-switch guard policies.",
    href: "/voice/profile-switch-policy",
    label: "Profile policy",
  },
  {
    description: "Real profile guard decisions from audit and trace evidence.",
    href: "/voice/profile-switch-live-decisions",
    label: "Profile decisions",
  },
  {
    description:
      "Deploy-facing gate for profile switch policy, audit, trace, and live evidence.",
    href: "/voice/profile-switch-readiness",
    label: "Profile readiness",
  },
] as const;
