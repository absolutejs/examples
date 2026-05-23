import { ref } from "vue";
import { fetchAuthStatus, signOut } from "../../shared/authClient";
import type { AuthUser } from "../../shared/types";

const user = ref<AuthUser | null>(null);
const loading = ref(true);
let started = false;

export const useAuth = () => {
  const refresh = async () => {
    loading.value = true;
    user.value = await fetchAuthStatus();
    loading.value = false;
  };

  const handleSignOut = async () => {
    await signOut();
    user.value = null;
  };

  if (!started && typeof window !== "undefined") {
    started = true;
    void refresh();
  }

  return { handleSignOut, loading, refresh, user };
};
