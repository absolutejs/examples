import { t, type Static } from "elysia";

const demoBackendModeTypebox = t.Union([
  t.Literal("sqlite-native"),
  t.Literal("sqlite-fallback"),
  t.Literal("postgres"),
  t.Literal("pinecone"),
]);

export const demoBackendModeParamsTypebox = t.Object({
  mode: demoBackendModeTypebox,
});

export type DemoBackendModeParam = Static<typeof demoBackendModeTypebox>;
