import {
  type DemoBackendDescriptor,
  type DemoBackendMode,
  demoFrameworks,
  getAvailableDemoBackends,
  getDemoPagePath,
} from "../../demo-backends";

type ReactRAGVectorDemoNavProps = {
  availableBackends?: DemoBackendDescriptor[];
  activeMode?: DemoBackendMode;
};

export const ReactRAGVectorDemoNav = ({
  availableBackends,
  activeMode = "sqlite-native",
}: ReactRAGVectorDemoNavProps) => {
  const backendOptions = getAvailableDemoBackends(availableBackends);

  return (
    <nav>
      {backendOptions.map((backend) => (
        <div className="demo-nav-row" key={backend.id}>
          <span
            className={
              backend.id === activeMode
                ? "demo-nav-row-label active"
                : "demo-nav-row-label"
            }
          >
            {backend.label}
          </span>
          {demoFrameworks.map((framework) => (
            <a
              className={[
                framework.id === "react" && backend.id === activeMode
                  ? "active"
                  : "",
                backend.available ? "" : "disabled",
              ]
                .filter(Boolean)
                .join(" ")}
              href={
                backend.available
                  ? getDemoPagePath(framework.id, backend.id)
                  : undefined
              }
              aria-disabled={!backend.available}
              title={backend.available ? undefined : backend.reason}
              key={`${backend.id}-${framework.id}`}
            >
              {framework.label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
};
