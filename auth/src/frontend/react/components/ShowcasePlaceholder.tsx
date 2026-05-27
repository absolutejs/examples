// Generic "this surface is wired on the backend; React UI lands in a follow-up phase"
// placeholder so the new nav entries don't dead-end during the per-framework rollout.

type Endpoint = { method: string; path: string };

type Props = {
  description: string;
  docsHref: string;
  endpoints: Endpoint[];
  title: string;
};

const EndpointItem = ({ endpoint }: { endpoint: Endpoint }) => (
  <li>
    {endpoint.method} {endpoint.path}
  </li>
);

export const ShowcasePlaceholder = ({
  description,
  docsHref,
  endpoints,
  title,
}: Props) => (
  <section className="auth-section stack">
    <div>
      <h1 className="page-heading">{title}</h1>
      <p className="muted">{description}</p>
    </div>
    <div className="stack">
      <p className="muted">
        Backend routes are wired and ready to call from this page in a follow-up
        phase. Until then, the endpoints below are usable directly via{" "}
        <code>authClient.*</code> in <code>shared/authClient.ts</code> or the
        framework hooks at <code>@absolutejs/auth/react</code>.
      </p>
      <ul className="muted" style={{ fontFamily: "monospace" }}>
        {endpoints.map((endpoint) => (
          <EndpointItem
            endpoint={endpoint}
            key={`${endpoint.method}-${endpoint.path}`}
          />
        ))}
      </ul>
      <p>
        <a href={docsHref} rel="noreferrer" target="_blank">
          Read the docs →
        </a>
      </p>
    </div>
  </section>
);
