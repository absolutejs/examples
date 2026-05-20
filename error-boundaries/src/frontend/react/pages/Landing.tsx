import { Head } from "@absolutejs/absolute/react/components";
import { Nav } from "../components/Nav";

type LandingProps = {
  cssPath?: string;
};

type RouteCardProps = {
  href: string;
  title: string;
  path: string;
  description: string;
  danger?: boolean;
};

const RouteCard = ({
  href,
  title,
  path,
  description,
  danger,
}: RouteCardProps) => (
  <a className={`route-card${danger ? " danger" : ""}`} href={href}>
    <div className="card-title">{title}</div>
    <div className="card-path">{path}</div>
    <div className="card-desc">{description}</div>
  </a>
);

const LandingContent = () => (
  <main>
    <div className="page-title">
      <h1>Error Boundaries</h1>
      <span className="badge">AbsoluteJS Demo</span>
    </div>

    <p className="section-desc">
      This example demonstrates how AbsoluteJS handles errors during server-side
      rendering. Each framework has convention files that catch SSR errors and
      render fallback UI. Visit the "broken" pages to see error boundaries in
      action.
    </p>

    <h2 className="section-title">Convention Files</h2>
    <p className="section-desc">
      AbsoluteJS uses file-name conventions to wire up error handling
      automatically. Place these files alongside your pages and the framework
      picks them up at build time.
    </p>

    <ul className="convention-list">
      <li>
        <code>error.tsx</code>
        <span>Framework default error page (React)</span>
      </li>
      <li>
        <code>ReactHome.error.tsx</code>
        <span>Page-specific error override for ReactHome</span>
      </li>
      <li>
        <code>not-found.tsx</code>
        <span>404 page when no route matches (React)</span>
      </li>
      <li>
        <code>error.svelte</code>
        <span>Framework default error page (Svelte)</span>
      </li>
      <li>
        <code>error.vue</code>
        <span>Framework default error page (Vue)</span>
      </li>
      <li>
        <code>error.ts</code>
        <span>Framework default error page (Angular)</span>
      </li>
    </ul>

    <h2 className="section-title">Routes</h2>
    <p className="section-desc">
      Normal pages render successfully. Broken pages throw during SSR and fall
      back to the nearest error boundary.
    </p>

    <div className="route-grid">
      <RouteCard
        description="React demo page that renders normally."
        href="/react"
        path="/react"
        title="React Home"
      />
      <RouteCard
        danger
        description="Throws during SSR. Falls back to error.tsx."
        href="/broken-react"
        path="/broken-react"
        title="Broken React"
      />
      <RouteCard
        description="Svelte demo page that renders normally."
        href="/svelte"
        path="/svelte"
        title="Svelte Home"
      />
      <RouteCard
        danger
        description="Throws during SSR. Falls back to error.svelte."
        href="/broken-svelte"
        path="/broken-svelte"
        title="Broken Svelte"
      />
      <RouteCard
        description="Vue demo page that renders normally."
        href="/vue"
        path="/vue"
        title="Vue Home"
      />
      <RouteCard
        danger
        description="Throws during SSR. Falls back to error.vue."
        href="/broken-vue"
        path="/broken-vue"
        title="Broken Vue"
      />
      <RouteCard
        description="Angular demo page that renders normally."
        href="/angular"
        path="/angular"
        title="Angular Home"
      />
      <RouteCard
        danger
        description="Throws during SSR. Falls back to error.ts."
        href="/broken-angular"
        path="/broken-angular"
        title="Broken Angular"
      />
    </div>

    <p className="footer">
      <img alt="" src="/assets/png/absolutejs-temp.png" />
      Powered by{" "}
      <a
        href="https://absolutejs.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        AbsoluteJS
      </a>
    </p>
  </main>
);

export const Landing = ({ cssPath }: LandingProps) => (
  <html lang="en">
    <Head cssPath={cssPath} title="AbsoluteJS Error Boundaries Demo" />
    <body>
      <Nav active="/" />
      <LandingContent />
    </body>
  </html>
);
