import { afterEach, describe, expect, it, mock } from "bun:test";

import { readFileSync } from "node:fs";

import type {
  DemoActiveRetrievalState,
  DemoReleaseOpsResponse,
  SearchFormState,
} from "../../src/frontend/demo-backends";
import {
  buildDemoReleasePanelState,
  loadActiveRetrievalState,
  loadRecentQueries,
  readJsonResponse,
} from "../../src/frontend/demo-backends";

const originalFetch = globalThis.fetch;

const setFetch = (
  implementation: (
    ...args: Parameters<typeof fetch>
  ) => ReturnType<typeof fetch>,
) => {
  globalThis.fetch = mock(implementation) as unknown as typeof fetch;
};

const emptySearchForm: SearchFormState = {
  documentId: "",
  kind: "",
  query: "",
  scoreThreshold: "",
  source: "",
  topK: 5,
};

const sampleState: DemoActiveRetrievalState = {
  scopeDriver: "manual filters",
  searchForm: emptySearchForm,
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restore();
});

describe("readJsonResponse", () => {
  it("returns null for an empty response body", async () => {
    const response = new Response("   ", { status: 200 });

    expect(await readJsonResponse(response)).toBeNull();
  });

  it("returns null for malformed JSON", async () => {
    const response = new Response('{"broken":', { status: 200 });

    expect(await readJsonResponse(response)).toBeNull();
  });

  it("parses valid JSON", async () => {
    const payload = { ok: true };
    const response = new Response(JSON.stringify(payload), { status: 200 });

    expect(await readJsonResponse(response)).toEqual(payload);
  });
});

