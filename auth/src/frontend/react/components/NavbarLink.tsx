import { Link } from "react-router";

type NavbarLinkProps = {
  basePath: string;
  label: string;
  onNavigate?: () => void;
  path: string;
  pathname: string;
};

export const NavbarLink = ({
  basePath,
  label,
  onNavigate,
  path,
  pathname,
}: NavbarLinkProps) => (
  <Link
    aria-current={
      pathname === (path === "" ? basePath : `${basePath}/${path}`)
        ? "page"
        : undefined
    }
    className="navbar__link"
    onClick={onNavigate}
    to={path === "" ? basePath : `${basePath}/${path}`}
  >
    {label}
  </Link>
);
