import { Link } from "react-router";

export const NotAuthorized = () => (
  <section className="auth-content">
    <h1 className="page-heading">Not authorized</h1>
    <p className="muted">You need to sign in to view this page.</p>
    <Link className="btn btn--primary" to="/react">
      Go to sign in
    </Link>
  </section>
);
