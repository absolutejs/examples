import { join } from "node:path";
import type { Database } from "bun:sqlite";
import { createDemoQualityController } from "../demoQuality";
import { createDemoUIStateController } from "../demoUiState";
import { createRagStartupController } from "../ragStartup";
import { createDemoReleaseController } from "../releaseDemo";
import type { createRagPipeline } from "./createRagPipeline";

export const createRagControllers = ({
  pipeline,
  ragDb,
}: {
  pipeline: ReturnType<typeof createRagPipeline>;
  ragDb: Database;
}) => {
  const qualityHistoryRoot = join(
    process.cwd(),
    ".absolute",
    "quality-history",
  );
  const releaseControlRoot = join(
    process.cwd(),
    ".absolute",
    "release-control",
  );
  const releaseDemo = createDemoReleaseController({
    ragBackends: pipeline.ragBackends,
    ragDb,
    releaseControlRoot,
  });
  const startup = createRagStartupController({
    ragDemoState: pipeline.ragDemoState,
    syncScheduler: pipeline.syncScheduler,
  });
  const quality = createDemoQualityController({
    createDemoCollection: pipeline.createDemoCollection,
    demoAIProvider: pipeline.demoAIProvider,
    demoQueryTransform: pipeline.demoQueryTransform,
    demoReranker: pipeline.demoReranker,
    demoRetrievalStrategy: pipeline.demoRetrievalStrategy,
    qualityHistoryRoot,
    ragBackends: pipeline.ragBackends,
  });
  const uiState = createDemoUIStateController(ragDb);

  return {
    quality,
    releaseDemo,
    startup,
    uiState,
  };
};
