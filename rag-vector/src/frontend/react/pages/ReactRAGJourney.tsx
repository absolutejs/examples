import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRAG } from "@absolutejs/rag/react";
import {
  type DemoBackendMode,
  buildDemoAIStreamPrompt,
  buildDemoEvaluationInput,
  buildTracePresentation,
  formatCitationLabel,
  formatCitationSummary,
  getRAGPathForMode,
} from "../../demo-backends";
import { ReactRAGVectorDemoShell } from "../components/ReactRAGVectorDemoShell";

type ReactRAGJourneyProps = {
  mode: DemoBackendMode;
};

const SUGGESTED_QUESTIONS = [
  "What should I check after ingesting a new source?",
  "How does AbsoluteJS keep answers grounded?",
  "Which source explains metadata filters?",
];

// Friendly translation of the workflow's internal stage machine.
const STAGE_STEPS = [
  { key: "find", label: "Finding sources" },
  { key: "read", label: "Reading them" },
  { key: "write", label: "Writing the answer" },
] as const;

const stageIndexFor = (stage: string | undefined, streaming: boolean) => {
  if (!stage || stage === "submitting") return streaming ? 0 : -1;
  if (stage === "retrieving") return 0;
  if (stage === "retrieved") return 1;
  if (stage === "streaming") return 2;
  if (stage === "complete") return 3;

  return -1;
};

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

const Caret = () => <span className="j-peek-caret">›</span>;

