import { PERCENTAGE_FULL, PRIMES_PER_DIFFICULTY } from "../constants";

const checkPrime = (num: number) => {
  for (let idx = 2; idx * idx <= num; idx++) {
    if (num % idx === 0) return false;
  }

  return true;
};

self.onmessage = (event: MessageEvent<{ id: number; difficulty: number }>) => {
  const { id, difficulty } = event.data;
  const target = difficulty * PRIMES_PER_DIFFICULTY;
  const start = performance.now();
  let count = 0;
  let num = 1;
  let lastReport = 0;

  while (count < target) {
    num++;
    if (!checkPrime(num)) continue;
    count++;
    const percent = Math.round((count / target) * PERCENTAGE_FULL);
    if (percent <= lastReport) continue;
    lastReport = percent;
    const elapsed = Math.round(performance.now() - start);
    self.postMessage({ elapsed, id, percent });
  }

  const totalDuration = Math.round(performance.now() - start);
  self.postMessage({
    elapsed: totalDuration,
    id,
    percent: PERCENTAGE_FULL,
    totalDuration,
  });
};
