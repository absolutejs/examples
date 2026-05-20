import { Head } from "@absolutejs/absolute/react/components";
import type { ErrorPageProps } from "@absolutejs/absolute";
import { Nav } from "../components/Nav";

export const ErrorPage = ({ message }: ErrorPageProps) => (
  <html lang="en">
    <Head title="Error - ReactHome" />
    <body>
      <Nav />
      <main>
        <div className="page-title">
          <h1>Page-Specific Error</h1>
          <span className="error-badge page-specific">ReactHome.error.tsx</span>
        </div>

        <p className="section-desc">
          This is the <strong>page-specific</strong> error boundary for
          ReactHome. It takes priority over the framework default error.tsx
          because the file name matches the page.
        </p>

        <div className="error-box">
          <pre>{message}</pre>
        </div>

        <a className="back-link" href="/">
          Back to Home
        </a>

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
    </body>
  </html>
);
