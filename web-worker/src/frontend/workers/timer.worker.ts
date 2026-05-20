import { TIMER_POLL_INTERVAL_MS } from "../constants";

let interval: ReturnType<typeof setInterval> | null = null;
let startTime = 0;
let running = false;

self.onmessage = (event: MessageEvent<{ command: string }>) => {
  const { command } = event.data;
  if (command === "start") {
    if (running) return;
    running = true;
    startTime = performance.now();
    interval = setInterval(() => {
      const elapsed = Math.round(performance.now() - startTime);
      self.postMessage({ elapsed, running: true });
    }, TIMER_POLL_INTERVAL_MS);
  } else if (command === "pause") {
    running = false;
    if (interval) clearInterval(interval);
    interval = null;
    const elapsed = Math.round(performance.now() - startTime);
    self.postMessage({ elapsed, running: false });
  } else if (command === "resume") {
    if (running) return;
    running = true;
    interval = setInterval(() => {
      const elapsed = Math.round(performance.now() - startTime);
      self.postMessage({ elapsed, running: true });
    }, TIMER_POLL_INTERVAL_MS);
  } else if (command === "stop") {
    running = false;
    if (interval) clearInterval(interval);
    interval = null;
    startTime = 0;
    self.postMessage({ elapsed: 0, running: false });
  }
};
