import { useState } from "react";
import { deleteAccount } from "../../shared/authClient";
import { Modal } from "./Modal";
import { useToast } from "./toast/ToastProvider";

export const DeleteAccountSection = ({
  onDeleted,
}: {
  onDeleted: () => void;
}) => {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setConfirm("");
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteAccount();
      addToast("Account deleted", "success");
      close();
      onDeleted();
    } catch (caught) {
      addToast(
        caught instanceof Error ? caught.message : "Delete failed",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card card--danger text-left">
      <h2 className="card__title">Delete account</h2>
      <p className="muted">
        Permanently removes your user, all linked identities, and any connector
        grants. This cannot be undone.
      </p>
      <button
        className="btn btn--danger"
        onClick={() => setOpen(true)}
        type="button"
      >
        Delete account
      </button>

      <Modal onClose={close} open={open}>
        <h3 className="auth-modal__title">Delete your account?</h3>
        <p className="auth-modal__body">
          Type <strong>DELETE</strong> to confirm. This removes every identity
          and grant tied to your account.
        </p>
        <input
          className="confirm-input"
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="DELETE"
          value={confirm}
        />
        <div className="auth-modal__actions">
          <button className="btn btn--ghost" onClick={close} type="button">
            Cancel
          </button>
          <button
            className="btn btn--danger"
            disabled={confirm !== "DELETE" || busy}
            onClick={handleDelete}
            type="button"
          >
            Delete account
          </button>
        </div>
      </Modal>
    </div>
  );
};
