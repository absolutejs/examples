export const Home = () => (
  <div>
    <h2>Home</h2>
    <p>
      The default sub-route. Click the links in the sidebar — the URL updates,
      this content swaps, and the sidebar + click counter stay mounted.
    </p>
    <p>
      Refresh the page on any sub-route. The server-rendered initial HTML
      already shows the matching view because the request URL is forwarded to{" "}
      <code>{"<StaticRouter>"}</code>.
    </p>
  </div>
);
