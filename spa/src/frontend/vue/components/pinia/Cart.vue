<script setup lang="ts">
import { useCartStore } from "./cartStore";

const cart = useCartStore();
</script>

<template>
  <div>
    <h2>Cart ({{ cart.count }})</h2>
    <p v-if="cart.items.length === 0">
      Empty. Visit <code>Catalog</code> to add items — both views read
      from the same pinia store, so navigation back and forth preserves
      whatever you put in.
    </p>
    <ul v-else class="cart">
      <li v-for="item in cart.items" :key="item.id">
        <span>{{ item.label }}</span>
        <button @click="cart.remove(item.id)">Remove</button>
      </li>
    </ul>
    <button v-if="cart.items.length > 0" @click="cart.clear()">
      Clear cart
    </button>
  </div>
</template>
