type ToastProps = {
  message: string;
  onDismiss: () => void;
  tone: "success" | "error" | "info";
};

export const Toast = ({ message, onDismiss, tone }: ToastProps) => (
  <div className={tone === "info" ? "toast" : `toast toast--${tone}`}>
    <span>{message}</span>
    <button
      aria-label="Dismiss notification"
      className="toast__close"
      onClick={onDismiss}
      type="button"
    >
      ×
    </button>
  </div>
);
