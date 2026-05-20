// Price per million tokens [input, output]
export const PRICING: Record<string, [number, number]> = {
  "claude-3-5-sonnet-20241022": [3.0, 15.0],
  "claude-haiku-4-5": [0.8, 4.0],
  "claude-opus-4-6": [15.0, 75.0],
  "claude-sonnet-4-6": [3.0, 15.0],
  "codestral-latest": [0.3, 0.9],
  "deepseek-chat": [0.27, 1.1],
  "deepseek-reasoner": [0.55, 2.19],
  "gemini-2.0-flash": [0.1, 0.4],
  "gemini-2.5-flash-preview-05-20": [0.15, 0.6],
  "gemini-2.5-pro-preview-06-05": [1.25, 10.0],
  "gemini-3-flash": [0.15, 0.6],
  "gemini-3-pro": [1.25, 10.0],
  "gemini-3-pro-image": [5.0, 20.0],
  "gpt-4.1": [2.0, 8.0],
  "gpt-4o": [2.5, 10.0],
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-5.3": [3.0, 12.0],
  "gpt-5.4": [3.0, 12.0],
  "gpt-5.4-mini": [1.0, 4.0],
  "gpt-5.4-nano": [0.3, 1.2],
  "gpt-image-1.5": [10.0, 40.0],
  "grok-3": [3.0, 15.0],
  "grok-4": [3.0, 15.0],
  "grok-4-fast": [0.6, 3.0],
  "kimi-k2": [1.0, 4.0],
  "llama-3.3-70b": [0.2, 0.2],
  "llama-4-maverick": [0.2, 0.2],
  "llama-4-scout": [0.15, 0.15],
  "llama3.2": [0, 0],
  mistral: [0, 0],
  "mistral-large-latest": [2.0, 6.0],
  "mistral-small-latest": [0.1, 0.3],
  o3: [10.0, 40.0],
  "o4-mini": [1.1, 4.4],
  "qwen-max": [0.4, 1.6],
  "qwen-plus": [0.15, 0.6],
  "qwen-turbo": [0.05, 0.2],
  qwen3: [0, 0],
};

const MILLION = 1_000_000;

export const calculateCost = (
  model: string,
  inputTokens: number,
  outputTokens: number,
) => {
  const prices = PRICING[model];

  if (!prices) {
    return null;
  }

  const [inputPrice, outputPrice] = prices;
  const inputCost = (inputTokens / MILLION) * inputPrice;
  const outputCost = (outputTokens / MILLION) * outputPrice;

  return inputCost + outputCost;
};

export const formatCost = (cost: number) => {
  if (cost === 0) {
    return "free";
  }

  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }

  return `$${cost.toFixed(3)}`;
};

export const MS_PER_SECOND = 1000;

// Time conversions
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_WEEK = 7;

// Scroll behavior
export const SCROLL_NEAR_BOTTOM_PX = 150;

// UI animation delays (ms)
export const COPY_FEEDBACK_MS = 2000;
export const FILTER_CLOSE_MS = 150;
export const MODAL_CLOSE_MS = 180;
export const SEARCH_FOCUS_DELAY_MS = 50;

// Icon sizing
export const ICON_BADGE_PADDING = 6;
export const ICON_DEFAULT_SIZE = 14;

// Markdown heading slice offsets
export const H2_SLICE = 3;
export const H3_SLICE = 4;

// Sentinel values
export const EXCLUDE_LAST = -1;

export const stripPrefix = (content: string) => {
  const first = content.indexOf(":");
  if (first <= 0 || first >= 50) return content;
  const rest = content.slice(first + 1);
  const second = rest.indexOf(":");
  if (second <= 0) return rest;

  return rest.slice(second + 1);
};
