import { defineStore } from "pinia";

// A pinia store: state lives outside any single component, so any
// component anywhere in the tree can read and mutate it reactively
// without prop-drilling. The store is registered globally on the app
// when setupApp runs `app.use(createPinia())`.
export const useCartStore = defineStore("cart", {
  state: () => ({
    items: [] as Array<{ id: string; label: string }>,
  }),
  actions: {
    add(item: { id: string; label: string }) {
      this.items.push(item);
    },
    remove(id: string) {
      this.items = this.items.filter((entry) => entry.id !== id);
    },
    clear() {
      this.items = [];
    },
  },
  getters: {
    count(state) {
      return state.items.length;
    },
  },
});
