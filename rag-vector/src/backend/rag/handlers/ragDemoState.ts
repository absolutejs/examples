import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  createRAGBunS3SyncClient,
  createRAGGmailEmailSyncClient,
  createRAGGoogleContactsConnector,
  createRAGLinkedGmailEmailSyncClient,
  createRAGGraphEmailSyncClient,
  createRAGIMAPEmailSyncClient,
  createRAGStaticEmailSyncClient,
  createRAGFileSyncStateStore,
  loadRAGDocumentsFromDirectory,
  loadRAGDocumentsFromURLs,
  loadRAGDocumentsFromUploads,
  prepareRAGDocument,
  type RAGIngestDocument,
  type RAGCollectionSearchParams,
  type RAGConnectorRuntime,
  type RAGEmailSyncClient,
  type RAGQueryResult,
  type RAGSource,
  type RAGSyncSourceRecord,
} from "@absolutejs/rag";
import {
  createLinkedGmailCredentialResolverFromEnv,
  loadLinkedGmailStatus,
} from "./linkedGmailResolver";
import {
  createRAGFacebookPageConnector,
  createRAGInstagramBusinessConnector,
} from "@absolutejs/rag";
import {
  createLinkedMetaCredentialResolverFromEnv,
  FACEBOOK_PAGE_READ_SCOPES,
  INSTAGRAM_BUSINESS_READ_SCOPES,
  loadLinkedMetaStatus,
} from "./linkedMetaResolver";
import {
  createLinkedGoogleContactsCredentialResolverFromEnv,
  GOOGLE_CONTACTS_READONLY_SCOPE,
  loadLinkedGoogleContactsStatus,
} from "./linkedGoogleContactsResolver";
import {
  type DemoBackendMode,
  type DemoChunkingStrategy,
  type DemoContentFormat,
  type DemoRAGBackend,
  type RagDocumentKind,
  type RagSeedDocument,
  type RagSeedEmbeddingVariant,
  countPreparedChunks,
  DEFAULT_BACKEND_MODE,
  getSeedDocuments,
  RAG_DEMO_DEFAULT_CHUNK_SIZE,
  RAG_DEMO_DEFAULT_CUSTOM_CHUNK_SIZE,
  RAG_DEMO_DOCUMENT_TABLE_NAME,
  seedRAGStore,
} from "./ragBackends";

type DemoSyncDiagnostics = NonNullable<RAGSyncSourceRecord["diagnostics"]>;

const EMBEDDING_VARIANTS_METADATA_KEY = "absoluteEmbeddingVariants";
const SYNC_BINDING_SELECTION_SCOPE = "sync-binding-selection";

type DemoDocument = {
  id: string;
  kind: RagDocumentKind;
  title: string;
  source: string;
  text: string;
  format: DemoContentFormat;
  chunkStrategy: DemoChunkingStrategy;
  chunkSize: number;
  chunkCount: number;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
  embeddingVariants?: RagSeedEmbeddingVariant[];
};

type BackendSeedStats = {
  chunkCount: number;
  totalDocuments: number;
  elapsedMs: number;
};

type DemoSyncSourceDefinition = {
  id: string;
  label: string;
  kind: RAGSyncSourceRecord["kind"];
  description: string;
  metadata?: Record<string, unknown>;
  target: string;
  load: (context?: { userSub?: string }) => Promise<{
    documents: RAGIngestDocument[];
    diagnostics?: DemoSyncDiagnostics;
    metadata?: Record<string, unknown>;
  }>;
};

type DemoEmailSyncFixture = {
  id: string;
  label: string;
  provider: "Gmail" | "Microsoft Graph" | "IMAP";
  target: string;
  description: string;
  mailbox: string;
  messageId: string;
  subject: string;
  from: string;
  attachmentName: string;
  bodyText: string;
  attachmentText: string;
};

type DemoEmailSyncMode = "fixture" | "live";
type DemoLinkedSyncMode = "fixture" | "live-linked";

type DemoSyncRunHistoryEntry = {
  trigger: "manual" | "background" | "scheduled";
  status: "completed" | "failed";
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  documentCount?: number;
  chunkCount?: number;
  error?: string;
};

type CreateRagDemoStateOptions = {
  ragDb: Database;
  ragBackends: {
    backends: Record<DemoBackendMode, DemoRAGBackend>;
    list: () => Array<{
      id: DemoBackendMode;
      label: string;
      path: string;
      available: boolean;
      reason?: string;
    }>;
    active: () => DemoRAGBackend[];
  };
};

export type RagDemoStartup = {
  seedDocs: Array<{
    id: string;
    text: string;
    title?: string;
    source?: string;
    format?: DemoContentFormat;
    chunkStrategy?: DemoChunkingStrategy;
    kind?: RagDocumentKind;
  }>;
  startupStatus: Record<DemoBackendMode, BackendSeedStats>;
  timings: {
    syncSourceLoadMs: number;
    seedDocumentLoadMs: number;
    vectorRebuildMs: number;
    totalRagInitMs: number;
  };
};

const ACTIVE_BACKEND_COOKIE = "absolute_rag_mode";

export type RagDemoState = ReturnType<typeof createRagDemoState>;

const getEnv = (name: string) => {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
};

