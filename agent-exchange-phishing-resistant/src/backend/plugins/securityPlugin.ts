import { Elysia } from "elysia";
import { createMemoryA2aTaskStore } from "@absolutejs/a2a";
import {
  AGENT_EXCHANGE_PREPARATION_MEDIA_TYPE,
  connectAgentExchangeA2a,
  createAgentExchangeA2aHandler,
} from "@absolutejs/agent-exchange-a2a";
import { createSimpleWebAuthnAdapter } from "@absolutejs/auth/webauthn";
import { createExchangeDemo } from "../security/exchangeDemo";

const adapter = await createSimpleWebAuthnAdapter();
const demo = createExchangeDemo(adapter);
const delegatedCaller = Object.freeze({
  agentId: "requester-agent",
  delegationId: "demo-oauth-delegation",
  userId: "demo-owner",
});
const exchangeA2aHandler = createAgentExchangeA2aHandler<
  typeof delegatedCaller
>({
  agentCard: {
    capabilities: {},
    defaultInputModes: ["application/json"],
    defaultOutputModes: ["application/json"],
    description: "Demo recipient mailbox agent",
    name: "Recipient mailbox agent",
    skills: [],
    supportedInterfaces: [
      {
        protocolBinding: "JSONRPC",
        protocolVersion: "1.0",
        url: "https://recipient-agent.example/a2a",
      },
    ],
    version: "0.1.0",
  },
  authorize: (request) =>
    request.headers.get("authorization") === "Bearer demo-delegated-agent-token"
      ? {
          actor: {
            agentId: delegatedCaller.agentId,
            scopes: ["agent-exchange:email:request"],
            userId: delegatedCaller.userId,
          },
          authorizationKey: `${delegatedCaller.userId}:${delegatedCaller.delegationId}`,
          caller: delegatedCaller,
          ok: true as const,
        }
      : { ok: false as const },
  execute: async ({ caller, reference }) => {
    const receipt = await demo.executeStandingMandate({ caller, reference });
    return {
      completedAt: Date.now(),
      exchangeId: receipt.exchangeId,
      mandateId: receipt.mandateId,
      modelObservedSecret: false,
      processingMode: "tool-confined",
      ...(receipt.reference === undefined
        ? {}
        : { reference: receipt.reference }),
      status: "submitted" as const,
      usesRemaining: receipt.usesRemaining,
    };
  },
  path: "/a2a",
  preparationEndpoint:
    "https://recipient-agent.example/agent-exchange/requests",
  taskStore: createMemoryA2aTaskStore(),
});
const exchangeA2aFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
) => {
  const incoming = new Request(input, init);
  if (
    incoming.method === "POST" &&
    new URL(incoming.url).pathname === "/agent-exchange/requests"
  ) {
    if (
      incoming.headers.get("authorization") !== "Bearer demo-preparation-token"
    )
      return new Response(null, { status: 401 });
    const body: unknown = await incoming.json();
    const request =
      typeof body === "object" && body !== null
        ? Reflect.get(body, "request")
        : undefined;
    try {
      return Response.json(
        {
          reference: demo.registerStandingMandateRequest({
            caller: delegatedCaller,
            request,
          }),
        },
        {
          headers: {
            "cache-control": "no-store",
            "content-type": AGENT_EXCHANGE_PREPARATION_MEDIA_TYPE,
          },
        },
      );
    } catch {
      return new Response(null, { status: 400 });
    }
  }
  return (
    (await exchangeA2aHandler(incoming)) ??
    new Response("not found", { status: 404 })
  );
};
const exchangeA2aClient = connectAgentExchangeA2a({
  fetch: exchangeA2aFetch,
  headers: { authorization: "Bearer demo-delegated-agent-token" },
  origin: "https://recipient-agent.example",
  preparationHeaders: { authorization: "Bearer demo-preparation-token" },
});

const requestOrigin = (request: Request): string => new URL(request.url).origin;

const sessionToken = (request: Request): string => {
  const token = request.headers.get("x-demo-session");
  if (token === null || token.length < 32 || token.length > 256)
    throw new Error("A valid in-memory demo session is required.");
  return token;
};

const responseBody = (body: unknown): unknown => {
  if (typeof body !== "object" || body === null || !("response" in body))
    throw new Error("A WebAuthn response is required.");
  return body.response;
};

