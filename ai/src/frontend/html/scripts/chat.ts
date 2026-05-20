import {
  MODELS,
  PROVIDERS,
  filterModels,
  COST_LABELS,
  COST_COLORS,
  CAPABILITY_LABELS,
  type ModelDef,
  type ModelCapability,
  type ProviderKey,
} from "../../models";
import {
  stripPrefix,
  calculateCost,
  formatCost,
  COPY_FEEDBACK_MS,
  MS_PER_SECOND,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
  DAYS_PER_WEEK,
  FILTER_CLOSE_MS,
  MODAL_CLOSE_MS,
  SCROLL_NEAR_BOTTOM_PX,
  SEARCH_FOCUS_DELAY_MS,
} from "../../constants";
import { renderMarkdown } from "../../utils/markdown";

// ── Constants ────────────────────────────────────────

const WS_OPEN = 1;
const RECONNECT_DELAY = 1000;
const POLL_INTERVAL = 3000;
const PROVIDER_LOGO_PATH = "/assets/svg/providers";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

type MediaType =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp"
  | "application/pdf";

const isMediaType = (type: string): type is MediaType =>
  IMAGE_TYPES.includes(type) || type === "application/pdf";

// ── Capability icons (from CapabilityIcon.tsx) ───────

const CAP_ICONS: Record<
  ModelCapability,
  { color: string; label: string; path: string }
> = {
  fast: {
    color: "#eab308",
    label: "Fast",
    path: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  "image-gen": {
    color: "#a855f7",
    label: "Image Gen",
    path: "M21 15V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10m18 0l-6-6m6 6H3m0 0l6-6m-6 6v4h18v-4",
  },
  pdf: {
    color: "#ef4444",
    label: "PDF",
    path: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1v5h5M9 13h6m-6 4h6m-6-8h2",
  },
  reasoning: {
    color: "#ec4899",
    label: "Reasoning",
    path: "M12 2a8 8 0 00-3.5 15.2V19a1 1 0 001 1h5a1 1 0 001-1v-1.8A8 8 0 0012 2zm0 12a1 1 0 110-2 1 1 0 010 2zm-1 5h2m-2 2h2",
  },
  "tool-calling": {
    color: "#6366f1",
    label: "Tools",
    path: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.77 3.77z",
  },
  vision: {
    color: "#06b6d4",
    label: "Vision",
    path: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11 3a3 3 0 100-6 3 3 0 000 6z",
  },
};

const CAPABILITY_DESCRIPTIONS: Record<ModelCapability, string> = {
  fast: "Optimized for low latency responses, ideal for real-time applications",
  "image-gen": "Can generate and edit images from text descriptions",
  pdf: "Can read and understand PDF documents uploaded to the conversation",
  reasoning: "Advanced chain-of-thought reasoning for complex logic and math",
  "tool-calling": "Can call external tools and functions to take actions",
  vision: "Can analyze and understand images in the conversation",
};

const ALL_CAPABILITIES: ModelCapability[] = [
  "fast",
  "vision",
  "reasoning",
  "tool-calling",
  "image-gen",
  "pdf",
];

// ── Suggestion categories ────────────────────────────

type SuggestionCategory = {
  icon: string;
  label: string;
  prompts: string[];
};

const SUGGESTIONS: SuggestionCategory[] = [
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

// ── State ────────────────────────────────────────────

const DEFAULT_MODEL =
  MODELS.find((mod) => mod.id === "claude-sonnet-4-6") ?? MODELS[0];

let selectedModel: ModelDef = DEFAULT_MODEL;
let sidebarOpen = false;
let conversationId: string = crypto.randomUUID();
let isStreaming = false;
let copiedId: string | null = null;
let activeCategory: string | null = null;

// Messages stored locally for copy/retry
type LocalMessage = {
  content: string;
  id: string;
  role: "user" | "assistant";
  thinking?: string;
  toolCalls?: { name: string; result?: string }[];
  images?: {
    data: string;
    format: string;
    imageId?: string;
    isPartial?: boolean;
    revisedPrompt?: string;
  }[];
  attachments?: { data: string; media_type: string; name?: string }[];
  usage?: { inputTokens: number; outputTokens: number };
  durationMs?: number;
  model?: string;
  isStreaming?: boolean;
};

let messages: LocalMessage[] = [];
let currentMessage: LocalMessage | null = null;

// Pending file attachments
type PendingFile = {
  data: string;
  media_type: MediaType;
  name: string;
  preview: string;
};

let pendingFiles: PendingFile[] = [];

// Model picker state
let pickerProviderFilter: ProviderKey | undefined = undefined;
let pickerShowLegacy = false;
let pickerCapFilters: ModelCapability[] = [];
let pickerFilterOpen = false;

// ── DOM Helpers ─────────────────────────────────────

const requireElement = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Missing element: #${elementId}`);

  return element;
};

const requireInput = (elementId: string) => {
  const element = requireElement(elementId);
  if (!(element instanceof HTMLInputElement))
    throw new Error(`#${elementId} is not an input`);

  return element;
};

// ── DOM Elements ─────────────────────────────────────

const chatContainer = requireElement("chat-container");
const sidebar = requireElement("sidebar");
const sidebarList = requireElement("sidebar-list");
const sidebarToggle = requireElement("sidebar-toggle");
const newChatBtn = requireElement("new-chat-btn");
const pickerOverlay = requireElement("picker-overlay");
const pickerModal = requireElement("picker-modal");
const pickerProviders = requireElement("picker-providers");
const pickerList = requireElement("picker-list");
const pickerSearchInput = requireInput("picker-search-input");
const pickerFilterBtn = requireElement("picker-filter-btn");
const filterPopover = requireElement("filter-popover");
const filterCount = requireElement("filter-count");
const fileInput = requireInput("file-input");

// ── WebSocket ────────────────────────────────────────

const { protocol, host } = window.location;
const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${wsProtocol}//${host}/chat`;
let socket = new WebSocket(wsUrl);

const handleWsMessage = (event: MessageEvent) => {
  const msg = JSON.parse(String(event.data));

  if (msg.type === "chunk") {
    handleChunk(msg);
  } else if (msg.type === "tool_status") {
    handleToolStatus(msg);
  } else if (msg.type === "thinking") {
    handleThinking(msg);
  } else if (msg.type === "image") {
    handleImage(msg);
  } else if (msg.type === "complete") {
    handleComplete(msg);
  } else if (msg.type === "error") {
    handleError(msg);
  }
};

const connectWebSocket = () => {
  socket = new WebSocket(wsUrl);
  socket.onmessage = handleWsMessage;
  socket.onclose = () => {
    setTimeout(connectWebSocket, RECONNECT_DELAY);
  };
};

socket.onmessage = handleWsMessage;
socket.onclose = () => {
  setTimeout(connectWebSocket, RECONNECT_DELAY);
};

// ── Helpers ──────────────────────────────────────────

const DEFAULT_CAP_ICON_SIZE = 14;
const CAP_BADGE_PADDING = 6;

const capBadgeHtml = (cap: ModelCapability, size = DEFAULT_CAP_ICON_SIZE) => {
  const icon = CAP_ICONS[cap];
  const bgSize = size + CAP_BADGE_PADDING;

  return `<span class="cap-badge" title="${icon.label}" style="align-items:center;background:${icon.color}18;border-radius:4px;display:inline-flex;height:${bgSize}px;justify-content:center;width:${bgSize}px;"><svg fill="none" height="${size}" stroke="${icon.color}" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="${size}"><path d="${icon.path}"/></svg></span>`;
};

const formatTime = (timestamp: number) => {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / MS_PER_MINUTE);
  const diffHours = Math.floor(diffMs / MS_PER_HOUR);
  const diffDays = Math.floor(diffMs / MS_PER_DAY);

  if (diffMins < 1) return "just now";
  if (diffMins < MINUTES_PER_HOUR) return `${diffMins}m ago`;
  if (diffHours < HOURS_PER_DAY) return `${diffHours}h ago`;
  if (diffDays < DAYS_PER_WEEK) return `${diffDays}d ago`;

  return new Date(timestamp).toLocaleDateString();
};

