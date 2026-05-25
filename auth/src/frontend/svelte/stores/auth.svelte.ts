import { fetchAuthStatus, signOut } from "../../shared/authClient";
import type { AuthUser } from "../../shared/types";

export const authState = $state<{ loading: boolean; user: AuthUser | null }>({
  loading: true,
  user: null,
});

let started = false;

const refreshAuth = async () => {
  authState.loading = true;
  authState.user = await fetchAuthStatus();
  authState.loading = false;
};
export const signOutUser = async () => {
  await signOut();
  authState.user = null;
};
export const startAuth = () => {
  if (started || typeof window === "undefined") {
    return;
  }
  started = true;
  void refreshAuth();
};
