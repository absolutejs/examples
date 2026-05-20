import { useEffect, useState } from "react";
import { SW_STATES } from "../../constants";

const STATE_ORDER: Record<string, number> = {
  activated: 3,
  activating: 2,
  installed: 1,
  installing: 0,
  redundant: 4,
};

const getStepClass = (isCurrent: boolean, isReached: boolean) => {
  if (isCurrent) return "current";
  if (isReached) return "reached";

  return "";
};

const computeReachedStates = (prev: Set<string>, status: string) => {
  const next = new Set(prev);
  const order = STATE_ORDER[status];
  if (order === undefined) return next;

  for (const [key, val] of Object.entries(STATE_ORDER)) {
    if (val <= order) next.add(key);
  }

  return next;
};

export const LifecycleCard = ({ swReady }: { swReady: boolean }) => {
  const [currentState, setCurrentState] = useState<string | null>(null);
  const [reachedStates, setReachedStates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;

    const handler = (event: MessageEvent) => {
      if (event.data.type !== "sw-status") return;

      const { status } = event.data;
      setCurrentState(status);
      setReachedStates((prev) => computeReachedStates(prev, status));
    };

    navigator.serviceWorker.addEventListener("message", handler);

    if (swReady && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "get-status" });
    }

    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
    };
  }, [swReady]);

  return (
    <div className="sw-card">
      <div className="card-title">Lifecycle</div>
      <p className="card-desc">
        Track the service worker through its lifecycle stages.
      </p>
      <div className="lifecycle-steps">
        {SW_STATES.map((state) => {
          const isCurrent = currentState === state;
          const isReached = reachedStates.has(state);
          const stepClass = getStepClass(isCurrent, isReached);

          return (
            <div className="lifecycle-step" key={state}>
              <div className={`lifecycle-dot ${stepClass}`} />
              <span className={`lifecycle-label ${stepClass}`}>{state}</span>
            </div>
          );
        })}
      </div>
      <div className="sw-result">
        <div className="result-row">
          <span>Current</span>
          <span>{currentState ?? "\u2014"}</span>
        </div>
      </div>
    </div>
  );
};
