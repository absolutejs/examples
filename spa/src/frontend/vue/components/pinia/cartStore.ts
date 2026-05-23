import { defineStore } from "pinia";

// A pinia store: state lives outside any single component, so any
// component anywhere in the tree can read and mutate it reactively
// without prop-drilling. The store is registered globally on the app
// when setupApp runs `app.use(createPinia())`.
export const useCartStore = defineStore("cart", {
  actions: {
    add(item: { id: string; label: string }) {
      this.items.push(item);
    },
    clear() {
      this.items = [];
    },
    remove(id: string) {
      this.items = this.items.filter((entry) => entry.id !== id);
    },
  },
  getters: {
    count(state) {
      return state.items.length;
    },
  },
  state: () => ({
    items: [] as Array<{ id: string; label: string }>,
  }),
});
