import { UniversalRouter } from "@absolutejs/absolute/react";
import { Head } from "@absolutejs/absolute/react/components";
import * as ReactRouterDOM from "react-router";
import { Nav } from "../components/Nav";
import { PortalShell } from "../components/PortalShell";

// UniversalRouter resolves react-router via `globalThis.ReactRouterDOM` in the
// browser (Bun's `require` isn't available there). Expose it from the client
// bundle so the router resolves before it first renders.
Reflect.set(globalThis, "ReactRouterDOM", ReactRouterDOM);

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
