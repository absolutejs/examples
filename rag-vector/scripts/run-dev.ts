export {};
const env = {
  ...process.env,
  RAG_SERVICE_PORT: process.env.RAG_SERVICE_PORT ?? "3001",
};

const children = [
  Bun.spawn(["bun", "run", "dev:rag-service"], {
    cwd: process.cwd(),
    env,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  }),
  Bun.spawn(["bun", "run", "dev:web"], {
    cwd: process.cwd(),
    env,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  }),
];

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    child.kill();
  }
};

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shutdown();
    process.exit(0);
  });
}

const results = await Promise.all(children.map((child) => child.exited));
shutdown();
const failed = results.find((code) => code !== 0);
process.exit(failed ?? 0);
