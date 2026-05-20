# AbsoluteJS React RAG Capability Guide

This guide is for engineers already using AbsoluteJS who want to understand what the React RAG/vector surface can do today and what kinds of products it supports.

## Current Package Surface

This example is currently using:
- `@absolutejs/absolute@0.19.0-beta.644 + @absolutejs/ai@0.0.2 + @absolutejs/rag@0.0.1`

The React route is:
- `/react/sqlite-native`

That route is the clearest reference for the current first-party React RAG story.

## What React Engineers Get

The React page is using first-party AbsoluteJS React RAG primitives directly.

The current surface covers:
- indexed document listing
- retrieval search
- source-scoped and document-scoped retrieval
- inline chunk preview
- ingest operations
- upload ingest
- sync operations
- workflow streaming
- citation inspection
- grounded answer inspection
- benchmark and quality comparison
- knowledge-base ops and health

This means the React story is already beyond “call search, then call chat.”

It supports building products where retrieval, answer grounding, and knowledge-base operations all live in the same application surface.

## What You Can Build With It

With the current React surface, you can build:
- internal knowledge assistants with inspectable citations
- document-heavy support tools with source-scoped retrieval
- retrieval QA tools with benchmark/evaluation visibility
- admin consoles for corpus health and sync operations
- ingestion tools for mixed-format content
- mailbox-backed knowledge systems using the same sync surface as files and URLs
- evidence-first answer experiences where users can inspect chunks and references directly

The important point is that the workflow is not split across separate systems.

React can own:
- corpus visibility
- search and narrowing
- answer streaming
- evidence inspection
- ops health
- sync and admin controls

## Core React Capability Areas

### 1. Corpus Inspection

The React route exposes indexed sources as a first-class UI, not as hidden backend state.

Current capabilities:
- paginated corpus browser
- search across indexed documents
- file-type filtering
- per-document metadata visibility
- inline chunk preview inside the document row
- direct jump from corpus row to retrieval scope

This matters because RAG products usually fail when engineers cannot inspect what actually got indexed.

The React example proves that the corpus can be a product surface, not just a preprocessing step.

### 2. Retrieval Tooling

The retrieval section already supports more than a single free-text query.

Current capabilities:
- free-text retrieval
- source-scoped retrieval
- document-scoped retrieval
- active retrieval scope visibility
- recent search replay
- result metadata inspection
- row-level search actions from corpus documents

This enables UI patterns like:
- “search only this source”
- “verify this document is retrievable”
- “compare broad vs narrow retrieval”
- “jump from corpus browsing to evidence search without retyping filters”

That is the beginning of a real retrieval workbench, not just a chat sidebar.

### 3. Workflow Streaming

The React page uses the workflow primitive directly rather than stitching low-level stream state together by hand.

Current workflow capabilities:
- stream prompt entry
- model selection
- workflow-stage visibility
- grounded answer rendering
- citation rendering
- resolved-reference inspection
- grounding coverage visibility

This makes it possible to build:
- grounded assistant interfaces
- evidence-first answer panes
- answer review surfaces for analysts/support teams
- products where users need to verify answer provenance

The important design point is that the workflow surface is higher-level than raw streaming transport.

### 4. Ingest Surface

The React route already proves multiple ingest paths.

Current capabilities:
- custom document ingest
- explicit content format selection
- explicit chunking strategy selection
- file upload ingest
- post-ingest retrieval verification

That supports products where engineers need to:
- ingest ad hoc user documents
- create internal records as source documents
- test chunking behavior quickly
- verify that uploads become retrievable immediately

### 5. Sync Surface

The React page shows that sync is part of the same product surface as retrieval and workflow.

Current sync coverage includes:
- directory sync
- URL sync
- storage sync
- Gmail fixture sync
- Microsoft Graph fixture sync
- IMAP fixture sync

What that means technically:
- corpus growth does not have to come only from manual ingest
- mailbox and storage systems can be treated as first-class corpus inputs
- sync state is visible on-page with source-level controls

This is a meaningful product capability because many RAG systems stop at local file ingest.

### 6. Ops And Health

The React route also exposes knowledge-base operations and health.