const supportsVision = () => selectedModel.capabilities.includes("vision");
const supportsPdf = () => selectedModel.capabilities.includes("pdf");
const supportsAttachments = () => supportsVision() || supportsPdf();

// ── Render: Empty state ──────────────────────────────

const renderEmptyState = () => {
  chatContainer.className = "chat-container";
  chatContainer.innerHTML = "";

  const emptyDiv = document.createElement("div");
  emptyDiv.className = "empty-state";

  const welcome = document.createElement("p");
  welcome.className = "welcome-text";
  welcome.textContent = "What can I help you with?";
  emptyDiv.appendChild(welcome);

  emptyDiv.appendChild(buildInputCard(false));

  // Suggestions
  const suggestionsDiv = document.createElement("div");
  suggestionsDiv.className = "suggestions";
  suggestionsDiv.appendChild(buildSuggestionPills());

  const promptsContainer = document.createElement("div");
  promptsContainer.id = "suggestion-prompts";
  suggestionsDiv.appendChild(promptsContainer);

  emptyDiv.appendChild(suggestionsDiv);
  chatContainer.appendChild(emptyDiv);

  renderSuggestionPrompts();
};

const handlePillClick = (label: string) => {
  activeCategory = activeCategory === label ? null : label;
  renderEmptyState();
};

const buildSuggestionPills = () => {
  const pillsDiv = document.createElement("div");
  pillsDiv.className = "suggestion-pills";

  for (const cat of SUGGESTIONS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `suggestion-pill ${activeCategory === cat.label ? "active" : ""}`;
    btn.innerHTML = `<svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="14"><path d="${cat.icon}"/></svg>${cat.label}`;
    btn.addEventListener("click", () => handlePillClick(cat.label));
    pillsDiv.appendChild(btn);
  }

  return pillsDiv;
};

const renderSuggestionPrompts = () => {
  const container = document.getElementById("suggestion-prompts");
  if (!container) return;
  container.innerHTML = "";

  if (!activeCategory) return;

  const cat = SUGGESTIONS.find((sug) => sug.label === activeCategory);
  if (!cat) return;

  const div = document.createElement("div");
  div.className = "suggestion-prompts";

  for (const prompt of cat.prompts) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "suggestion";
    btn.textContent = prompt;
    btn.addEventListener("click", () => sendMessage(prompt));
    div.appendChild(btn);
  }

  container.appendChild(div);
};

// ── Render: Input card ───────────────────────────────

