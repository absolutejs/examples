import type {
  StoredVoiceCallReviewArtifact,
  VoiceCallReviewPostCallSummary as CoreVoiceCallReviewPostCallSummary,
  VoiceCallReviewTimelineEvent as CoreVoiceCallReviewTimelineEvent,
  VoiceSessionRecord,
  VoiceTurnRecord,
} from "@absolutejs/voice";
import type { SavedIntake } from "../types/domain";

export type VoiceReviewStatus = "healthy" | "partial" | "failed";
export type VoiceReviewTimelineEvent = CoreVoiceCallReviewTimelineEvent;
export type VoiceReviewPostCallSummary = CoreVoiceCallReviewPostCallSummary;

export type SavedVoiceReviewArtifact = Omit<
  StoredVoiceCallReviewArtifact,
  "config" | "generatedAt"
> & {
  config: NonNullable<StoredVoiceCallReviewArtifact["config"]> & {
    phraseHints: string[];
    preset: string;
    stt: {
      model: string;
      provider: string;
    };
  };
  generatedAt: number;
  intakeId: string;
  scenarioId: SavedIntake["scenarioId"];
  sessionId: string;
};

export type VoiceReviewFilterInput = {
  outcome?: SavedIntake["callDisposition"] | "all";
  q?: string;
  scenario?: SavedIntake["scenarioId"] | "all";
  status?: VoiceReviewStatus | "all";
};

export type VoiceReviewDerivedState = {
  status: VoiceReviewStatus;
  warnings: string[];
};

const DEMO_STT_CONFIG = {
  model: "flux-general-en",
  provider: "deepgram",
} as const;

const DEMO_PRESET = "reliability";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatMetric = (value: number | undefined, unit = "ms") =>
  typeof value === "number" ? `${Math.round(value * 100) / 100}${unit}` : "n/a";

const normalizeMs = (value: number | undefined, sessionCreatedAt: number) => {
  if (typeof value !== "number") {
    return undefined;
  }

  return Math.max(0, value - sessionCreatedAt);
};

const summarizeTurn = (turn: VoiceTurnRecord) => ({
  atMs: 0,
  confidence: turn.quality?.averageConfidence,
  event: "commit",
  source: "turn" as const,
  text: turn.text,
});

const formatReviewStatusLabel = (status: VoiceReviewStatus) =>
  status === "healthy"
    ? "Healthy"
    : status === "partial"
      ? "Needs review"
      : "Failed";

const getStatusClassName = (status: VoiceReviewStatus) => `status-${status}`;

const getReplayHref = (sessionId: string) =>
  `/api/voice-sessions/${encodeURIComponent(sessionId)}/replay/htmx`;

const getOperationsRecordHref = (sessionId: string) =>
  `/voice-operations/${encodeURIComponent(sessionId)}`;

const includesText = (value: string | undefined, search: string) =>
  typeof value === "string" && value.toLowerCase().includes(search);

const formatCallOutcomeLabel = (outcome: SavedIntake["callDisposition"]) => {
  switch (outcome) {
    case "transferred":
      return "Transferred";
    case "escalated":
      return "Escalated";
    case "voicemail":
      return "Voicemail";
    case "no-answer":
      return "No answer";
    case "failed":
      return "Failed";
    case "closed":
      return "Closed";
    case "completed":
      return "Completed";
    default:
      return undefined;
  }
};

