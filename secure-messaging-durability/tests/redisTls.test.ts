import { expect, test } from "bun:test";
import {
  createTlsRedisSecureMessagingStore,
  provisionRedisSecureMessagingIdentity,
} from "../src/redisTls";

test("fails closed when the TLS server identity is absent", () => {
  expect(() =>
    createTlsRedisSecureMessagingStore({
      deviceId: "device-1",
      endpoint: { host: "redis.internal", mode: "direct", port: 6380 },
      identity: {
        ca: "ca",
        cert: "cert",
        key: "key",
        password: "password",
        username: "application-current",
      },
      servername: "",
      tenantId: "tenant-1",
    }),
  ).toThrow("server name");
});

test("provisions the exported namespace-scoped ACL contract", async () => {
  const calls: unknown[][] = [];
  await provisionRedisSecureMessagingIdentity({
    admin: {
      call: async (...arguments_: unknown[]) => {
        calls.push(arguments_);
        return "OK";
      },
    } as never,
    password: "generated-password",
    username: "application-current",
  });
  expect(calls).toHaveLength(1);
  expect(calls[0]).toContain("-@all");
  expect(calls[0]).toContain("resetchannels");
  expect(calls[0]).toContain("~absolute:secure-messaging:*");
  expect(calls[0]).not.toContain("+@all");
});
