type ProviderId = "openai" | "anthropic" | "gemini";

export {};

const baseUrl =
  process.env.VOICE_DEMO_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3004"}`;
const providers = (
  process.argv.slice(2).length
    ? process.argv.slice(2)
    : ["openai", "anthropic", "gemini"]
).filter(
  (provider): provider is ProviderId =>
    provider === "openai" || provider === "anthropic" || provider === "gemini",
);

if (providers.length === 0) {
  throw new Error("Pass one or more providers: openai anthropic gemini");
}

const postFailure = async (provider: ProviderId) => {
  const response = await fetch(
    `${baseUrl}/api/provider-simulate/failure?provider=${provider}`,
    {
      method: "POST",
    },
  );

  return {
    body: (await response.json()) as Record<string, unknown>,
    ok: response.ok,
    provider,
    status: response.status,
  };
};

const results = await Promise.all(
  providers.map((provider) => postFailure(provider)),
);
const replayHrefs = results
  .map((result) =>
    typeof result.body.replayHref === "string"
      ? {
          provider: result.provider,
          replayHref: result.body.replayHref,
          sessionId:
            typeof result.body.sessionId === "string"
              ? result.body.sessionId
              : undefined,
        }
      : undefined,
  )
  .filter(
    (
      result,
    ): result is {
      provider: ProviderId;
      replayHref: string;
      sessionId: string | undefined;
    } =>
      result !== undefined,
  );
const providerStatus = await fetch(`${baseUrl}/api/provider-status`).then(
  async (response) => (await response.json()) as Array<Record<string, unknown>>,
);

console.log(
  JSON.stringify(
    {
      providerStatus,
      replayHrefs,
      results,
    },
    null,
    2,
  ),
);
