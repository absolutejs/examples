import { useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router";
import { Home } from "./Home";
import { Profile } from "./Profile";
import { Settings } from "./Settings";

export const PortalShell = () => {
  const [clicks, setClicks] = useState(0);
  const { pathname } = useLocation();

  return (
    <main>
      <div className="page-title">
        <img alt="React" height={32} src="/assets/svg/react.svg" />
        <h1>React</h1>
        <span className="badge">SPA via react-router</span>
      </div>

      <p className="section-desc">
        Refresh on any sub-route — the server renders the right view because
        the page handler forwards the request URL into the page&apos;s props,
        and the page wraps its tree in{" "}
        <code>{"<StaticRouter location={url}>"}</code> on the server.
      </p>

      <div className="portal-state">
        <span>
          Persistent layout state: <strong>{pathname}</strong>
        </span>
        <span className="clicks">
          <button onClick={() => setClicks((current) => current + 1)}>
            Layout clicks: {clicks}
          </button>
        </span>
      </div>

      <div className="portal-layout">
        <aside className="portal-sidebar">
          <Link className={pathname === "/react" ? "active" : ""} to="/react">
            Home
          </Link>
          <Link
            className={pathname === "/react/settings" ? "active" : ""}
            to="/react/settings"
          >
            Settings
          </Link>
          <Link
            className={pathname === "/react/profile" ? "active" : ""}
            to="/react/profile"
          >
            Profile
          </Link>
        </aside>
        <section className="portal-content">
          <Routes>
            <Route element={<Home />} path="/react" />
            <Route element={<Settings />} path="/react/settings" />
            <Route element={<Profile />} path="/react/profile" />
          </Routes>
        </section>
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
};
