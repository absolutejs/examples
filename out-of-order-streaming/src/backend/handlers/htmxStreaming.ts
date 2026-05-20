import { delay, formatTimestamp } from "./streamingShared";

const htmxIconMarkup =
  '<picture><source media="(prefers-color-scheme: dark)" srcset="/assets/svg/htmx-logo-white.svg" /><img alt="HTMX" height="20" src="/assets/svg/htmx.svg" /></picture>';

const htmxSlotDescriptors = [
  {
    declaredOrder: "1st",
    id: "htmx-first",
    label: "HTMX Slot 1",
    resolveDelayMs: 3000,
    resolveOrder: "5th",
  },
  {
    declaredOrder: "2nd",
    id: "htmx-second",
    label: "HTMX Slot 2",
    resolveDelayMs: 1000,
    resolveOrder: "2nd",
  },
  {
    declaredOrder: "3rd",
    id: "htmx-third",
    label: "HTMX Slot 3",
    resolveDelayMs: 3500,
    resolveOrder: "6th",
  },
  {
    declaredOrder: "4th",
    id: "htmx-fourth",
    label: "HTMX Slot 4",
    resolveDelayMs: 500,
    resolveOrder: "1st",
  },
  {
    declaredOrder: "5th",
    id: "htmx-fifth",
    label: "HTMX Slot 5",
    resolveDelayMs: 2200,
    resolveOrder: "4th",
  },
  {
    declaredOrder: "6th",
    id: "htmx-sixth",
    label: "HTMX Slot 6",
    resolveDelayMs: 1500,
    resolveOrder: "3rd",
  },
] as const;

type HTMXSlotDescriptor = (typeof htmxSlotDescriptors)[number];

const htmxSlotDescriptorMap = new Map<string, HTMXSlotDescriptor>(
  htmxSlotDescriptors.map((descriptor) => [descriptor.id, descriptor]),
);

const renderHTMXResolvedCard = ({
  declaredOrder,
  label,
  resolveDelayMs,
  resolveOrder,
}: HTMXSlotDescriptor) =>
  `<article class="stream-card stream-card-htmx"><div class="stream-header">${htmxIconMarkup}<span>${label}</span></div><div class="stream-meta"><span>Declared ${declaredOrder}</span><span>Resolved ${resolveOrder}</span><span>${resolveDelayMs}ms</span><span>hx-get fragment</span></div><p class="stream-desc">Arrived independently via its own HTMX request and replaced the matching fallback card.</p><p class="stream-timestamp"><strong>Resolved at</strong> ${formatTimestamp(new Date())}</p></article>`;

export const resolveHTMXSlotFragment = async (slotId: string) => {
  const descriptor = htmxSlotDescriptorMap.get(slotId);
  if (!descriptor) {
    return null;
  }

  await delay(descriptor.resolveDelayMs);

  return renderHTMXResolvedCard(descriptor);
};
