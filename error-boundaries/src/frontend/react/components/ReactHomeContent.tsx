export const ReactHomeContent = () => (
  <main>
    <div className="page-title">
      <h1>React</h1>
      <span className="badge">Error Boundaries</span>
    </div>

    <p className="section-desc">
      This page renders normally. Visit{" "}
      <a className="back-link" href="/broken-react">
        /broken-react
      </a>{" "}
      to trigger an SSR error and see the error boundary in action.
    </p>

    <h2 className="section-title">React Convention Files</h2>
    <p className="section-desc">
      These files are detected automatically during the build and used as
      fallback UI when SSR fails.
    </p>

    <ul className="convention-list">
      <li>
        <code>error.tsx</code>
        <span>Framework default error page for all React routes</span>
      </li>
      <li>
        <code>ReactHome.error.tsx</code>
        <span>Page-specific error override for this page</span>
      </li>
      <li>
        <code>not-found.tsx</code>
        <span>404 page when no React route matches</span>
      </li>
    </ul>

    <h2 className="section-title">How It Works</h2>
    <p className="section-desc">
      When a React component throws during SSR, AbsoluteJS catches the error and
      looks for a matching convention file. It checks for a page-specific error
      file first (e.g. ReactHome.error.tsx), then falls back to the framework
      default (error.tsx). The error component receives the error object as a
      prop so it can display the message.
    </p>

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
