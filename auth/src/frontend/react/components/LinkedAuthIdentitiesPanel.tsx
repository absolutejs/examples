import { isValidProviderOption } from "citra";
import { useMemo, useState } from "react";
import {
  dismissMergeRequest,
  mergeAccount,
  removeIdentity,
  setPrimaryIdentity,
} from "../../shared/authClient";
import { providerData } from "../../shared/providerData";
import type { AuthIdentityPayload } from "../../shared/types";
import { useAuthIdentities } from "../hooks/useAuthIdentities";
import { useToast } from "./toast/ToastProvider";

const providerLabel = (key: string) =>
  isValidProviderOption(key) ? providerData[key].name : key;

const providerLogo = (key: string) =>
  isValidProviderOption(key) ? providerData[key].logoUrl : undefined;

export const LinkedAuthIdentitiesPanel = () => {
  const { error, loading, payload, refresh, setPayload } =
    useAuthIdentities(true);
  const { addToast } = useToast();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (
    id: string,
    action: () => Promise<AuthIdentityPayload>,
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

  const groups = useMemo(() => {
    if (!payload) {
      return [];
    }
    const term = query.trim().toLowerCase();

    return Object.entries(payload.identities)
      .map(([provider, identities]) => ({
        identities: identities.filter(
          (identity) =>
            term === "" ||
            providerLabel(provider).toLowerCase().includes(term) ||
            identity.id.toLowerCase().includes(term) ||
            identity.provider_subject.toLowerCase().includes(term),
        ),
        provider,
      }))
      .filter((group) => group.identities.length > 0);
  }, [payload, query]);

  const pendingMerges =
    payload?.mergeRequests.filter((request) => request.status === "pending") ??
    [];

  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <h2 className="panel__title">Linked login identities</h2>
          <p className="muted">
            Search, set a primary, remove, or resolve merge requests.
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

      {pendingMerges.length > 0 ? (
        <div className="stack">
          <h3 className="provider-heading">Merge requests</h3>
          <div className="entity-list">
            {pendingMerges.map((request) => (
              <div className="entity card--danger" key={request.id}>
                <div className="entity__meta">
                  <span className="entity__title">
                    {providerLabel(request.conflicting_auth_provider)} conflict
                  </span>
                  <span className="entity__sub">
                    Subject {request.conflicting_provider_subject}
                  </span>
                </div>
                <div className="entity__actions">
                  <button
                    className="btn btn--primary btn--sm"
                    disabled={busyId === request.id}
                    onClick={() =>
                      run(
                        request.id,
                        () => mergeAccount(request.id),
                        "Accounts merged",
                      )
                    }
                    type="button"
                  >
                    Merge
                  </button>
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={busyId === request.id}
                    onClick={() =>
                      run(
                        request.id,
                        () => dismissMergeRequest(request.id),
                        "Merge request dismissed",
                      )
                    }
                    type="button"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <input
        className="search-input"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search identities…"
        value={query}
      />

      {loading && !payload ? (
        <p className="muted">Loading identities…</p>
      ) : null}

      {payload && groups.length === 0 ? (
        <div className="empty-state">No identities match your search.</div>
      ) : null}

      {groups.map((group) => (
        <div className="provider-group" key={group.provider}>
          <h3 className="provider-heading">
            {providerLogo(group.provider) ? (
              <img
                alt=""
                className="entity__logo"
                src={providerLogo(group.provider)}
              />
            ) : null}
            {providerLabel(group.provider)}
          </h3>
          <div className="entity-list">
            {group.identities.map((identity) => (
              <div className="entity" key={identity.id}>
                <div className="entity__main">
                  <div className="entity__meta">
                    <span className="entity__title">
                      {identity.provider_subject}
                      {identity.isPrimary ? (
                        <span className="pill pill--primary">Primary</span>
                      ) : null}
                    </span>
                    <span className="entity__sub">{identity.id}</span>
                  </div>
                </div>
                <div className="entity__actions">
                  {identity.isPrimary ? null : (
                    <button
                      className="btn btn--neutral btn--sm"
                      disabled={busyId === identity.id}
                      onClick={() =>
                        run(
                          identity.id,
                          () => setPrimaryIdentity(identity.id),
                          "Primary identity updated",
                        )
                      }
                      type="button"
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    className="btn btn--danger btn--sm"
                    disabled={busyId === identity.id}
                    onClick={() =>
                      run(
                        identity.id,
                        () => removeIdentity(identity.id),
                        "Identity removed",
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
        </div>
      ))}
    </div>
  );
};
