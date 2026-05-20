import {
  createRAGImageOCRExtractor,
  createRAGMediaFileExtractor,
  createRAGMediaTranscriber,
  createRAGPDFOCRExtractor,
  createRAGOCRProvider,
} from "@absolutejs/rag";

const resolveName = (value: { name?: string; path?: string }) =>
  (value.name ?? value.path ?? "").toLowerCase();

const repeatParagraphs = (prefix: string, sentence: string, count = 8) =>
  Array.from(
    { length: count },
    (_, index) => `${prefix} ${index + 1}. ${sentence}`,
  ).join(" ");

const imageOCR = createRAGOCRProvider({
  name: "demo_image_ocr",
  extractText: (input) => {
    const name = resolveName(input);

    if (name.includes("receipt")) {
      return {
        text: "Receipt image OCR shows invoice INV-2048, customer Harbor Outfitters, and a fulfillment note that metadata tags must remain stable during ingest.",
        metadata: {
          extractedFrom: "demo-image",
          imageSubject: "receipt",
          ocrEngine: "Absolute demo OCR",
        },
        title: input.title ?? "Receipt OCR",
      };
    }

    if (name.includes("warehouse-whiteboard")) {
      return {
        text: repeatParagraphs(
          "Warehouse whiteboard OCR",
          "The whiteboard says shift handoff notes should preserve assignees, issue labels, and retrieval-friendly metadata so operators can verify the source image.",
          10,
        ),
        metadata: {
          extractedFrom: "demo-image",
          imageSubject: "whiteboard",
          ocrEngine: "Absolute demo OCR",
        },
        title: input.title ?? "Warehouse whiteboard OCR",
      };
    }

    if (name.includes("invoice-scan")) {
      return {
        text: repeatParagraphs(
          "Invoice scan OCR",
          "The scanned invoice says OCR-derived evidence should preserve invoice numbers, customer names, and retrieval-friendly metadata so React operators can verify the source.",
          10,
        ),
        metadata: {
          extractedFrom: "demo-image",
          imageSubject: "invoice",
          ocrEngine: "Absolute demo OCR",
        },
        title: input.title ?? "Invoice scan OCR",
      };
    }

    return {
      text: "Image OCR extracted demo text from a seeded binary asset so the example can prove first-party OCR extraction without external services.",
      metadata: {
        extractedFrom: "demo-image",
        imageSubject: "generic",
        ocrEngine: "Absolute demo OCR",
      },
      title: input.title ?? "Image OCR",
    };
  },
});

const pdfOCR = createRAGOCRProvider({
  name: "demo_pdf_ocr",
  extractText: (input) => {
    const name = resolveName(input);

    if (name.includes("scanned-receipt")) {
      return {
        text: "Scanned PDF OCR recovered invoice INV-7148, warehouse lane C3, and the note that the retrieval benchmark should cite files by page when available.",
        metadata: {
          extractedFrom: "demo-pdf",
          ocrEngine: "Absolute demo PDF OCR",
        },
        title: input.title ?? "Scanned receipt PDF",
      };
    }

    if (name.includes("scanned-contract")) {
      return {
        text: repeatParagraphs(
          "Scanned contract OCR",
          "The scanned contract says OCR-backed PDFs should remain page-aware, citation-friendly, and source-identifiable across grounded answer workflows.",
          10,
        ),
        metadata: {
          extractedFrom: "demo-pdf",
          ocrEngine: "Absolute demo PDF OCR",
        },
        title: input.title ?? "Scanned contract PDF",
      };
    }

    return {
      text: "Demo PDF OCR fallback extracted seeded content from an image-only PDF so the example can show the first-party OCR path.",
      metadata: {
        extractedFrom: "demo-pdf",
        ocrEngine: "Absolute demo PDF OCR",
      },
      title: input.title ?? "OCR PDF",
    };
  },
});