const buildPostCallSummary = (input: {
  outcome?: SavedIntake["callDisposition"];
  reason?: string;
  target?: string;
}): VoiceReviewPostCallSummary | undefined => {
  const label = input.outcome
    ? formatCallOutcomeLabel(input.outcome)
    : undefined;

  if (!label) {
    return undefined;
  }

  switch (input.outcome) {
    case "transferred":
      return {
        label: input.target ? `Transferred to ${input.target}` : label,
        reason: input.reason,
        recommendedAction:
          "Verify the downstream queue or agent actually received the handoff.",
        summary: input.target
          ? `This call exited the demo flow by transferring to ${input.target}.`
          : "This call exited the demo flow by transferring to another queue or agent.",
        target: input.target,
      };
    case "escalated":
      return {
        label,
        reason: input.reason,
        recommendedAction:
          "Review the transcript and assign a human follow-up task.",
        summary:
          "This call was marked for human escalation instead of finishing in the automated flow.",
      };
    case "voicemail":
      return {
        label,
        reason: input.reason,
        recommendedAction:
          "Review the message and queue a callback or follow-up task.",
        summary:
          "This call was routed to the voicemail path instead of a live resolution.",
      };
    case "no-answer":
      return {
        label,
        reason: input.reason,
        recommendedAction:
          "Retry the call or move it to the voicemail/retry workflow.",
        summary: "This call ended without a successful live contact.",
      };
    case "failed":
      return {
        label,
        reason: input.reason,
        recommendedAction:
          "Inspect the warnings and timeline before retrying the flow.",
        summary: "The call ended in a failure state and needs operator review.",
      };
    case "closed":
      return {
        label,
        reason: input.reason,
        recommendedAction:
          "Confirm the caller intentionally ended the session and no follow-up is needed.",
        summary:
          "The session was closed explicitly without a richer final outcome.",
      };
    case "completed":
    default:
      return {
        label,
        reason: input.reason,
        recommendedAction:
          "No manual action is required unless the warnings suggest otherwise.",
        summary: "The call completed normally inside the demo flow.",
      };
  }
};

const deriveVoiceReviewState = (
  review: SavedVoiceReviewArtifact,
): VoiceReviewDerivedState => {
  const warnings: string[] = [];
  const transcript = review.transcript.actual.trim();
  const hasCommit = review.timeline.some(
    (entry) => entry.source === "turn" && entry.event === "commit",
  );
  const hasFinal = review.timeline.some(
    (entry) => entry.source === "stt" && entry.event === "final",
  );

  if (review.errors.length > 0) {
    warnings.push(
      `Captured ${review.errors.length} runtime error${review.errors.length === 1 ? "" : "s"}.`,
    );
  }

  if (!transcript) {
    warnings.push("Transcript is empty.");
  }

  if (review.summary.turnCount === 0 || !hasCommit) {
    warnings.push("No committed turns were recorded.");
  }

  if (!hasFinal) {
    warnings.push("No final STT events were recorded.");
  }

  if ((review.summary.firstTurnLatencyMs ?? 0) > 6_000) {
    warnings.push(
      `Slow first turn at ${formatMetric(review.summary.firstTurnLatencyMs)}.`,
    );
  }

  if ((review.summary.elapsedMs ?? 0) > 15_000) {
    warnings.push(
      `Long call duration at ${formatMetric(review.summary.elapsedMs)}.`,
    );
  }

  if (review.notes.some((note) => note.startsWith("Last STT text:"))) {
    const lastSttText = review.notes
      .find((note) => note.startsWith("Last STT text:"))
      ?.slice("Last STT text:".length)
      .trim();
    if (
      lastSttText &&
      transcript &&
      !lastSttText.toLowerCase().includes(transcript.toLowerCase()) &&
      !transcript.toLowerCase().includes(lastSttText.toLowerCase())
    ) {
      warnings.push("Final transcript diverged from the last STT event.");
    }
  }

  const status: VoiceReviewStatus =
    !transcript || review.errors.length > 0 || review.summary.turnCount === 0
      ? "failed"
      : warnings.length > 0 || !review.summary.pass
        ? "partial"
        : "healthy";

  return { status, warnings };
};

