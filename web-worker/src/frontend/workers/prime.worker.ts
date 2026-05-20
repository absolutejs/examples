const checkPrime = (num: number) => {
  for (let idx = 2; idx * idx <= num; idx++) {
    if (num % idx === 0) return false;
  }

  return true;
};

self.onmessage = (event: MessageEvent<{ n: number }>) => {
  const start = performance.now();
  const { n } = event.data;
  let count = 0;
  let num = 1;
  while (count < n) {
    num++;
    if (checkPrime(num)) count++;
  }
  const duration = Math.round(performance.now() - start);
  self.postMessage({ duration, n, prime: num });
};
