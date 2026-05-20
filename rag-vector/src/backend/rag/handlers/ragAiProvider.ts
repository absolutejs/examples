import { gemini, openaiCompatible, openaiResponses } from "@absolutejs/ai";

type DemoAIProviderFactory = ReturnType<typeof gemini>;

export type DemoAIModelOption = {
  key: string;
  providerId: string;
  providerLabel: string;
  modelId: string;
  label: string;
};

type DemoAIProviderEntry = {
  defaultModel: string;
  label: string;
  models: DemoAIModelOption[];
  provider: () => DemoAIProviderFactory;
  providerId: string;
};

export type DemoAIProviderCatalog = {
  defaultModel: (providerName: string) => string | undefined;
  defaultModelKey: string | null;
  models: DemoAIModelOption[];
  parseMessage: (raw: string) => {
    content: string;
    model?: string;
    providerName: string;
  };
  provider: (providerName: string) => DemoAIProviderFactory;
};

const getEnv = (name: string) => {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
};

const unique = (values: string[]) => [
  ...new Set(values.filter((value) => value.trim().length > 0)),
];

const createModelOption = (
  providerId: string,
  providerLabel: string,
  modelId: string,
  label = modelId,
): DemoAIModelOption => ({
  key: `${providerId}:${modelId}`,
  providerId,
  providerLabel,
  modelId,
  label,
});

const parsePrefixedMessage = (
  raw: string,
  fallbackProvider: string,
  fallbackModel?: string,
) => {
  const first = raw.indexOf(":");
  if (first <= 0) {
    return {
      content: raw,
      model: fallbackModel,
      providerName: fallbackProvider,
    };
  }

  const providerName = raw.slice(0, first);
  const rest = raw.slice(first + 1);
  const second = rest.indexOf(":");
  if (second <= 0) {
    return {
      content: rest,
      model: fallbackModel,
      providerName,
    };
  }

  return {
    content: rest.slice(second + 1),
    model: rest.slice(0, second),
    providerName,
  };
};

export const createDemoAIProviderCatalog = (): DemoAIProviderCatalog | null => {
  const entries: DemoAIProviderEntry[] = [];

  const openaiApiKey = getEnv("OPENAI_API_KEY");
  if (openaiApiKey.length > 0) {
    const defaultModel = getEnv("RAG_DEMO_OPENAI_MODEL") || "gpt-4.1-mini";
    const models = unique([
      defaultModel,
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-5.4-mini",
    ]);
    entries.push({
      defaultModel,
      label: "OpenAI",
      models: models.map((modelId) =>
        createModelOption("openai", "OpenAI", modelId),
      ),
      provider: () =>
        openaiResponses({ apiKey: openaiApiKey }) as DemoAIProviderFactory,
      providerId: "openai",
    });
  }

  const googleApiKey = getEnv("GOOGLE_API_KEY");
  if (googleApiKey.length > 0) {
    const defaultModel = getEnv("RAG_DEMO_GEMINI_MODEL") || "gemini-2.5-flash";
    const models = unique([
      defaultModel,
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
    ]);
    entries.push({
      defaultModel,
      label: "Google",
      models: models.map((modelId) =>
        createModelOption("google", "Google", modelId),
      ),
      provider: () => gemini({ apiKey: googleApiKey }),
      providerId: "google",
    });
  }

  const openaiCompatibleApiKey = getEnv("OPENAI_COMPATIBLE_API_KEY");
  const openaiCompatibleBaseUrl = getEnv("OPENAI_COMPATIBLE_BASE_URL");
  if (openaiCompatibleApiKey.length > 0 && openaiCompatibleBaseUrl.length > 0) {
    const defaultModel =
      getEnv("RAG_DEMO_OPENAI_COMPATIBLE_MODEL") || "gpt-4.1-mini";
    entries.push({
      defaultModel,
      label: "OpenAI-compatible",
      models: [
        createModelOption(
          "openai-compatible",
          "OpenAI-compatible",
          defaultModel,
        ),
      ],
      provider: () =>
        openaiCompatible({
          apiKey: openaiCompatibleApiKey,
          baseUrl: openaiCompatibleBaseUrl,
        }) as DemoAIProviderFactory,
      providerId: "openai-compatible",
    });
  }

  if (entries.length === 0) {
    return null;
  }

  const fallbackProvider = entries[0]?.providerId ?? "openai";
  const fallbackModel = entries[0]?.defaultModel;
  const providerMap = new Map(
    entries.map((entry) => [entry.providerId, entry] as const),
  );

  return {
    defaultModel: (providerName: string) =>
      providerMap.get(providerName)?.defaultModel ?? fallbackModel,
    defaultModelKey: entries[0]?.models[0]?.key ?? null,
    models: entries.flatMap((entry) => entry.models),
    parseMessage: (raw: string) =>
      parsePrefixedMessage(raw, fallbackProvider, fallbackModel),
    provider: (providerName: string) => {
      const entry =
        providerMap.get(providerName) ?? providerMap.get(fallbackProvider);
      if (!entry) {
        throw new Error(`Unknown provider: ${providerName}`);
      }
      return entry.provider();
    },
  };
};
