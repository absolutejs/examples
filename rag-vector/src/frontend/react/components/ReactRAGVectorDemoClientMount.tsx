import { useEffect, useState } from "react";
import type { DemoBackendMode } from "../../demo-backends";
import { ReactRAGVectorDemoShell } from "./ReactRAGVectorDemoShell";

const ReactRAGVectorDemoLoadingShell = () => (
  <main className="demo-layout">
    <section className="demo-card">
      <span className="demo-hero-kicker">React workflow surface</span>
      <h1>AbsoluteJS RAG Workflow Demo - React</h1>
      <p className="demo-metadata">
        Initializing the demo shell. RAG readiness and workflow controls load
        on-demand after the base page stream is visible.
      </p>
      <p className="demo-metadata">
        This keeps the page interactive shell available while the full app
        initializes.
      </p>
    </section>
  </main>
);

type ReactRAGVectorDemoClientMountProps = {
  mode: DemoBackendMode;
};

export const ReactRAGVectorDemoClientMount = ({
  mode,
}: ReactRAGVectorDemoClientMountProps) => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <ReactRAGVectorDemoLoadingShell />;
  }

  return <ReactRAGVectorDemoShell mode={mode} />;
};
