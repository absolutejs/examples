import {
  CRM_LEAD_ROUTE,
  CRM_RECENT_CONTACTS_ROUTE,
  type LeadFormPayload,
  type LeadSubmissionResult,
  type RecentContactsResponse,
  type SavedContact,
} from "../../shared/demo";

export const submitLead = async (
  payload: LeadFormPayload,
): Promise<LeadSubmissionResult> => {
  const response = await fetch(CRM_LEAD_ROUTE, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    return {
      error: `HTTP ${response.status}: ${await response.text()}`,
      ok: false,
    };
  }
  return (await response.json()) as LeadSubmissionResult;
};

export const fetchRecentContacts = async (): Promise<SavedContact[]> => {
  const response = await fetch(CRM_RECENT_CONTACTS_ROUTE);
  if (!response.ok) return [];
  const json = (await response.json()) as RecentContactsResponse;
  return json.contacts;
};

export const emptyLead = (): LeadFormPayload => ({
  company: "",
  email: "",
  firstName: "",
  lastName: "",
  notes: "",
  phone: "",
  source: "web-form",
});