const buildInputCard = (hasMessages: boolean) => {
  const form = document.createElement("form");
  form.className = `chat-input-card ${hasMessages ? "" : "centered"}`;

  // Drag-drop
  form.addEventListener("dragover", (evt) => {
    evt.preventDefault();
    form.classList.add("drag-over");
  });
  form.addEventListener("dragleave", () => {
    form.classList.remove("drag-over");
  });
  form.addEventListener("drop", (evt) => {
    evt.preventDefault();
    form.classList.remove("drag-over");
    if (evt.dataTransfer?.files.length) {
      processFiles(evt.dataTransfer.files);
      renderFilePreviews(form);
    }
  });

  // File previews container
  const previewsDiv = document.createElement("div");
  previewsDiv.className = "file-previews";
  previewsDiv.id = "file-previews";
  if (pendingFiles.length === 0) previewsDiv.style.display = "none";
  form.appendChild(previewsDiv);
  renderFilePreviewsInto(previewsDiv);

  // Textarea
  const textarea = document.createElement("textarea");
  textarea.autocomplete = "off";
  textarea.name = "input";
  textarea.disabled = isStreaming;
  textarea.placeholder = hasMessages ? "Reply..." : "Ask anything...";
  textarea.rows = hasMessages ? 1 : 2;

  textarea.addEventListener("keydown", (evt) => {
    if (evt.key !== "Enter" || evt.shiftKey) return;
    evt.preventDefault();
    form.requestSubmit();
  });

  textarea.addEventListener("paste", (evt) => {
    const items = evt.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      const isAttachable =
        item.type.startsWith("image/") || item.type === "application/pdf";
      if (!isAttachable) continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    if (files.length > 0) {
      processFiles(files);
      renderFilePreviews(form);
    }
  });

  form.appendChild(textarea);

  // Input toolbar
  form.appendChild(buildInputToolbar());

  // Submit handler
  form.addEventListener("submit", (evt) => {
    evt.preventDefault();
    const value = textarea.value.trim();
    if (!value) return;
    sendMessage(value);
    textarea.value = "";
  });

  return form;
};