export const buildSavedVoiceReview = (input: {
  phraseHints: Array<{ text: string }>;
  result: SavedIntake;
  session: VoiceSessionRecord;
}) => {
  const sortedTranscripts = [...input.session.transcripts].sort(
    (left, right) => {
      const leftAt = left.endedAtMs ?? left.startedAtMs ?? 0;
      const rightAt = right.endedAtMs ?? right.startedAtMs ?? 0;

      return leftAt - rightAt;
    },
  );
  const transcriptTimeline: VoiceReviewTimelineEvent[] =
    sortedTranscripts.flatMap((transcript) => {
      const eventAt = normalizeMs(
        transcript.endedAtMs ?? transcript.startedAtMs,
        input.session.createdAt,
      );

      if (eventAt === undefined) {
        return [];
      }

      return [
        {
          atMs: eventAt,
          confidence: transcript.confidence,
          event: transcript.isFinal ? "final" : "partial",
          source: "stt" as const,
          text: transcript.text,
        },
      ];
    });

  const turnTimeline: VoiceReviewTimelineEvent[] = input.session.turns.flatMap(
    (turn) => {
      const commitAt =
        normalizeMs(turn.committedAt, input.session.createdAt) ?? 0;
      const commitEvent: VoiceReviewTimelineEvent = {
        ...summarizeTurn(turn),
        atMs: commitAt,
      };

      if (!turn.assistantText) {
        return [commitEvent];
      }

      return [
        commitEvent,
        {
          atMs: commitAt,
          event: "assistant",
          source: "turn",
          text: turn.assistantText,
        },
      ];
    },
  );

  const timeline = [
    {
      atMs: 0,
      event: "start",
      reason: input.result.scenarioId,
      source: "benchmark" as const,
      text: input.result.sessionId,
    },
    ...transcriptTimeline,
    ...turnTimeline,
  ].sort((left, right) => left.atMs - right.atMs);

  const firstPartial = timeline.find(
    (entry) => entry.source === "stt" && entry.event === "partial",
  );
  const firstCommit = timeline.find(
    (entry) => entry.source === "turn" && entry.event === "commit",
  );
  const lastTimelineEvent = timeline.at(-1);
  const latencyBreakdown = [
    typeof firstPartial?.atMs === "number"
      ? {
          label: "start to first partial",
          valueMs: firstPartial.atMs,
        }
      : undefined,
    typeof firstPartial?.atMs === "number" &&
    typeof firstCommit?.atMs === "number"
      ? {
          label: "first partial to first commit",
          valueMs: firstCommit.atMs - firstPartial.atMs,
        }
      : undefined,
  ].filter(
    (entry): entry is { label: string; valueMs: number } =>
      entry !== undefined && entry.valueMs >= 0,
  );

  const lastTranscript = [...transcriptTimeline]
    .reverse()
    .find((entry) => typeof entry.text === "string" && entry.text.length > 0);

  return {
    config: {
      phraseHints: input.phraseHints.map((hint) => hint.text),
      preset: DEMO_PRESET,
      stt: DEMO_STT_CONFIG,
    },
    errors: [],
    generatedAt: Date.now(),
    id: `${input.result.id}-review`,
    intakeId: input.result.id,
    latencyBreakdown,
    notes: [
      `Scenario: ${input.result.scenarioId}`,
      input.result.detectedName
        ? `Detected name: ${input.result.detectedName}`
        : undefined,
      input.result.callTarget
        ? `Call target: ${input.result.callTarget}`
        : undefined,
      input.result.callReason
        ? `Call reason: ${input.result.callReason}`
        : undefined,
      `Turns: ${input.result.turnCount}`,
      lastTranscript?.text
        ? `Last STT text: "${lastTranscript.text}"`
        : undefined,
    ].filter((entry): entry is string => typeof entry === "string"),
    postCall: buildPostCallSummary({
      outcome: input.result.callDisposition,
      reason: input.result.callReason,
      target: input.result.callTarget,
    }),
    scenarioId: input.result.scenarioId,
    sessionId: input.result.sessionId,
    summary: {
      elapsedMs: lastTimelineEvent?.atMs,
      firstTurnLatencyMs: firstCommit?.atMs,
      outcome: input.result.callDisposition,
      pass: true,
      turnCount: input.result.turnCount,
    },
    timeline,
    title: `${input.result.title} review`,
    transcript: {
      actual: input.result.transcript,
    },
  } satisfies SavedVoiceReviewArtifact;
};
export const filterVoiceReviews = (
  reviews: SavedVoiceReviewArtifact[],
  filters: VoiceReviewFilterInput,
) => {
  const search = filters.q?.trim().toLowerCase();

  return listVoiceReviews(reviews).filter((review) => {
    const derived = deriveVoiceReviewState(review);

    if (
      filters.scenario &&
      filters.scenario !== "all" &&
      review.scenarioId !== filters.scenario
    ) {
      return false;
    }

    if (
      filters.status &&
      filters.status !== "all" &&
      derived.status !== filters.status
    ) {
      return false;
    }

    if (
      filters.outcome &&
      filters.outcome !== "all" &&
      review.summary.outcome !== filters.outcome
    ) {
      return false;
    }

    if (!search) {
      return true;
    }

    return [
      review.title,
      review.transcript.actual,
      review.summary.outcome,
      review.postCall?.label,
      review.postCall?.summary,
      review.postCall?.recommendedAction,
      ...review.notes,
      ...derived.warnings,
    ].some((value) => includesText(value, search));
  });
};
export const findVoiceReview = (
  reviews: SavedVoiceReviewArtifact[],
  reviewId: string,
) => reviews.find((review) => review.id === reviewId) ?? null;
export const listVoiceReviews = (reviews: SavedVoiceReviewArtifact[]) =>
  [...reviews].sort((left, right) => right.generatedAt - left.generatedAt);