const getEnvNumber = (name: string) => {
  const value = getEnv(name);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getEnvBoolean = (name: string) => {
  const value = getEnv(name)?.toLowerCase();
  if (!value) {
    return undefined;
  }

  if (value === "true" || value === "1" || value === "yes") {
    return true;
  }

  if (value === "false" || value === "0" || value === "no") {
    return false;
  }

  return undefined;
};

const getEnvList = (name: string) =>
  getEnv(name)
    ?.split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const toMessageTimestamp = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const buildEmailSyncTarget = (
  provider: "Gmail" | "Microsoft Graph" | "IMAP",
  mode: DemoEmailSyncMode,
  values: {
    account?: string;
    query?: string;
    folder?: string;
    host?: string;
    mailbox?: string;
  },
  fallback: string,
) => {
  if (mode === "fixture") {
    return fallback;
  }

  if (provider === "Gmail") {
    return `gmail://${values.account ?? "me"}${values.query ? `?q=${values.query}` : ""}`;
  }

  if (provider === "Microsoft Graph") {
    return `graph://${values.account ?? "me"}${values.folder ? `/folders/${values.folder}` : ""}${
      values.query ? `?search=${values.query}` : ""
    }`;
  }

  return `imap://${values.account ?? values.host ?? "mailbox"}${values.mailbox ? `/${values.mailbox}` : ""}`;
};

const buildEmailSyncDocuments = async ({
  client,
  provider,
  sourceId,
}: {
  client: RAGEmailSyncClient;
  provider: "Gmail" | "Microsoft Graph" | "IMAP";
  sourceId: string;
}) => {
  const listed = await client.listMessages({ maxResults: 25 });
  const attachmentUploads = listed.messages.flatMap((message) =>
    (message.attachments ?? []).map((attachment, index) => ({
      content:
        typeof attachment.content === "string"
          ? attachment.content
          : Buffer.from(attachment.content).toString("base64"),
      contentType: attachment.contentType,
      encoding:
        typeof attachment.content === "string"
          ? (attachment.encoding ?? "utf8")
          : ("base64" as const),
      format: attachment.format,
      metadata: {
        ...(attachment.metadata ?? {}),
        attachmentId: attachment.id ?? `${message.id}-attachment-${index + 1}`,
        emailKind: "attachment",
        emailProvider: provider,
        from: message.from,
        messageId: message.id,
        threadId: message.threadId,
        threadTopic: message.subject,
      },
      name: attachment.name,
      source:
        attachment.source ??
        `sync/email/${sourceId}/${message.threadId ?? message.id}/attachments/${attachment.name}`,
      title:
        attachment.title ??
        `${message.subject ?? message.id} · ${attachment.name}`,
    })),
  );
  const loadedAttachments =
    attachmentUploads.length > 0
      ? await loadRAGDocumentsFromUploads({
          uploads: attachmentUploads,
        })
      : { documents: [] };

  return {
    documents: [
      ...listed.messages.map((message) => ({
        format: message.bodyHtml ? ("html" as const) : ("text" as const),
        metadata: {
          emailKind: "message",
          emailProvider: provider,
          from: message.from,
          hasAttachments: (message.attachments?.length ?? 0) > 0,
          messageId: message.id,
          receivedAt:
            typeof message.receivedAt === "string"
              ? message.receivedAt
              : undefined,
          sentAt: toMessageTimestamp(message.sentAt),
          threadId: message.threadId,
          threadTopic: message.subject,
          to: message.to,
        },
        source: `sync/email/${sourceId}/${message.threadId ?? message.id}`,
        text: message.bodyText,
        title: message.subject ?? message.id,
      })),
      ...loadedAttachments.documents,
    ],
  };
};

const buildConnectorSyncTarget = (
  provider: "facebook" | "instagram" | "google_contacts",
  mode: DemoLinkedSyncMode,
  values: { account?: string },
  fallback: string,
) => {
  if (mode === "fixture") {
    return fallback;
  }

  return `${provider}://${values.account ?? "linked-account"}`;
};

const resolveCurrentUserSelection = (userSub?: string, bindingId?: string) => ({
  bindingId,
  ownerRef: userSub,
});

const buildLinkedConnectorDocuments = async ({
  currentMetadata,
  resolver,
  requiredScopes,
  runtime,
  selection,
  sourceId,
}: {
  currentMetadata?: Record<string, unknown>;
  resolver: Awaited<
    ReturnType<typeof createLinkedMetaCredentialResolverFromEnv>
  >;
  requiredScopes: string[];
  runtime: RAGConnectorRuntime;
  selection: {
    bindingId?: string;
    externalAccountId?: string;
    ownerRef?: string;
  };
  sourceId: string;
}) => {
  const checkpointValue = currentMetadata?.connectorCheckpoint;
  const checkpoint =
    checkpointValue &&
    typeof checkpointValue === "object" &&
    !Array.isArray(checkpointValue)
      ? (checkpointValue as Record<string, unknown>)
      : undefined;
  const credential = await resolver.resolveCredential({
    bindingId: selection.bindingId,
    connectorProvider: runtime.provider,
    externalAccountId: selection.externalAccountId,
    ownerRef: selection.ownerRef ?? "",
    purpose: "background_sync",
    requiredScopes,
  });

  if (!credential) {
    throw new Error(
      `No linked ${runtime.provider} credential could be resolved`,
    );
  }

  const result = await runtime.sync({
    checkpoint,
    credential,
    resolver,
  });

  return {
    diagnostics: undefined,
    documents: result.items.map((item) => ({
      format: item.html ? ("html" as const) : ("text" as const),
      metadata: {
        ...(item.metadata ?? {}),
        connectorBindingId: credential.bindingId,
        connectorExternalAccountId: credential.externalAccountId,
        connectorKind: item.kind,
        connectorProvider: runtime.provider,
        createdAt:
          typeof item.createdAt === "string" ? item.createdAt : undefined,
        itemId: item.id,
        threadId: item.threadId,
        updatedAt:
          typeof item.updatedAt === "string" ? item.updatedAt : undefined,
        url: item.url,
      },
      source:
        item.url ?? `sync/connector/${sourceId}/${item.threadId ?? item.id}`,
      text: item.text ?? item.html ?? "",
      title: item.title ?? item.id,
    })),
    metadata: {
      connectorCheckpoint: result.nextCheckpoint,
      connectorDiagnostics: result.diagnostics,
      connectorItemCount: result.items.length,
      connectorProvider: runtime.provider,
      resumePending: result.nextCheckpoint !== undefined,
    },
  };
};

const buildFacebookFixtureDocuments = async () => ({
  documents: [
    {
      format: "text" as const,
      metadata: {
        connectorKind: "facebook_post",
        connectorProvider: "facebook",
        socialNetwork: "facebook",
      },
      source: "https://facebook.example/absolutejs/page-post-1",
      text: "Facebook Page fixture says release notes and launch updates should ingest through the same linked connector surface as live Meta sources.",
      title: "Facebook Page release update",
    },
  ],
});

const buildInstagramFixtureDocuments = async () => ({
  documents: [
    {
      format: "text" as const,
      metadata: {
        connectorKind: "instagram_media",
        connectorProvider: "instagram",
        socialNetwork: "instagram",
      },
      source: "https://instagram.example/p/absolutejs-launch-1",
      text: "Instagram fixture says product launch media, captions, and linked-business account context should be searchable in the same RAG index.",
      title: "Instagram launch media",
    },
  ],
});

const buildGoogleContactsFixtureDocuments = async () => ({
  documents: [
    {
      format: "text" as const,
      metadata: {
        connectorKind: "google_contact",
        connectorProvider: "google_contacts",
        contactSource: "google_contacts",
        emails: ["alex@absolutejs.dev"],
        organizations: [{ name: "AbsoluteJS", title: "Founder" }],
        phones: ["+1 555-0100"],
      },
      source: "https://contacts.example/absolutejs/alex-kahn",
      text: [
        "Alex Kahn",
        "Emails: alex@absolutejs.dev",
        "Phones: +1 555-0100",
        "Organizations: AbsoluteJS, Founder",
        "Fixture says imported Google contacts should become searchable person records in the same RAG index.",
      ].join("\n"),
      title: "Alex Kahn",
    },
  ],
});

const buildFixtureStorageDocuments = async ({
  bucket,
  keys,
}: {
  bucket: string;
  keys: readonly string[];
}) =>
  loadRAGDocumentsFromUploads({
    uploads: await Promise.all(
      keys.map(async (key) => {
        const relativePath = join("storage-bucket", key);
        const bytes = await Bun.file(
          join(process.cwd(), "rag-demo-corpus", relativePath),
        ).bytes();
        return {
          content: Buffer.from(bytes).toString("base64"),
          contentType: "text/markdown",
          encoding: "base64" as const,
          metadata: {
            storageBucket: bucket,
            storageKey: key,
          },
          name: key.split("/").at(-1) ?? key,
          source: `sync/storage/${key}`,
          title: key.split("/").at(-1) ?? key,
        };
      }),
    ),
  });

const buildSiteDiscoveryFixtureDocuments = async () => {
  const port = process.env.RAG_SERVICE_PORT ?? process.env.PORT ?? "3001";
  const origin = `http://127.0.0.1:${port}`;
  const siteRoot = new URL("/demo/sync-fixtures/site", origin).toString();
  const robotsUrl = new URL(
    "/demo/sync-fixtures/site/robots.txt",
    origin,
  ).toString();
  const fallbackSitemapUrl = new URL(
    "/demo/sync-fixtures/site/sitemap.xml",
    origin,
  ).toString();
  const discoveryCounts = {
    canonical_dedupe_applied: 0,
    robots_blocked: 0,
    nofollow_skipped: 0,
    noindex_skipped: 0,
  };
  const blockedPaths = new Set<string>();
  const trackDiagnostic = (code: keyof typeof discoveryCounts) => {
    discoveryCounts[code] += 1;
  };
  const normalizeDiscoveryUrl = (value: string) => {
    const next = new URL(value, siteRoot);
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "gclid",
      "fbclid",
      "ref",
    ].forEach((key) => next.searchParams.delete(key));
    return next.toString();
  };
  const extractLinks = (html: string, baseUrl: string) =>
    [...html.matchAll(/href=["']([^"']+)["']/gi)]
      .map((match) => match[1])
      .filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      )
      .map((href) => new URL(href, baseUrl).toString())
      .filter((href) => {
        try {
          return new URL(href).origin === new URL(siteRoot).origin;
        } catch {
          return false;
        }
      });

  const robotsResponse = await fetch(robotsUrl);
  if (!robotsResponse.ok) {
    throw new Error(
      `Failed to load site discovery robots fixture: ${robotsResponse.status} ${robotsResponse.statusText}`,
    );
  }
  const robotsText = await robotsResponse.text();
  for (const match of robotsText.matchAll(/^Disallow:\s*(\S+)$/gim)) {
    blockedPaths.add(match[1]);
  }
  const sitemapUrls = [...robotsText.matchAll(/^Sitemap:\s*(\S+)$/gim)].map(
    (match) => match[1],
  );
  if (sitemapUrls.length === 0) {
    sitemapUrls.push(fallbackSitemapUrl);
  }

  const sitemapEntries: string[] = [];
  for (const sitemapUrl of sitemapUrls) {
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to load site discovery sitemap fixture: ${response.status} ${response.statusText}`,
      );
    }
    const xml = await response.text();
    sitemapEntries.push(
      ...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((match) => match[1])
        .filter(
          (value) => typeof value === "string" && !value.endsWith(".xml"),
        ),
    );
  }

  const rootResponse = await fetch(siteRoot);
  if (!rootResponse.ok) {
    throw new Error(
      `Failed to load site discovery root fixture: ${rootResponse.status} ${rootResponse.statusText}`,
    );
  }
  const rootHtml = await rootResponse.text();
  const discovered = new Map<string, Record<string, unknown>>();
  discovered.set(siteRoot, {
    sourceUrl: siteRoot,
    siteUrl: siteRoot,
    siteTitle: "Site discovery fixture",
  });
  for (const url of [...sitemapEntries, ...extractLinks(rootHtml, siteRoot)]) {
    const normalized = normalizeDiscoveryUrl(url);
    if (normalized != url) {
      trackDiagnostic("canonical_dedupe_applied");
    }
    discovered.set(normalized, {
      sourceUrl: normalized,
      siteUrl: siteRoot,
      siteTitle: "Site discovery fixture",
    });
  }

  const urlInputs: Array<{
    url: string;
    source: string;
    title: string;
    metadata: Record<string, unknown>;
  }> = [];
  for (const [url, metadata] of discovered.entries()) {
    const urlObject = new URL(url);
    if (
      [...blockedPaths].some((blockedPath) =>
        urlObject.pathname.startsWith(blockedPath),
      )
    ) {
      trackDiagnostic("robots_blocked");
      continue;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to load site discovery page fixture: ${response.status} ${response.statusText}`,
      );
    }
    const html = await response.text();
    const canonicalMatch = html.match(
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    );
    if (canonicalMatch?.[1]) {
      const canonicalUrl = normalizeDiscoveryUrl(
        new URL(canonicalMatch[1], url).toString(),
      );
      if (canonicalUrl != url) {
        trackDiagnostic("canonical_dedupe_applied");
        if (discovered.has(canonicalUrl)) {
          continue;
        }
      }
    }
    const robotsMetaMatch = html.match(
      /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i,
    );
    const robotsValue = robotsMetaMatch?.[1]?.toLowerCase() ?? "";
    if (robotsValue.includes("noindex")) {
      trackDiagnostic("noindex_skipped");
      continue;
    }
    if (robotsValue.includes("nofollow")) {
      trackDiagnostic("nofollow_skipped");
    }
    urlInputs.push({
      url,
      source: `sync/site/${urlObject.pathname.replace(/^\//, "") || "index.html"}`,
      title:
        html.match(/<title>([^<]+)<\/title>/i)?.[1] ??
        urlObject.pathname.split("/").filter(Boolean).at(-1) ??
        "Site discovery page",
      metadata,
    });
  }

  const loaded = await loadRAGDocumentsFromURLs({ urls: urlInputs });
  const diagnosticLabels: Record<keyof typeof discoveryCounts, string> = {
    canonical_dedupe_applied: "Canonical dedupe applied",
    robots_blocked: "Robots blocked",
    nofollow_skipped: "Nofollow skipped",
    noindex_skipped: "Noindex skipped",
  };
  const entries = Object.entries(discoveryCounts)
    .filter(([, count]) => count > 0)
    .map(([code, count]) => ({
      code: code as keyof typeof discoveryCounts,
      severity: "info" as const,
      summary: `${diagnosticLabels[code as keyof typeof discoveryCounts]}: ${count}`,
    }));

  return {
    documents: loaded.documents,
    diagnostics:
      entries.length > 0
        ? {
            entries,
            summary: entries.map((entry) => entry.summary).join(" · "),
          }
        : undefined,
    metadata: {
      discoveredUrlCount: discovered.size,
      loadedUrlCount: urlInputs.length,
      siteUrl: siteRoot,
    },
  };
};

const buildEmailSyncFixtureDocuments = async (
  fixture: DemoEmailSyncFixture,
) => {
  return buildEmailSyncDocuments({
    client: createRAGStaticEmailSyncClient({
      messages: [
        {
          attachments: [
            {
              content: fixture.attachmentText,
              contentType: "text/markdown",
              name: fixture.attachmentName,
            },
          ],
          bodyText: fixture.bodyText,
          from: fixture.from,
          id: fixture.messageId,
          sentAt: Date.now(),
          subject: fixture.subject,
          threadId: fixture.mailbox,
          to: ["support@absolutejs.dev"],
        },
      ],
    }),
    provider: fixture.provider,
    sourceId: fixture.id,
  });
};