const buildInputToolbar = () => {
  const toolbar = document.createElement("div");
  toolbar.className = "input-toolbar";

  // Attach button
  if (supportsAttachments()) {
    const attachBtn = document.createElement("button");
    attachBtn.type = "button";
    attachBtn.className = "attach-btn";
    const kinds = [supportsVision() && "image", supportsPdf() && "PDF"].filter(
      Boolean,
    );
    attachBtn.title = `Attach ${kinds.join(" or ")}`;
    attachBtn.innerHTML = `<svg fill="none" height="16" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="16"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>`;
    attachBtn.addEventListener("click", () => {
      updateFileInputAccept();
      fileInput.click();
    });
    toolbar.appendChild(attachBtn);
  }

  // Picker anchor
  const pickerAnchor = document.createElement("div");
  pickerAnchor.className = "picker-anchor";

  const modelBtn = document.createElement("button");
  modelBtn.type = "button";
  modelBtn.className = "model-select-btn";
  modelBtn.innerHTML = `<img alt="" class="model-select-logo" height="16" src="${PROVIDER_LOGO_PATH}/${selectedModel.provider}.svg" width="16"><span class="model-select-name">${selectedModel.name}</span><span class="model-select-cost" style="color:${COST_COLORS[selectedModel.cost]}">${COST_LABELS[selectedModel.cost]}</span><svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="12"><path d="M6 9l6 6 6-6"/></svg>`;
  modelBtn.addEventListener("click", () => openPicker());
  pickerAnchor.appendChild(modelBtn);
  toolbar.appendChild(pickerAnchor);

  // Send / Cancel button
  if (isStreaming) {
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "send-btn cancel";
    cancelBtn.innerHTML = `<svg fill="none" height="16" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="16"><rect height="14" rx="2" width="14" x="5" y="5"/></svg>`;
    cancelBtn.addEventListener("click", () => {
      socket.send(JSON.stringify({ conversationId, type: "cancel" }));
    });
    toolbar.appendChild(cancelBtn);
  } else {
    const sendBtn = document.createElement("button");
    sendBtn.type = "submit";
    sendBtn.className = "send-btn";
    sendBtn.innerHTML = `<svg fill="none" height="16" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="16"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
    toolbar.appendChild(sendBtn);
  }

  return toolbar;
};

// ── File handling ────────────────────────────────────

const updateFileInputAccept = () => {
  const accept = [
    ...(supportsVision()
      ? ["image/png", "image/jpeg", "image/gif", "image/webp"]
      : []),
    ...(supportsPdf() ? ["application/pdf"] : []),
  ].join(",");
  fileInput.accept = accept;
};

const addPendingFile = (
  base64: string,
  mediaType: MediaType,
  fileName: string,
  isImage: boolean,
  fullDataUrl: string,
) => {
  pendingFiles.push({
    data: base64,
    media_type: mediaType,
    name: fileName,
    preview: isImage ? fullDataUrl : "",
  });
  const form = chatContainer.querySelector(".chat-input-card");

  if (form instanceof HTMLElement) renderFilePreviews(form);
};

const processFiles = (files: FileList | File[]) => {
  for (const file of Array.from(files)) {
    const { type: fileType } = file;
    const isImage = IMAGE_TYPES.includes(fileType);
    const isPdf = fileType === "application/pdf";

    if (isImage && !supportsVision()) continue;
    if (isPdf && !supportsPdf()) continue;
    if (!isMediaType(fileType)) continue;

    const mediaType = fileType;
    const { name: fileName } = file;
    const reader = new FileReader();
    reader.onload = () => {
      const { result } = reader;
      if (typeof result !== "string") return;
      const [, base64] = result.split(",");
      addPendingFile(base64, mediaType, fileName, isImage, result);
    };
    reader.readAsDataURL(file);
  }
};

fileInput.addEventListener("change", () => {
  if (fileInput.files) {
    processFiles(fileInput.files);
    const form = chatContainer.querySelector(".chat-input-card");

    if (form instanceof HTMLElement) renderFilePreviews(form);
  }
  fileInput.value = "";
});

const getOrCreateFilePreviewsContainer = (form: HTMLElement) => {
  const existing = form.querySelector("#file-previews");

  if (existing instanceof HTMLElement) return existing;

  const div = document.createElement("div");
  div.className = "file-previews";
  div.id = "file-previews";
  form.insertBefore(div, form.firstChild);

  return div;
};

const renderFilePreviews = (form: HTMLElement) => {
  const container = getOrCreateFilePreviewsContainer(form);
  renderFilePreviewsInto(container);
  container.style.display = pendingFiles.length > 0 ? "" : "none";
};

const removePendingFile = (idx: number) => {
  pendingFiles.splice(idx, 1);
  const form = chatContainer.querySelector(".chat-input-card");

  if (form instanceof HTMLElement) renderFilePreviews(form);
};

const renderFilePreviewsInto = (container: HTMLElement) => {
  container.innerHTML = "";
  pendingFiles.forEach((file, idx) => {
    const div = document.createElement("div");
    div.className = "file-preview";

    if (file.media_type === "application/pdf") {
      div.innerHTML = `<div class="file-preview-pdf" title="${file.name}"><svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg><span class="file-preview-pdf-label">PDF</span></div>`;
    } else {
      const img = document.createElement("img");
      img.alt = file.name;
      img.src = file.preview;
      div.appendChild(img);
    }

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "file-preview-remove";
    removeBtn.innerHTML = `<svg fill="none" height="10" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="10"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>`;
    removeBtn.addEventListener("click", () => removePendingFile(idx));
    div.appendChild(removeBtn);
    container.appendChild(div);
  });
};

// ── Render: Messages view ────────────────────────────

const renderMessagesView = () => {
  chatContainer.className = "chat-container has-messages";
  chatContainer.innerHTML = "";

  const messagesDiv = document.createElement("div");
  messagesDiv.className = "messages";
  messagesDiv.id = "messages";

  for (let idx = 0; idx < messages.length; idx++) {
    messagesDiv.appendChild(renderMessageEl(messages[idx], idx));
  }

  // Typing indicator if waiting
  if (
    isStreaming &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "user"
  ) {
    const typingDiv = document.createElement("div");
    typingDiv.className = "message";
    typingDiv.dataset.role = "assistant";
    typingDiv.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
    messagesDiv.appendChild(typingDiv);
  }

  const scrollAnchor = document.createElement("div");
  scrollAnchor.id = "scroll-anchor";
  messagesDiv.appendChild(scrollAnchor);

  chatContainer.appendChild(messagesDiv);

  // Error banner
  // (errors handled inline)

  // Input card at bottom
  chatContainer.appendChild(buildInputCard(true));

  scrollToBottom();
};

const renderMessageEl = (msg: LocalMessage, idx: number) => {
  const div = document.createElement("div");
  div.className = "message";
  div.dataset.role = msg.role;
  div.id = `msg-${msg.id}`;

  if (msg.role === "user") {
    renderUserContent(div, msg);
  } else {
    renderAssistantContent(div, msg, idx);
  }

  return div;
};

const renderAttachmentEl = (att: {
  data: string;
  media_type: string;
  name?: string;
}) => {
  if (att.media_type === "application/pdf") {
    const pdfDiv = document.createElement("div");
    pdfDiv.className = "message-pdf";
    pdfDiv.innerHTML = `<svg fill="none" height="16" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="16"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>${att.name ?? "document.pdf"}`;

    return pdfDiv;
  }

  const img = document.createElement("img");
  img.alt = att.name ?? "attachment";
  img.className = "message-image";
  img.src = `data:${att.media_type};base64,${att.data}`;

  return img;
};

const renderUserAttachments = (div: HTMLElement, msg: LocalMessage) => {
  if (!msg.attachments || msg.attachments.length === 0) return;

  const imagesDiv = document.createElement("div");
  imagesDiv.className = "message-images";
  for (const att of msg.attachments) {
    imagesDiv.appendChild(renderAttachmentEl(att));
  }
  div.appendChild(imagesDiv);
};

const renderUserContent = (div: HTMLElement, msg: LocalMessage) => {
  renderUserAttachments(div, msg);
  const span = document.createElement("span");
  span.textContent = stripPrefix(msg.content);
  div.appendChild(span);
};

const renderToolCallEl = (tool: { name: string; result?: string }) => {
  const details = document.createElement("details");
  details.className = "tool-call";
  const summary = document.createElement("summary");
  summary.className = tool.result ? "done" : "running";
  summary.innerHTML = `<span class="tool-icon">${tool.result ? "\u2713" : "\u27F3"}</span>${tool.name}<span class="tool-label">${tool.result ? "completed" : "running..."}</span>`;
  details.appendChild(summary);

  if (tool.result) {
    const pre = document.createElement("pre");
    pre.className = "tool-result";
    pre.textContent = tool.result;
    details.appendChild(pre);
  }

  return details;
};

const renderGeneratedImageEl = (img: {
  data: string;
  format: string;
  isPartial?: boolean;
  revisedPrompt?: string;
}) => {
  const wrapper = document.createElement("div");
  wrapper.className = `generated-image${img.isPartial ? " loading" : ""}`;
  const imgEl = document.createElement("img");
  imgEl.alt = img.revisedPrompt ?? "Generated image";
  imgEl.src = `data:image/${img.format};base64,${img.data}`;
  wrapper.appendChild(imgEl);

  if (img.isPartial) {
    const overlay = document.createElement("div");
    overlay.className = "image-loading-overlay";
    wrapper.appendChild(overlay);
  }

  if (img.revisedPrompt && !img.isPartial) {
    const prompt = document.createElement("p");
    prompt.className = "revised-prompt";
    prompt.textContent = img.revisedPrompt;
    wrapper.appendChild(prompt);
  }

  return wrapper;
};

const renderGeneratedImages = (div: HTMLElement, msg: LocalMessage) => {
  if (!msg.images || msg.images.length === 0) return;

  const imagesDiv = document.createElement("div");
  imagesDiv.className = "generated-images";
  for (const img of msg.images) {
    imagesDiv.appendChild(renderGeneratedImageEl(img));
  }
  div.appendChild(imagesDiv);
};

const renderToolCalls = (div: HTMLElement, msg: LocalMessage) => {
  if (!msg.toolCalls || msg.toolCalls.length === 0) return;

  const toolsDiv = document.createElement("div");
  toolsDiv.className = "tool-calls";
  for (const tool of msg.toolCalls) {
    toolsDiv.appendChild(renderToolCallEl(tool));
  }
  div.appendChild(toolsDiv);
};

const renderAssistantContent = (
  div: HTMLElement,
  msg: LocalMessage,
  idx: number,
) => {
  // Tool calls
  renderToolCalls(div, msg);

  // Thinking block
  if (msg.thinking) {
    const details = document.createElement("details");
    details.className = "thinking-block";
    const summary = document.createElement("summary");
    summary.innerHTML = `<svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="14"><path d="M12 2a8 8 0 00-3.5 15.2V19a1 1 0 001 1h5a1 1 0 001-1v-1.8A8 8 0 0012 2z"/></svg>${msg.isStreaming && !msg.content ? "Thinking..." : "Thought process"}`;
    details.appendChild(summary);
    const thinkingContent = document.createElement("div");
    thinkingContent.className = "thinking-content";
    thinkingContent.textContent = msg.thinking;
    details.appendChild(thinkingContent);
    div.appendChild(details);
  }

  // Generated images
  renderGeneratedImages(div, msg);

  // Body (markdown or typing indicator)
  const hasImages = msg.images && msg.images.length > 0;
  const showTyping = msg.isStreaming && !msg.content && !hasImages;

  if (showTyping) {
    const typingDiv = document.createElement("div");
    typingDiv.className = "typing-indicator";
    typingDiv.innerHTML = "<span></span><span></span><span></span>";
    div.appendChild(typingDiv);
  } else if (msg.content) {
    const mdDiv = document.createElement("div");
    mdDiv.className = "markdown";
    mdDiv.innerHTML = renderMarkdown(msg.content);
    div.appendChild(mdDiv);
  }

  // Usage badge (only when done streaming and has content)
  if (!msg.isStreaming && msg.content) {
    div.appendChild(buildUsageBadge(msg, idx));
  }
};

const appendUsageDetails = (badge: HTMLElement, msg: LocalMessage) => {
  if (msg.model) {
    badge.innerHTML += `<span class="usage-item model-tag">${msg.model}</span>`;
  }

  if (msg.durationMs !== undefined) {
    const timeStr =
      msg.durationMs < MS_PER_SECOND
        ? `${msg.durationMs}ms`
        : `${(msg.durationMs / MS_PER_SECOND).toFixed(1)}s`;
    badge.innerHTML += `<span class="usage-item"><span class="usage-label">time</span>${timeStr}</span>`;
  }

  if (!msg.usage) return;

  badge.innerHTML += `<span class="usage-item"><span class="usage-label">in</span>${msg.usage.inputTokens.toLocaleString()} tokens</span>`;
  badge.innerHTML += `<span class="usage-item"><span class="usage-label">out</span>${msg.usage.outputTokens.toLocaleString()} tokens</span>`;

  const cost = calculateCost(
    msg.model ?? selectedModel.id,
    msg.usage.inputTokens,
    msg.usage.outputTokens,
  );

  if (cost !== null) {
    badge.innerHTML += `<span class="usage-item"><span class="usage-label">cost</span>${formatCost(cost)}</span>`;
  }
};

const buildUsageBadge = (msg: LocalMessage, idx: number) => {
  const badge = document.createElement("div");
  badge.className = "usage-badge";

  appendUsageDetails(badge, msg);

  // Actions
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "message-actions";

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "action-btn";
  copyBtn.title = "Copy response";
  const updateCopyIcon = () => {
    if (copiedId === msg.id) {
      copyBtn.innerHTML = `<svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="14"><path d="M20 6L9 17l-5-5"/></svg>`;
    } else {
      copyBtn.innerHTML = `<svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="14"><rect height="13" rx="2" ry="2" width="13" x="9" y="9"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
    }
  };
  updateCopyIcon();
  copyBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(msg.content);
    copiedId = msg.id;
    updateCopyIcon();
    setTimeout(() => {
      copiedId = null;
      updateCopyIcon();
    }, COPY_FEEDBACK_MS);
  });
  actionsDiv.appendChild(copyBtn);

  // Retry button
  const retryBtn = document.createElement("button");
  retryBtn.type = "button";
  retryBtn.className = "action-btn";
  retryBtn.title = "Retry with same prompt";
  retryBtn.innerHTML = `<svg fill="none" height="14" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="14"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>`;

  retryBtn.addEventListener("click", () => {
    const prevUserMsg = messages
      .slice(0, idx)
      .reverse()
      .find((m) => m.role === "user");
    if (prevUserMsg) {
      sendMessage(stripPrefix(prevUserMsg.content));
    }
  });
  actionsDiv.appendChild(retryBtn);

  badge.appendChild(actionsDiv);

  return badge;
};

