import { Head } from "@absolutejs/absolute/react/components";
import { Island } from "@absolutejs/absolute/react";
import { TypedReactIsland } from "../../islands/registry";
import { Nav } from "../components/Nav";

type IslandsPageProps = {
  cssPath?: string;
};

const IslandsPageContent = () => (
  <main>
    <div className="page-title">
      <img alt="React" height={32} src="/assets/svg/react.svg" />
      <h1>React</h1>
      <span className="badge">Islands</span>
    </div>

    <p className="section-desc">
      Each island is an independent component that hydrates on its own schedule.
      Islands from different frameworks share state through a common store.
    </p>

    <h2 className="section-title">Typed Islands</h2>
    <p className="section-desc">
      Registry-bound islands with full type inference for framework, component,
      and props.
    </p>

    <h3 className="subsection-title">
      <span className="hydrate-label">hydrate=&quot;load&quot;</span>
      Eager
    </h3>
    <section className="grid">
      <TypedReactIsland
        component="ReactCounter"
        framework="react"
        hydrate="load"
        props={{ initialCount: 0, label: "React island" }}
      />
      <TypedReactIsland
        component="SvelteCounter"
        framework="svelte"
        hydrate="load"
        props={{ initialCount: 0, label: "Svelte island" }}
      />
      <TypedReactIsland
        component="VueCounter"
        framework="vue"
        hydrate="load"
        props={{ initialCount: 0, label: "Vue island" }}
      />
      <TypedReactIsland
        component="AngularCounter"
        framework="angular"
        hydrate="load"
        props={{ initialCount: 0, label: "Angular island" }}
      />
    </section>

    <h3 className="subsection-title">
      <span className="hydrate-label">hydrate=&quot;idle&quot;</span>
      Idle
    </h3>
    <section className="grid">
      <TypedReactIsland
        component="ReactCounter"
        framework="react"
        hydrate="idle"
        props={{ initialCount: 0, label: "React island" }}
      />
      <TypedReactIsland
        component="SvelteCounter"
        framework="svelte"
        hydrate="idle"
        props={{ initialCount: 0, label: "Svelte island" }}
      />
      <TypedReactIsland
        component="VueCounter"
        framework="vue"
        hydrate="idle"
        props={{ initialCount: 0, label: "Vue island" }}
      />
      <TypedReactIsland
        component="AngularCounter"
        framework="angular"
        hydrate="idle"
        props={{ initialCount: 0, label: "Angular island" }}
      />
    </section>

    <h3 className="subsection-title">
      <span className="hydrate-label">hydrate=&quot;visible&quot;</span>
      Visible
    </h3>
    <section className="grid">
      <TypedReactIsland
        component="ReactCounter"
        framework="react"
        hydrate="visible"
        props={{ initialCount: 0, label: "React island" }}
      />
      <TypedReactIsland
        component="SvelteCounter"
        framework="svelte"
        hydrate="visible"
        props={{ initialCount: 0, label: "Svelte island" }}
      />
      <TypedReactIsland
        component="VueCounter"
        framework="vue"
        hydrate="visible"
        props={{ initialCount: 0, label: "Vue island" }}
      />
      <TypedReactIsland
        component="AngularCounter"
        framework="angular"
        hydrate="visible"
        props={{ initialCount: 0, label: "Angular island" }}
      />
    </section>

    <h2 className="section-title">Loose Islands</h2>
    <p className="section-desc">
      The loose Island primitive allows dynamic, ad-hoc usage without the
      registry. No type inference — you pass framework and component as strings.
    </p>
    <section className="grid">
      <Island
        component="ReactCounter"
        framework="react"
        props={{ initialCount: 0, label: "React island" }}
      />
      <Island
        component="SvelteCounter"
        framework="svelte"
        props={{ initialCount: 0, label: "Svelte island" }}
      />
      <Island
        component="VueCounter"
        framework="vue"
        props={{ initialCount: 0, label: "Vue island" }}
      />
      <Island
        component="AngularCounter"
        framework="angular"
        props={{ initialCount: 0, label: "Angular island" }}
      />
    </section>

    <p className="footer">
      <img alt="" src="/assets/png/absolutejs-temp.png" />
      Powered by{" "}
      <a
        href="https://absolutejs.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        AbsoluteJS
      </a>
    </p>
  </main>
);

export const IslandsPage = ({ cssPath }: IslandsPageProps) => (
  <html lang="en">
    <Head cssPath={cssPath} title="AbsoluteJS Islands - React" />
    <body>
      <Nav active="/" />
      <IslandsPageContent />
    </body>
  </html>
);
