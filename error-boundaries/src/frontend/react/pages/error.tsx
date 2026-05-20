import { Head } from "@absolutejs/absolute/react/components";
import type { ErrorPageProps } from "@absolutejs/absolute";
import { Nav } from "../components/Nav";

export const ErrorPage = ({ message }: ErrorPageProps) => (
  <html lang="en">
    <Head title="Error - React" />
    <body>
      <Nav />
      <main>
        <div className="page-title">
          <h1>Something Went Wrong</h1>
          <span className="error-badge">error.tsx</span>
        </div>

        <p className="section-desc">
          This is the <strong>framework default</strong> React error page. It
          renders when a React page throws during SSR and no page-specific error
          file exists.
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