const approvalBody = (
  body: unknown,
): { exchangeId: string; response: unknown } => {
  if (
    typeof body !== "object" ||
    body === null ||
    !("response" in body) ||
    !("exchangeId" in body) ||
    typeof body.exchangeId !== "string" ||
    body.exchangeId.length === 0 ||
    body.exchangeId.length > 256
  )
    throw new Error("A bounded exchange approval is required.");
  return { exchangeId: body.exchangeId, response: body.response };
};

const mandateApprovalBody = (
  body: unknown,
): { mandateId: string; response: unknown } => {
  if (
    typeof body !== "object" ||
    body === null ||
    !("response" in body) ||
    !("mandateId" in body) ||
    typeof body.mandateId !== "string" ||
    body.mandateId.length === 0 ||
    body.mandateId.length > 256
  )
    throw new Error("A bounded mandate approval is required.");
  return { mandateId: body.mandateId, response: body.response };
};

const mandateBody = (body: unknown): { mandateId: string } => {
  if (
    typeof body !== "object" ||
    body === null ||
    !("mandateId" in body) ||
    typeof body.mandateId !== "string" ||
    body.mandateId.length === 0 ||
    body.mandateId.length > 256
  )
    throw new Error("A bounded mandate identifier is required.");
  return { mandateId: body.mandateId };
};

const safely = async <Result>(
  set: { status?: number | string },
  operation: () => Promise<Result> | Result,
) => {
  try {
    return await operation();
  } catch (error) {
    set.status = 400;
    return {
      error:
        error instanceof Error ? error.message : "The request failed safely.",
    };
  }
};

export const securityPlugin = new Elysia({ prefix: "/api" })
  .post("/session", ({ request }) => demo.createSession(requestOrigin(request)))
  .post("/passkeys/options", ({ request, set }) =>
    safely(set, () =>
      demo.beginRegistration({
        origin: requestOrigin(request),
        sessionToken: sessionToken(request),
      }),
    ),
  )
  .post("/passkeys/verify", ({ body, request, set }) =>
    safely(set, () =>
      demo.finishRegistration({
        origin: requestOrigin(request),
        response: responseBody(body),
        sessionToken: sessionToken(request),
      }),
    ),
  )
  .post("/exchanges", ({ request, set }) =>
    safely(set, () =>
      demo.beginExchange({
        origin: requestOrigin(request),
        sessionToken: sessionToken(request),
      }),
    ),
  )
  .post("/exchanges/approve", ({ body, request, set }) =>
    safely(set, () => {
      const approval = approvalBody(body);
      return demo.approve({
        exchangeId: approval.exchangeId,
        origin: requestOrigin(request),
        response: approval.response,
        sessionToken: sessionToken(request),
      });
    }),
  )
  .post("/email-exchanges", ({ request, set }) =>
    safely(set, () =>
      demo.beginEmailExchange({
        origin: requestOrigin(request),
        sessionToken: sessionToken(request),
      }),
    ),
  )
  .post("/email-exchanges/approve", ({ body, request, set }) =>
    safely(set, () => {
      const approval = approvalBody(body);
      return demo.approveEmailExchange({
        exchangeId: approval.exchangeId,
        origin: requestOrigin(request),
        response: approval.response,
        sessionToken: sessionToken(request),
      });
    }),
  )
  .post("/standing-mandates", ({ request, set }) =>
    safely(set, () =>
      demo.beginStandingMandate({
        origin: requestOrigin(request),
        sessionToken: sessionToken(request),
      }),
    ),
  )
  .post("/standing-mandates/approve", ({ body, request, set }) =>
    safely(set, () => {
      const approval = mandateApprovalBody(body);
      return demo.approveStandingMandate({
        mandateId: approval.mandateId,
        origin: requestOrigin(request),
        response: approval.response,
        sessionToken: sessionToken(request),
      });
    }),
  )
  .post("/standing-mandates/execute", ({ body, request, set }) =>
    safely(set, async () => {
      const prepared = demo.createStandingMandateRequest({
        caller: delegatedCaller,
        ...mandateBody(body),
        origin: requestOrigin(request),
        sessionToken: sessionToken(request),
      });
      return (await exchangeA2aClient).send(prepared);
    }),
  )
  .post("/standing-mandates/revoke", ({ body, request, set }) =>
    safely(set, () =>
      demo.revokeStandingMandate({
        ...mandateBody(body),
        origin: requestOrigin(request),
        sessionToken: sessionToken(request),
      }),
    ),
  );
