import { defineStore } from "pinia";
import { computed, ref } from "vue";

type CartItem = { id: string; label: string };

// A pinia store: state lives outside any single component, so any
// component anywhere in the tree can read and mutate it reactively
// without prop-drilling. The store is registered globally on the app
// when setupApp runs `app.use(createPinia())`. Written as a setup store:
// refs are its state, computeds its getters, functions its actions.
export const useCartStore = defineStore("cart", () => {
  const items = ref<CartItem[]>([]);
  const count = computed(() => items.value.length);

  const add = (item: CartItem) => {
    items.value.push(item);
  };
  const clear = () => {
    items.value = [];
  };
  const remove = (id: string) => {
    items.value = items.value.filter((entry) => entry.id !== id);
  };

  return { add, clear, count, items, remove };
});
