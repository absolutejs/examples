import { voiceDocumentTable } from "@absolutejs/voice/drizzle";
import { bigint, jsonb, pgTable, text } from "drizzle-orm/pg-core";

// The demo's own domain table: captured intakes ("saved captures" in the UI).
export const savedIntakesTable = voiceDocumentTable("saved_intakes");

// voice_assistant_memory is the one non-document voice table: keyed by
// (assistant_id, namespace, key) but with a single surrogate `id` primary key so
// drizzle-kit push stays idempotent. Mirrors @absolutejs/voice's
// voiceAssistantMemoryTable exactly.
export const voiceAssistantMemoryTable = pgTable("voice_assistant_memory", {
  assistantId: text("assistant_id").notNull(),
  id: text("id").primaryKey(),
  key: text("key").notNull(),
  namespace: text("namespace").notNull(),
  payload: jsonb("payload").notNull(),
  sortAt: bigint("sort_at", { mode: "number" }).notNull(),
});

// The rest of the voice platform tables share the (id, sort_at, payload)
// document shape, so they reuse the package's voiceDocumentTable helper — the
// shape stays in lockstep with the package. Add a line here if a package
// upgrade introduces a new voice table.
export const voiceAuditDeliveriesTable = voiceDocumentTable(
  "voice_audit_deliveries",
);
export const voiceAuditTable = voiceDocumentTable("voice_audit");
export const voiceCampaignsTable = voiceDocumentTable("voice_campaigns");
export const voiceEvalBaselineTable = voiceDocumentTable("voice_eval_baseline");
export const voiceEventsTable = voiceDocumentTable("voice_events");
export const voiceExternalObjectsTable = voiceDocumentTable(
  "voice_external_objects",
);
export const voiceHandoffDeliveriesTable = voiceDocumentTable(
  "voice_handoff_deliveries",
);
export const voiceIncidentBundlesTable = voiceDocumentTable(
  "voice_incident_bundles",
);
export const voiceObservabilityExportReceiptsTable = voiceDocumentTable(
  "voice_observability_export_receipts",
);
export const voiceRealCallProfileEvidenceTable = voiceDocumentTable(
  "voice_real_call_profile_evidence",
);
export const voiceRealCallProfileRecoveryJobsTable = voiceDocumentTable(
  "voice_real_call_profile_recovery_jobs",
);
export const voiceReviewsTable = voiceDocumentTable("voice_reviews");
export const voiceSessionsTable = voiceDocumentTable("voice_sessions");
export const voiceTasksTable = voiceDocumentTable("voice_tasks");
export const voiceTelephonyWebhookIdempotencyTable = voiceDocumentTable(
  "voice_telephony_webhook_idempotency",
);
export const voiceTraceDeliveriesTable = voiceDocumentTable(
  "voice_trace_deliveries",
);
export const voiceTracesTable = voiceDocumentTable("voice_traces");
