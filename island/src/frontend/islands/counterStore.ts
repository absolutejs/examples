import { createIslandStore } from "@absolutejs/absolute/islands";

export const counterIslandStore = createIslandStore(
  "counter",
  {
    sharedCount: 0,
  },
  (set) => ({
    incrementShared: () =>
      set((state) => ({
        sharedCount: Number(state.sharedCount ?? 0) + 1,
      })),
    resetShared: () => set({ sharedCount: 0 }),
  }),
);
