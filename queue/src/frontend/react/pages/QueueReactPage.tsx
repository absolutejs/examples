import { useEffect, useState } from "react";
import { Head } from "@absolutejs/absolute/react/components";
import { Nav } from "../components/Nav";

type QueueReactPageProps = {
  cssPath?: string;
};

type Job = {
  attempts: number;
  createdAt: number;
  id: string;
  label: string;
  status: string;
};

type JobsResponse = {
  counts: Record<string, number>;
  jobs: Job[];
};

const STATUS_LABEL: Record<string, string> = {
  canceled: "Canceled",
  claimed: "Running",
  dead: "Failed",
  done: "Done",
  pending: "Queued",
};

const STAT_ORDER: Array<{ label: string; status: string }> = [
  { label: "Queued", status: "pending" },
  { label: "Running", status: "claimed" },
  { label: "Done", status: "done" },
  { label: "Failed", status: "dead" },
];

const QueueReactContent = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    const refresh = () =>
      fetch("/api/jobs")
        .then((response) => response.json())
        .then((data: JobsResponse) => {
          if (active) {
            setJobs(data.jobs);
            setCounts(data.counts);
          }
        });

    void refresh();
    const intervalId = window.setInterval(refresh, 1000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const enqueue = () => {
    void fetch("/api/enqueue", { method: "POST" });
  };

  return (
    <main>
      <div className="page-title">
        <img alt="React" src="/assets/svg/react.svg" />
        <h1>React</h1>
        <span className="badge">@absolutejs/queue</span>
      </div>

      <p className="section-desc">
        Enqueue a job and watch the in-process worker pick it up. The handler
        simulates work and occasionally fails the first attempt, so the queue's
        automatic retry (and eventual <code>done</code>) is visible.
      </p>

      <div className="queue-actions">
        <button className="primary" onClick={enqueue} type="button">
          Enqueue job
        </button>
      </div>

      <div className="queue-stats">
        {STAT_ORDER.map((stat) => (
          <span className="stat" key={stat.status}>
            <strong>{counts[stat.status] ?? 0}</strong>
            {stat.label}
          </span>
        ))}
      </div>

      <div className="job-list">
        {jobs.length === 0 ? (
          <p className="job-empty">No jobs yet — enqueue one above.</p>
        ) : (
          jobs.map((job) => (
            <div className="job" key={job.id}>
              <span className="job-label">{job.label}</span>
              <span className="job-meta">
                {job.attempts > 1 ? (
                  <span className="job-attempts">attempt {job.attempts}</span>
                ) : null}
                <span className={`job-status job-status-${job.status}`}>
                  {STATUS_LABEL[job.status] ?? job.status}
                </span>
              </span>
            </div>
          ))
        )}
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

export const QueueReactPage = ({ cssPath }: QueueReactPageProps) => (
  <html lang="en">
    <Head cssPath={cssPath} title="AbsoluteJS Queue - React" />
    <body>
      <Nav active="/" />
      <QueueReactContent />
    </body>
  </html>
);
