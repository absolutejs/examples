<script setup lang="ts">
import { SuspenseSlot } from "@absolutejs/absolute/vue/components";
import Nav from "../components/Nav.vue";

defineOptions({ name: "VueSuspensePage" });

type SlotData = {
  delayMs: number;
  label: string;
  resolveOrder: string;
  resolvedAt: string;
};

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

const createSlotPromise = async (
  label: string,
  delayMs: number,
  resolveOrder: string,
): Promise<SlotData> => {
  await delay(delayMs);

  return {
    delayMs,
    label,
    resolveOrder,
    resolvedAt: formatTimestamp(new Date()),
  };
};
</script>

<template>
  <Nav active-framework="vue" active-mode="framework" />
  <main>
    <div class="page-title">
      <img alt="Vue" height="32" src="/assets/svg/vue-logo.svg" />
      <h1>Vue Framework Primitives</h1>
      <span class="badge">Suspense-Shaped</span>
    </div>

    <p class="section-desc">
      This page uses <code>SuspenseSlot</code> with Vue fallback and default
      slots. The transport is still the same out-of-order slot pipeline
      underneath.
    </p>

    <h2 class="section-title">Framework-Shaped Slots</h2>
    <p class="section-desc">
      Six slots declared in order. Watch them resolve out of sequence &mdash;
      slot 4 arrives first, then 2, 6, 5, 1, and finally 3.
    </p>

    <section class="grid">
      <SuspenseSlot
        id="vue-framework-first"
        :promise="createSlotPromise('Vue Suspense Slot 1', 3000, '5th')"
        :timeout-ms="5000"
      >
        <template #fallback>
          <article class="stream-card stream-card-vue stream-card-fallback">
            <div class="stream-header">
              <img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" />
              <span>Vue Suspense Slot 1</span>
            </div>
            <div class="stream-meta">
              <span>Declared 1st</span>
              <span>Expected 5th</span>
              <span>Fallback</span>
              <span>SuspenseSlot</span>
            </div>
            <p class="stream-desc">
              Waiting for server to stream resolved markup into this slot.
            </p>
            <div class="stream-timestamp-skeleton"></div>
          </article>
        </template>
        <template #default="{ value }">
          <article class="stream-card stream-card-vue">
            <div class="stream-header">
              <img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" />
              <span>{{ value.label }}</span>
            </div>
            <div class="stream-meta">
              <span>Declared 1st</span>
              <span>Resolved {{ value.resolveOrder }}</span>
              <span>{{ value.delayMs }}ms</span>
              <span>SuspenseSlot</span>
            </div>
            <p class="stream-desc">
              Authored as Vue markup and rendered to streamed HTML on the
              server.
            </p>
            <p class="stream-timestamp">
              <strong>Resolved at</strong> {{ value.resolvedAt }}
            </p>
          </article>
        </template>
      </SuspenseSlot>

      <SuspenseSlot
        id="vue-framework-second"
        :promise="createSlotPromise('Vue Suspense Slot 2', 1000, '2nd')"
        :timeout-ms="5000"
      >
        <template #fallback>
          <article class="stream-card stream-card-vue stream-card-fallback">
            <div class="stream-header">
              <img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" />
              <span>Vue Suspense Slot 2</span>
            </div>
            <div class="stream-meta">
              <span>Declared 2nd</span>
              <span>Expected 2nd</span>
              <span>Fallback</span>
              <span>SuspenseSlot</span>
            </div>
            <p class="stream-desc">
              Waiting for server to stream resolved markup into this slot.
            </p>
            <div class="stream-timestamp-skeleton"></div>
          </article>
        </template>
        <template #default="{ value }">
          <article class="stream-card stream-card-vue">
            <div class="stream-header">
              <img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" />
              <span>{{ value.label }}</span>
            </div>
            <div class="stream-meta">
              <span>Declared 2nd</span>
              <span>Resolved {{ value.resolveOrder }}</span>
              <span>{{ value.delayMs }}ms</span>
              <span>SuspenseSlot</span>
            </div>
            <p class="stream-desc">
              Authored as Vue markup and rendered to streamed HTML on the
              server.
            </p>
            <p class="stream-timestamp">
              <strong>Resolved at</strong> {{ value.resolvedAt }}
            </p>
          </article>
        </template>
      </SuspenseSlot>

      <SuspenseSlot
        id="vue-framework-third"
        :promise="createSlotPromise('Vue Suspense Slot 3', 3500, '6th')"
        :timeout-ms="5000"
      >
        <template #fallback>
          <article class="stream-card stream-card-vue stream-card-fallback">
            <div class="stream-header">
              <img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" />
              <span>Vue Suspense Slot 3</span>
            </div>
            <div class="stream-meta">
              <span>Declared 3rd</span>
              <span>Expected 6th</span>
              <span>Fallback</span>
              <span>SuspenseSlot</span>
            </div>
            <p class="stream-desc">
              Waiting for server to stream resolved markup into this slot.
            </p>
            <div class="stream-timestamp-skeleton"></div>
          </article>
        </template>
        <template #default="{ value }">
          <article class="stream-card stream-card-vue">
            <div class="stream-header">
              <img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" />
              <span>{{ value.label }}</span>
            </div>
            <div class="stream-meta">
              <span>Declared 3rd</span>
              <span>Resolved {{ value.resolveOrder }}</span>
              <span>{{ value.delayMs }}ms</span>
              <span>SuspenseSlot</span>
            </div>
            <p class="stream-desc">
              Authored as Vue markup and rendered to streamed HTML on the
              server.
            </p>
            <p class="stream-timestamp">
              <strong>Resolved at</strong> {{ value.resolvedAt }}
            </p>
          </article>
        </template>
      </SuspenseSlot>

      <SuspenseSlot
        id="vue-framework-fourth"
        :promise="createSlotPromise('Vue Suspense Slot 4', 500, '1st')"
        :timeout-ms="5000"
      >
        <template #fallback>
          <article class="stream-card stream-card-vue stream-card-fallback">
            <div class="stream-header">
              <img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" />
              <span>Vue Suspense Slot 4</span>
            </div>
            <div class="stream-meta">
              <span>Declared 4th</span>
              <span>Expected 1st</span>
              <span>Fallback</span>
              <span>SuspenseSlot</span>
            </div>
            <p class="stream-desc">
              Waiting for server to stream resolved markup into this slot.
            </p>
            <div class="stream-timestamp-skeleton"></div>
          </article>
        </template>
        <template #default="{ value }">
          <article class="stream-card stream-card-vue">
            <div class="stream-header">
              <img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" />
              <span>{{ value.label }}</span>
            </div>
            <div class="stream-meta">
              <span>Declared 4th</span>
              <span>Resolved {{ value.resolveOrder }}</span>
              <span>{{ value.delayMs }}ms</span>
              <span>SuspenseSlot</span>
            </div>
            <p class="stream-desc">
              Authored as Vue markup and rendered to streamed HTML on the
              server.
            </p>
            <p class="stream-timestamp">
              <strong>Resolved at</strong> {{ value.resolvedAt }}
            </p>
          </article>
        </template>
      </SuspenseSlot>

      <SuspenseSlot
        id="vue-framework-fifth"
        :promise="createSlotPromise('Vue Suspense Slot 5', 2200, '4th')"
        :timeout-ms="5000"
      >
        <template #fallback>
          <article class="stream-card stream-card-vue stream-card-fallback">
            <div class="stream-header">
              <img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" />
              <span>Vue Suspense Slot 5</span>
            </div>
            <div class="stream-meta">
              <span>Declared 5th</span>
              <span>Expected 4th</span>
              <span>Fallback</span>
              <span>SuspenseSlot</span>
            </div>
            <p class="stream-desc">
              Waiting for server to stream resolved markup into this slot.
            </p>
            <div class="stream-timestamp-skeleton"></div>
          </article>
        </template>
        <template #default="{ value }">
          <article class="stream-card stream-card-vue">
            <div class="stream-header">
              <img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" />
              <span>{{ value.label }}</span>
            </div>
            <div class="stream-meta">
              <span>Declared 5th</span>
              <span>Resolved {{ value.resolveOrder }}</span>
              <span>{{ value.delayMs }}ms</span>
              <span>SuspenseSlot</span>
            </div>
            <p class="stream-desc">
              Authored as Vue markup and rendered to streamed HTML on the
              server.
            </p>
            <p class="stream-timestamp">
              <strong>Resolved at</strong> {{ value.resolvedAt }}
            </p>
          </article>
        </template>
      </SuspenseSlot>

      <SuspenseSlot
        id="vue-framework-sixth"
        :promise="createSlotPromise('Vue Suspense Slot 6', 1500, '3rd')"
        :timeout-ms="5000"
      >
        <template #fallback>
          <article class="stream-card stream-card-vue stream-card-fallback">
            <div class="stream-header">
              <img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" />
              <span>Vue Suspense Slot 6</span>
            </div>
            <div class="stream-meta">
              <span>Declared 6th</span>
              <span>Expected 3rd</span>
              <span>Fallback</span>
              <span>SuspenseSlot</span>
            </div>
            <p class="stream-desc">
              Waiting for server to stream resolved markup into this slot.
            </p>
            <div class="stream-timestamp-skeleton"></div>
          </article>
        </template>
        <template #default="{ value }">
          <article class="stream-card stream-card-vue">
            <div class="stream-header">
              <img alt="Vue" height="20" src="/assets/svg/vue-logo.svg" />
              <span>{{ value.label }}</span>
            </div>
            <div class="stream-meta">
              <span>Declared 6th</span>
              <span>Resolved {{ value.resolveOrder }}</span>
              <span>{{ value.delayMs }}ms</span>
              <span>SuspenseSlot</span>
            </div>
            <p class="stream-desc">
              Authored as Vue markup and rendered to streamed HTML on the
              server.
            </p>
            <p class="stream-timestamp">
              <strong>Resolved at</strong> {{ value.resolvedAt }}
            </p>
          </article>
        </template>
      </SuspenseSlot>
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
