import { EXCLUDE_LAST, H2_SLICE, H3_SLICE } from "../constants";

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const renderInline = (line: string) =>
  escapeHtml(line)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );

const isTableRow = (line: string) => line.startsWith("|") && line.endsWith("|");

const isTableSeparator = (line: string) =>
  isTableRow(line) && /^\|[\s\-:|]+\|$/.test(line);

const parseCells = (line: string) =>
  line
    .slice(1, EXCLUDE_LAST)
    .split("|")
    .map((cell) => cell.trim());

const renderTable = (lines: string[]) => {
  const headerCells = parseCells(lines[0]);
  const rows = lines.slice(2);

  const header = headerCells
    .map((cell) => `<th>${renderInline(cell)}</th>`)
    .join("");

  const body = rows
    .filter(isTableRow)
    .map((row) => {
      const cells = parseCells(row)
        .map((cell) => `<td>${renderInline(cell)}</td>`)
        .join("");

      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
};

const collectTable = (lines: string[], startIdx: number) => {
  const tableLines: string[] = [];
  let idx = startIdx;

  while (idx < lines.length && isTableRow(lines[idx])) {
    tableLines.push(lines[idx]);
    idx++;
  }

  return { html: renderTable(tableLines), nextIdx: idx };
};

const collectList = (lines: string[], startIdx: number) => {
  const items: string[] = [];
  let idx = startIdx;

  while (idx < lines.length && lines[idx].startsWith("- ")) {
    items.push(`<li>${renderInline(lines[idx].slice(2))}</li>`);
    idx++;
  }

  return { html: `<ul>${items.join("")}</ul>`, nextIdx: idx };
};

const renderLine = (line: string) => {
  if (line.startsWith("# ")) return `<h1>${renderInline(line.slice(2))}</h1>`;
  if (line.startsWith("## "))
    return `<h2>${renderInline(line.slice(H2_SLICE))}</h2>`;
  if (line.startsWith("### "))
    return `<h3>${renderInline(line.slice(H3_SLICE))}</h3>`;
  if (line.trim() === "") return null;

  return `<p>${renderInline(line)}</p>`;
};

type ParseResult = {
  html: string | null;
  nextIdx: number;
};

const isTableStart = (lines: string[], idx: number) =>
  isTableRow(lines[idx]) &&
  idx + 1 < lines.length &&
  isTableSeparator(lines[idx + 1]);

const parseLine = (lines: string[], idx: number): ParseResult => {
  if (isTableStart(lines, idx)) {
    const table = collectTable(lines, idx);

    return { html: table.html, nextIdx: table.nextIdx };
  }

  if (lines[idx].startsWith("- ")) {
    const list = collectList(lines, idx);

    return { html: list.html, nextIdx: list.nextIdx };
  }

  return { html: renderLine(lines[idx]), nextIdx: idx + 1 };
};

export const renderMarkdown = (text: string) => {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let idx = 0;

  while (idx < lines.length) {
    const result = parseLine(lines, idx);
    if (result.html) chunks.push(result.html);
    idx = result.nextIdx;
  }

  return chunks.join("");
};
