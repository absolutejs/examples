import {
  stripPrefix,
  calculateCost,
  formatCost,
  MS_PER_SECOND,
} from "../../constants";
import type { ModelDef } from "../../models";
import { renderMarkdown } from "../../utils/markdown";

type ToolCall = {
  name: string;
  result?: string;
};

type Attachment = {
  data: string;
  media_type: string;
  name?: string;
};

type ImageData = {
  data: string;
  format: string;
  imageId?: string;
  isPartial?: boolean;
  revisedPrompt?: string;
};

type Usage = {
  inputTokens: number;
  outputTokens: number;
};

type Message = {
  attachments?: Attachment[];
  content: string;
  conversationId?: string;
  durationMs?: number;
  id: string;
  images?: ImageData[];
  isStreaming?: boolean;
  model?: string;
  role: "user" | "assistant" | "system";
  thinking?: string;
  toolCalls?: ToolCall[];
  usage?: Usage;
};

type MessageItemProps = {
  copiedId: string | null;
  message: Message;
  onCopy: (id: string, content: string) => void;
  onRetry: (idx: number) => void;
  messageIndex: number;
  selectedModel: ModelDef;
};

export const MessageItem = ({
  copiedId,
  message,
  messageIndex,
  onCopy,
  onRetry,
  selectedModel,
}: MessageItemProps) => (
  <div className="message" data-role={message.role} key={message.id}>
    {message.role === "assistant" && (
      <AssistantContent
        copiedId={copiedId}
        message={message}
        messageIndex={messageIndex}
        onCopy={onCopy}
        onRetry={onRetry}
        selectedModel={selectedModel}
      />
    )}
    {message.role === "user" && <UserContent message={message} />}
  </div>
);

const UserContent = ({ message }: { message: Message }) => (
  <>
    {message.attachments && message.attachments.length > 0 && (
      <UserAttachments attachments={message.attachments} />
    )}
    <span>{stripPrefix(message.content)}</span>
  </>
);

const UserAttachments = ({ attachments }: { attachments: Attachment[] }) => (
  <div className="message-images">
    {attachments.map((att, idx) =>
      att.media_type === "application/pdf" ? (
        <div className="message-pdf" key={idx}>
          <svg
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            width="16"
          >
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {att.name ?? "document.pdf"}
        </div>
      ) : (
        <img
          alt={att.name ?? "attachment"}
          className="message-image"
          key={idx}
          src={`data:${att.media_type};base64,${att.data}`}
        />
      ),
    )}
  </div>
);

type AssistantContentProps = {
  copiedId: string | null;
  message: Message;
  messageIndex: number;
  onCopy: (id: string, content: string) => void;
  onRetry: (idx: number) => void;
  selectedModel: ModelDef;
};

const AssistantContent = ({
  copiedId,
  message,
  messageIndex,
  onCopy,
  onRetry,
  selectedModel,
}: AssistantContentProps) => (
  <>
    <ToolCallsBlock messageId={message.id} toolCalls={message.toolCalls} />
    <ThinkingBlock message={message} />
    <GeneratedImages images={message.images} />
    <AssistantBody message={message} />
    {!message.isStreaming && message.content && (
      <UsageBadge
        copiedId={copiedId}
        message={message}
        messageIndex={messageIndex}
        onCopy={onCopy}
        onRetry={onRetry}
        selectedModel={selectedModel}
      />
    )}
  </>
);

const ToolCallsBlock = ({
  toolCalls,
  messageId,
}: {
  messageId: string;
  toolCalls?: ToolCall[];
}) => {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="tool-calls">
      {toolCalls.map((tool) => (
        <details className="tool-call" key={`${messageId}-${tool.name}`}>
          <summary className={tool.result ? "done" : "running"}>
            <span className="tool-icon">{tool.result ? "✓" : "⟳"}</span>
            {tool.name}
            <span className="tool-label">
              {tool.result ? "completed" : "running..."}
            </span>
          </summary>
          {tool.result && <pre className="tool-result">{tool.result}</pre>}
        </details>
      ))}
    </div>
  );
};