describe("loadRecentQueries", () => {
  it("returns an empty list for an empty body", async () => {
    setFetch(async () => new Response("", { status: 200 }));

    await expect(loadRecentQueries("react", "sqlite-native")).resolves.toEqual(
      [],
    );
  });

  it("returns an empty list for malformed JSON", async () => {
    setFetch(async () => new Response('{"broken":', { status: 200 }));

    await expect(loadRecentQueries("react", "sqlite-native")).resolves.toEqual(
      [],
    );
  });

  it("filters invalid entries and caps valid entries", async () => {
    const payload = [
      { label: "one", state: { ...emptySearchForm, query: "one" } },
      { label: "two", state: { ...emptySearchForm, query: "two" } },
      { label: "invalid" },
      { label: "three", state: { ...emptySearchForm, query: "three" } },
      { label: "four", state: { ...emptySearchForm, query: "four" } },
      { label: "five", state: { ...emptySearchForm, query: "five" } },
    ];
    setFetch(
      async () => new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(loadRecentQueries("react", "sqlite-native")).resolves.toEqual([
      { label: "one", state: { ...emptySearchForm, query: "one" } },
      { label: "two", state: { ...emptySearchForm, query: "two" } },
      { label: "three", state: { ...emptySearchForm, query: "three" } },
      { label: "four", state: { ...emptySearchForm, query: "four" } },
    ]);
  });

  it("returns an empty list when fetch rejects", async () => {
    setFetch(async () => {
      throw new Error("network down");
    });

    await expect(loadRecentQueries("react", "sqlite-native")).resolves.toEqual(
      [],
    );
  });
});

describe("loadActiveRetrievalState", () => {
  it("returns null for an empty body", async () => {
    setFetch(async () => new Response("", { status: 200 }));

    await expect(
      loadActiveRetrievalState("react", "sqlite-native"),
    ).resolves.toBeNull();
  });

  it("returns null for malformed JSON", async () => {
    setFetch(async () => new Response('{"broken":', { status: 200 }));

    await expect(
      loadActiveRetrievalState("react", "sqlite-native"),
    ).resolves.toBeNull();
  });

  it("returns the parsed retrieval state for valid JSON", async () => {
    setFetch(
      async () => new Response(JSON.stringify(sampleState), { status: 200 }),
    );

    await expect(
      loadActiveRetrievalState("react", "sqlite-native"),
    ).resolves.toEqual(sampleState);
  });

  it("returns null when fetch rejects", async () => {
    setFetch(async () => {
      throw new Error("network down");
    });

    await expect(
      loadActiveRetrievalState("react", "sqlite-native"),
    ).resolves.toBeNull();
  });
});

describe("buildDemoReleasePanelState", () => {
  it("surfaces active blocker deltas and evidence drills", () => {
    const releaseData: DemoReleaseOpsResponse = {
      scenario: {
        id: "blocked-multivector",
        label: "Blocked stable lane · multivector",
        description:
          "Stable lane is blocked by multivector coverage and collapsed-parent recovery regressions.",
        groupKey: "docs-release-multivector",
        laneState: "blocked",
        classification: "multivector",
      },
      releaseStatus: {
        retrievalComparisons: {
          activeBaselines: [],
          alerts: [
            {
              classification: "multivector",
              kind: "baseline_gate_failed",
              message: "multivector collapsed cases delta -1 is below 0",
              targetRolloutLabel: "stable",
            },
          ],
          promotionCandidates: [],
          readyToPromoteByLane: [
            {
              targetRolloutLabel: "stable",
              ready: false,
              reasons: ["multivector collapsed cases delta -1 is below 0"],
              classification: "multivector",
              gateStatus: "fail",
            },
          ],
          recentRuns: [
            {
              id: "demo-release-run-stable-multivector-alpha",
              label: "Stable run",
              groupKey: "docs-release-multivector",
              corpusGroupKey: "alpha",
              finishedAt: 123,
              decisionSummary: {
                delta: {
                  averageF1Delta: -0.02,
                  passingRateDelta: -4,
                  elapsedMsDelta: 8,
                  multiVectorCollapsedCasesDelta: -1,
                  multiVectorLexicalHitCasesDelta: -1,
                  multiVectorVectorHitCasesDelta: 0,
                },
                gate: {
                  status: "fail",
                  reasons: ["multivector collapsed cases delta -1 is below 0"],
                },
              },
            },
          ],
          releaseLaneRecommendations: [],
        },
      },
      incidentStatus: {
        incidentClassificationSummary: {
          openGeneralCount: 0,
          openMultiVectorCount: 1,
          resolvedGeneralCount: 0,
          resolvedMultiVectorCount: 0,
          totalGeneralCount: 0,
          totalMultiVectorCount: 1,
        },
        recentIncidents: [],
      },
      remediationStatus: {},
      actions: [],
    };

    const panel = buildDemoReleasePanelState(releaseData);

    expect(panel.activeBlockerDeltaSummary).toContain("Passing-rate delta");
    expect(panel.activeBlockerDeltaLines).toContain(
      "Multivector collapsed delta · -1",
    );
    expect(panel.runtimePlannerHistorySummary).toContain(
      "No runtime planner regressions",
    );
    expect(panel.benchmarkSnapshotSummary).toContain(
      "No adaptive native planner benchmark snapshots",
    );
    expect(panel.releaseEvidenceDrills).toHaveLength(2);
    expect(
      panel.releaseEvidenceDrills.find(
        (entry) => entry.classification === "multivector",
      )?.active,
    ).toBe(true);
    expect(panel.releaseEvidenceDrills[0]?.traceExpectation).toContain(
      "Trace expectation",
    );
  });
});

describe("demo surface parity smoke", () => {
  it("keeps blocker comparison, trace expectations, and scenario labels visible across demo surfaces", () => {
    const repoRoot = new URL("../..", import.meta.url);
    const files = [
      "src/frontend/react/pages/ReactRAGVectorDemo.tsx",
      "src/frontend/vue/pages/VueRAGVectorDemo.vue",
      "src/frontend/svelte/pages/SvelteRAGVectorDemo.svelte",
      "src/frontend/angular/pages/angular-rag-vector-demo.ts",
      "src/frontend/html/scripts/rag-vector-demo.ts",
      "src/backend/handlers/htmxRagWorkflow.ts",
    ];

    for (const rel of files) {
      const content = readFileSync(new URL(rel, repoRoot), "utf8");
      expect(content).toContain("Evidence drills");
      expect(content).toContain("Blocker comparison");
      expect(content).toContain("Runtime planner history");
      expect(content).toContain("Adaptive planner benchmark");
      expect(content).toContain("Active blocker deltas");
      expect(
        content.includes("traceExpectation") ||
          content.includes("Trace expectation"),
      ).toBe(true);
    }

    const sharedReleaseState = readFileSync(
      new URL("src/frontend/demo-backends.ts", repoRoot),
      "utf8",
    );
    expect(sharedReleaseState).toContain("General block");
    expect(sharedReleaseState).toContain("Multivector block");
    expect(sharedReleaseState).toContain("Ready");
    expect(sharedReleaseState).toContain("Completed");
  });
});
