import { Head } from "@absolutejs/absolute/react/components";
import { UniversalRouter } from "@absolutejs/absolute/react/router";
import { AuthShell } from "../components/AuthShell";
import { ToastProvider } from "../components/toast/ToastProvider";

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
