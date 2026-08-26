import { asset } from "@absolutejs/absolute";
import { handleReactPageRequest } from "@absolutejs/absolute/react";
import { Elysia } from "elysia";
import { AgentExchangePage } from "../../frontend/react/pages/AgentExchangePage";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const cssPath = asset(manifest, "AgentExchangeCSS");
  return new Elysia().get("/", ({ request }) =>
    handleReactPageRequest({
      index: asset(manifest, "AgentExchangePageIndex"),
      Page: AgentExchangePage,
      props: { cssPath },
      request,
    }),
  );
};
