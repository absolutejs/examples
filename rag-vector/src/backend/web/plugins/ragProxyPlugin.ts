import { Elysia } from "elysia";
import { forwardToRagService } from "../handlers/forwardToRagService";

export const createRagProxyPlugin = () =>
  new Elysia()
    .mount("/demo", (request) => forwardToRagService(request, "/demo"))
    .mount("/rag", (request) => forwardToRagService(request, "/rag"));
