import { useState, type RefObject } from "react";
import { COST_LABELS, COST_COLORS, type ModelDef } from "../../models";
import { ModelPicker } from "./ModelPicker";

type InputToolbarProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  isStreaming: boolean;
  onCancel: () => void;
  onSelectModel: (model: ModelDef) => void;
  selectedModel: ModelDef;
  supportsAttachments: boolean;
  supportsPdf: boolean;
  supportsVision: boolean;
};

export const InputToolbar = ({
  fileInputRef,
  isStreaming,
  onCancel,
  onSelectModel,
  selectedModel,
  supportsAttachments,
  supportsPdf,
  supportsVision,
}: InputToolbarProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="input-toolbar">
      {supportsAttachments && (
        <button
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          title={`Attach ${[supportsVision && "image", supportsPdf && "PDF"].filter(Boolean).join(" or ")}`}
          type="button"
        >
          <svg
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="16"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
      )}
      <div className="picker-anchor">
        <ModelSelectButton
          onClick={() => setPickerOpen(true)}
          selectedModel={selectedModel}
        />
        <ModelPicker
          currentModelId={selectedModel.id}
          onClose={() => setPickerOpen(false)}
          onSelect={onSelectModel}
          open={pickerOpen}
        />
      </div>
      {isStreaming ? (
        <button className="send-btn cancel" onClick={onCancel} type="button">
          <svg
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="16"
          >
            <rect height="14" rx="2" width="14" x="5" y="5" />
          </svg>
        </button>
      ) : (
        <button className="send-btn" type="submit">
          <svg
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="16"
          >
            <line x1="22" x2="11" y1="2" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      )}
    </div>
  );
};

const ModelSelectButton = ({
  onClick,
  selectedModel,
}: {
  onClick: () => void;
  selectedModel: ModelDef;
}) => (
  <button className="model-select-btn" onClick={onClick} type="button">
    <img
      alt=""
      className="model-select-logo"
      height="16"
      src={`/assets/svg/providers/${selectedModel.provider}.svg`}
      width="16"
    />
    <span className="model-select-name">{selectedModel.name}</span>
    <span
      className="model-select-cost"
      style={{ color: COST_COLORS[selectedModel.cost] }}
    >
      {COST_LABELS[selectedModel.cost]}
    </span>
    <svg
      fill="none"
      height="12"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="12"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  </button>
);
