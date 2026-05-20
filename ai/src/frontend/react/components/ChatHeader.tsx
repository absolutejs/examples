type ChatHeaderProps = {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
};

export const ChatHeader = ({
  onToggleSidebar,
  sidebarOpen,
}: ChatHeaderProps) => (
  <header>
    <div className="header-left">
      <button
        className="sidebar-toggle"
        onClick={onToggleSidebar}
        title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        type="button"
      >
        <svg
          fill="none"
          height="16"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="16"
        >
          <rect height="18" rx="2" width="18" x="3" y="3" />
          <line x1="9" x2="9" y1="3" y2="21" />
        </svg>
      </button>
      <a className="logo" href="/">
        <img
          alt="AbsoluteJS"
          height={24}
          src="/assets/png/absolutejs-temp.png"
        />
        AbsoluteJS
      </a>
    </div>
    <nav>
      <a className="active" href="/">
        React
      </a>
      <a href="/svelte">Svelte</a>
      <a href="/vue">Vue</a>
      <a href="/angular">Angular</a>
      <a href="/html">HTML</a>
      <a href="/htmx">HTMX</a>
    </nav>
  </header>
);
