import { Elysia } from "elysia";
import { runSecureDelegationDemo } from "../workflow";

export const workflowPlugin = new Elysia({ name: "demo:agent-exchange" }).post(
  "/api/agent-exchange/run",
  () => runSecureDelegationDemo(),
);
