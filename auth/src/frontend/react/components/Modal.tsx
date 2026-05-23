import { ReactNode, useEffect, useRef } from "react";

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
};

export const Modal = ({ children, onClose, open }: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      className="auth-modal"
      onCancel={onClose}
      onClose={onClose}
      ref={dialogRef}
    >
      {children}
    </dialog>
  );
};
