import { expect, test } from "bun:test";
import { runSecureDelegationDemo } from "../src/backend/workflow";

test("runs an exact standing-mandate email exchange without secret leakage", async () => {
  const result = await runSecureDelegationDemo();

  expect(result).toMatchObject({
    attacks: { purposeSubstitution: "rejected", replay: "rejected" },
    mailboxReads: 1,
    modelObservedSecret: false,
    receipt: { maximumUses: 1, status: "submitted" },
    secretPersisted: false,
    submissions: 1,
  });
  expect(result.steps).toHaveLength(5);
  expect(JSON.stringify(result)).not.toContain("482193");
});
