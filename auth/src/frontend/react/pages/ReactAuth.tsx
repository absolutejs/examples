import { UniversalRouter } from "@absolutejs/absolute/react";
import { Head } from "@absolutejs/absolute/react/components";
import * as ReactRouterDOM from "react-router";
import { AuthShell } from "../components/AuthShell";
import { ToastProvider } from "../components/toast/ToastProvider";

// UniversalRouter resolves react-router via `globalThis.ReactRouterDOM` in the
// browser (Bun's `require` isn't available there). The backend sets this for
// SSR; set it in the client bundle too, before the router first renders.
Reflect.set(globalThis, "ReactRouterDOM", ReactRouterDOM);

type ReactAuthProps = {
  cssPath?: string;
  url?: string;
};

export const ReactAuth = ({ cssPath, url }: ReactAuthProps) => (
  <html lang="en">
    <Head cssPath={cssPath} title="AbsoluteJS Auth — React" />
    <body className="auth-body">
      <UniversalRouter url={url}>
        <ToastProvider>
          <AuthShell />
        </ToastProvider>
      </UniversalRouter>
    </body>
  </html>
);
