# AbsoluteJS Error Boundaries Example

A demonstration of AbsoluteJS's convention-based error boundary system across **React**, **Vue**, **Svelte**, and **Angular** — all running in a single project with server-side rendering.

## What This Shows

AbsoluteJS uses a file-naming convention to automatically handle errors during SSR:

| Convention File | Purpose |
|---|---|
| `error.{tsx,vue,svelte,ts}` | Default error boundary for a framework |
| `PageName.error.tsx` | Page-specific error boundary (overrides default) |
| `not-found.{tsx,vue,svelte,ts}` | 404 fallback page |
| `loading.{tsx,vue,svelte,ts}` | Loading state fallback — **coming soon** |

When a component throws during server-side rendering, AbsoluteJS catches the error and renders the matching error boundary with the error details.

## Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/react` | React page (renders normally) |
| `/broken-react` | React page that throws an error |
| `/vue` | Vue page (renders normally) |
| `/broken-vue` | Vue page that throws an error |
| `/svelte` | Svelte page (renders normally) |
| `/broken-svelte` | Svelte page that throws an error |
| `/angular` | Angular page (renders normally) |
| `/broken-angular` | Angular page that throws an error |

## Getting Started

```bash
# install dependencies
npm install

# start the dev server
npm run dev
```

## How It Works

### Error Convention Files

Each framework has its own `error` convention file that receives the thrown error as a prop:

**React** — `error.tsx`
```tsx
export default function ErrorPage({ error }: { error: { message: string; stack?: string } }) {
  return <div>{error.message}</div>;
}
```

**Vue** — `error.vue`
```vue
<script setup lang="ts">
const { error } = defineProps<{ error: { message: string; stack?: string } }>();
</script>
<template>
  <div>{{ error.message }}</div>
</template>
```

**Svelte** — `error.svelte`
```svelte
<script lang="ts">
  let { error }: { error: { message: string; stack?: string } } = $props();
</script>
<div>{error.message}</div>
```

**Angular** — `error.ts`
```ts
export function renderError(error: { message: string; stack?: string }): string {
  return `<div>${error.message}</div>`;
}
```

### Page-Specific Overrides

Name an error file after a page to override the default for that specific route:

```
pages/
  ReactHome.tsx
  ReactHome.error.tsx   ← used only when ReactHome throws
  error.tsx             ← used for all other React pages
```

### Loading Convention (Coming Soon)

Loading state convention files will follow the same pattern, providing fallback UI while pages are loading during SSR streaming:

```
pages/
  loading.tsx           ← default loading fallback
  PageName.loading.tsx  ← page-specific loading fallback
```

## Tech Stack

- [AbsoluteJS](https://absolutejs.com) — full-stack framework
- [Elysia](https://elysiajs.com) — backend server
- React 19, Vue 3, Svelte 5, Angular 21
- TypeScript
