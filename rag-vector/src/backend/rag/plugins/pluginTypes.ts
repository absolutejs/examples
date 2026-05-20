import type {
  createHeuristicRAGQueryTransform,
  createRAGCollection,
} from "@absolutejs/rag";
import type { DemoBackendMode } from "../../../frontend/demo-backends";
import type { createDemoQualityController } from "../handlers/demoQuality";
import type { createDemoUIStateController } from "../handlers/demoUiState";
import type { createDemoAIProviderCatalog } from "../handlers/ragAiProvider";
import type { createRAGBackends } from "../handlers/ragBackends";
import type { createRagDemoState } from "../handlers/ragDemoState";
import type { createRagStartupController } from "../handlers/ragStartup";
import type { createDemoReleaseController } from "../handlers/releaseDemo";

export type DemoInternalRequestHandler = (
  request: Request,
) => Promise<Response>;
export type RagBackends = ReturnType<typeof createRAGBackends>;
export type RagDemoState = ReturnType<typeof createRagDemoState>;
export type RagIndexManager = ReturnType<RagDemoState["createIndexManager"]>;
export type RagStartupController = ReturnType<
  typeof createRagStartupController
>;
export type DemoAIProviderCatalog = ReturnType<
  typeof createDemoAIProviderCatalog
>;
export type DemoQualityController = ReturnType<
  typeof createDemoQualityController
>;
export type DemoUIStateController = ReturnType<
  typeof createDemoUIStateController
>;
export type ReleaseDemoController = ReturnType<
  typeof createDemoReleaseController
>;
export type DemoCollectionFactory = (
  backend: RagBackends["backends"][DemoBackendMode],
  queryTransform?: ReturnType<typeof createHeuristicRAGQueryTransform>,
) => ReturnType<typeof createRAGCollection>;