// ── Scrolling ────────────────────────────────────────

const scrollToBottom = () => {
  const anchor = document.getElementById("scroll-anchor");
  if (!anchor) return;
  const container = anchor.closest(".app-main");
  if (container) {
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom =
      scrollHeight - scrollTop - clientHeight < SCROLL_NEAR_BOTTOM_PX;
    if (!isNearBottom) return;
  }
  anchor.scrollIntoView({ behavior: "smooth" });
};

// ── Send message ─────────────────────────────────────

const sendMessage = (text: string) => {
  if (socket.readyState !== WS_OPEN) return;

  const attachments =
    pendingFiles.length > 0
      ? pendingFiles.map(({ data, media_type, name }) => ({
          data,
          media_type,
          name,
        }))
      : undefined;

  // Save attachments on user message for display
  const userMsg: LocalMessage = {
    attachments: attachments
      ? pendingFiles.map(({ data, media_type, name }) => ({
          data,
          media_type,
          name,
        }))
      : undefined,
    content: `${selectedModel.provider}:${selectedModel.id}:${text}`,
    id: crypto.randomUUID(),
    role: "user",
  };

  messages.push(userMsg);
  pendingFiles = [];

  const payload: Record<string, unknown> = {
    content: `${selectedModel.provider}:${selectedModel.id}:${text}`,
    conversationId,
    type: "message",
  };
  if (attachments) {
    payload.attachments = attachments;
  }

  socket.send(JSON.stringify(payload));
  isStreaming = true;
  renderMessagesView();
};

