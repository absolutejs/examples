import { Head } from "@absolutejs/absolute/react/components";
import type { ReactNode } from "react";
import { StyleMatrixNav } from "../components/StyleMatrixNav";

type StyleKind = "less" | "scss" | "stylus" | "tailwind";

type Props = {
  cssPath?: string | string[];
  style: StyleKind;
};

const styleLabels: Record<StyleKind, string> = {
  less: "Less",
  scss: "SCSS",
  stylus: "Stylus",
  tailwind: "Tailwind",
};

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

const NestedFeatureList = () => (
  <ul className="nested-list">
    <li>
      <span>Parent state</span>
      <strong>active</strong>
    </li>
    <li>
      <span>Child selector</span>
      <strong>hover</strong>
    </li>
    <li>
      <span>Inline target</span>
      <strong>focus</strong>
    </li>
  </ul>
);

const StyleShowcase = () => (
  <>
    <section className="feature-grid">
      <article className="feature-card feature-card-primary">
        <span className="feature-label">Variables</span>
        <h2>Design tokens</h2>
        <p>
          Colors, spacing, shadows, and surfaces come from stylesheet values.
        </p>
        <div className="swatch-row">
          <span className="swatch swatch-one" />
          <span className="swatch swatch-two" />
          <span className="swatch swatch-three" />
        </div>
      </article>
      <article className="feature-card feature-card-mixin">
        <span className="feature-label">Mixins</span>
        <h2>Reusable patterns</h2>
        <p>Buttons and panels share one reusable recipe with variant inputs.</p>
        <div className="button-row">
          <button className="demo-button demo-button-primary" type="button">
            Primary
          </button>
          <button className="demo-button demo-button-secondary" type="button">
            Secondary
          </button>
        </div>
      </article>
      <article className="feature-card feature-card-nesting">
        <span className="feature-label">Nesting</span>
        <h2>Scoped structure</h2>
        <NestedFeatureList />
      </article>
      <article className="feature-card feature-card-functions">
        <span className="feature-label">Functions</span>
        <h2>Computed output</h2>
        <p>Generated shades and sizing are produced inside the stylesheet.</p>
        <div className="generated-scale">
          <span />
          <span />
          <span />
          <span />
        </div>
      </article>
      <article className="feature-card feature-card-responsive">
        <span className="feature-label">Responsive rules</span>
        <h2>Adaptive layout</h2>
        <p>Breakpoints adjust the grid, spacing, and header rhythm.</p>
        <div className="responsive-bars">
          <span />
          <span />
          <span />
        </div>
      </article>
      <article className="feature-card feature-card-generated">
        <span className="feature-label">Generated classes</span>
        <h2>Utility output</h2>
        <p>Loops emit repeatable utility selectors from one compact source.</p>
        <div className="utility-row">
          <span className="utility-chip utility-chip-1">1</span>
          <span className="utility-chip utility-chip-2">2</span>
          <span className="utility-chip utility-chip-3">3</span>
        </div>
      </article>
    </section>
  </>
);

const Logo = () => (
  <a className="logo" href="/react/tailwind">
    <img alt="AbsoluteJS" height="24" src="/assets/png/absolutejs-temp.png" />
    AbsoluteJS StyleLab
  </a>
);

const Footer = () => (
  <footer className="site-footer">
    Powered by{" "}
    <a href="https://absolutejs.com">
      <img alt="AbsoluteJS" height="18" src="/assets/png/absolutejs-temp.png" />
      AbsoluteJS
    </a>
  </footer>
);

const tailwindLink = (active: boolean) =>
  [
    "rounded-full px-[10px] py-[7px] text-[0.8rem] leading-[normal] no-underline transition-colors",
    active
      ? "bg-[var(--t-nav-link-bg-active)] text-[var(--t-nav-link-active)]"
      : "bg-[var(--t-nav-link-bg)] text-[var(--t-nav-link)] hover:bg-[var(--t-nav-link-bg-hover)] hover:text-[var(--t-nav-link-hover)]",
  ].join(" ");

const TailwindNav = () => (
  <nav className="flex flex-col items-end gap-[0.35rem] max-[820px]:items-stretch">
    {styleRows.map(([styleId, label]) => (
      <div
        className="flex flex-wrap items-center justify-end gap-1 max-[820px]:justify-start"
        key={styleId}
      >
        <span
          className={[
            "mr-[0.35rem] text-[0.76rem] font-semibold uppercase leading-[normal]",
            styleId === "tailwind"
              ? "text-[var(--t-label-active)]"
              : "text-[var(--t-label)]",
          ].join(" ")}
        >
          {label}
        </span>
        {frameworks.map(([framework, frameworkLabel]) => (
          <a
            className={tailwindLink(
              framework === "react" && styleId === "tailwind",
            )}
            href={`/${framework}/${styleId}`}
            key={`${styleId}-${framework}`}
          >
            {frameworkLabel}
          </a>
        ))}
      </div>
    ))}
  </nav>
);

