import { networking, prepare } from "@absolutejs/absolute";
import {
  createCRMRuntime,
  createCRMWebhookReceiver,
  createHubSpotCRMWebhookConfig,
  createInMemoryCRMLocalEntityStore,
  createInMemoryCRMSyncQueue,
  createInMemoryCRMTokenStore,
  type CRMAdapter,
  type CRMContact,
  type CRMVendor,
} from "@absolutejs/crm";
import { Elysia, type Elysia as ElysiaType } from "elysia";
import { pagesPlugin } from "./plugins/pagesPlugin";
import {
  CRM_HUBSPOT_WEBHOOK_ROUTE,
  CRM_LEAD_ROUTE,
  CRM_RECENT_CONTACTS_ROUTE,
  type LeadFormPayload,
  type RecentContactsResponse,
  type SavedContact,
} from "../shared/demo";

const DEMO_VENDOR: CRMVendor = "hubspot";
const DEMO_USER = "demo-user";

const localEntityStore = createInMemoryCRMLocalEntityStore();
const syncQueue = createInMemoryCRMSyncQueue();
const tokenStore = createInMemoryCRMTokenStore();
await tokenStore.put({
  accessToken: "demo-token",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  userId: DEMO_USER,
  vendor: DEMO_VENDOR,
});

let nextId = 1;
const demoStubAdapter = (vendor: CRMVendor): CRMAdapter => ({
  capabilities: {
    preferredIdField: "id",
    supportsBulkUpsert: false,
    supportsCustomFields: false,
    supportsLeads: true,
    supportsPipelines: false,
    supportsWebhooks: true,
    syncDirection: "bidirectional",
  },
  vendor,
  addNote: async (input) => ({ ...input, id: `note_${nextId++}`, vendor }),
  createContact: async (input) => ({ ...input, id: `c_${nextId++}`, vendor }),
  createDeal: async (input) => ({ ...input, id: `d_${nextId++}`, vendor }),
  createLead: async (input) => ({ ...input, id: `l_${nextId++}`, vendor }),
  createTask: async (input) => ({ ...input, id: `t_${nextId++}`, vendor }),
  getContact: async () => null,
  listPipelines: async () => [],
  logActivity: async (input) => ({ ...input, id: `a_${nextId++}`, vendor }),
  lookupContactByEmail: async () => null,
  lookupContactByPhone: async () => null,
  searchContacts: async () => [],
  updateContact: async (id, patch) => ({
    emails: [],
    id,
    phones: [],
    vendor,
    ...patch,
  }),
  updateDeal: async (id, patch) => ({
    id,
    title: patch.title ?? "",
    vendor,
  }),
});

const runtime = createCRMRuntime({
  adapters: { [DEMO_VENDOR]: () => demoStubAdapter(DEMO_VENDOR) },
  echoSuppressionWindowMs: 5_000,
  localEntityStore,
  syncQueue,
  tokenStore,
});

const recordToSavedContact = (record: {
  vendor: string;
  entityId: string;
  data: Record<string, unknown>;
  localUpdatedAt: number;
}): SavedContact => {
  const { data } = record;

  return {
    createdAt: record.localUpdatedAt,
    id: record.entityId,
    vendor: record.vendor,
    ...(typeof data.firstName === "string"
      ? { firstName: data.firstName }
      : {}),
    ...(typeof data.lastName === "string" ? { lastName: data.lastName } : {}),
    ...(typeof data.company === "string" ? { company: data.company } : {}),
    ...(Array.isArray(data.emails) && typeof data.emails[0] === "object"
      ? {
          email: (data.emails[0] as { address?: string }).address ?? undefined,
        }
      : {}),
    ...(Array.isArray(data.phones) && typeof data.phones[0] === "object"
      ? {
          phone: (data.phones[0] as { number?: string }).number ?? undefined,
        }
      : {}),
  };
};

const isValidLead = (input: unknown): input is LeadFormPayload => {
  if (!input || typeof input !== "object") return false;
  const i = input as Record<string, unknown>;

  return (
    typeof i.firstName === "string" &&
    typeof i.lastName === "string" &&
    typeof i.email === "string"
  );
};

const webhookSigningSecret =
  process.env.HUBSPOT_WEBHOOK_SECRET ?? "demo-webhook-secret";

const webhookReceiver = createCRMWebhookReceiver({
  vendors: [
    createHubSpotCRMWebhookConfig({ signingSecret: webhookSigningSecret }),
  ],
  onChangeEvent: async (event) => {
    await runtime.recordInboundChange(event);
  },
});

const crmRoutes = new Elysia()
  .post(CRM_LEAD_ROUTE, async ({ body, set }) => {
    if (!isValidLead(body)) {
      set.status = 400;

      return { error: "Invalid lead payload", ok: false };
    }
    const lead = await runtime.createLead(DEMO_USER, DEMO_VENDOR, {
      emails: [{ address: body.email, primary: true }],
      firstName: body.firstName,
      lastName: body.lastName,
      phones: body.phone
        ? [{ label: "work", number: body.phone, primary: true }]
        : [],
      ...(body.company ? { company: body.company } : {}),
      ...(body.source ? { source: body.source } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
    });
    const stored = await localEntityStore.get(lead.vendor, "lead", lead.id);

    return {
      contact: stored
        ? recordToSavedContact(stored)
        : ({
            company: body.company,
            createdAt: Date.now(),
            email: body.email,
            firstName: body.firstName,
            id: lead.id,
            lastName: body.lastName,
            phone: body.phone,
            vendor: lead.vendor,
          } satisfies SavedContact),
      ok: true,
    };
  })
  .get(CRM_RECENT_CONTACTS_ROUTE, async () => {
    const records = await localEntityStore.list();
    const contacts = records
      .map(recordToSavedContact)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);

    return {
      contacts,
      cursorAt: Date.now(),
    } satisfies RecentContactsResponse;
  })
  .post(CRM_HUBSPOT_WEBHOOK_ROUTE, async ({ headers, request, set }) => {
    const rawBody = await request.text();
    const result = await webhookReceiver.handle({
      headers: Object.fromEntries(Object.entries(headers)),
      rawBody,
      vendor: "hubspot",
    });
    if (!result.ok) {
      set.status = result.reason === "signature-invalid" ? 401 : 400;

      return { ok: false, reason: result.reason };
    }

    return { events: result.events.length, ok: true };
  });

const { absolutejs, manifest } = await prepare();

const app = new Elysia();
app.use(absolutejs);
app.use(pagesPlugin(manifest));
app.use(crmRoutes);
const server = networking(app);

export type Server = typeof server;
export default server;
