export type ParallelWorkerState = {
  percent: number;
  elapsed: number;
  done: boolean;
};

export type ParallelCardProps = {
  loading: boolean;
  resetting: boolean;
  workers: ParallelWorkerState[];
  onRun: () => void;
};

export const ParallelCard = ({
  loading,
  resetting,
  workers,
  onRun,
}: ParallelCardProps) => {
  const labels = ["240K primes", "480K primes", "880K primes"];

  return (
    <div className="worker-card">
      <div className="card-title">Parallel Race</div>
      <p className="card-desc">
        3 workers with different workloads running simultaneously.
      </p>
      <button
        className={loading ? "loading" : ""}
        disabled={loading}
        onClick={onRun}
      >
        {loading ? "Racing" : "Start Race"}
      </button>
      <div className="parallel-workers">
        {workers.map((worker, idx) => (
          <div className="parallel-worker" key={idx}>
            <div className="parallel-worker-header">
              <span>{labels[idx]}</span>
              <span>{worker.elapsed > 0 ? `${worker.elapsed}ms` : ""}</span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${worker.done ? "done" : ""}`}
                style={{
                  width: `${worker.percent}%`,
                  ...(resetting ? { transition: "none" } : {}),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
