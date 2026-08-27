import { expect, test } from "bun:test";
import { runSecureMessagingFederationDemo } from "../src/demo";

test("federates an opaque secure message and confidential abuse evidence", async () => {
  expect(await runSecureMessagingFederationDemo()).toEqual({
    abuseEvidenceText: "User-selected private evidence",
    abuseSenderAuthenticity: "receiver-asserted",
    draftRevision: "draft-ietf-mimi-protocol-06",
    negotiatedMode: "strict-e2ee",
    replayBlocked: true,
    routingMetadataContainsSensitiveValue: false,
    sessionAuthenticatedByBothDomains: true,
    signatureSubstitutionBlocked: true,
  });
});
