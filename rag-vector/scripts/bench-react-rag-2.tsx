import { performance } from "node:perf_hooks";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ReactRAGVectorDemo } from "./src/frontend/react/pages/ReactRAGVectorDemo.tsx";

const props = { mode: "sqlite-native" } as const;
const start = performance.now();
const element = createElement(ReactRAGVectorDemo, props);
const stream = await renderToReadableStream(element);
const ttfb = performance.now() - start;
console.log(`renderToReadableStream call ms ${ttfb.toFixed(2)}`);
const reader = stream.getReader();
const start2 = performance.now();
const chunk = await reader.read();
console.log(`first chunk read ms ${(performance.now() - start2).toFixed(2)}`);
console.log(
  `first chunk done=${chunk.done} size=${chunk.value ? chunk.value.length : 0}`,
);
await stream.cancel();
