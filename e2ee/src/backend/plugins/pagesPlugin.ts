import { asset } from "@absolutejs/absolute";
import { handleReactPageRequest } from "@absolutejs/absolute/react";
import { Elysia } from "elysia";
import { E2EEPage } from "../../frontend/react/pages/E2EEPage";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const cssPath = asset(manifest, "E2eeCSS");

  return new Elysia().get("/", ({ request }) =>
    handleReactPageRequest({
      index: asset(manifest, "E2EEPageIndex"),
      Page: E2EEPage,
      props: { cssPath },
      request,
    }),
  );
};
