/* eslint-disable no-magic-numbers */
const ENDPOINT = "/_absolute/image";
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
const IMAGE_SIZES = [16, 32, 48, 64, 96, 128, 256, 384];

export const DEFAULT_QUALITY = 75;

export const buildOptimizedUrl = (
  src: string,
  width: number,
  quality: number,
) => `${ENDPOINT}?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;

const allSizes = [...DEVICE_SIZES, ...IMAGE_SIZES].sort(
  (left, right) => left - right,
);

const snapUp = (target: number) => {
  for (const size of allSizes) {
    if (size >= target) return size;
  }

  return allSizes[allSizes.length - 1] ?? target;
};

export const generateBlurSvg = (base64Thumbnail: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320"><filter id="b" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="20"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 100 -1"/></filter><image filter="url(#b)" x="0" y="0" width="100%" height="100%" href="${base64Thumbnail}"/></svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};
export const generateSrcSet = (
  src: string,
  width: number | undefined,
  sizes: string | undefined,
) => {
  const quality = DEFAULT_QUALITY;

  if (sizes) {
    return allSizes
      .map((w) => `${buildOptimizedUrl(src, w, quality)} ${w}w`)
      .join(", ");
  }

  if (width) {
    const w1x = snapUp(width);
    const w2x = snapUp(width * 2);

    return `${buildOptimizedUrl(src, w1x, quality)} 1x, ${buildOptimizedUrl(src, w2x, quality)} 2x`;
  }

  return DEVICE_SIZES.map(
    (w) => `${buildOptimizedUrl(src, w, quality)} ${w}w`,
  ).join(", ");
};
