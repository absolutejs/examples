<script lang="ts">
  import { untrack } from "svelte";
  import { createAIStream } from "@absolutejs/ai/svelte";
  import type { AIMessage } from "@absolutejs/ai";
  import { COPY_FEEDBACK_MS, stripPrefix } from "../../constants";
  import { MODELS, type ModelDef } from "../../models";
  import ChatInput from "./ChatInput.svelte";
  import EmptyState from "./EmptyState.svelte";
  import MessageItem from "./MessageItem.svelte";
  import Sidebar from "./Sidebar.svelte";

  type MediaType =
    | "image/png"
    | "image/jpeg"
    | "image/gif"
    | "image/webp"
    | "application/pdf";

  const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

  const isMediaType = (type: string): type is MediaType =>
    IMAGE_TYPES.includes(type) || type === "application/pdf";

  type SuggestionCategoryDef = {
    icon: string;
    label: string;
    prompts: string[];
  };

  const SUGGESTIONS: SuggestionCategoryDef[] = [
    {
      icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.5.5-.1 1.7.7 1.7H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z",
      label: "Shop",
      prompts: [
        "What do you have under $50?",
        "Show me electronics",
        "Tell me about the mechanical keyboard",
      ],
    },
    {
      icon: "M12 2a8 8 0 00-3.5 15.2V19a1 1 0 001 1h5a1 1 0 001-1v-1.8A8 8 0 0012 2z",
      label: "Create",
      prompts: [
        "Generate an image of a sunset over mountains",
        "Write a product description for a new gadget",
        "Help me brainstorm gift ideas under $30",
      ],
    },
    {
      icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
      label: "Explore",
      prompts: [
        "Compare the keyboard and the USB-C hub",
        "What's in stock in the kitchen category?",
        "Which products are best for a home office?",
      ],
    },
    {
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
      label: "Reason",
      prompts: [
        "Think step by step: what's the best value item?",
        "Analyze the full catalog and rank by category",
        "If I have $100, build me the ideal cart",
      ],
    },
  ];

  const DEFAULT_MODEL =
    MODELS.find((mod) => mod.id === "claude-sonnet-4-6") ?? MODELS[0];

  let selectedModel = $state<ModelDef>(DEFAULT_MODEL);
  let sidebarOpen = $state(false);
  let conversationId = $state<string | undefined>(undefined);
  let copiedId = $state<string | null>(null);
  let messagesEndEl: HTMLDivElement | undefined = $state(undefined);
  let pendingFiles = $state<
    Array<{
      data: string;
      media_type: MediaType;
      name: string;
      preview: string;
    }>
  >([]);

  const stream = createAIStream("/chat", conversationId);

  // Bridge the stream's plain getters into Svelte reactive state
  let messages: AIMessage[] = $state([]);
  let isStreaming = $state(false);
  let error: string | null = $state(null);

  $effect(() => {
    let rafId: number;
    const sync = () => {
      messages = stream.messages;
      isStreaming = stream.isStreaming;
      error = stream.error;
      rafId = requestAnimationFrame(sync);
    };
    rafId = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(rafId);
  });

  let appMainEl: HTMLDivElement | undefined = $state(undefined);

  // Auto-scroll on new messages (only when user is near the bottom)
  $effect(() => {
    if (messages.length > 0 && appMainEl) {
      const { scrollTop, scrollHeight, clientHeight } = appMainEl;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom) {
        messagesEndEl?.scrollIntoView({ behavior: "smooth" });
      }
    }
  });

  // Filter pending files when model changes (untrack pendingFiles to avoid cycle)
  $effect(() => {
    const model = selectedModel;
    const current = untrack(() => pendingFiles);
    pendingFiles = current.filter((file) => {
      if (file.media_type === "application/pdf")
        return model.capabilities.includes("pdf");
      return model.capabilities.includes("vision");
    });
  });

  let supportsVision = $derived(selectedModel.capabilities.includes("vision"));
  let supportsPdf = $derived(selectedModel.capabilities.includes("pdf"));
  let supportsAttachments = $derived(supportsVision || supportsPdf);
  let hasMessages = $derived(messages.length > 0);
  let activeConvId = $derived(
    conversationId ??
      (messages.length > 0 ? (messages[0] as any).conversationId : null),
  );
  let showWaitingIndicator = $derived(
    isStreaming &&
      messages.length > 0 &&
      messages[messages.length - 1].role === "user",
  );

  const processFiles = (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const { type: fileType } = file;
      const isImage = IMAGE_TYPES.includes(fileType);
      const isPdf = fileType === "application/pdf";

      if (isImage && !supportsVision) continue;
      if (isPdf && !supportsPdf) continue;
      if (!isMediaType(fileType)) continue;

      const mediaType = fileType;
      const { name: fileName } = file;
      const reader = new FileReader();
      reader.onload = () => {
        const { result } = reader;
        if (typeof result !== "string") return;
        const [, base64] = result.split(",");
        pendingFiles = [
          ...pendingFiles,
          {
            data: base64,
            media_type: mediaType,
            name: fileName,
            preview: isImage ? result : "",
          },
        ];
      };
      reader.readAsDataURL(file);
    }
  };

  const removePendingFile = (idx: number) => {
    pendingFiles = pendingFiles.filter((_, fileIdx) => fileIdx !== idx);
  };

  const sendMessage = (text: string) => {
    const attachments =
      pendingFiles.length > 0
        ? pendingFiles.map(({ data, media_type, name }) => ({
            data,
            media_type,
            name,
          }))
        : undefined;

    stream.send(
      `${selectedModel.provider}:${selectedModel.id}:${text}`,
      attachments,
    );
    pendingFiles = [];
  };

  const handleSubmit = (evt: SubmitEvent) => {
    evt.preventDefault();
    const form = evt.currentTarget as HTMLFormElement;
    const inputEl = form.elements.namedItem("input");
    if (!(inputEl instanceof HTMLTextAreaElement)) return;
    const value = inputEl.value.trim();
    if (!value) return;
    sendMessage(value);
    inputEl.value = "";
  };

  const handleCopy = async (msgId: string, content: string) => {
    await navigator.clipboard.writeText(content);
    copiedId = msgId;
    setTimeout(() => (copiedId = null), COPY_FEEDBACK_MS);
  };

  const handleRetry = (msgIdx: number) => {
    const prevUserMsg = messages
      .slice(0, msgIdx)
      .reverse()
      .find((msg) => msg.role === "user");
    if (!prevUserMsg) return;
    sendMessage(stripPrefix(prevUserMsg.content));
  };

  const handleNewChat = () => {
    conversationId = crypto.randomUUID();
  };

  const handleSelectConversation = (selectedId: string) => {
    conversationId = selectedId;
    sidebarOpen = false;
  };

  const handleDeleteConversation = (deletedId: string) => {
    if (activeConvId === deletedId) {
      conversationId = crypto.randomUUID();
    }
  };
