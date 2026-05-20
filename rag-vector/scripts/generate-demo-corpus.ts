import { gzipSync } from "node:zlib";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const corpusDir = join(root, "rag-demo-corpus");

const ensureDir = (path: string) =>
  mkdirSync(dirname(path), { recursive: true });
const writeText = async (relativePath: string, content: string) => {
  const target = join(corpusDir, relativePath);
  ensureDir(target);
  await Bun.write(target, content);
};

const writeBytes = async (
  relativePath: string,
  content: Uint8Array | Buffer,
) => {
  const target = join(corpusDir, relativePath);
  ensureDir(target);
  await Bun.write(target, content);
};

const encodeUInt16LE = (value: number) =>
  Buffer.from([value & 0xff, (value >> 8) & 0xff]);
const encodeUInt32LE = (value: number) =>
  Buffer.from([
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff,
  ]);

const createStoredZip = (files: Record<string, string | Uint8Array>) => {
  const chunks: Buffer[] = [];
  for (const [name, content] of Object.entries(files)) {
    const nameBuffer = Buffer.from(name, "utf8");
    const data =
      typeof content === "string"
        ? Buffer.from(content, "utf8")
        : Buffer.from(content);
    chunks.push(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    chunks.push(encodeUInt16LE(20));
    chunks.push(encodeUInt16LE(0));
    chunks.push(encodeUInt16LE(0));
    chunks.push(encodeUInt16LE(0));
    chunks.push(encodeUInt16LE(0));
    chunks.push(encodeUInt32LE(0));
    chunks.push(encodeUInt32LE(data.length));
    chunks.push(encodeUInt32LE(data.length));
    chunks.push(encodeUInt16LE(nameBuffer.length));
    chunks.push(encodeUInt16LE(0));
    chunks.push(nameBuffer);
    chunks.push(data);
  }
  return Buffer.concat(chunks);
};

const octal = (value: number, length: number) =>
  Buffer.from(value.toString(8).padStart(length - 1, "0") + "\0", "ascii");

const writeTarHeader = (name: string, size: number) => {
  const header = Buffer.alloc(512, 0);
  Buffer.from(name).copy(header, 0, 0, Math.min(Buffer.byteLength(name), 100));
  Buffer.from("0000777\0", "ascii").copy(header, 100);
  Buffer.from("0000000\0", "ascii").copy(header, 108);
  Buffer.from("0000000\0", "ascii").copy(header, 116);
  octal(size, 12).copy(header, 124);
  octal(Math.floor(Date.now() / 1000), 12).copy(header, 136);
  Buffer.from("        ", "ascii").copy(header, 148);
  header[156] = "0".charCodeAt(0);
  Buffer.from("ustar\0", "ascii").copy(header, 257);
  Buffer.from("00", "ascii").copy(header, 263);
  let sum = 0;
  for (const byte of header) sum += byte;
  octal(sum, 8).copy(header, 148);
  return header;
};

const createTar = (files: Record<string, string>) => {
  const chunks: Buffer[] = [];
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content, "utf8");
    chunks.push(writeTarHeader(name, data.length));
    chunks.push(data);
    const remainder = data.length % 512;
    if (remainder !== 0) {
      chunks.push(Buffer.alloc(512 - remainder));
    }
  }
  chunks.push(Buffer.alloc(1024));
  return Buffer.concat(chunks);
};

const createPdf = (text: string, pageCount: number) =>
  Buffer.from(
    [
      "%PDF-1.4",
      "1 0 obj",
      "<<>>",
      "stream",
      "BT",
      "(" + text + ") Tj",
      "ET",
      "endstream",
      "endobj",
      ...Array.from({ length: pageCount }, () => "/Type /Page"),
      "%%EOF",
    ].join("\n"),
    "latin1",
  );

const repeatParagraphs = (prefix: string, sentence: string, count = 8) =>
  Array.from(
    { length: count },
    (_, index) => `${prefix} ${index + 1}. ${sentence}`,
  ).join("\n\n");

const longMarkdown = (title: string, sentence: string, count = 8) =>
  [`# ${title}`, "", repeatParagraphs(title, sentence, count)].join("\n");

const longHtml = (title: string, sentence: string, count = 8) =>
  `<section><h1>${title}</h1>${Array.from({ length: count }, (_, index) => `<p>${title} section ${index + 1}. ${sentence}</p>`).join("")}</section>`;

rmSync(corpusDir, { force: true, recursive: true });
mkdirSync(corpusDir, { recursive: true });