export const ReactRAGJourney = ({ mode }: ReactRAGJourneyProps) => {
  const [showConsole, setShowConsole] = useState(false);

  const activeRagPath = useMemo(() => getRAGPathForMode(mode), [mode]);
  const rag = useRAG(activeRagPath, { autoLoadStatus: false });

  // ---- shared bootstrap: docs + status so chapters can show live numbers ----
  useEffect(() => {
    void rag.documents.load().catch(() => undefined);
    void rag.status.refresh().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRagPath]);

  // ---- hero: ask a grounded question --------------------------------------
  const [modelKey, setModelKey] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [askedOnce, setAskedOnce] = useState(false);
  const answerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void fetch("/demo/ai-models")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            defaultModelKey?: string | null;
            models?: { key: string }[];
          } | null,
        ) => {
          if (!data) return;
          setModelKey(data.defaultModelKey ?? data.models?.[0]?.key ?? "");
        },
      )
      .catch(() => undefined);
  }, []);

  const ask = (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || !modelKey) return;
    setQuestion(trimmed);
    setAskedOnce(true);
    rag.workflow.query(buildDemoAIStreamPrompt(modelKey, trimmed));
    window.requestAnimationFrame(() => {
      answerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };

  const wf = rag.workflow;
  const answerText = safe(() => wf.groundedAnswer?.content ?? "", "");
  const answerCoverage = safe(
    () => wf.groundedAnswer?.coverage ?? null,
    null as string | null,
  );
  const heroCitations = safe(
    () => wf.citations ?? [],
    [] as typeof wf.citations,
  );
  const stageIdx = stageIndexFor(
    wf.progress?.stage,
    wf.isAnswerStreaming || wf.isRetrieving,
  );
  const heroBusy = wf.isRetrieving || wf.isAnswerStreaming;
  const heroComplete = wf.isComplete && answerText.length > 0;
  const groundingNote = useMemo(() => {
    const n = heroCitations.length;
    if (n === 0) return null;

    return `Backed by ${n} cited source${n === 1 ? "" : "s"}`;
  }, [heroCitations]);

  // ---- chapter 1: ingest ---------------------------------------------------
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [ingestBusy, setIngestBusy] = useState(false);
  const [ingestMsg, setIngestMsg] = useState("");
  const docCount = safe(() => rag.documents.documents.length, 0);

  const addNote = async (event: FormEvent) => {
    event.preventDefault();
    const title = noteTitle.trim() || "Quick note";
    const text = noteText.trim();
    if (!text) return;
    setIngestBusy(true);
    setIngestMsg("");
    try {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40);
      await rag.index.createDocument({
        chunking: { strategy: "source_aware" },
        format: "markdown",
        source: `notes/${slug || "note"}.md`,
        text: `# ${title}\n\n${text}`,
        title,
      });
      await rag.documents.load().catch(() => undefined);
      await rag.status.refresh().catch(() => undefined);
      setIngestMsg(
        `Indexed “${title}” — it’s searchable now. Try asking about it above.`,
      );
      setNoteTitle("");
      setNoteText("");
    } catch {
      setIngestMsg(
        "Could not index that note. The knowledge base may still be warming up.",
      );
    } finally {
      setIngestBusy(false);
    }
  };

  // ---- chapter 2: organize (status numbers) -------------------------------
  const {status} = rag.status;
  const caps = rag.status.capabilities;
  const chunkCount = safe(
    () =>
      (status as { totalChunks?: number; chunkCount?: number } | undefined)
        ?.totalChunks ??
      (status as { chunkCount?: number } | undefined)?.chunkCount ??
      null,
    null as number | null,
  );
  const dimensions = safe(
    () =>
      (
        status as
          | { embeddingDimensions?: number; dimensions?: number }
          | undefined
      )?.embeddingDimensions ??
      (status as { dimensions?: number } | undefined)?.dimensions ??
      null,
    null as number | null,
  );
  const vectorMode = safe(
    () => (status as { vectorMode?: string } | undefined)?.vectorMode ?? null,
    null as string | null,
  );

  // ---- chapter 3: retrieve -------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const runSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    void rag.search
      .searchWithTrace({ query: q, topK: 5 })
      .catch(() => undefined);
  };
  const results = safe(
    () => rag.search.results ?? [],
    [] as ReturnType<() => typeof rag.search.results>,
  );
  const tracePresentation = useMemo(
    () =>
      safe(
        () =>
          rag.search.trace ? buildTracePresentation(rag.search.trace) : null,
        null,
      ),
    [rag.search.trace],
  );

  // ---- chapter 5: trust (benchmark) ---------------------------------------
  // Run cases one at a time so the visitor sees real progress (a bar + each
  // case's pass/fail as it lands) instead of one long opaque "running" state.
  const [benchRunning, setBenchRunning] = useState(false);
  const [benchDone, setBenchDone] = useState(0);
  const [benchTotal, setBenchTotal] = useState(0);
  const [benchCases, setBenchCases] = useState<
    { label: string; ok: boolean }[]
  >([]);
  const [benchSummary, setBenchSummary] = useState<string | null>(null);
  const benchInput = useMemo(
    () => safe(() => buildDemoEvaluationInput(), null),
    [],
  );
  const runBenchmark = async () => {
    if (!benchInput) return;
    const total = safe(() => benchInput.cases.length, 0);
    if (total === 0) return;
    setBenchRunning(true);
    setBenchSummary(null);
    setBenchCases([]);
    setBenchDone(0);
    setBenchTotal(total);
    try {
      // One request: the server runs the suite and streams each case back as it
      // settles (rag@0.0.18 evaluate/stream), so progress is real and survives
      // re-renders that a client-side per-case loop could not.
      const response = await rag.evaluate.evaluateStream(benchInput, {
        onCase: (event) => {
          const ok = safe(() => event.caseResult.status === "pass", false);
          const label = safe(
            () =>
              event.caseResult.query ??
              event.caseResult.label ??
              `Case ${event.caseIndex + 1}`,
            `Case ${event.caseIndex + 1}`,
          );
          setBenchCases((prev) => [...prev, { label, ok }]);
          setBenchDone((current) => current + 1);
        },
      });
      const passed = safe(
        () => response.cases.filter((entry) => entry.status === "pass").length,
        0,
      );
      setBenchSummary(`${passed} of ${total} benchmark cases passed`);
    } catch {
      setBenchSummary("Could not run the benchmark right now.");
    } finally {
      setBenchRunning(false);
    }
  };

  // ---- chapter 6: production (ops) ----------------------------------------
  const [opsLoaded, setOpsLoaded] = useState(false);
  const [opsAuthNeeded, setOpsAuthNeeded] = useState(false);
  const loadOps = async () => {
    try {
      await rag.ops.refresh();
      setOpsLoaded(true);
      setOpsAuthNeeded(false);
    } catch {
      setOpsAuthNeeded(true);
    }
  };
  const syncCount = safe(() => rag.ops.syncSources?.length ?? 0, 0);
  const adminJobs = safe(
    () => rag.ops.adminJobs ?? [],
    [] as ReturnType<() => typeof rag.ops.adminJobs>,
  );
  const healthLine = safe(() => {
    const health = rag.ops.health as
      | { documentCount?: number; lowSignalChunks?: number }
      | undefined;
    if (!health) return null;

    return `${health.documentCount ?? docCount} documents indexed · ${health.lowSignalChunks ?? 0} low-signal chunks flagged`;
  }, null);

  if (showConsole) {
    return (
      <div className="rag-journey">
        <div className="j-topbar">
          <button
            className="j-console-link"
            onClick={() => setShowConsole(false)}
            type="button"
          >
            ‹ Back to the guided tour
          </button>
          <span className="j-note">Full engineering console</span>
        </div>
        <ReactRAGVectorDemoShell mode={mode} />
      </div>
    );
  }

  return (
    <div className="rag-journey">
      <div className="j-topbar" style={{ justifyContent: "flex-end" }}>
        <button
          className="j-console-link"
          onClick={() => setShowConsole(true)}
          type="button"
        >
          Open the full console ›
        </button>
      </div>

      {/* ---------------- HERO ---------------- */}
      <div className="j-hero j-rise">
        <span className="j-eyebrow">AbsoluteJS RAG</span>
        <h1 className="j-hero-title">
          Ask your documents <em>anything.</em>
        </h1>
        <p className="j-hero-sub">
          Drop in your knowledge, ask in plain English, and get an answer with
          every claim traced back to a real source. Here&rsquo;s the whole
          system — without the jargon.
        </p>

        <form
          className="j-ask"
          onSubmit={(event) => {
            event.preventDefault();
            ask(question);
          }}
        >
          <input
            aria-label="Ask a question"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g. How do I onboard a new teammate?"
            value={question}
          />
          <button
            className="j-btn j-btn-primary"
            disabled={heroBusy || !modelKey}
            type="submit"
          >
            {heroBusy ? "Thinking…" : "Ask →"}
          </button>
        </form>

        <div className="j-chips">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              className="j-chip"
              key={q}
              onClick={() => ask(q)}
              type="button"
            >
              {q}
            </button>
          ))}
        </div>

        {askedOnce ? (
          <div className="j-stages">
            {STAGE_STEPS.map((step, i) => (
              <span
                className={`j-stage${stageIdx === i ? " is-active" : ""}${stageIdx > i ? " is-done" : ""}`}
                key={step.key}
              >
                <span className="j-stage-dot" />
                {step.label}
              </span>
            ))}
          </div>
        ) : null}

        {askedOnce && (answerText || heroBusy) ? (
          <div className="j-answer" ref={answerRef}>
            <p className="j-answer-text">
              {answerText || "Reading your sources…"}
            </p>
            <div className="j-answer-foot">
              {!heroComplete ? (
                <span className="j-badge is-warn">● Streaming</span>
              ) : answerCoverage === "ungrounded" ? (
                <span className="j-badge is-warn">⚠ Not grounded</span>
              ) : answerCoverage === "partial" ? (
                <span className="j-badge is-warn">◐ Partially grounded</span>
              ) : (
                <span className="j-badge">✓ Grounded answer</span>
              )}
              {groundingNote ? (
                <span className="j-note">{groundingNote}</span>
              ) : null}
              {heroCitations.slice(0, 6).map((citation, i) => (
                <span className="j-source-pill" key={i}>
                  <b>[{i + 1}]</b>
                  {safe(() => formatCitationLabel(citation), `source ${i + 1}`)}
                </span>
              ))}
            </div>

            {heroCitations.length > 0 ? (
              <details className="j-peek">
                <summary>
                  <Caret /> Peek under the hood — see what each citation points
                  to
                </summary>
                <div className="j-peek-body">
                  {heroCitations.slice(0, 8).map((citation, i) => (
                    <div className="j-peek-line" key={i}>
                      <strong>[{i + 1}]</strong>{" "}
                      {safe(() => formatCitationSummary(citation), "")}
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ---------------- STORY ---------------- */}
      <main className="j-story">
        <div className="j-story-head">
          <span className="j-eyebrow">How it works</span>
          <h2>From a pile of documents to a trustworthy answer</h2>
          <p>
            Six steps. Every one is live against this real knowledge base — try
            them, then peek under the hood whenever you&rsquo;re curious.
          </p>
        </div>

        {/* 1 — bring your docs */}
        <section className="j-chapter">
          <div className="j-chapter-narrative">
            <span className="j-chapter-num">01 — Bring your docs</span>
            <h3>Add anything you know</h3>
            <p className="j-lede">
              PDFs, Word docs, spreadsheets, web pages, even audio and images.
              AbsoluteJS reads them all and remembers where every fact came
              from.
            </p>
            <div className="j-stat-row">
              <div className="j-stat">
                <div className="j-stat-val">{docCount || "—"}</div>
                <div className="j-stat-lbl">documents indexed</div>
              </div>
              <div className="j-stat">
                <div className="j-stat-val">
                  {String(mode).replace("-", " ")}
                </div>
                <div className="j-stat-lbl">vector backend</div>
              </div>
            </div>
          </div>
          <div className="j-panel">
            <div className="j-panel-label">Try it · add a note</div>
            <form onSubmit={addNote}>
              <div className="j-field">
                <input
                  className="j-input"
                  onChange={(event) => setNoteTitle(event.target.value)}
                  placeholder="Title (optional)"
                  value={noteTitle}
                />
              </div>
              <div className="j-field">
                <textarea
                  className="j-textarea"
                  onChange={(event) => setNoteText(event.target.value)}
                  placeholder="Paste anything — a policy, a note, an FAQ…"
                  value={noteText}
                />
              </div>
              <button
                className="j-btn j-btn-primary"
                disabled={ingestBusy || !noteText.trim()}
                type="submit"
              >
                {ingestBusy ? "Indexing…" : "Add to knowledge base"}
              </button>
            </form>
            {ingestMsg ? (
              <p className="j-note" style={{ marginTop: "0.8rem" }}>
                {ingestMsg}
              </p>
            ) : null}
            <details className="j-peek">
              <summary>
                <Caret /> Peek under the hood — formats &amp; extractors
              </summary>
              <div className="j-peek-body">
                <div className="j-peek-line">
                  Each file runs through a format-aware extractor (PDF OCR,
                  office docs, audio transcription, image OCR, archives, email).
                </div>
                <div className="j-peek-line">
                  Backend capabilities:{" "}
                  <strong>
                    {safe(
                      () =>
                        (caps as { backend?: string } | undefined)?.backend ??
                        String(mode),
                      String(mode),
                    )}
                  </strong>
                </div>
              </div>
            </details>
          </div>
        </section>

        {/* 2 — organize */}
        <section className="j-chapter">
          <div className="j-chapter-narrative">
            <span className="j-chapter-num">02 — We organize it</span>
            <h3>Split into searchable pieces</h3>
            <p className="j-lede">
              Long documents get broken into bite-sized passages and turned into
              vectors — math that captures meaning, so search understands
              intent, not just keywords.
            </p>
          </div>
          <div className="j-panel">
            <div className="j-panel-label">Under the hood, right now</div>
            <div className="j-stat-row" style={{ marginTop: 0 }}>
              <div className="j-stat">
                <div className="j-stat-val">{chunkCount ?? "—"}</div>
                <div className="j-stat-lbl">searchable pieces</div>
              </div>
              <div className="j-stat">
                <div className="j-stat-val">{dimensions ?? "—"}</div>
                <div className="j-stat-lbl">vector dimensions</div>
              </div>
            </div>
            <p className="j-note" style={{ marginTop: "1rem" }}>
              Every piece keeps a link back to its document and section, so an
              answer can always show its receipts.
            </p>
            <details className="j-peek">
              <summary>
                <Caret /> Peek under the hood — vector mode
              </summary>
              <div className="j-peek-body">
                <div className="j-kv">
                  <span>vector mode</span>
                  <span>{vectorMode ?? "native"}</span>
                </div>
                <div className="j-kv">
                  <span>reranker</span>
                  <span>
                    {safe(
                      () =>
                        (status as { reranker?: string } | undefined)
                          ?.reranker ?? "Absolute heuristic",
                      "Absolute heuristic",
                    )}
                  </span>
                </div>
              </div>
            </details>
          </div>
        </section>

        {/* 3 — retrieve */}
        <section className="j-chapter">
          <div className="j-chapter-narrative">
            <span className="j-chapter-num">03 — You ask</span>
            <h3>Search that gets the gist</h3>
            <p className="j-lede">
              Type a question and AbsoluteJS finds the passages that actually
              answer it — then reranks them so the best evidence rises to the
              top.
            </p>
          </div>
          <div className="j-panel">
            <div className="j-panel-label">
              Try it · search the knowledge base
            </div>
            <form className="j-field" onSubmit={runSearch}>
              <input
                className="j-input"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="e.g. metadata filters"
                value={searchQuery}
              />
              <button
                className="j-btn j-btn-ghost"
                disabled={rag.search.isSearching}
                type="submit"
              >
                {rag.search.isSearching ? "…" : "Search"}
              </button>
            </form>
            {results.length > 0 ? (
              <div>
                {results.slice(0, 4).map((source, i) => {
                  const score = safe(
                    () => Number((source as { score?: number }).score ?? 0),
                    0,
                  );
                  const pct = Math.max(
                    6,
                    Math.min(100, Math.round((score / 3) * 100)),
                  );

                  return (
                    <div className="j-result" key={i}>
                      <div className="j-result-top">
                        <span className="j-result-title">
                          {safe(
                            () =>
                              (source as { title?: string }).title ||
                              (source as { source?: string }).source ||
                              "Result",
                            "Result",
                          )}
                        </span>
                        <span className="j-meter">
                          <span className="j-meter-track">
                            <span
                              className="j-meter-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          match
                        </span>
                      </div>
                      <p className="j-result-text">
                        {safe(
                          () => (source as { text?: string }).text ?? "",
                          "",
                        )}
                      </p>
                      <span className="j-result-src">
                        {safe(
                          () => (source as { source?: string }).source ?? "",
                          "",
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : rag.search.hasSearched ? (
              <p className="j-note">
                No matching passages — try different words.
              </p>
            ) : null}
            {tracePresentation ? (
              <details className="j-peek">
                <summary>
                  <Caret /> Peek under the hood — the retrieval trace
                </summary>
                <div className="j-peek-body">
                  {safe(
                    () =>
                      (
                        tracePresentation as {
                          stages?: { label?: string; count?: number }[];
                        }
                      ).stages
                        ?.slice(0, 6)
                        .map((stage, i) => (
                          <div className="j-kv" key={i}>
                            <span>{stage.label ?? `stage ${i + 1}`}</span>
                            <span>{stage.count ?? ""}</span>
                          </div>
                        )) ?? (
                        <div className="j-peek-line">Trace captured.</div>
                      ),
                    <div className="j-peek-line">Trace captured.</div>,
                  )}
                </div>
              </details>
            ) : null}
          </div>
        </section>

        {/* 4 — grounded answer */}
        <section className="j-chapter">
          <div className="j-chapter-narrative">
            <span className="j-chapter-num">
              04 — You get a grounded answer
            </span>
            <h3>Answers with receipts</h3>
            <p className="j-lede">
              The model only writes what the sources support, and every answer
              carries citations you can open. No confident-sounding guesses.
            </p>
          </div>
          <div className="j-panel">
            <div className="j-panel-label">Your latest answer</div>
            {askedOnce && heroCitations.length > 0 ? (
              <>
                <p className="j-note" style={{ marginBottom: "0.8rem" }}>
                  You asked:{" "}
                  <strong style={{ color: "var(--j-ink)" }}>{question}</strong>
                </p>
                {heroCitations.slice(0, 5).map((citation, i) => (
                  <div className="j-result" key={i}>
                    <div className="j-result-top">
                      <span className="j-result-title">
                        <span className="j-cite">{i + 1}</span>{" "}
                        {safe(
                          () => formatCitationLabel(citation),
                          `Source ${i + 1}`,
                        )}
                      </span>
                    </div>
                    <p className="j-result-text">
                      {safe(() => formatCitationSummary(citation), "")}
                    </p>
                  </div>
                ))}
              </>
            ) : (
              <p className="j-note">
                Ask a question at the top and the cited sources behind the
                answer show up here — one card per citation.
              </p>
            )}
          </div>
        </section>

        {/* 5 — trust */}
        <section className="j-chapter">
          <div className="j-chapter-narrative">
            <span className="j-chapter-num">05 — You can trust it</span>
            <h3>Accuracy you can measure</h3>
            <p className="j-lede">
              AbsoluteJS ships with a benchmark suite that scores retrieval and
              grounding against known-good answers — so quality isn&rsquo;t a
              guess, it&rsquo;s a number you can watch over time.
            </p>
          </div>
          <div className="j-panel">
            <div className="j-panel-label">
              Try it · run a quick accuracy check
            </div>
            <button
              className="j-btn j-btn-ghost"
              disabled={benchRunning || !benchInput}
              onClick={() => void runBenchmark()}
              type="button"
            >
              {benchRunning
                ? `Scoring case ${Math.min(benchDone + 1, benchTotal)} of ${benchTotal}…`
                : "Run the benchmark"}
            </button>

            {benchTotal > 0 ? (
              <div className="j-progress">
                <div className="j-progress-head">
                  <span>
                    {benchRunning ? "Scoring benchmark cases…" : "Complete"}
                  </span>
                  <span>
                    {benchDone} / {benchTotal}
                  </span>
                </div>
                <div className="j-progress-track">
                  <div
                    className="j-progress-fill"
                    style={{
                      width: `${benchTotal ? (benchDone / benchTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}

            {benchCases.length > 0 ? (
              <div style={{ marginTop: "0.8rem" }}>
                {benchCases.map((entry, i) => (
                  <div className="j-case" key={i}>
                    <span
                      className={`j-case-mark ${entry.ok ? "is-pass" : "is-fail"}`}
                    >
                      {entry.ok ? "✓" : "✗"}
                    </span>
                    <span>{entry.label}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {benchSummary ? (
              <p
                className="j-note"
                style={{ color: "var(--j-ink)", marginTop: "0.9rem" }}
              >
                {benchSummary}
              </p>
            ) : null}

            <details className="j-peek">
              <summary>
                <Caret /> Peek under the hood — full strategy comparison
              </summary>
              <div className="j-peek-body">
                <div className="j-peek-line">
                  Each case runs its query through retrieval + grounding and
                  checks the returned sources against known-good answers.
                </div>
                <button
                  className="j-btn j-btn-ghost"
                  onClick={() => setShowConsole(true)}
                  style={{ marginTop: "0.7rem" }}
                  type="button"
                >
                  See reranker &amp; strategy leaderboards ›
                </button>
              </div>
            </details>
          </div>
        </section>

        {/* 6 — production */}
        <section className="j-chapter">
          <div className="j-chapter-narrative">
            <span className="j-chapter-num">06 — Run it in production</span>
            <h3>Operate with confidence</h3>
            <p className="j-lede">
              Watch corpus health, sync straight from Gmail, Drive, or your own
              storage, and ship changes behind release gates — all from the same
              system.
            </p>
          </div>
          <div className="j-panel">
            <div className="j-panel-label">
              Try it · check operations health
            </div>
            <button
              className="j-btn j-btn-ghost"
              onClick={() => void loadOps()}
              type="button"
            >
              {opsLoaded ? "Refresh health" : "Load operations health"}
            </button>
            {opsLoaded ? (
              <div className="j-stat-row">
                <div className="j-stat">
                  <div className="j-stat-val">{syncCount}</div>
                  <div className="j-stat-lbl">connected sources</div>
                </div>
                <div className="j-stat">
                  <div className="j-stat-val">{adminJobs.length}</div>
                  <div className="j-stat-lbl">admin jobs</div>
                </div>
              </div>
            ) : null}
            {healthLine ? (
              <p className="j-note" style={{ marginTop: "0.9rem" }}>
                {healthLine}
              </p>
            ) : null}
            {opsAuthNeeded ? (
              <p className="j-note" style={{ marginTop: "0.9rem" }}>
                Connecting your own Gmail, Drive, or Meta sources needs a
                sign-in.{" "}
                <a
                  className="j-signin"
                  href="/oauth2/google/authorization?client=login"
                >
                  Sign in with Google
                </a>
              </p>
            ) : null}
            <details className="j-peek">
              <summary>
                <Caret /> Peek under the hood — release &amp; admin controls
              </summary>
              <div className="j-peek-body">
                <div className="j-peek-line">
                  Release lanes, incident tracking, reranker showdowns, and the
                  full diagnostics live in the engineering console.
                </div>
                <button
                  className="j-btn j-btn-ghost"
                  onClick={() => setShowConsole(true)}
                  style={{ marginTop: "0.7rem" }}
                  type="button"
                >
                  Open the full console ›
                </button>
              </div>
            </details>
          </div>
        </section>
      </main>

      <footer className="j-foot">
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Powered by{" "}
        <a
          href="https://absolutejs.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          AbsoluteJS
        </a>
      </footer>
    </div>
  );
};
