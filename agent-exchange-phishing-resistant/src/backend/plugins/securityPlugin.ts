import { Elysia } from "elysia";
import { createSimpleWebAuthnAdapter } from "@absolutejs/auth/webauthn";
import { createExchangeDemo } from "../security/exchangeDemo";

const adapter = await createSimpleWebAuthnAdapter();
const demo = createExchangeDemo(adapter);

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
    safely(set, () =>
      demo.executeStandingMandate({
        ...mandateBody(body),
        origin: requestOrigin(request),
        sessionToken: sessionToken(request),
      }),
    ),
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
