type NavProps = {
  active?: string;
};

export const Nav = ({ active }: NavProps) => (
  <header>
    <a className="logo" href="/">
      <img alt="AbsoluteJS" height={24} src="/assets/png/absolutejs-temp.png" />
      AbsoluteJS
    </a>
    <nav>
      <a className={active === "react" ? "active" : ""} href="/react">
        React
      </a>
      <a className={active === "svelte" ? "active" : ""} href="/svelte">
        Svelte
      </a>
      <a className={active === "vue" ? "active" : ""} href="/vue">
        Vue
      </a>
      <a className={active === "angular" ? "active" : ""} href="/angular">
        Angular
      </a>
    </nav>
  </header>
);
