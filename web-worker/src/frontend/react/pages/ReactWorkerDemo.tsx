import { Head } from "../components/Head";
import { Nav } from "../components/Nav";
import { WorkerDemoApp } from "../components/WorkerDemoApp";

type WorkerDemoProps = {
  cssPath?: string;
};

export const ReactWorkerDemo = ({ cssPath }: WorkerDemoProps) => (
  <html lang="en">
    <Head cssPath={cssPath} />
    <body>
      <Nav />
      <WorkerDemoApp />
    </body>
  </html>
);
