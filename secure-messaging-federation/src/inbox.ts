import { createManagedFederationInboxClient } from "./managedInboxClient";

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);

  return value;
};

const client = await createManagedFederationInboxClient({
  baseUrl: required("PAAS_URL"),
  domain: required("FEDERATION_DOMAIN"),
  projectId: required("PROJECT_ID"),
  onVerification: ({ userCode, verificationUriComplete }) => {
    console.log(`Approve code ${userCode} at ${verificationUriComplete}`);
  },
});

await client.authorize();
const lease = await client.lease();
console.log(
  JSON.stringify({
    leaseExpiresAt: lease.leaseExpiresAt,
    messages: lease.messages.map(({ messageId, originDomain, sequence }) => ({
      messageId,
      originDomain,
      sequence,
    })),
  }),
);
if (lease.messages.length > 0) {
  const acknowledged = await client.acknowledge(lease);
  console.log(`Acknowledged ${acknowledged} encrypted message(s).`);
}
