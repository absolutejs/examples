import { runVoiceTelephonyMediaOperationsSmoke } from "@absolutejs/voice";

const timeoutMs = Number(
  process.env.TELEPHONY_MEDIA_OPERATIONS_SMOKE_TIMEOUT_MS ?? 5_000,
);
const sessionId = `telephony-media-ops-smoke-${Date.now()}`;

const result = await runVoiceTelephonyMediaOperationsSmoke({
  operationsRecordHref: ({ sessionId }) =>
    `/voice-operations/${encodeURIComponent(sessionId)}`,
  scenarioId: "telephony-media-operations-smoke",
  sessionId,
  timeoutMs,
});

const { operationsRecord, ...summary } = result;

console.log(
  JSON.stringify(
    {
      ...summary,
      operationsRecord: {
        sessionId: operationsRecord.sessionId,
        status: operationsRecord.status,
        telephonyMedia: operationsRecord.telephonyMedia,
      },
    },
    null,
    2,
  ),
);

if (!result.ok) {
  process.exit(1);
}
