import type {
  StoredVoiceOpsTask,
  VoiceOpsTaskHistoryEntry,
  VoiceOpsTaskKind,
  VoiceOpsTaskStatus,
} from "@absolutejs/voice";
import type { SavedVoiceReviewArtifact } from "./reviewPage";

export type SavedVoiceOpsTask = StoredVoiceOpsTask & {
  intakeId: string;
  reviewId: string;
};

export type VoiceOpsTaskFilterInput = {
  kind?: VoiceOpsTaskKind | "all";
  outcome?: SavedVoiceReviewArtifact["summary"]["outcome"] | "all";
  status?: VoiceOpsTaskStatus | "all";
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatTaskKind = (kind: VoiceOpsTaskKind) => {
  switch (kind) {
    case "appointment-booking":
      return "Appointment booking";
    case "callback":
      return "Callback";
    case "escalation":
      return "Escalation";
    case "lead-qualification":
      return "Lead qualification";
    case "support-triage":
      return "Support triage";
    case "transfer-check":
      return "Transfer check";
    case "retry-review":
      return "Retry review";
    default:
      return kind;
  }
};

const formatOutcome = (
  outcome: SavedVoiceReviewArtifact["summary"]["outcome"],
) => {
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

const formatTaskStatus = (status: VoiceOpsTaskStatus) => {
  switch (status) {
    case "in-progress":
      return "In progress";
    case "done":
      return "Done";
    case "open":
    default:
      return "Open";
  }
};

const getTaskStatusClassName = (status: VoiceOpsTaskStatus) =>
  `status-${status}`;

const getReplayHref = (sessionId: string) =>
  `/api/voice-sessions/${encodeURIComponent(sessionId)}/replay/htmx`;

const MINUTE_MS = 60 * 1000;
const URGENT_SLA_MS = 10 * MINUTE_MS;
const FAST_SLA_MS = 15 * MINUTE_MS;
const STANDARD_SLA_MS = 20 * MINUTE_MS;
const REVIEW_SLA_MS = 30 * MINUTE_MS;

const getTaskSlaWindowMs = (task: SavedVoiceOpsTask) => {
  switch (task.kind) {
    case "escalation":
      return URGENT_SLA_MS;
    case "lead-qualification":
      return FAST_SLA_MS;
    case "support-triage":
    case "transfer-check":
      return STANDARD_SLA_MS;
    case "callback":
    case "appointment-booking":
      return FAST_SLA_MS;
    case "retry-review":
    default:
      return REVIEW_SLA_MS;
  }
};

const isTaskSlaBreached = (task: SavedVoiceOpsTask) =>
  task.status !== "done" &&
  Date.now() - task.createdAt > getTaskSlaWindowMs(task);

const formatTaskAge = (createdAt: number) => {
  const elapsedMinutes = Math.max(
    0,
    Math.round((Date.now() - createdAt) / 60000),
  );
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`;
  }
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

const formatHistoryType = (type: VoiceOpsTaskHistoryEntry["type"]) => {
  switch (type) {
    case "created":
      return "Created";
    case "assigned":
      return "Assigned";
    case "started":
      return "Started";
    case "completed":
      return "Completed";
    case "reopened":
      return "Reopened";
    default:
      return type;
  }
};

export const listVoiceOpsTasks = (tasks: SavedVoiceOpsTask[]) =>
  [...tasks].sort((left, right) => right.createdAt - left.createdAt);

export const filterVoiceOpsTasks = (
  tasks: SavedVoiceOpsTask[],
  filters: VoiceOpsTaskFilterInput = {},
) =>
  listVoiceOpsTasks(tasks).filter((task) => {
    if (
      filters.status &&
      filters.status !== "all" &&
      task.status !== filters.status
    ) {
      return false;
    }

    if (filters.kind && filters.kind !== "all" && task.kind !== filters.kind) {
      return false;
    }

    if (
      filters.outcome &&
      filters.outcome !== "all" &&
      task.outcome !== filters.outcome
    ) {
      return false;
    }

    return true;
  });

export const summarizeVoiceOpsTasks = (tasks: SavedVoiceOpsTask[]) => {
  const summary = {
    open: 0,
    inProgress: 0,
    done: 0,
    total: tasks.length,
    byKind: new Map<VoiceOpsTaskKind, number>(),
    byOutcome: new Map<string, number>(),
    breached: 0,
    topAssignees: new Map<string, number>(),
    topTargets: new Map<string, number>(),
  };

  for (const task of tasks) {
    if (task.status === "open") {
      summary.open += 1;
    } else if (task.status === "in-progress") {
      summary.inProgress += 1;
    } else if (task.status === "done") {
      summary.done += 1;
    }

    summary.byKind.set(task.kind, (summary.byKind.get(task.kind) ?? 0) + 1);

    if (task.outcome) {
      const label = formatOutcome(task.outcome) ?? task.outcome;
      summary.byOutcome.set(label, (summary.byOutcome.get(label) ?? 0) + 1);
    }

    if (task.target) {
      summary.topTargets.set(
        task.target,
        (summary.topTargets.get(task.target) ?? 0) + 1,
      );
    }

    if (isTaskSlaBreached(task)) {
      summary.breached += 1;
    }

    if (task.assignee) {
      summary.topAssignees.set(
        task.assignee,
        (summary.topAssignees.get(task.assignee) ?? 0) + 1,
      );
    }
  }

  return {
    byKind: [...summary.byKind.entries()].sort(
      (left, right) => right[1] - left[1],
    ),
    byOutcome: [...summary.byOutcome.entries()].sort(
      (left, right) => right[1] - left[1],
    ),
    breached: summary.breached,
    done: summary.done,
    inProgress: summary.inProgress,
    open: summary.open,
    topAssignees: [...summary.topAssignees.entries()].sort(
      (left, right) => right[1] - left[1],
    ),
    topTargets: [...summary.topTargets.entries()].sort(
      (left, right) => right[1] - left[1],
    ),
    total: summary.total,
  };
};

const renderTaskActions = (task: SavedVoiceOpsTask) => {
  const assignForm = `
    <form action="/tasks/${encodeURIComponent(task.id)}/assign" method="get" class="inline-form">
      <input name="owner" type="text" value="${escapeHtml(task.assignee ?? "ops-demo")}" placeholder="Assign to" />
      <button type="submit">Assign</button>
    </form>`;

  const statusLinks =
    task.status === "done"
      ? `<a href="/tasks/${encodeURIComponent(task.id)}/reopen">Reopen</a>`
      : [
          task.status === "open"
            ? `<a href="/tasks/${encodeURIComponent(task.id)}/start">Start</a>`
            : "",
          `<a href="/tasks/${encodeURIComponent(task.id)}/complete">Complete</a>`,
        ]
          .filter(Boolean)
          .join(" · ");

  return `${assignForm}<span>${statusLinks}</span>`;
};

export const renderVoiceOpsPage = (
  tasks: SavedVoiceOpsTask[],
  filters: VoiceOpsTaskFilterInput = {},
) => {
  const filteredTasks = filterVoiceOpsTasks(tasks, filters);
  const summary = summarizeVoiceOpsTasks(tasks);
  const items = filteredTasks
    .map((task) => {
      const latestHistory = task.history.at(-1);
      const breached = isTaskSlaBreached(task);
      return `
      <article class="task-item">
        <div class="task-header">
          <strong>${escapeHtml(task.title)}</strong>
          <span>${new Date(task.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
        </div>
        <div class="task-meta">
          <span class="pill">${escapeHtml(formatTaskKind(task.kind))}</span>
          ${task.outcome ? `<span class="pill">${escapeHtml(formatOutcome(task.outcome) ?? task.outcome)}</span>` : ""}
          ${task.target ? `<span class="pill">${escapeHtml(task.target)}</span>` : ""}
          ${task.assignee ? `<span class="pill">${escapeHtml(task.assignee)}</span>` : ""}
          <span class="pill">age ${escapeHtml(formatTaskAge(task.createdAt))}</span>
          ${breached ? `<span class="pill status-open">SLA breached</span>` : ""}
          <span class="pill ${getTaskStatusClassName(task.status)}">${escapeHtml(formatTaskStatus(task.status))}</span>
        </div>
        <p>${escapeHtml(task.description)}</p>
        <p><strong>Recommended action:</strong> ${escapeHtml(task.recommendedAction)}</p>
        ${latestHistory ? `<p><strong>Latest activity:</strong> ${escapeHtml(formatHistoryType(latestHistory.type))} by ${escapeHtml(latestHistory.actor)}${latestHistory.detail ? ` · ${escapeHtml(latestHistory.detail)}` : ""}</p>` : ""}
        <div class="toolbar">
          ${renderTaskActions(task)}
          <a href="/reviews/${encodeURIComponent(task.reviewId)}">Open review</a>
          <a href="${getReplayHref(task.intakeId)}">Open replay</a>
        </div>
      </article>
    `;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AbsoluteJS Voice Ops Queue</title>
  <style>
    :root { color-scheme: dark; }
    body { background: #0b0d10; color: #f4f4f5; font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; }
    main { max-width: 1080px; margin: 0 auto; display: grid; gap: 16px; }
    section, article, form { background: #13161b; border: 1px solid #232833; border-radius: 18px; padding: 20px; }
    .summary-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    .toolbar, .task-meta, .task-header, .inline-form { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
    .toolbar, .task-meta, .inline-form { justify-content: flex-start; }
    .task-list { display: grid; gap: 14px; }
    .pill { background: #0f1217; border: 1px solid #232833; border-radius: 999px; padding: 6px 10px; }
    .status-open { border-color: #854d0e; color: #fde68a; }
    .status-in-progress { border-color: #1d4ed8; color: #bfdbfe; }
    .status-done { border-color: #14532d; color: #bbf7d0; }
    label { display: grid; gap: 6px; min-width: 180px; }
    input, select { background: #0f1217; color: #f4f4f5; border: 1px solid #232833; border-radius: 10px; padding: 10px 12px; }
    button { background: #f59e0b; color: #111827; border: 0; border-radius: 10px; padding: 10px 14px; font-weight: 600; cursor: pointer; }
    a { color: #f59e0b; }
    ul { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
    .inline-form { padding: 0; border: 0; background: transparent; }
  </style>
</head>
<body>
  <main>
    <section>
      <h1>Voice ops queue</h1>
      <p>This queue is generated automatically from lifecycle outcomes like transfer, escalation, voicemail, no-answer, and failure.</p>
      <div class="summary-grid">
        <div class="pill">Total tasks ${summary.total}</div>
        <div class="pill status-open">Open ${summary.open}</div>
        <div class="pill status-in-progress">In progress ${summary.inProgress}</div>
        <div class="pill status-done">Done ${summary.done}</div>
        <div class="pill status-open">SLA breached ${summary.breached}</div>
      </div>
      <p><a href="/resilience">Resilience</a> · <a href="/sessions">Sessions</a> · <a href="/handoffs">Handoffs</a> · <a href="/reviews">Back to reviews</a></p>
    </section>
    <section>
      <h2>Dashboard</h2>
      <div class="summary-grid">
        <div>
          <strong>By task type</strong>
          <ul>${summary.byKind.map(([label, count]) => `<li>${escapeHtml(formatTaskKind(label))}: ${count}</li>`).join("") || "<li>No tasks yet.</li>"}</ul>
        </div>
        <div>
          <strong>By outcome</strong>
          <ul>${summary.byOutcome.map(([label, count]) => `<li>${escapeHtml(label)}: ${count}</li>`).join("") || "<li>No outcomes yet.</li>"}</ul>
        </div>
        <div>
          <strong>Top transfer targets</strong>
          <ul>${summary.topTargets.map(([label, count]) => `<li>${escapeHtml(label)}: ${count}</li>`).join("") || "<li>No transfer targets yet.</li>"}</ul>
        </div>
        <div>
          <strong>Top assignees</strong>
          <ul>${summary.topAssignees.map(([label, count]) => `<li>${escapeHtml(label)}: ${count}</li>`).join("") || "<li>No assignees yet.</li>"}</ul>
        </div>
      </div>
    </section>
    <form action="/tasks" method="get">
      <div class="toolbar">
        <label>
          Status
          <select name="status">
            <option value="all"${(filters.status ?? "all") === "all" ? " selected" : ""}>All</option>
            <option value="open"${filters.status === "open" ? " selected" : ""}>Open</option>
            <option value="in-progress"${filters.status === "in-progress" ? " selected" : ""}>In progress</option>
            <option value="done"${filters.status === "done" ? " selected" : ""}>Done</option>
          </select>
        </label>
        <label>
          Task type
          <select name="kind">
            <option value="all"${(filters.kind ?? "all") === "all" ? " selected" : ""}>All</option>
            <option value="appointment-booking"${filters.kind === "appointment-booking" ? " selected" : ""}>Appointment booking</option>
            <option value="callback"${filters.kind === "callback" ? " selected" : ""}>Callback</option>
            <option value="escalation"${filters.kind === "escalation" ? " selected" : ""}>Escalation</option>
            <option value="lead-qualification"${filters.kind === "lead-qualification" ? " selected" : ""}>Lead qualification</option>
            <option value="support-triage"${filters.kind === "support-triage" ? " selected" : ""}>Support triage</option>
            <option value="transfer-check"${filters.kind === "transfer-check" ? " selected" : ""}>Transfer check</option>
            <option value="retry-review"${filters.kind === "retry-review" ? " selected" : ""}>Retry review</option>
          </select>
        </label>
        <label>
          Outcome
          <select name="outcome">
            <option value="all"${(filters.outcome ?? "all") === "all" ? " selected" : ""}>All</option>
            <option value="transferred"${filters.outcome === "transferred" ? " selected" : ""}>Transferred</option>
            <option value="escalated"${filters.outcome === "escalated" ? " selected" : ""}>Escalated</option>
            <option value="voicemail"${filters.outcome === "voicemail" ? " selected" : ""}>Voicemail</option>
            <option value="no-answer"${filters.outcome === "no-answer" ? " selected" : ""}>No answer</option>
            <option value="failed"${filters.outcome === "failed" ? " selected" : ""}>Failed</option>
          </select>
        </label>
        <button type="submit">Apply filters</button>
      </div>
    </form>
    <section class="task-list">
      ${items || "<p>No ops tasks matched. Complete a lifecycle-heavy call first or clear the filters.</p>"}
    </section>
  </main>
</body>
</html>`;
};
