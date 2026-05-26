import { Elysia } from "elysia";
import { asset } from "@absolutejs/absolute";
import { handleReactPageRequest } from "@absolutejs/absolute/react";
import { IssuesPage } from "../../frontend/react/pages/IssuesPage";

export const pagesPlugin = (manifest: Record<string, string>) => {
  const cssPath = asset(manifest, "IssuesCSS");

  return new Elysia().get("/", ({ request }) =>
    handleReactPageRequest({
      index: asset(manifest, "IssuesPageIndex"),
      Page: IssuesPage,
      props: { cssPath },
      request,
    }),
  );
};
