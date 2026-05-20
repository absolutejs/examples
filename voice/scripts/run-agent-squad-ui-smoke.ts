export {};

type FrameworkPage = "angular" | "html" | "htmx" | "react" | "svelte" | "vue";

type SmokeResult = {
  details?: Record<string, unknown>;
  elapsedMs: number;
  name: string;
  ok: boolean;
  status?: number;
  url: string;
};

const baseUrl = (
  process.env.VOICE_DEMO_URL ??
  `http://127.0.0.1:${process.env.PORT ?? "3004"}`
).replace(/\/$/, "");
const timeoutMs = Number(
  process.env.VOICE_AGENT_SQUAD_UI_SMOKE_TIMEOUT_MS ?? 8_000,
);
const frameworks: FrameworkPage[] = [
  "react",
  "vue",
  "svelte",
  "angular",
  "html",
  "htmx",
];

const withTimeout = async <T>(operation: Promise<T>, label: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(label), timeoutMs);

  try {
    return await operation;
  } finally {
    clearTimeout(timer);
  }
};

const fetchText = async (url: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { accept: "text/html" },
      signal: controller.signal,
    });
    return {
      body: await response.text(),
      response,
    };
  } finally {
    clearTimeout(timer);
  }
};

const fetchJson = async (url: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    return {
      body: await response.json(),
      response,
    };
  } finally {
    clearTimeout(timer);
  }
};

const checkFrameworkPage = async (
  framework: FrameworkPage,
): Promise<SmokeResult> => {
  const url = `${baseUrl}/${framework}`;
  const startedAt = Date.now();

  try {
    const { body, response } = await withTimeout(
      fetchText(url),
      `fetch ${url}`,
    );
    const required = [
      "Agent Squad",
      "Specialist routing is live",
      "agent-squad-contract",
    ];
    const missing = required.filter((text) => !body.includes(text));

    return {
      details: {
        missing,
      },
      elapsedMs: Date.now() - startedAt,
      name: framework,
      ok: response.ok && missing.length === 0,
      status: response.status,
      url,
    };
  } catch (error) {
    return {
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
      elapsedMs: Date.now() - startedAt,
      name: framework,
      ok: false,
      url,
    };
  }
};

const checkStatusEndpoint = async (): Promise<SmokeResult> => {
  const url = `${baseUrl}/api/agent-squad/status`;
  const startedAt = Date.now();

  try {
    const { body, response } = await fetchJson(url);
    const status = body as {
      contextPolicy?: unknown;
      currentAgentId?: unknown;
      handoffCount?: unknown;
      status?: unknown;
    };
    const ok =
      response.ok &&
      status.status === "idle" &&
      status.currentAgentId === "front-desk" &&
      status.contextPolicy === "default" &&
      status.handoffCount === 0;

    return {
      details: {
        body,
      },
      elapsedMs: Date.now() - startedAt,
      name: "agentSquadStatus",
      ok,
      status: response.status,
      url,
    };
  } catch (error) {
    return {
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
      elapsedMs: Date.now() - startedAt,
      name: "agentSquadStatus",
      ok: false,
      url,
    };
  }
};

const checkContractEndpoint = async (): Promise<SmokeResult> => {
  const url = `${baseUrl}/api/agent-squad-contract`;
  const startedAt = Date.now();

  try {
    const { body, response } = await fetchJson(url);
    const report = body as {
      pass?: unknown;
      turns?: Array<{
        agentId?: unknown;
        handoffs?: Array<{ status?: unknown; targetAgentId?: unknown }>;
      }>;
    };
    const firstTurn = report.turns?.[0];
    const firstHandoff = firstTurn?.handoffs?.[0];
    const ok =
      response.ok &&
      report.pass === true &&
      firstTurn?.agentId === "billing" &&
      firstHandoff?.status === "allowed" &&
      firstHandoff.targetAgentId === "billing";

    return {
      details: {
        firstAgentId: firstTurn?.agentId,
        firstHandoff,
        pass: report.pass,
        turnCount: report.turns?.length ?? 0,
      },
      elapsedMs: Date.now() - startedAt,
      name: "agentSquadContract",
      ok,
      status: response.status,
      url,
    };
  } catch (error) {
    return {
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
      elapsedMs: Date.now() - startedAt,
      name: "agentSquadContract",
      ok: false,
      url,
    };
  }
};

const results = await Promise.all([
  ...frameworks.map((framework) => checkFrameworkPage(framework)),
  checkStatusEndpoint(),
  checkContractEndpoint(),
]);
const ok = results.every((result) => result.ok);

console.log(
  JSON.stringify(
    {
      baseUrl,
      ok,
      results,
    },
    null,
    2,
  ),
);

if (!ok) {
  process.exit(1);
}
