import { ref } from "vue";
import { TOAST_DURATION } from "../../../constants";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

const toasts = ref<ToastItem[]>([]);

export const useToast = () => {
  const removeToast = (id: number) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  };

  const addToast = (message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.random();
    toasts.value = [...toasts.value, { id, message, tone }];
    setTimeout(() => removeToast(id), TOAST_DURATION);
  };

  return { addToast, removeToast, toasts };
};
