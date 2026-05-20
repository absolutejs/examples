# HTML Chat: Migrate to `@absolutejs/ai/client`

Once the next version of `@absolutejs/absolute` is released, the HTML chat script can replace its manual WebSocket and message handling with `createAIStream`. This removes ~200 lines of protocol code while keeping all UI rendering and interaction logic.

## What changes

### 1. Add the import

```diff
+ import { createAIStream } from "@absolutejs/ai/client";
+ import type { AIMessage } from "@absolutejs/absolute";
```

### 2. Delete manual WebSocket setup

Remove the entire WebSocket section (lines 239–275 in `chat.ts`):

```diff
- const { protocol, host } = window.location;
- const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
- const wsUrl = `${wsProtocol}//${host}/chat`;
- let socket = new WebSocket(wsUrl);
-
- const handleWsMessage = (event: MessageEvent) => {
-   const msg = JSON.parse(String(event.data));
-   if (msg.type === "chunk") { handleChunk(msg); }
-   else if (msg.type === "tool_status") { handleToolStatus(msg); }
-   else if (msg.type === "thinking") { handleThinking(msg); }
-   else if (msg.type === "image") { handleImage(msg); }
-   else if (msg.type === "complete") { handleComplete(msg); }
-   else if (msg.type === "error") { handleError(msg); }
- };
-
- const connectWebSocket = () => { ... };
- socket.onmessage = handleWsMessage;
- socket.onclose = () => { setTimeout(connectWebSocket, RECONNECT_DELAY); };
```

Replace with:

```typescript
const ai = createAIStream("/chat", conversationId);
```

### 3. Delete manual message handlers

Remove all of these functions:

- `ensureCurrentMessage()`
- `handleChunk()`
- `handleToolStatus()`
- `handleThinking()`
- `handleImage()`
- `handleComplete()`
- `handleError()`
- `applyCompleteData()`
- `updateCurrentAssistantEl()`

These are all handled internally by `createAIStream`.

### 4. Delete the `LocalMessage` type and `messages` / `currentMessage` state

```diff
- type LocalMessage = { ... };
- let messages: LocalMessage[] = [];
- let currentMessage: LocalMessage | null = null;
- let isStreaming = false;
```

The stream object manages this state. Access it via:
- `ai.messages` — array of `AIMessage` objects (same shape as `LocalMessage` but typed)
- `ai.isStreaming` — boolean
- `ai.error` — string or null

### 5. Delete the `WS_OPEN` and `RECONNECT_DELAY` constants

```diff
- const WS_OPEN = 1;
- const RECONNECT_DELAY = 1000;
```

Connection management (including reconnect with exponential backoff) is handled automatically.

### 6. Subscribe to state changes

Add a subscribe call that re-renders when messages change:

```typescript
ai.subscribe(() => {
  if (ai.messages.length > 0) {
    renderMessagesView();
  } else {
    renderEmptyState();
  }
});
```

This replaces the manual `renderMessagesView()` calls scattered through the WebSocket handlers.

### 7. Rewrite `sendMessage()`

```diff
  const sendMessage = (text: string) => {
-   if (socket.readyState !== WS_OPEN) return;
-
    const attachments =
      pendingFiles.length > 0
        ? pendingFiles.map(({ data, media_type, name }) => ({
            data,
            media_type,
            name,
          }))
        : undefined;

-   const userMsg: LocalMessage = { ... };
-   messages.push(userMsg);
    pendingFiles = [];

-   const payload: Record<string, unknown> = {
-     content: `${selectedModel.provider}:${selectedModel.id}:${text}`,
-     conversationId,
-     type: "message",
-   };
-   if (attachments) { payload.attachments = attachments; }
-   socket.send(JSON.stringify(payload));
-   isStreaming = true;
-   renderMessagesView();
+   ai.send(
+     `${selectedModel.provider}:${selectedModel.id}:${text}`,
+     attachments
+   );
  };
```

### 8. Wire up cancel

```diff
- socket.send(JSON.stringify({ type: "cancel", conversationId }));
- isStreaming = false;
+ ai.cancel();
```

### 9. Update new chat handler

When starting a new conversation, destroy the old stream and create a new one:

```typescript
let ai = createAIStream("/chat");

const handleNewChat = () => {
  ai.destroy();
  ai = createAIStream("/chat");
  ai.subscribe(() => { /* re-render */ });
  renderEmptyState();
};
```

### 10. Update rendering to use `AIMessage` instead of `LocalMessage`

The `AIMessage` type from absolutejs has the same fields but properly typed:

| `LocalMessage` field | `AIMessage` field | Notes |
|---|---|---|
| `content` | `content` | Same |
| `id` | `id` | Same |
| `role` | `role` | Same |
| `thinking` | `thinking` | Same |
| `toolCalls` | `toolCalls` | Same shape, typed as `AIToolCall[]` |
| `images` | `images` | Same shape, typed as `AIImageData[]` |
| `attachments` | `attachments` | Same shape, typed as `AIAttachment[]` |
| `usage` | `usage` | Same shape, typed as `AIUsage` |
| `durationMs` | `durationMs` | Same |
| `model` | `model` | Same |
| `isStreaming` | `isStreaming` | Same |

The rendering functions (`renderMessageEl`, `renderAssistantContent`, etc.) should work with a type annotation change from `LocalMessage` to `AIMessage`.

## What stays the same

Everything UI-related is unchanged:

- All DOM rendering functions (`renderEmptyState`, `renderMessagesView`, `renderMessageEl`, etc.)
- File attachment handling (`processFiles`, `addPendingFile`, `renderFilePreviews`)
- Sidebar conversation management (fetching, rendering, selecting, deleting)
- Model picker (all picker state, rendering, filtering)
- Scroll management
- Suggestion pills and categories
- Copy/retry button handlers
- Markdown rendering
- Capability badge rendering

## Summary

| Before | After |
|---|---|
| Manual `new WebSocket()` | `createAIStream("/chat")` |
| Manual reconnect with `setTimeout` | Auto-reconnect with exponential backoff |
| 6 handler functions for message types | `ai.subscribe(() => render())` |
| `LocalMessage` type + manual state | `ai.messages` (typed `AIMessage[]`) |
| `socket.send(JSON.stringify(...))` | `ai.send(text, attachments)` |
| `socket.send({ type: "cancel" })` | `ai.cancel()` |
| ~200 lines of protocol code | 3 lines of setup |