const TailwindCard = ({
  accent,
  children,
  label,
  title,
}: {
  accent: string;
  children: ReactNode;
  label: string;
  title: string;
}) => (
  <article
    className={[
      "grid min-h-[260px] gap-3 rounded-lg border border-[var(--t-border)] bg-[var(--t-surface)] p-6 shadow-[0_20px_48px_var(--t-card-shadow)]",
      "",
      accent,
    ].join(" ")}
  >
    <span className="text-[12px] font-extrabold uppercase leading-[normal] tracking-normal text-[var(--t-label)]">
      {label}
    </span>
    <h2 className="m-0 text-2xl font-bold leading-[normal] text-[var(--t-label-active)]">
      {title}
    </h2>
    {children}
  </article>
);

const TailwindLogo = () => (
  <a
    className="flex items-center gap-2 text-base font-semibold leading-[normal] text-[var(--t-brand)] no-underline"
    href="/react/tailwind"
  >
    <img
      alt="AbsoluteJS"
      className="h-6 w-auto"
      src="/assets/png/absolutejs-temp.png"
    />
    AbsoluteJS StyleLab
  </a>
);

const TailwindHero = () => (
  <section className="mb-[26px] grid gap-4 max-xl:pl-10">
    <div className="flex items-center gap-3">
      <img alt="React" className="h-12 w-auto" src="/assets/svg/react.svg" />
      <h1 className="m-0 text-[2rem] font-semibold leading-none text-[var(--t-text)]">
        React
      </h1>
    </div>
    <p className="m-0 max-w-[760px] text-lg leading-[1.6] text-[var(--t-muted)]">
      Tailwind styles this route directly in the markup with utility classes.
    </p>
  </section>
);

const TailwindVariableCard = () => (
  <TailwindCard
    accent="border-l-[6px] border-l-orange-600 bg-linear-to-br/srgb from-orange-600/15 to-orange-600/5"
    label="Variables"
    title="Design tokens"
  >
    <p className="m-0 leading-[1.55] text-[var(--t-muted)]">
      Colors, spacing, shadows, and surfaces come from utility values.
    </p>
    <div className="mt-auto flex gap-2">
      <span className="h-8 w-8 rounded-full bg-[#c2410c] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)]" />
      <span className="h-8 w-8 rounded-full bg-[rgb(241.4504854369_95.7932038835_35.9495145631)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)]" />
      <span className="h-8 w-8 rounded-full bg-[#7f2a08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)]" />
    </div>
  </TailwindCard>
);

const TailwindMixinCard = () => (
  <TailwindCard
    accent="border-l-4 border-l-[#2563eb] bg-linear-to-br/srgb from-[#2563eb]/15 to-[#2563eb]/5"
    label="Mixins"
    title="Reusable patterns"
  >
    <p className="m-0 leading-[1.55] text-[var(--t-muted)]">
      Buttons and panels share repeated utility recipes with variant classes.
    </p>
    <div className="mt-auto flex gap-2">
      <button
        className="rounded-full min-h-[36px] border border-[rgb(135.1_169.2_244)] bg-[#2563eb] px-[14px] py-0 font-bold leading-[normal] text-white"
        type="button"
      >
        Primary
      </button>
      <button
        className="rounded-full min-h-[36px] border border-[var(--t-border)] bg-transparent px-[14px] py-0 font-bold leading-[normal] text-[var(--t-text)] hover:bg-[var(--t-surface-2)]"
        type="button"
      >
        Secondary
      </button>
    </div>
  </TailwindCard>
);

const TailwindNestedCard = () => (
  <TailwindCard
    accent="border-l-4 border-l-rose-600 bg-linear-to-br/srgb from-rose-600/15 to-rose-600/5"
    label="Nesting"
    title="Scoped structure"
  >
    <ul className="m-0 grid list-none gap-2 p-0">
      {[
        ["Parent state", "active"],
        ["Child selector", "hover"],
        ["Inline target", "focus"],
      ].map(([name, value]) => (
        <li
          className="flex items-center justify-between rounded-md bg-[var(--t-surface-2)] px-3 py-2"
          key={name}
        >
          <span className="text-[var(--t-muted)]">{name}</span>
          <strong className="text-[var(--t-text)]">{value}</strong>
        </li>
      ))}
    </ul>
  </TailwindCard>
);

const TailwindFunctionCard = () => (
  <TailwindCard
    accent="border-l-4 border-l-emerald-600 bg-linear-to-br/srgb from-emerald-600/15 to-emerald-600/5"
    label="Functions"
    title="Computed output"
  >
    <p className="m-0 leading-[1.55] text-[var(--t-muted)]">
      Generated shades and sizing are composed from explicit utilities.
    </p>
    <div className="mt-auto flex h-12 items-end gap-2">
      <span className="h-4 flex-1 rounded-md bg-emerald-300" />
      <span className="h-6 flex-1 rounded-md bg-emerald-400" />
      <span className="h-8 flex-1 rounded-md bg-emerald-500" />
      <span className="h-10 flex-1 rounded-md bg-emerald-600" />
    </div>
  </TailwindCard>
);

