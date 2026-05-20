export type SlotData = {
  delayMs: number;
  label: string;
  resolveOrder: string;
  resolvedAt: string;
};

type ResolvedCardProps = {
  data: SlotData;
  declaredOrder: string;
};

export const ResolvedCard = ({ data, declaredOrder }: ResolvedCardProps) => (
  <article className="stream-card stream-card-react">
    <div className="stream-header">
      <img alt="React" height={20} src="/assets/svg/react.svg" />
      <span>{data.label}</span>
    </div>
    <div className="stream-meta">
      <span>Declared {declaredOrder}</span>
      <span>Resolved {data.resolveOrder}</span>
      <span>{data.delayMs}ms</span>
      <span>SuspenseSlot</span>
    </div>
    <p className="stream-desc">
      Authored as React elements and rendered to streamed HTML on the server.
    </p>
    <p className="stream-timestamp">
      <strong>Resolved at</strong> {data.resolvedAt}
    </p>
  </article>
);
