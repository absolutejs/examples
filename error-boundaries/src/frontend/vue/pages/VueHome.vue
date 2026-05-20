<script setup lang="ts">
// VueHome renders normally to demonstrate the working state
</script>

<template>
  <header>
    <a class="logo" href="/"
      ><img
        alt="AbsoluteJS"
        height="20"
        src="/assets/png/absolutejs-temp.png"
      />
      AbsoluteJS</a
    >
    <nav>
      <div class="nav-row">
        <a href="/">Home</a>
        <a href="/react">React</a>
        <a href="/svelte">Svelte</a>
        <a class="active" href="/vue">Vue</a>
        <a href="/angular">Angular</a>
      </div>
      <div class="nav-row">
        <a class="notfound" href="/this-page-does-not-exist">404</a>
        <a class="broken" href="/broken-react">Broken React</a>
        <a class="broken" href="/broken-svelte">Broken Svelte</a>
        <a class="broken" href="/broken-vue">Broken Vue</a>
        <a class="broken" href="/broken-angular">Broken Angular</a>
      </div>
    </nav>
  </header>

  <main>
    <div class="page-title">
      <h1>Vue</h1>
      <span class="badge">Error Boundaries</span>
    </div>

    <p class="section-desc">
      This page renders normally. Visit
      <a class="back-link" href="/broken-vue">/broken-vue</a>
      to trigger an SSR error and see the error boundary in action.
    </p>

    <h2 class="section-title">Vue Convention Files</h2>
    <p class="section-desc">
      These files are detected automatically during the build and used as
      fallback UI when SSR fails.
    </p>

    <ul class="convention-list">
      <li>
        <code>error.vue</code>
        <span>Framework default error page for all Vue routes</span>
      </li>
      <li>
        <code>not-found.vue</code>
        <span>404 page when no Vue route matches</span>
      </li>
    </ul>

    <h2 class="section-title">How It Works</h2>
    <p class="section-desc">
      When a Vue component throws during SSR, AbsoluteJS catches the error and
      renders the error.vue convention file instead. The error component
      receives the error object as a prop so it can display the message.
    </p>

    <p class="footer">
      <img alt="" src="/assets/png/absolutejs-temp.png" />
      Powered by
      <a href="https://absolutejs.com" target="_blank" rel="noopener noreferrer"
        >AbsoluteJS</a
      >
    </p>
  </main>
</template>
