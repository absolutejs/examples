type NavProps = {
  active?: string;
};

export const Nav = ({ active }: NavProps) => (
  <header>
    <a className="logo" href="/">
      <img alt="AbsoluteJS" height={20} src="/assets/png/absolutejs-temp.png" />
      AbsoluteJS
    </a>
    <nav>
      <div className="nav-row">
        <a className={active === "/" ? "active" : ""} href="/">
          Home
        </a>
        <a className={active === "/react" ? "active" : ""} href="/react">
          React
        </a>
        <a className={active === "/svelte" ? "active" : ""} href="/svelte">
          Svelte
        </a>
        <a className={active === "/vue" ? "active" : ""} href="/vue">
          Vue
        </a>
        <a className={active === "/angular" ? "active" : ""} href="/angular">
          Angular
        </a>
      </div>
      <div className="nav-row">
        <a
          className={active === "/missing" ? "active notfound" : "notfound"}
          href="/this-page-does-not-exist"
        >
          404
        </a>
        <a
          className={active === "/broken-react" ? "active broken" : "broken"}
          href="/broken-react"
        >
          Broken React
        </a>
        <a
          className={active === "/broken-svelte" ? "active broken" : "broken"}
          href="/broken-svelte"
        >
          Broken Svelte
        </a>
        <a
          className={active === "/broken-vue" ? "active broken" : "broken"}
          href="/broken-vue"
        >
          Broken Vue
        </a>
        <a
          className={active === "/broken-angular" ? "active broken" : "broken"}
          href="/broken-angular"
        >
          Broken Angular
        </a>
      </div>
    </nav>
  </header>
);
