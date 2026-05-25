import { getEnv } from "@absolutejs/absolute";
import { anthropic } from "@absolutejs/ai/anthropic";
import { openaiResponses } from "@absolutejs/ai/openai-responses";
import { gemini } from "@absolutejs/ai/gemini";
import { ollama } from "@absolutejs/ai/ollama";
import {
  alibaba,
  meta,
  moonshot,
  xai,
  deepseek,
  mistralai,
} from "@absolutejs/ai/providers";

// Derive the provider config shape from a real provider so the mock stays typed
// without importing internal types (and without an explicit return annotation).
type ProviderConfig = ReturnType<typeof anthropic>;

// An offline echo provider: no API key, deterministic — powers the keyless demo
// and e2e. Streams a short reply in two chunks so the UI still shows streaming.
const mockProvider: ProviderConfig = {
  stream: async function* (params) {
    const last = [...params.messages].pop();
    const said =
      typeof last?.content === "string" ? last.content : "your message";
    const reply = `Mock reply (offline echo): you said "${said}".`;
    const mid = Math.ceil(reply.length / 2);
    yield { content: reply.slice(0, mid), type: "text" };
    yield { content: reply.slice(mid), type: "text" };
    yield { type: "done" };
  },
};

export const SYSTEM_PROMPT = [
  "You are a helpful AI assistant.",
  "You have access to a product database for an online store with tools to search and look up items.",
  "When the user asks about products, prices, or inventory, use the search_products and get_product_details tools.",
  "These tools supplement your natural capabilities — you can still do everything you'd normally do (analyze PDFs, write code, reason about images, etc.).",
  "For all other questions, respond naturally.",
  "Keep responses concise.",
].join(" ");
export const getProvider = (name: string) => {
  switch (name) {
    case "anthropic":
      return anthropic({ apiKey: getEnv("ANTHROPIC_API_KEY") });
    case "openai":
      return openaiResponses({
        apiKey: getEnv("OPENAI_API_KEY"),
        imageModels: ["gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"],
      });
    case "google":
      return gemini({
        apiKey: getEnv("GOOGLE_API_KEY"),
        imageModels: [
          "gemini-3-pro-image-preview",
          "gemini-3.1-flash-image-preview",
          "gemini-2.5-flash-image",
        ],
      });
    case "xai":
      return xai({ apiKey: getEnv("XAI_API_KEY") });
    case "deepseek":
      return deepseek({ apiKey: getEnv("DEEPSEEK_API_KEY") });
    case "mistral":
      return mistralai({ apiKey: getEnv("MISTRAL_API_KEY") });
    case "alibaba":
      return alibaba({ apiKey: getEnv("ALIBABA_API_KEY") });
    case "meta":
      return meta({ apiKey: getEnv("META_API_KEY") });
    case "moonshot":
      return moonshot({ apiKey: getEnv("MOONSHOT_API_KEY") });
    case "ollama":
      return ollama({ baseUrl: process.env.OLLAMA_URL });
    case "mock":
      return mockProvider;
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
};
export const parseMessage = (raw: string) => {
  const first = raw.indexOf(":");
  const providerName = raw.slice(0, first);
  const rest = raw.slice(first + 1);
  const second = rest.indexOf(":");

  return {
    content: rest.slice(second + 1),
    model: rest.slice(0, second),
    providerName,
  };
};
