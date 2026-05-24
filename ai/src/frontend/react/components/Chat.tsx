import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useAIStream } from "@absolutejs/ai/react";
import type { AIMessage } from "@absolutejs/ai";
import {
  COPY_FEEDBACK_MS,
  SCROLL_NEAR_BOTTOM_PX,
  stripPrefix,
} from "../../constants";
import { MODELS, type ModelDef } from "../../models";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { EmptyState } from "./EmptyState";
import { MessageItem } from "./MessageItem";
import { Sidebar } from "./Sidebar";

type MediaType =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp"
  | "application/pdf";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const isMediaType = (type: string): type is MediaType =>
  IMAGE_TYPES.includes(type) || type === "application/pdf";

const copyToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

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

const TypingIndicator = () => (
  <div className="message" data-role="assistant">
    <div className="typing-indicator">
      <span />
      <span />
      <span />
    </div>
  </div>
);

export const Chat = () => {
  const [selectedModel, setSelectedModel] = useState<ModelDef>(DEFAULT_MODEL);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    undefined,
  );
  const { messages, send, cancel, isStreaming, error } = useAIStream(
    "/chat",
    conversationId,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<
    Array<{
      data: string;
      media_type: MediaType;
      name: string;
      preview: string;
    }>
  >([]);

  const appMainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = appMainRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom =
      scrollHeight - scrollTop - clientHeight < SCROLL_NEAR_BOTTOM_PX;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    setPendingFiles((prev) =>
      prev.filter((file) => {
        if (file.media_type === "application/pdf")
          return selectedModel.capabilities.includes("pdf");

        return selectedModel.capabilities.includes("vision");
      }),
    );
  }, [selectedModel]);

  const supportsVision = selectedModel.capabilities.includes("vision");
  const supportsPdf = selectedModel.capabilities.includes("pdf");
  const supportsAttachments = supportsVision || supportsPdf;

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

        setPendingFiles((prev) => [
          ...prev,
          {
            data: base64,
            media_type: mediaType,
            name: fileName,
            preview: isImage ? result : "",
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, fileIdx) => fileIdx !== idx));
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

    send(`${selectedModel.provider}:${selectedModel.id}:${text}`, attachments);
    setPendingFiles([]);
  };

  const handleSubmit = (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    const form = evt.currentTarget;
    const inputEl = form.elements.namedItem("input");

    if (!(inputEl instanceof HTMLTextAreaElement)) {
      return;
    }

    const value = inputEl.value.trim();

    if (!value) {
      return;
    }

    sendMessage(value);
    inputEl.value = "";
  };

  const handleCopy = useCallback(async (msgId: string, content: string) => {
    await copyToClipboard(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), COPY_FEEDBACK_MS);
  }, []);

  const handleRetry = useCallback(
    (msgIdx: number) => {
      const prevUserMsg = messages
        .slice(0, msgIdx)
        .reverse()
        .find((msg) => msg.role === "user");

      if (!prevUserMsg) {
        return;
      }

      sendMessage(stripPrefix(prevUserMsg.content));
    },
    [messages, selectedModel],
  );

  const handleNewChat = () => {
    setConversationId(crypto.randomUUID());
  };

  const handleSelectConversation = (selectedId: string) => {
    setConversationId(selectedId);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = (deletedId: string) => {
    if (activeConvId === deletedId) {
      setConversationId(crypto.randomUUID());
    }
  };

  const activeConvId =
    conversationId ?? (messages.length > 0 ? messages[0].conversationId : null);

  const hasMessages = messages.length > 0;

  const inputBox = (
    <ChatInput
      fileInputRef={fileInputRef}
      hasMessages={hasMessages}
      isStreaming={isStreaming}
      onCancel={cancel}
      onProcessFiles={processFiles}
      onRemoveFile={removePendingFile}
      onSelectModel={setSelectedModel}
      onSubmit={handleSubmit}
      pendingFiles={pendingFiles}
      selectedModel={selectedModel}
      supportsAttachments={supportsAttachments}
      supportsPdf={supportsPdf}
      supportsVision={supportsVision}
    />
  );

  const showWaitingIndicator =
    isStreaming &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "user";

  return (
    <div className="chat-shell">
      <ChatHeader
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />
      <div className="app-layout">
        <Sidebar
          activeConversationId={activeConvId}
          onDeleteConversation={handleDeleteConversation}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          open={sidebarOpen}
        />
        <ChatMain
          appMainRef={appMainRef}
          copiedId={copiedId}
          error={error}
          handleCopy={handleCopy}
          handleRetry={handleRetry}
          hasMessages={hasMessages}
          inputBox={inputBox}
          messages={messages}
          messagesEndRef={messagesEndRef}
          selectedModel={selectedModel}
          sendMessage={sendMessage}
          showWaitingIndicator={showWaitingIndicator}
        />
      </div>
    </div>
  );
};

type ChatMainProps = {
  appMainRef: RefObject<HTMLDivElement | null>;
  copiedId: string | null;
  error: string | null;
  handleCopy: (id: string, content: string) => void;
  handleRetry: (idx: number) => void;
  hasMessages: boolean;
  inputBox: ReactNode;
  messages: AIMessage[];
  messagesEndRef: RefObject<HTMLDivElement | null>;
  selectedModel: ModelDef;
  sendMessage: (text: string) => void;
  showWaitingIndicator: boolean;
};

const ChatMain = ({
  appMainRef,
  copiedId,
  error,
  handleCopy,
  handleRetry,
  hasMessages,
  inputBox,
  messages,
  messagesEndRef,
  selectedModel,
  sendMessage,
  showWaitingIndicator,
}: ChatMainProps) => (
  <div className="app-main" ref={appMainRef}>
    <div className={`chat-container ${hasMessages ? "has-messages" : ""}`}>
      {!hasMessages && (
        <EmptyState
          inputBox={inputBox}
          onSendMessage={sendMessage}
          suggestions={SUGGESTIONS}
        />
      )}
      {hasMessages && (
        <div className="messages">
          {messages.map((msg, idx) => (
            <MessageItem
              copiedId={copiedId}
              key={msg.id}
              message={msg}
              messageIndex={idx}
              onCopy={handleCopy}
              onRetry={handleRetry}
              selectedModel={selectedModel}
            />
          ))}
          {showWaitingIndicator && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      )}
      {hasMessages && error && (
        <div className="error-banner">Error: {error}</div>
      )}
      {hasMessages && inputBox}
    </div>
    <p className="footer">
      <img alt="" src="/assets/png/absolutejs-temp.png" />
      Powered by{" "}
      <a
        href="https://absolutejs.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        AbsoluteJS
      </a>
    </p>
  </div>
);