Current ops visibility includes:
- provider readiness
- embedding readiness
- reranker/index readiness
- extractor readiness
- corpus coverage
- chunk quality
- freshness/staleness
- failure visibility
- sync source state
- admin jobs/actions

This is important because production RAG products need a control plane.

The example is showing that the React app can own part of that control plane directly.

### 7. Evaluation And Quality

The React route already includes a quality surface rather than treating eval as an offline-only concern.

Current quality capabilities:
- retrieval comparison
- reranker comparison
- provider grounding comparison
- benchmark history
- citation quality visibility
- grounding drift visibility
- difficult-case inspection

This supports products where engineers need to:
- compare retrieval strategies
- compare reranking strategies
- inspect answer drift over time
- validate citation behavior from real UI routes

## Supported Content Breadth

The example and ingest helpers currently support a broad set of file and content types.

That includes examples across:
- text
- markdown
- html
- json
- csv
- xml
- yaml
- pdf
- epub
- docx
- xlsx
- pptx
- rtf
- doc
- xls
- ppt
- msg
- eml
- zip/archive-style bundles
- OCR image inputs
- audio inputs
- video inputs

For React engineers, the practical implication is simple:
- the UI does not need to be rebuilt for each content class
- the same retrieval/workflow/ops surfaces can sit on top of mixed-format corpora

## What The React Example Is Proving Architecturally

The React route is proving several architectural claims.

### Retrieval Is A First-Class UI Concern

You do not have to reduce RAG to:
- one input
- one answer
- hidden retrieval state

Instead, React can expose:
- indexed corpus
- retrieval narrowing
- evidence inspection
- chunk preview
- active search state

### Workflow Is Higher-Level Than Transport

The workflow primitive is showing that application code can think in terms of:
- submitting
- retrieving
- retrieved
- streaming
- complete

instead of only raw event transport.

That matters because most real products want workflow state, not just tokens.

### Ops Belong Beside Retrieval

The example keeps sync, ingest, health, and admin surfaces on the same route as retrieval.

That is the right direction for production tools where engineers and operators need to:
- verify new content
- re-sync a source
- inspect failures
- confirm retrievability
- compare answer quality

without jumping between disconnected systems.

## Recommended React Walkthrough

If you are showing another engineer what they can build with the current surface, the shortest useful walkthrough is:

1. Open `/react/sqlite-native`.
2. Show diagnostics so they understand backend/vector mode.
3. Open `Indexed Sources` and use:
   - corpus search
   - file-type filter
   - `Inspect chunks`
4. Use `Search source` or `Search document` to prove scoped retrieval.
5. In `Retrieve And Verify`, explain:
   - active scope
   - result metadata
   - recent searches
6. In the workflow section, run a grounded prompt and show:
   - citations
   - reference mapping
   - coverage
7. In `Knowledge Base Operations`, show:
   - readiness
   - extractor coverage
   - sync source controls
   - failure/health visibility
8. In `Quality`, show that retrieval and grounding quality are inspectable in-product.

## What Is Already Strong

The React surface is already strong in these areas:
- retrieval inspectability
- corpus visibility
- evidence-first answer workflows
- sync breadth
- mixed-format ingest story
- first-party workflow abstraction
- quality/eval integration
- admin/ops visibility

## What Still Needs Work

The React route is ahead of the others, but there is still work left.

Current gaps:
- some sections still need another pass on information density
- quality and ops can still become text-heavy in deeper states
- the same level of polish needs to be carried consistently across non-React routes
- some admin/history surfaces should keep moving from text summaries to stronger structured UI

## Bottom Line For AbsoluteJS React Engineers

The React surface is already capable of supporting real RAG product work, not just prototype chat.

Today it gives you a first-party path for building:
- retrieval-heavy apps
- grounded-answer interfaces
- corpus and ingest tooling
- sync-backed knowledge systems
- ops-aware RAG applications
- evaluation-aware answer workflows

The most important thing it proves is that AbsoluteJS can treat RAG and vector work as full application architecture inside React, not as a thin wrapper around a couple of model calls.

## File Support And What Gets Extracted

The important point is not only that AbsoluteJS accepts many file types.

The more important point is that the ingestion layer preserves source-native structure and provenance where it can, so React apps can render more than plain blob text.

