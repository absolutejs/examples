import { describe, expect, it } from "bun:test";

import { server } from "../../src/backend/web/server";

const postJson = (url: string, payload: unknown, htmx = true) =>
  server.handle(
    new Request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(htmx ? { "HX-Request": "true" } : {}),
      },
      body: JSON.stringify(payload),
    }),
  );

const getJson = (url: string) => server.handle(new Request(url));

describe("release route smoke", () => {
  it("renders the HTMX release fragment with scenario controls and evidence drills", async () => {
    const response = await server.handle(
      new Request(
        "http://absolute.local/demo/release/sqlite-native/htmx?workspace=alpha",
      ),
    );

    expect(response.status).toBe(200);

    const html = await response.text();

    expect(html).toContain("Evidence drills");
    expect(html).toContain("Run general evidence");
    expect(html).toContain("Run multivector evidence");
    expect(html).toContain("Trace expectation");
    expect(html).toContain("Runtime planner history");
    expect(html).toContain("Adaptive planner benchmark");
    expect(html).toContain("General block");
    expect(html).toContain("Multivector block");
    expect(html).toContain("Ready");
    expect(html).toContain("Completed");
    expect(html).toContain("guide/multivector-release-guide.md");
  });

  it("returns the JSON release governance contract", async () => {
    await postJson(
      "http://absolute.local/demo/release/sqlite-native/action",
      {
        actionId: "switch-to-blocked-multivector-scenario",
        workspace: "alpha",
      },
      false,
    );

    const response = await getJson(
      "http://absolute.local/demo/release/sqlite-native?workspace=alpha",
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, any>;

    expect(body.workspace?.id).toBe("alpha");
    expect(body.scenario?.id).toBe("blocked-multivector");
    expect(
      body.releaseStatus?.retrievalComparisons?.readyToPromoteByLane,
    ).toBeArray();
    expect(
      body.releaseStatus?.retrievalComparisons?.adaptiveNativePlannerBenchmark
        ?.suiteId,
    ).toBe("rag-native-planner-larger-corpus");
    expect(
      body.incidentStatus?.incidentClassificationSummary?.totalMultiVectorCount,
    ).toBeGreaterThan(0);
    expect(
      body.remediationStatus?.recentIncidentRemediationExecutions,
    ).toBeArray();
  });

  it("returns the beta workspace governance contract", async () => {
    const response = await getJson(
      "http://absolute.local/demo/release/sqlite-native?workspace=beta",
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, any>;

    expect(body.workspace?.id).toBe("beta");
    expect(body.workspace?.corpusGroupKey).toBe("beta");
    expect(body.scenario?.classification).toBe("multivector");
    expect(
      body.incidentStatus?.incidentClassificationSummary?.totalMultiVectorCount,
    ).toBeGreaterThan(0);
    expect(
      body.incidentStatus?.incidentClassificationSummary?.totalGeneralCount,
    ).toBe(0);
  });

  it("switches release scenarios through the real POST workflow", async () => {
    const cases = [
      {
        actionId: "switch-to-blocked-general-scenario",
        banner: "Switched the release demo to the blocked stable lane.",
        summary: "Blocked on a general stable gate",
      },
      {
        actionId: "switch-to-blocked-multivector-scenario",
        banner: "Switched the release demo to the blocked stable lane.",
        summary: "Blocked on multivector coverage",
      },
      {
        actionId: "switch-to-ready-scenario",
        banner: "Switched the release demo to the promotable stable lane.",
        summary: "Ready to promote",
      },
      {
        actionId: "switch-to-completed-scenario",
        banner: "Switched the release demo to the completed stable handoff.",
        summary: "Canary handoff completed into the stable lane",
      },
    ] as const;

    for (const testCase of cases) {
      const response = await postJson(
        "http://absolute.local/demo/release/sqlite-native/action",
        { actionId: testCase.actionId, workspace: "alpha" },
      );

      expect(response.status).toBe(200);

      const html = await response.text();

      expect(html).toContain(testCase.banner);
      expect(html).toContain(testCase.summary);
      expect(html).toContain("General block");
      expect(html).toContain("Multivector block");
      expect(html).toContain("Ready");
      expect(html).toContain("Completed");
    }
  });

  it("runs the remediation drill through the real JSON workflow and persists execution history", async () => {
    await postJson(
      "http://absolute.local/demo/release/sqlite-native/action",
      {
        actionId: "switch-to-blocked-multivector-scenario",
        workspace: "alpha",
      },
      false,
    );

    const response = await postJson(
      "http://absolute.local/demo/release/sqlite-native/action",
      { actionId: "run-remediation-drill", workspace: "alpha" },
      false,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, any>;

    expect(body.ok).toBe(true);
    expect(body.message).toBe(
      "Ran the remediation drill through the published remediation execution workflows.",
    );
    expect(
      body.release?.remediationStatus?.recentIncidentRemediationExecutions
        ?.length,
    ).toBeGreaterThan(0);
    expect(body.release?.scenario?.id).toBe("blocked-multivector");

    const refreshed = await getJson(
      "http://absolute.local/demo/release/sqlite-native?workspace=alpha",
    );
    const refreshedBody = (await refreshed.json()) as Record<string, any>;

    expect(refreshed.status).toBe(200);
    expect(
      refreshedBody.remediationStatus?.recentIncidentRemediationExecutions
        ?.length,
    ).toBeGreaterThan(0);
  });

  it("runs the incident drill through the real JSON workflow and persists incident history", async () => {
    await postJson(
      "http://absolute.local/demo/release/sqlite-native/action",
      { actionId: "reset-release-demo", workspace: "alpha" },
      false,
    );

    const response = await postJson(
      "http://absolute.local/demo/release/sqlite-native/action",
      { actionId: "run-incident-drill", workspace: "alpha" },
      false,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, any>;

    expect(body.ok).toBe(true);
    expect(body.message).toBe(
      "Ran the incident drill through the published incident workflows.",
    );
    expect(body.release?.incidentStatus?.incidentSummary?.openCount).toBe(0);
    expect(
      body.release?.incidentStatus?.incidentSummary?.resolvedCount,
    ).toBeGreaterThan(0);
    expect(
      body.release?.incidentStatus?.incidentClassificationSummary
        ?.totalMultiVectorCount,
    ).toBeGreaterThan(0);
    expect(body.release?.incidentStatus?.recentIncidents?.[0]?.status).toBe(
      "resolved",
    );

    const refreshed = await getJson(
      "http://absolute.local/demo/release/sqlite-native?workspace=alpha",
    );
    const refreshedBody = (await refreshed.json()) as Record<string, any>;

    expect(refreshed.status).toBe(200);
    expect(
      refreshedBody.incidentStatus?.incidentSummary?.resolvedCount,
    ).toBeGreaterThan(0);
    expect(
      refreshedBody.incidentStatus?.incidentClassificationSummary
        ?.totalMultiVectorCount,
    ).toBeGreaterThan(0);
  });

  it("renders the multivector evidence drill through the real search workflow", async () => {
    const response = await postJson(
      "http://absolute.local/demo/message/sqlite-native/search",
      {
        query:
          "Which aurora launch packet phrase shows late interaction can match precise wording without splitting the parent document?",
        topK: 4,
        retrievalPresetId: "hybrid",
      },
    );

    expect(response.status).toBe(200);

    const html = await response.text();

    expect(html).toContain(
      "Winning evidence · guide/multivector-release-guide.md",
    );
    expect(html).toContain(
      "Late interaction · Launch checklist · collapsed 1 parent",
    );
    expect(html).toContain("lexical variants 2");
    expect(html).toContain("Late interaction release guide");
    expect(html).toContain("guide/multivector-release-guide.md");
  });

  it("renders the general evidence drill through the real search workflow", async () => {
    const response = await postJson(
      "http://absolute.local/demo/message/sqlite-native/search",
      {
        query: "List support policies for shipping and returns.",
        topK: 6,
      },
    );

    expect(response.status).toBe(200);

    const html = await response.text();

    expect(html).toContain("Winning evidence · Support Policies");
    expect(html).toContain("Search path · vector with transform · reranked");
    expect(html).toContain("Lead source · guide/demo.md");
    expect(html).toContain("Support Policies");
  });

  it("runs the handoff completion drill through the real JSON workflow", async () => {
    await postJson(
      "http://absolute.local/demo/release/sqlite-native/action",
      { actionId: "switch-to-ready-scenario", workspace: "alpha" },
      false,
    );

    const response = await postJson(
      "http://absolute.local/demo/release/sqlite-native/action",
      { actionId: "run-handoff-completion-drill", workspace: "alpha" },
      false,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, any>;

    expect(body.ok).toBe(true);
    expect(body.message).toBe(
      "Ran the stable handoff completion drill through the published handoff workflows.",
    );
    expect(body.release?.scenario?.id).toBe("ready");
    expect(body.release?.handoffStatus?.decisions?.length).toBeGreaterThan(0);
    expect(body.release?.handoffStatus?.decisions?.[0]?.kind).toBe("complete");
    expect(body.release?.handoffStatus?.handoffs?.[0]?.readyForHandoff).toBe(
      true,
    );

    const refreshed = await getJson(
      "http://absolute.local/demo/release/sqlite-native?workspace=alpha",
    );
    const refreshedBody = (await refreshed.json()) as Record<string, any>;

    expect(refreshed.status).toBe(200);
    expect(refreshedBody.handoffStatus?.decisions?.length).toBeGreaterThan(0);
    expect(refreshedBody.handoffStatus?.decisions?.[0]?.kind).toBe("complete");
  });

  it("runs the handoff incident drill through the real JSON workflow", async () => {
    await postJson(
      "http://absolute.local/demo/release/sqlite-native/action",
      { actionId: "reset-release-demo", workspace: "alpha" },
      false,
    );

    await postJson(
      "http://absolute.local/demo/release/sqlite-native/action",
      { actionId: "switch-to-ready-scenario", workspace: "alpha" },
      false,
    );

    const response = await postJson(
      "http://absolute.local/demo/release/sqlite-native/action",
      { actionId: "run-handoff-incident-drill", workspace: "alpha" },
      false,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, any>;

    expect(body.ok).toBe(true);
    expect(body.message).toBe(
      "Ran the stale handoff incident drill through the published handoff incident workflows.",
    );
    expect(body.release?.handoffStatus?.incidentSummary?.openCount).toBe(0);
    expect(
      body.release?.handoffStatus?.incidentSummary?.resolvedCount,
    ).toBeGreaterThan(0);
    expect(body.release?.handoffStatus?.incidents?.[0]?.status).toBe(
      "resolved",
    );
    expect(body.release?.handoffStatus?.recentHistory?.length).toBeGreaterThan(
      0,
    );

    const refreshed = await getJson(
      "http://absolute.local/demo/release/sqlite-native?workspace=alpha",
    );
    const refreshedBody = (await refreshed.json()) as Record<string, any>;

    expect(refreshed.status).toBe(200);
    expect(
      refreshedBody.handoffStatus?.incidentSummary?.resolvedCount,
    ).toBeGreaterThan(0);
    expect(refreshedBody.handoffStatus?.recentHistory?.length).toBeGreaterThan(
      0,
    );
  });

  it("renders the full HTMX page shell", async () => {
    const response = await server.handle(
      new Request("http://absolute.local/htmx/sqlite-native"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type") ?? "").toContain("text/html");

    const html = await response.text();

    expect(html).toContain("AbsoluteJS RAG Workflow Demo");
    expect(html).toContain('id="htmx-release"');
    expect(html).toContain('id="search-results"');
  });
});