const mediaTranscriber = createRAGMediaTranscriber({
  name: "demo_media_transcriber",
  transcribe: (input) => {
    const name = resolveName(input);

    if (name.includes("escalation-recap") || name.includes("incident-bridge")) {
      return {
        text: repeatParagraphs(
          "Incident audio transcript",
          "The incident audio says bridge calls should preserve timestamps, speaker turns, escalation context, and source-native evidence for grounded answer review.",
          10,
        ),
        metadata: {
          mediaKind: "audio",
          transcriptSource: "Absolute demo media",
        },
        segments: [
          {
            endMs: 7000,
            speaker: "Casey",
            startMs: 0,
            text: "At timestamp 00:00 to 00:07, the incident bridge says escalation context and caller roles should stay visible in retrieval evidence.",
          },
          {
            endMs: 16000,
            speaker: "Morgan",
            startMs: 7000,
            text: "At timestamp 00:07 to 00:16, the follow-up says grounded answers should preserve source labels and timestamp-aware references.",
          },
        ],
        title: input.title ?? "Incident bridge audio",
      };
    }

    if (name.endsWith(".mp3") || name.endsWith(".wav")) {
      return {
        text: repeatParagraphs(
          "Audio transcript",
          "The audio transcript says segment-aware retrieval should keep timestamps, speakers, citations, evaluation, and ingest workflows aligned across React, Vue, Svelte, Angular, HTML, and HTMX.",
          10,
        ),
        metadata: {
          mediaKind: "audio",
          transcriptSource: "Absolute demo media",
        },
        segments: [
          {
            endMs: 8000,
            speaker: "Alex",
            startMs: 0,
            text: "At timestamp 00:00 to 00:08, the daily standup audio says retrieval, citations, evaluation, and ingest workflows stay aligned across every frontend.",
          },
          {
            endMs: 18000,
            speaker: "Jordan",
            startMs: 8000,
            text: "At timestamp 00:08 to 00:18, the follow-up segment says timestamp-aware evidence should remain visible when React users inspect grounded answers.",
          },
        ],
        title: input.title ?? "Daily standup audio",
      };
    }

    if (name.includes("demo-overview") || name.includes("ops-recap")) {
      return {
        text: repeatParagraphs(
          "Ops video transcript",
          "The ops recap says sync health, admin actions, retrieval scope, and evidence mapping should stay on one route so operators can debug production behavior quickly.",
          10,
        ),
        metadata: {
          mediaKind: "video",
          transcriptSource: "Absolute demo media",
        },
        segments: [
          {
            endMs: 11000,
            speaker: "Narrator",
            startMs: 0,
            text: "The first segment says sync health, admin jobs, and grounded answer diagnostics should stay together in the same operational surface.",
          },
          {
            endMs: 22000,
            speaker: "Narrator",
            startMs: 11000,
            text: "The second segment says scoped retrieval and citation review should remain directly connected to the document evidence they came from.",
          },
        ],
        title: input.title ?? "Ops recap video",
      };
    }

    return {
      text: repeatParagraphs(
        "Video transcript",
        "The workflow walkthrough explains that PDF, OCR, archive, spreadsheet, presentation, email, and legacy document ingest all land in the same retrieval surface.",
        10,
      ),
      metadata: {
        mediaKind: "video",
        transcriptSource: "Absolute demo media",
      },
      segments: [
        {
          endMs: 12000,
          speaker: "Narrator",
          startMs: 0,
          text: "PDF, OCR, archive, spreadsheet, presentation, and legacy document ingest all land in the same retrieval surface.",
        },
        {
          endMs: 24000,
          speaker: "Narrator",
          startMs: 12000,
          text: "The follow-up segment says workflow streaming and evidence inspection should stay on the same React route as sync and admin controls.",
        },
      ],
      title: input.title ?? "Workflow walkthrough video",
    };
  },
});

export const ragDemoExtractors = [
  createRAGPDFOCRExtractor({
    provider: pdfOCR,
  }),
  createRAGImageOCRExtractor(imageOCR),
  createRAGMediaFileExtractor(mediaTranscriber),
];
