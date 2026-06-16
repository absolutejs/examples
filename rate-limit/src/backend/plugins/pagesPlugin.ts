import { Elysia } from "elysia";
import { asset } from "@absolutejs/absolute";
import { handleReactPageRequest } from "@absolutejs/absolute/react";
import { RateLimitPage } from "../../frontend/react/pages/RateLimitPage";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const cssPath = asset(manifest, "RateLimitCSS");

  return new Elysia().get("/", ({ request }) =>
    handleReactPageRequest({
      index: asset(manifest, "RateLimitPageIndex"),
      Page: RateLimitPage,
      props: { cssPath },
      request,
    }),
  );
};
