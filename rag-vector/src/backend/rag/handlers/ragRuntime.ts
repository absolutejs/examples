import { createRagAuthRuntime } from "./runtime/createRagAuthRuntime";
import { createRagControllers } from "./runtime/createRagControllers";
import { createRagDatabase } from "./runtime/createRagDatabase";
import { createRagPipeline } from "./runtime/createRagPipeline";

export const createRagRuntime = () => {
  const ragDb = createRagDatabase();
  const auth = createRagAuthRuntime();
  const pipeline = createRagPipeline(ragDb);
  const controllers = createRagControllers({
    pipeline,
    ragDb,
  });

  process.once("exit", () => {
    pipeline.syncScheduler.stop();
  });

  return {
    ...auth,
    ...pipeline,
    ...controllers,
  };
};
