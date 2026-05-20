import { SORT_RANDOM_MAX } from "../constants";

self.onmessage = (event: MessageEvent<{ size: number }>) => {
  const start = performance.now();
  const { size } = event.data;
  const arr = Array.from(
    { length: size },
    () => Math.random() * SORT_RANDOM_MAX,
  );
  arr.sort((left, right) => left - right);
  const duration = Math.round(performance.now() - start);
  self.postMessage({
    duration,
    max: Math.round(arr[arr.length - 1]),
    median: Math.round(arr[Math.floor(arr.length / 2)]),
    min: Math.round(arr[0]),
    size,
  });
};
