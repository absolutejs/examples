import { Head } from "@absolutejs/absolute/react/components";
import {
  type DemoBackendDescriptor,
  type DemoBackendMode,
} from "../../demo-backends";
import { ReactRAGAuthMenu } from "../components/ReactRAGAuthMenu";
import { ReactRAGVectorDemoClientMount } from "../components/ReactRAGVectorDemoClientMount";
import { ReactRAGVectorDemoNav } from "../components/ReactRAGVectorDemoNav";

type DemoProps = {
  availableBackends?: DemoBackendDescriptor[];
  cssPath?: string;
  mode?: DemoBackendMode;
};

export const ReactRAGVectorDemo = ({
  availableBackends,
  cssPath,
  mode,
}: DemoProps) => {
  const activeMode = mode ?? "sqlite-native";
  return (
    <html lang="en">
      <Head
        cssPath={cssPath}
        description="AbsoluteJS RAG demo using framework-native RAG primitives."
        title="AbsoluteJS RAG Workflow Demo - React"
      />
      <body className="rag-demo-page">
        <header>
          <div className="header-left">
            <a className="logo" href="/">
              <img
                alt="AbsoluteJS"
                height={24}
                src="/assets/png/absolutejs-temp.png"
              />
              AbsoluteJS
            </a>
          </div>
          <div className="demo-header-actions">
            <ReactRAGVectorDemoNav
              availableBackends={availableBackends}
              activeMode={activeMode}
            />
            <ReactRAGAuthMenu />
          </div>
        </header>

        <ReactRAGVectorDemoClientMount mode={activeMode} />
      </body>
    </html>
  );
};
