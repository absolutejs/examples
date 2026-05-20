import type { StreamingSlot } from "@absolutejs/absolute";
import { delay, formatTimestamp } from "./streamingShared";

const htmlIconMarkup =
  '<img alt="HTML" height="20" src="/assets/svg/html5.svg" />';

const htmlSlotDescriptors = [
  {
    declaredOrder: "1st",
    id: "html-first",
    label: "HTML Slot 1",
    resolveDelayMs: 3000,
    resolveOrder: "5th",
  },
  {
    declaredOrder: "2nd",
    id: "html-second",
    label: "HTML Slot 2",
    resolveDelayMs: 1000,
    resolveOrder: "2nd",
  },
  {
    declaredOrder: "3rd",
    id: "html-third",
    label: "HTML Slot 3",
    resolveDelayMs: 3500,
    resolveOrder: "6th",
  },
  {
    declaredOrder: "4th",
    id: "html-fourth",
    label: "HTML Slot 4",
    resolveDelayMs: 500,
    resolveOrder: "1st",
  },
  {
    declaredOrder: "5th",
    id: "html-fifth",
    label: "HTML Slot 5",
    resolveDelayMs: 2200,
    resolveOrder: "4th",
  },
  {
    declaredOrder: "6th",
    id: "html-sixth",
    label: "HTML Slot 6",
    resolveDelayMs: 1500,
    resolveOrder: "3rd",
  },
] as const;

type HTMLSlotDescriptor = (typeof htmlSlotDescriptors)[number];

const renderHTMLResolvedCard = ({
  declaredOrder,
  label,
  resolveDelayMs,
  resolveOrder,
}: HTMLSlotDescriptor) =>
  `<article class="stream-card stream-card-html"><div class="stream-header">${htmlIconMarkup}<span>${label}</span></div><div class="stream-meta"><span>Declared ${declaredOrder}</span><span>Resolved ${resolveOrder}</span><span>${resolveDelayMs}ms</span><span>handleHTMLPageRequest</span></div><p class="stream-desc">Arrived independently and replaced its matching placeholder.</p><p class="stream-timestamp"><strong>Resolved at</strong> ${formatTimestamp(new Date())}</p></article>`;

export const htmlStreamingSlots: StreamingSlot[] = htmlSlotDescriptors.map(
  (descriptor) => ({
    fallbackHtml: "",
    id: descriptor.id,
    resolve: async () => {
      await delay(descriptor.resolveDelayMs);

      return renderHTMLResolvedCard(descriptor);
    },
  }),
);
