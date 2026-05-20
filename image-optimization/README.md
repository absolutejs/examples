# AbsoluteJS Image Optimization Example

This project showcases the AbsoluteJS `Image` component across four frameworks — React, Vue, Svelte, and Angular — plus the `data-optimized` attribute for plain HTML and HTMX. Each demo page renders the same set of images so you can compare the developer experience and output across all six approaches.

## Frameworks

| Framework | Component / Attribute | Import |
|-----------|----------------------|--------|
| React | `<Image>` | `import { Image } from "@absolutejs/absolute/react/components"` |
| Vue | `<Image>` | `import Image from "@absolutejs/absolute/vue/components/Image.vue"` |
| Svelte | `<Image>` | `import Image from "@absolutejs/absolute/svelte/components/Image.svelte"` |
| Angular | `<abs-image>` | `import { ImageComponent } from "@absolutejs/absolute/angular/components"` |
| HTML | `<img data-optimized>` | N/A — uses a build-time attribute on standard `<img>` tags |
| HTMX | `<img data-optimized>` | N/A — same build-time attribute, works with HTMX partial swaps |

## Image Component Props

All four framework components share the same prop interface:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | — | **Required.** Image source path (e.g. `/assets/jpg/landscape.jpg`) |
| `alt` | `string` | — | **Required.** Alt text for accessibility |
| `width` | `number` | — | Intrinsic image width in pixels |
| `height` | `number` | — | Intrinsic image height in pixels |
| `sizes` | `string` | — | Responsive sizes descriptor (e.g. `(max-width: 640px) 100vw, 340px`) |
| `priority` | `boolean` | `false` | Adds a preload link, sets `loading="eager"` and `fetchPriority="high"` |
| `fill` | `boolean` | `false` | Image fills its parent container with `object-fit: cover` |
| `unoptimized` | `boolean` | `false` | Bypasses the optimization endpoint and serves the original file |
| `quality` | `number` | `75` | Output quality (0–100) for lossy formats |
| `loading` | `string` | `"lazy"` | Loading strategy — `"lazy"` or `"eager"` |
| `fetchPriority` | `string` | `"auto"` | Fetch priority hint — `"auto"`, `"high"`, or `"low"` |
| `placeholder` | `string` | — | Placeholder mode — `"blur"`, `"empty"`, or a data URL |
| `blurDataURL` | `string` | — | Explicit base64 data URL for blur placeholder |
| `loader` | `function` | — | Custom function to generate the image URL |
| `overrideSrc` | `string` | — | Override the computed `src` on the rendered `<img>` |
| `className` | `string` | — | CSS class name |
| `style` | `object` | — | Inline styles |
| `crossOrigin` | `string` | — | CORS attribute |
| `referrerPolicy` | `string` | — | Referrer policy |
| `onLoad` | `function` | — | Load event callback |
| `onError` | `function` | — | Error event callback |

## HTML / HTMX: `data-optimized`

For plain HTML and HTMX pages, add the `data-optimized` attribute to any `<img>` tag. At build time AbsoluteJS will:

- Rewrite `src` to the optimization endpoint (`/_absolute/image`)
- Generate a responsive `srcset` with all configured sizes
- Add `loading="lazy"` and `decoding="async"` automatically
- Serve AVIF/WebP variants based on browser support

```html
<img
  data-optimized
  src="/assets/jpg/landscape.jpg"
  width="1200"
  height="800"
  sizes="(max-width: 640px) 100vw, 340px"
  alt="Landscape photo"
/>
```

To skip optimization for a specific image, omit the `data-optimized` attribute.

## Configuration

Image optimization is configured in `absolute.config.ts`:

```ts
import { defineConfig } from "@absolutejs/absolute";

export default defineConfig({
  images: {
    formats: ["avif", "webp"],
  },

  // Framework source directories
  angularDirectory: "./src/frontend/angular",
  reactDirectory: "./src/frontend/react",
  svelteDirectory: "./src/frontend/svelte",
  vueDirectory: "./src/frontend/vue",
  htmlDirectory: "./src/frontend/html",
  htmxDirectory: "./src/frontend/htmx",

  assetsDirectory: "./src/backend/assets",
  stylesConfig: "./src/frontend/styles/indexes",
});
```

### `images` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `formats` | `string[]` | `["webp"]` | Output formats to generate (e.g. `["avif", "webp"]`) |

The optimization endpoint (`/_absolute/image`) accepts these query parameters at runtime:

| Parameter | Description |
|-----------|-------------|
| `url` | Source image path |
| `w` | Target width |
| `q` | Quality (0–100) |

### Built-in defaults

- **Device sizes:** 640, 750, 828, 1080, 1200, 1920, 2048, 3840
- **Image sizes:** 16, 32, 48, 64, 96, 128, 256, 384
- **Default quality:** 75

## Demo Pages

Each framework renders the same set of examples:

1. **Responsive images** — `width`, `height`, and `sizes` for automatic srcset
2. **Priority loading** — `priority` flag for above-the-fold images
3. **Fill mode** — `fill` flag to cover a parent container
4. **Unoptimized** — `unoptimized` flag to bypass processing

## Getting Started

```bash
bun install
bun run dev
```

## Testing

```bash
bun run test
```

Runs Playwright end-to-end tests that verify image optimization output across all frameworks.