await writeText(
  "guide/welcome.md",
  "# Welcome\n\nAbsoluteJS keeps retrieval workflows aligned across React, Vue, Svelte, Angular, HTML, and HTMX.\n\nThe framework owns ingestion, citations, evaluation, reranking, and retrieval streaming as one coherent workflow.",
);
await writeText(
  "guide/demo.md",
  "# Support Policies\n\nShipping and returns are handled by the support policy workflow. Stable source ids keep the answers auditable after ingest.",
);
await writeText(
  "guides/metadata.md",
  "# Metadata Discipline\n\nMetadata must stay stable so filters, citations, and evaluation cases keep resolving to the same source labels over time.",
);
await writeText(
  "guides/search.md",
  "# Search Quality\n\nUse source-aware chunking when headings, sheets, slides, or file sections should stay visible in retrieval.",
);
await writeText(
  "guide/advanced-grounding.md",
  longMarkdown(
    "Advanced Grounding",
    "Grounded answer reviews should preserve evidence labels, reference mappings, source-native locators, and stable retrieval scope changes so engineers can inspect why an answer is trustworthy.",
    10,
  ),
);
await writeText(
  "cases/retail.html",
  "<section><h1>Retail Operations</h1><p>Escalation flows should preserve source labels, timestamps, and retrieval evidence.</p></section>",
);
await writeText(
  "cases/compliance.html",
  longHtml(
    "Compliance Workbench",
    "Compliance review should keep archive entry paths, spreadsheet sheet names, presentation slide numbers, and email attachment labels visible in retrieval evidence.",
    10,
  ),
);
await writeText(
  "playbook/ops.md",
  "# Ops Playbook\n\nRe-seed the corpus after fixture changes and verify retrieval quality with the built-in evaluation suite.",
);
await writeText(
  "files/platform-overview.txt",
  repeatParagraphs(
    "Platform overview",
    "AbsoluteJS should let React apps inspect retrieval evidence, chunk structure, source provenance, and admin state without splitting the product across separate dashboards.",
    10,
  ),
);
await writeText(
  "files/field-notes.txt",
  repeatParagraphs(
    "Field notes",
    "Field notes should stay chunkable, source-aware, and auditable so operators can inspect the exact evidence that shaped the answer.",
    10,
  ),
);
await writeText(
  "files/structured-export.json",
  JSON.stringify(
    {
      title: "Structured export",
      sections: Array.from({ length: 8 }, (_, index) => ({
        id: `section-${index + 1}`,
        note: `Structured export section ${index + 1} says retrieval metadata, evidence locators, and workflow stages should remain inspectable in the React application.`,
      })),
    },
    null,
    2,
  ),
);
await writeText(
  "files/retrieval-ledger.json",
  JSON.stringify(
    {
      title: "Retrieval ledger",
      runs: Array.from({ length: 10 }, (_, index) => ({
        id: `run-${index + 1}`,
        note: `Retrieval ledger run ${index + 1} says filters, citations, and chunk provenance should remain visible in the review surface.`,
      })),
    },
    null,
    2,
  ),
);
await writeText(
  "files/release-matrix.csv",
  [
    "release,area,note",
    ...Array.from(
      { length: 10 },
      (_, index) =>
        `2026.${index + 1},retrieval,\"Release ${index + 1} says chunk-aware evidence and source-aware retrieval must stay visible in the product UI.\"`,
    ),
  ].join("\n"),
);
await writeText(
  "files/grounding-matrix.csv",
  [
    "suite,coverage,note",
    ...Array.from(
      { length: 10 },
      (_, index) =>
        `suite-${index + 1},grounded,\"Grounding matrix row ${index + 1} says evidence coverage should stay inspectable in the React surface.\"`,
    ),
  ].join("\n"),
);
await writeText(
  "files/router-config.xml",
  `<config>${Array.from({ length: 8 }, (_, index) => `<route id="route-${index + 1}">Route ${index + 1} keeps citations, source labels, and retrieval diagnostics attached to React surfaces.</route>`).join("")}</config>`,
);
await writeText(
  "files/evidence-map.xml",
  `<evidenceMap>${Array.from({ length: 8 }, (_, index) => `<evidence id="evidence-${index + 1}">Evidence map entry ${index + 1} keeps locator metadata and citation resolution visible to the app.</evidence>`).join("")}</evidenceMap>`,
);
await writeText(
  "files/retrieval-flags.yaml",
  Array.from(
    { length: 8 },
    (_, index) =>
      `flag_${index + 1}: Retrieval flag ${index + 1} keeps source labels, chunk boundaries, and grounded references stable.`,
  ).join("\n"),
);
await writeText(
  "files/grounding-flags.yaml",
  Array.from(
    { length: 8 },
    (_, index) =>
      `grounding_flag_${index + 1}: Grounding flag ${index + 1} says answer evidence and missing support should remain visible in diagnostics.`,
  ).join("\n"),
);
await writeText(
  "sync-folder/releases/2026-ops.md",
  "# Directory Sync\n\nDirectory sync keeps the AbsoluteJS knowledge base aligned when local files change.\n\nSync reconciliation should update changed documents and remove stale synced entries.",
);
await writeText(
  "sync-folder/checklists/reconciliation.md",
  "# Sync Reconciliation\n\nWhen a synced file disappears from the folder, the indexed document should disappear after the next sync pass.",
);
await writeText(
  "storage-bucket/releases/storage-sync.md",
  "# Storage Sync\n\nBun-native S3 sync keeps object-backed knowledge bases aligned across S3, R2, and compatible storage services.",
);
await writeText(
  "storage-bucket/benchmarks/object-storage.md",
  "# Object Storage Benchmark\n\nStorage-backed sync should preserve retrieval quality, grounding, and source attribution after object updates.",
);

