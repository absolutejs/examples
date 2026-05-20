import { jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  sub: varchar("sub", { length: 36 }).primaryKey(),
  first_name: varchar("first_name", { length: 255 }),
  last_name: varchar("last_name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  created_at: timestamp("created_at").notNull().defaultNow(),
  primary_auth_identity_id: varchar("primary_auth_identity_id", {
    length: 255,
  }),
});

export const authIdentities = pgTable("auth_identities", {
  id: varchar("id", { length: 255 }).primaryKey(),
  user_sub: varchar("user_sub", { length: 255 }).notNull(),
  auth_provider: varchar("auth_provider", { length: 64 }).notNull(),
  provider_subject: varchar("provider_subject", { length: 255 }).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const authSchema = {
  authIdentities,
  users,
};

export type AuthSchema = typeof authSchema;
