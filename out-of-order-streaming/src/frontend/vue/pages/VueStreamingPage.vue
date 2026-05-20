<script setup lang="ts">
import { StreamSlot } from "@absolutejs/absolute/vue/components";
import Nav from "../components/Nav.vue";

defineOptions({ name: "VueStreamingPage" });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const formatTimestamp = (date: Date) => {
  const day = DAYS[date.getDay()];
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${day} ${h12}:${m}:${s}.${ms} ${ampm}`;
};

const renderSlot = async (
  label: string,
  delayMs: number,
  declaredOrder: string,
  resolveOrder: string,
  primitive: string,
) => {
  await delay(delayMs);

  return `<article class="stream-card stream-card-vue"><div class="stream-header"><img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" /><span>${label}</span></div><div class="stream-meta"><span>Declared ${declaredOrder}</span><span>Resolved ${resolveOrder}</span><span>${delayMs}ms</span><span>${primitive}</span></div><p class="stream-desc">Arrived independently and replaced its matching placeholder.</p><p class="stream-timestamp"><strong>Resolved at</strong> ${formatTimestamp(new Date())}</p></article>`;
};

const createFallback = (
  declaredOrder: string,
  expectedResolveOrder: string,
  label: string,
  primitive: string,
) =>
  `<article class="stream-card stream-card-vue stream-card-fallback"><div class="stream-header"><img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" /><span>${label}</span></div><div class="stream-meta"><span>Declared ${declaredOrder}</span><span>Expected ${expectedResolveOrder}</span><span>Fallback</span><span>${primitive}</span></div><p class="stream-desc">Waiting for server to stream resolved markup into this slot.</p><div class="stream-timestamp-skeleton"></div></article>`;
</script>

<template>
  <Nav active-framework="vue" active-mode="raw" />
  <main>
    <div class="page-title">
      <img alt="Vue" height="32" src="/assets/svg/vue-logo.svg" />
      <h1>Vue Raw Slots</h1>
      <span class="badge">Transport Primitive</span>
    </div>

    <p class="section-desc">
      This page shows the low-level <code>StreamSlot</code> transport directly.
      The cards stay in declaration order while their server HTML lands in
      resolve order.
    </p>

    <h2 class="section-title">Streamed Slots</h2>
    <p class="section-desc">
      Six slots declared in order. Watch them resolve out of sequence &mdash;
      slot 4 arrives first, then 2, 6, 5, 1, and finally 3.
    </p>

    <section class="grid">
      <StreamSlot
        id="vue-first"
        :fallback-html="
          createFallback('1st', '5th', 'Vue Slot 1', 'StreamSlot')
        "
        :resolve="
          () => renderSlot('Vue Slot 1', 3000, '1st', '5th', 'StreamSlot')
        "
        :timeout-ms="5000"
      />
      <StreamSlot
        id="vue-second"
        :fallback-html="
          createFallback('2nd', '2nd', 'Vue Slot 2', 'StreamSlot')
        "
        :resolve="
          () => renderSlot('Vue Slot 2', 1000, '2nd', '2nd', 'StreamSlot')
        "
        :timeout-ms="5000"
      />
      <StreamSlot
        id="vue-third"
        :fallback-html="
          createFallback('3rd', '6th', 'Vue Slot 3', 'StreamSlot')
        "
        :resolve="
          () => renderSlot('Vue Slot 3', 3500, '3rd', '6th', 'StreamSlot')
        "
        :timeout-ms="5000"
      />
      <StreamSlot
        id="vue-fourth"
        :fallback-html="
          createFallback('4th', '1st', 'Vue Slot 4', 'StreamSlot')
        "
        :resolve="
          () => renderSlot('Vue Slot 4', 500, '4th', '1st', 'StreamSlot')
        "
        :timeout-ms="5000"
      />
      <StreamSlot
        id="vue-fifth"
        :fallback-html="
          createFallback('5th', '4th', 'Vue Slot 5', 'StreamSlot')
        "
        :resolve="
          () => renderSlot('Vue Slot 5', 2200, '5th', '4th', 'StreamSlot')
        "
        :timeout-ms="5000"
      />
      <StreamSlot
        id="vue-sixth"
        :fallback-html="
          createFallback('6th', '3rd', 'Vue Slot 6', 'StreamSlot')
        "
        :resolve="
          () => renderSlot('Vue Slot 6', 1500, '6th', '3rd', 'StreamSlot')
        "
        :timeout-ms="5000"
      />
    </section>

    <p class="footer">
      <img alt="" src="/assets/png/absolutejs-temp.png" />
      Powered by
      <a
        href="https://absolutejs.com"
        rel="noopener noreferrer"
        target="_blank"
      >
        AbsoluteJS
      </a>
    </p>
  </main>
</template>
