import { RGB_CHANNEL_COUNT, RGBA_STRIDE } from "../constants";

self.onmessage = (
  event: MessageEvent<{
    pixels: Uint8ClampedArray;
    width: number;
    height: number;
  }>,
) => {
  const { pixels, width, height } = event.data;
  const start = performance.now();
  const output = new Uint8ClampedArray(pixels.length);
  for (let idx = 0; idx < pixels.length; idx += RGBA_STRIDE) {
    const avg =
      (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / RGB_CHANNEL_COUNT;
    output[idx] = avg;
    output[idx + 1] = avg;
    output[idx + 2] = avg;
    output[idx + RGB_CHANNEL_COUNT] = pixels[idx + RGB_CHANNEL_COUNT] ?? 0;
  }
  const duration = Math.round(performance.now() - start);
  self.postMessage(
    { duration, height, pixels: output, width },
    { transfer: [output.buffer] },
  );
};
