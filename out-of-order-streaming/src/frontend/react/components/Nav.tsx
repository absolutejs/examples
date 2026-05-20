type Framework = "react" | "svelte" | "vue" | "angular" | "html" | "htmx";
type Mode = "raw" | "framework";

type NavProps = {
  activeFramework: Framework;
  activeMode?: Mode;
};

const rawFrameworkLinks = {
  angular: "/angular",
  html: "/html",
  htmx: "/htmx",
  react: "/",
  svelte: "/svelte",
  vue: "/vue",
} as const;

const nativeFrameworkLinks = {
  angular: "/angular-framework",
  html: "/html",
  htmx: "/htmx",
  react: "/react-framework",
  svelte: "/svelte-framework",
  vue: "/vue-framework",
} as const;

export const Nav = ({ activeFramework, activeMode = "raw" }: NavProps) => {
  const isRawActive = (framework: Framework) =>
    activeMode === "raw" && activeFramework === framework;
  const isFrameworkActive = (framework: Framework) =>
    activeMode === "framework" && activeFramework === framework;

  return (
    <header>
      <a className="logo" href="/">
        <img
          alt="AbsoluteJS"
          height={24}
          src="/assets/png/absolutejs-temp.png"
        />
        AbsoluteJS
      </a>
      <div className="nav-stack">
        <nav className="nav-row">
          <span className="nav-label">Raw Slots</span>
          <a
            className={isRawActive("react") ? "active" : ""}
            href={rawFrameworkLinks.react}
          >
            React
          </a>
          <a
            className={isRawActive("svelte") ? "active" : ""}
            href={rawFrameworkLinks.svelte}
          >
            Svelte
          </a>
          <a
            className={isRawActive("vue") ? "active" : ""}
            href={rawFrameworkLinks.vue}
          >
            Vue
          </a>
          <a
            className={isRawActive("angular") ? "active" : ""}
            href={rawFrameworkLinks.angular}
          >
            Angular
          </a>
          <a
            className={isRawActive("html") ? "active" : ""}
            href={rawFrameworkLinks.html}
          >
            HTML
          </a>
          <a
            className={isRawActive("htmx") ? "active" : ""}
            href={rawFrameworkLinks.htmx}
          >
            HTMX
          </a>
        </nav>
        <nav className="nav-row nav-row-secondary">
          <span className="nav-label">Framework Primitives</span>
          <a
            className={isFrameworkActive("react") ? "active" : ""}
            href={nativeFrameworkLinks.react}
          >
            React
          </a>
          <a
            className={isFrameworkActive("svelte") ? "active" : ""}
            href={nativeFrameworkLinks.svelte}
          >
            Svelte
          </a>
          <a
            className={isFrameworkActive("vue") ? "active" : ""}
            href={nativeFrameworkLinks.vue}
          >
            Vue
          </a>
          <a
            className={isFrameworkActive("angular") ? "active" : ""}
            href={nativeFrameworkLinks.angular}
          >
            Angular
          </a>
        </nav>
      </div>
    </header>
  );
};
