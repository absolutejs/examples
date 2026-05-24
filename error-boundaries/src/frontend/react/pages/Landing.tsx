import { Head } from "@absolutejs/absolute/react/components";
import { LandingContent } from "../components/LandingContent";
import { Nav } from "../components/Nav";

type LandingProps = {
  cssPath?: string;
};

export const Landing = ({ cssPath }: LandingProps) => (
  <html lang="en">
    <Head cssPath={cssPath} title="AbsoluteJS Error Boundaries Demo" />
    <body>
      <Nav active="/" />
      <LandingContent />
    </body>
  </html>
);
