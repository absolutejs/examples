<script setup lang="ts">
import CssModulesCard from "../components/CssModulesCard.vue";

type StyleKind = "less" | "scss" | "stylus" | "tailwind";

const props = defineProps<{
  style: StyleKind;
}>();

const frameworks = [
  ["react", "React"],
  ["svelte", "Svelte"],
  ["vue", "Vue"],
  ["angular", "Angular"],
  ["html", "HTML"],
  ["htmx", "HTMX"],
] as const;

const styleRows = [
  ["tailwind", "Tailwind"],
  ["scss", "SCSS"],
  ["less", "Less"],
  ["stylus", "Stylus"],
] as const;

const getStylePath = (framework: string, styleId: string) => {
  return `/${framework}/${styleId}`;
};

const tailwindLink = (active: boolean) =>
  [
    "rounded-full px-[10px] py-[7px] text-[0.8rem] leading-[normal] no-underline transition-colors",
    active
      ? "bg-[var(--t-nav-link-bg-active)] text-[var(--t-nav-link-active)]"
      : "bg-[var(--t-nav-link-bg)] text-[var(--t-nav-link)] hover:bg-[var(--t-nav-link-bg-hover)] hover:text-[var(--t-nav-link-hover)]",
  ].join(" ");
</script>

<template>
  <div
    v-if="props.style === 'tailwind'"
    class="min-h-screen bg-[var(--t-bg)] text-[var(--t-text)]"
  >
    <header
      class="sticky top-0 z-10 flex items-start justify-between gap-6 border-b border-[var(--t-nav-border)] bg-[var(--t-nav-bg)] px-8 py-3 text-[var(--t-text)] backdrop-blur-[20px] max-[820px]:flex-col max-[820px]:items-stretch max-[820px]:gap-3"
    >
      <a
        class="flex items-center gap-2 text-base font-semibold leading-[normal] text-[var(--t-brand)] no-underline"
        href="/react/tailwind"
      >
        <img
          alt="AbsoluteJS"
          class="h-6 w-auto"
          src="/assets/png/absolutejs-temp.png"
        />
        AbsoluteJS StyleLab
      </a>
      <nav
        class="flex flex-col items-end gap-[0.35rem] max-[820px]:items-stretch"
      >
        <div
          v-for="[styleId, label] in styleRows"
          :key="styleId"
          class="flex flex-wrap items-center justify-end gap-1 max-[820px]:justify-start"
        >
          <span
            :class="
              styleId === props.style
                ? 'mr-[0.35rem] text-[0.76rem] font-semibold uppercase leading-[normal] text-[var(--t-label-active)]'
                : 'mr-[0.35rem] text-[0.76rem] font-semibold uppercase leading-[normal] text-[var(--t-label)]'
            "
            >{{ label }}</span
          >
          <a
            v-for="[framework, frameworkLabel] in frameworks"
            :key="`${styleId}-${framework}`"
            :class="
              tailwindLink(framework === 'vue' && styleId === props.style)
            "
            :href="getStylePath(framework, styleId)"
            >{{ frameworkLabel }}</a
          >
        </div>
      </nav>
    </header>
    <main class="mx-auto my-[42px] w-[min(1040px,calc(100%-32px))]">
      <section class="mb-[26px] grid gap-4 max-xl:pl-10">
        <div class="flex items-center gap-3">
          <img alt="Vue" class="h-12 w-auto" src="/assets/svg/vue-logo.svg" />
          <h1
            class="m-0 text-[2rem] font-semibold leading-none text-[var(--t-text)]"
          >
            Vue
          </h1>
        </div>
        <p
          class="m-0 max-w-[760px] text-lg leading-[1.6] text-[var(--t-muted)]"
        >
          Tailwind styles this route directly in the markup with utility
          classes.
        </p>
      </section>
      <section
        class="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <article
          class="grid min-h-[260px] gap-3 rounded-lg border border-[var(--t-border)] border-l-[6px] border-l-orange-600 bg-[var(--t-surface)] bg-linear-to-br/srgb from-orange-600/15 to-orange-600/5 p-6 shadow-[0_20px_48px_var(--t-card-shadow)]"
        >
          <span
            class="text-[12px] font-extrabold uppercase leading-[normal] text-[var(--t-label)]"
            >Variables</span
          >
          <h2
            class="m-0 text-2xl font-bold leading-[normal] text-[var(--t-label-active)]"
          >
            Design tokens
          </h2>
          <p class="m-0 leading-[1.55] text-[var(--t-muted)]">
            Colors, spacing, shadows, and surfaces come from utility values.
          </p>
          <div class="mt-auto flex gap-2">
            <span
              class="h-8 w-8 rounded-full bg-[#c2410c] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)]"
            ></span
            ><span
              class="h-8 w-8 rounded-full bg-[rgb(241.4504854369_95.7932038835_35.9495145631)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)]"
            ></span
            ><span
              class="h-8 w-8 rounded-full bg-[#7f2a08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)]"
            ></span>
          </div>
        </article>
        <article
          class="grid min-h-[260px] gap-3 rounded-lg border border-[var(--t-border)] border-l-4 border-l-[#2563eb] bg-[var(--t-surface)] bg-linear-to-br/srgb from-[#2563eb]/15 to-[#2563eb]/5 p-6 shadow-[0_20px_48px_var(--t-card-shadow)]"
        >
          <span
            class="text-[12px] font-extrabold uppercase leading-[normal] text-[var(--t-label)]"
            >Mixins</span
          >
          <h2
            class="m-0 text-2xl font-bold leading-[normal] text-[var(--t-label-active)]"
          >
            Reusable patterns
          </h2>
          <p class="m-0 leading-[1.55] text-[var(--t-muted)]">
            Buttons and panels share repeated utility recipes with variant
            classes.
          </p>
          <div class="mt-auto flex gap-2">
            <button
              class="rounded-full min-h-[36px] border border-[rgb(135.1_169.2_244)] bg-[#2563eb] px-[14px] py-0 font-bold leading-[normal] text-white"
              type="button"
            >
              Primary</button
            ><button
              class="rounded-full min-h-[36px] border border-[var(--t-border)] bg-transparent px-[14px] py-0 font-bold leading-[normal] text-[var(--t-text)] hover:bg-[var(--t-surface-2)]"
              type="button"
            >
              Secondary
            </button>
          </div>
        </article>
        <article
          class="grid min-h-[260px] gap-3 rounded-lg border border-[var(--t-border)] border-l-4 border-l-rose-600 bg-[var(--t-surface)] bg-linear-to-br/srgb from-rose-600/15 to-rose-600/5 p-6 shadow-[0_20px_48px_var(--t-card-shadow)]"
        >
          <span
            class="text-[12px] font-extrabold uppercase leading-[normal] text-[var(--t-label)]"
            >Nesting</span
          >
          <h2
            class="m-0 text-2xl font-bold leading-[normal] text-[var(--t-label-active)]"
          >
            Scoped structure
          </h2>
          <ul class="m-0 grid list-none gap-2 p-0">
            <li
              class="flex items-center justify-between rounded-md bg-[var(--t-surface-2)] px-3 py-2"
            >
              <span class="text-[var(--t-muted)]">Parent state</span
              ><strong class="text-[var(--t-text)]">active</strong>
            </li>
            <li
              class="flex items-center justify-between rounded-md bg-[var(--t-surface-2)] px-3 py-2"
            >
              <span class="text-[var(--t-muted)]">Child selector</span
              ><strong class="text-[var(--t-text)]">hover</strong>
            </li>
            <li
              class="flex items-center justify-between rounded-md bg-[var(--t-surface-2)] px-3 py-2"
            >
              <span class="text-[var(--t-muted)]">Inline target</span
              ><strong class="text-[var(--t-text)]">focus</strong>
            </li>
          </ul>
        </article>
        <article
          class="grid min-h-[260px] gap-3 rounded-lg border border-[var(--t-border)] border-l-4 border-l-emerald-600 bg-[var(--t-surface)] bg-linear-to-br/srgb from-emerald-600/15 to-emerald-600/5 p-6 shadow-[0_20px_48px_var(--t-card-shadow)]"
        >
          <span
            class="text-[12px] font-extrabold uppercase leading-[normal] text-[var(--t-label)]"
            >Functions</span
          >
          <h2
            class="m-0 text-2xl font-bold leading-[normal] text-[var(--t-label-active)]"
          >
            Computed output
          </h2>
          <p class="m-0 leading-[1.55] text-[var(--t-muted)]">
            Generated shades and sizing are composed from explicit utilities.
          </p>
          <div class="mt-auto flex h-12 items-end gap-2">
            <span class="h-4 flex-1 rounded-md bg-emerald-300"></span
            ><span class="h-6 flex-1 rounded-md bg-emerald-400"></span
            ><span class="h-8 flex-1 rounded-md bg-emerald-500"></span
            ><span class="h-10 flex-1 rounded-md bg-emerald-600"></span>
          </div>
        </article>
        <article
          class="grid min-h-[260px] gap-3 rounded-lg border border-[var(--t-border)] border-l-4 border-l-fuchsia-600 bg-[var(--t-surface)] bg-linear-to-br/srgb from-fuchsia-600/15 to-fuchsia-600/5 p-6 shadow-[0_20px_48px_var(--t-card-shadow)]"
        >
          <span
            class="text-[12px] font-extrabold uppercase leading-[normal] text-[var(--t-label)]"
            >Responsive rules</span
          >
          <h2
            class="m-0 text-2xl font-bold leading-[normal] text-[var(--t-label-active)]"
          >
            Adaptive layout
          </h2>
          <p class="m-0 leading-[1.55] text-[var(--t-muted)]">
            Breakpoint utilities adjust the grid, spacing, and header rhythm.
          </p>
          <div class="mt-auto grid gap-2">
            <span class="h-3 w-full rounded-full bg-fuchsia-600"></span
            ><span class="h-3 w-3/4 rounded-full bg-fuchsia-500"></span
            ><span class="h-3 w-1/2 rounded-full bg-fuchsia-400"></span>
          </div>
        </article>
        <article
          class="grid min-h-[260px] gap-2 rounded-lg border border-[var(--t-border)] border-l-4 border-l-teal-500 bg-[var(--t-surface)] bg-linear-to-br/srgb from-teal-500/15 to-teal-500/5 px-5 py-[18px] shadow-[0_20px_48px_var(--t-card-shadow)]"
        >
          <span
            class="text-[12px] font-extrabold uppercase leading-[normal] text-[var(--t-label)]"
            >CSS Modules</span
          >
          <h2
            class="m-0 text-xl font-bold leading-[1.2] text-[var(--t-label-active)]"
          >
            Locally scoped
          </h2>
          <p class="m-0 text-[13px] leading-[1.45] text-[var(--t-muted)]">
            Class names from <code>CssModulesCard.module.scss</code> are
            rewritten at build time so <code>.card</code> here can't collide
            with anything else on the page.
          </p>
          <ul class="m-0 mt-auto grid list-none gap-1 p-0">
            <li
              class="flex items-center justify-between gap-[10px] rounded-md bg-[var(--t-surface-2)] px-[10px] py-1 font-mono text-[12px] leading-[1.5]"
            >
              <span class="text-[var(--t-muted)]">styles.card</span>
              <span class="font-semibold text-[#0f8a7d]">card_HXsppQ</span>
            </li>
            <li
              class="flex items-center justify-between gap-[10px] rounded-md bg-[var(--t-surface-2)] px-[10px] py-1 font-mono text-[12px] leading-[1.5]"
            >
              <span class="text-[var(--t-muted)]">styles.title</span>
              <span class="font-semibold text-[#0f8a7d]">title_HXsppQ</span>
            </li>
            <li
              class="flex items-center justify-between gap-[10px] rounded-md bg-[var(--t-surface-2)] px-[10px] py-1 font-mono text-[12px] leading-[1.5]"
            >
              <span class="text-[var(--t-muted)]">:export accent</span>
              <span class="font-semibold text-[#0f8a7d]">#14b8a6</span>
            </li>
          </ul>
        </article>
      </section>
    </main>
    <footer
      class="mx-auto mb-8 flex w-[min(1040px,calc(100%-32px))] items-center justify-center gap-[0.35rem] text-[13px] text-[var(--t-muted)]"
    >
      Powered by
      <a
        class="inline-flex items-center gap-[0.35rem] font-bold text-[var(--t-text)]"
        href="https://absolutejs.com"
      >
        <img
          alt="AbsoluteJS"
          class="h-[18px] w-auto"
          src="/assets/png/absolutejs-temp.png"
        />
        AbsoluteJS
      </a>
    </footer>
  </div>

  <template v-else>
    <header>
      <div class="header-left">
        <a class="logo" href="/react/tailwind">
          <img
            alt="AbsoluteJS"
            height="24"
            src="/assets/png/absolutejs-temp.png"
          />
          AbsoluteJS StyleLab
        </a>
      </div>
      <nav>
        <div
          v-for="[styleId, label] in styleRows"
          :key="styleId"
          class="demo-nav-row"
        >
          <span
            :class="
              styleId === props.style
                ? 'demo-nav-row-label active'
                : 'demo-nav-row-label'
            "
            >{{ label }}</span
          >
          <a
            v-for="[framework, frameworkLabel] in frameworks"
            :key="`${styleId}-${framework}`"
            :class="
              framework === 'vue' && styleId === props.style ? 'active' : ''
            "
            :href="getStylePath(framework, styleId)"
            >{{ frameworkLabel }}</a
          >
        </div>
      </nav>
    </header>

    <main>
      <section class="hero">
        <div class="page-title">
          <img alt="Vue" height="32" src="/assets/svg/vue-logo.svg" />
          <h1>Vue</h1>
        </div>
        <p class="lede">
          AbsoluteJS compiles the selected stylesheet and wires it into this
          page.
        </p>
      </section>
      <section class="feature-grid">
        <article class="feature-card feature-card-primary">
          <span class="feature-label">Variables</span>
          <h2>Design tokens</h2>
          <p>
            Colors, spacing, shadows, and surfaces come from stylesheet values.
          </p>
          <div class="swatch-row">
            <span class="swatch swatch-one"></span>
            <span class="swatch swatch-two"></span>
            <span class="swatch swatch-three"></span>
          </div>
        </article>
        <article class="feature-card feature-card-mixin">
          <span class="feature-label">Mixins</span>
          <h2>Reusable patterns</h2>
          <p>
            Buttons and panels share one reusable recipe with variant inputs.
          </p>
          <div class="button-row">
            <button class="demo-button demo-button-primary" type="button">
              Primary
            </button>
            <button class="demo-button demo-button-secondary" type="button">
              Secondary
            </button>
          </div>
        </article>
        <article class="feature-card feature-card-nesting">
          <span class="feature-label">Nesting</span>
          <h2>Scoped structure</h2>
          <ul class="nested-list">
            <li><span>Parent state</span><strong>active</strong></li>
            <li><span>Child selector</span><strong>hover</strong></li>
            <li><span>Inline target</span><strong>focus</strong></li>
          </ul>
        </article>
        <article class="feature-card feature-card-functions">
          <span class="feature-label">Functions</span>
          <h2>Computed output</h2>
          <p>Generated shades and sizing are produced inside the stylesheet.</p>
          <div class="generated-scale">
            <span></span><span></span><span></span><span></span>
          </div>
        </article>
        <article class="feature-card feature-card-responsive">
          <span class="feature-label">Responsive rules</span>
          <h2>Adaptive layout</h2>
          <p>Breakpoints adjust the grid, spacing, and header rhythm.</p>
          <div class="responsive-bars">
            <span></span><span></span><span></span>
          </div>
        </article>
        <CssModulesCard />
      </section>
    </main>

    <footer class="site-footer">
      Powered by
      <a href="https://absolutejs.com">
        <img
          alt="AbsoluteJS"
          height="18"
          src="/assets/png/absolutejs-temp.png"
        />
        AbsoluteJS
      </a>
    </footer>
  </template>
</template>
