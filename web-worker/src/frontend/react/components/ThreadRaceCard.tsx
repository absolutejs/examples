import type { RefObject } from "react";
import { PERCENTAGE_FULL, RACE_BAR_MAX_MS } from "../../constants";

export type ThreadRaceCardProps = {
  racing: boolean;
  stressing: boolean;
  workerTime: number;
  mainTime: number;
  workerBarRef: RefObject<HTMLDivElement | null>;
  workerTimeRef: RefObject<HTMLSpanElement | null>;
  mainBarRef: RefObject<HTMLDivElement | null>;
  mainTimeLabelRef: RefObject<HTMLSpanElement | null>;
  formatTime: (milliseconds: number) => string;
  onStart: () => void;
  onStop: () => void;
  onStress: () => void;
};

export const ThreadRaceCard = ({
  racing,
  stressing,
  workerTime,
  mainTime,
  workerBarRef,
  workerTimeRef,
  mainBarRef,
  mainTimeLabelRef,
  formatTime,
  onStart,
  onStop,
  onStress,
}: ThreadRaceCardProps) => (
  <div className="worker-card">
    <div className="card-title">Thread Race</div>
    <p className="card-desc">Worker and main thread timers side by side.</p>
    <div className="race-bars">
      <div className="race-bar-row">
        <div className="race-bar-label">
          <span>Worker Timer</span>
          <span ref={workerTimeRef}>{formatTime(workerTime)}</span>
        </div>
        <div className="race-bar-track">
          <div
            className="race-bar-fill worker"
            ref={workerBarRef}
            style={{
              width: `${Math.min((workerTime / RACE_BAR_MAX_MS) * PERCENTAGE_FULL, PERCENTAGE_FULL)}%`,
            }}
          />
        </div>
      </div>
      <div className="race-bar-row">
        <div className="race-bar-label">
          <span>Main Thread</span>
          <span ref={mainTimeLabelRef}>{formatTime(mainTime)}</span>
        </div>
        <div className="race-bar-track">
          <div
            className="race-bar-fill main-thread"
            ref={mainBarRef}
            style={{
              width: `${Math.min((mainTime / RACE_BAR_MAX_MS) * PERCENTAGE_FULL, PERCENTAGE_FULL)}%`,
            }}
          />
        </div>
      </div>
    </div>
    <div className="race-controls">
      <button disabled={racing} onClick={onStart}>
        Start Race
      </button>
      <button disabled={!racing} onClick={onStop}>
        Stop Race
      </button>
      <button
        className="stress"
        disabled={stressing || !racing}
        onClick={onStress}
      >
        {stressing ? "Stressing..." : "Stress Main Thread"}
      </button>
    </div>
  </div>
);