const ThinkingBlock = ({ message }: { message: Message }) => {
  if (!message.thinking) return null;

  return (
    <details className="thinking-block">
      <summary>
        <svg
          fill="none"
          height="14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
        >
          <path d="M12 2a8 8 0 00-3.5 15.2V19a1 1 0 001 1h5a1 1 0 001-1v-1.8A8 8 0 0012 2z" />
        </svg>
        {message.isStreaming && !message.content
          ? "Thinking..."
          : "Thought process"}
      </summary>
      <div className="thinking-content">{message.thinking}</div>
    </details>
  );
};

const GeneratedImages = ({ images }: { images?: ImageData[] }) => {
  if (!images || images.length === 0) return null;

  return (
    <div className="generated-images">
      {images.map((img, idx) => (
        <div
          className={`generated-image${img.isPartial ? " loading" : ""}`}
          key={img.imageId ?? idx}
        >
          <img
            alt={img.revisedPrompt ?? "Generated image"}
            src={`data:image/${img.format};base64,${img.data}`}
          />
          {img.isPartial && <div className="image-loading-overlay" />}
          {img.revisedPrompt && !img.isPartial && (
            <p className="revised-prompt">{img.revisedPrompt}</p>
          )}
        </div>
      ))}
    </div>
  );
};

const AssistantBody = ({ message }: { message: Message }) => {
  if (
    message.isStreaming &&
    !message.content &&
    !(message.images && message.images.length > 0)
  ) {
    return (
      <div className="typing-indicator">
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (!message.content) return null;

  return (
    <div
      className="markdown"
      dangerouslySetInnerHTML={{
        __html: renderMarkdown(message.content),
      }}
    />
  );
};

type UsageBadgeProps = {
  copiedId: string | null;
  message: Message;
  messageIndex: number;
  onCopy: (id: string, content: string) => void;
  onRetry: (idx: number) => void;
  selectedModel: ModelDef;
};

const renderCostItem = (
  model: string,
  inputTokens: number,
  outputTokens: number,
) => {
  const cost = calculateCost(model, inputTokens, outputTokens);
  if (cost === null) return null;

  return (
    <span className="usage-item">
      <span className="usage-label">cost</span>
      {formatCost(cost)}
    </span>
  );
};

const UsageBadge = ({
  copiedId,
  message,
  messageIndex,
  onCopy,
  onRetry,
  selectedModel,
}: UsageBadgeProps) => (
  <div className="usage-badge">
    {message.model && (
      <span className="usage-item model-tag">{message.model}</span>
    )}
    {message.durationMs !== undefined && (
      <span className="usage-item">
        <span className="usage-label">time</span>
        {message.durationMs < MS_PER_SECOND
          ? `${message.durationMs}ms`
          : `${(message.durationMs / MS_PER_SECOND).toFixed(1)}s`}
      </span>
    )}
    {message.usage && (
      <>
        <span className="usage-item">
          <span className="usage-label">in</span>
          {message.usage.inputTokens.toLocaleString()} tokens
        </span>
        <span className="usage-item">
          <span className="usage-label">out</span>
          {message.usage.outputTokens.toLocaleString()} tokens
        </span>
        {renderCostItem(
          message.model ?? selectedModel.id,
          message.usage.inputTokens,
          message.usage.outputTokens,
        )}
      </>
    )}
    <MessageActions
      copiedId={copiedId}
      message={message}
      messageIndex={messageIndex}
      onCopy={onCopy}
      onRetry={onRetry}
    />
  </div>
);

type MessageActionsProps = {
  copiedId: string | null;
  message: Message;
  messageIndex: number;
  onCopy: (id: string, content: string) => void;
  onRetry: (idx: number) => void;
};

const MessageActions = ({
  copiedId,
  message,
  messageIndex,
  onCopy,
  onRetry,
}: MessageActionsProps) => (
  <div className="message-actions">
    <button
      className="action-btn"
      onClick={() => onCopy(message.id, message.content)}
      title="Copy response"
      type="button"
    >
      {copiedId === message.id ? (
        <svg
          fill="none"
          height="14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg
          fill="none"
          height="14"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
        >
          <rect height="13" rx="2" ry="2" width="13" x="9" y="9" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
    <button
      className="action-btn"
      onClick={() => onRetry(messageIndex)}
      title="Retry with same prompt"
      type="button"
    >
      <svg
        fill="none"
        height="14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="14"
      >
        <path d="M1 4v6h6" />
        <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
      </svg>
    </button>
  </div>
);
