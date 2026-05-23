import type { AuthUser } from "../../shared/types";

export const AccountOverview = ({ user }: { user: AuthUser }) => {
  const fullName = [user.first_name, user.last_name]
    .filter((part) => typeof part === "string" && part.length > 0)
    .join(" ");

  return (
    <div className="grid-2">
      <div className="card">
        <h2 className="card__title">Canonical account</h2>
        <p className="muted">
          Absolute Auth keeps one canonical user and links every OAuth identity
          to it. Linking a new provider attaches it here; conflicting identities
          raise a merge request.
        </p>
      </div>
      <div className="card text-left">
        <h2 className="card__title">Profile fields</h2>
        <dl className="entity__meta">
          <div className="spread">
            <dt className="muted">Subject</dt>
            <dd>{user.sub}</dd>
          </div>
          <div className="spread">
            <dt className="muted">Name</dt>
            <dd>{fullName.length > 0 ? fullName : "—"}</dd>
          </div>
          <div className="spread">
            <dt className="muted">Email</dt>
            <dd>{user.email ?? "—"}</dd>
          </div>
          <div className="spread">
            <dt className="muted">Primary identity</dt>
            <dd>{user.primary_auth_identity_id ?? "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
};
