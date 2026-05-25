type MergeRequestCardProps = {
  busy: boolean;
  conflictLabel: string;
  onDismiss: () => void;
  onMerge: () => void;
  subject: string;
};

export const MergeRequestCard = ({
  busy,
  conflictLabel,
  onDismiss,
  onMerge,
  subject,
}: MergeRequestCardProps) => (
  <div className="entity card--danger">
    <div className="entity__meta">
      <span className="entity__title">{conflictLabel} conflict</span>
      <span className="entity__sub">Subject {subject}</span>
    </div>
    <div className="entity__actions">
      <button
        className="btn btn--primary btn--sm"
        disabled={busy}
        onClick={onMerge}
        type="button"
      >
        Merge
      </button>
      <button
        className="btn btn--ghost btn--sm"
        disabled={busy}
        onClick={onDismiss}
        type="button"
      >
        Dismiss
      </button>
    </div>
  </div>
);
