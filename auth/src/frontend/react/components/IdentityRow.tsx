import type { AuthIdentity } from "../../shared/types";

type IdentityRowProps = {
  busy: boolean;
  identity: AuthIdentity;
  onRemove: () => void;
  onSetPrimary: () => void;
};

export const IdentityRow = ({
  busy,
  identity,
  onRemove,
  onSetPrimary,
}: IdentityRowProps) => (
  <div className="entity">
    <div className="entity__main entity__meta">
      <span className="entity__title">
        {identity.provider_subject}
        {identity.isPrimary && (
          <span className="pill pill--primary">Primary</span>
        )}
      </span>
      <span className="entity__sub">{identity.id}</span>
    </div>
    <div className="entity__actions">
      {!identity.isPrimary && (
        <button
          className="btn btn--neutral btn--sm"
          disabled={busy}
          onClick={onSetPrimary}
          type="button"
        >
          Set primary
        </button>
      )}
      <button
        className="btn btn--danger btn--sm"
        disabled={busy}
        onClick={onRemove}
        type="button"
      >
        Remove
      </button>
    </div>
  </div>
);
