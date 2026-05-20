type FallbackCardProps = {
  declaredOrder: string;
  expectedResolveOrder: string;
  label: string;
};

export const FallbackCard = ({
  declaredOrder,
  expectedResolveOrder,
  label,
}: FallbackCardProps) => (
  <article className="stream-card stream-card-react stream-card-fallback">
    <div className="stream-header">
      <img alt="React" height={20} src="/assets/svg/react.svg" />
      <span>{label}</span>
    </div>
    <div className="stream-meta">
      <span>Declared {declaredOrder}</span>
      <span>Expected {expectedResolveOrder}</span>
      <span>Fallback</span>
      <span>SuspenseSlot</span>
    </div>
    <p className="stream-desc">
      Waiting for server to stream resolved markup into this slot.
    </p>
    <div className="stream-timestamp-skeleton" />
  </article>
);
