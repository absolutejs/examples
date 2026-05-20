import { COST_LABELS, COST_COLORS, type ModelDef } from "../../models";
import { CapabilityIcon } from "./CapabilityIcon";

type ModelListItemProps = {
  model: ModelDef;
  onClick: () => void;
  providerLogoPath: string;
  selected: boolean;
};

export const ModelListItem = ({
  model,
  onClick,
  providerLogoPath,
  selected,
}: ModelListItemProps) => (
  <button
    className={`picker-model ${selected ? "selected" : ""}`}
    onClick={onClick}
    type="button"
  >
    <div className="picker-model-row">
      <img
        alt=""
        className="picker-model-logo"
        height="16"
        src={`${providerLogoPath}/${model.provider}.svg`}
        width="16"
      />
      <span className="picker-model-name">{model.name}</span>
      <span className="picker-cost" style={{ color: COST_COLORS[model.cost] }}>
        {COST_LABELS[model.cost]}
      </span>
      {model.legacy && <span className="picker-legacy">legacy</span>}
      <div className="picker-cap-icons">
        {model.capabilities.map((cap) => (
          <CapabilityIcon capability={cap} key={cap} size={12} />
        ))}
      </div>
    </div>
    <div className="picker-model-desc">{model.description}</div>
  </button>
);
