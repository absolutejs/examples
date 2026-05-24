import { Head } from "../components/Head";
import { ImageDemoApp } from "../components/ImageDemoApp";
import { Nav } from "../components/Nav";

type ImageDemoProps = {
  cssPath?: string;
};

export const ReactImageDemo = ({ cssPath }: ImageDemoProps) => (
  <html lang="en">
    <Head cssPath={cssPath} />
    <body>
      <Nav />
      <ImageDemoApp />
    </body>
  </html>
);
