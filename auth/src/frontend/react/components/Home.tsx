import { Link } from "react-router";
import type { AuthUser } from "../../shared/types";
import { ProviderLogin } from "./ProviderLogin";

export const Home = ({ user }: { user: AuthUser | null }) => (
  <section className="auth-content">
    <h1 className="page-heading">Absolute Auth — React</h1>
    {user ? (
      <p className="muted">You are signed in as {user.email ?? user.sub}.</p>
    ) : (
      <p className="muted">
        Sign in or sign up with any OAuth2 provider to test the flow.
      </p>
    )}
    {user ? (
      <Link className="btn btn--primary" to="/react/protected">
        View the protected page
      </Link>
    ) : (
      <ProviderLogin action="login" className="card login-card text-left" />
    )}
  </section>
);