const TailwindResponsiveCard = () => (
  <TailwindCard
    accent="border-l-4 border-l-fuchsia-600 bg-linear-to-br/srgb from-fuchsia-600/15 to-fuchsia-600/5"
    label="Responsive rules"
    title="Adaptive layout"
  >
    <p className="m-0 leading-[1.55] text-[var(--t-muted)]">
      Breakpoint utilities adjust the grid, spacing, and header rhythm.
    </p>
    <div className="mt-auto grid gap-2">
      <span className="h-3 w-full rounded-full bg-fuchsia-600" />
      <span className="h-3 w-3/4 rounded-full bg-fuchsia-500" />
      <span className="h-3 w-1/2 rounded-full bg-fuchsia-400" />
    </div>
  </TailwindCard>
);

const TailwindGeneratedCard = () => (
  <article className="grid min-h-[260px] gap-2 rounded-lg border border-[var(--t-border)] border-l-4 border-l-teal-500 bg-[var(--t-surface)] bg-linear-to-br/srgb from-teal-500/15 to-teal-500/5 px-5 py-[18px] shadow-[0_20px_48px_var(--t-card-shadow)]">
    <span className="text-[12px] font-extrabold uppercase leading-[normal] text-[var(--t-label)]">
      CSS Modules
    </span>
    <h2 className="m-0 text-xl font-bold leading-[1.2] text-[var(--t-label-active)]">
      Locally scoped
    </h2>
    <p className="m-0 text-[13px] leading-[1.45] text-[var(--t-muted)]">
      Class names from <code>CssModulesCard.module.scss</code> are rewritten at
      build time so <code>.card</code> here can't collide with anything else on
      the page.
    </p>
    <ul className="m-0 mt-auto grid list-none gap-1 p-0">
      <li className="flex items-center justify-between gap-[10px] rounded-md bg-[var(--t-surface-2)] px-[10px] py-1 font-mono text-[12px] leading-[1.5]">
        <span className="text-[var(--t-muted)]">styles.card</span>
        <span className="font-semibold text-[#0f8a7d]">card_HXsppQ</span>
      </li>
      <li className="flex items-center justify-between gap-[10px] rounded-md bg-[var(--t-surface-2)] px-[10px] py-1 font-mono text-[12px] leading-[1.5]">
        <span className="text-[var(--t-muted)]">styles.title</span>
        <span className="font-semibold text-[#0f8a7d]">title_HXsppQ</span>
      </li>
      <li className="flex items-center justify-between gap-[10px] rounded-md bg-[var(--t-surface-2)] px-[10px] py-1 font-mono text-[12px] leading-[1.5]">
        <span className="text-[var(--t-muted)]">:export accent</span>
        <span className="font-semibold text-[#0f8a7d]">#14b8a6</span>
      </li>
    </ul>
  </article>
);

const TailwindShowcase = () => (
  <section className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    <TailwindVariableCard />
    <TailwindMixinCard />
    <TailwindNestedCard />
    <TailwindFunctionCard />
    <TailwindResponsiveCard />
    <TailwindGeneratedCard />
  </section>
);

const TailwindFooter = () => (
  <footer className="mx-auto mb-8 flex w-[min(1040px,calc(100%-32px))] items-center justify-center gap-[0.35rem] text-[13px] text-[var(--t-muted)]">
    Powered by
    <a
      className="inline-flex items-center gap-[0.35rem] font-bold text-[var(--t-text)]"
      href="https://absolutejs.com"
    >
      <img
        alt="AbsoluteJS"
        className="h-[18px] w-auto"
        src="/assets/png/absolutejs-temp.png"
      />
      AbsoluteJS
    </a>
  </footer>
);

const TailwindPageBody = () => (
  <body className="m-0 bg-[var(--t-bg)] text-[var(--t-text)]">
    <header className="sticky top-0 z-10 flex items-start justify-between gap-6 border-b border-[var(--t-nav-border)] bg-[var(--t-nav-bg)] px-8 py-3 text-[var(--t-text)] backdrop-blur-[20px] max-[820px]:flex-col max-[820px]:items-stretch max-[820px]:gap-3">
      <TailwindLogo />
      <TailwindNav />
    </header>
    <main className="mx-auto my-[42px] w-[min(1040px,calc(100%-32px))]">
      <TailwindHero />
      <TailwindShowcase />
    </main>
    <TailwindFooter />
  </body>
);

export const ReactStylesPage = ({ cssPath, style }: Props) => (
  <html lang="en">
    <Head
      cssPath={cssPath}
      title={`AbsoluteJS StyleLab - React ${styleLabels[style]}`}
    />
    {style === "tailwind" ? (
      <TailwindPageBody />
    ) : (
      <body>
        <header>
          <div className="header-left">
            <Logo />
          </div>
          <StyleMatrixNav activeFramework="react" activeStyle={style} />
        </header>
        <main>
          <section className="hero">
            <div className="page-title">
              <img alt="React" height={32} src="/assets/svg/react.svg" />
              <h1>React</h1>
            </div>
            <p className="lede">
              AbsoluteJS compiles the selected stylesheet and wires it into this
              page.
            </p>
          </section>
          <StyleShowcase />
        </main>
        <Footer />
      </body>
    )}
  </html>
);
