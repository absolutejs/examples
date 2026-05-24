import { TOAST_DURATION } from "../../../constants";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

export const toastState = $state<{ items: ToastItem[] }>({ items: [] });
export const addToast = (message: string, tone: ToastTone = "info") => {
  const id = Date.now() + Math.random();
  toastState.items = [...toastState.items, { id, message, tone }];
  setTimeout(() => removeToast(id), TOAST_DURATION);
};
export const removeToast = (id: number) => {
  toastState.items = toastState.items.filter((item) => item.id !== id);
};