// ── WebSocket message handlers ───────────────────────

const ensureCurrentMessage = () => {
  if (currentMessage) return currentMessage;

  currentMessage = {
    content: "",
    id: crypto.randomUUID(),
    isStreaming: true,
    role: "assistant",
  };
  messages.push(currentMessage);

  return currentMessage;
};

type UsageData = { inputTokens: number; outputTokens: number };

const isUsageData = (val: unknown): val is UsageData =>
  typeof val === "object" &&
  val !== null &&
  "inputTokens" in val &&
  "outputTokens" in val;

const handleChunk = (msg: Record<string, unknown>) => {
  const current = ensureCurrentMessage();
  current.content += String(msg.content ?? "");
  current.isStreaming = true;

  // Incremental update: find or create DOM element
  updateCurrentAssistantEl();
};

const handleToolStatus = (msg: Record<string, unknown>) => {
  const current = ensureCurrentMessage();
  if (!current.toolCalls) current.toolCalls = [];

  const toolName = String(msg.name ?? "");
  const existing = current.toolCalls.find((tool) => tool.name === toolName);
  const resultValue =
    msg.status === "complete" ? String(msg.result ?? "") : undefined;

  if (existing) {
    existing.result = resultValue;
  } else {
    current.toolCalls.push({
      name: toolName,
      result: resultValue,
    });
  }

  updateCurrentAssistantEl();
};

const handleThinking = (msg: Record<string, unknown>) => {
  const current = ensureCurrentMessage();
  current.thinking = (current.thinking ?? "") + String(msg.content ?? "");
  current.isStreaming = true;

  updateCurrentAssistantEl();
};

const handleImage = (msg: Record<string, unknown>) => {
  const current = ensureCurrentMessage();
  if (!current.images) current.images = [];

  const imageId = String(msg.imageId ?? "");
  const existing = current.images.find((img) => img.imageId === imageId);
  const revisedPrompt =
    typeof msg.revisedPrompt === "string" ? msg.revisedPrompt : undefined;

  if (existing) {
    existing.data = String(msg.data ?? existing.data);
    existing.format = String(msg.format ?? existing.format);
    existing.isPartial = Boolean(msg.isPartial);
    existing.revisedPrompt = revisedPrompt ?? existing.revisedPrompt;
  } else {
    current.images.push({
      data: String(msg.data ?? ""),
      format: String(msg.format ?? "png"),
      imageId,
      isPartial: Boolean(msg.isPartial),
      revisedPrompt,
    });
  }

  updateCurrentAssistantEl();
};

const applyCompleteData = (msg: Record<string, unknown>) => {
  if (!currentMessage) return;

  currentMessage.isStreaming = false;

  if (isUsageData(msg.usage)) {
    currentMessage.usage = msg.usage;
  }

  if (msg.durationMs !== undefined) {
    currentMessage.durationMs = Number(msg.durationMs);
  }

  if (msg.model) {
    currentMessage.model = String(msg.model);
  }
};

const handleComplete = (msg: Record<string, unknown>) => {
  applyCompleteData(msg);
  currentMessage = null;
  isStreaming = false;
  renderMessagesView();
};

const handleError = (msg: Record<string, unknown>) => {
  currentMessage = null;
  isStreaming = false;

  // Add error as a system message
  const errorMsg: LocalMessage = {
    content: `Error: ${String(msg.message ?? "Unknown error")}`,
    id: crypto.randomUUID(),
    role: "assistant",
  };
  messages.push(errorMsg);
  renderMessagesView();
};

// Incrementally update the current assistant message DOM element
const updateCurrentAssistantEl = () => {
  if (!currentMessage) return;
  const msgIdx = messages.length - 1;

  const messagesDiv = document.getElementById("messages");
  if (!messagesDiv) {
    // Need full re-render (first assistant message)
    renderMessagesView();

    return;
  }

  const existing = document.getElementById(`msg-${currentMessage.id}`);

  if (existing) {
    // Re-render in place
    const newEl = renderMessageEl(currentMessage, msgIdx);
    existing.replaceWith(newEl);
    scrollToBottom();

    return;
  }

  // Remove typing indicator that was a standalone div
  const typingDivs = messagesDiv.querySelectorAll(
    '.message[data-role="assistant"]:not([id])',
  );
  for (const typingDiv of typingDivs) typingDiv.remove();

  const newEl = renderMessageEl(currentMessage, msgIdx);
  const anchor = document.getElementById("scroll-anchor");

  if (anchor) {
    messagesDiv.insertBefore(newEl, anchor);
  } else {
    messagesDiv.appendChild(newEl);
  }

  scrollToBottom();
};

// ── Sidebar ──────────────────────────────────────────

type ConversationSummary = {
  createdAt: number;
  id: string;
  lastMessageAt?: number;
  messageCount: number;
  title: string;
};

sidebarToggle.addEventListener("click", () => {
  sidebarOpen = !sidebarOpen;
  sidebar.classList.toggle("open", sidebarOpen);
  sidebarToggle.title = sidebarOpen ? "Close sidebar" : "Open sidebar";
});