### Plain Text, Markdown, HTML, JSON, CSV, XML, YAML, Code

Supported examples include:
- `.txt`
- `.md`
- `.mdx`
- `.html`
- `.htm`
- `.json`
- `.csv`
- `.xml`
- `.yaml`
- `.yml`
- `.log`
- `.ts`
- `.tsx`
- `.js`
- `.jsx`

What the pipeline extracts:
- normalized text
- source path
- title when available
- format-aware chunking
- markdown-aware and html-aware structural splitting

What this means in practice:
- markdown headings can influence chunk structure
- html section boundaries can influence chunk structure
- retrieval is working over cleaned text, not raw markup noise

### PDF

Supported examples include:
- `.pdf`

What the pipeline supports:
- built-in text extraction for text PDFs
- OCR-backed extraction for scanned/image PDFs through first-party OCR providers

What gets preserved:
- PDF text mode such as OCR-backed extraction
- OCR provider metadata
- page-aware provenance when page information is available

What React can surface from that:
- page-aware citations
- page-oriented grounding references
- PDF/OCR provenance labels in evidence UI

### Images

Supported examples include:
- `.png`
- `.jpg`
- `.jpeg`
- `.webp`
- `.tiff`
- `.tif`
- `.bmp`
- `.gif`
- `.heic`

What the pipeline supports:
- OCR extraction through first-party OCR providers

What gets preserved:
- extracted text
- OCR engine/provider metadata
- source metadata identifying the content as image-derived text

What React can surface from that:
- image-backed evidence
- OCR provenance labels
- retrieval over scanned receipts, screenshots, forms, and similar image inputs

### Audio And Video

Supported examples include:
- audio: `.mp3`, `.wav`, `.m4a`, `.aac`, `.flac`, `.ogg`, `.opus`
- video: `.mp4`, `.mov`, `.mkv`, `.webm`, `.avi`, `.m4v`

What the pipeline supports:
- transcription through first-party media transcribers
- source-native media segmentation

What gets preserved:
- full transcript text
- per-segment documents
- `startMs` / `endMs`
- formatted timestamps
- speaker metadata when present
- transcript source metadata
- media kind metadata

What React can surface from that:
- timestamp-aware citations
- segment-aware evidence rows
- speaker-aware provenance
- transcript-backed retrieval that can jump to exact media spans

This is important because media is not treated as one big transcript blob. The ingestion layer can emit segment-level evidence.

### Office Documents

Supported examples include:
- `.docx`
- `.xlsx`
- `.pptx`
- `.odt`
- `.ods`
- `.odp`

What the pipeline supports:
- built-in document extraction
- structured workbook and presentation expansion for spreadsheet/presentation formats

#### Spreadsheet Workbooks

For spreadsheet-style inputs such as `.xlsx` and `.ods`, the pipeline can produce source-native sheet documents.

What gets preserved:
- workbook-level text
- per-sheet structured documents
- `sheetName`
- `sheetIndex`
- source-native kind such as `spreadsheet_sheet`

What React can surface from that:
- sheet-aware citations
- retrieval scoped to workbook sheet content
- evidence labels like `Sheet Regional Growth`

#### Presentations

For presentation-style inputs such as `.pptx` and `.odp`, the pipeline can produce slide-level structured documents.

What gets preserved:
- presentation-level text
- per-slide structured documents
- `slideIndex`
- `slideNumber`
- source-native kind such as `presentation_slide`

What React can surface from that:
- slide-aware citations
- slide-level retrieval and evidence labels
- grounded references like `Slide 4`

### EPUB

Supported examples include:
- `.epub`

What the pipeline supports:
- built-in EPUB extraction

What gets preserved:
- normalized readable text
- source/title metadata
- chapter/section text folded into retrievable content

What React can surface from that:
- book/manual content as normal retrieval evidence
- grounded answers over handbook-style documentation

### Email

Supported examples include:
- `.eml`
- legacy `.msg`
- synced mailbox messages through Gmail, Microsoft Graph, and IMAP adapters

What the pipeline supports:
- built-in email extraction
- mailbox sync adapters that turn threads and attachments into first-class ingest inputs

