<script lang="ts">
// Escape hatch demo: this page uses BOTH `routes` (declarative routing)
// and `setupApp` (escape hatch for plugins that need app.use). The
// routes get the AbsoluteJS auto-router treatment. The setupApp hook
// installs vue-i18n on the same `app` and resolves the user's locale
// from the URL before SSR streams.
import { defineRoutes, defineVueSetupApp } from "@absolutejs/absolute/vue";
import { createI18n } from "vue-i18n";
import En from "../components/i18n/En.vue";
import Es from "../components/i18n/Es.vue";
import Ja from "../components/i18n/Ja.vue";

export const routes = defineRoutes([
  { component: En, path: "/vue-i18n" },
  { component: En, path: "/vue-i18n/en" },
  { component: Es, path: "/vue-i18n/es" },
  { component: Ja, path: "/vue-i18n/ja" },
]);

const messages = {
  en: {
    headline: "Internationalization",
    body: "Switch locales using the links below. The translation runtime is installed via the page's setupApp hook — AbsoluteJS doesn't know vue-i18n exists.",
    learnMore: "Learn more about vue-i18n",
  },
  es: {
    headline: "Internacionalización",
    body: "Cambia de idioma con los enlaces de abajo. El runtime de traducciones se instala mediante el hook setupApp de la página — AbsoluteJS no sabe que vue-i18n existe.",
    learnMore: "Más información sobre vue-i18n",
  },
  ja: {
    headline: "国際化",
    body: "下のリンクで言語を切り替えます。翻訳ランタイムはページの setupApp フックを通じてインストールされます — AbsoluteJS は vue-i18n の存在を知りません。",
    learnMore: "vue-i18n の詳細",
  },
};

const localeFromUrl = (url: string) => {
  if (url.includes("/es")) return "es";
  if (url.includes("/ja")) return "ja";

  return "en";
};

export const setupApp = defineVueSetupApp((app, { router, url }) => {
  // The vue-router instance is already in ctx.router (because we
  // exported `routes`). Here we just install vue-i18n alongside it —
  // setupApp is the escape hatch for any Vue plugin that needs
  // app.use() before mount.
  const i18n = createI18n({
    fallbackLocale: "en",
    legacy: false,
    locale: localeFromUrl(url),
    messages,
  });
  app.use(i18n);

  // Sync the active locale with the URL on every SPA route change.
  // setupApp runs once at mount; without this guard the locale would
  // stay frozen at whatever the initial URL implied. ctx.router is the
  // live vue-router instance the auto-wrapper installed, so user code
  // here can register guards / plugins / scrollBehavior overrides etc.
  router?.beforeEach((to) => {
    const { path } = to as { path: string };
    i18n.global.locale.value = localeFromUrl(
      path,
    ) as typeof i18n.global.locale.value;
  });
});
</script>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { RouterLink, RouterView, useRoute } from "vue-router";
import Nav from "../components/Nav.vue";

defineProps<{
  cssPath?: string;
}>();

const { t, locale } = useI18n();
const route = useRoute();
</script>

<template>
  <Nav active="vue" vueVariant="i18n" />

  <main>
    <div class="page-title">
      <img alt="Vue" height="32" src="/assets/svg/vue-logo.svg" />
      <h1>Vue + vue-i18n</h1>
      <span class="badge">setupApp escape hatch</span>
    </div>

    <p class="section-desc">
      <code>routes</code> handles routing. <code>setupApp</code> handles
      the rest. This page exports both — AbsoluteJS auto-installs the
      router, and your <code>setupApp</code> runs after, with the live
      router in <code>ctx.router</code>, to install
      <code>vue-i18n</code> with the locale derived from the URL.
    </p>

    <div class="portal-state">
      <span>
        Active locale: <strong>{{ locale }}</strong>
      </span>
      <span>
        Path: <strong>{{ route.path }}</strong>
      </span>
    </div>

    <div class="portal-layout">
      <aside class="portal-sidebar">
        <RouterLink
          :class="{ active: locale === 'en' }"
          to="/vue-i18n/en"
        >
          English
        </RouterLink>
        <RouterLink
          :class="{ active: locale === 'es' }"
          to="/vue-i18n/es"
        >
          Español
        </RouterLink>
        <RouterLink
          :class="{ active: locale === 'ja' }"
          to="/vue-i18n/ja"
        >
          日本語
        </RouterLink>
      </aside>
      <section class="portal-content">
        <h2>{{ t("headline") }}</h2>
        <p>{{ t("body") }}</p>
        <p>
          <a
            href="https://vue-i18n.intlify.dev/"
            rel="noopener noreferrer"
            target="_blank"
          >
            {{ t("learnMore") }} →
          </a>
        </p>
        <RouterView />
      </section>
    </div>

    <p class="footer">
      <RouterLink to="/vue">← Back to Vue SPA</RouterLink>
    </p>
  </main>
</template>
