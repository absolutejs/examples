import {
  type DemoBackendDescriptor,
  type DemoBackendMode,
  type DemoFrameworkId,
  demoFrameworks,
  getAvailableDemoBackends,
  getDemoPagePath,
} from "../../demo-backends";

type ReactRAGVectorDemoNavProps = {
  availableBackends?: DemoBackendDescriptor[];
  activeMode?: DemoBackendMode;
};

const ACTIVE_FRAMEWORK: DemoFrameworkId = "react";

// Two dropdowns (backend + framework) instead of a 4×6 grid of links — same
// destinations, far less header noise. Navigation happens on change.
export const ReactRAGVectorDemoNav = ({
  availableBackends,
  activeMode = "sqlite-native",
}: ReactRAGVectorDemoNavProps) => {
  const backendOptions = getAvailableDemoBackends(availableBackends);

  const goTo = (framework: DemoFrameworkId, backend: DemoBackendMode) => {
    const target = getDemoPagePath(framework, backend);
    if (target && typeof window !== "undefined") {
      window.location.assign(target);
    }
  };

  return (
    <nav className="demo-nav">
      <label className="demo-nav-select">
        <span>Backend</span>
        <select
          onChange={(event) =>
            goTo(ACTIVE_FRAMEWORK, event.target.value as DemoBackendMode)
          }
          value={activeMode}
        >
          {backendOptions.map((backend) => (
            <option
              disabled={!backend.available}
              key={backend.id}
              value={backend.id}
            >
              {backend.label}
              {backend.available ? "" : " · unavailable"}
            </option>
          ))}
        </select>
      </label>
      <label className="demo-nav-select">
        <span>Framework</span>
        <select
          onChange={(event) =>
            goTo(event.target.value as DemoFrameworkId, activeMode)
          }
          value={ACTIVE_FRAMEWORK}
        >
          {demoFrameworks.map((framework) => (
            <option key={framework.id} value={framework.id}>
              {framework.label}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
};
