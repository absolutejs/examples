import { Elysia } from "elysia";

export const createDemoFixturesPlugin = () =>
  new Elysia()
    .get(
      "/demo/sync-fixtures/workflow-source.md",
      () =>
        new Response(
          "# URL Sync Workflow Source\n\nURL sync keeps the same AbsoluteJS knowledge base fresh when remote source content changes.\n\nThe synced URL should appear in the indexed source list and the knowledge-base operations panel after a sync run.\n",
          {
            headers: {
              "Content-Type": "text/markdown; charset=utf-8",
            },
          },
        ),
    )
    .get(
      "/demo/sync-fixtures/site",
      () =>
        new Response(
          [
            "<!doctype html>",
            '<html lang="en">',
            "<head>",
            '<meta charset="utf-8" />',
            "<title>Site discovery fixture</title>",
            "</head>",
            "<body>",
            "<h1>Site discovery fixture</h1>",
            '<p><a href="/demo/sync-fixtures/site/docs/guide?utm_source=homepage">Canonical guide variant</a></p>',
            '<p><a href="/demo/sync-fixtures/site/nofollow">Nofollow page</a></p>',
            '<p><a href="/demo/sync-fixtures/site/noindex">Noindex page</a></p>',
            '<p><a href="/demo/sync-fixtures/site/private">Robots-blocked page</a></p>',
            "</body>",
            "</html>",
          ].join(""),
          {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
            },
          },
        ),
    )
    .get("/demo/sync-fixtures/site/robots.txt", ({ request }) => {
      const origin = new URL(request.url).origin;
      return new Response(
        [
          "User-agent: *",
          "Disallow: /demo/sync-fixtures/site/private",
          `Sitemap: ${origin}/demo/sync-fixtures/site/sitemap.xml`,
        ].join("\n"),
        {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        },
      );
    })
    .get("/demo/sync-fixtures/site/sitemap.xml", ({ request }) => {
      const origin = new URL(request.url).origin;
      return new Response(
        [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          `<url><loc>${origin}/demo/sync-fixtures/site/docs/guide</loc></url>`,
          `<url><loc>${origin}/demo/sync-fixtures/site/docs/guide?utm_source=sitemap</loc></url>`,
          `<url><loc>${origin}/demo/sync-fixtures/site/nofollow</loc></url>`,
          `<url><loc>${origin}/demo/sync-fixtures/site/noindex</loc></url>`,
          `<url><loc>${origin}/demo/sync-fixtures/site/private</loc></url>`,
          "</urlset>",
        ].join(""),
        {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
          },
        },
      );
    })
    .get(
      "/demo/sync-fixtures/site/docs/guide",
      () =>
        new Response(
          [
            "<!doctype html>",
            '<html lang="en">',
            "<head>",
            '<meta charset="utf-8" />',
            '<link rel="canonical" href="/demo/sync-fixtures/site/docs/guide" />',
            "<title>Guide page</title>",
            "</head>",
            "<body>",
            "<h1>Guide page</h1>",
            "<p>This guide shows how site discovery diagnostics stay visible on the same sync surface as every other source.</p>",
            "</body>",
            "</html>",
          ].join(""),
          {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
            },
          },
        ),
    )
    .get(
      "/demo/sync-fixtures/site/nofollow",
      () =>
        new Response(
          [
            "<!doctype html>",
            '<html lang="en">',
            "<head>",
            '<meta charset="utf-8" />',
            '<meta name="robots" content="nofollow" />',
            "<title>Nofollow page</title>",
            "</head>",
            "<body>",
            "<h1>Nofollow page</h1>",
            "<p>This page should count as a nofollow discovery diagnostic.</p>",
            "</body>",
            "</html>",
          ].join(""),
          {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
            },
          },
        ),
    )
    .get(
      "/demo/sync-fixtures/site/noindex",
      () =>
        new Response(
          [
            "<!doctype html>",
            '<html lang="en">',
            "<head>",
            '<meta charset="utf-8" />',
            '<meta name="robots" content="noindex" />',
            "<title>Noindex page</title>",
            "</head>",
            "<body>",
            "<h1>Noindex page</h1>",
            "<p>This page should be excluded from final ingestion.</p>",
            "</body>",
            "</html>",
          ].join(""),
          {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
            },
          },
        ),
    )
    .get(
      "/demo/sync-fixtures/site/private",
      () =>
        new Response(
          [
            "<!doctype html>",
            '<html lang="en">',
            "<head>",
            '<meta charset="utf-8" />',
            "<title>Private page</title>",
            "</head>",
            "<body>",
            "<h1>Private page</h1>",
            "<p>This route exists only so robots blocking can be demonstrated without a missing page.</p>",
            "</body>",
            "</html>",
          ].join(""),
          {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
            },
          },
        ),
    );
