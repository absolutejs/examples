<script lang="ts">
  import Nav from "../components/Nav.svelte";

  let { cssPath = undefined }: { cssPath?: string } = $props();

  type SlotData = {
    delayMs: number;
    label: string;
    resolveOrder: string;
    resolvedAt: string;
  };

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

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

  const firstPromise = createSlotPromise("Svelte Await Slot 1", 3000, "5th");
  const secondPromise = createSlotPromise("Svelte Await Slot 2", 1000, "2nd");
  const thirdPromise = createSlotPromise("Svelte Await Slot 3", 3500, "6th");
  const fourthPromise = createSlotPromise("Svelte Await Slot 4", 500, "1st");
  const fifthPromise = createSlotPromise("Svelte Await Slot 5", 2200, "4th");
  const sixthPromise = createSlotPromise("Svelte Await Slot 6", 1500, "3rd");
</script>

<Nav activeFramework="svelte" activeMode="framework" {cssPath} />

<main>
  <div class="page-title">
    <img alt="Svelte" height="32" src="/assets/svg/svelte-logo.svg" />
    <h1>Svelte Framework Primitives</h1>
    <span class="badge">Await-Shaped</span>
  </div>

  <p class="section-desc">
    This page uses real <code>#await</code> blocks. AbsoluteJS lowers them into the
    out-of-order slot transport, so the authoring model stays Svelte-native.
  </p>

  <h2 class="section-title">Framework-Shaped Slots</h2>
  <p class="section-desc">
    Six slots declared in order. Watch them resolve out of sequence &mdash; slot
    4 arrives first, then 2, 6, 5, 1, and finally 3.
  </p>

  <section class="grid">
    {#await firstPromise}
      <article class="stream-card stream-card-svelte stream-card-fallback">
        <div class="stream-header">
          <img alt="Svelte" height="20" src="/assets/svg/svelte-logo.svg" />
          <span>Svelte Await Slot 1</span>
        </div>
        <div class="stream-meta">
          <span>Declared 1st</span>
          <span>Expected 5th</span>
          <span>Fallback</span>
          <span>#await</span>
        </div>
        <p class="stream-desc">
          Waiting for server to stream resolved markup into this slot.
        </p>
        <div class="stream-timestamp-skeleton"></div>
      </article>
    {:then value}
      <article class="stream-card stream-card-svelte">
        <div class="stream-header">
          <img alt="Svelte" height="20" src="/assets/svg/svelte-logo.svg" />
          <span>{value.label}</span>
        </div>
        <div class="stream-meta">
          <span>Declared 1st</span>
          <span>Resolved {value.resolveOrder}</span>
          <span>{value.delayMs}ms</span>
          <span>#await</span>
        </div>
        <p class="stream-desc">
          Authored as Svelte markup and rendered to streamed HTML on the server.
        </p>
        <p class="stream-timestamp">
          <strong>Resolved at</strong>
          {value.resolvedAt}
        </p>
      </article>
    {/await}

    {#await secondPromise}
      <article class="stream-card stream-card-svelte stream-card-fallback">
        <div class="stream-header">
          <img alt="Svelte" height="20" src="/assets/svg/svelte-logo.svg" />
          <span>Svelte Await Slot 2</span>
        </div>
        <div class="stream-meta">
          <span>Declared 2nd</span>
          <span>Expected 2nd</span>
          <span>Fallback</span>
          <span>#await</span>
        </div>
        <p class="stream-desc">
          Waiting for server to stream resolved markup into this slot.
        </p>
        <div class="stream-timestamp-skeleton"></div>
      </article>
    {:then value}
      <article class="stream-card stream-card-svelte">
        <div class="stream-header">
          <img alt="Svelte" height="20" src="/assets/svg/svelte-logo.svg" />
          <span>{value.label}</span>
        </div>
        <div class="stream-meta">
          <span>Declared 2nd</span>
          <span>Resolved {value.resolveOrder}</span>
          <span>{value.delayMs}ms</span>
          <span>#await</span>
        </div>
        <p class="stream-desc">
          Authored as Svelte markup and rendered to streamed HTML on the server.
        </p>
        <p class="stream-timestamp">
          <strong>Resolved at</strong>
          {value.resolvedAt}
        </p>
      </article>
    {/await}

    {#await thirdPromise}
      <article class="stream-card stream-card-svelte stream-card-fallback">
        <div class="stream-header">
          <img alt="Svelte" height="20" src="/assets/svg/svelte-logo.svg" />
          <span>Svelte Await Slot 3</span>
        </div>
        <div class="stream-meta">
          <span>Declared 3rd</span>
          <span>Expected 6th</span>
          <span>Fallback</span>
          <span>#await</span>
        </div>
        <p class="stream-desc">
          Waiting for server to stream resolved markup into this slot.
        </p>
        <div class="stream-timestamp-skeleton"></div>
      </article>
    {:then value}
      <article class="stream-card stream-card-svelte">
        <div class="stream-header">
          <img alt="Svelte" height="20" src="/assets/svg/svelte-logo.svg" />
          <span>{value.label}</span>
        </div>
        <div class="stream-meta">
          <span>Declared 3rd</span>
          <span>Resolved {value.resolveOrder}</span>
          <span>{value.delayMs}ms</span>
          <span>#await</span>
        </div>
        <p class="stream-desc">
          Authored as Svelte markup and rendered to streamed HTML on the server.
        </p>
        <p class="stream-timestamp">
          <strong>Resolved at</strong>
          {value.resolvedAt}
        </p>
      </article>
    {/await}

    {#await fourthPromise}
      <article class="stream-card stream-card-svelte stream-card-fallback">
        <div class="stream-header">
          <img alt="Svelte" height="20" src="/assets/svg/svelte-logo.svg" />
          <span>Svelte Await Slot 4</span>
        </div>
        <div class="stream-meta">
          <span>Declared 4th</span>
          <span>Expected 1st</span>
          <span>Fallback</span>
          <span>#await</span>
        </div>
        <p class="stream-desc">
          Waiting for server to stream resolved markup into this slot.
        </p>
        <div class="stream-timestamp-skeleton"></div>
      </article>
    {:then value}
      <article class="stream-card stream-card-svelte">
        <div class="stream-header">
          <img alt="Svelte" height="20" src="/assets/svg/svelte-logo.svg" />
          <span>{value.label}</span>
        </div>
        <div class="stream-meta">
          <span>Declared 4th</span>
          <span>Resolved {value.resolveOrder}</span>
          <span>{value.delayMs}ms</span>
          <span>#await</span>
        </div>
        <p class="stream-desc">
          Authored as Svelte markup and rendered to streamed HTML on the server.
        </p>
        <p class="stream-timestamp">
          <strong>Resolved at</strong>
          {value.resolvedAt}
        </p>
      </article>
    {/await}

    {#await fifthPromise}
      <article class="stream-card stream-card-svelte stream-card-fallback">
        <div class="stream-header">
          <img alt="Svelte" height="20" src="/assets/svg/svelte-logo.svg" />
          <span>Svelte Await Slot 5</span>
        </div>
        <div class="stream-meta">
          <span>Declared 5th</span>
          <span>Expected 4th</span>
          <span>Fallback</span>
          <span>#await</span>
        </div>
        <p class="stream-desc">
          Waiting for server to stream resolved markup into this slot.
        </p>
        <div class="stream-timestamp-skeleton"></div>
      </article>
    {:then value}
      <article class="stream-card stream-card-svelte">
        <div class="stream-header">
          <img alt="Svelte" height="20" src="/assets/svg/svelte-logo.svg" />
          <span>{value.label}</span>
        </div>
        <div class="stream-meta">
          <span>Declared 5th</span>
          <span>Resolved {value.resolveOrder}</span>
          <span>{value.delayMs}ms</span>
          <span>#await</span>
        </div>
        <p class="stream-desc">
          Authored as Svelte markup and rendered to streamed HTML on the server.
        </p>
        <p class="stream-timestamp">
          <strong>Resolved at</strong>
          {value.resolvedAt}
        </p>
      </article>
    {/await}

    {#await sixthPromise}
      <article class="stream-card stream-card-svelte stream-card-fallback">
        <div class="stream-header">
          <img alt="Svelte" height="20" src="/assets/svg/svelte-logo.svg" />
          <span>Svelte Await Slot 6</span>
        </div>
        <div class="stream-meta">
          <span>Declared 6th</span>
          <span>Expected 3rd</span>
          <span>Fallback</span>
          <span>#await</span>
        </div>
        <p class="stream-desc">
          Waiting for server to stream resolved markup into this slot.
        </p>
        <div class="stream-timestamp-skeleton"></div>
      </article>
    {:then value}
      <article class="stream-card stream-card-svelte">
        <div class="stream-header">
          <img alt="Svelte" height="20" src="/assets/svg/svelte-logo.svg" />
          <span>{value.label}</span>
        </div>
        <div class="stream-meta">
          <span>Declared 6th</span>
          <span>Resolved {value.resolveOrder}</span>
          <span>{value.delayMs}ms</span>
          <span>#await</span>
        </div>
        <p class="stream-desc">
          Authored as Svelte markup and rendered to streamed HTML on the server.
        </p>
        <p class="stream-timestamp">
          <strong>Resolved at</strong>
          {value.resolvedAt}
        </p>
      </article>
    {/await}
  </section>

  <p class="footer">
    <img alt="" src="/assets/png/absolutejs-temp.png" />
    Powered by
    <a href="https://absolutejs.com" rel="noopener noreferrer" target="_blank">
      AbsoluteJS
    </a>
  </p>
</main>
