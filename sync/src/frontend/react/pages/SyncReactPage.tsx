import { Head } from "@absolutejs/absolute/react/components";
import { Nav } from "../components/Nav";
import { SyncReactContent } from "../components/SyncReactContent";

type SyncReactPageProps = {
  cssPath?: string;
};

export const SyncReactPage = ({ cssPath }: SyncReactPageProps) => (
  <html lang="en">
    <Head cssPath={cssPath} title="AbsoluteJS Sync - React" />
    <body>
      <Nav active="/" />
      <SyncReactContent />
    </body>
  </html>
);
