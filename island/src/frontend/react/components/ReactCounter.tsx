import { useState } from "react";
import { useIslandStore } from "@absolutejs/absolute/react";
import { counterIslandStore } from "../../islands/counterStore";

type ReactCounterProps = {
  initialCount: number;
  label: string;
};

export const ReactCounter = ({ initialCount, label }: ReactCounterProps) => {
  const [count, setCount] = useState(initialCount);
  const sharedCount = useIslandStore(
    counterIslandStore,
    (state) => state.sharedCount,
  );
  const incrementShared = useIslandStore(
    counterIslandStore,
    (state) => state.incrementShared,
  );

  return (
    <div className="island-card island-card-react">
      <div className="island-header">
        <img alt="React" height={20} src="/assets/svg/react.svg" />
        <span>{label}</span>
      </div>
      <strong>{`Local: ${count}`}</strong>
      <strong>{`Shared: ${sharedCount}`}</strong>
      <button onClick={() => setCount((value) => value + 1)} type="button">
        Increment React
      </button>
      <button onClick={() => incrementShared()} type="button">
        Increment Shared
      </button>
    </div>
  );
};
