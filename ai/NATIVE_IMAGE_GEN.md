# Native Image Generation — Status

## What Changed

Two new providers added to `@absolutejs/absolute` (v0.19.0-beta.251):

- **`openaiResponses`** — OpenAI Responses API (`/v1/responses`). Replaces `openai` (Chat Completions) for all OpenAI models. Supports native image generation via `image_generation` built-in tool, streamed partial images, and function calling.
- **`gemini`** — Native Google Gemini API (`streamGenerateContent`). Replaces `openaiCompatible` for Google models. Supports native image generation via `responseModalities: ["TEXT", "IMAGE"]` for image-capable models.

Image data flows through the full pipeline: provider SSE parser -> `AIImageChunk` -> `streamAI` -> `AIImageMessage` over WebSocket -> client `messageStore` -> React UI with loading states.

The old `generateImage` DALL-E 3 tool was removed. Image generation is now native to the models themselves.

## What's Verified Working

- OpenAI Responses API text streaming (tested with `gpt-5.4-mini`)
- Full pipeline: streaming text, usage stats, model tags, duration
- Chat UI renders correctly, no JS console errors
- Anthropic provider unchanged and still works
- Typecheck passes

## What Needs Testing (Blocked by Account Restrictions)

### OpenAI Image Generation (`gpt-image-1.5`)

**Blocker:** OpenAI org needs identity verification.

1. Go to https://platform.openai.com/settings/organization/general
2. Click "Verify as an individual or business"
3. Complete verification + add billing
4. Wait up to 15 minutes for access to propagate

Once verified, select "GPT ImageGen 1.5" in the model picker and ask it to generate an image. The response should include an `image_generation_call` output item with base64 image data that renders inline in the chat.

### Gemini Image Generation (`gemini-3-pro-image-preview`)

**Blocker:** Google API key is on the free tier with 0 quota for image models.

1. Set up a paid plan at https://ai.google.dev
2. The `gemini-3-pro-image-preview` model will then accept requests

Once quota is available, select "Gemini 3 Pro Image" and ask it to generate an image. The response should include `inlineData` parts with base64 image data.

### Gemini Text Models (Pre-existing Issue)

The model IDs in `src/frontend/models.ts` don't match the actual Gemini API model names:

| models.ts ID | Actual API ID |
|---|---|
| `gemini-3-flash` | `gemini-3-flash-preview` |
| `gemini-3-pro` | `gemini-3-pro-preview` |

These need to be updated for Gemini text chat to work through the native provider.

## UI Features Ready

- `msg.images` rendered inline in assistant messages
- Partial images: pulse + shimmer CSS animation overlay
- Final images: clean display, rounded corners, max-width 512px
- Revised prompt caption shown below completed images
- Typing indicator suppressed when images are already showing

## Files Changed

### Framework (`@absolutejs/absolute`)
- `types/ai.ts` — `AIImageChunk`, `AIImageMessage`, `AIImageData`, extended unions
- `types/typeGuards.ts` — `case 'image'` validation
- `src/ai/providers/openaiResponses.ts` — NEW: Responses API provider
- `src/ai/providers/gemini.ts` — NEW: native Gemini provider
- `src/ai/streamAI.ts` — `case 'image'` in both stream paths
- `src/ai/client/actions.ts` — `case 'image'` action mapping
- `src/ai/client/messageStore.ts` — `handleImage` + `upsertImage`
- `src/ai/index.ts` — exports
- `package.json` — export paths + version bump
- `scripts/build.ts` — entry points

### Example App
- `src/backend/handlers/providers.ts` — switched to `openaiResponses` + `gemini`
- `src/backend/handlers/tools.ts` — removed `generateImage` / `imageTools`
- `src/backend/server.ts` — removed `IMAGE_GEN_MODELS` set
- `src/frontend/react/components/Chat.tsx` — image rendering in messages
- `src/frontend/styles/indexes/chat.css` — `.generated-images` styles
- `src/frontend/models.ts` — fixed `gemini-3-pro-image-preview` ID
