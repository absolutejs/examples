import { Head } from "@absolutejs/absolute/react/components";
import type { ReactNode } from "react";
import { FRAMEWORKS } from "../../../shared/demo";

type DemoChromeProps = {
  children: ReactNode;
  cssPath?: string;
};

export const DemoChrome = (props: DemoChromeProps) => (
  <html lang="en">
    <Head
      cssPath={props.cssPath}
      description="AbsoluteJS chat-style voice demo with guided and general modes in React."
      title="AbsoluteJS Voice Test - React"
    />
    <body className="voice-demo-page">
      <header>
        <a className="logo" href="/">
          <img
            alt="AbsoluteJS"
            height={24}
            src="/assets/png/absolutejs-temp.png"
          />
          AbsoluteJS
        </a>
        <nav>
          {FRAMEWORKS.map((framework) => (
            <a
              key={framework.id}
              className={framework.id === "react" ? "active" : undefined}
              href={framework.href}
            >
              {framework.label}
            </a>
          ))}
          <a href="/reviews">Reviews</a>
          <a href="/traces">Traces</a>
          <a href="/carriers">Carriers</a>
          <a href="/phone-agent">Phone Agent</a>
        </nav>
      </header>
      <main className="voice-shell">
        <section className="voice-grid">{props.children}</section>
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
    </body>
  </html>
);
