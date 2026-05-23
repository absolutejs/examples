import { useCallback, useEffect, useState } from "react";
import { fetchLinkedProviders } from "../../shared/authClient";
import type { LinkedProviderPayload } from "../../shared/types";

export const useLinkedProviders = (enabled: boolean) => {
  const [payload, setPayload] = useState<LinkedProviderPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPayload(await fetchLinkedProviders());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to load linked providers",
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
