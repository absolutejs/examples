export const Nav = () => (
  <header>
    <a className="logo" href="/">
      <img alt="AbsoluteJS" height={24} src="/assets/png/absolutejs-temp.png" />
      AbsoluteJS
    </a>
    <nav>
      <a className="active" href="/">
        React
      </a>
      <a href="/svelte">Svelte</a>
      <a href="/vue">Vue</a>
      <a href="/angular">Angular</a>
      <a href="/html">HTML</a>
    </nav>
  </header>
);
