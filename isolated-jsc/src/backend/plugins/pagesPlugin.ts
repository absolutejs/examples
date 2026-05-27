import { Elysia } from "elysia";
import { asset } from "@absolutejs/absolute";
import { handleReactPageRequest } from "@absolutejs/absolute/react";
import { SandboxPage } from "../../frontend/react/pages/SandboxPage";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const cssPath = asset(manifest, "SandboxCSS");

  return new Elysia().get("/", ({ request }) =>
    handleReactPageRequest({
      index: asset(manifest, "SandboxPageIndex"),
      Page: SandboxPage,
      props: { cssPath },
      request,
    }),
  );
};
