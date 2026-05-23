import { useCallback, useEffect, useState } from "react";
import { fetchAuthIdentities } from "../../shared/authClient";
import type { AuthIdentityPayload } from "../../shared/types";

export const useAuthIdentities = (enabled: boolean) => {
  const [payload, setPayload] = useState<AuthIdentityPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPayload(await fetchAuthIdentities());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Failed to load identities",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      void refresh();
    }
  }, [enabled, refresh]);

  return { error, loading, payload, refresh, setPayload };
};