export const createRagDemoState = ({
  ragDb,
  ragBackends,
}: CreateRagDemoStateOptions) => {
  const gmailAccessToken = getEnv("RAG_GMAIL_ACCESS_TOKEN");
  const gmailUserId = getEnv("RAG_GMAIL_USER_ID");
  const gmailQuery = getEnv("RAG_GMAIL_QUERY");
  const gmailLabelIds = getEnvList("RAG_GMAIL_LABEL_IDS");
  const gmailLinkedDatabaseUrl =
    getEnv("RAG_GMAIL_LINKED_DATABASE_URL") ??
    getEnv("AUTH_DATABASE_URL") ??
    getEnv("DATABASE_URL");
  const gmailLinkedEnabled = Boolean(gmailLinkedDatabaseUrl);
  const gmailMode = gmailLinkedEnabled
    ? "live-linked"
    : gmailAccessToken
      ? "live-token"
      : "fixture";
  const createGmailLinkedResolver = gmailLinkedEnabled
    ? () => createLinkedGmailCredentialResolverFromEnv()
    : null;

  const googleContactsLinkedDatabaseUrl =
    getEnv("RAG_GOOGLE_CONTACTS_LINKED_DATABASE_URL") ??
    getEnv("AUTH_DATABASE_URL") ??
    getEnv("DATABASE_URL");
  const googleContactsLinkedEnabled = Boolean(googleContactsLinkedDatabaseUrl);
  const googleContactsMode: DemoLinkedSyncMode = googleContactsLinkedEnabled
    ? "live-linked"
    : "fixture";
  const createGoogleContactsLinkedResolver = googleContactsLinkedEnabled
    ? () => createLinkedGoogleContactsCredentialResolverFromEnv()
    : null;

  const metaLinkedDatabaseUrl =
    getEnv("RAG_META_LINKED_DATABASE_URL") ??
    getEnv("AUTH_DATABASE_URL") ??
    getEnv("DATABASE_URL");
  const facebookLinkedEnabled = Boolean(metaLinkedDatabaseUrl);
  const instagramLinkedEnabled = Boolean(metaLinkedDatabaseUrl);
  const facebookMode: DemoLinkedSyncMode = facebookLinkedEnabled
    ? "live-linked"
    : "fixture";
  const instagramMode: DemoLinkedSyncMode = instagramLinkedEnabled
    ? "live-linked"
    : "fixture";
  const createMetaLinkedResolver =
    facebookLinkedEnabled || instagramLinkedEnabled
      ? () => createLinkedMetaCredentialResolverFromEnv()
      : null;

  const graphAccessToken = getEnv("RAG_GRAPH_ACCESS_TOKEN");
  const graphBaseUrl = getEnv("RAG_GRAPH_BASE_URL");
  const graphUserId = getEnv("RAG_GRAPH_USER_ID");
  const graphFolderId = getEnv("RAG_GRAPH_FOLDER_ID");
  const graphFilter = getEnv("RAG_GRAPH_FILTER");
  const graphSearch = getEnv("RAG_GRAPH_SEARCH");
  const graphMode: DemoEmailSyncMode = graphAccessToken ? "live" : "fixture";

  const imapHost = getEnv("RAG_IMAP_HOST");
  const imapPort = getEnvNumber("RAG_IMAP_PORT");
  const imapSecure = getEnvBoolean("RAG_IMAP_SECURE");
  const imapUsername = getEnv("RAG_IMAP_USERNAME");
  const imapPassword = getEnv("RAG_IMAP_PASSWORD");
  const imapMailbox = getEnv("RAG_IMAP_MAILBOX");
  const imapMode: DemoEmailSyncMode =
    imapHost && imapUsername && imapPassword ? "live" : "fixture";

  const storageBucket = getEnv("RAG_STORAGE_BUCKET");
  const storageRegion = getEnv("RAG_STORAGE_REGION");
  const storageEndpoint = getEnv("RAG_STORAGE_ENDPOINT");
  const storageAccessKeyId = getEnv("RAG_STORAGE_ACCESS_KEY_ID");
  const storageSecretAccessKey = getEnv("RAG_STORAGE_SECRET_ACCESS_KEY");
  const storageSessionToken = getEnv("RAG_STORAGE_SESSION_TOKEN");
  const storagePrefix = getEnv("RAG_STORAGE_PREFIX");
  const storageKeys = getEnvList("RAG_STORAGE_KEYS");
  const storageMode: "fixture" | "live" = storageBucket ? "live" : "fixture";

  const readSyncBindingSelection = ragDb.query<
    { value: string },
    [string, string]
  >("SELECT value FROM demo_ui_state WHERE scope = ?1 AND id = ?2");
  const writeSyncBindingSelection = ragDb.query<
    never,
    [string, string, string, number]
  >(`
    INSERT INTO demo_ui_state (scope, id, value, updated_at)
    VALUES (?1, ?2, ?3, ?4)
    ON CONFLICT(scope, id) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);

  const getSyncBindingSelectionKey = (userSub: string, sourceId: string) =>
    `${userSub}:${sourceId}`;

  const getSelectedBindingId = (
    userSub: string | undefined,
    sourceId: string,
  ) => {
    if (!userSub) {
      return undefined;
    }

    const record = readSyncBindingSelection.get(
      SYNC_BINDING_SELECTION_SCOPE,
      getSyncBindingSelectionKey(userSub, sourceId),
    );
    if (!record?.value) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(record.value);
      return typeof parsed?.bindingId === "string" &&
        parsed.bindingId.trim().length > 0
        ? parsed.bindingId.trim()
        : undefined;
    } catch {
      return undefined;
    }
  };

  const setSelectedBindingId = (
    userSub: string,
    sourceId: string,
    bindingId?: string,
  ) => {
    writeSyncBindingSelection.run(
      SYNC_BINDING_SELECTION_SCOPE,
      getSyncBindingSelectionKey(userSub, sourceId),
      JSON.stringify(bindingId ? { bindingId } : {}),
      Date.now(),
    );
  };

  const ensureTablesSql = `
    CREATE TABLE IF NOT EXISTS ${RAG_DEMO_DOCUMENT_TABLE_NAME} (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('seed', 'custom')),
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      text TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'text',
      chunk_strategy TEXT NOT NULL DEFAULT 'paragraphs',
      chunk_size INTEGER NOT NULL,
      chunk_count INTEGER NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `;

  ragDb.exec(ensureTablesSql);

  const ensureTextColumn = (columnName: string, defaultValue: string) => {
    const columns = ragDb
      .prepare(`PRAGMA table_info(${RAG_DEMO_DOCUMENT_TABLE_NAME})`)
      .all() as Array<{ name?: unknown }>;
    const hasColumn = columns.some((column) => column.name === columnName);
    if (!hasColumn) {
      ragDb.exec(
        `ALTER TABLE ${RAG_DEMO_DOCUMENT_TABLE_NAME} ADD COLUMN ${columnName} TEXT NOT NULL DEFAULT '${defaultValue}'`,
      );
    }
  };

  ensureTextColumn("format", "text");
  ensureTextColumn("chunk_strategy", "paragraphs");
  ensureTextColumn("metadata_json", "{}");

  ragDb.exec(
    `CREATE INDEX IF NOT EXISTS idx_${RAG_DEMO_DOCUMENT_TABLE_NAME}_kind ON ${RAG_DEMO_DOCUMENT_TABLE_NAME}(kind)`,
  );
  ragDb.exec(
    `CREATE INDEX IF NOT EXISTS idx_${RAG_DEMO_DOCUMENT_TABLE_NAME}_source ON ${RAG_DEMO_DOCUMENT_TABLE_NAME}(source)`,
  );

  const DOCUMENT_COLUMNS =
    "id, kind, title, source, text, format, chunk_strategy, chunk_size, chunk_count, metadata_json, created_at, updated_at";
  const SELECT_DOCUMENT_SQL = `SELECT ${DOCUMENT_COLUMNS} FROM ${RAG_DEMO_DOCUMENT_TABLE_NAME}`;

  const documentUpsertStatement = ragDb.prepare(`
    INSERT INTO ${RAG_DEMO_DOCUMENT_TABLE_NAME} (
      id,
      kind,
      title,
      source,
      text,
      format,
      chunk_strategy,
      chunk_size,
      chunk_count,
      metadata_json,
      created_at,
      updated_at
    ) VALUES (
      $id,
      $kind,
      $title,
      $source,
      $text,
      $format,
      $chunkStrategy,
      $chunkSize,
      $chunkCount,
      $metadataJson,
      $createdAt,
      $updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      kind = excluded.kind,
      title = excluded.title,
      source = excluded.source,
      text = excluded.text,
      format = excluded.format,
      chunk_strategy = excluded.chunk_strategy,
      chunk_size = excluded.chunk_size,
      chunk_count = excluded.chunk_count,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `);

  const latestSeedMsByMode: Record<DemoBackendMode, number> = {
    "sqlite-native": 0,
    "sqlite-fallback": 0,
    postgres: 0,
    pinecone: 0,
  };
  const syncStatePath = join(
    process.cwd(),
    ".absolute",
    "rag-vector-demo-sync-state.json",
  );
  const syncStateStore = createRAGFileSyncStateStore(syncStatePath);
  let syncStateLoaded = false;
  const syncSourceDefinitions: DemoSyncSourceDefinition[] = [
    {
      id: "sync-directory",
      label: "Directory sync fixtures",
      kind: "directory",
      description:
        "Watches a stuffed local folder and reconciles adds, updates, and deletions back into the indexed document set on a scheduler.",
      metadata: {
        persistence: syncStatePath,
        schedule: "every 15 seconds",
      },
      target: "rag-demo-corpus/sync-folder",
      load: async () => {
        const loaded = await loadRAGDocumentsFromDirectory({
          directory: join(process.cwd(), "rag-demo-corpus", "sync-folder"),
          recursive: true,
        });

        return {
          documents: loaded.documents.map((document) => ({
            ...document,
            source: `sync/folder/${document.source ?? document.title ?? "document.txt"}`,
          })),
        };
      },
    },
    {
      id: "sync-url",
      label: "URL sync fixture",
      kind: "url",
      description:
        "Fetches a local AbsoluteJS route and reindexes it through the same sync contract used by the core RAG plugin.",
      metadata: {
        persistence: syncStatePath,
        schedule: "manual",
      },
      target: "/demo/sync-fixtures/workflow-source.md",
      load: async () => {
        const port = process.env.RAG_SERVICE_PORT ?? process.env.PORT ?? "3001";
        return loadRAGDocumentsFromURLs({
          urls: [
            {
              url: `http://127.0.0.1:${port}/demo/sync-fixtures/workflow-source.md`,
              source: "sync/url/workflow-source.md",
              title: "Workflow Sync Source",
            },
          ],
        });
      },
    },
    {
      id: "sync-site-discovery",
      label: "Site discovery fixture",
      kind: "url",
      description:
        "Discovers local site pages through robots, sitemap, canonical, nofollow, and noindex fixture routes so the ops surface can show discovery diagnostics on the same sync cards as every other source.",
      metadata: {
        persistence: syncStatePath,
        schedule: "manual",
      },
      target: "/demo/sync-fixtures/site",
      load: async () => buildSiteDiscoveryFixtureDocuments(),
    },
    {
      id: "sync-storage",
      label:
        storageMode === "live"
          ? "Storage sync account"
          : "Storage sync fixture",
      kind: "storage",
      description:
        storageMode === "live"
          ? "Runs the real Bun-native S3 client against the configured bucket through the same AbsoluteJS sync surface used by the fixture path."
          : "Simulates Bun-native S3 object sync on the same ops surface used for directories and URLs, so storage-backed knowledge bases stay first-class in the demo.",
      metadata: {
        accountMode: storageMode,
        persistence: syncStatePath,
        provider: storageEndpoint
          ? "S3-compatible storage"
          : "Amazon S3 / Cloudflare R2",
        schedule: "manual",
        liveReady:
          storageMode === "live"
            ? "Using a real S3-compatible bucket from env configuration."
            : "Ready for a real S3 or R2 bucket through Bun's native S3 client.",
      },
      target:
        storageMode === "live"
          ? `storage://${storageBucket}${storagePrefix ? `/${storagePrefix}` : ""}`
          : "storage://rag-demo-bucket/releases/*",
      load: async () => {
        const fixtureStorageKeys = [
          "releases/storage-sync.md",
          "benchmarks/object-storage.md",
        ] as const;

        if (storageMode === "fixture") {
          return buildFixtureStorageDocuments({
            bucket: "rag-demo-bucket",
            keys: fixtureStorageKeys,
          });
        }

        const client = createRAGBunS3SyncClient({
          accessKeyId: storageAccessKeyId,
          bucket: storageBucket!,
          endpoint: storageEndpoint,
          region: storageRegion,
          secretAccessKey: storageSecretAccessKey,
          sessionToken: storageSessionToken,
        });
        const resolvedKeys =
          storageKeys && storageKeys.length > 0
            ? storageKeys
            : (
                await client.list({
                  maxKeys: 25,
                  prefix: storagePrefix,
                })
              ).contents.map((entry) => entry.key);

        return loadRAGDocumentsFromUploads({
          uploads: await Promise.all(
            resolvedKeys.map(async (key) => {
              const file = client.file(key);
              const bytes = new Uint8Array(await file.arrayBuffer());
              return {
                content: Buffer.from(bytes).toString("base64"),
                contentType: key.endsWith(".md") ? "text/markdown" : undefined,
                encoding: "base64" as const,
                metadata: {
                  storageBucket: storageBucket,
                  storageKey: key,
                },
                name: key.split("/").at(-1) ?? key,
                source: `sync/storage/${key}`,
                title: key.split("/").at(-1) ?? key,
              };
            }),
          ),
        });
      },
    },
    {
      id: "sync-email-gmail",
      label:
        gmailMode === "fixture"
          ? "Gmail sync fixture"
          : gmailMode === "live-linked"
            ? "Gmail linked sync account"
            : "Gmail sync account",
      kind: "email",
      description:
        gmailMode !== "fixture"
          ? gmailMode === "live-linked"
            ? "Runs the Gmail adapter against a durable linked-provider credential resolved through auth, so the demo proves the connector path without handing raw tokens to RAG."
            : "Runs the real Gmail adapter against the configured account through the same AbsoluteJS sync surface used by the fixture path."
          : "Shows the Gmail adapter path with a support mailbox thread and attachment lineage, so switching to a real OAuth-backed Gmail account is a straight adapter swap instead of a different workflow.",
      metadata: {
        persistence: syncStatePath,
        schedule: "manual",
        provider: "Gmail",
        accountMode: gmailMode,
        liveReady:
          gmailMode === "live-linked"
            ? "Using a durable Gmail linked-provider credential resolved through auth-backed storage."
            : gmailMode === "live-token"
              ? "Using a real Gmail OAuth token from env configuration."
              : "Ready for a real Gmail OAuth token and mailbox query.",
      },
      target: buildEmailSyncTarget(
        "Gmail",
        gmailMode === "fixture" ? "fixture" : "live",
        {
          account: gmailUserId ?? "current-user",
          query: gmailQuery,
        },
        "gmail://support/refunds",
      ),
      load: async (context) => {
        if (gmailMode === "live-linked") {
          if (!createGmailLinkedResolver) {
            throw new Error("Linked Gmail resolver is unavailable");
          }

          if (!context?.userSub) {
            throw new Error("Linked Gmail sync requires an authenticated user");
          }

          const selection = resolveCurrentUserSelection(
            context.userSub,
            getSelectedBindingId(context.userSub, "sync-email-gmail"),
          );
          const resolver = await createGmailLinkedResolver();
          return buildEmailSyncDocuments({
            client: createRAGLinkedGmailEmailSyncClient({
              labelIds: gmailLabelIds,
              ownerRef: selection.ownerRef ?? "",
              query: gmailQuery,
              resolver,
              userId: gmailUserId,
            }),
            provider: "Gmail",
            sourceId: "sync-email-gmail",
          });
        }

        if (gmailMode === "live-token") {
          return buildEmailSyncDocuments({
            client: createRAGGmailEmailSyncClient({
              accessToken: gmailAccessToken!,
              labelIds: gmailLabelIds,
              query: gmailQuery,
              userId: gmailUserId,
            }),
            provider: "Gmail",
            sourceId: "sync-email-gmail",
          });
        }

        return buildEmailSyncFixtureDocuments({
          attachmentName: "refund-policy.md",
          attachmentText:
            "# Gmail Refund Policy\n\nThe Gmail-backed workflow keeps sender identity, thread lineage, and attachment evidence visible in the final answer.",
          bodyText:
            "Gmail support thread says refund approvals should preserve sender metadata, thread context, and attachment provenance across retrieval.",
          description: "Gmail support mailbox",
          from: "ops@absolutejs.dev",
          id: "sync-email-gmail",
          label: "Gmail sync fixture",
          mailbox: "gmail-support-refunds",
          messageId: "gmail-refund-thread-1",
          provider: "Gmail",
          subject: "Gmail refund workflow escalation",
          target: "gmail://support/refunds",
        });
      },
    },
    {
      id: "sync-contacts-google",
      label:
        googleContactsMode === "live-linked"
          ? "Google Contacts linked account"
          : "Google Contacts sync fixture",
      kind: "custom",
      description:
        googleContactsMode === "live-linked"
          ? "Runs the Google Contacts connector against a durable linked-provider binding resolved through auth-backed storage."
          : "Shows the Google Contacts connector path with fixture contact records so switching to a real linked Google address book is a straight connector swap.",
      metadata: {
        persistence: syncStatePath,
        schedule: "manual",
        provider: "Google Contacts",
        accountMode: googleContactsMode,
        liveReady:
          googleContactsMode === "live-linked"
            ? "Using a durable Google Contacts linked-provider binding resolved through auth-backed storage."
            : "Ready for a real linked Google Contacts binding.",
      },
      target: buildConnectorSyncTarget(
        "google_contacts",
        googleContactsMode,
        {
          account: "current-user",
        },
        "google_contacts://absolutejs/address-book",
      ),
      load: async (context) => {
        if (googleContactsMode === "live-linked") {
          if (!createGoogleContactsLinkedResolver) {
            throw new Error("Linked Google Contacts resolver is unavailable");
          }

          if (!context?.userSub) {
            throw new Error(
              "Linked Google Contacts sync requires an authenticated user",
            );
          }

          const selection = resolveCurrentUserSelection(
            context.userSub,
            getSelectedBindingId(context.userSub, "sync-contacts-google"),
          );
          const resolver = await createGoogleContactsLinkedResolver();
          return buildLinkedConnectorDocuments({
            currentMetadata: syncSourceRecord("sync-contacts-google")?.metadata,
            requiredScopes: [GOOGLE_CONTACTS_READONLY_SCOPE],
            resolver,
            runtime: createRAGGoogleContactsConnector(),
            selection,
            sourceId: "sync-contacts-google",
          });
        }

        return buildGoogleContactsFixtureDocuments();
      },
    },
    {
      id: "sync-social-facebook",
      label:
        facebookMode === "live-linked"
          ? "Facebook Page linked account"
          : "Facebook Page sync fixture",
      kind: "custom",
      description:
        facebookMode === "live-linked"
          ? "Runs the Facebook Page connector against a durable Meta linked-provider binding resolved through auth-backed storage."
          : "Shows the Facebook Page connector path with a fixture post so switching to a real Meta-linked Page is a straight connector swap.",
      metadata: {
        persistence: syncStatePath,
        schedule: "manual",
        provider: "Facebook Page",
        accountMode: facebookMode,
        liveReady:
          facebookMode === "live-linked"
            ? "Using a durable Facebook Page linked-provider binding resolved through auth-backed storage."
            : "Ready for a real Meta-linked Facebook Page binding.",
      },
      target: buildConnectorSyncTarget(
        "facebook",
        facebookMode,
        {
          account: "current-user",
        },
        "facebook://absolutejs/page",
      ),
      load: async (context) => {
        if (facebookMode === "live-linked") {
          if (!createMetaLinkedResolver) {
            throw new Error("Linked Facebook resolver is unavailable");
          }

          if (!context?.userSub) {
            throw new Error(
              "Linked Facebook sync requires an authenticated user",
            );
          }

          const selection = resolveCurrentUserSelection(
            context.userSub,
            getSelectedBindingId(context.userSub, "sync-social-facebook"),
          );
          const resolver = await createMetaLinkedResolver();
          return buildLinkedConnectorDocuments({
            currentMetadata: syncSourceRecord("sync-social-facebook")?.metadata,
            requiredScopes: [...FACEBOOK_PAGE_READ_SCOPES],
            resolver,
            runtime: createRAGFacebookPageConnector(),
            selection,
            sourceId: "sync-social-facebook",
          });
        }

        return buildFacebookFixtureDocuments();
      },
    },
    {
      id: "sync-social-instagram",
      label:
        instagramMode === "live-linked"
          ? "Instagram business linked account"
          : "Instagram business sync fixture",
      kind: "custom",
      description:
        instagramMode === "live-linked"
          ? "Runs the Instagram business connector against a durable Meta linked-provider binding resolved through auth-backed storage."
          : "Shows the Instagram business connector path with fixture media so switching to a real linked business account is a straight connector swap.",
      metadata: {
        persistence: syncStatePath,
        schedule: "manual",
        provider: "Instagram Business",
        accountMode: instagramMode,
        liveReady:
          instagramMode === "live-linked"
            ? "Using a durable Instagram business linked-provider binding resolved through auth-backed storage."
            : "Ready for a real Meta-linked Instagram business binding.",
      },
      target: buildConnectorSyncTarget(
        "instagram",
        instagramMode,
        {
          account: "current-user",
        },
        "instagram://absolutejs/business",
      ),
      load: async (context) => {
        if (instagramMode === "live-linked") {
          if (!createMetaLinkedResolver) {
            throw new Error("Linked Instagram resolver is unavailable");
          }

          if (!context?.userSub) {
            throw new Error(
              "Linked Instagram sync requires an authenticated user",
            );
          }

          const selection = resolveCurrentUserSelection(context.userSub);
          const resolver = await createMetaLinkedResolver();
          return buildLinkedConnectorDocuments({
            currentMetadata: syncSourceRecord("sync-social-instagram")
              ?.metadata,
            requiredScopes: [...INSTAGRAM_BUSINESS_READ_SCOPES],
            resolver,
            runtime: createRAGInstagramBusinessConnector(),
            selection,
            sourceId: "sync-social-instagram",
          });
        }

        return buildInstagramFixtureDocuments();
      },
    },
    {
      id: "sync-email-graph",
      label: graphMode === "live" ? "Graph sync account" : "Graph sync fixture",
      kind: "email",
      description:
        graphMode === "live"
          ? "Runs the real Microsoft Graph adapter against the configured account through the same AbsoluteJS sync surface used by the fixture path."
          : "Shows the Microsoft Graph adapter path with thread-aware mailbox sync and attachment lineage, so enterprise Outlook/365 mail can use the same AbsoluteJS sync surface.",
      metadata: {
        persistence: syncStatePath,
        schedule: "manual",
        provider: "Microsoft Graph",
        accountMode: graphMode,
        liveReady:
          graphMode === "live"
            ? "Using a real Microsoft Graph OAuth token from env configuration."
            : "Ready for a real Microsoft Graph OAuth token and mailbox query.",
      },
      target: buildEmailSyncTarget(
        "Microsoft Graph",
        graphMode,
        {
          account: graphUserId,
          folder: graphFolderId,
          query: graphSearch ?? graphFilter,
        },
        "graph://support/refunds",
      ),
      load: () =>
        graphMode === "live"
          ? buildEmailSyncDocuments({
              client: createRAGGraphEmailSyncClient({
                accessToken: graphAccessToken!,
                baseUrl: graphBaseUrl,
                filter: graphFilter,
                folderId: graphFolderId,
                search: graphSearch,
                userId: graphUserId,
              }),
              provider: "Microsoft Graph",
              sourceId: "sync-email-graph",
            })
          : buildEmailSyncFixtureDocuments({
              attachmentName: "refund-escalation-notes.md",
              attachmentText:
                "# Graph Escalation Notes\n\nThe Graph-backed mailbox flow preserves conversation IDs, sender context, and attachment lineage for grounded answers.",
              bodyText:
                "Graph support mailbox says enterprise refund escalations should preserve conversation identifiers, sender identity, and attachment evidence during retrieval.",
              description: "Microsoft Graph support mailbox",
              from: "customer-success@absolutejs.dev",
              id: "sync-email-graph",
              label: "Graph sync fixture",
              mailbox: "graph-support-refunds",
              messageId: "graph-refund-thread-1",
              provider: "Microsoft Graph",
              subject: "Graph refund workflow escalation",
              target: "graph://support/refunds",
            }),
    },
    {
      id: "sync-email-imap",
      label: imapMode === "live" ? "IMAP sync account" : "IMAP sync fixture",
      kind: "email",
      description:
        imapMode === "live"
          ? "Runs the real IMAP adapter against the configured mailbox through the same AbsoluteJS sync surface used by the fixture path."
          : "Shows the protocol-level IMAP adapter path, so a generic mailbox can sync through the same AbsoluteJS email workflow without being locked to one hosted provider.",
      metadata: {
        persistence: syncStatePath,
        schedule: "manual",
        provider: "IMAP",
        accountMode: imapMode,
        liveReady:
          imapMode === "live"
            ? "Using a real IMAP host and mailbox from env configuration."
            : "Ready for a real IMAP host, mailbox, and credentials.",
      },
      target: buildEmailSyncTarget(
        "IMAP",
        imapMode,
        {
          account: imapUsername,
          host: imapHost,
          mailbox: imapMailbox,
        },
        "imap://mail.absolutejs.dev/support/refunds",
      ),
      load: () =>
        imapMode === "live"
          ? buildEmailSyncDocuments({
              client: createRAGIMAPEmailSyncClient({
                host: imapHost!,
                mailbox: imapMailbox,
                password: imapPassword!,
                port: imapPort,
                search: ["ALL"],
                secure: imapSecure,
                username: imapUsername!,
              }),
              provider: "IMAP",
              sourceId: "sync-email-imap",
            })
          : buildEmailSyncFixtureDocuments({
              attachmentName: "imap-resolution-checklist.md",
              attachmentText:
                "# IMAP Resolution Checklist\n\nThe IMAP mailbox workflow keeps mailbox source data, sender metadata, and attachment evidence grounded in the final answer.",
              bodyText:
                "IMAP support mailbox says generic mail providers should still preserve sender identity, mailbox context, and attachment lineage across retrieval.",
              description: "IMAP support mailbox",
              from: "mail-ops@absolutejs.dev",
              id: "sync-email-imap",
              label: "IMAP sync fixture",
              mailbox: "imap-support-refunds",
              messageId: "imap-refund-thread-1",
              provider: "IMAP",
              subject: "IMAP refund workflow escalation",
              target: "imap://mail.absolutejs.dev/support/refunds",
            }),
    },
  ];
  let syncSources: RAGSyncSourceRecord[] = syncSourceDefinitions.map(
    (source) =>
      ({
        id: source.id,
        label: source.label,
        kind: source.kind,
        description: source.description,
        metadata: source.metadata,
        target: source.target,
        status: "idle",
        diagnostics: undefined,
      }) satisfies RAGSyncSourceRecord,
  );

  const toNumber = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;

  const toSafeText = (value: unknown, fallback: string) =>
    typeof value === "string" && value.trim().length > 0
      ? value.trim()
      : fallback;

  const hashValue = (value: string) =>
    createHash("sha1").update(value).digest("hex");

  const activeSyncSourceRuns = new Map<
    string,
    Promise<Awaited<ReturnType<typeof syncSourceById>>>
  >();
  let activeSyncAllRun: Promise<
    Awaited<ReturnType<typeof syncAllSourcesInternal>>
  > | null = null;

  const createSyncFingerprint = (document: RAGIngestDocument) =>
    hashValue(
      [document.source ?? "", document.title ?? "", document.text].join("\n"),
    );

  const toDocumentKind = (value: unknown): RagDocumentKind | null =>
    value === "seed" || value === "custom" ? value : null;

  const toContentFormat = (value: unknown): DemoContentFormat =>
    value === "markdown" || value === "html" || value === "text"
      ? value
      : "text";

  const toChunkingStrategy = (value: unknown): DemoChunkingStrategy =>
    value === "paragraphs" ||
    value === "sentences" ||
    value === "fixed" ||
    value === "source_aware"
      ? value
      : "paragraphs";

  const isBackendMode = (value: unknown): value is DemoBackendMode =>
    value === "sqlite-native" ||
    value === "sqlite-fallback" ||
    value === "postgres" ||
    value === "pinecone";

  const parseCookieHeader = (cookieHeader: string | null) => {
    const values = new Map<string, string>();

    if (!cookieHeader) {
      return values;
    }

    for (const part of cookieHeader.split(";")) {
      const [rawKey, ...rawValue] = part.trim().split("=");
      if (!rawKey) {
        continue;
      }
      values.set(rawKey, decodeURIComponent(rawValue.join("=")));
    }

    return values;
  };

  const resolveRequestedBackendMode = (
    request: Request,
    query?: Record<string, unknown>,
  ): DemoBackendMode => {
    const searchParams = new URL(request.url).searchParams;
    const queryMode = query?.mode ?? searchParams.get("mode");
    if (isBackendMode(queryMode) && ragBackends.backends[queryMode].available) {
      return queryMode;
    }

    const cookieValue = parseCookieHeader(request.headers.get("cookie")).get(
      ACTIVE_BACKEND_COOKIE,
    );
    if (
      isBackendMode(cookieValue) &&
      ragBackends.backends[cookieValue].available
    ) {
      return cookieValue;
    }

    return DEFAULT_BACKEND_MODE;
  };

  const getRuntimeBackend = (mode: DemoBackendMode) => {
    const backend = ragBackends.backends[mode];
    if (!backend.available || !backend.rag) {
      return null;
    }

    return backend;
  };

  const normalizeMetadataJson = (value: unknown) => {
    if (typeof value !== "string" || value.trim().length === 0) {
      return {} as Record<string, unknown>;
    }

    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {} as Record<string, unknown>;
    }
  };

  const normalizeEmbeddingVariants = (
    value: unknown,
  ): RagSeedEmbeddingVariant[] | undefined => {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const variants = value.flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }

      const record = entry as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id.trim() : "";
      if (!id) {
        return [];
      }

      return [
        {
          id,
          label:
            typeof record.label === "string" && record.label.trim().length > 0
              ? record.label
              : undefined,
          text:
            typeof record.text === "string" && record.text.trim().length > 0
              ? record.text
              : undefined,
          metadata:
            record.metadata &&
            typeof record.metadata === "object" &&
            !Array.isArray(record.metadata)
              ? (record.metadata as Record<string, unknown>)
              : undefined,
        } satisfies RagSeedEmbeddingVariant,
      ];
    });

    return variants.length > 0 ? variants : undefined;
  };

  const splitStoredMetadata = (metadata: Record<string, unknown>) => {
    const embeddingVariants = normalizeEmbeddingVariants(
      metadata[EMBEDDING_VARIANTS_METADATA_KEY],
    );
    if (!(EMBEDDING_VARIANTS_METADATA_KEY in metadata)) {
      return { embeddingVariants, metadata };
    }

    const nextMetadata = { ...metadata };
    delete nextMetadata[EMBEDDING_VARIANTS_METADATA_KEY];
    return {
      embeddingVariants,
      metadata: nextMetadata,
    };
  };

  const mergeStoredMetadata = (
    metadata: Record<string, unknown> | undefined,
    embeddingVariants: RagSeedEmbeddingVariant[] | undefined,
  ) => ({
    ...(metadata ?? {}),
    ...(embeddingVariants && embeddingVariants.length > 0
      ? { [EMBEDDING_VARIANTS_METADATA_KEY]: embeddingVariants }
      : {}),
  });

  const normalizeDocumentRow = (row: Record<string, unknown>): DemoDocument => {
    const kind = toDocumentKind(row.kind) ?? "custom";
    const id = toSafeText(row.id, `${Date.now()}-doc`);
    const title = toSafeText(row.title, id);
    const source = toSafeText(row.source, `${id}.md`);
    const text = toSafeText(row.text, "");
    const format = toContentFormat(row.format);
    const chunkStrategy = toChunkingStrategy(row.chunk_strategy);
    const chunkSize = toNumber(
      row.chunk_size,
      kind === "seed"
        ? RAG_DEMO_DEFAULT_CHUNK_SIZE
        : RAG_DEMO_DEFAULT_CUSTOM_CHUNK_SIZE,
    );
    const rawMetadata = normalizeMetadataJson(row.metadata_json);
    const { embeddingVariants, metadata } = splitStoredMetadata(rawMetadata);
    const createdAt = toNumber(row.created_at, Date.now());
    const updatedAt = toNumber(row.updated_at, createdAt);
    const chunkCount = toNumber(
      row.chunk_count,
      countPreparedChunks(
        { id, text, title, source, format, chunkStrategy, kind },
        kind,
      ),
    );

    return {
      chunkCount,
      chunkSize,
      chunkStrategy,
      createdAt,
      embeddingVariants,
      format,
      updatedAt,
      id,
      kind,
      source,
      text,
      title,
      metadata,
    };
  };

  const fetchDocumentRows = (kind?: RagDocumentKind) => {
    const rows =
      kind === "seed" || kind === "custom"
        ? (ragDb
            .prepare(
              `${SELECT_DOCUMENT_SQL} WHERE kind = ? ORDER BY created_at ASC`,
            )
            .all(kind) as Array<Record<string, unknown>>)
        : (ragDb
            .prepare(`${SELECT_DOCUMENT_SQL} ORDER BY created_at ASC`)
            .all() as Array<Record<string, unknown>>);

    return rows.map(normalizeDocumentRow);
  };

  const fetchDocumentById = (id: string): DemoDocument | null => {
    const row = ragDb
      .prepare(`${SELECT_DOCUMENT_SQL} WHERE id = ? LIMIT 1`)
      .get(id) as Record<string, unknown> | undefined;

    return row ? normalizeDocumentRow(row) : null;
  };

  const toSeedDocument = (doc: DemoDocument): RagSeedDocument => ({
    id: doc.id,
    source: doc.source,
    title: doc.title,
    text: doc.text,
    format: doc.format,
    chunkStrategy: doc.chunkStrategy,
    kind: doc.kind,
    metadata: doc.metadata,
    embeddingVariants: doc.embeddingVariants,
  });

  const upsertDocument = (document: {
    id: string;
    kind: RagDocumentKind;
    title: string;
    source: string;
    text: string;
    format: DemoContentFormat;
    chunkStrategy: DemoChunkingStrategy;
    chunkCount: number;
    chunkSize?: number;
    createdAt?: number;
    metadata?: Record<string, unknown>;
    embeddingVariants?: RagSeedEmbeddingVariant[];
  }) => {
    const now = Date.now();
    const chunkSize =
      document.chunkSize ??
      (document.kind === "seed"
        ? RAG_DEMO_DEFAULT_CHUNK_SIZE
        : RAG_DEMO_DEFAULT_CUSTOM_CHUNK_SIZE);
    const createdAt =
      document.createdAt === undefined
        ? now
        : toNumber(document.createdAt, now);

    documentUpsertStatement.run({
      $id: document.id,
      $kind: document.kind,
      $title: document.title,
      $source: document.source,
      $text: document.text,
      $format: document.format,
      $chunkStrategy: document.chunkStrategy,
      $chunkSize: chunkSize,
      $chunkCount: document.chunkCount,
      $metadataJson: JSON.stringify(
        mergeStoredMetadata(document.metadata, document.embeddingVariants),
      ),
      $createdAt: createdAt,
      $updatedAt: now,
    });
  };

  const deleteDocumentRow = (id: string) => {
    ragDb
      .prepare(`DELETE FROM ${RAG_DEMO_DOCUMENT_TABLE_NAME} WHERE id = ?`)
      .run(id);
  };

  const countPreparedChunksForSync = (document: RAGIngestDocument) =>
    countPreparedChunks(
      {
        id:
          document.id ??
          hashValue(document.source ?? document.title ?? document.text).slice(
            0,
            12,
          ),
        kind: "custom",
        source: toSafeText(document.source, "sync/document.txt"),
        text: document.text,
        title: toSafeText(document.title, "Synced document"),
        format: toContentFormat(document.format),
        chunkStrategy: toChunkingStrategy(document.chunking?.strategy),
      },
      "custom",
    );

  const replaceSyncSourceRecord = (nextRecord: RAGSyncSourceRecord) => {
    syncSources = syncSources.map((source) =>
      source.id === nextRecord.id ? nextRecord : source,
    );
  };

  const readSyncHistory = (
    metadata: Record<string, unknown> | undefined,
  ): DemoSyncRunHistoryEntry[] => {
    const value = metadata?.recentRuns;
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter(
        (entry): entry is DemoSyncRunHistoryEntry =>
          !!entry &&
          typeof entry === "object" &&
          typeof (entry as DemoSyncRunHistoryEntry).trigger === "string" &&
          typeof (entry as DemoSyncRunHistoryEntry).status === "string" &&
          typeof (entry as DemoSyncRunHistoryEntry).startedAt === "number" &&
          typeof (entry as DemoSyncRunHistoryEntry).finishedAt === "number" &&
          typeof (entry as DemoSyncRunHistoryEntry).durationMs === "number",
      )
      .slice(0, 5);
  };

  const buildSyncMetadata = (
    definition: DemoSyncSourceDefinition,
    existingMetadata: Record<string, unknown> | undefined,
    updates: Partial<Record<string, unknown>> = {},
  ) => ({
    ...(definition.metadata ?? {}),
    ...(existingMetadata ?? {}),
    ...updates,
  });

  const resolveSyncSelection = (
    definition: DemoSyncSourceDefinition,
    userSub?: string,
  ) =>
    resolveCurrentUserSelection(
      userSub,
      getSelectedBindingId(userSub, definition.id),
    );

  const loadDynamicSyncMetadata = async (
    definition: DemoSyncSourceDefinition,
    userSub?: string,
  ) => {
    try {
      if (definition.id === "sync-email-gmail" && gmailMode === "live-linked") {
        return await loadLinkedGmailStatus(
          resolveSyncSelection(definition, userSub),
        );
      }

      if (
        definition.id === "sync-contacts-google" &&
        googleContactsMode === "live-linked"
      ) {
        return await loadLinkedGoogleContactsStatus(
          resolveSyncSelection(definition, userSub),
        );
      }

      if (
        definition.id === "sync-social-facebook" &&
        facebookMode === "live-linked"
      ) {
        return await loadLinkedMetaStatus(
          "facebook",
          resolveSyncSelection(definition, userSub),
        );
      }

      if (
        definition.id === "sync-social-instagram" &&
        instagramMode === "live-linked"
      ) {
        return await loadLinkedMetaStatus(
          "instagram",
          resolveSyncSelection(definition, userSub),
        );
      }

      return {} as Record<string, unknown>;
    } catch (error) {
      return {
        linkedProviderConfigured: false,
        linkedProviderError:
          error instanceof Error
            ? error.message
            : `Failed to load linked ${definition.id} status`,
      } satisfies Record<string, unknown>;
    }
  };

  const stripPersistedSyncMetadata = (
    metadata: Record<string, unknown> | undefined,
  ) => {
    if (!metadata) {
      return {} as Record<string, unknown>;
    }

    return Object.fromEntries(
      Object.entries(metadata).filter(
        ([key]) =>
          key === "connectorCheckpoint" ||
          key === "lastTrigger" ||
          key === "recentRuns",
      ),
    );
  };

  const buildSyncMetadataAsync = async (
    definition: DemoSyncSourceDefinition,
    existingMetadata: Record<string, unknown> | undefined,
    updates: Partial<Record<string, unknown>> = {},
    userSub?: string,
  ) => ({
    ...(definition.metadata ?? {}),
    ...stripPersistedSyncMetadata(existingMetadata),
    ...(await loadDynamicSyncMetadata(definition, userSub)),
    ...updates,
  });

  const toSyncSourceRecordForUser = async (
    record: RAGSyncSourceRecord,
    userSub?: string,
  ): Promise<RAGSyncSourceRecord> => {
    const definition = syncSourceDefinitions.find(
      (source) => source.id === record.id,
    );
    if (!definition) {
      return record;
    }

    return {
      ...record,
      metadata: await buildSyncMetadataAsync(
        definition,
        record.metadata,
        {},
        userSub,
      ),
    };
  };

  const appendSyncHistory = (
    definition: DemoSyncSourceDefinition,
    existingMetadata: Record<string, unknown> | undefined,
    entry: DemoSyncRunHistoryEntry,
  ) =>
    buildSyncMetadata(definition, existingMetadata, {
      lastTrigger: entry.trigger,
      recentRuns: [entry, ...readSyncHistory(existingMetadata)].slice(0, 5),
    });

  const resolveSyncTrigger = (
    definition: DemoSyncSourceDefinition,
    options: { background?: boolean } | undefined,
  ): DemoSyncRunHistoryEntry["trigger"] => {
    if (options?.background) {
      return typeof definition.metadata?.schedule === "string"
        ? "scheduled"
        : "background";
    }

    return "manual";
  };

  const ensureSyncSourcesLoaded = async () => {
    if (syncStateLoaded) {
      return;
    }

    const persisted = await syncStateStore.load();
    syncSources = await Promise.all(
      syncSourceDefinitions.map(async (definition) => {
        const existing = persisted.find(
          (record: RAGSyncSourceRecord) => record.id === definition.id,
        );
        return {
          id: definition.id,
          label: definition.label,
          kind: definition.kind,
          description: definition.description,
          target: definition.target,
          metadata: await buildSyncMetadataAsync(
            definition,
            existing?.metadata,
          ),
          status: existing?.status ?? "idle",
          lastError: existing?.lastError,
          lastStartedAt: existing?.lastStartedAt,
          lastSuccessfulSyncAt: existing?.lastSuccessfulSyncAt,
          lastSyncedAt: existing?.lastSyncedAt,
          lastSyncDurationMs: existing?.lastSyncDurationMs,
          consecutiveFailures: existing?.consecutiveFailures,
          retryAttempts: existing?.retryAttempts,
          nextRetryAt: existing?.nextRetryAt,
          documentCount: existing?.documentCount,
          chunkCount: existing?.chunkCount,
          diagnostics: existing?.diagnostics,
        } satisfies RAGSyncSourceRecord;
      }),
    );
    syncStateLoaded = true;
  };

  const persistSyncSources = async () => {
    await syncStateStore.save(syncSources);
  };

  const syncSourceRecord = (id: string) =>
    syncSources.find((source) => source.id === id) ?? null;

  const syncSourceById = async (
    id: string,
    options?: { background?: boolean; userSub?: string },
  ) => {
    await ensureSyncSourcesLoaded();
    const definition = syncSourceDefinitions.find((source) => source.id === id);
    if (!definition) {
      return { ok: false as const, error: `Unknown sync source ${id}` };
    }

    const startedAt = Date.now();
    const currentRecord = syncSourceRecord(id);
    const trigger = resolveSyncTrigger(definition, options);
    replaceSyncSourceRecord({
      ...(currentRecord ?? {
        id: definition.id,
        label: definition.label,
        kind: definition.kind,
        description: definition.description,
        metadata: definition.metadata,
        target: definition.target,
      }),
      metadata: await buildSyncMetadataAsync(
        definition,
        currentRecord?.metadata,
        {
          lastTrigger: trigger,
        },
        options?.userSub,
      ),
      lastStartedAt: startedAt,
      status: "running",
      lastError: undefined,
    });
    await persistSyncSources();

    try {
      const loaded = await definition.load({ userSub: options?.userSub });
      const existingDocuments = fetchDocumentRows("custom").filter(
        (document) => document.metadata.syncSourceId === id,
      );
      const existingBySyncKey = new Map<string, DemoDocument>();
      for (const document of existingDocuments) {
        const syncKey =
          typeof document.metadata.syncKey === "string"
            ? document.metadata.syncKey
            : document.source;
        existingBySyncKey.set(syncKey, document);
      }

      const nextSyncKeys = new Set<string>();
      let changed = false;
      let totalChunkCount = 0;

      for (const [index, document] of loaded.documents.entries()) {
        const fallbackSource = `sync/${definition.id}/document-${index + 1}.txt`;
        const syncKey = toSafeText(document.source, fallbackSource);
        const fingerprint = createSyncFingerprint(document);
        const existing = existingBySyncKey.get(syncKey);
        const chunkStrategy = toChunkingStrategy(document.chunking?.strategy);
        const chunkCount = countPreparedChunksForSync(document);
        totalChunkCount += chunkCount;
        nextSyncKeys.add(syncKey);

        if (existing?.metadata.syncFingerprint === fingerprint) {
          continue;
        }

        const documentId =
          existing?.id ??
          `sync-${definition.id}-${hashValue(syncKey).slice(0, 12)}`;
        upsertDocument({
          id: documentId,
          kind: "custom",
          title: toSafeText(
            document.title,
            syncKey.split("/").at(-1) ?? documentId,
          ),
          source: syncKey,
          text: document.text,
          format: toContentFormat(document.format),
          chunkStrategy,
          chunkCount,
          chunkSize: RAG_DEMO_DEFAULT_CUSTOM_CHUNK_SIZE,
          createdAt: existing?.createdAt,
          metadata: {
            ...(document.metadata ?? {}),
            syncFingerprint: fingerprint,
            syncKey,
            syncSourceId: definition.id,
          },
        });
        changed = true;
      }

      for (const document of existingDocuments) {
        const syncKey =
          typeof document.metadata.syncKey === "string"
            ? document.metadata.syncKey
            : document.source;
        if (nextSyncKeys.has(syncKey)) {
          continue;
        }

        deleteDocumentRow(document.id);
        changed = true;
      }

      if (changed) {
        await rebuildVectorStores();
      }

      const finishedAt = Date.now();
      const nextRecord: RAGSyncSourceRecord = {
        id: definition.id,
        label: definition.label,
        kind: definition.kind,
        description: definition.description,
        metadata: await buildSyncMetadataAsync(
          definition,
          appendSyncHistory(definition, syncSourceRecord(id)?.metadata, {
            trigger,
            status: "completed",
            startedAt,
            finishedAt,
            durationMs: finishedAt - startedAt,
            documentCount: loaded.documents.length,
            chunkCount: totalChunkCount,
          }),
          loaded.metadata ?? {},
          options?.userSub,
        ),
        target: definition.target,
        status: "completed",
        diagnostics: loaded.diagnostics,
        lastSuccessfulSyncAt: finishedAt,
        consecutiveFailures: 0,
        lastSyncedAt: finishedAt,
        lastSyncDurationMs: finishedAt - startedAt,
        documentCount: loaded.documents.length,
        chunkCount: totalChunkCount,
      };
      replaceSyncSourceRecord(nextRecord);
      await persistSyncSources();

      return {
        ok: true as const,
        source: nextRecord,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      const failedAt = Date.now();
      const failedRecord: RAGSyncSourceRecord = {
        id: definition.id,
        label: definition.label,
        kind: definition.kind,
        description: definition.description,
        metadata: await buildSyncMetadataAsync(
          definition,
          appendSyncHistory(definition, syncSourceRecord(id)?.metadata, {
            trigger,
            status: "failed",
            startedAt,
            finishedAt: failedAt,
            durationMs: failedAt - startedAt,
            error: message,
          }),
          {},
          options?.userSub,
        ),
        target: definition.target,
        status: "failed",
        diagnostics: syncSourceRecord(id)?.diagnostics,
        consecutiveFailures:
          (syncSourceRecord(id)?.consecutiveFailures ?? 0) + 1,
        lastError: message,
        lastSyncedAt: failedAt,
        lastSyncDurationMs: failedAt - startedAt,
      };
      replaceSyncSourceRecord(failedRecord);
      await persistSyncSources();

      return {
        ok: false as const,
        error: message,
      };
    }
  };

  const queueSyncSource = async (
    id: string,
    options?: { background?: boolean; userSub?: string },
  ) => {
    const existingRun = activeSyncSourceRuns.get(id);
    if (existingRun) {
      return {
        ok: true as const,
        source: syncSourceRecord(id) ?? {
          id,
          label: id,
          kind: "directory" as const,
          status: "running" as const,
        },
      };
    }

    const run = syncSourceById(id, options);
    activeSyncSourceRuns.set(
      id,
      run.finally(() => {
        activeSyncSourceRuns.delete(id);
      }),
    );

    await Promise.resolve();

    return {
      ok: true as const,
      source: syncSourceRecord(id) ?? {
        id,
        label: id,
        kind: "directory" as const,
        status: "running" as const,
      },
    };
  };

  const syncAllSourcesInternal = async (options?: {
    background?: boolean;
    userSub?: string;
  }) => {
    await ensureSyncSourcesLoaded();
    for (const source of syncSourceDefinitions) {
      const result = await syncSourceById(source.id, options);
      if (!result.ok) {
        return result;
      }
    }

    return {
      ok: true as const,
      sources: syncSources,
    };
  };

  const queueSyncAllSources = async (options?: {
    background?: boolean;
    userSub?: string;
  }) => {
    if (!activeSyncAllRun) {
      activeSyncAllRun = syncAllSourcesInternal(options).finally(() => {
        activeSyncAllRun = null;
      });
    }

    await Promise.resolve();

    return {
      ok: true as const,
      sources: syncSources,
    };
  };

  const ensureSeedDocuments = async () => {
    const now = Date.now();
    const seedDocuments = (await getSeedDocuments()).map(
      (doc: RagSeedDocument) => ({
        id: doc.id,
        kind: "seed" as const,
        title: toSafeText(doc.title, doc.id),
        source: toSafeText(doc.source, `${doc.id}.md`),
        text: doc.text,
        format: doc.format ?? "text",
        chunkStrategy: doc.chunkStrategy ?? "source_aware",
        chunkCount: countPreparedChunks(doc, "seed"),
        chunkSize: RAG_DEMO_DEFAULT_CHUNK_SIZE,
        createdAt: now,
        metadata: doc.metadata ?? {},
        embeddingVariants: doc.embeddingVariants,
      }),
    );

    const seedIds = seedDocuments.map((doc) => doc.id);
    if (seedIds.length > 0) {
      const placeholders = seedIds.map(() => "?").join(", ");
      ragDb
        .prepare(
          `DELETE FROM ${RAG_DEMO_DOCUMENT_TABLE_NAME} WHERE kind = 'seed' AND id NOT IN (${placeholders})`,
        )
        .run(...seedIds);
    } else {
      ragDb
        .prepare(
          `DELETE FROM ${RAG_DEMO_DOCUMENT_TABLE_NAME} WHERE kind = 'seed'`,
        )
        .run();
    }

    for (const doc of seedDocuments) {
      upsertDocument(doc);
    }

    return seedDocuments;
  };

  const buildCorpusFromDb = (): RagSeedDocument[] =>
    fetchDocumentRows().map(toSeedDocument);

  const buildPreparedDocument = (document: DemoDocument) =>
    prepareRAGDocument({
      id: document.id,
      text: document.text,
      title: document.title,
      source: document.source,
      format: document.format,
      metadata: {
        ...(document.metadata ?? {}),
        documentId: document.id,
        kind: document.kind,
      },
      chunking: {
        strategy: document.chunkStrategy,
        maxChunkLength: document.chunkSize,
      },
    });

  const rebuildVectorStores = async () => {
    const corpus = buildCorpusFromDb();
    const results = await Promise.all(
      ragBackends.active().map(async (backend) => {
        const start = Date.now();
        const ragStore = backend.rag!.store;

        if (typeof ragStore.clear === "function") {
          await ragStore.clear();
        }

        const chunkCount = await seedRAGStore(ragStore, corpus);
        const elapsedMs = Date.now() - start;
        latestSeedMsByMode[backend.id] = elapsedMs;

        return [
          backend.id,
          {
            chunkCount,
            totalDocuments: corpus.length,
            elapsedMs,
          } satisfies BackendSeedStats,
        ] as const;
      }),
    );

    return Object.fromEntries(results) as Record<
      DemoBackendMode,
      BackendSeedStats
    >;
  };

  const getDocumentList = (query: { kind?: unknown }) => {
    const requestedKind = toDocumentKind(query.kind);
    return fetchDocumentRows(requestedKind ?? undefined);
  };

  const createIndexManager = () => ({
    listDocuments: ({ kind }: { kind?: string } = {}) =>
      getDocumentList({ kind }),
    createDocument: async (input: {
      id?: string;
      title?: string;
      source?: string;
      text: string;
      format?: DemoContentFormat;
      chunking?: { strategy?: DemoChunkingStrategy };
    }) => {
      const title = toSafeText(input?.title, "");
      const text = toSafeText(input?.text, "");

      if (title.length === 0 || text.length === 0) {
        return { ok: false as const, error: "title and text are required" };
      }

      const rawId = toSafeText(input?.id, crypto.randomUUID());
      const source = toSafeText(input?.source, `${rawId}.md`);
      const format = toContentFormat(input?.format);
      const chunkStrategy = toChunkingStrategy(
        input?.chunking?.strategy ??
          (input as { "chunking.strategy"?: unknown })["chunking.strategy"],
      );
      const sourceDoc: RagSeedDocument = {
        id: rawId,
        text,
        title,
        source,
        format,
        chunkStrategy,
        kind: "custom",
      };

      const chunkCount = countPreparedChunks(sourceDoc, "custom");
      const now = Date.now();

      upsertDocument({
        id: rawId,
        kind: "custom",
        title,
        source,
        text,
        format,
        chunkStrategy,
        chunkCount,
        chunkSize: RAG_DEMO_DEFAULT_CUSTOM_CHUNK_SIZE,
        metadata: {},
      });

      const backendStats = await rebuildVectorStores();

      return {
        ok: true as const,
        inserted: rawId,
        document: {
          id: rawId,
          kind: "custom" as const,
          title,
          source,
          text,
          format,
          chunkStrategy,
          chunkSize: RAG_DEMO_DEFAULT_CUSTOM_CHUNK_SIZE,
          chunkCount,
          createdAt: now,
          updatedAt: now,
          metadata: {},
        },
        backendStats,
      };
    },
    getDocumentChunks: (id: string) => {
      const document = fetchDocumentById(id);
      if (!document) {
        return null;
      }

      const prepared = buildPreparedDocument(document);
      return {
        document: {
          id: document.id,
          title: document.title,
          source: document.source,
          kind: document.kind,
          format: document.format,
          chunkStrategy: document.chunkStrategy,
          chunkSize: document.chunkSize,
          metadata: document.metadata,
        },
        normalizedText: prepared.normalizedText,
        chunks: prepared.chunks,
      };
    },
    deleteDocument: async (id: string) => {
      const document = fetchDocumentById(id);
      if (!document || document.kind === "seed") {
        return false;
      }

      deleteDocumentRow(id);
      await rebuildVectorStores();
      return true;
    },
    listSyncSources: async (options?: { userSub?: string }) => {
      await ensureSyncSourcesLoaded();
      if (!options?.userSub) {
        return syncSources;
      }

      return await Promise.all(
        syncSources.map((source) =>
          toSyncSourceRecordForUser(source, options.userSub),
        ),
      );
    },
    syncSource: async (
      id: string,
      options?: { background?: boolean; userSub?: string },
    ) =>
      options?.background
        ? queueSyncSource(id, options)
        : syncSourceById(id, options),
    syncAllSources: async (options?: {
      background?: boolean;
      userSub?: string;
    }) =>
      options?.background
        ? queueSyncAllSources(options)
        : syncAllSourcesInternal(options),
    reseed: async () => {
      await ensureSeedDocuments();
      const status = await rebuildVectorStores();
      return {
        ok: true as const,
        status: "seeded",
        backendStats: status,
        documents: buildCorpusFromDb().length,
      };
    },
    reset: async () => {
      ragDb
        .prepare(
          `DELETE FROM ${RAG_DEMO_DOCUMENT_TABLE_NAME} WHERE kind = 'custom'`,
        )
        .run();
      await ensureSeedDocuments();
      const status = await rebuildVectorStores();

      return {
        ok: true as const,
        status: "reset",
        backendStats: status,
        documents: buildCorpusFromDb().length,
      };
    },
  });

  const unavailableProvider = () => {
    throw new Error(
      "This demo only exposes the RAG workflow primitives. AI chat is not configured here.",
    );
  };

  const buildSources = (results: RAGQueryResult[]): RAGSource[] =>
    results.map((entry) => ({
      chunkId: entry.chunkId,
      score: entry.score,
      text: entry.chunkText,
      title: entry.title,
      source: entry.source,
      metadata: entry.metadata,
    }));

  const normalizeSearchPayload = (
    body: unknown,
  ): RAGCollectionSearchParams | null => {
    if (!body || typeof body !== "object") {
      return null;
    }

    const payload = body as Record<string, unknown>;
    const query = typeof payload.query === "string" ? payload.query.trim() : "";
    if (!query) {
      return null;
    }

    const filterEntries =
      payload.filter && typeof payload.filter === "object"
        ? Object.entries(payload.filter as Record<string, unknown>)
        : [];

    const compatFilterEntries = ["kind", "source", "documentId"]
      .map((key) => [key, payload[key]] as const)
      .filter(([, value]) => typeof value === "string" && value.length > 0);

    const filter = Object.fromEntries([
      ...filterEntries,
      ...compatFilterEntries,
    ]);

    return {
      query,
      topK: typeof payload.topK === "number" ? payload.topK : undefined,
      scoreThreshold:
        typeof payload.scoreThreshold === "number"
          ? payload.scoreThreshold
          : undefined,
      model: typeof payload.model === "string" ? payload.model : undefined,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    };
  };

  const listBackendDiagnostics = () =>
    ragBackends.list().map((backend) => {
      const runtime = ragBackends.backends[backend.id];
      return {
        ...backend,
        lastSeedMs: latestSeedMsByMode[backend.id],
        status: runtime.available ? runtime.rag?.getStatus?.() : undefined,
        capabilities: runtime.available
          ? runtime.rag?.getCapabilities?.()
          : undefined,
      };
    });

  const clearSelectedIndex = async (mode: DemoBackendMode) => {
    const backend = getRuntimeBackend(mode);
    if (!backend) {
      return false;
    }

    if (typeof backend.rag?.collection.clear === "function") {
      await backend.rag.collection.clear();
    }

    return true;
  };

  const setSyncSourceBindingSelection = async (
    sourceId: string,
    userSub: string,
    bindingId?: string,
  ) => {
    await ensureSyncSourcesLoaded();
    const definition = syncSourceDefinitions.find(
      (source) => source.id === sourceId,
    );
    if (!definition) {
      return { ok: false as const, error: `Unknown sync source ${sourceId}` };
    }

    const metadata = await loadDynamicSyncMetadata(definition, userSub);
    const linkedAvailableBindings = (metadata as Record<string, unknown>)
      .linkedAvailableBindings;
    const availableBindings = Array.isArray(linkedAvailableBindings)
      ? linkedAvailableBindings.filter(
          (entry): entry is { id: string } =>
            !!entry &&
            typeof entry === "object" &&
            typeof (entry as { id?: unknown }).id === "string" &&
            (entry as { id: string }).id.length > 0,
        )
      : [];

    if (
      bindingId &&
      !availableBindings.some((entry) => entry.id === bindingId)
    ) {
      return {
        ok: false as const,
        error: `Unknown binding ${bindingId} for ${sourceId}`,
      };
    }

    setSelectedBindingId(userSub, sourceId, bindingId);
    return { ok: true as const };
  };

  const initialize = async (): Promise<RagDemoStartup> => {
    const initStart = Date.now();

    const syncSourceLoadStart = Date.now();
    await ensureSyncSourcesLoaded();
    const syncSourceLoadMs = Date.now() - syncSourceLoadStart;

    const seedDocumentLoadStart = Date.now();
    const seedDocs = await ensureSeedDocuments();
    const seedDocumentLoadMs = Date.now() - seedDocumentLoadStart;

    const vectorRebuildStart = Date.now();
    const startupStatus = await rebuildVectorStores();
    const vectorRebuildMs = Date.now() - vectorRebuildStart;

    return {
      seedDocs,
      startupStatus,
      timings: {
        syncSourceLoadMs,
        seedDocumentLoadMs,
        vectorRebuildMs,
        totalRagInitMs: Date.now() - initStart,
      },
    };
  };

  return {
    activeBackendCookie: ACTIVE_BACKEND_COOKIE,
    listBackends: ragBackends.list,
    createIndexManager,
    resolveRequestedBackendMode,
    getRuntimeBackend,
    buildSources,
    normalizeSearchPayload,
    listBackendDiagnostics,
    clearSelectedIndex,
    initialize,
    setSyncSourceBindingSelection,
    unavailableProvider,
  };
};
