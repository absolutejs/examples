type RouteCardProps = {
  href: string;
  title: string;
  path: string;
  description: string;
  danger?: boolean;
};

export const RouteCard = ({
  href,
  title,
  path,
  description,
  danger,
}: RouteCardProps) => (
  <a className={`route-card${danger ? " danger" : ""}`} href={href}>
    <div className="card-title">{title}</div>
    <div className="card-path">{path}</div>
    <div className="card-desc">{description}</div>
  </a>
);
