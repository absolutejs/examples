export type FrameworkId =
  | "react"
  | "vue"
  | "svelte"
  | "angular"
  | "html"
  | "htmx";

export type LeadFormPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  source?: string;
  notes?: string;
};

export type SavedContact = {
  id: string;
  vendor: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  createdAt: number;
};

export type LeadSubmissionResult = {
  ok: boolean;
  contact?: SavedContact;
  error?: string;
};

export type RecentContactsResponse = {
  contacts: SavedContact[];
  cursorAt: number;
};

export const CRM_LEAD_ROUTE = "/api/leads";
export const CRM_RECENT_CONTACTS_ROUTE = "/api/recent-contacts";
export const CRM_HUBSPOT_WEBHOOK_ROUTE = "/webhooks/hubspot";

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

export const FRAMEWORK_DESCRIPTIONS: Record<FrameworkId, string> = {
  angular:
    "Angular uses Signals + HttpClient to call the shared CRM endpoints and re-renders the recent-contacts list on each successful lead submission.",
  html: "HTML keeps the form declarative — the page's inline script POSTs the lead payload and re-fetches the recent-contacts list.",
  htmx: "HTMX submits the form via hx-post and swaps in the rendered recent-contacts fragment from the server — no client JS.",
  react:
    "React uses useState + useEffect to drive the lead form and poll /api/recent-contacts on a 5-second cadence.",
  svelte:
    "Svelte uses runes (`$state`, `$effect`) to bind the form and pull recent contacts from the same endpoint.",
  vue: "Vue uses `ref` + `onMounted` to wire the form to the shared CRM API and refresh the contacts panel.",
};

export const FRAMEWORK_SNIPPETS: Record<FrameworkId, string> = {
  angular: `import { createCRMRuntime, createInMemoryCRMLocalEntityStore } from "@absolutejs/crm";

const runtime = createCRMRuntime({
  tokenStore, syncQueue,
  adapters: { hubspot: createHubSpotCRMAdapter },
  localEntityStore: createInMemoryCRMLocalEntityStore(),
});`,
  html: `await fetch("/api/leads", {
  method: "POST",
  body: JSON.stringify(form),
  headers: { "Content-Type": "application/json" },
});`,
  htmx: `<form hx-post="/api/leads" hx-target="#recent-contacts" hx-swap="outerHTML">
  <input name="firstName" required />
  <button>Submit</button>
</form>`,
  react: `const submitLead = async (payload: LeadFormPayload) => {
  const res = await fetch("/api/leads", {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return res.json();
};`,
  svelte: `const submitLead = async (payload) => {
  const res = await fetch("/api/leads", {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return res.json();
};`,
  vue: `async function submitLead(payload) {
  const res = await fetch("/api/leads", {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return res.json();
}`,
};

export const PAGE_TAGLINE =
  "Multi-vendor CRM via @absolutejs/crm — same backend, six frameworks.";

export const PAGE_HEADLINE = "Capture a lead";

export const PAGE_SUBHEADLINE =
  "Submit the form → @absolutejs/crm runtime creates the contact in the configured vendor and mirrors it to the local entity store. The recent-contacts panel polls the same store.";

export const formatRelativeTime = (
  ms: number,
  now: number = Date.now(),
): string => {
  const diff = now - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
};
