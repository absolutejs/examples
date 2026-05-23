import { getRagServiceBaseUrl } from "../../shared/ragServiceConfig";

const ragServiceBaseUrl = getRagServiceBaseUrl();

export const forwardToRagService = async (
  request: Request,
  mountedPrefix = "",
) => {
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(ragServiceBaseUrl);
  targetUrl.pathname = `${mountedPrefix}${incomingUrl.pathname}`.replace(
    /\/+/g,
    "/",
  );
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  if (request.method === "GET" || request.method === "HEAD") {
    headers.delete("content-length");
  }

  try {
    const response = await fetch(targetUrl, {
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      headers,
      method: request.method,
      redirect: "manual",
    });

    return new Response(response.body, {
      headers: response.headers,
      status: response.status,
    });
  } catch (error) {
    return new Response(
      `RAG service unavailable at ${ragServiceBaseUrl}: ${error instanceof Error ? error.message : String(error)}`,
      { status: 503 },
    );
  }
};
