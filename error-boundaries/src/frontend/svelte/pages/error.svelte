<script lang="ts">
  import Head from "@absolutejs/absolute/svelte/components/Head.svelte";
  import type { ErrorPageProps } from "@absolutejs/absolute";

  let { message }: ErrorPageProps = $props();
</script>

<Head title="Error - Svelte" />

<header>
  <a class="logo" href="/"
    ><img alt="AbsoluteJS" height="20" src="/assets/png/absolutejs-temp.png" /> AbsoluteJS</a
  >
  <nav>
    <div class="nav-row">
      <a href="/">Home</a>
      <a href="/react">React</a>
      <a href="/svelte">Svelte</a>
      <a href="/vue">Vue</a>
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
    <h1>Something Went Wrong</h1>
    <span class="error-badge">error.svelte</span>
  </div>

  <p class="section-desc">
    This is the <strong>framework default</strong> Svelte error page. It renders when
    a Svelte page throws during SSR.
  </p>

  <div class="error-box">
    <pre>{message}</pre>
  </div>

  <a class="back-link" href="/">Back to Home</a>

  <p class="footer">
    <img alt="" src="/assets/png/absolutejs-temp.png" />
    Powered by
    <a href="https://absolutejs.com" target="_blank" rel="noopener noreferrer"
      >AbsoluteJS</a
    >
  </p>
</main>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  :global(a) {
    color: inherit;
    text-decoration: none;
  }
  :global(img) {
    display: block;
    max-width: 100%;
    height: auto;
  }
  :global(html),
  :global(body) {
    height: 100%;
  }
  :global(body) {
    background: #0a0a0f;
    color: #e4e4e7;
    font-family: "Inter", system-ui, sans-serif;
    line-height: 1.6;
    display: flex;
    flex-direction: column;
  }
  header {
    position: sticky;
    line-height: normal;
    top: 0;
    z-index: 100;
    background: rgba(255, 255, 255, 0.02);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.75rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .logo {
    color: #e4e4e7;
    font-weight: 600;
    font-size: 1rem;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    letter-spacing: -0.02em;
  }
  .logo img {
    height: 20px;
    width: auto;
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .nav-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.25rem;
  }
  nav a {
    color: #71717a;
    text-decoration: none;
    padding: 0.4rem 0.8rem;
    border-radius: 2rem;
    font-size: 0.8rem;
    background: rgba(255, 255, 255, 0.04);
    transition: all 0.2s ease;
    text-align: center;
    white-space: nowrap;
  }
  nav a:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #e4e4e7;
  }
  nav a.active {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  nav a.broken {
    background: rgba(239, 68, 68, 0.08);
    color: #f87171;
  }
  nav a.broken:hover {
    background: rgba(239, 68, 68, 0.15);
  }
  nav a.notfound {
    background: rgba(251, 191, 36, 0.08);
    color: #fbbf24;
  }
  nav a.notfound:hover {
    background: rgba(251, 191, 36, 0.15);
  }
  main {
    max-width: 720px;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
    margin: 0 auto;
    padding: 0 1.5rem;
  }
  main > :global(*:first-child) {
    margin-top: auto;
  }
  .page-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .page-title h1 {
    font-size: 1.75rem;
    font-weight: 700;
  }
  .error-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    font-family: monospace;
  }
  .section-desc {
    color: #71717a;
    margin-bottom: 1.5rem;
    line-height: 1.7;
  }
  .section-desc :global(strong) {
    color: #e4e4e7;
  }
  .error-box {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 0.75rem;
    padding: 1rem 1.25rem;
    margin-bottom: 2rem;
    overflow-x: auto;
  }
  .error-box pre {
    color: #fca5a5;
    font-size: 0.875rem;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: "Fira Code", "Cascadia Code", monospace;
  }
  .back-link {
    display: inline-block;
    color: #5fbeeb;
    text-decoration: none;
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    background: rgba(95, 190, 235, 0.1);
    border: 1px solid rgba(95, 190, 235, 0.2);
    font-size: 0.9rem;
    transition: background 0.15s;
  }
  .back-link:hover {
    background: rgba(95, 190, 235, 0.18);
  }
  .footer {
    margin-top: auto;
    padding-top: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #52525b;
    font-size: 0.75rem;
    padding-bottom: 2rem;
  }
  .footer :global(img) {
    height: 16px;
    opacity: 0.4;
    width: auto;
  }
  .footer a {
    color: #71717a;
    text-decoration: none;
    transition: color 0.2s;
  }
  .footer a:hover {
    color: #e4e4e7;
  }
</style>
