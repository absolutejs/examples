import { CAPABILITY_LABELS, MODELS, type ModelCapability } from "../../models";
import { CapabilityIcon } from "./CapabilityIcon";

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

type FilterPopoverProps = {
  capFilters: ModelCapability[];
  closing: boolean;
  onToggleCap: (cap: ModelCapability) => void;
  onToggleLegacy: () => void;
  showLegacy: boolean;
};

const legacyCount = MODELS.filter((mod) => mod.legacy).length;

const CapabilityRow = ({
  cap,
  active,
  onToggle,
}: {
  active: boolean;
  cap: ModelCapability;
  onToggle: () => void;
}) => (
  <div className="filter-row">
    <button
      className={`filter-option ${active ? "active" : ""}`}
      onClick={onToggle}
      type="button"
    >
      <CapabilityIcon capability={cap} />
      <span className="filter-option-label">
        {CAPABILITY_LABELS[cap].label}
      </span>
    </button>
    <span className="filter-info" tabIndex={0}>
      <svg
        fill="none"
        height="12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="12"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="16" y2="12" />
        <line x1="12" x2="12.01" y1="8" y2="8" />
      </svg>
      <span className="filter-info-tip">{CAPABILITY_DESCRIPTIONS[cap]}</span>
    </span>
  </div>
);

export const FilterPopover = ({
  capFilters,
  closing,
  onToggleCap,
  onToggleLegacy,
  showLegacy,
}: FilterPopoverProps) => (
  <div
    className={`filter-popover ${closing ? "closing" : ""}`}
    onClick={(evt) => evt.stopPropagation()}
  >
    {ALL_CAPABILITIES.map((cap) => (
      <CapabilityRow
        active={capFilters.includes(cap)}
        cap={cap}
        key={cap}
        onToggle={() => onToggleCap(cap)}
      />
    ))}
    <div className="filter-divider" />
    <button
      className={`filter-option ${showLegacy ? "active" : ""}`}
      onClick={onToggleLegacy}
      type="button"
    >
      <span
        className="cap-badge"
        style={{
          alignItems: "center",
          background: showLegacy
            ? "rgba(136, 136, 136, 0.18)"
            : "rgba(136, 136, 136, 0.10)",
          borderRadius: "4px",
          display: "inline-flex",
          height: "20px",
          justifyContent: "center",
          width: "20px",
        }}
      >
        <svg
          fill="none"
          height="14"
          stroke={showLegacy ? "#aaa" : "#666"}
          strokeLinecap="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="14"
        >
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
      <span className="filter-option-label">Legacy models ({legacyCount})</span>
    </button>
  </div>
);
