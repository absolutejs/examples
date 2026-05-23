import { useEffect, useState } from "react";
import { fetchSavedIntakes } from "../../../shared/browser";
import type { SavedIntake } from "../../../types/domain";

const SAVED_INTAKES_INTERVAL_MS = 4_000;

export const useSavedIntakes = () => {
  const [savedIntakes, setSavedIntakes] = useState<SavedIntake[]>([]);

  useEffect(() => {
    const refresh = () => {
      void fetchSavedIntakes().then(setSavedIntakes);
    };

    refresh();
    const intervalId = window.setInterval(refresh, SAVED_INTAKES_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return savedIntakes;
};
