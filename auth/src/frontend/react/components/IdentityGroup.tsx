import type { AuthIdentity } from "../../shared/types";
import { IdentityRow } from "./IdentityRow";

type IdentityGroupProps = {
  busyId: string | null;
  identities: AuthIdentity[];
  label: string;
  logo: string | undefined;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
};

export const IdentityGroup = ({
  busyId,
  identities,
  label,
  logo,
  onRemove,
  onSetPrimary,
}: IdentityGroupProps) => (
  <div className="provider-group">
    <h3 className="provider-heading">
      {logo && <img alt="" className="entity__logo" src={logo} />}
      {label}
    </h3>
    <div className="entity-list">
      {identities.map((identity) => (
        <IdentityRow
          busy={busyId === identity.id}
          identity={identity}
          key={identity.id}
          onRemove={() => onRemove(identity.id)}
          onSetPrimary={() => onSetPrimary(identity.id)}
        />
      ))}
    </div>
  </div>
);
