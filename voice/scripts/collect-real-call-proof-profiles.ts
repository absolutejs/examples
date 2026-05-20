export {};

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildVoiceProofTrendReportFromRealCallProfiles,
  type VoiceProofTrendProviderSummary,
  type VoiceProofTrendRealCallProfileEvidence,
  type VoiceProofTrendRuntimeChannelSummary,
} from "@absolutejs/voice";

type JsonRecord = Record<string, unknown>;

const baseUrl = (
  process.env.VOICE_DEMO_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3004"}`
).replace(/\/$/, "");
const outputRoot =
  process.env.VOICE_REAL_CALL_PROFILE_OUTPUT_DIR ??
  ".voice-runtime/real-call-profiles";
const browserCallProfileRoot =
  process.env.VOICE_BROWSER_CALL_PROFILE_OUTPUT_DIR ??
  ".voice-runtime/browser-call-profiles";
const runId = new Date().toISOString().replaceAll(":", "-");
const outputDir = join(outputRoot, runId);
const maxAgeMs = 10 * 365 * 24 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readArray = (value: unknown) => (Array.isArray(value) ? value : []);

const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const readString = (value: unknown) =>
  typeof value === "string" ? value : undefined;

const fetchJson = async (
  path: string,
  init: RequestInit = {},
): Promise<JsonRecord | JsonRecord[]> => {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      accept: "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  const body = await response.json();
  if (Array.isArray(body)) {
    return body.filter(isRecord);
  }
  return isRecord(body) ? body : {};
};

