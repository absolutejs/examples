<script setup lang="ts">
import { Island } from "@absolutejs/absolute/vue";
import { TypedVueIsland } from "../../islands/registry";
import Nav from "../components/Nav.vue";
</script>

<template>
  <Nav />
  <main>
    <div class="page-title">
      <img alt="Vue" height="32" src="/assets/svg/vue-logo.svg" />
      <h1>Vue</h1>
      <span class="badge">Islands</span>
    </div>

    <p class="section-desc">
      Each island is an independent component that hydrates on its own schedule.
      Islands from different frameworks share state through a common store.
    </p>

    <h2 class="section-title">Typed Islands</h2>
    <p class="section-desc">
      Registry-bound islands with full type inference for framework, component,
      and props.
    </p>

    <h3 class="subsection-title">
      <span class="hydrate-label">hydrate="load"</span>
      Eager
    </h3>
    <section class="grid">
      <TypedVueIsland
        component="ReactCounter"
        framework="react"
        hydrate="load"
        :props="{ initialCount: 0, label: 'React island' }"
      />
      <TypedVueIsland
        component="SvelteCounter"
        framework="svelte"
        hydrate="load"
        :props="{ initialCount: 0, label: 'Svelte island' }"
      />
      <TypedVueIsland
        component="VueCounter"
        framework="vue"
        hydrate="load"
        :props="{ initialCount: 0, label: 'Vue island' }"
      />
      <TypedVueIsland
        component="AngularCounter"
        framework="angular"
        hydrate="load"
        :props="{ initialCount: 0, label: 'Angular island' }"
      />
    </section>

    <h3 class="subsection-title">
      <span class="hydrate-label">hydrate="idle"</span>
      Idle
    </h3>
    <section class="grid">
      <TypedVueIsland
        component="ReactCounter"
        framework="react"
        hydrate="idle"
        :props="{ initialCount: 0, label: 'React island' }"
      />
      <TypedVueIsland
        component="SvelteCounter"
        framework="svelte"
        hydrate="idle"
        :props="{ initialCount: 0, label: 'Svelte island' }"
      />
      <TypedVueIsland
        component="VueCounter"
        framework="vue"
        hydrate="idle"
        :props="{ initialCount: 0, label: 'Vue island' }"
      />
      <TypedVueIsland
        component="AngularCounter"
        framework="angular"
        hydrate="idle"
        :props="{ initialCount: 0, label: 'Angular island' }"
      />
    </section>

    <h3 class="subsection-title">
      <span class="hydrate-label">hydrate="visible"</span>
      Visible
    </h3>
    <section class="grid">
      <TypedVueIsland
        component="ReactCounter"
        framework="react"
        hydrate="visible"
        :props="{ initialCount: 0, label: 'React island' }"
      />
      <TypedVueIsland
        component="SvelteCounter"
        framework="svelte"
        hydrate="visible"
        :props="{ initialCount: 0, label: 'Svelte island' }"
      />
      <TypedVueIsland
        component="VueCounter"
        framework="vue"
        hydrate="visible"
        :props="{ initialCount: 0, label: 'Vue island' }"
      />
      <TypedVueIsland
        component="AngularCounter"
        framework="angular"
        hydrate="visible"
        :props="{ initialCount: 0, label: 'Angular island' }"
      />
    </section>

    <h2 class="section-title">Loose Islands</h2>
    <p class="section-desc">
      The loose Island primitive allows dynamic, ad-hoc usage without the
      registry. No type inference — you pass framework and component as strings.
    </p>
    <section class="grid">
      <Island
        component="ReactCounter"
        framework="react"
        :props="{ initialCount: 0, label: 'React island' }"
      />
      <Island
        component="SvelteCounter"
        framework="svelte"
        :props="{ initialCount: 0, label: 'Svelte island' }"
      />
      <Island
        component="VueCounter"
        framework="vue"
        :props="{ initialCount: 0, label: 'Vue island' }"
      />
      <Island
        component="AngularCounter"
        framework="angular"
        :props="{ initialCount: 0, label: 'Angular island' }"
      />
    </section>

    <p class="footer">
      <img alt="" src="/assets/png/absolutejs-temp.png" />
      Powered by
      <a href="https://absolutejs.com" rel="noopener noreferrer" target="_blank"
        >AbsoluteJS</a
      >
    </p>
  </main>
</template>
