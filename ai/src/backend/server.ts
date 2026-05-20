import { networking, prepare } from "@absolutejs/absolute";
import { aiChat } from "@absolutejs/ai";
import { Elysia } from "elysia";
import { SYSTEM_PROMPT, getProvider, parseMessage } from "./handlers/providers";
import { tools } from "./handlers/tools";
import { pagesPlugin } from "./plugins/pagesPlugin";

const { absolutejs, manifest } = await prepare();

// Models that support function calling
const TOOL_CAPABLE_MODELS = new Set([
  "claude-3-5-sonnet-20241022",
  "claude-haiku-4-5",
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "codestral-latest",
  "deepseek-chat",
  "gemini-2.0-flash",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.5-pro-preview-06-05",
  "gemini-3-flash",
  "gemini-3-pro",
  "gpt-4.1",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-5.3",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.4-nano",
  "grok-3",
  "grok-4",
  "grok-4-fast",
  "kimi-k2",
  "llama-3.3-70b",
  "llama-4-maverick",
  "llama-4-scout",
  "mistral-large-latest",
  "mistral-small-latest",
  "o3",
  "o4-mini",
  "qwen-max",
  "qwen-plus",
  "qwen-turbo",
  "qwen3",
]);

const getTools = (_provider: string, model: string) => {
  if (!TOOL_CAPABLE_MODELS.has(model)) {
    return undefined;
  }

  return tools;
};

// Models that support extended thinking / reasoning
const THINKING_MODELS = new Set([
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "o3",
  "o4-mini",
  "deepseek-reasoner",
]);

const getThinking = (_provider: string, model: string) =>
  THINKING_MODELS.has(model) ? { budgetTokens: 8000 } : undefined;

const server = new Elysia()
  .use(absolutejs)
  .use(pagesPlugin(manifest))
  .use(
    aiChat({
      maxTurns: 5,
      parseProvider: parseMessage,
      provider: getProvider,
      systemPrompt: SYSTEM_PROMPT,
      thinking: getThinking,
      tools: getTools,
    }),
  )
  .use(networking)
  .on("error", (error) => {
    const { request } = error;
    console.error(
      `Server error on ${request.method} ${request.url}: ${error.message}`,
    );
  });

export type Server = typeof server;
