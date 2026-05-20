import { type SavedIntake } from "../shared/demo";
import { type VoiceReviewFilterInput } from "./reviewPage";
import {
  type StoredVoiceHandoffDelivery,
  type VoiceHandoffDeliveryStore,
} from "@absolutejs/voice";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const stringifyForHtml = (value: unknown) =>
  escapeHtml(JSON.stringify(value, null, 2) ?? "");

const createJsonHandoffDeliveryStore = <
  TDelivery extends StoredVoiceHandoffDelivery,
>(
  filePath: string,
): VoiceHandoffDeliveryStore<TDelivery> => {
  const read = async () => {
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return [];
    }

    const text = await file.text();
    return text.trim() ? (JSON.parse(text) as TDelivery[]) : [];
  };
  const write = async (deliveries: TDelivery[]) => {
    await mkdir(dirname(filePath), { recursive: true });
    await Bun.write(filePath, JSON.stringify(deliveries, null, 2));
  };

  return {
    get: async (id) => (await read()).find((delivery) => delivery.id === id),
    list: async () =>
      (await read()).sort(
        (left, right) =>
          left.createdAt - right.createdAt || left.id.localeCompare(right.id),
      ),
    remove: async (id) => {
      await write((await read()).filter((delivery) => delivery.id !== id));
    },
    set: async (id, delivery) => {
      const deliveries = (await read()).filter((item) => item.id !== id);
      deliveries.push(delivery);
      await write(deliveries);
    },
  };
};

const createDemoLeaseCoordinator = () => {
  const leases = new Map<string, string>();

  return {
    claim: async (input: {
      leaseMs: number;
      taskId: string;
      workerId: string;
    }) => {
      if (leases.has(input.taskId)) {
        return false;
      }

      leases.set(input.taskId, input.workerId);
      return true;
    },
    get: async (taskId: string) => {
      const workerId = leases.get(taskId);
      return workerId
        ? {
            expiresAt: Date.now() + 30_000,
            taskId,
            workerId,
          }
        : null;
    },
    release: async (input: { taskId: string; workerId: string }) => {
      if (leases.get(input.taskId) !== input.workerId) {
        return false;
      }

      leases.delete(input.taskId);
      return true;
    },
    renew: async (input: {
      leaseMs: number;
      taskId: string;
      workerId: string;
    }) => leases.get(input.taskId) === input.workerId,
  };
};

const formatCallDisposition = (value: SavedIntake["callDisposition"]) => {
  switch (value) {
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

const renderPromptAnswers = (promptAnswers: SavedIntake["promptAnswers"]) =>
  promptAnswers
    .map(
      (entry) => `<div class="saved-answer">
  <div class="saved-answer-label">${escapeHtml(entry.prompt)}</div>
  <p class="saved-answer-text">${escapeHtml(entry.response)}</p>
</div>`,
    )
    .join("");

const normalizeReviewFilters = (
  query: Record<string, unknown>,
): VoiceReviewFilterInput => ({
  outcome:
    query.outcome === "completed" ||
    query.outcome === "transferred" ||
    query.outcome === "escalated" ||
    query.outcome === "voicemail" ||
    query.outcome === "no-answer" ||
    query.outcome === "failed" ||
    query.outcome === "closed"
      ? query.outcome
      : "all",
  q: typeof query.q === "string" && query.q.trim() ? query.q.trim() : undefined,
  scenario:
    query.scenario === "guided" || query.scenario === "general"
      ? query.scenario
      : "all",
  status:
    query.status === "healthy" ||
    query.status === "partial" ||
    query.status === "failed"
      ? query.status
      : "all",
});

export {
  createDemoLeaseCoordinator,
  createJsonHandoffDeliveryStore,
  escapeHtml,
  formatCallDisposition,
  normalizeReviewFilters,
  renderPromptAnswers,
  stringifyForHtml,
};
