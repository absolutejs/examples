<script lang="ts">
  import type { ModelDef } from "../../models";
  import FilePreviewItem from "./FilePreviewItem.svelte";
  import InputToolbar from "./InputToolbar.svelte";

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
    hasMessages: boolean;
    isStreaming: boolean;
    onCancel: () => void;
    onProcessFiles: (files: FileList | File[]) => void;
    onRemoveFile: (idx: number) => void;
    onSelectModel: (model: ModelDef) => void;
    onSubmit: (evt: SubmitEvent) => void;
    pendingFiles: PendingFile[];
    selectedModel: ModelDef;
    supportsAttachments: boolean;
    supportsPdf: boolean;
    supportsVision: boolean;
  };

  let {
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
  }: ChatInputProps = $props();

  let fileInputEl: HTMLInputElement | undefined = $state(undefined);

  let acceptTypes = $derived(
    [
      ...(supportsVision
        ? ["image/png", "image/jpeg", "image/gif", "image/webp"]
        : []),
      ...(supportsPdf ? ["application/pdf"] : []),
    ].join(","),
  );

  const handleClickAttach = () => {
    fileInputEl?.click();
  };

  const handleFileInputChange = (evt: Event) => {
    const input = evt.target as HTMLInputElement;
    if (input.files) onProcessFiles(input.files);
    input.value = "";
  };
</script>

<form
  class="chat-input-card"
  class:centered={!hasMessages}
  ondragleave={(evt: DragEvent) => {
    (evt.currentTarget as HTMLElement).classList.remove("drag-over");
  }}
  ondragover={(evt: DragEvent) => {
    evt.preventDefault();
    (evt.currentTarget as HTMLElement).classList.add("drag-over");
  }}
  ondrop={(evt: DragEvent) => {
    evt.preventDefault();
    (evt.currentTarget as HTMLElement).classList.remove("drag-over");
    if (evt.dataTransfer && evt.dataTransfer.files.length > 0) {
      onProcessFiles(evt.dataTransfer.files);
    }
  }}
  onsubmit={onSubmit}
>
  {#if pendingFiles.length > 0}
    <div class="file-previews">
      {#each pendingFiles as file, idx (`${file.name}-${idx}`)}
        <FilePreviewItem {file} onRemove={() => onRemoveFile(idx)} />
      {/each}
    </div>
  {/if}
  <textarea
    autocomplete="off"
    disabled={isStreaming}
    name="input"
    onkeydown={(evt: KeyboardEvent) => {
      if (evt.key !== "Enter" || evt.shiftKey) return;
      evt.preventDefault();
      (evt.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
    }}
    onpaste={(evt: ClipboardEvent) => {
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
      if (files.length > 0) onProcessFiles(files);
    }}
    placeholder={hasMessages ? "Reply..." : "Ask anything..."}
    rows={hasMessages ? 1 : 2}
  ></textarea>
  <input
    accept={acceptTypes}
    bind:this={fileInputEl}
    multiple
    onchange={handleFileInputChange}
    style="display:none"
    type="file"
  />
  <InputToolbar
    {isStreaming}
    {onCancel}
    onClickAttach={handleClickAttach}
    {onSelectModel}
    {selectedModel}
    {supportsAttachments}
    {supportsPdf}
    {supportsVision}
  />
</form>
