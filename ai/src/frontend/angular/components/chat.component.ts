import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  inject,
  ViewChild,
  ElementRef,
  effect,
} from "@angular/core";
import { NgClass } from "@angular/common";
import { AIStreamService } from "@absolutejs/ai/angular";
import {
  COPY_FEEDBACK_MS,
  SCROLL_NEAR_BOTTOM_PX,
  stripPrefix,
} from "../../constants";
import { MODELS, type ModelDef } from "../../models";
import { ChatInputComponent } from "./chat-input.component";
import {
  EmptyStateComponent,
  type SuggestionCategory,
} from "./empty-state.component";
import { MessageItemComponent } from "./message-item.component";
import { SidebarComponent } from "./sidebar.component";
import type { PendingFile } from "./file-preview-item.component";

type MediaType =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp"
  | "application/pdf";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

const isMediaType = (type: string): type is MediaType =>
  IMAGE_TYPES.includes(type) || type === "application/pdf";

const DEFAULT_MODEL =
  MODELS.find((mod) => mod.id === "claude-sonnet-4-6") ?? MODELS[0];

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

@Component({
  imports: [
    NgClass,
    ChatInputComponent,
    EmptyStateComponent,
    MessageItemComponent,
    SidebarComponent,
  ],
  selector: "app-chat",
  standalone: true,
  template: `
    <div class="app-layout">
      <app-sidebar
        [open]="sidebarOpen"
        [activeConversationId]="activeConvId()"
        (newChat)="handleNewChat()"
        (selectConversation)="handleSelectConversation($event)"
        (deleteConversation)="handleDeleteConversation($event)"
      />
      <div class="app-main" #appMain>
        <div
          class="chat-container"
          [ngClass]="{ 'has-messages': hasMessages() }"
        >
          @if (!hasMessages()) {
            <app-empty-state
              [suggestions]="suggestions"
              (sendMessage)="sendMessage($event)"
            >
              <app-chat-input
                [hasMessages]="false"
                [isStreaming]="isStreaming()"
                [pendingFiles]="pendingFiles()"
                [selectedModel]="selectedModel()"
                [supportsAttachments]="supportsAttachments()"
                [supportsVision]="supportsVision()"
                [supportsPdf]="supportsPdf()"
                (processFiles)="processFiles($event)"
                (removeFile)="removePendingFile($event)"
                (cancelStream)="cancelStream()"
                (selectModel)="selectedModel.set($event)"
                (submitMessage)="sendMessage($event)"
              />
            </app-empty-state>
          } @else {
            <div class="messages">
              @for (msg of messages(); track msg.id; let i = $index) {
                <app-message-item
                  [message]="msg"
                  [messageIndex]="i"
                  [copiedId]="copiedId()"
                  [selectedModel]="selectedModel()"
                  (copyMessage)="handleCopy($event)"
                  (retryMessage)="handleRetry($event)"
                />
              }
              @if (showWaitingIndicator()) {
                <div class="message" data-role="assistant">
                  <div class="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              }
              <div #messagesEnd></div>
            </div>
            @if (chatError()) {
              <div class="error-banner">Error: {{ chatError() }}</div>
            }
            <app-chat-input
              [hasMessages]="true"
              [isStreaming]="isStreaming()"
              [pendingFiles]="pendingFiles()"
              [selectedModel]="selectedModel()"
              [supportsAttachments]="supportsAttachments()"
              [supportsVision]="supportsVision()"
              [supportsPdf]="supportsPdf()"
              (processFiles)="processFiles($event)"
              (removeFile)="removePendingFile($event)"
              (cancelStream)="cancelStream()"
              (selectModel)="selectedModel.set($event)"
              (submitMessage)="sendMessage($event)"
            />
          }
        </div>
        <p class="footer">
          <img src="/assets/png/absolutejs-temp.png" alt="" />
          Powered by
          <a
            href="https://absolutejs.com"
            target="_blank"
            rel="noopener noreferrer"
            >AbsoluteJS</a
          >
        </p>
      </div>
    </div>
  `,
})
export class ChatComponent {
  private aiService = inject(AIStreamService);

  @Input() sidebarOpen = false;
  @Output() sidebarToggle = new EventEmitter<void>();

  selectedModel = signal<ModelDef>(DEFAULT_MODEL);
  conversationId = signal<string | undefined>(undefined);
  copiedId = signal<string | null>(null);
  pendingFiles = signal<PendingFile[]>([]);

  private chatHandle = signal(this.aiService.connect("/chat"));

