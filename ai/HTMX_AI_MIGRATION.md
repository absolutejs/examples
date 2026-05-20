# HTMX Chat: Migrate to SSE-based AI Streaming

Once the next version of `@absolutejs/absolute` is released, the HTMX frontend can be rewritten to use proper HTMX idioms — SSE streaming with `hx-` attributes and zero client-side JavaScript for chat. This replaces the current fake implementation that loads HTMX but uses the same vanilla WebSocket script as the HTML version.

## What changes

### 1. Server: add `htmx: true` to aiChat config

**File:** `src/backend/server.ts`

```diff
  .use(
    aiChat({
      maxTurns: 5,
      parseProvider: parseMessage,
      provider: getProvider,
      systemPrompt: SYSTEM_PROMPT,
      thinking: getThinking,
      tools: getTools,
+     htmx: true,
    }),
  )
```

This adds SSE endpoints alongside the existing WebSocket ones. All 5 JS frameworks continue using WebSocket — only HTMX uses the new SSE endpoints.

### 2. Delete the script import

**File:** `src/frontend/htmx/pages/HtmxChat.html`

Remove the vanilla JS chat script:

```diff
- <script src="../../html/scripts/chat.ts"></script>
```

Also remove the apologetic note:

```diff
- <p class="htmx-note">
-   <small>Note: AI streaming uses a vanilla WebSocket alongside HTMX since
-   bidirectional token streaming isn't supported by hx-ws.</small>
- </p>
```

### 3. Add the HTMX SSE extension

The SSE extension is required for `sse-connect` and `sse-swap`. Add it in the `<head>`:

```diff
  <script src="/htmx/htmx.min.js"></script>
+ <script src="https://unpkg.com/htmx-ext-sse@2.2.2/sse.js"></script>
```

Or download and serve it locally like the main HTMX library.

### 4. Rewrite the chat container

Replace the empty `<div id="chat-container">` (previously populated by chat.ts) with HTMX markup:

```html
<div class="app-main">
  <!-- Messages area -->
  <div id="messages"></div>

  <!-- Chat input form — no JavaScript -->
  <form hx-post="/chat/message"
        hx-target="#messages"
        hx-swap="beforeend"
        hx-on::after-request="this.reset()">
    <input type="hidden" name="conversationId" id="conv-id" value="" />
    <div class="input-card">
      <textarea name="content"
                placeholder="Ask anything..."
                rows="1"
                required></textarea>
      <button type="submit">Send</button>
    </div>
  </form>
</div>
```

Key attributes:
- `hx-post="/chat/message"` — sends the form to the new HTMX endpoint
- `hx-target="#messages"` — appends the response HTML to the messages container
- `hx-swap="beforeend"` — new messages go at the bottom
- `hx-on::after-request="this.reset()"` — clears the textarea after send

### 5. Rewrite the sidebar

Replace the JS-populated sidebar with HTMX polling:

```html
<div class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <span class="sidebar-title">Chats</span>
    <button class="new-chat-btn"
            hx-get="/chat/conversations/list"
            hx-target="#sidebar-list"
            hx-swap="innerHTML"
            onclick="document.getElementById('conv-id').value = crypto.randomUUID()">
      +
    </button>
  </div>
  <div class="sidebar-list"
       id="sidebar-list"
       hx-get="/chat/conversations/list"
       hx-trigger="load, every 3s"
       hx-swap="innerHTML">
  </div>
</div>
```

- `hx-trigger="load, every 3s"` — loads immediately, then polls
- Each conversation item in the response has `hx-get="/chat/history/{id}"` to load that conversation

### 6. Delete conversation with HTMX

The server returns conversation list items with delete buttons. The delete uses:

```html
<button hx-delete="/chat/conversations/{id}"
        hx-target="closest .conversation-item"
        hx-swap="outerHTML">
  ×
</button>
```

### 7. What the SSE response looks like

When the form POSTs to `/chat/message`, the server returns HTML like this:

```html
<!-- User message -->
<div id="msg-abc123" class="message user">
  <div>What products are under $50?</div>
</div>

<!-- SSE-connected container for AI response -->
<div id="response-abc123"
     hx-ext="sse"
     sse-connect="/chat/sse/{conversationId}/{messageId}"
     hx-swap="innerHTML">
  <div sse-swap="content" hx-swap="innerHTML"></div>
  <div sse-swap="thinking" hx-swap="innerHTML"></div>
  <div sse-swap="tools" hx-swap="innerHTML"></div>
  <div sse-swap="images" hx-swap="innerHTML"></div>
  <div sse-swap="status" hx-swap="innerHTML"></div>
</div>
```

HTMX automatically connects to the SSE endpoint and swaps HTML fragments into the appropriate targets as they stream in:
- `content` — the AI's text response (re-rendered on each chunk)
- `thinking` — extended thinking block
- `tools` — tool call status and results
- `images` — generated images
- `status` — completion badge with token usage and duration

### 8. Optional: custom renderers

If the default HTML output doesn't match your styling, pass custom render functions on the server:

```typescript
aiChat({
  // ...existing config...
  htmx: {
    render: {
      chunk: (text, fullContent) =>
        `<div class="prose">${markdownToHtml(fullContent)}</div>`,
      thinking: (text) =>
        `<details class="think"><summary>Reasoning</summary>${text}</details>`,
      toolRunning: (name) =>
        `<div class="tool"><span class="spinner"></span> ${name}</div>`,
      toolComplete: (name, result) =>
        `<details class="tool done"><summary>${name}</summary><pre>${result}</pre></details>`,
      complete: (usage, durationMs, model) =>
        `<footer>${model} · ${usage?.outputTokens} tokens</footer>`,
    },
  },
})
```

## What about the model picker?

The model picker is the one piece that may still need some JavaScript, since it's a complex modal with search, filtering, and dynamic state. Options:

1. **Keep a minimal script** just for the model picker — set a hidden `<input name="model">` on the form when a model is selected
2. **Server-render the picker** with HTMX — `hx-get="/chat/models?search=..."` with `hx-trigger="keyup changed delay:300ms"` for search
3. **Default to a single model** and skip the picker entirely for simplicity

The chat streaming itself requires zero JavaScript regardless of which approach you pick for the model selector.

## What gets deleted

| File/Section | Reason |
|---|---|
| `<script src="../../html/scripts/chat.ts">` in HtmxChat.html | Replaced by `hx-` attributes |
| The "htmx-note" paragraph | No longer accurate — HTMX is used properly now |
| All `id="..."` attributes for JS-driven DOM manipulation | Replaced by `hx-target` and `sse-swap` |
| The model picker modal HTML (if going with option 2 or 3 above) | Simplified or server-rendered |
| `<input type="file" id="file-input">` hidden input | File upload would use `hx-encoding="multipart/form-data"` on the form instead |

## What stays the same

- The CSS (`chat.css`) — all class names stay, just the HTML structure changes
- The header and navigation
- The overall layout (sidebar + main area)
- Server-side: providers, tools, system prompt, thinking config — all unchanged
- All other 5 frontends (React, Svelte, Vue, Angular, HTML) — completely unaffected

## Summary

| Before | After |
|---|---|
| Loads HTMX library but doesn't use it | Full HTMX-idiomatic implementation |
| 1532-line vanilla JS script | Zero JS for chat (model picker TBD) |
| Manual WebSocket with JSON | `sse-connect` with HTML fragments |
| `socket.send(JSON.stringify(...))` | `hx-post="/chat/message"` |
| Client-side DOM manipulation | Server-rendered HTML via SSE |
| Fake HTMX, real JavaScript | Real HTMX, no JavaScript |
