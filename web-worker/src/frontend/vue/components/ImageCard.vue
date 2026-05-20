<script setup lang="ts">
import { ref } from "vue";

const imageLoading = ref(false);
const imageDuration = ref<number | null>(null);
const imageLoaded = ref(false);
const imageFileName = ref<string | null>(null);
const originalCanvas = ref<HTMLCanvasElement | null>(null);
const processedCanvas = ref<HTMLCanvasElement | null>(null);
const uploadLabel = ref<HTMLLabelElement | null>(null);

const CANVAS_W = 200;
const CANVAS_H = 150;

function onImageDragOver(e: DragEvent) {
  e.preventDefault();
  uploadLabel.value?.classList.add("dragover");
}
function onImageDragLeave() {
  uploadLabel.value?.classList.remove("dragover");
}
function onImageDrop(e: DragEvent) {
  e.preventDefault();
  uploadLabel.value?.classList.remove("dragover");
  const file = e.dataTransfer?.files[0];
  if (file && file.type.startsWith("image/")) loadImageFile(file);
}
function onImageFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) loadImageFile(file);
}

function loadImageFile(file: File) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const canvas = originalCanvas.value;
    const processed = processedCanvas.value;
    if (canvas && processed) {
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h);
      processed.getContext("2d")!.clearRect(0, 0, CANVAS_W, CANVAS_H);
    }
    URL.revokeObjectURL(url);
    imageLoaded.value = true;
    imageFileName.value = file.name;
    imageDuration.value = null;
  };
  img.src = url;
}

function runImageProcess() {
  const canvas = originalCanvas.value;
  if (!canvas || !canvas.width || !canvas.height) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  imageLoading.value = true;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const worker = new Worker(
    new URL("../../workers/image.worker.ts", import.meta.url),
    { type: "module" },
  );
  worker.onmessage = (
    event: MessageEvent<{
      pixels: Uint8ClampedArray;
      width: number;
      height: number;
      duration: number;
    }>,
  ) => {
    const { pixels, width: w, height: h, duration } = event.data;
    const outCanvas = processedCanvas.value;
    if (outCanvas) {
      const outCtx = outCanvas.getContext("2d");
      if (outCtx) {
        const outData = new ImageData(new Uint8ClampedArray(pixels), w, h);
        outCtx.putImageData(outData, 0, 0);
      }
    }
    imageDuration.value = duration;
    imageLoading.value = false;
    worker.terminate();
  };
  worker.postMessage({ pixels: imageData.data, width, height });
}
</script>

<template>
  <div class="worker-card">
    <div class="card-title">Image Processing</div>
    <p class="card-desc">Grayscale conversion via worker on pixel data.</p>
    <label
      ref="uploadLabel"
      class="file-upload"
      @dragover="onImageDragOver"
      @dragleave="onImageDragLeave"
      @drop="onImageDrop"
    >
      <input type="file" accept="image/*" @change="onImageFileChange" />
      <span>{{ imageFileName ?? "Drop an image or click to upload" }}</span>
    </label>
    <button
      @click="runImageProcess"
      :class="{ loading: imageLoading }"
      :disabled="imageLoading || !imageLoaded"
    >
      {{
        imageLoading
          ? "Processing"
          : imageDuration !== null
            ? `Apply Grayscale \u2014 ${imageDuration}ms`
            : "Apply Grayscale"
      }}
    </button>
    <div class="canvas-row" v-show="imageLoaded">
      <canvas ref="originalCanvas" width="200" height="150"></canvas>
      <canvas ref="processedCanvas" width="200" height="150"></canvas>
    </div>
  </div>
</template>
