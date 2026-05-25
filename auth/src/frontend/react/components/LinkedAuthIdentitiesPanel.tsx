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
import { IdentityGroup } from "./IdentityGroup";
import { MergeRequestCard } from "./MergeRequestCard";
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

      {error && <div className="error-banner">{error}</div>}

      {pendingMerges.length > 0 && (
        <div className="stack">
          <h3 className="provider-heading">Merge requests</h3>
          <div className="entity-list">
            {pendingMerges.map((request) => (
              <MergeRequestCard
                busy={busyId === request.id}
                conflictLabel={providerLabel(request.conflicting_auth_provider)}
                key={request.id}
                onDismiss={() =>
                  run(
                    request.id,
                    () => dismissMergeRequest(request.id),
                    "Merge request dismissed",
                  )
                }
                onMerge={() =>
                  run(
                    request.id,
                    () => mergeAccount(request.id),
                    "Accounts merged",
                  )
                }
                subject={request.conflicting_provider_subject}
              />
            ))}
          </div>
        </div>
      )}

      <input
        className="search-input"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search identities…"
        value={query}
      />

      {loading && !payload && <p className="muted">Loading identities…</p>}

      {payload && groups.length === 0 && (
        <div className="empty-state">No identities match your search.</div>
      )}

      {groups.map((group) => (
        <IdentityGroup
          busyId={busyId}
          identities={group.identities}
          key={group.provider}
          label={providerLabel(group.provider)}
          logo={providerLogo(group.provider)}
          onRemove={(id) =>
            run(id, () => removeIdentity(id), "Identity removed")
          }
          onSetPrimary={(id) =>
            run(id, () => setPrimaryIdentity(id), "Primary identity updated")
          }
        />
      ))}
    </div>
  );
};