newChatBtn.addEventListener("click", () => {
  conversationId = crypto.randomUUID();
  messages = [];
  currentMessage = null;

  isStreaming = false;
  activeCategory = null;
  renderEmptyState();
});

const fetchConversations = async () => {
  try {
    const res = await fetch("/chat/conversations");
    const data: ConversationSummary[] = await res.json();
    renderSidebarList(data);
  } catch {
    // silently fail
  }
};

const resetConversationState = () => {
  messages = [];
  currentMessage = null;
  isStreaming = false;
  activeCategory = null;
  renderEmptyState();
};

const handleDeleteConversation = async (convId: string, evt: Event) => {
  evt.stopPropagation();
  await fetch(`/chat/conversations/${convId}`, { method: "DELETE" });

  if (convId === conversationId) {
    conversationId = crypto.randomUUID();
    resetConversationState();
  }
  fetchConversations();
};

const handleSelectConversation = (convId: string) => {
  conversationId = convId;
  sidebarOpen = false;
  sidebar.classList.remove("open");
  // We can't reload messages from server easily without an API,
  // so just start fresh with that conversation ID
  resetConversationState();
};

const renderSidebarList = (conversations: ConversationSummary[]) => {
  sidebarList.innerHTML = "";

  if (conversations.length === 0) {
    const empty = document.createElement("div");
    empty.className = "sidebar-empty";
    empty.textContent = "No conversations yet";
    sidebarList.appendChild(empty);

    return;
  }

  for (const conv of conversations) {
    const item = document.createElement("div");
    item.className = `sidebar-item ${conv.id === conversationId ? "active" : ""}`;
    item.role = "button";
    item.tabIndex = 0;

    const title = document.createElement("div");
    title.className = "sidebar-item-title";
    title.textContent = conv.title;
    item.appendChild(title);

    const meta = document.createElement("div");
    meta.className = "sidebar-item-meta";
    meta.textContent = `${conv.messageCount} messages \u00B7 ${formatTime(conv.lastMessageAt ?? conv.createdAt)}`;
    item.appendChild(meta);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "sidebar-item-delete";
    deleteBtn.title = "Delete conversation";
    deleteBtn.innerHTML = `<svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="12"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>`;
    deleteBtn.addEventListener("click", (evt) =>
      handleDeleteConversation(conv.id, evt),
    );
    item.appendChild(deleteBtn);

    item.addEventListener("click", () => handleSelectConversation(conv.id));

    sidebarList.appendChild(item);
  }
};

// Poll conversations
fetchConversations();
setInterval(fetchConversations, POLL_INTERVAL);

// ── Model Picker ─────────────────────────────────────

const openPicker = () => {
  pickerOverlay.style.display = "";
  pickerModal.style.display = "";
  pickerModal.classList.remove("closing");
  pickerProviderFilter = undefined;
  pickerShowLegacy = false;
  pickerCapFilters = [];
  pickerFilterOpen = false;
  pickerSearchInput.value = "";
  renderPickerProviders();
  renderPickerList();
  renderFilterPopover();
  setTimeout(() => pickerSearchInput.focus(), SEARCH_FOCUS_DELAY_MS);
};

const closePicker = () => {
  pickerModal.classList.add("closing");
  pickerFilterOpen = false;
  filterPopover.style.display = "none";
  setTimeout(() => {
    pickerOverlay.style.display = "none";
    pickerModal.style.display = "none";
    pickerModal.classList.remove("closing");
  }, MODAL_CLOSE_MS);
};

pickerOverlay.addEventListener("click", closePicker);

pickerModal.addEventListener("click", () => {
  if (pickerFilterOpen) {
    pickerFilterOpen = false;
    filterPopover.classList.add("closing");
    setTimeout(() => {
      filterPopover.classList.remove("closing");
      filterPopover.style.display = "none";
    }, FILTER_CLOSE_MS);
  }
});

pickerSearchInput.addEventListener("input", () => {
  renderPickerList();
});

pickerFilterBtn.addEventListener("click", (evt) => {
  evt.stopPropagation();
  if (pickerFilterOpen) {
    pickerFilterOpen = false;
    filterPopover.classList.add("closing");
    setTimeout(() => {
      filterPopover.classList.remove("closing");
      filterPopover.style.display = "none";
    }, FILTER_CLOSE_MS);
  } else {
    pickerFilterOpen = true;
    filterPopover.style.display = "";
    filterPopover.classList.remove("closing");
    renderFilterPopover();
  }
});

// Escape to close picker
window.addEventListener("keydown", (evt) => {
  if (evt.key === "Escape" && pickerModal.style.display !== "none") {
    closePicker();
  }
});

const toggleProviderFilter = (provId: ProviderKey) => {
  pickerProviderFilter = pickerProviderFilter === provId ? undefined : provId;
  renderPickerProviders();
  renderPickerList();
};