const renderWarnings = (warnings: string[]) =>
  warnings.length > 0
    ? `<ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>`
    : `<p>No warnings.</p>`;

export const renderVoiceReviewComparePage = (
  left: SavedVoiceReviewArtifact | null,
  right: SavedVoiceReviewArtifact | null,
) => {
  if (!left || !right) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AbsoluteJS Voice Review Compare</title>
  <style>
    body { background: #0b0d10; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 32px; }
    main { max-width: 880px; margin: 0 auto; }
    section { background: #13161b; border: 1px solid #232833; border-radius: 18px; padding: 20px; }
    a { color: #f59e0b; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>Compare reviews</h1>
      <p>Choose two valid reviews to compare.</p>
      <p><a href="/reviews">Back to reviews</a></p>
    </section>
  </main>
</body>
</html>`;
  }

  const leftDerived = deriveVoiceReviewState(left);
  const rightDerived = deriveVoiceReviewState(right);

  const renderColumn = (
    artifact: SavedVoiceReviewArtifact,
    derived: VoiceReviewDerivedState,
  ) => `
    <section>
      <h2>${escapeHtml(artifact.title)}</h2>
      <p><a href="/reviews/${encodeURIComponent(artifact.id)}">Open full review</a></p>
      <div class="pill ${getStatusClassName(derived.status)}">${formatReviewStatusLabel(derived.status)}</div>
      <ul>
        <li><strong>Scenario:</strong> ${escapeHtml(artifact.scenarioId)}</li>
        <li><strong>Outcome:</strong> ${artifact.postCall ? escapeHtml(artifact.postCall.label) : artifact.summary.outcome ? escapeHtml(artifact.summary.outcome) : "n/a"}</li>
        ${artifact.postCall?.summary ? `<li><strong>Summary:</strong> ${escapeHtml(artifact.postCall.summary)}</li>` : ""}
        ${artifact.postCall?.recommendedAction ? `<li><strong>Recommended action:</strong> ${escapeHtml(artifact.postCall.recommendedAction)}</li>` : ""}
        <li><strong>First turn:</strong> ${formatMetric(artifact.summary.firstTurnLatencyMs)}</li>
        <li><strong>Elapsed:</strong> ${formatMetric(artifact.summary.elapsedMs)}</li>
        <li><strong>Turns:</strong> ${artifact.summary.turnCount}</li>
      </ul>
      <h3>Warnings</h3>
      ${renderWarnings(derived.warnings)}
      <h3>Transcript</h3>
      <pre>${escapeHtml(artifact.transcript.actual)}</pre>
    </section>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AbsoluteJS Voice Review Compare</title>
  <style>
    :root { color-scheme: dark; }
    body { background: #0b0d10; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; }
    main { max-width: 1200px; margin: 0 auto; display: grid; gap: 16px; }
    section { background: #13161b; border: 1px solid #232833; border-radius: 18px; padding: 20px; }
    .columns { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
    .pill { display: inline-flex; background: #0f1217; border: 1px solid #232833; border-radius: 999px; padding: 6px 10px; margin-bottom: 12px; }
    .status-healthy { border-color: #14532d; color: #bbf7d0; }
    .status-partial { border-color: #854d0e; color: #fde68a; }
    .status-failed { border-color: #7f1d1d; color: #fecaca; }
    ul { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #0f1217; border-radius: 12px; padding: 14px; border: 1px solid #232833; }
    a { color: #f59e0b; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>Compare reviews</h1>
      <p><a href="/reviews">Back to reviews</a></p>
    </section>
    <div class="columns">
      ${renderColumn(left, leftDerived)}
      ${renderColumn(right, rightDerived)}
    </div>
  </main>
</body>
</html>`;
};
export const renderVoiceReviewIndexPage = (
  reviews: SavedVoiceReviewArtifact[],
  filters: VoiceReviewFilterInput = {},
) => {
  const filteredReviews = filterVoiceReviews(reviews, filters);
  const opsSummary = listVoiceReviews(reviews).reduce(
    (summary, review) => {
      const { outcome } = review.summary;
      if (outcome) {
        summary.outcomes.set(outcome, (summary.outcomes.get(outcome) ?? 0) + 1);
      }
      if (review.postCall?.target) {
        summary.targets.set(
          review.postCall.target,
          (summary.targets.get(review.postCall.target) ?? 0) + 1,
        );
      }

      return summary;
    },
    {
      outcomes: new Map<string, number>(),
      targets: new Map<string, number>(),
    },
  );
  const counts = listVoiceReviews(reviews).reduce(
    (summary, review) => {
      const { status } = deriveVoiceReviewState(review);
      summary.total += 1;
      summary[status] += 1;

      return summary;
    },
    { failed: 0, healthy: 0, partial: 0, total: 0 },
  );

  const latestId = listVoiceReviews(reviews)[0]?.id;
  const outcomeItems = [...opsSummary.outcomes.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(
      ([label, count]) =>
        `<li>${escapeHtml(formatCallOutcomeLabel(label as SavedIntake["callDisposition"]) ?? label)}: ${count}</li>`,
    )
    .join("");
  const targetItems = [...opsSummary.targets.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([label, count]) => `<li>${escapeHtml(label)}: ${count}</li>`)
    .join("");
  const items = filteredReviews
    .map((review) => {
      const derived = deriveVoiceReviewState(review);
      const compareTarget =
        latestId && latestId !== review.id ? latestId : undefined;

      return `<article class="review-item">
  <div class="review-item-header">
    <strong>${escapeHtml(review.title)}</strong>
    <span>${new Date(review.generatedAt).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    })}</span>
  </div>
  <div class="review-item-meta">
    <span class="pill ${getStatusClassName(derived.status)}">${formatReviewStatusLabel(derived.status)}</span>
    <span class="pill">${escapeHtml(review.scenarioId)}</span>
    <span class="pill">${review.summary.turnCount} turn${review.summary.turnCount === 1 ? "" : "s"}</span>
    ${review.postCall ? `<span class="pill">${escapeHtml(review.postCall.label)}</span>` : review.summary.outcome ? `<span class="pill">${escapeHtml(review.summary.outcome)}</span>` : ""}
    <span class="pill">first turn ${formatMetric(review.summary.firstTurnLatencyMs)}</span>
    <span class="pill">${derived.warnings.length} warning${derived.warnings.length === 1 ? "" : "s"}</span>
  </div>
  <p>${escapeHtml(review.transcript.actual)}</p>
  ${review.postCall ? `<p class="saved-summary"><strong>${escapeHtml(review.postCall.summary)}</strong> Recommended action: ${escapeHtml(review.postCall.recommendedAction)}</p>` : ""}
  ${derived.warnings.length > 0 ? `<div class="review-warning-list">${renderWarnings(derived.warnings)}</div>` : ""}
  <p>
    <a href="${getOperationsRecordHref(review.sessionId)}">Open operations record</a>
    · <a href="/reviews/${encodeURIComponent(review.id)}">Open review</a>
    · <a href="${getReplayHref(review.sessionId)}">Open replay</a>
    ${compareTarget ? ` · <a href="/reviews/compare?left=${encodeURIComponent(review.id)}&right=${encodeURIComponent(compareTarget)}">Compare with latest</a>` : ""}
  </p>
</article>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AbsoluteJS Voice Reviews</title>
  <style>
    :root { color-scheme: dark; }
    body { background: #0b0d10; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; }
    main { max-width: 1080px; margin: 0 auto; display: grid; gap: 16px; }
    section, article, form { background: #13161b; border: 1px solid #232833; border-radius: 18px; padding: 20px; }
    .review-list { display: grid; gap: 14px; }
    .review-item-header, .review-item-meta, .toolbar { display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; }
    .review-item-meta, .toolbar { justify-content: flex-start; margin: 10px 0; align-items: center; }
    .pill { background: #0f1217; border: 1px solid #232833; border-radius: 999px; padding: 6px 10px; }
    .status-healthy { border-color: #14532d; color: #bbf7d0; }
    .status-partial { border-color: #854d0e; color: #fde68a; }
    .status-failed { border-color: #7f1d1d; color: #fecaca; }
    .summary-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
    label { display: grid; gap: 6px; min-width: 180px; }
    input, select { background: #0f1217; color: #f4f4f5; border: 1px solid #232833; border-radius: 10px; padding: 10px 12px; }
    a { color: #f59e0b; }
    button { background: #f59e0b; color: #111827; border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 600; cursor: pointer; }
    .review-warning-list ul { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>Saved voice reviews</h1>
      <p>These artifacts come from the real demo voice route, not benchmark fixtures.</p>
      <div class="summary-grid">
        <div class="pill">Total ${counts.total}</div>
        <div class="pill status-healthy">Healthy ${counts.healthy}</div>
        <div class="pill status-partial">Needs review ${counts.partial}</div>
        <div class="pill status-failed">Failed ${counts.failed}</div>
      </div>
      <div class="summary-grid">
        <div>
          <strong>Outcome mix</strong>
          <ul>${outcomeItems || "<li>No outcomes yet.</li>"}</ul>
        </div>
        <div>
          <strong>Top transfer targets</strong>
          <ul>${targetItems || "<li>No transfer targets yet.</li>"}</ul>
        </div>
      </div>
      <p><a href="/react">Back to demo</a> · <a href="/resilience">Resilience</a> · <a href="/sessions">Sessions</a> · <a href="/handoffs">Handoffs</a> · <a href="/tasks">Open task queue</a> · <a href="/integrations">Integration events</a></p>
    </section>
    <form action="/reviews" method="get">
      <div class="toolbar">
        <label>
          Search
          <input name="q" type="search" value="${escapeHtml(filters.q ?? "")}" placeholder="Search transcript, notes, warnings" />
        </label>
        <label>
          Scenario
          <select name="scenario">
            <option value="all"${(filters.scenario ?? "all") === "all" ? " selected" : ""}>All</option>
            <option value="guided"${filters.scenario === "guided" ? " selected" : ""}>Guided</option>
            <option value="general"${filters.scenario === "general" ? " selected" : ""}>General</option>
          </select>
        </label>
        <label>
          Status
          <select name="status">
            <option value="all"${(filters.status ?? "all") === "all" ? " selected" : ""}>All</option>
            <option value="healthy"${filters.status === "healthy" ? " selected" : ""}>Healthy</option>
            <option value="partial"${filters.status === "partial" ? " selected" : ""}>Needs review</option>
            <option value="failed"${filters.status === "failed" ? " selected" : ""}>Failed</option>
          </select>
        </label>
        <label>
          Outcome
          <select name="outcome">
            <option value="all"${(filters.outcome ?? "all") === "all" ? " selected" : ""}>All</option>
            <option value="completed"${filters.outcome === "completed" ? " selected" : ""}>Completed</option>
            <option value="transferred"${filters.outcome === "transferred" ? " selected" : ""}>Transferred</option>
            <option value="escalated"${filters.outcome === "escalated" ? " selected" : ""}>Escalated</option>
            <option value="voicemail"${filters.outcome === "voicemail" ? " selected" : ""}>Voicemail</option>
            <option value="no-answer"${filters.outcome === "no-answer" ? " selected" : ""}>No answer</option>
            <option value="failed"${filters.outcome === "failed" ? " selected" : ""}>Failed</option>
            <option value="closed"${filters.outcome === "closed" ? " selected" : ""}>Closed</option>
          </select>
        </label>
        <button type="submit">Apply filters</button>
      </div>
    </form>
    <section class="review-list">
      ${
        items ||
        `<p>No review artifacts matched. Complete a voice demo run first or clear the current filters.</p>`
      }
    </section>
  </main>
</body>
</html>`;
};
export const renderVoiceReviewPage = (
  artifact: SavedVoiceReviewArtifact | null,
) => {
  if (!artifact) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AbsoluteJS Voice Review</title>
  <style>
    body { background: #0b0d10; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 32px; }
    main { max-width: 880px; margin: 0 auto; }
    section { background: #13161b; border: 1px solid #232833; border-radius: 18px; padding: 20px; }
    a { color: #f59e0b; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>Review not found</h1>
      <p><a href="/reviews">Back to reviews</a></p>
    </section>
  </main>
</body>
</html>`;
  }

  const derived = deriveVoiceReviewState(artifact);
  const notes = artifact.notes
    .map((note) => `<li>${escapeHtml(note)}</li>`)
    .join("");
  const latency = artifact.latencyBreakdown
    .map(
      (entry) =>
        `<li><strong>${escapeHtml(entry.label)}:</strong> ${formatMetric(entry.valueMs)}</li>`,
    )
    .join("");
  const timeline = artifact.timeline
    .map((entry) => {
      const parts = [`${entry.atMs}ms`, `[${entry.source}]`, entry.event];
      if (entry.text) parts.push(`“${entry.text}”`);
      if (entry.reason) parts.push(`reason=${entry.reason}`);
      if (typeof entry.confidence === "number") {
        parts.push(`confidence=${Math.round(entry.confidence * 100) / 100}`);
      }

      return `<li>${escapeHtml(parts.join(" "))}</li>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(artifact.title)}</title>
  <style>
    :root { color-scheme: dark; }
    body { background: #0b0d10; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; }
    main { max-width: 980px; margin: 0 auto; display: grid; gap: 16px; }
    section { background: #13161b; border: 1px solid #232833; border-radius: 18px; padding: 20px; }
    h1, h2 { margin: 0 0 12px; }
    ul { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #0f1217; border-radius: 12px; padding: 14px; border: 1px solid #232833; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .metric { display: grid; gap: 4px; }
    .label { color: #a1a1aa; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.08em; }
    .value { font-size: 1.05rem; }
    .pill { display: inline-flex; background: #0f1217; border: 1px solid #232833; border-radius: 999px; padding: 6px 10px; }
    .status-healthy { border-color: #14532d; color: #bbf7d0; }
    .status-partial { border-color: #854d0e; color: #fde68a; }
    .status-failed { border-color: #7f1d1d; color: #fecaca; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 10px; }
    a { color: #f59e0b; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>${escapeHtml(artifact.title)}</h1>
      <div class="toolbar">
        <a href="/reviews">Back to reviews</a>
        <a href="/resilience">Resilience</a>
        <a href="/sessions">Sessions</a>
        <a href="/handoffs">Handoffs</a>
        <a href="/tasks">Open task queue</a>
        <a href="/integrations">Integration events</a>
        <a href="${getOperationsRecordHref(artifact.sessionId)}">Open operations record</a>
        <a href="${getReplayHref(artifact.sessionId)}">Open session replay</a>
        <a href="/reviews/compare?left=${encodeURIComponent(artifact.id)}">Compare this review</a>
      </div>
    </section>
    <section>
      <div class="grid">
        <div class="metric"><div class="label">Status</div><div class="value"><span class="pill ${getStatusClassName(derived.status)}">${formatReviewStatusLabel(derived.status)}</span></div></div>
        <div class="metric"><div class="label">Scenario</div><div class="value">${escapeHtml(artifact.scenarioId)}</div></div>
        <div class="metric"><div class="label">Outcome</div><div class="value">${artifact.summary.outcome ? `<span class="pill">${escapeHtml(artifact.summary.outcome)}</span>` : "n/a"}</div></div>
        <div class="metric"><div class="label">First Turn</div><div class="value">${formatMetric(artifact.summary.firstTurnLatencyMs)}</div></div>
        <div class="metric"><div class="label">Elapsed</div><div class="value">${formatMetric(artifact.summary.elapsedMs)}</div></div>
        <div class="metric"><div class="label">Turns</div><div class="value">${artifact.summary.turnCount}</div></div>
      </div>
    </section>
    <section>
      <h2>Warnings</h2>
      ${renderWarnings(derived.warnings)}
    </section>
    <section>
      <h2>Call Outcome</h2>
      ${
        artifact.postCall
          ? `<ul>
        <li><strong>Outcome:</strong> ${escapeHtml(artifact.postCall.label)}</li>
        <li><strong>Summary:</strong> ${escapeHtml(artifact.postCall.summary)}</li>
        <li><strong>Recommended action:</strong> ${escapeHtml(artifact.postCall.recommendedAction)}</li>
        ${artifact.postCall.target ? `<li><strong>Target:</strong> ${escapeHtml(artifact.postCall.target)}</li>` : ""}
        ${artifact.postCall.reason ? `<li><strong>Reason:</strong> ${escapeHtml(artifact.postCall.reason)}</li>` : ""}
      </ul>`
          : `<p>No post-call outcome summary was captured.</p>`
      }
    </section>
    <section>
      <h2>Transcript</h2>
      <ul>
        <li><strong>Actual:</strong> ${escapeHtml(artifact.transcript.actual)}</li>
      </ul>
    </section>
    <section>
      <h2>Notes</h2>
      <ul>${notes || "<li>No notes.</li>"}</ul>
    </section>
    <section>
      <h2>Latency Breakdown</h2>
      <ul>${latency || "<li>No latency data.</li>"}</ul>
    </section>
    <section>
      <h2>Timeline</h2>
      <ul>${timeline || "<li>No timeline events.</li>"}</ul>
    </section>
    <section>
      <h2>Config</h2>
      <pre>${escapeHtml(JSON.stringify(artifact.config, null, 2))}</pre>
    </section>
  </main>
</body>
</html>`;
};
