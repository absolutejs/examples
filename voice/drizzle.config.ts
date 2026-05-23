import { env } from "process";
import { defineConfig } from "drizzle-kit";

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in the environment variables");
}

export default defineConfig({
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  dialect: "postgresql",
  out: "db/migrations",
  schema: "db/schema.ts",
});
