import {
  createIoRedisSecureMessagingClient,
  createRedisSecureMessagingStore,
  createSecureMessagingRedisAclRules,
} from "@absolutejs/secure-messaging-redis";
import Redis from "ioredis";

export type RedisTlsIdentity = {
  readonly ca: Buffer | string;
  readonly cert: Buffer | string;
  readonly key: Buffer | string;
  readonly password: string;
  readonly username: string;
};

export type RedisTlsEndpoint =
  | {
      readonly host: string;
      readonly mode: "direct";
      readonly port: number;
    }
  | {
      readonly mode: "sentinel";
      readonly name: string;
      readonly sentinelPassword: string;
      readonly sentinelUsername: string;
      readonly sentinels: readonly {
        readonly host: string;
        readonly port: number;
      }[];
    };

const required = (value: string, name: string) => {
  if (!value.trim()) throw new Error(`${name} is required`);
  return value;
};

export const createTlsRedisSecureMessagingStore = (options: {
  readonly deviceId: string;
  readonly endpoint: RedisTlsEndpoint;
  readonly identity: RedisTlsIdentity;
  readonly keyPrefix?: string;
  readonly servername: string;
  readonly tenantId: string;
}) => {
  const identity = options.identity;
  const common = {
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    password: required(identity.password, "Redis password"),
    retryStrategy: () => null,
    tls: {
      ca: identity.ca,
      cert: identity.cert,
      key: identity.key,
      rejectUnauthorized: true,
      servername: required(options.servername, "Redis TLS server name"),
    },
    username: required(identity.username, "Redis username"),
  } as const;
  const redis =
    options.endpoint.mode === "direct"
      ? new Redis({
          ...common,
          host: required(options.endpoint.host, "Redis host"),
          port: options.endpoint.port,
        })
      : new Redis({
          ...common,
          enableTLSForSentinelMode: true,
          name: required(options.endpoint.name, "Redis Sentinel master name"),
          sentinelPassword: required(
            options.endpoint.sentinelPassword,
            "Redis Sentinel password",
          ),
          sentinelUsername: required(
            options.endpoint.sentinelUsername,
            "Redis Sentinel username",
          ),
          sentinels: [...options.endpoint.sentinels],
        });
  const store = createRedisSecureMessagingStore({
    client: createIoRedisSecureMessagingClient(redis),
    deviceId: options.deviceId,
    durability: {
      mode: "aof",
      replicaFsyncs: options.endpoint.mode === "sentinel" ? 1 : 0,
      timeoutMilliseconds: 5_000,
    },
    ...(options.keyPrefix ? { keyPrefix: options.keyPrefix } : {}),
    tenantId: options.tenantId,
  });

  return { redis, store };
};

export const provisionRedisSecureMessagingIdentity = async (options: {
  readonly admin: Redis;
  readonly keyPrefix?: string;
  readonly password: string;
  readonly username: string;
}) => {
  await options.admin.call(
    "ACL",
    "SETUSER",
    required(options.username, "Redis username"),
    "reset",
    "on",
    `>${required(options.password, "Redis password")}`,
    ...createSecureMessagingRedisAclRules(
      options.keyPrefix ? { keyPrefix: options.keyPrefix } : {},
    ),
  );
};
