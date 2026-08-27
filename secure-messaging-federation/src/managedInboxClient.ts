import { createDpopClient, type DpopFetch } from "@absolutejs/auth/client";

const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";
const INBOX_SCOPE = "federation:inbox:consume";
const HTTP_BAD_REQUEST = 400;
const MILLISECONDS_PER_SECOND = 1_000;

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export type ManagedFederationMessage = {
  attempts: number;
  expiresAt: string;
  message: string;
  messageId: string;
  originDomain: string;
  receivedAt: string;
  sequence: string;
  sessionId: string;
};

export type ManagedFederationLease = {
  cursor: string | null;
  leaseExpiresAt: string;
  leaseId: string;
  leaseToken: string;
  messages: ManagedFederationMessage[];
};

export type DeviceVerification = {
  expiresIn: number;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
};

export type ManagedFederationInboxClient = {
  acknowledge: (lease: ManagedFederationLease) => Promise<number>;
  authorize: () => Promise<void>;
  lease: (input?: {
    leaseSeconds?: number;
    maximumMessages?: number;
  }) => Promise<ManagedFederationLease>;
};

export type ManagedFederationInboxClientOptions = {
  baseUrl: string;
  clientName?: string;
  domain: string;
  fetch?: DpopFetch;
  onVerification: (verification: DeviceVerification) => void | Promise<void>;
  projectId: string;
  sleep?: (milliseconds: number) => Promise<void>;
};

const objectValue = (value: unknown): JsonObject => {
  if (!isJsonObject(value)) throw new Error("Expected a JSON object");

  return value;
};

const stringField = (value: JsonObject, field: string) => {
  const candidate = value[field];
  if (typeof candidate !== "string" || candidate.length === 0)
    throw new Error(`Response is missing ${field}`);

  return candidate;
};

const numberField = (value: JsonObject, field: string) => {
  const candidate = value[field];
  if (typeof candidate !== "number" || !Number.isFinite(candidate))
    throw new Error(`Response is missing ${field}`);

  return candidate;
};

const json = async (response: Response) => objectValue(await response.json());

const requireOk = async (response: Response, operation: string) => {
  if (response.ok) return response;

  throw new Error(`${operation} failed with HTTP ${response.status}`);
};

const endpoint = (origin: string, value: string) =>
  new URL(value, origin).toString();

const secureUrl = (value: string, description: string) => {
  const url = new URL(value);
  if (url.protocol !== "https:")
    throw new Error(`${description} must use HTTPS`);
  if (url.username || url.password)
    throw new Error(`${description} must not contain credentials`);
  if (url.hash) throw new Error(`${description} must not contain a fragment`);

  return url;
};

const exactUrl = (left: URL, right: URL) =>
  left.toString() === right.toString();

const parseMessages = (value: unknown): ManagedFederationMessage[] => {
  if (!Array.isArray(value)) throw new Error("Lease messages are invalid");

  return value.map((candidate) => {
    const message = objectValue(candidate);

    return {
      attempts: numberField(message, "attempts"),
      expiresAt: stringField(message, "expiresAt"),
      message: stringField(message, "message"),
      messageId: stringField(message, "messageId"),
      originDomain: stringField(message, "originDomain"),
      receivedAt: stringField(message, "receivedAt"),
      sequence: stringField(message, "sequence"),
      sessionId: stringField(message, "sessionId"),
    };
  });
};

const parseLease = (value: unknown): ManagedFederationLease => {
  const lease = objectValue(value);
  const cursor = lease.cursor;
  if (cursor !== null && typeof cursor !== "string")
    throw new Error("Lease cursor is invalid");

  return {
    cursor,
    leaseExpiresAt: stringField(lease, "leaseExpiresAt"),
    leaseId: stringField(lease, "leaseId"),
    leaseToken: stringField(lease, "leaseToken"),
    messages: parseMessages(lease.messages),
  };
};

const discover = async (fetch: DpopFetch, baseUrl: string) => {
  const base = secureUrl(baseUrl, "PaaS URL");
  const expectedResource = new URL("/api/agent/federation/inbox", base);
  const metadataResponse = await fetch(
    endpoint(
      base.origin,
      "/.well-known/oauth-protected-resource/api/agent/federation/inbox",
    ),
  );
  const metadata = await json(
    await requireOk(metadataResponse, "Protected-resource discovery"),
  );
  if (metadata.dpop_bound_access_tokens_required !== true)
    throw new Error("Managed inbox does not advertise mandatory DPoP");
  const resource = secureUrl(
    stringField(metadata, "resource"),
    "Protected resource",
  );
  if (!exactUrl(resource, expectedResource))
    throw new Error("Protected-resource metadata identifies another resource");
  const authorizationServers = metadata.authorization_servers;
  if (
    !Array.isArray(authorizationServers) ||
    typeof authorizationServers[0] !== "string"
  )
    throw new Error("Protected resource has no authorization server");
  const authorizationServer = secureUrl(
    authorizationServers[0],
    "Authorization server",
  );
  const discoveryResponse = await fetch(
    endpoint(
      authorizationServer.origin,
      "/.well-known/oauth-authorization-server",
    ),
  );
  const authorization = await json(
    await requireOk(discoveryResponse, "Authorization-server discovery"),
  );

  const issuer = secureUrl(
    stringField(authorization, "issuer"),
    "Authorization-server issuer",
  );
  if (!exactUrl(issuer, authorizationServer))
    throw new Error("Authorization-server metadata has an unexpected issuer");

  return {
    deviceEndpoint: secureUrl(
      stringField(authorization, "device_authorization_endpoint"),
      "Device authorization endpoint",
    ).toString(),
    registrationEndpoint: secureUrl(
      stringField(authorization, "registration_endpoint"),
      "Registration endpoint",
    ).toString(),
    resource: resource.toString(),
    tokenEndpoint: secureUrl(
      stringField(authorization, "token_endpoint"),
      "Token endpoint",
    ).toString(),
  };
};

