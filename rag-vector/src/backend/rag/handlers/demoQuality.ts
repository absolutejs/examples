import {
  buildRAGAnswerGroundingCaseDifficultyLeaderboard,
  buildRAGContext,
  compareRAGRetrievalStrategies,
  compareRAGRerankers,
  createHeuristicRAGQueryTransform,
  createHeuristicRAGReranker,
  createHeuristicRAGRetrievalStrategy,
  createRAGCollection,
  createRAGFileAnswerGroundingCaseDifficultyHistoryStore,
  createRAGFileAnswerGroundingEvaluationHistoryStore,
  createRAGFileEvaluationHistoryStore,
  evaluateRAGAnswerGrounding,
  loadRAGAnswerGroundingCaseDifficultyHistory,
  loadRAGAnswerGroundingEvaluationHistory,
  loadRAGEvaluationHistory,
  persistRAGAnswerGroundingCaseDifficultyRun,
  persistRAGAnswerGroundingEvaluationRun,
  persistRAGEvaluationSuiteRun,
} from "@absolutejs/rag";
import { join } from "node:path";
import {
  type DemoBackendMode,
  type DemoGroundingProviderComparison,
  type DemoRetrievalQualityResponse,
  buildDemoEvaluationSuite,
} from "../../../frontend/demo-backends";
import type { createDemoAIProviderCatalog } from "./ragAiProvider";
import type { createRAGBackends } from "./ragBackends";

type RagBackends = ReturnType<typeof createRAGBackends>;
type DemoAIProviderCatalog = ReturnType<typeof createDemoAIProviderCatalog>;
type DemoCollectionFactory = (
  backend: RagBackends["backends"][DemoBackendMode],
  queryTransform?: ReturnType<typeof createHeuristicRAGQueryTransform>,
) => ReturnType<typeof createRAGCollection>;

type DemoQualityCacheEntry = {
  cachedAt: number;
  response?: DemoRetrievalQualityResponse;
  inFlight?: Promise<DemoRetrievalQualityResponse>;
};

const DEMO_QUALITY_CACHE_TTL_MS = 30_000;

const buildGroundingAnswerDetail = (metadata?: Record<string, unknown>) => {
  if (typeof metadata?.page === "number") {
    return `page ${metadata.page}`;
  }
  if (typeof metadata?.sheetName === "string") {
    return `sheet ${metadata.sheetName}`;
  }
  if (typeof metadata?.slideNumber === "number") {
    return `slide ${metadata.slideNumber}`;
  }
  if (typeof metadata?.startMs === "number") {
    return `timestamp ${(metadata.startMs / 1000).toFixed(0)}s`;
  }
  if (typeof metadata?.threadTopic === "string") {
    return `thread ${metadata.threadTopic}`;
  }
  if (typeof metadata?.archiveEntryPath === "string") {
    return `archive entry ${metadata.archiveEntryPath}`;
  }

  return "retrieved evidence";
};

