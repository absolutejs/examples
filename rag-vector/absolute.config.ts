import { defineConfig } from "@absolutejs/absolute";

const postgresContainerName = "absolutejs-rag-demo-pg";
const postgresPort = 55433;
const postgresUrl = `postgresql://postgres:postgres@127.0.0.1:${postgresPort}/absolute_rag_demo`;
const postgresVolumeName = "absolutejs-rag-demo-pg-data";

export default defineConfig({
  postgres: {
    kind: "command",
    command: [
      "sh",
      "-lc",
      [
        "set -e",
        `docker stop ${postgresContainerName} >/dev/null 2>&1 || true`,
        `since="$(date -u +%Y-%m-%dT%H:%M:%SZ)"`,
        `docker start ${postgresContainerName} >/dev/null 2>&1 || docker run -d --name ${postgresContainerName} -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=absolute_rag_demo -p ${postgresPort}:5432 -v ${postgresVolumeName}:/var/lib/postgresql/data pgvector/pgvector:pg17 >/dev/null`,
        `docker logs -f --since "$since" ${postgresContainerName} 2>&1 & log_pid=$!`,
        `while docker ps --filter name=^/${postgresContainerName}$ --filter status=running --format '{{.Names}}' | grep -qx ${postgresContainerName}; do sleep 1; done`,
      ].join("; "),
    ],
    port: postgresPort,
    ready: {
      type: "command",
      command: [
        "docker",
        "exec",
        postgresContainerName,
        "pg_isready",
        "-U",
        "postgres",
        "-d",
        "absolute_rag_demo",
      ],
      intervalMs: 500,
      timeoutMs: 60_000,
    },
    shutdown: {
      command: ["docker", "stop", postgresContainerName],
      timeoutMs: 10_000,
    },
    visibility: "internal",
  },
  rag: {
    dependsOn: ["postgres"],
    entry: "src/backend/rag/server.ts",
    env: {
      RAG_POSTGRES_URL: postgresUrl,
    },
    ready: "/health",
    port: 3001,
    visibility: "internal",
  },
  web: {
    angularDirectory: "./src/frontend/angular",
    assetsDirectory: "./src/backend/assets",
    dependsOn: ["postgres"],
    entry: "src/backend/web/server.ts",
    env: {
      RAG_POSTGRES_URL: postgresUrl,
    },
    htmlDirectory: "./src/frontend/html",
    htmxDirectory: "./src/frontend/htmx",
    port: 3000,
    reactDirectory: "./src/frontend/react",
    stylesConfig: "./src/frontend/styles/indexes",
    svelteDirectory: "./src/frontend/svelte",
    vueDirectory: "./src/frontend/vue",
  },
});
