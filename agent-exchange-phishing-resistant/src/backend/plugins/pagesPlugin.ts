import { asset } from "@absolutejs/absolute";
import { handleReactPageRequest } from "@absolutejs/absolute/react";
import { Elysia } from "elysia";
import { PhishingResistantPage } from "../../frontend/react/pages/PhishingResistantPage";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const cssPath = asset(manifest, "PhishingResistantCSS");

  return new Elysia().get("/", ({ request }) =>
    handleReactPageRequest({
      index: asset(manifest, "PhishingResistantPageIndex"),
      Page: PhishingResistantPage,
      props: { cssPath },
      request,
    }),
  );
};
