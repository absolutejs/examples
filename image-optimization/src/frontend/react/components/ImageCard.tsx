import type { ReactNode } from "react";

type ImageCardProps = {
  image: ReactNode;
  title: string;
  description: string;
  metaLabel: string;
  metaValue: string;
};

export const ImageCard = ({
  image,
  title,
  description,
  metaLabel,
  metaValue,
}: ImageCardProps) => (
  <div className="image-card">
    <div className="image-wrapper">{image}</div>
    <div className="card-body">
      <div className="card-title">{title}</div>
      <div className="card-desc">{description}</div>
    </div>
    <div className="card-meta">
      <span>
        {metaLabel}: <code>{metaValue}</code>
      </span>
    </div>
  </div>
);