  suggestions = SUGGESTIONS;

  @ViewChild("messagesEnd") messagesEnd?: ElementRef<HTMLDivElement>;
  @ViewChild("appMain") appMain?: ElementRef<HTMLDivElement>;

  messages = computed(() => this.chatHandle().messages());
  isStreaming = computed(() => this.chatHandle().isStreaming());
  chatError = computed(() => this.chatHandle().error());

  hasMessages = computed(() => this.messages().length > 0);

  activeConvId = computed(() => {
    const cid = this.conversationId();

    if (cid) return cid;
    const msgs = this.messages();

    return msgs.length > 0 ? (msgs[0].conversationId ?? null) : null;
  });

  supportsVision = computed(() =>
    this.selectedModel().capabilities.includes("vision"),
  );
  supportsPdf = computed(() =>
    this.selectedModel().capabilities.includes("pdf"),
  );
  supportsAttachments = computed(
    () => this.supportsVision() || this.supportsPdf(),
  );

  showWaitingIndicator = computed(() => {
    const msgs = this.messages();

    return (
      this.isStreaming() &&
      msgs.length > 0 &&
      msgs[msgs.length - 1].role === "user"
    );
  });

  private scrollEffect = effect(() => {
    // Track messages signal so effect runs on change
    this.messages();
    setTimeout(() => {
      const container = this.appMain?.nativeElement;
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom =
        scrollHeight - scrollTop - clientHeight < SCROLL_NEAR_BOTTOM_PX;
      if (isNearBottom) {
        this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  private modelChangeEffect = effect(() => {
    const model = this.selectedModel();
    this.pendingFiles.update((prev) =>
      prev.filter((file) => {
        if (file.media_type === "application/pdf") {
          return model.capabilities.includes("pdf");
        }

        return model.capabilities.includes("vision");
      }),
    );
  });

  cancelStream() {
    this.chatHandle().cancel();
  }

  toggleSidebar() {
    this.sidebarToggle.emit();
  }

  processFiles(files: FileList | File[]) {
    const model = this.selectedModel();
    const hasVision = model.capabilities.includes("vision");
    const hasPdf = model.capabilities.includes("pdf");

    for (const file of Array.from(files)) {
      const { type: fileType } = file;
      const isImage = IMAGE_TYPES.includes(fileType);
      const isPdf = fileType === "application/pdf";

      if (isImage && !hasVision) continue;
      if (isPdf && !hasPdf) continue;
      if (!isMediaType(fileType)) continue;

      const mediaType = fileType;
      const { name: fileName } = file;
      const reader = new FileReader();
      reader.onload = () => {
        const { result } = reader;
        if (typeof result !== "string") return;
        const [, base64] = result.split(",");
        this.pendingFiles.update((prev) => [
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
  }

  removePendingFile(idx: number) {
    this.pendingFiles.update((prev) => prev.filter((_, i) => i !== idx));
  }

  sendMessage(text: string) {
    const model = this.selectedModel();
    const files = this.pendingFiles();
    const attachments =
      files.length > 0
        ? files.map(({ data, media_type, name }) => ({
            data,
            media_type,
            name,
          }))
        : undefined;

    this.chatHandle().send(
      `${model.provider}:${model.id}:${text}`,
      attachments,
    );
    this.pendingFiles.set([]);
  }

  handleCopy(evt: { id: string; content: string }) {
    navigator.clipboard.writeText(evt.content);
    this.copiedId.set(evt.id);
    setTimeout(() => this.copiedId.set(null), COPY_FEEDBACK_MS);
  }

  handleRetry(msgIdx: number) {
    const msgs = this.messages();
    const prevUserMsg = msgs
      .slice(0, msgIdx)
      .reverse()
      .find((msg) => msg.role === "user");
    if (!prevUserMsg) return;
    this.sendMessage(stripPrefix(prevUserMsg.content));
  }

  handleNewChat() {
    const newId = crypto.randomUUID();
    this.conversationId.set(newId);
    this.chatHandle.set(this.aiService.connect("/chat", newId));
  }

  handleSelectConversation(selectedId: string) {
    this.conversationId.set(selectedId);
    this.chatHandle.set(this.aiService.connect("/chat", selectedId));
    // Close sidebar after selecting - notify parent
    if (this.sidebarOpen) {
      this.sidebarToggle.emit();
    }
  }

  handleDeleteConversation(deletedId: string) {
    if (this.activeConvId() === deletedId) {
      this.handleNewChat();
    }
  }
}
