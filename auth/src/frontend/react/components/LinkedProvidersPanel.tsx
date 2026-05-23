import { useState } from "react";
import { removeBinding, removeGrant } from "../../shared/authClient";
import type { LinkedProviderPayload } from "../../shared/types";
import { useLinkedProviders } from "../hooks/useLinkedProviders";
import { useToast } from "./toast/ToastProvider";

const formatTime = (value: number | undefined) =>
  value === undefined ? "—" : new Date(value).toLocaleString();

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

      {error ? <div className="error-banner">{error}</div> : null}
      {loading && !payload ? (
        <p className="muted">Loading connectors…</p>
      ) : null}

      <h3 className="provider-heading">External accounts</h3>
      {payload && payload.bindings.length === 0 ? (
        <div className="empty-state">No external accounts linked.</div>
      ) : null}
      <div className="entity-list">
        {payload?.bindings.map((binding) => (
          <div className="entity" key={binding.id}>
            <div className="entity__meta">
              <span className="entity__title">
                {binding.label ?? binding.externalAccountId}
                <span className="pill">{binding.connectorProvider}</span>
              </span>
              <span className="entity__sub">
                {binding.externalAccountType} · {binding.status}
              </span>
              <div className="scope-list">
                {binding.availableScopes.map((scope) => (
                  <span className="scope" key={scope}>
                    {scope}
                  </span>
                ))}
              </div>
            </div>
            <div className="entity__actions">
              <button
                className="btn btn--danger btn--sm"
                disabled={busyId === binding.id}
                onClick={() =>
                  run(
                    binding.id,
                    () => removeBinding(binding.id),
                    "Binding removed",
                  )
                }
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <h3 className="provider-heading">Grants</h3>
      {payload && payload.grants.length === 0 ? (
        <div className="empty-state">No connector grants yet.</div>
      ) : null}
      <div className="entity-list">
        {payload?.grants.map((grant) => (
          <div className="entity" key={grant.id}>
            <div className="entity__meta">
              <span className="entity__title">
                {grant.authProviderKey}
                <span className="pill pill--indigo">{grant.status}</span>
              </span>
              <span className="entity__sub">
                Subject {grant.providerSubject} · updated{" "}
                {formatTime(grant.updatedAt)}
              </span>
              <div className="scope-list">
                {grant.grantedScopes.map((scope) => (
                  <span className="scope" key={scope}>
                    {scope}
                  </span>
                ))}
              </div>
            </div>
            <div className="entity__actions">
              <button
                className="btn btn--danger btn--sm"
                disabled={busyId === grant.id}
                onClick={() =>
                  run(grant.id, () => removeGrant(grant.id), "Grant removed")
                }
                type="button"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
