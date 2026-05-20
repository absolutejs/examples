<script setup lang="ts">
import styles from "./CssModulesCard.module.scss";
</script>

<template>
  <article :class="styles.card">
    <span :class="styles.label">CSS Modules</span>
    <h2 :class="styles.title">Locally scoped</h2>
    <p :class="styles.description">
      Class names from
      <code>CssModulesCard.module.scss</code> are rewritten at build time so
      <code>{{ ".card" }}</code> here can't collide with anything else on the
      page.
    </p>
    <ul :class="styles.tokenList">
      <li :class="styles.token">
        <span :class="styles.tokenKey">styles.card</span>
        <span :class="styles.tokenValue">{{ styles.card }}</span>
      </li>
      <li :class="styles.token">
        <span :class="styles.tokenKey">styles.title</span>
        <span :class="styles.tokenValue">{{ styles.title }}</span>
      </li>
      <li :class="styles.token">
        <span :class="styles.tokenKey">:export accent</span>
        <span :class="styles.tokenValue">{{ styles.accent }}</span>
      </li>
    </ul>
  </article>
</template>
