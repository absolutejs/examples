export type ModelCapability =
  | "fast"
  | "image-gen"
  | "pdf"
  | "reasoning"
  | "tool-calling"
  | "vision";

export type CostTier = "free" | "low" | "medium" | "high" | "very-high";

export type ProviderKey =
  | "alibaba"
  | "anthropic"
  | "deepseek"
  | "google"
  | "meta"
  | "mistral"
  | "moonshot"
  | "ollama"
  | "openai"
  | "xai";

export type ModelDef = {
  capabilities: ModelCapability[];
  cost: CostTier;
  description: string;
  id: string;
  legacy?: boolean;
  name: string;
  provider: ProviderKey;
};

export type ProviderDef = {
  color: string;
  envKey?: string;
  id: ProviderKey;
  name: string;
};

export const CAPABILITY_LABELS: Record<
  ModelCapability,
  { icon: string; label: string }
> = {
  fast: { icon: "⚡", label: "Fast" },
  "image-gen": { icon: "🎨", label: "Image Gen" },
  pdf: { icon: "📄", label: "PDF" },
  reasoning: { icon: "🧠", label: "Reasoning" },
  "tool-calling": { icon: "🔧", label: "Tools" },
  vision: { icon: "👁", label: "Vision" },
};
export const COST_COLORS: Record<CostTier, string> = {
  free: "#4ade80",
  high: "#4ade80",
  low: "#4ade80",
  medium: "#4ade80",
  "very-high": "#ef4444",
};
export const COST_LABELS: Record<CostTier, string> = {
  free: "Free",
  high: "$$$",
  low: "$",
  medium: "$$",
  "very-high": "$$$+",
};
export const MODELS: ModelDef[] = [
  // ── Anthropic ──────────────────────────────────
  {
    capabilities: ["tool-calling", "vision", "pdf", "reasoning"],
    cost: "very-high",
    description: "Most capable Anthropic model for complex tasks",
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    provider: "anthropic",
  },
  {
    capabilities: ["tool-calling", "vision", "pdf", "reasoning", "fast"],
    cost: "high",
    description: "Best balance of speed and capability",
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
  },
  {
    capabilities: ["tool-calling", "vision", "fast"],
    cost: "low",
    description: "Fast and affordable for everyday tasks",
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    provider: "anthropic",
  },
  {
    capabilities: ["tool-calling", "vision"],
    cost: "medium",
    description: "Previous generation Sonnet",
    id: "claude-3-5-sonnet-20241022",
    legacy: true,
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
  },

  // ── OpenAI ─────────────────────────────────────
  {
    capabilities: ["tool-calling", "vision", "fast"],
    cost: "high",
    description: "Fast OpenAI model for everyday chat and tools",
    id: "gpt-5.4",
    name: "GPT-5.4",
    provider: "openai",
  },
  {
    capabilities: ["tool-calling", "vision", "fast"],
    cost: "medium",
    description: "Smaller GPT-5.4 tuned for speed and low cost",
    id: "gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    provider: "openai",
  },
  {
    capabilities: ["tool-calling", "vision", "fast"],
    cost: "low",
    description: "Fastest GPT-5.4 variant for ultra-low latency",
    id: "gpt-5.4-nano",
    name: "GPT-5.4 Nano",
    provider: "openai",
  },
  {
    capabilities: ["tool-calling", "vision"],
    cost: "high",
    description: "Fast OpenAI model for speed and capability",
    id: "gpt-5.3",
    name: "GPT-5.3",
    provider: "openai",
  },
  {
    capabilities: ["vision", "image-gen"],
    cost: "very-high",
    description: "OpenAI image generation model",
    id: "gpt-image-1.5",
    name: "GPT ImageGen 1.5",
    provider: "openai",
  },
  {
    capabilities: ["reasoning"],
    cost: "very-high",
    description: "Reasoning-focused model for math and logic",
    id: "o3",
    name: "o3",
    provider: "openai",
  },
  {
    capabilities: ["reasoning", "fast"],
    cost: "medium",
    description: "Fast reasoning model",
    id: "o4-mini",
    name: "o4 Mini",
    provider: "openai",
  },
  {
    capabilities: ["tool-calling", "vision", "reasoning", "image-gen"],
    cost: "very-high",
    description: "Most capable OpenAI model with advanced reasoning",
    id: "gpt-4.1",
    legacy: true,
    name: "GPT-4.1",
    provider: "openai",
  },
  {
    capabilities: ["tool-calling", "vision", "fast"],
    cost: "medium",
    description: "Fast and capable for most tasks",
    id: "gpt-4o",
    legacy: true,
    name: "GPT-4o",
    provider: "openai",
  },
  {
    capabilities: ["tool-calling", "vision", "fast"],
    cost: "low",
    description: "Affordable model for everyday use",
    id: "gpt-4o-mini",
    legacy: true,
    name: "GPT-4o Mini",
    provider: "openai",
  },

  // ── Google ─────────────────────────────────────
  {
    capabilities: ["tool-calling", "vision", "reasoning", "pdf"],
    cost: "high",
    description: "Google's most capable model",
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    provider: "google",
  },
  {
    capabilities: ["tool-calling", "vision", "fast"],
    cost: "low",
    description: "Lightning-fast with surprising capability",
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "google",
  },
  {
    capabilities: ["vision", "image-gen"],
    cost: "very-high",
    description: "Higher fidelity image generation built on Gemini 3 Pro",
    id: "gemini-3-pro-image-preview",
    name: "Gemini 3 Pro Image",
    provider: "google",
  },
  {
    capabilities: ["tool-calling", "vision", "reasoning", "pdf"],
    cost: "high",
    description: "Previous generation Pro model",
    id: "gemini-2.5-pro-preview-06-05",
    legacy: true,
    name: "Gemini 2.5 Pro",
    provider: "google",
  },
  {
    capabilities: ["tool-calling", "vision", "fast"],
    cost: "low",
    description: "Previous generation Flash model",
    id: "gemini-2.5-flash-preview-05-20",
    legacy: true,
    name: "Gemini 2.5 Flash",
    provider: "google",
  },

  // ── Meta ───────────────────────────────────────
  {
    capabilities: ["tool-calling", "vision", "reasoning"],
    cost: "low",
    description: "Meta's most capable open model",
    id: "llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "meta",
  },
  {
    capabilities: ["tool-calling", "vision", "fast"],
    cost: "low",
    description: "Efficient model with 17B active parameters",
    id: "llama-4-scout",
    name: "Llama 4 Scout",
    provider: "meta",
  },
  {
    capabilities: ["tool-calling", "fast"],
    cost: "low",
    description: "Strong 70B parameter model",
    id: "llama-3.3-70b",
    legacy: true,
    name: "Llama 3.3 70B",
    provider: "meta",
  },

  // ── xAI ────────────────────────────────────────
  {
    capabilities: ["tool-calling", "vision", "reasoning"],
    cost: "high",
    description: "xAI's most powerful reasoning model",
    id: "grok-4",
    name: "Grok 4",
    provider: "xai",
  },
  {
    capabilities: ["tool-calling", "vision", "fast"],
    cost: "low",
    description: "Faster and cheaper version of Grok",
    id: "grok-4-fast",
    name: "Grok 4 Fast",
    provider: "xai",
  },
  {
    capabilities: ["tool-calling", "vision", "reasoning"],
    cost: "high",
    description: "Previous generation flagship",
    id: "grok-3",
    legacy: true,
    name: "Grok 3",
    provider: "xai",
  },

  // ── DeepSeek ───────────────────────────────────
  {
    capabilities: ["tool-calling", "reasoning"],
    cost: "low",
    description: "Strong reasoning at a fraction of the cost",
    id: "deepseek-chat",
    name: "DeepSeek V3",
    provider: "deepseek",
  },
  {
    capabilities: ["reasoning"],
    cost: "medium",
    description: "Dedicated reasoning model with chain of thought",
    id: "deepseek-reasoner",
    name: "DeepSeek R1",
    provider: "deepseek",
  },

  // ── Mistral ────────────────────────────────────
  {
    capabilities: ["tool-calling", "vision", "fast"],
    cost: "medium",
    description: "Mistral's flagship model",
    id: "mistral-large-latest",
    name: "Mistral Large",
    provider: "mistral",
  },
  {
    capabilities: ["tool-calling", "fast"],
    cost: "low",
    description: "Small and fast for simple tasks",
    id: "mistral-small-latest",
    name: "Mistral Small",
    provider: "mistral",
  },
  {
    capabilities: ["tool-calling", "fast"],
    cost: "low",
    description: "Coding-focused model by Mistral",
    id: "codestral-latest",
    name: "Codestral",
    provider: "mistral",
  },

  // ── Alibaba ────────────────────────────────────
  {
    capabilities: ["tool-calling", "reasoning"],
    cost: "low",
    description: "Massive open model for general intelligence",
    id: "qwen-max",
    name: "Qwen Max",
    provider: "alibaba",
  },
  {
    capabilities: ["tool-calling", "reasoning"],
    cost: "low",
    description: "Alibaba's balanced Qwen model",
    id: "qwen-plus",
    name: "Qwen Plus",
    provider: "alibaba",
  },
  {
    capabilities: ["tool-calling", "reasoning", "fast"],
    cost: "low",
    description: "Fast and affordable Qwen variant",
    id: "qwen-turbo",
    name: "Qwen Turbo",
    provider: "alibaba",
  },

  // ── Moonshot ───────────────────────────────────
  {
    capabilities: ["tool-calling", "reasoning"],
    cost: "medium",
    description: "Enhanced version with longer context",
    id: "kimi-k2",
    name: "Kimi K2",
    provider: "moonshot",
  },

  // ── Ollama (local) ─────────────────────────────
  {
    capabilities: ["tool-calling", "reasoning"],
    cost: "free",
    description: "Qwen3 running locally via Ollama",
    id: "qwen3",
    name: "Qwen3 (local)",
    provider: "ollama",
  },
  {
    capabilities: ["fast"],
    cost: "free",
    description: "Meta's compact 3B parameter model",
    id: "llama3.2",
    name: "Llama 3.2",
    provider: "ollama",
  },
  {
    capabilities: [],
    cost: "free",
    description: "Mistral's 7B model running locally",
    id: "mistral",
    name: "Mistral 7B",
    provider: "ollama",
  },
];
export const MODELS_BY_PROVIDER: Record<string, string[]> = {};
const PROVIDERS_LIST: ProviderDef[] = [
  {
    color: "#c96442",
    envKey: "ANTHROPIC_API_KEY",
    id: "anthropic",
    name: "Anthropic",
  },
  { color: "#10a37f", envKey: "OPENAI_API_KEY", id: "openai", name: "OpenAI" },
  { color: "#4285f4", envKey: "GOOGLE_API_KEY", id: "google", name: "Google" },
  { color: "#0668E1", envKey: "META_API_KEY", id: "meta", name: "Meta" },
  { color: "#000", envKey: "XAI_API_KEY", id: "xai", name: "xAI" },
  {
    color: "#0066ff",
    envKey: "DEEPSEEK_API_KEY",
    id: "deepseek",
    name: "DeepSeek",
  },
  {
    color: "#ff7000",
    envKey: "MISTRAL_API_KEY",
    id: "mistral",
    name: "Mistral",
  },
  {
    color: "#6366f1",
    envKey: "ALIBABA_API_KEY",
    id: "alibaba",
    name: "Alibaba",
  },
  {
    color: "#5B45E0",
    envKey: "MOONSHOT_API_KEY",
    id: "moonshot",
    name: "Moonshot",
  },
  { color: "#888", id: "ollama", name: "Ollama" },
];
export const PROVIDER_IDS = PROVIDERS_LIST.map((prov) => prov.id);
export const PROVIDERS = PROVIDERS_LIST;
export const filterModels = (
  query: string,
  providerId?: ProviderKey,
  showLegacy?: boolean,
  requiredCapabilities?: ModelCapability[],
) =>
  MODELS.filter((model) => {
    if (!showLegacy && model.legacy) return false;
    if (providerId && model.provider !== providerId) return false;

    if (requiredCapabilities && requiredCapabilities.length > 0) {
      const hasAll = requiredCapabilities.every((cap) =>
        model.capabilities.includes(cap),
      );

      if (!hasAll) return false;
    }

    if (!query) return true;

    const lower = query.toLowerCase();

    return (
      model.name.toLowerCase().includes(lower) ||
      model.id.toLowerCase().includes(lower) ||
      model.description.toLowerCase().includes(lower)
    );
  });
export const getModelsForProvider = (providerId: ProviderKey) =>
  MODELS.filter((mod) => mod.provider === providerId);
export const getProvider = (providerId: ProviderKey) =>
  PROVIDERS.find((prov) => prov.id === providerId);
for (const mod of MODELS) {
  if (mod.legacy) continue;
  if (!MODELS_BY_PROVIDER[mod.provider]) {
    MODELS_BY_PROVIDER[mod.provider] = [];
  }
  MODELS_BY_PROVIDER[mod.provider].push(mod.id);
}
