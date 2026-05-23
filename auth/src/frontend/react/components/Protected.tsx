import type { AuthUser } from "../../shared/types";
import { HighlightedJson } from "./HighlightedJson";
import { NotAuthorized } from "./NotAuthorized";

type ProtectedProps = {
  loading: boolean;
  user: AuthUser | null;
};

export const Protected = ({ loading, user }: ProtectedProps) => {
  if (loading) {
    return (
      <section className="auth-content">
        <p className="muted">Checking your session…</p>
      </section>
    );
  }

  if (!user) {
    return <NotAuthorized />;
  }

  return (
    <section className="auth-section stack">
      <div>
        <h1 className="page-heading">Protected page</h1>
        <p className="muted">
          Your authenticated session resolves to this user record.
        </p>
      </div>
      <HighlightedJson data={user} />
    </section>
  );
};
