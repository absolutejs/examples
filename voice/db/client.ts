import { neon } from "@neondatabase/serverless";
import { defineRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Copy .env.example to .env and add your Neon connection string.",
  );
}

// Neon serverless (HTTP) Drizzle client. Shared by the backend stores and the
// app's own queries; the same Neon database backs the voice platform tables.
const relations = defineRelations(schema);
export const db = drizzle({ client: neon(databaseUrl), relations });

// A few package presets persist via Bun.SQL (raw TCP) instead of Drizzle. Neon's
// `channel_binding=require` is a libpq SCRAM option Bun.SQL does not negotiate,
// so strip it for the TCP path; `sslmode=require` still secures the connection.
export const postgresConnectionString = databaseUrl.replace(
  /[?&]channel_binding=require/,
  "",
);
