import { UniversalRouter } from "@absolutejs/absolute/react";
import { Head } from "@absolutejs/absolute/react/components";
import { Nav } from "../components/Nav";
import { PortalShell } from "../components/PortalShell";

type ReactSpaProps = {
  cssPath?: string;
  url?: string;
};

export const ReactSpa = ({ cssPath, url }: ReactSpaProps) => (
  <html>
    <Head cssPath={cssPath} title="AbsoluteJS SPA — React" />
    <body>
      <UniversalRouter url={url}>
        <Nav active="react" />
        <PortalShell />
      </UniversalRouter>
    </body>
  </html>
);