export const createDemoQualityController = ({
  createDemoCollection,
  demoAIProvider,
  demoQueryTransform,
  demoReranker,
  demoRetrievalStrategy,
  qualityHistoryRoot,
  ragBackends,
}: {
  createDemoCollection: DemoCollectionFactory;
  demoAIProvider: DemoAIProviderCatalog;
  demoQueryTransform: ReturnType<typeof createHeuristicRAGQueryTransform>;
  demoReranker: ReturnType<typeof createHeuristicRAGReranker>;
  demoRetrievalStrategy: ReturnType<typeof createHeuristicRAGRetrievalStrategy>;
  qualityHistoryRoot: string;
  ragBackends: RagBackends;
}) => {
  const demoQualityCache = new Map<DemoBackendMode, DemoQualityCacheEntry>();

  const createQualityHistoryStore = (
    mode: DemoBackendMode,
    kind: string,
    id: string,
  ) =>
    createRAGFileEvaluationHistoryStore(
      join(qualityHistoryRoot, mode, `${kind}-${id}.json`),
    );
  const createGroundingHistoryStore = (
    mode: DemoBackendMode,
    kind: string,
    id: string,
  ) =>
    createRAGFileAnswerGroundingEvaluationHistoryStore(
      join(qualityHistoryRoot, mode, `${kind}-${id}.json`),
    );
  const createGroundingDifficultyHistoryStore = (
    mode: DemoBackendMode,
    id: string,
  ) =>
    createRAGFileAnswerGroundingCaseDifficultyHistoryStore(
      join(
        qualityHistoryRoot,
        mode,
        `provider-grounding-difficulty-${id}.json`,
      ),
    );

  const buildProviderGroundingComparison = async ({
    collection,
    suite,
  }: {
    collection: ReturnType<typeof createRAGCollection>;
    suite: ReturnType<typeof buildDemoEvaluationSuite>;
  }): Promise<DemoGroundingProviderComparison | null> => {
    if (!demoAIProvider || demoAIProvider.models.length === 0) {
      return null;
    }

    const providerCandidates = Array.from(
      new Map(
        demoAIProvider.models.map(
          (model) => [model.providerId, model] as const,
        ),
      ).values(),
    );

    if (providerCandidates.length === 0) {
      return null;
    }

    const entries = await Promise.all(
      providerCandidates.map(async (model) => {
        const startedAt = performance.now();
        let response;
        try {
          const provider = demoAIProvider.provider(model.providerId);
          response = evaluateRAGAnswerGrounding({
            cases: await Promise.all(
              suite.input.cases.map(async (caseInput) => {
                const results = await collection.search({
                  query: caseInput.query,
                  topK: caseInput.topK ?? suite.input.topK ?? 4,
                  retrieval: "hybrid",
                  queryTransform: demoQueryTransform,
                  rerank: demoReranker,
                  retrievalStrategy: demoRetrievalStrategy,
                });
                const prompt = `Question: ${caseInput.query}\n\n${buildRAGContext(results)}\n\nAnswer in one or two sentences. Use only the provided context. Cite every claim inline with [1], [2].`;
                let answer = "";

                for await (const chunk of provider.stream({
                  model: model.modelId,
                  messages: [{ role: "user", content: prompt }],
                  systemPrompt:
                    "You are evaluating RAG grounding quality. Use only provided context and keep citations precise.",
                })) {
                  if (chunk.type === "text") {
                    answer += chunk.content;
                  }
                }

                return {
                  answer: answer.trim() || "No provider answer was returned.",
                  expectedChunkIds: caseInput.expectedChunkIds,
                  expectedDocumentIds: caseInput.expectedDocumentIds,
                  expectedSources: caseInput.expectedSources,
                  id: caseInput.id,
                  label: caseInput.label,
                  query: caseInput.query,
                  sources: results.map((result) => ({
                    chunkId: result.chunkId,
                    metadata: result.metadata,
                    score: result.score,
                    source: result.source,
                    text: result.chunkText,
                    title: result.title,
                  })),
                };
              }),
            ),
          });
        } catch (error) {
          response = evaluateRAGAnswerGrounding({
            cases: suite.input.cases.map((caseInput) => ({
              answer: `Provider generation failed: ${error instanceof Error ? error.message : String(error)}`,
              expectedChunkIds: caseInput.expectedChunkIds,
              expectedDocumentIds: caseInput.expectedDocumentIds,
              expectedSources: caseInput.expectedSources,
              id: caseInput.id,
              label: caseInput.label,
              query: caseInput.query,
              sources: [],
            })),
          });
        }
        const elapsedMs = performance.now() - startedAt;

        return {
          elapsedMs,
          label: `${model.providerLabel} · ${model.label}`,
          modelId: model.modelId,
          providerId: model.providerId,
          providerKey: model.key,
          providerLabel: model.providerLabel,
          response,
        };
      }),
    );

    const byPassingRate = [...entries].sort((left, right) => {
      if (right.response.passingRate !== left.response.passingRate) {
        return right.response.passingRate - left.response.passingRate;
      }
      if (
        right.response.summary.averageCitationF1 !==
        left.response.summary.averageCitationF1
      ) {
        return (
          right.response.summary.averageCitationF1 -
          left.response.summary.averageCitationF1
        );
      }

      return left.elapsedMs - right.elapsedMs;
    });
    const byCitationF1 = [...entries].sort(
      (left, right) =>
        right.response.summary.averageCitationF1 -
        left.response.summary.averageCitationF1,
    );
    const byResolvedRate = [...entries].sort(
      (left, right) =>
        right.response.summary.averageResolvedCitationRate -
        left.response.summary.averageResolvedCitationRate,
    );
    const byLatency = [...entries].sort(
      (left, right) => left.elapsedMs - right.elapsedMs,
    );

    const caseComparisons = suite.input.cases.map((caseInput) => {
      const caseEntries = entries.map((entry) => {
        const result = entry.response.cases.find(
          (candidate) => candidate.caseId === caseInput.id,
        );
        return {
          answerExcerpt: result?.answer ?? "No provider answer was returned.",
          citationF1: result?.citationF1 ?? 0,
          coverage: result?.coverage ?? "ungrounded",
          extraIds: result?.extraIds ?? [],
          label: entry.label,
          matchedIds: result?.matchedIds ?? [],
          missingIds: result?.missingIds ?? [],
          providerKey: entry.providerKey,
          resolvedCitationRate: result?.resolvedCitationRate ?? 0,
          status: result?.status ?? "fail",
        };
      });
      const statusRank = (status: "pass" | "partial" | "fail") =>
        status === "pass" ? 2 : status === "partial" ? 1 : 0;
      const byStatus = [...caseEntries].sort((left, right) => {
        if (statusRank(right.status) !== statusRank(left.status)) {
          return statusRank(right.status) - statusRank(left.status);
        }
        if (right.citationF1 !== left.citationF1) {
          return right.citationF1 - left.citationF1;
        }
        return right.resolvedCitationRate - left.resolvedCitationRate;
      });
      const byCaseCitationF1 = [...caseEntries].sort(
        (left, right) => right.citationF1 - left.citationF1,
      );
      const byCaseResolvedRate = [...caseEntries].sort(
        (left, right) => right.resolvedCitationRate - left.resolvedCitationRate,
      );

      return {
        caseId: caseInput.id,
        entries: caseEntries,
        label: caseInput.label ?? caseInput.id,
        summary: {
          bestByCitationF1: byCaseCitationF1[0]?.providerKey,
          bestByResolvedCitationRate: byCaseResolvedRate[0]?.providerKey,
          bestByStatus: byStatus[0]?.providerKey,
        },
      };
    });

    return {
      caseComparisons,
      difficultyLeaderboard:
        buildRAGAnswerGroundingCaseDifficultyLeaderboard(entries),
      entries,
      summary: {
        bestByAverageCitationF1: byCitationF1[0]?.providerKey,
        bestByPassingRate: byPassingRate[0]?.providerKey,
        bestByResolvedCitationRate: byResolvedRate[0]?.providerKey,
        fastest: byLatency[0]?.providerKey,
      },
    };
  };

  const persistQualityHistories = async <
    TEntry extends { label: string; response: { elapsedMs: number } },
  >(
    mode: DemoBackendMode,
    suite: ReturnType<typeof buildDemoEvaluationSuite>,
    kind: string,
    entries: TEntry[],
    getId: (entry: TEntry) => string,
  ) =>
    Object.fromEntries(
      await Promise.all(
        entries.map(async (entry) => {
          const id = getId(entry);
          const finishedAt = Date.now();
          const suiteId = `${suite.id}:${kind}:${id}`;
          const store = createQualityHistoryStore(mode, kind, id);
          await persistRAGEvaluationSuiteRun({
            store,
            run: {
              id: crypto.randomUUID(),
              suiteId,
              label: entry.label,
              startedAt: finishedAt - entry.response.elapsedMs,
              finishedAt,
              elapsedMs: entry.response.elapsedMs,
              response: entry.response as never,
              metadata: {
                backendMode: mode,
                benchmarkKind: kind,
                candidateId: id,
              },
            },
          });

          return [
            id,
            await loadRAGEvaluationHistory({
              store,
              suite: {
                id: suiteId,
                input: suite.input,
                label: `${entry.label} benchmark history`,
              },
              limit: 8,
            }),
          ] as const;
        }),
      ),
    );

  const persistProviderGroundingHistories = async (
    mode: DemoBackendMode,
    suite: ReturnType<typeof buildDemoEvaluationSuite>,
    entries: DemoGroundingProviderComparison["entries"],
  ) =>
    Object.fromEntries(
      await Promise.all(
        entries.map(async (entry) => {
          const finishedAt = Date.now();
          const suiteId = `${suite.id}:provider-grounding:${entry.providerKey}`;
          const store = createGroundingHistoryStore(
            mode,
            "provider-grounding",
            entry.providerKey,
          );
          await persistRAGAnswerGroundingEvaluationRun({
            store,
            run: {
              id: crypto.randomUUID(),
              suiteId,
              label: entry.label,
              startedAt: finishedAt - entry.elapsedMs,
              finishedAt,
              elapsedMs: entry.elapsedMs,
              response: entry.response,
              metadata: {
                backendMode: mode,
                benchmarkKind: "provider-grounding",
                candidateId: entry.providerKey,
                modelId: entry.modelId,
                providerId: entry.providerId,
              },
            },
          });

          return [
            entry.providerKey,
            await loadRAGAnswerGroundingEvaluationHistory({
              store,
              suite: {
                id: suiteId,
                label: `${entry.label} provider grounding history`,
              },
              limit: 8,
            }),
          ] as const;
        }),
      ),
    );

  const persistProviderGroundingDifficultyHistory = async (
    mode: DemoBackendMode,
    suite: ReturnType<typeof buildDemoEvaluationSuite>,
    comparison: DemoGroundingProviderComparison,
  ) => {
    const finishedAt = Date.now();
    const suiteId = `${suite.id}:provider-grounding:difficulty`;
    const store = createGroundingDifficultyHistoryStore(mode, "leaderboard");
    await persistRAGAnswerGroundingCaseDifficultyRun({
      store,
      run: {
        id: crypto.randomUUID(),
        suiteId,
        label: "Provider grounding difficulty",
        startedAt: finishedAt,
        finishedAt,
        entries: comparison.difficultyLeaderboard,
        metadata: {
          backendMode: mode,
          benchmarkKind: "provider-grounding-difficulty",
        },
      },
    });

    return loadRAGAnswerGroundingCaseDifficultyHistory({
      store,
      suite: {
        id: suiteId,
        label: "Provider grounding difficulty history",
      },
      limit: 8,
    });
  };

  const buildFreshDemoQualityResponse = async (
    mode: DemoBackendMode,
    options?: { includeProviderGrounding?: boolean },
  ): Promise<DemoRetrievalQualityResponse> => {
    const backend = ragBackends.backends[mode];
    const suite = buildDemoEvaluationSuite();
    const collection = createDemoCollection(backend);
    const rerankerComparison = await compareRAGRerankers({
      collection,
      rerankers: [
        { id: "vector-order", label: "Vector order only" },
        {
          id: "absolute-heuristic",
          label: "Absolute heuristic",
          rerank: demoReranker,
        },
      ],
      suite,
    });
    const retrievalComparison = await compareRAGRetrievalStrategies({
      collection,
      retrievals: [
        { id: "vector", label: "Vector retrieval", retrieval: "vector" },
        { id: "hybrid", label: "Hybrid fusion", retrieval: "hybrid" },
        {
          id: "hybrid-transform",
          label: "Hybrid + query transform",
          queryTransform: demoQueryTransform,
          retrieval: "hybrid",
        },
      ],
      suite,
    });
    const groundingEvaluation = evaluateRAGAnswerGrounding({
      cases: await Promise.all(
        suite.input.cases.map(async (caseInput) => {
          const results = await collection.search({
            query: caseInput.query,
            topK: caseInput.topK ?? suite.input.topK ?? 4,
            retrieval: "hybrid",
            queryTransform: demoQueryTransform,
            rerank: demoReranker,
            retrievalStrategy: demoRetrievalStrategy,
          });
          const bestResult = results[0];
          const answer = bestResult
            ? `${bestResult.title ?? bestResult.source ?? bestResult.chunkId} supports this answer with ${buildGroundingAnswerDetail(bestResult.metadata)} [1].`
            : "No retrieved evidence was available for this answer.";

          return {
            answer,
            expectedChunkIds: caseInput.expectedChunkIds,
            expectedDocumentIds: caseInput.expectedDocumentIds,
            expectedSources: caseInput.expectedSources,
            id: caseInput.id,
            label: caseInput.label,
            query: caseInput.query,
            sources: results.map((result) => ({
              chunkId: result.chunkId,
              metadata: result.metadata,
              score: result.score,
              source: result.source,
              text: result.chunkText,
              title: result.title,
            })),
          };
        }),
      ),
    });
    const providerGroundingComparison = options?.includeProviderGrounding
      ? await buildProviderGroundingComparison({ collection, suite })
      : null;
    const retrievalHistories = await persistQualityHistories(
      mode,
      suite,
      "retrieval",
      retrievalComparison.entries,
      (entry) => entry.retrievalId,
    );
    const rerankerHistories = await persistQualityHistories(
      mode,
      suite,
      "reranker",
      rerankerComparison.entries,
      (entry) => entry.rerankerId,
    );
    const providerGroundingHistories = providerGroundingComparison
      ? await persistProviderGroundingHistories(
          mode,
          suite,
          providerGroundingComparison.entries,
        )
      : {};
    const providerGroundingDifficultyHistory = providerGroundingComparison
      ? await persistProviderGroundingDifficultyHistory(
          mode,
          suite,
          providerGroundingComparison,
        )
      : undefined;

    return {
      comparison: rerankerComparison,
      groundingEvaluation,
      providerGroundingComparison,
      providerGroundingDifficultyHistory,
      providerGroundingHistories,
      rerankerComparison,
      rerankerHistories,
      retrievalComparison,
      retrievalHistories,
      suite,
    };
  };

  const buildDemoQualityResponse = async (
    mode: DemoBackendMode,
    options?: { forceRefresh?: boolean },
  ): Promise<DemoRetrievalQualityResponse> => {
    const now = Date.now();
    const cached = demoQualityCache.get(mode);
    const isFresh = Boolean(
      cached?.response && now - cached.cachedAt < DEMO_QUALITY_CACHE_TTL_MS,
    );
    if (!options?.forceRefresh && isFresh && cached?.response) {
      return cached.response;
    }
    if (!options?.forceRefresh && cached?.inFlight) {
      return cached.inFlight;
    }

    const inFlight = buildFreshDemoQualityResponse(mode, {
      includeProviderGrounding: false,
    })
      .then((response) => {
        demoQualityCache.set(mode, {
          cachedAt: Date.now(),
          response,
        });
        return response;
      })
      .catch((error) => {
        const current = demoQualityCache.get(mode);
        if (current?.response) {
          demoQualityCache.set(mode, {
            cachedAt: current.cachedAt,
            response: current.response,
          });
        } else {
          demoQualityCache.delete(mode);
        }
        throw error;
      });

    demoQualityCache.set(mode, {
      cachedAt: cached?.cachedAt ?? 0,
      inFlight,
      response: cached?.response,
    });

    return inFlight;
  };

  const warmDemoQualityResponse = (mode: DemoBackendMode) => {
    void buildDemoQualityResponse(mode).catch(() => {
      // Keep startup resilient; the live route can rebuild on demand.
    });
  };

  return {
    buildDemoQualityResponse,
    warmDemoQualityResponse,
  };
};