export const createManagedFederationInboxClient = async (
  options: ManagedFederationInboxClientOptions,
) => {
  const requestFetch = options.fetch ?? globalThis.fetch;
  const sleep =
    options.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const dpop = await createDpopClient({ fetch: requestFetch });
  const discovered = await discover(requestFetch, options.baseUrl);
  const registration = await json(
    await requireOk(
      await requestFetch(discovered.registrationEndpoint, {
        body: JSON.stringify({
          client_name:
            options.clientName ?? "AbsoluteJS federation inbox agent",
          grant_types: [DEVICE_GRANT],
          scope: INBOX_SCOPE,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
      "Dynamic client registration",
    ),
  );
  const clientId = stringField(registration, "client_id");
  let accessToken: string | undefined;

  const tokenRequest = (deviceCode: string) =>
    dpop.fetch(discovered.tokenEndpoint, {
      body: new URLSearchParams({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: DEVICE_GRANT,
      }),
      dpop: { nonceScope: discovered.tokenEndpoint },
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    });
  const pollForToken = async (
    deviceCode: string,
    intervalSeconds: number,
    expiresIn: number,
  ) => {
    const deadline = Date.now() + expiresIn * MILLISECONDS_PER_SECOND;
    let delaySeconds = intervalSeconds;
    while (Date.now() < deadline) {
      const response = await tokenRequest(deviceCode);
      const body = await json(response);
      if (response.ok) {
        if (stringField(body, "token_type") !== "DPoP")
          throw new Error("Authorization server returned an unbound token");

        return stringField(body, "access_token");
      }
      const error = stringField(body, "error");
      if (response.status !== HTTP_BAD_REQUEST || error === "access_denied")
        throw new Error(`Device authorization failed: ${error}`);
      if (error === "slow_down") delaySeconds += 5;
      else if (error !== "authorization_pending")
        throw new Error(`Device authorization failed: ${error}`);
      await sleep(delaySeconds * MILLISECONDS_PER_SECOND);
    }

    throw new Error("Device authorization expired");
  };
  const inboxPath = `${new URL(discovered.resource).pathname}/${encodeURIComponent(options.projectId)}/${encodeURIComponent(options.domain)}/leases`;
  const inboxUrl = endpoint(discovered.resource, inboxPath);
  const authenticatedFetch = (
    url: string,
    body: JsonObject,
    operation: string,
  ) => {
    if (!accessToken)
      throw new Error("Call authorize() before using the inbox");

    return dpop
      .fetch(url, {
        body: JSON.stringify(body),
        dpop: {
          accessToken,
          nonceScope: discovered.resource,
        },
        headers: { "content-type": "application/json" },
        method: "POST",
      })
      .then((response) => requireOk(response, operation));
  };

  const client: ManagedFederationInboxClient = {
    acknowledge: async (lease) => {
      if (!lease.cursor) return 0;
      const response = await authenticatedFetch(
        `${inboxUrl}/${encodeURIComponent(lease.leaseId)}/acknowledge`,
        { cursor: lease.cursor, lease_token: lease.leaseToken },
        "Inbox acknowledgement",
      );
      const body = await json(response);

      return numberField(body, "acknowledged");
    },
    authorize: async () => {
      const device = await json(
        await requireOk(
          await requestFetch(discovered.deviceEndpoint, {
            body: new URLSearchParams({
              client_id: clientId,
              resource: discovered.resource,
              scope: INBOX_SCOPE,
            }),
            headers: { "content-type": "application/x-www-form-urlencoded" },
            method: "POST",
          }),
          "Device authorization",
        ),
      );
      const verification = {
        expiresIn: numberField(device, "expires_in"),
        userCode: stringField(device, "user_code"),
        verificationUri: stringField(device, "verification_uri"),
        verificationUriComplete: stringField(
          device,
          "verification_uri_complete",
        ),
      };
      secureUrl(verification.verificationUri, "Verification URI");
      secureUrl(
        verification.verificationUriComplete,
        "Complete verification URI",
      );
      await options.onVerification(verification);
      accessToken = await pollForToken(
        stringField(device, "device_code"),
        numberField(device, "interval"),
        verification.expiresIn,
      );
    },
    lease: async (input = {}) =>
      parseLease(
        await json(
          await authenticatedFetch(
            inboxUrl,
            {
              lease_seconds: input.leaseSeconds ?? 60,
              maximum_messages: input.maximumMessages ?? 10,
            },
            "Inbox lease",
          ),
        ),
      ),
  };

  return client;
};