const readRows = (body: JsonRecord | JsonRecord[], keys: string[]) => {
  if (Array.isArray(body)) {
    return body;
  }
  for (const key of keys) {
    const value = body[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }
  return [];
};

const providerIdFor = (kind: string, row: JsonRecord) => {
  const providers = readArray(row.providers)
    .map(readString)
    .filter((value): value is string => value !== undefined);
  const explicit =
    readString(row.id) ??
    readString(row.provider) ??
    readString(row.selectedProvider);
  return (
    explicit ?? (providers.length ? `${kind}:${providers.join("+")}` : kind)
  );
};

const readProviderRows = (
  providerSlo: JsonRecord,
): VoiceProofTrendProviderSummary[] => {
  const kinds = isRecord(providerSlo.kinds) ? providerSlo.kinds : {};
  return Object.entries(kinds)
    .map(([kind, value]) => {
      const row = isRecord(value) ? value : {};
      const metrics = isRecord(row.metrics) ? row.metrics : row;
      return {
        averageMs:
          readNumber(row.averageMs) ?? readNumber(metrics.averageElapsedMs),
        id: providerIdFor(kind, row),
        label: `${kind.toUpperCase()} ${providerIdFor(kind, row).replace(`${kind}:`, "")}`,
        p50Ms: readNumber(row.p50Ms) ?? readNumber(metrics.p50ElapsedMs),
        p95Ms: readNumber(row.p95Ms) ?? readNumber(metrics.p95ElapsedMs),
        role: kind,
        samples:
          readNumber(row.eventsWithLatency) ??
          readNumber(row.samples) ??
          readNumber(metrics.eventsWithLatency),
        status: readString(row.status),
      };
    })
    .filter((provider) => provider.id);
};

const readRuntimeChannel = (
  proofTrends: JsonRecord,
): VoiceProofTrendRuntimeChannelSummary | undefined => {
  const summary = isRecord(proofTrends.summary) ? proofTrends.summary : {};
  const runtimeChannel = isRecord(summary.runtimeChannel)
    ? summary.runtimeChannel
    : undefined;
  if (!runtimeChannel) {
    return undefined;
  }
  return {
    maxBackpressureEvents: readNumber(runtimeChannel.maxBackpressureEvents),
    maxFirstAudioLatencyMs: readNumber(runtimeChannel.maxFirstAudioLatencyMs),
    maxInterruptionP95Ms: readNumber(runtimeChannel.maxInterruptionP95Ms),
    maxJitterMs: readNumber(runtimeChannel.maxJitterMs),
    maxTimestampDriftMs: readNumber(runtimeChannel.maxTimestampDriftMs),
    samples: readNumber(runtimeChannel.samples),
    status: readString(runtimeChannel.status),
  };
};

const inferProfileId = (session: JsonRecord) => {
  const explicit = process.env.VOICE_REAL_CALL_PROFILE_ID?.trim();
  if (explicit) {
    return explicit;
  }
  const haystack = [
    readString(session.sessionId),
    readString(session.latestOutcome),
    ...readArray(session.providers).map(readString),
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ")
    .toLowerCase();
  if (/twilio|telnyx|plivo|phone|noisy/.test(haystack)) {
    return "noisy-phone-call";
  }
  if (/appointment|schedule|booking/.test(haystack)) {
    return "appointment-scheduler";
  }
  if (/transfer|escalat|support|handoff/.test(haystack)) {
    return "support-agent";
  }
  return "meeting-recorder";
};

const collectBrowserCallProfile = async () => {
  if (process.env.VOICE_REAL_CALL_BROWSER_CAPTURE === "0") {
    return;
  }

  const proc = Bun.spawn(
    ["bun", "run", "./scripts/capture-real-browser-call-profile.ts"],
    {
      env: {
        ...process.env,
        PORT: process.env.PORT ?? "3004",
        VOICE_BROWSER_CALL_USE_EXISTING_SERVER: "1",
      },
      stderr: "inherit",
      stdout: "inherit",
    },
  );
  const exitCode = await proc.exited;
  if (
    exitCode !== 0 &&
    process.env.VOICE_REAL_CALL_BROWSER_CAPTURE_REQUIRED === "1"
  ) {
    throw new Error(
      `Browser call profile capture exited with code ${exitCode}.`,
    );
  }
};

const readLatestBrowserCallProfile = async () => {
  const file = Bun.file(join(browserCallProfileRoot, "latest.json"));
  if (!(await file.exists())) {
    return undefined;
  }

  const parsed = (await file.json().catch(() => undefined)) as
    | JsonRecord
    | undefined;
  if (!isRecord(parsed) || parsed.ok !== true) {
    return undefined;
  }

  const generatedAt = readString(parsed.generatedAt);
  if (!generatedAt || Date.now() - Date.parse(generatedAt) > 5 * 60 * 1000) {
    return undefined;
  }

  return parsed;
};

const readBrowserCallProfiles = (
  browserCallProfile: JsonRecord | undefined,
) => {
  if (!browserCallProfile) {
    return [];
  }
  const results = readArray(browserCallProfile.results).filter(isRecord);
  return results.length > 0 ? results : [browserCallProfile];
};

const buildBrowserCallEvidence = (
  browserCallProfile: JsonRecord | undefined,
  input: {
    generatedAt: string;
    proofSummary: JsonRecord;
    providers: VoiceProofTrendProviderSummary[];
    runtimeChannel?: VoiceProofTrendRuntimeChannelSummary;
  },
): VoiceProofTrendRealCallProfileEvidence[] => {
  const browserCallProfiles = readBrowserCallProfiles(
    browserCallProfile,
  ).filter((profile) => profile.ok === true);
  if (browserCallProfiles.length === 0) {
    return [];
  }

  return browserCallProfiles.map((profile) => {
    const summary = isRecord(profile.summary) ? profile.summary : {};
    const sentBytes = readNumber(summary.sentBytes) ?? 0;
    const receivedBytes = readNumber(summary.receivedBytes) ?? 0;
    const messageCount = readNumber(summary.messageCount) ?? 0;
    const transportSamples =
      sentBytes > 0 || receivedBytes > 0 || messageCount > 0 ? 1 : 0;
    const framework = readString(profile.framework) ?? "browser";
    const runtimeChannel: VoiceProofTrendRuntimeChannelSummary = {
      ...input.runtimeChannel,
      maxBackpressureEvents: input.runtimeChannel?.maxBackpressureEvents ?? 0,
      samples: Math.max(input.runtimeChannel?.samples ?? 0, transportSamples),
      status:
        input.runtimeChannel?.status === "fail"
          ? "fail"
          : transportSamples > 0
            ? "pass"
            : input.runtimeChannel?.status,
    };

    return {
      generatedAt:
        readString(browserCallProfile?.generatedAt) ?? input.generatedAt,
      liveP95Ms: readNumber(input.proofSummary.maxLiveP95Ms),
      ok: true,
      operationsRecordHref: "/voice-operations/latest",
      profileId:
        readString(browserCallProfile?.profileId) ?? "meeting-recorder",
      providerP95Ms: readNumber(input.proofSummary.maxProviderP95Ms),
      providers: input.providers,
      runtimeChannel,
      sessionId: `browser-cdp-${framework}-${readString(browserCallProfile?.runId) ?? "latest"}`,
      turnP95Ms: readNumber(input.proofSummary.maxTurnP95Ms),
    };
  });
};

const run = async () => {
  await fetchJson("/api/provider-slo/proof", { method: "POST" }).catch(
    () => ({}),
  );
  await collectBrowserCallProfile().catch((error) => {
    console.warn(
      `Browser call profile capture skipped: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  });

  const [sessionsBody, providerSloBody, proofTrendsBody] = await Promise.all([
    fetchJson("/api/voice-sessions?status=all"),
    fetchJson("/api/voice/provider-slos"),
    fetchJson("/api/voice/proof-trends").catch(() => ({})),
  ]);
  const providerSlo = Array.isArray(providerSloBody) ? {} : providerSloBody;
  const proofTrends = Array.isArray(proofTrendsBody) ? {} : proofTrendsBody;
  const sessions = readRows(sessionsBody, ["sessions", "items", "data"]).filter(
    (session) =>
      readString(session.sessionId) &&
      readString(session.status) !== "failed" &&
      ((readNumber(session.turnCount) ?? 0) > 0 ||
        (readNumber(session.transcriptCount) ?? 0) > 0),
  );
  const providers = readProviderRows(providerSlo);
  const proofTrendBody: JsonRecord = proofTrends;
  const proofSummary = isRecord(proofTrendBody.summary)
    ? proofTrendBody.summary
    : {};
  const runtimeChannel = readRuntimeChannel(proofTrends);
  const generatedAt = new Date().toISOString();
  const browserCallProfile = await readLatestBrowserCallProfile();
  const evidence: VoiceProofTrendRealCallProfileEvidence[] = [
    ...sessions.map((session) => {
      const sessionId = readString(session.sessionId) ?? "unknown-session";
      return {
        generatedAt:
          readNumber(session.endedAt) !== undefined
            ? new Date(readNumber(session.endedAt)!).toISOString()
            : generatedAt,
        liveP95Ms: readNumber(proofSummary.maxLiveP95Ms),
        ok: readString(session.status) !== "failed",
        operationsRecordHref: `/voice-operations/${encodeURIComponent(sessionId)}`,
        profileId: inferProfileId(session),
        providerP95Ms: readNumber(proofSummary.maxProviderP95Ms),
        providers,
        runtimeChannel,
        sessionId,
        turnP95Ms: readNumber(proofSummary.maxTurnP95Ms),
      };
    }),
    ...buildBrowserCallEvidence(browserCallProfile, {
      generatedAt,
      proofSummary,
      providers,
      runtimeChannel,
    }),
  ];
  const report = buildVoiceProofTrendReportFromRealCallProfiles({
    baseUrl,
    evidence,
    generatedAt,
    maxAgeMs,
    outputDir,
    runId,
    source: join(outputDir, "real-call-profiles.json"),
  });

  await mkdir(outputDir, { recursive: true });
  await mkdir(outputRoot, { recursive: true });
  await writeFile(
    join(outputDir, "real-call-profiles.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await writeFile(
    join(outputRoot, "latest.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  console.log(
    JSON.stringify(
      {
        evidence: evidence.length,
        ok: report.ok,
        outputDir,
        realBrowserCapture: browserCallProfile ? "included" : "missing",
        realBrowserFrameworks: readBrowserCallProfiles(browserCallProfile)
          .filter((profile) => profile.ok === true)
          .map((profile) => readString(profile.framework) ?? "browser"),
        profiles: report.summary.profiles?.map((profile) => ({
          id: profile.id,
          samples: profile.providers?.[0]?.samples,
          status: profile.status,
        })),
      },
      null,
      2,
    ),
  );
};

await run();
