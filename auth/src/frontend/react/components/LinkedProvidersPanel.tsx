import { useState } from "react";
import { removeBinding, removeGrant } from "../../shared/authClient";
import type { LinkedProviderPayload } from "../../shared/types";
import { useLinkedProviders } from "../hooks/useLinkedProviders";
import { BindingRow } from "./BindingRow";
import { GrantRow } from "./GrantRow";
import { useToast } from "./toast/ToastProvider";

export const LinkedProvidersPanel = () => {
  const { error, loading, payload, refresh, setPayload } =
    useLinkedProviders(true);
  const { addToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (
    id: string,
    action: () => Promise<LinkedProviderPayload>,
    success: string,
  ) => {
    setBusyId(id);
    try {
      setPayload(await action());
      addToast(success, "success");
    } catch (caught) {
      addToast(
        caught instanceof Error ? caught.message : "Action failed",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <h2 className="panel__title">Linked connectors</h2>
          <p className="muted">
            OAuth grants and the external accounts discovered for them.
          </p>
        </div>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => void refresh()}
          type="button"
        >
          Refresh
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && !payload && <p className="muted">Loading connectors…</p>}

      <h3 className="provider-heading">External accounts</h3>
      {payload && payload.bindings.length === 0 && (
        <div className="empty-state">No external accounts linked.</div>
      )}
      <div className="entity-list">
        {payload?.bindings.map((binding) => (
          <BindingRow
            binding={binding}
            busy={busyId === binding.id}
            key={binding.id}
            onRemove={() =>
              run(
                binding.id,
                () => removeBinding(binding.id),
                "Binding removed",
              )
            }
          />
        ))}
      </div>

      <h3 className="provider-heading">Grants</h3>
      {payload && payload.grants.length === 0 && (
        <div className="empty-state">No connector grants yet.</div>
      )}
      <div className="entity-list">
        {payload?.grants.map((grant) => (
          <GrantRow
            busy={busyId === grant.id}
            grant={grant}
            key={grant.id}
            onRemove={() =>
              run(grant.id, () => removeGrant(grant.id), "Grant removed")
            }
          />
        ))}
      </div>
    </div>
  );
};
