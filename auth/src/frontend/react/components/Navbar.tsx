import { useState } from "react";
import { Link, useLocation } from "react-router";
import { NAV_ITEMS } from "../../shared/navData";
import type { AuthUser } from "../../shared/types";
import { NavbarLink } from "./NavbarLink";

type NavbarProps = {
  basePath: string;
  onSignOut: () => void;
  user: AuthUser | null;
};

export const Navbar = ({ basePath, onSignOut, user }: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  const renderLinks = (onNavigate?: () => void) =>
    NAV_ITEMS.map((item) => (
      <NavbarLink
        basePath={basePath}
        key={item.path}
        label={item.label}
        onNavigate={onNavigate}
        path={item.path}
        pathname={pathname}
      />
    ));

  const greeting = user?.email ?? user?.first_name ?? "Account";

  return (
    <header className="navbar">
      <Link className="navbar__brand" to={basePath}>
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Absolute Auth
      </Link>

      <nav className="navbar__links">{renderLinks()}</nav>

      <div className="navbar__user">
        {user && <span className="muted">{greeting}</span>}
        {user ? (
          <button
            className="btn btn--ghost btn--sm"
            onClick={onSignOut}
            type="button"
          >
            Sign out
          </button>
        ) : (
          <Link className="btn btn--primary btn--sm" to={basePath}>
            Sign in
          </Link>
        )}
        <button
          aria-label="Toggle menu"
          className="hamburger"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <span className="hamburger__bar" />
          <span className="hamburger__bar" />
          <span className="hamburger__bar" />
        </button>
      </div>

      <div className={menuOpen ? "hamburger-menu is-open" : "hamburger-menu"}>
        <div className="hamburger-menu__header">
          <strong>Menu</strong>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            Close
          </button>
        </div>
        {renderLinks(() => setMenuOpen(false))}
        {user && (
          <button
            className="btn btn--ghost"
            onClick={() => {
              setMenuOpen(false);
              onSignOut();
            }}
            type="button"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
};
