import type { LinkedProviderGrant } from "@absolutejs/linked-providers";
import { ScopeList } from "./ScopeList";

const formatTime = (value: number | undefined) =>
  value === undefined ? "—" : new Date(value).toLocaleString();

type GrantRowProps = {
  busy: boolean;
  grant: LinkedProviderGrant;
  onRemove: () => void;
};

export const GrantRow = ({ busy, grant, onRemove }: GrantRowProps) => (
  <div className="entity">
    <div className="entity__meta">
      <span className="entity__title">
        {grant.authProviderKey}
        <span className="pill pill--indigo">{grant.status}</span>
      </span>
      <span className="entity__sub">
        Subject {grant.providerSubject} · updated {formatTime(grant.updatedAt)}
      </span>
      <ScopeList scopes={grant.grantedScopes} />
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