What gets preserved for messages:
- thread-aware source paths
- sender metadata
- sent/received timestamps
- thread topic metadata
- message-vs-attachment distinction via `emailKind`
- attachment presence metadata

What gets preserved for attachments:
- attachment IDs
- attachment names
- attachment source paths
- attachment titles
- attachment-specific metadata merged into ingest

What React can surface from that:
- message evidence vs attachment evidence
- sender/thread provenance labels
- attachment-aware citations
- mailbox-backed retrieval where attachments and messages are both retrievable

This matters because email is not reduced to a single string. Threads, messages, and attachments stay visible as corpus objects.

### Archives

Supported examples include:
- `.zip`
- `.tar`
- `.gz`
- `.tgz`
- `.bz2`
- `.xz`

What the pipeline supports:
- archive expansion through first-party archive extractors
- per-entry ingest for supported entries inside the archive

What gets preserved:
- archive-level source
- per-entry derived sources such as `bundle.zip#runbooks/recovery.md`
- archive entry path metadata
- source-native kind such as `archive_entry`

What React can surface from that:
- archive-entry citations
- retrieval that points to the exact file inside an archive
- grounded references like `Archive entry runbooks/recovery.md`

### Legacy Formats

Supported examples include:
- `.rtf`
- `.doc`
- `.xls`
- `.ppt`
- `.msg`

What the pipeline supports:
- built-in extraction or text-oriented heuristics depending on the format

What this means in practice:
- legacy content can still participate in the same corpus
- React does not need a separate retrieval or ops surface for old enterprise file types

## Provenance Model React Can Use

The ingestion and presentation layers are already wired so React can render more than `source + excerpt`.

The current provenance model can include:
- page labels for PDFs
- sheet labels for spreadsheets
- slide labels for presentations
- archive entry labels for bundles
- attachment labels for email attachments
- sender/thread labels for email messages
- timestamp labels for media segments
- OCR/transcript provider labels
- speaker labels when present

This is why the grounded-answer and citation surfaces matter.

AbsoluteJS is already carrying the metadata needed to render evidence in a human way:
- `Page 3`
- `Sheet Regional Growth`
- `Slide 5`
- `Archive entry runbooks/recovery.md`
- `Attachment invoice.pdf`
- `Timestamp 00:00.000 - 00:08.000`

## Why This Matters For React Product Design

For a React engineer, richer extraction changes the kind of product you can build.

Without source-native extraction, you get:
- generic retrieval
- weak citations
- low-trust answers
- poor debugging when content quality is bad

With the current AbsoluteJS surface, you can build:
- evidence viewers that show page/sheet/slide/timestamp context
- retrieval tools that verify the exact structured source being hit
- mailbox/document/archive interfaces on one route
- grounded answer interfaces where provenance is inspectable and explainable

The file support story is not only about accepting more uploads.

It is about preserving enough structure and metadata that React can present retrieval and grounding in a way users can trust.

## React Primitive Mapping

If you want to understand the React story as code instead of as UI, this is the important mapping.

The first-party React exports currently include:
- `useRAG`
- `useRAGSearch`
- `useRAGIngest`
- `useRAGStatus`
- `useRAGOps`
- `useRAGDocuments`
- `useRAGChunkPreview`
- `useRAGEvaluate`
- `useRAGIndexAdmin`
- `useRAGWorkflow`
- `useRAGStream`
- `useRAGStreamProgress`
- `useRAGSources`
- `useRAGCitations`
- `useRAGGrounding`

### High-Level Composition: `useRAG`

`useRAG(path, options)` is the current high-level React composition surface.

It bundles together:
- search
- ingest
- status
- ops
- documents
- chunk preview
- evaluate
- index admin
- workflow/stream
- source extraction from workflow messages
- citations from sources
- grounding from answer + sources

That means a React route can start with one top-level RAG hook and still drill down into narrower capabilities as needed.

### Retrieval Surface

Use these when building retrieval-heavy UI:
- `useRAGSearch`
- `useRAGDocuments`
- `useRAGChunkPreview`
- `useRAGSources`

What they are for:
- `useRAGSearch`: query execution and result loading
- `useRAGDocuments`: indexed document listing
- `useRAGChunkPreview`: chunk preview for a selected document
- `useRAGSources`: derive retrieved RAG sources from workflow messages

