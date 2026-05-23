import { useEffect, useState } from "react";
import { fetchAuthStatus, signOut } from "../../shared/authClient";
import type { AuthUser } from "../../shared/types";

export const useAuthStatus = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setUser(await fetchAuthStatus());
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { handleSignOut, loading, refresh, setUser, user };
};
