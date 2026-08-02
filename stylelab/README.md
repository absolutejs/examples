# AbsoluteJS StyleLab Example

Shows AbsoluteJS Sass, SCSS, Less, and SCSS module preprocessing across React, Svelte, Vue, Angular, HTML, and HTMX routes.

## Run it

```bash
bun install
bun run dev
```

The root redirects to `/react/tailwind`. Every combination is available at
`/<framework>/<style>` where the frameworks are `react`, `svelte`, `vue`,
`angular`, `html`, and `htmx`, and the styles are `scss`, `less`, `stylus`, and
`tailwind`.

## What it demonstrates

- Global SCSS, Less, and Stylus compilation.
- Framework component styles and Vue SCSS modules.
- Tailwind CSS generation from the configured input file.
- `additionalData` variables supplied to Less and Stylus preprocessors.
- A custom PostCSS plugin that appends a visible proof property.
- The same styling pipeline across component and HTML-first routes.

## Configuration

The central setup lives in `absolute.config.ts`:

```ts
export default defineConfig({
	stylePreprocessors: {
		less: { additionalData: '@accent: #0f766e;' },
		stylus: { additionalData: 'stylusAccent = #7e22ce' }
	},
	stylesConfig: './src/frontend/styles/indexes',
	tailwind: {
		input: './src/frontend/styles/tailwind.css',
		output: 'tailwind.css'
	}
});
```

Use the matrix navigation in any rendered page to compare the generated output.
The cards and accent colors provide a quick visual check that variables, modules,
Tailwind utilities, and PostCSS transforms all reached the browser.

## Validate changes

```bash
bun run typecheck
bun run lint
```
