import { jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

const users = pgTable("users", {
  created_at: timestamp("created_at").notNull().defaultNow(),
  email: varchar("email", { length: 320 }),
  first_name: varchar("first_name", { length: 255 }),
  last_name: varchar("last_name", { length: 255 }),
  primary_auth_identity_id: varchar("primary_auth_identity_id", {
    length: 255,
  }),
  sub: varchar("sub", { length: 36 }).primaryKey(),
});

const authIdentities = pgTable("auth_identities", {
  auth_provider: varchar("auth_provider", { length: 64 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  id: varchar("id", { length: 255 }).primaryKey(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  provider_subject: varchar("provider_subject", { length: 255 }).notNull(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  user_sub: varchar("user_sub", { length: 255 }).notNull(),
});

export const authSchema = {
  authIdentities,
  users,
};
