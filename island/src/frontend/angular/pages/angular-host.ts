import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { Island } from "@absolutejs/absolute/angular";

// This page has no per-request DI context, so the SSR handler's
// `requestContext` is an empty object.
export type Context = Record<string, never>;

@Component({
  imports: [CommonModule, Island],
  selector: "angular-host-page",
  standalone: true,
  template: `
    <header>
      <a href="/angular" class="logo">
        <img
          src="/assets/png/absolutejs-temp.png"
          height="24"
          alt="AbsoluteJS"
        />
        AbsoluteJS
      </a>
      <nav>
        <a href="/">React</a>
        <a href="/svelte">Svelte</a>
        <a href="/vue">Vue</a>
        <a href="/angular" class="active">Angular</a>
        <a href="/html">HTML</a>
        <a href="/htmx">HTMX</a>
      </nav>
    </header>

    <main>
      <div class="page-title">
        <img alt="Angular" height="32" src="/assets/svg/angular.svg" />
        <h1>Angular</h1>
        <span class="badge">Islands</span>
      </div>

      <p class="section-desc">
        Each island is an independent component that hydrates on its own
        schedule. Islands from different frameworks share state through a common
        store.
      </p>

      <h2 class="section-title">Islands</h2>
      <p class="section-desc">
        Angular host pages use the loose Island primitive for all islands.
      </p>

      <h3 class="subsection-title">
        <span class="hydrate-label">hydrate="load"</span>
        Eager
      </h3>
      <section class="grid">
        <absolute-island
          component="ReactCounter"
          framework="react"
          hydrate="load"
          [props]="{ initialCount: 0, label: 'React island' }"
        />
        <absolute-island
          component="SvelteCounter"
          framework="svelte"
          hydrate="load"
          [props]="{ initialCount: 0, label: 'Svelte island' }"
        />
        <absolute-island
          component="VueCounter"
          framework="vue"
          hydrate="load"
          [props]="{ initialCount: 0, label: 'Vue island' }"
        />
        <absolute-island
          component="AngularCounter"
          framework="angular"
          hydrate="load"
          [props]="{ initialCount: 0, label: 'Angular island' }"
        />
      </section>

      <h3 class="subsection-title">
        <span class="hydrate-label">hydrate="idle"</span>
        Idle
      </h3>
      <section class="grid">
        <absolute-island
          component="ReactCounter"
          framework="react"
          hydrate="idle"
          [props]="{ initialCount: 0, label: 'React island' }"
        />
        <absolute-island
          component="SvelteCounter"
          framework="svelte"
          hydrate="idle"
          [props]="{ initialCount: 0, label: 'Svelte island' }"
        />
        <absolute-island
          component="VueCounter"
          framework="vue"
          hydrate="idle"
          [props]="{ initialCount: 0, label: 'Vue island' }"
        />
        <absolute-island
          component="AngularCounter"
          framework="angular"
          hydrate="idle"
          [props]="{ initialCount: 0, label: 'Angular island' }"
        />
      </section>

      <h3 class="subsection-title">
        <span class="hydrate-label">hydrate="visible"</span>
        Visible
      </h3>
      <section class="grid">
        <absolute-island
          component="ReactCounter"
          framework="react"
          hydrate="visible"
          [props]="{ initialCount: 0, label: 'React island' }"
        />
        <absolute-island
          component="SvelteCounter"
          framework="svelte"
          hydrate="visible"
          [props]="{ initialCount: 0, label: 'Svelte island' }"
        />
        <absolute-island
          component="VueCounter"
          framework="vue"
          hydrate="visible"
          [props]="{ initialCount: 0, label: 'Vue island' }"
        />
        <absolute-island
          component="AngularCounter"
          framework="angular"
          hydrate="visible"
          [props]="{ initialCount: 0, label: 'Angular island' }"
        />
      </section>

      <p class="footer">
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Powered by
        <a
          href="https://absolutejs.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          AbsoluteJS
        </a>
      </p>
    </main>
  `,
})
export class AngularHostComponent {}

export default AngularHostComponent;
export const factory = () => new AngularHostComponent();
