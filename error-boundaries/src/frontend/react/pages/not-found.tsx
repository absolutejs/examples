import { Head } from "@absolutejs/absolute/react/components";
import { Nav } from "../components/Nav";

export const NotFoundPage = () => (
  <html lang="en">
    <Head title="404 - Page Not Found" />
    <body>
      <Nav />
      <main>
        <div className="not-found-page">
          <div className="code">404</div>
          <h2>Page Not Found</h2>
          <p>The page you are looking for does not exist.</p>
          <a className="back-link" href="/">
            Back to Home
          </a>
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
    </body>
  </html>
);
