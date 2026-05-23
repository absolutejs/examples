import { Elysia } from "elysia";

import { getRagServiceBaseUrl } from "../../shared/ragServiceConfig";
import { forwardToRagService } from "../handlers/forwardToRagService";

// The rag service is visibility:internal, so the browser can only reach its
// live AI-chat WebSocket through this web server. forwardToRagService uses
// fetch, which cannot carry a WebSocket upgrade, so the upgrade is proxied
// here: open an upstream client WebSocket to the rag service and pipe frames
// both ways. Frames are text JSON (ping/pong plus stream events).
const ragWebSocketBaseUrl = getRagServiceBaseUrl().replace(/^http/, "ws");

type ProxyLink = {
  upstream: WebSocket;
  ready: boolean;
  queue: string[];
};

// Keyed by the underlying Bun socket, which is stable across open/message/close
// for a connection; the WeakMap drops the entry when the socket is collected.
const links = new WeakMap<object, ProxyLink>();

const toFrame = (message: unknown) =>
  typeof message === "string" ? message : JSON.stringify(message);

export const createRagProxyPlugin = () =>
  new Elysia()
    .ws("/rag/:mode", {
      close(ws) {
        const link = links.get(ws.raw);
        if (!link) {
          return;
        }
        links.delete(ws.raw);
        try {
          link.upstream.close();
        } catch {}
      },
      message(ws, message) {
        const link = links.get(ws.raw);
        if (!link) {
          return;
        }
        const frame = toFrame(message);
        if (link.ready) {
          link.upstream.send(frame);
        } else {
          link.queue.push(frame);
        }
      },
      open(ws) {
        const upstream = new WebSocket(
          `${ragWebSocketBaseUrl}/rag/${ws.data.params.mode}`,
        );
        const link: ProxyLink = { queue: [], ready: false, upstream };
        links.set(ws.raw, link);

        upstream.addEventListener("open", () => {
          link.ready = true;
          for (const frame of link.queue) {
            upstream.send(frame);
          }
          link.queue = [];
        });
        upstream.addEventListener("message", (event) => {
          try {
            ws.send(event.data as string | ArrayBufferLike);
          } catch {}
        });
        upstream.addEventListener("close", (event) => {
          try {
            ws.close(event.code, event.reason);
          } catch {}
        });
        upstream.addEventListener("error", () => {
          try {
            ws.close();
          } catch {}
        });
      },
    })
    .mount("/demo", (request) => forwardToRagService(request, "/demo"))
    .mount("/rag", (request) => forwardToRagService(request, "/rag"));