</script>

<div class="chat-shell">
  <header>
    <div class="header-left">
      <button
        class="sidebar-toggle"
        onclick={() => (sidebarOpen = !sidebarOpen)}
        title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        type="button"
      >
        <svg
          fill="none"
          height="16"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          width="16"
        >
          <rect height="18" rx="2" width="18" x="3" y="3" />
          <line x1="9" x2="9" y1="3" y2="21" />
        </svg>
      </button>
      <a class="logo" href="/">
        <img
          alt="AbsoluteJS"
          height="24"
          src="/assets/png/absolutejs-temp.png"
        />
        AbsoluteJS
      </a>
    </div>
    <nav>
      <a href="/">React</a>
      <a class="active" href="/svelte">Svelte</a>
      <a href="/vue">Vue</a>
      <a href="/angular">Angular</a>
      <a href="/html">HTML</a>
      <a href="/htmx">HTMX</a>
    </nav>
  </header>

  <div class="app-layout">
    <Sidebar
      activeConversationId={activeConvId}
      onDeleteConversation={handleDeleteConversation}
      onNewChat={handleNewChat}
      onSelectConversation={handleSelectConversation}
      open={sidebarOpen}
    />
    <div class="app-main" bind:this={appMainEl}>
      <div class="chat-container" class:has-messages={hasMessages}>
        {#if !hasMessages}
          <EmptyState onSendMessage={sendMessage} suggestions={SUGGESTIONS}>
            {#snippet inputBox()}
              <ChatInput
                {hasMessages}
                {isStreaming}
                onCancel={() => stream.cancel()}
                onProcessFiles={processFiles}
                onRemoveFile={removePendingFile}
                onSelectModel={(m) => (selectedModel = m)}
                onSubmit={handleSubmit}
                {pendingFiles}
                {selectedModel}
                {supportsAttachments}
                {supportsPdf}
                {supportsVision}
              />
            {/snippet}
          </EmptyState>
        {:else}
          <div class="messages">
            {#each messages as msg, idx (msg.id)}
              <MessageItem
                {copiedId}
                message={msg}
                messageIndex={idx}
                onCopy={handleCopy}
                onRetry={handleRetry}
                {selectedModel}
              />
            {/each}
            {#if showWaitingIndicator}
              <div class="message" data-role="assistant">
                <div class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            {/if}
            <div bind:this={messagesEndEl}></div>
          </div>
          {#if error}
            <div class="error-banner">Error: {error}</div>
          {/if}
          <ChatInput
            {hasMessages}
            {isStreaming}
            onCancel={() => stream.cancel()}
            onProcessFiles={processFiles}
            onRemoveFile={removePendingFile}
            onSelectModel={(m) => (selectedModel = m)}
            onSubmit={handleSubmit}
            {pendingFiles}
            {selectedModel}
            {supportsAttachments}
            {supportsPdf}
            {supportsVision}
          />
        {/if}
      </div>
      <p class="footer">
        <img src="/assets/png/absolutejs-temp.png" alt="" />
        Powered by
        <a
          href="https://absolutejs.com"
          target="_blank"
          rel="noopener noreferrer">AbsoluteJS</a
        >
      </p>
    </div>
  </div>
</div>
