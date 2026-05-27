// Credentials-block adapters that bridge @absolutejs/auth's CredentialsConfig to the
// example's own `users` table. The package owns password hashes + verify/reset tokens
// via `createNeonCredentialStore`; the example owns the canonical user row.

import {
  validateEmailDeliverability,
  type CredentialIdentity,
} from "@absolutejs/auth";
import { eq } from "drizzle-orm";
import { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { schema, SchemaType } from "../../../db/schema";

const normalizeEmail = (email: string) => email.toLowerCase().trim();

const createAccountId = () => crypto.randomUUID();

export const createCredentialUser = async (
  db: NeonHttpDatabase<SchemaType>,
  identity: CredentialIdentity & Record<string, unknown>,
) => {
  // Pull first/last name off the register body if the consumer's form sent them; they're
  // not part of the CredentialIdentity contract but @absolutejs/auth passes the full body.
  const firstName =
    typeof identity.given_name === "string" ? identity.given_name : null;
  const lastName =
    typeof identity.family_name === "string" ? identity.family_name : null;

  const [user] = await db
    .insert(schema.users)
    .values({
      email: normalizeEmail(identity.email),
      first_name: firstName,
      last_name: lastName,
      primary_auth_identity_id: null,
      sub: createAccountId(),
    })
    .returning();

  if (user === undefined) {
    throw new Error("Failed to create credential user");
  }

  return user;
};
export const ensureEmailDeliverable = async (email: string) => {
  const result = await validateEmailDeliverability(normalizeEmail(email), {
    checkMx: false,
  });

  return result.ok ? null : result.reason;
};
export const getCredentialUserByEmail = async (
  db: NeonHttpDatabase<SchemaType>,
  email: string,
) => {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizeEmail(email)))
    .limit(1);

  return user;
};