Typical React UI patterns:
- corpus browser
- search workbench
- source/document narrowing
- inline evidence viewer

### Workflow Surface

Use these when building answer-generation UI:
- `useRAGWorkflow`
- `useRAGStream`
- `useRAGStreamProgress`
- `useRAGCitations`
- `useRAGGrounding`

What they are for:
- `useRAGWorkflow`: higher-level workflow-oriented state
- `useRAGStream`: lower-level stream transport/message state
- `useRAGStreamProgress`: explicit stream progress calculation
- `useRAGCitations`: turn retrieved sources into citation objects
- `useRAGGrounding`: turn answer + sources into grounded-answer state

Typical React UI patterns:
- grounded assistant panels
- workflow-stage indicators
- citation sidebars
- evidence-backed answer review

### Ingest And Admin Surface

Use these when building ops or knowledge-base management UI:
- `useRAGIngest`
- `useRAGOps`
- `useRAGStatus`
- `useRAGIndexAdmin`
- `useRAGEvaluate`

What they are for:
- `useRAGIngest`: document/url/upload ingest
- `useRAGOps`: knowledge-base health, readiness, sync/admin records
- `useRAGStatus`: backend/vector/index status
- `useRAGIndexAdmin`: sync, reseed, reset, reindex, delete, document admin
- `useRAGEvaluate`: benchmark/eval execution

Typical React UI patterns:
- ingest consoles
- sync dashboards
- admin mutation controls
- evaluation dashboards

## Metadata Keys React Engineers Can Rely On

The exact metadata depends on file family and extractor path, but the current ingestion and presentation code already depends on a useful set of keys.

These are the important ones for app code and evidence rendering.

### General Provenance And Classification

Common useful keys include:
- `fileKind`
- `sourceNativeKind`
- `extractor`
- `format`

Use these to drive:
- iconography
- grouping
- conditional rendering
- specialized evidence labels

### PDF And OCR

Useful keys include:
- `page`
- `pageNumber`
- `pageIndex`
- `pdfTextMode`
- `ocrEngine`

Use these to render:
- page-aware references
- OCR provenance badges
- PDF extraction mode indicators

### Spreadsheet

Useful keys include:
- `sheetName`
- `sheetNames`
- `sheetIndex`

Use these to render:
- sheet-aware evidence labels
- workbook navigation
- sheet-specific retrieval scope summaries

### Presentation

Useful keys include:
- `slide`
- `slideNumber`
- `slideIndex`

Use these to render:
- slide-aware evidence labels
- presentation navigation
- slide-specific citations

### Archive

Useful keys include:
- `archiveEntryPath`
- `entryPath`
- `archivePath`

Use these to render:
- archive-entry provenance
- nested source labels
- retrieval evidence that points inside bundled artifacts

### Email

Useful keys include:
- `emailKind`
- `threadTopic`
- `from`
- `sentAt`
- `receivedAt`
- `attachmentId`
- `attachmentName`
- `hasAttachments`

Use these to render:
- message vs attachment evidence
- sender/thread provenance
- mailbox-aware filters and grouping

### Media

Useful keys include:
- `mediaKind`
- `startMs`
- `endMs`
- `speaker`
- `transcriptSource`
- `mediaSegments`

Use these to render:
- timestamp labels
- speaker labels
- transcript-segment evidence cards
- media-specific jump targets

## Practical Guidance For React Engineers

If you are building on top of this surface, the current best approach is:

1. Start with `useRAG()` if you want one integrated route.
2. Break out into narrower hooks when a section becomes specialized.
3. Treat metadata as part of the product surface, not only internal backend output.
4. Render source-native provenance whenever possible:
   - page
   - sheet
   - slide
   - archive entry
   - attachment
   - timestamp
5. Keep retrieval, workflow, and ops on the same route when the application is evidence-heavy.

That is the pattern the example is already moving toward.

The main thing AbsoluteJS is giving React engineers here is not just transport or inference access.

It is a growing first-party surface for building evidence-aware applications where ingest, retrieval, grounding, and operations are all represented in application code and UI as explicit primitives.