const renderPickerProviders = () => {
  pickerProviders.innerHTML = "";

  // All button
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = `picker-prov-btn ${!pickerProviderFilter ? "active" : ""}`;
  allBtn.title = "All providers";
  allBtn.innerHTML = `<svg fill="none" height="16" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="16"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  allBtn.addEventListener("click", () => {
    pickerProviderFilter = undefined;
    renderPickerProviders();
    renderPickerList();
  });
  pickerProviders.appendChild(allBtn);

  for (const prov of PROVIDERS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `picker-prov-btn ${pickerProviderFilter === prov.id ? "active" : ""}`;
    btn.title = prov.name;
    btn.innerHTML = `<img alt="${prov.name}" class="picker-prov-logo" height="18" src="${PROVIDER_LOGO_PATH}/${prov.id}.svg" width="18">`;
    btn.addEventListener("click", () => toggleProviderFilter(prov.id));
    pickerProviders.appendChild(btn);
  }
};

const PICKER_CAP_ICON_SIZE = 12;

const selectModel = (model: ModelDef) => {
  selectedModel = model;
  // Filter out pending files that the new model doesn't support
  pendingFiles = pendingFiles.filter((file) => {
    if (file.media_type === "application/pdf")
      return selectedModel.capabilities.includes("pdf");

    return selectedModel.capabilities.includes("vision");
  });
  closePicker();
  // Re-render the input toolbar
  if (messages.length > 0) {
    renderMessagesView();
  } else {
    renderEmptyState();
  }
};

const renderProviderSection = (providerId: string, provModels: ModelDef[]) => {
  if (!pickerProviderFilter) {
    const header = document.createElement("div");
    header.className = "picker-section-header";
    const prov = PROVIDERS.find((provider) => provider.id === providerId);
    header.textContent = prov?.name ?? providerId;
    pickerList.appendChild(header);
  }

  for (const model of provModels) {
    pickerList.appendChild(renderPickerModelBtn(model));
  }
};

const renderPickerModelBtn = (model: ModelDef) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `picker-model ${model.id === selectedModel.id ? "selected" : ""}`;

  const capsHtml = model.capabilities
    .map((cap) => capBadgeHtml(cap, PICKER_CAP_ICON_SIZE))
    .join("");

  btn.innerHTML = `<div class="picker-model-row"><img alt="" class="picker-model-logo" height="16" src="${PROVIDER_LOGO_PATH}/${model.provider}.svg" width="16"><span class="picker-model-name">${model.name}</span><span class="picker-cost" style="color:${COST_COLORS[model.cost]}">${COST_LABELS[model.cost]}</span>${model.legacy ? '<span class="picker-legacy">legacy</span>' : ""}<div class="picker-cap-icons">${capsHtml}</div></div><div class="picker-model-desc">${model.description}</div>`;

  btn.addEventListener("click", () => selectModel(model));

  return btn;
};

const renderPickerList = () => {
  pickerList.innerHTML = "";

  const query = pickerSearchInput.value;
  const filteredModels = filterModels(
    query,
    pickerProviderFilter,
    pickerShowLegacy,
    pickerCapFilters.length > 0 ? pickerCapFilters : undefined,
  );

  if (filteredModels.length === 0) {
    const empty = document.createElement("div");
    empty.className = "picker-empty";
    empty.textContent = "No models match your search";
    pickerList.appendChild(empty);

    return;
  }

  // Group by provider
  const grouped = new Map<string, ModelDef[]>();
  for (const model of filteredModels) {
    const existing = grouped.get(model.provider) ?? [];
    existing.push(model);
    grouped.set(model.provider, existing);
  }

  for (const [providerId, provModels] of grouped) {
    renderProviderSection(providerId, provModels);
  }
};

const toggleCapFilter = (cap: ModelCapability, evt: Event) => {
  evt.stopPropagation();

  if (pickerCapFilters.includes(cap)) {
    pickerCapFilters = pickerCapFilters.filter((existing) => existing !== cap);
  } else {
    pickerCapFilters.push(cap);
  }
  renderFilterPopover();
  renderPickerList();
  updateFilterCount();
};

const renderFilterPopover = () => {
  filterPopover.innerHTML = "";

  const legacyCount = MODELS.filter((mod) => mod.legacy).length;

  for (const cap of ALL_CAPABILITIES) {
    const active = pickerCapFilters.includes(cap);
    const row = document.createElement("div");
    row.className = "filter-row";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `filter-option ${active ? "active" : ""}`;
    btn.innerHTML = `${capBadgeHtml(cap)}<span class="filter-option-label">${CAPABILITY_LABELS[cap].label}</span>`;
    btn.addEventListener("click", (evt) => toggleCapFilter(cap, evt));
    row.appendChild(btn);

    const info = document.createElement("span");
    info.className = "filter-info";
    info.tabIndex = 0;
    info.innerHTML = `<svg fill="none" height="12" stroke="currentColor" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="12"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg><span class="filter-info-tip">${CAPABILITY_DESCRIPTIONS[cap]}</span>`;
    row.appendChild(info);

    filterPopover.appendChild(row);
  }

  // Divider
  const divider = document.createElement("div");
  divider.className = "filter-divider";
  filterPopover.appendChild(divider);

  // Legacy toggle
  const legacyBtn = document.createElement("button");
  legacyBtn.type = "button";
  legacyBtn.className = `filter-option ${pickerShowLegacy ? "active" : ""}`;
  const legacyColor = pickerShowLegacy ? "#aaa" : "#666";
  legacyBtn.innerHTML = `<span class="cap-badge" style="align-items:center;background:${pickerShowLegacy ? "rgba(136,136,136,0.18)" : "rgba(136,136,136,0.10)"};border-radius:4px;display:inline-flex;height:20px;justify-content:center;width:20px;"><svg fill="none" height="14" stroke="${legacyColor}" stroke-linecap="round" stroke-width="2" viewBox="0 0 24 24" width="14"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></span><span class="filter-option-label">Legacy models (${legacyCount})</span>`;
  legacyBtn.addEventListener("click", (evt) => {
    evt.stopPropagation();
    pickerShowLegacy = !pickerShowLegacy;
    renderFilterPopover();
    renderPickerList();
  });
  filterPopover.appendChild(legacyBtn);

  // Stop propagation on the whole popover
  filterPopover.addEventListener("click", (evt) => evt.stopPropagation());
};

const updateFilterCount = () => {
  if (pickerCapFilters.length > 0) {
    filterCount.style.display = "";
    filterCount.textContent = String(pickerCapFilters.length);
    pickerFilterBtn.classList.add("has-filters");
  } else {
    filterCount.style.display = "none";
    pickerFilterBtn.classList.remove("has-filters");
  }
};

// ── Initialize ───────────────────────────────────────

renderEmptyState();
