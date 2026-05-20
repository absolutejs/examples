import { useCallback, useEffect, useState } from "react";

type SwState = "unsupported" | "unregistered" | "registering" | "active";

const getBadgeClass = (state: SwState) => {
  if (state === "active") return "active";
  if (state === "registering") return "pending";

  return "inactive";
};

const getBadgeLabel = (state: SwState) => {
  if (state === "unsupported") return "Not Supported";
  if (state === "active") return "Active";
  if (state === "registering") return "Registering";

  return "Unregistered";
};

export const RegistrationCard = ({
  onRegistered,
}: {
  onRegistered: (reg: ServiceWorkerRegistration | null) => void;
}) => {
  const [state, setState] = useState<SwState>("unregistered");
  const [scope, setScope] = useState<string | null>(null);
  const [scriptUrl, setScriptUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setState("unsupported");

      return;
    }

    const checkExisting = async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.active) {
        setState("active");
        setScope(reg.scope);
        setScriptUrl(reg.active.scriptURL);
        onRegistered(reg);
      }
    };

    checkExisting().catch(() => undefined);
  }, []);

  const handleNewRegistration = useCallback(
    (reg: ServiceWorkerRegistration) => {
      const worker = reg.active || reg.installing || reg.waiting;
      if (!worker) return;

      const activate = () => {
        setState("active");
        setScope(reg.scope);
        setScriptUrl(worker.scriptURL);
        onRegistered(reg);
      };

      if (worker.state === "activated") {
        activate();

        return;
      }
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") activate();
      });
    },
    [onRegistered],
  );

  const register = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    setState("registering");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      handleNewRegistration(reg);
    } catch {
      setState("unregistered");
    }
  }, [handleNewRegistration]);

  const unregister = useCallback(async () => {
    const reg = await navigator.serviceWorker
      .getRegistration()
      .catch(() => undefined);
    if (!reg) return;

    await reg.unregister().catch(() => undefined);
    setState("unregistered");
    setScope(null);
    setScriptUrl(null);
    onRegistered(null);
  }, [onRegistered]);

  return (
    <div className="sw-card">
      <div className="card-title">Registration</div>
      <p className="card-desc">Register and unregister the service worker.</p>
      <div className={`status-badge ${getBadgeClass(state)}`}>
        <span className="dot" />
        {getBadgeLabel(state)}
      </div>
      <div className="btn-row">
        <button
          disabled={state === "active" || state === "unsupported"}
          onClick={register}
        >
          Register
        </button>
        <button
          className="danger"
          disabled={state !== "active"}
          onClick={unregister}
        >
          Unregister
        </button>
      </div>
      <div className="sw-result">
        <div className="result-row">
          <span>Scope</span>
          <span>{scope ?? "\u2014"}</span>
        </div>
        <div className="result-row">
          <span>Script</span>
          <span>{scriptUrl ? scriptUrl.split("/").pop() : "\u2014"}</span>
        </div>
      </div>
    </div>
  );
};
