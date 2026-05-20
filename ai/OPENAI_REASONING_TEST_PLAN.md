# OpenAI Reasoning Summary - Test Plan

Requires OpenAI organization identity verification to be completed.

## What Was Implemented

In `@absolutejs/absolute@0.19.0-beta.265 + @absolutejs/ai@0.0.2`:

1. **Reasoning summary streaming** (`openaiResponses.ts`):
   - Handles `response.reasoning_summary_text.delta` SSE events
   - Maps them to `thinking` type chunks (same as Anthropic's extended thinking)
   - Displayed in the UI via the "Thought process" collapsible block

2. **Reasoning API parameter** (`openaiResponses.ts`):
   - When `thinking` is enabled for a model, sends `reasoning: { summary: "auto", effort: "high" }` in the request body
   - Controlled by `THINKING_MODELS` set in `server.ts` (o3, o4-mini are included)

3. **Error handling** (`openaiResponses.ts`):
   - Added `response.failed` and `response.incomplete` event handling
   - Throws descriptive errors instead of silently hanging

4. **Tool call ID fix** (`openaiResponses.ts`):
   - `processFunctionCallArgumentsDone` now falls back to `pending?.callId` or `itemId` when `call_id` is missing from the event

## Tests to Run

### 1. Basic reasoning (no tools)
- **Model**: o4-mini
- **Prompt**: "Explain why the sky is blue"
- **Expected**: Response should include a "Thought process" collapsible block showing the reasoning summary, followed by the text response
- **Verify**: Reasoning tokens show in usage stats

### 2. Reasoning + tool call
- **Model**: o4-mini
- **Prompt**: "Search all products and tell me which is the best value"
- **Expected**:
  - "Thought process" block appears (reasoning summary)
  - `search_products` tool call executes and completes
  - Full text response with analysis of the search results
  - Usage stats include reasoning tokens
- **This is the critical test** - it exercises the full pipeline: reasoning -> tool call -> tool result -> reasoning again -> final response

### 3. Reasoning + multiple tool calls
- **Model**: o4-mini
- **Prompt**: "Compare the mechanical keyboard and the USB-C hub in detail"
- **Expected**: Model should call `get_product_details` for both items, then provide a comparison
- **Verify**: Both tool calls complete, response references details from both

### 4. o3 model
- **Model**: o3
- **Prompt**: "Think step by step: what's the best value item?"
- **Expected**: Same behavior as o4-mini but with o3's deeper reasoning
- **Note**: o3 is more expensive ($10/$40 per M tokens) - use sparingly

### 5. Error handling
- **Model**: o4-mini
- **Test**: Send a request that might cause `response.failed` (e.g., extremely long context)
- **Expected**: Error banner appears in the UI with a descriptive message instead of silently hanging

## Parameters That May Need Tuning

After testing, these may need adjustment:

- `reasoning.effort`: Currently `"high"`. Could try `"medium"` or `"low"` for faster responses
- `reasoning.summary`: Currently `"auto"`. Could try `"detailed"` for more verbose reasoning output
- If the API rejects the `reasoning` parameter, it may need to be conditional on specific model IDs rather than all models with `thinking` enabled

## Models in THINKING_MODELS (server.ts)

```
claude-opus-4-6    -> Anthropic extended thinking
claude-sonnet-4-6  -> Anthropic extended thinking
o3                 -> OpenAI reasoning summary
o4-mini            -> OpenAI reasoning summary
deepseek-reasoner  -> DeepSeek (separate implementation needed)
```

## Models in TOOL_CAPABLE_MODELS (server.ts)

o3 and o4-mini were added in this session. Verify they work correctly with the tool definitions.
