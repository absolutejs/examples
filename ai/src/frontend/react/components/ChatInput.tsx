import type { FormEvent, RefObject } from "react";
import { type ModelDef } from "../../models";
import { FilePreviewItem } from "./FilePreviewItem";
import { InputToolbar } from "./InputToolbar";

type PendingFile = {
  data: string;
  media_type:
    | "image/png"
    | "image/jpeg"
    | "image/gif"
    | "image/webp"
    | "application/pdf";
  name: string;
  preview: string;
};

type ChatInputProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  hasMessages: boolean;
  isStreaming: boolean;
  onCancel: () => void;
  onProcessFiles: (files: FileList | File[]) => void;
  onRemoveFile: (idx: number) => void;
  onSelectModel: (model: ModelDef) => void;
  onSubmit: (evt: FormEvent<HTMLFormElement>) => void;
  pendingFiles: PendingFile[];
  selectedModel: ModelDef;
  supportsAttachments: boolean;
  supportsPdf: boolean;
  supportsVision: boolean;
};

export const ChatInput = ({
  fileInputRef,
  hasMessages,
  isStreaming,
  onCancel,
  onProcessFiles,
  onRemoveFile,
  onSelectModel,
  onSubmit,
  pendingFiles,
  selectedModel,
  supportsAttachments,
  supportsPdf,
  supportsVision,
}: ChatInputProps) => (
  <form
    className={`chat-input-card ${hasMessages ? "" : "centered"}`}
    onDragLeave={(evt) => {
      evt.currentTarget.classList.remove("drag-over");
    }}
    onDragOver={(evt) => {
      evt.preventDefault();
      evt.currentTarget.classList.add("drag-over");
    }}
    onDrop={(evt) => {
      evt.preventDefault();
      evt.currentTarget.classList.remove("drag-over");
      if (evt.dataTransfer.files.length > 0) {
        onProcessFiles(evt.dataTransfer.files);
      }
    }}
    onSubmit={onSubmit}
  >
    {pendingFiles.length > 0 && (
      <div className="file-previews">
        {pendingFiles.map((file, idx) => (
          <FilePreviewItem
            file={file}
            key={`${file.name}-${idx}`}
            onRemove={() => onRemoveFile(idx)}
          />
        ))}
      </div>
    )}
    <textarea
      autoComplete="off"
      disabled={isStreaming}
      name="input"
      onKeyDown={(evt) => {
        if (evt.key !== "Enter" || evt.shiftKey) return;
        evt.preventDefault();
        evt.currentTarget.form?.requestSubmit();
      }}
      onPaste={(evt) => {
        const { items } = evt.clipboardData;
        const files: File[] = [];
        for (const item of Array.from(items)) {
          const isAttachable =
            item.type.startsWith("image/") || item.type === "application/pdf";
          if (!isAttachable) continue;
          const file = item.getAsFile();
          if (file) files.push(file);
        }
        if (files.length > 0) onProcessFiles(files);
      }}
      placeholder={hasMessages ? "Reply..." : "Ask anything..."}
      rows={hasMessages ? 1 : 2}
    />
    <input
      accept={[
        ...(supportsVision
          ? ["image/png", "image/jpeg", "image/gif", "image/webp"]
          : []),
        ...(supportsPdf ? ["application/pdf"] : []),
      ].join(",")}
      multiple
      onChange={(evt) => {
        if (evt.target.files) onProcessFiles(evt.target.files);
        evt.target.value = "";
      }}
      ref={fileInputRef}
      style={{ display: "none" }}
      type="file"
    />
    <InputToolbar
      fileInputRef={fileInputRef}
      isStreaming={isStreaming}
      onCancel={onCancel}
      onSelectModel={onSelectModel}
      selectedModel={selectedModel}
      supportsAttachments={supportsAttachments}
      supportsPdf={supportsPdf}
      supportsVision={supportsVision}
    />
  </form>
);
