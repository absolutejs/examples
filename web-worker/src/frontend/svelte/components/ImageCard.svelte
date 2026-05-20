<script lang="ts">
  import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../../constants";

  let imageLoading = $state(false);
  let imageDuration = $state<number | null>(null);
  let imageLoaded = $state(false);
  let imageFileName = $state<string | null>(null);
  let originalCanvas: HTMLCanvasElement;
  let processedCanvas: HTMLCanvasElement;
  let uploadLabel: HTMLLabelElement;

  const CANVAS_W = CANVAS_WIDTH;
  const CANVAS_H = CANVAS_HEIGHT;

  function loadImageFile(file: File) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ctx = originalCanvas.getContext("2d")!;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (CANVAS_W - w) / 2, (CANVAS_H - h) / 2, w, h);
      processedCanvas.getContext("2d")!.clearRect(0, 0, CANVAS_W, CANVAS_H);
      URL.revokeObjectURL(url);
      imageLoaded = true;
      imageFileName = file.name;
      imageDuration = null;
    };
    img.src = url;
  }

  function runImageProcess() {
    if (!originalCanvas || !originalCanvas.width || !originalCanvas.height)
      return;
    const ctx = originalCanvas.getContext("2d");
    if (!ctx) return;
    imageLoading = true;
    const { width, height } = originalCanvas;
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
      if (processedCanvas) {
        const outCtx = processedCanvas.getContext("2d");
        if (outCtx) {
          const outData = new ImageData(new Uint8ClampedArray(pixels), w, h);
          outCtx.putImageData(outData, 0, 0);
        }
      }
      imageDuration = duration;
      imageLoading = false;
      worker.terminate();
    };
    worker.postMessage({ pixels: imageData.data, width, height });
  }
</script>

<div class="worker-card">
  <div class="card-title">Image Processing</div>
  <p class="card-desc">Grayscale conversion via worker on pixel data.</p>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <label
    bind:this={uploadLabel}
    class="file-upload"
    ondragover={(e: DragEvent) => {
      e.preventDefault();
      uploadLabel?.classList.add("dragover");
    }}
    ondragleave={() => uploadLabel?.classList.remove("dragover")}
    ondrop={(e: DragEvent) => {
      e.preventDefault();
      uploadLabel?.classList.remove("dragover");
      const f = e.dataTransfer?.files[0];
      if (f && f.type.startsWith("image/")) loadImageFile(f);
    }}
  >
    <input
      type="file"
      accept="image/*"
      onchange={(e) => {
        const input = e.currentTarget;
        if (input instanceof HTMLInputElement) {
          const f = input.files?.[0];
          if (f) loadImageFile(f);
        }
      }}
    />
    <span>{imageFileName ?? "Drop an image or click to upload"}</span>
  </label>
  <button
    onclick={runImageProcess}
    class:loading={imageLoading}
    disabled={imageLoading || !imageLoaded}
  >
    {imageLoading
      ? "Processing"
      : imageDuration !== null
        ? `Apply Grayscale \u2014 ${imageDuration}ms`
        : "Apply Grayscale"}
  </button>
  <div class="canvas-row" style:display={imageLoaded ? "flex" : "none"}>
    <canvas bind:this={originalCanvas} width="200" height="150"></canvas>
    <canvas bind:this={processedCanvas} width="200" height="150"></canvas>
  </div>
</div>
