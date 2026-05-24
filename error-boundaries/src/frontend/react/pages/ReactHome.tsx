import { Head } from "@absolutejs/absolute/react/components";
import { Nav } from "../components/Nav";
import { ReactHomeContent } from "../components/ReactHomeContent";

type ReactHomeProps = {
  cssPath?: string;
};

export const ReactHome = ({ cssPath }: ReactHomeProps) => (
  <html lang="en">
    <Head cssPath={cssPath} title="AbsoluteJS Error Boundaries - React" />
    <body>
      <Nav active="/react" />
      <ReactHomeContent />
    </body>
  </html>
);
