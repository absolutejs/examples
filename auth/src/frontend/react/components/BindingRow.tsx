import type { LinkedProviderBindingView } from "../../shared/types";
import { ScopeList } from "./ScopeList";

type BindingRowProps = {
  binding: LinkedProviderBindingView;
  busy: boolean;
  onRemove: () => void;
};

export const BindingRow = ({ binding, busy, onRemove }: BindingRowProps) => (
  <div className="entity">
    <div className="entity__meta">
      <span className="entity__title">
        {binding.label ?? binding.externalAccountId}
        <span className="pill">{binding.connectorProvider}</span>
      </span>
      <span className="entity__sub">
        {binding.externalAccountType} · {binding.status}
      </span>
      <ScopeList scopes={binding.availableScopes} />
    </div>
    <button
      className="entity__actions btn btn--danger btn--sm"
      disabled={busy}
      onClick={onRemove}
      type="button"
    >
      Remove
    </button>
  </div>
);
