import { createRAGHTMXConfig, ragPlugin } from "@absolutejs/rag";
import { Elysia } from "elysia";
import {
  createHtmxAIStreamRenderConfig,
  createHtmxWorkflowRenderConfig,
} from "../handlers/htmxRagWorkflow";
import { ragDemoExtractors } from "../handlers/ragDemoExtractors";
import type {
  DemoAIProviderCatalog,
  DemoCollectionFactory,
  RagBackends,
  RagDemoState,
  RagIndexManager,
  ReleaseDemoController,
} from "./pluginTypes";

export const createRagBackendPlugin = ({
  createDemoCollection,
  demoAIProvider,
  demoQueryTransform,
  indexManager,
  ragBackends,
  ragDemoState,
  releaseDemo,
}: {
  createDemoCollection: DemoCollectionFactory;
  demoAIProvider: DemoAIProviderCatalog;
  demoQueryTransform: Parameters<DemoCollectionFactory>[1];
  indexManager: RagIndexManager;
  ragBackends: RagBackends;
  ragDemoState: RagDemoState;
  releaseDemo: ReleaseDemoController;
}) => {
  const plugin = new Elysia();

  for (const backend of ragBackends.active()) {
    plugin.use(
      ragPlugin({
        ...releaseDemo.pluginConfig(backend.id),
        collection: createDemoCollection(backend),
        extractors: ragDemoExtractors,
        htmx: createRAGHTMXConfig({
          render: createHtmxAIStreamRenderConfig(),
          workflowRender: createHtmxWorkflowRenderConfig(backend.path),
        }),
        indexManager,
        model: (providerName) =>
          demoAIProvider?.defaultModel(providerName) ?? "gpt-4.1-mini",
        parseProvider: demoAIProvider?.parseMessage,
        path: backend.path,
        provider: demoAIProvider?.provider ?? ragDemoState.unavailableProvider,
        readinessProviderName: demoAIProvider
          ? "runtime AI provider registry"
          : "demo fallback provider",
      }),
    );
    plugin.use(
      ragPlugin({
        collection: createDemoCollection(backend, demoQueryTransform),
        extractors: ragDemoExtractors,
        htmx: createRAGHTMXConfig({
          render: createHtmxAIStreamRenderConfig(),
          workflowRender: createHtmxWorkflowRenderConfig(
            `${backend.path}-transform`,
          ),
        }),
        indexManager,
        model: (providerName) =>
          demoAIProvider?.defaultModel(providerName) ?? "gpt-4.1-mini",
        parseProvider: demoAIProvider?.parseMessage,
        path: `${backend.path}-transform`,
        provider: demoAIProvider?.provider ?? ragDemoState.unavailableProvider,
        readinessProviderName: demoAIProvider
          ? "runtime AI provider registry"
          : "demo fallback provider",
      }),
    );
  }

  return plugin;
};
