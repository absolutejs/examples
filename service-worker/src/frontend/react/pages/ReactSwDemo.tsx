import { useState } from "react";
import { Head } from "../components/Head";
import { Nav } from "../components/Nav";
import { RegistrationCard } from "../components/RegistrationCard";
import { CacheCard } from "../components/CacheCard";
import { PingCard } from "../components/PingCard";
import { FetchCard } from "../components/FetchCard";
import { LifecycleCard } from "../components/LifecycleCard";
import { OfflineCard } from "../components/OfflineCard";

type SwDemoProps = {
  cssPath?: string;
};

const SwDemoApp = () => {
  const [swReady, setSwReady] = useState(false);

  return (
    <main>
      <div className="page-title">
        <img alt="React" height={32} src="/assets/svg/react.svg" />
        <h1>React</h1>
      </div>

      <div className="sw-cards">
        <RegistrationCard onRegistered={(reg) => setSwReady(reg !== null)} />
        <CacheCard swReady={swReady} />
        <PingCard swReady={swReady} />
        <FetchCard swReady={swReady} />
        <LifecycleCard swReady={swReady} />
        <OfflineCard swReady={swReady} />
      </div>

      <p className="footer">
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Powered by{" "}
        <a
          href="https://absolutejs.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          AbsoluteJS
        </a>
      </p>
    </main>
  );
};

export const ReactSwDemo = ({ cssPath }: SwDemoProps) => (
  <html lang="en">
    <Head cssPath={cssPath} />
    <body>
      <Nav />
      <SwDemoApp />
    </body>
  </html>
);
