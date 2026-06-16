// Scripted product demo for the sync example. Drives the React page at `/`
// (the same surface the Playwright suite exercises) through @absolutejs/demo's
// runner + playwright session, producing a recording artifact under
// `node_modules/.cache/demo-recordings` plus a manifest under
// `node_modules/.cache/demo-manifest.json`.
//
// Run against an already-running `absolute start` (or `absolute dev`):
//   PORT=3100 bun run start &       # in one shell
//   PORT=3100 bun run demo          # in another
// The script defaults to PORT=3100 to match this example's convention (a
// non-sync local server tends to squat :3000).
import { mkdir } from "node:fs/promises";
import {
	createDemoRunner,
	writeDemoManifest,
	demoScript,
	goto,
	fill,
	press,
	waitFor,
} from "@absolutejs/demo";
import { createPlaywrightDemoSession } from "@absolutejs/demo/playwright";

const port = process.env.PORT ?? "3100";
const baseURL = `http://localhost:${port}`;
const recordingsDir = "node_modules/.cache/demo-recordings";
const manifestPath = "node_modules/.cache/demo-manifest.json";

await mkdir(recordingsDir, { recursive: true });

const script = demoScript({
	id: "sync-react-add-task",
	steps: [
		goto(baseURL, { name: "open the React page" }),
		waitFor('input[aria-label="New task"]', { name: "wait for input" }),
		fill(
			'input[aria-label="New task"]',
			`Demo task ${Date.now()}`,
			{ name: "type a task" },
		),
		press('input[aria-label="New task"]', "Enter", {
			name: "submit it",
		}),
		waitFor(".task-item", { name: "see it land in the list" }),
	],
});

const session = await createPlaywrightDemoSession({
	headless: process.env.HEADED ? false : true,
	recordVideoDir: recordingsDir,
});

const runner = createDemoRunner({
	browser: session.browserDriver,
	annotations: session.annotations,
	onEvent: (event) => {
		if (event.type === "step.started") {
			console.log(`  ▸ ${event.name ?? `step ${event.index}`}`);
		}
		if (event.type === "run.failed") {
			console.error(`  ✗ run failed: ${event.error.message}`);
		}
	},
});

console.log(`▶ running demo against ${baseURL}`);
const report = await runner.run(script);
const recording = await session.close(`${script.id}-recording`);
if (recording) report.artifacts.push(recording);

await writeDemoManifest(report, manifestPath);

console.log(`✓ demo finished in ${report.durationMs}ms`);
console.log(`  artifacts: ${report.artifacts.length}`);
for (const artifact of report.artifacts) {
	console.log(`    - ${artifact.kind}: ${artifact.path ?? artifact.id}`);
}
console.log(`  manifest: ${manifestPath}`);
