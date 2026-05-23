<script setup lang="ts">
import { useCartStore } from "./cartStore";

const cart = useCartStore();

const products = [
  { id: "tee", label: "AbsoluteJS Tee" },
  { id: "mug", label: "Bun Mug" },
  { id: "hoodie", label: "Vue Hoodie" },
];
</script>

<template>
  <div>
    <h2>Catalog</h2>
    <p>
      Add an item, then click <code>Cart</code> in the sidebar — the sub-route
      changes but the shared pinia store keeps the same data. The sidebar count
      is wired to the same store too.
    </p>
    <ul class="catalog">
      <li v-for="product in products" :key="product.id">
        <span>{{ product.label }}</span>
        <button @click="cart.add(product)">Add</button>
      </li>
    </ul>
  </div>
</template>
