import { useEffect, useState } from "react";
import { createSyncSubscriber } from "@absolutejs/sync/client";
import { fetchSavedIntakes } from "../../../shared/browser";
import { VOICE_INTAKES_TOPIC, VOICE_SYNC_PATH } from "../../../constants/sync";
import type { SavedIntake } from "../../../types/domain";

// Reactive instead of polled: load once, then refetch only when the server pushes
// a "voice:intakes" change over @absolutejs/sync's SSE stream. No 4s timer.
export const useSavedIntakes = () => {
  const [savedIntakes, setSavedIntakes] = useState<SavedIntake[]>([]);

  useEffect(() => {
    const refresh = () => {
      void fetchSavedIntakes().then(setSavedIntakes);
    };

    refresh();
    const subscriber = createSyncSubscriber({
      onEvent: refresh,
      topics: [VOICE_INTAKES_TOPIC],
      url: VOICE_SYNC_PATH,
    });

    return () => subscriber.close();
  }, []);

  return savedIntakes;
};