await writeBytes(
  "files/native-handbook.pdf",
  createPdf(
    repeatParagraphs(
      "Native handbook",
      "Page-aware evidence should remain inspectable in retrieval diagnostics and grounded answer references across long PDF documents.",
      10,
    ),
    4,
  ),
);
await writeBytes(
  "files/architecture-guide.pdf",
  createPdf(
    repeatParagraphs(
      "Architecture guide",
      "React routes should expose retrieval, grounding, sync, and admin state together so evidence-backed products stay debuggable.",
      10,
    ),
    5,
  ),
);
await writeBytes(
  "files/scanned-receipt.pdf",
  Buffer.from("%PDF-1.4\n%%EOF", "latin1"),
);
await writeBytes(
  "files/scanned-contract.pdf",
  Buffer.from("%PDF-1.4\n%%EOF", "latin1"),
);
await writeText(
  "files/support-thread.eml",
  "Subject: Harbor support escalation\nFrom: ops@absolutejs.dev\nTo: support@absolutejs.dev\n\nEmail thread says archived escalations must keep thread topics and sender fields.",
);
await writeText(
  "files/customer-escalation.eml",
  "Subject: Harbor renewal escalation\nFrom: success@absolutejs.dev\nTo: support@absolutejs.dev\n\nThis customer escalation says mailbox sync should preserve sender context, attachment lineage, timestamps, and thread topics so React evidence panes can explain the answer.",
);
await writeText(
  "files/notes.rtf",
  "{\\rtf1\\ansi\\b AbsoluteJS RTF notes\\b0\\par Retrieval citations should keep evidence labels readable.}",
);
await writeText(
  "files/retro-notes.rtf",
  `{\\rtf1\\ansi\\b Incident retrospective\\b0\\par ${repeatParagraphs("Retrospective", "Legacy rich text notes say chunk-aware evidence should remain readable across support workflows.", 8)}}`,
);
await writeBytes(
  "files/legacy-report.doc",
  Buffer.from(
    "WordDocument Legacy report says migration readiness depends on stable ingest metadata.",
    "latin1",
  ),
);
await writeBytes(
  "files/legacy-brief.doc",
  Buffer.from(
    repeatParagraphs(
      "Legacy brief",
      "Legacy Word content should still preserve extraction provenance and retrieval visibility for React operators.",
      8,
    ),
    "latin1",
  ),
);
await writeBytes(
  "files/legacy-finance.xls",
  Buffer.from(
    "Legacy worksheet shows Q2 revenue readiness and source tags.",
    "latin1",
  ),
);
await writeBytes(
  "files/legacy-pipeline.xls",
  Buffer.from(
    repeatParagraphs(
      "Legacy worksheet",
      "Legacy spreadsheet extraction should still expose workbook semantics and retrieval evidence quality.",
      8,
    ),
    "latin1",
  ),
);
await writeBytes(
  "files/legacy-roadmap.ppt",
  Buffer.from(
    "Legacy deck explains retrieval streaming milestones and backend parity.",
    "latin1",
  ),
);
await writeBytes(
  "files/legacy-ops.ppt",
  Buffer.from(
    repeatParagraphs(
      "Legacy deck",
      "Legacy presentation content should still participate in retrieval, citation inspection, and evaluation workflows.",
      8,
    ),
    "latin1",
  ),
);
await writeBytes(
  "files/legacy-mail.msg",
  Buffer.from(
    "Subject Legacy escalation message says email extraction should preserve sender context and issue history.",
    "utf8",
  ),
);
await writeBytes(
  "files/legacy-audit.msg",
  Buffer.from(
    repeatParagraphs(
      "Legacy mail",
      "Legacy mail extraction should keep sender context, issue history, and attachment lineage available to the UI.",
      8,
    ),
    "utf8",
  ),
);
await writeBytes(
  "files/launch-plan.docx",
  createStoredZip({
    "word/document.xml": `<w:document><w:body>${Array.from({ length: 10 }, (_, index) => `<w:p><w:t>Launch plan section ${index + 1} says the framework should own ingestion, retrieval evidence, citation review, and grounded workflow state end to end.</w:t></w:p>`).join("")}</w:body></w:document>`,
  }),
);
await writeBytes(
  "files/platform-playbook.docx",
  createStoredZip({
    "word/document.xml": `<w:document><w:body>${Array.from({ length: 10 }, (_, index) => `<w:p><w:t>Platform playbook section ${index + 1} says React teams should keep sync, retrieval, and admin operations on the same route for evidence-heavy products.</w:t></w:p>`).join("")}</w:body></w:document>`,
  }),
);
await writeBytes(
  "files/revenue-forecast.xlsx",
  createStoredZip({
    "xl/workbook.xml":
      '<workbook><sheets><sheet name="Overview" sheetId="1" r:id="rId1"/><sheet name="Regional Growth" sheetId="2" r:id="rId2"/></sheets></workbook>',
    "xl/sharedStrings.xml":
      "<sst><si><t>Overview</t></si><si><t>Regional Growth</t></si><si><t>Revenue forecast workbook sheet named Regional Growth shows 18 percent expansion.</t></si><si><t>Revenue forecast workbook sheet named Regional Growth tracks market expansion by territory.</t></si></sst>",
    "xl/worksheets/sheet1.xml":
      '<worksheet><sheetData><row><c t="s"><v>0</v></c><c t="s"><v>2</v></c></row></sheetData></worksheet>',
    "xl/worksheets/sheet2.xml":
      '<worksheet><sheetData><row><c t="s"><v>1</v></c><c t="s"><v>3</v></c></row></sheetData></worksheet>',
  }),
);
await writeBytes(
  "files/territory-expansion.xlsx",
  createStoredZip({
    "xl/workbook.xml":
      '<workbook><sheets><sheet name="Overview" sheetId="1" r:id="rId1"/><sheet name="Field Ops" sheetId="2" r:id="rId2"/><sheet name="Escalations" sheetId="3" r:id="rId3"/></sheets></workbook>',
    "xl/sharedStrings.xml": `<sst>${Array.from({ length: 9 }, (_, index) => `<si><t>Expansion sheet ${index + 1} says workbook-aware retrieval should preserve sheet names and territory metrics for React evidence views.</t></si>`).join("")}</sst>`,
    "xl/worksheets/sheet1.xml":
      '<worksheet><sheetData><row><c t="s"><v>0</v></c><c t="s"><v>1</v></c><c t="s"><v>2</v></c></row></sheetData></worksheet>',
    "xl/worksheets/sheet2.xml":
      '<worksheet><sheetData><row><c t="s"><v>3</v></c><c t="s"><v>4</v></c><c t="s"><v>5</v></c></row></sheetData></worksheet>',
    "xl/worksheets/sheet3.xml":
      '<worksheet><sheetData><row><c t="s"><v>6</v></c><c t="s"><v>7</v></c><c t="s"><v>8</v></c></row></sheetData></worksheet>',
  }),
);
await writeBytes(
  "files/workflow-roadmap.pptx",
  createStoredZip({
    "ppt/slides/slide1.xml":
      "<p:sld><a:t>Slide one covers retrieval streaming.</a:t></p:sld>",
    "ppt/slides/slide2.xml":
      "<p:sld><a:t>Slide two covers citation inspection and evaluation.</a:t></p:sld>",
    "ppt/slides/slide3.xml":
      "<p:sld><a:t>Slide three covers archive and OCR ingest.</a:t></p:sld>",
  }),
);
await writeBytes(
  "files/field-guide.pptx",
  createStoredZip({
    "ppt/slides/slide1.xml":
      "<p:sld><a:t>Slide one explains mailbox-backed retrieval for React support tooling.</a:t></p:sld>",
    "ppt/slides/slide2.xml":
      "<p:sld><a:t>Slide two explains archive-entry citations and evidence locators.</a:t></p:sld>",
    "ppt/slides/slide3.xml":
      "<p:sld><a:t>Slide three explains spreadsheet sheet labels and grounded references.</a:t></p:sld>",
    "ppt/slides/slide4.xml":
      "<p:sld><a:t>Slide four explains video transcript segments and timestamp-aware citations.</a:t></p:sld>",
    "ppt/slides/slide5.xml":
      "<p:sld><a:t>Slide five explains why retrieval, workflow, and admin controls should live on one route.</a:t></p:sld>",
  }),
);
await writeBytes(
  "files/operator-handbook.epub",
  createStoredZip({
    "OEBPS/chapter1.xhtml":
      "<html><body><h1>Operator handbook</h1><p>EPUB extraction stays in the same retrieval workflow as markdown and HTML.</p></body></html>",
  }),
);
await writeBytes(
  "files/recovery-manual.epub",
  createStoredZip({
    "OEBPS/chapter1.xhtml": longHtml(
      "Recovery manual",
      "EPUB extraction should preserve readable chapter text, retrieval semantics, and grounded citation behavior across handbook-style documentation.",
      8,
    ),
  }),
);
await writeBytes(
  "files/receipt.jpg",
  Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00]),
);
await writeBytes(
  "files/warehouse-whiteboard.jpg",
  Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x44, 0x00]),
);
await writeBytes(
  "files/invoice-scan.png",
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
);
await writeBytes(
  "files/shift-handoff.png",
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0b]),
);
await writeBytes(
  "files/daily-standup.mp3",
  Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]),
);
await writeBytes(
  "files/escalation-recap.mp3",
  Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x01]),
);
await writeBytes(
  "files/support-call.wav",
  Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00]),
);
await writeBytes(
  "files/incident-bridge.wav",
  Buffer.from([0x52, 0x49, 0x46, 0x46, 0x25, 0x00, 0x00, 0x00]),
);
await writeBytes(
  "files/workflow-walkthrough.mp4",
  Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
);
await writeBytes(
  "files/demo-overview.mp4",
  Buffer.from([0x00, 0x00, 0x00, 0x19, 0x66, 0x74, 0x79, 0x70]),
);
await writeBytes(
  "files/training-demo.webm",
  Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]),
);
await writeBytes(
  "files/ops-recap.webm",
  Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x82]),
);
await writeBytes(
  "archives/support-bundle.zip",
  createStoredZip({
    "docs/escalation.md":
      "# Escalation bundle\n\nThe bundled guide says archive expansion should preserve nested source labels for retrieval.",
    "runbooks/recovery.md":
      "# Recovery\n\nRecovery notes say reseeding the corpus should keep archive entry paths stable for evaluation.",
  }),
);
await writeBytes(
  "archives/release-bundle.zip",
  createStoredZip({
    "docs/release-notes.md": longMarkdown(
      "Release notes",
      "Release bundles should keep nested entry paths visible so retrieval can cite the exact file inside an archive.",
      8,
    ),
    "runbooks/cutover.md": longMarkdown(
      "Cutover",
      "Cutover runbooks should remain retrievable with stable archive-entry locators and evaluation references.",
      8,
    ),
  }),
);
await writeBytes(
  "archives/ops-bundle.tgz",
  gzipSync(
    createTar({
      "notes/coverage.txt":
        "Tarball coverage says tgz archives should also feed the same retrieval and citation workflow.",
      "runbooks/reindex.md":
        "# Reindex\n\nReindex notes say ingestion helpers should stay deterministic across backends.",
    }),
  ),
);
await writeBytes(
  "archives/audit-bundle.tgz",
  gzipSync(
    createTar({
      "notes/audit.txt": repeatParagraphs(
        "Audit note",
        "Archive expansion should keep nested sources stable for React evidence views and benchmark cases.",
        8,
      ),
      "runbooks/rollback.md": longMarkdown(
        "Rollback",
        "Tarball runbooks should be retrievable by nested path with citation-ready provenance.",
        8,
      ),
    }),
  ),
);

console.log("Generated demo corpus at", corpusDir);
