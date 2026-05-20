import { ChangeDetectorRef, Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAIN_TIMER_INTERVAL_MS,
  MS_PER_SECOND,
  PARALLEL_DIFFICULTIES,
  PARALLEL_WORKER_COUNT,
  PERCENTAGE_FULL,
  STRESS_CHUNK_MS,
  STRESS_RANDOM_MAX,
  STRESS_YIELD_MS,
} from "../../constants";

@Component({
  imports: [CommonModule],
  selector: "angular-page",
  standalone: true,
  templateUrl: "../templates/angular-worker-demo.html",
})
export class AngularWorkerDemoComponent {
  // Hash
  hashResult: { hash: string; input: string } | null = null;
  hashLoading = false;

  // Prime
  primeResult: { prime: number; n: number; duration: number } | null = null;
  primeLoading = false;

  // Sort
  sortResult: {
    size: number;
    min: number;
    max: number;
    median: number;
    duration: number;
  } | null = null;
  sortLoading = false;

  // Thread Race
  racing = false;
  workerTime = 0;
  mainTime = 0;
  private timerWorker: Worker | null = null;
  private mainInterval: ReturnType<typeof setInterval> | null = null;

  // Image
  imageLoading = false;
  imageDuration: number | null = null;
  imageLoaded = false;
  imageFileName: string | null = null;

  // Parallel
  difficulties = PARALLEL_DIFFICULTIES;
  workerLabels = ["240K primes", "480K primes", "880K primes"];
  parallelLoading = false;
  parallelResetting = false;
  parallelWorkers = [
    { done: false, elapsed: 0, percent: 0 },
    { done: false, elapsed: 0, percent: 0 },
    { done: false, elapsed: 0, percent: 0 },
  ];
  private parallelWorkerRefs: Worker[] = [];

  stressing = false;

  private cdr = inject(ChangeDetectorRef);

  ngOnDestroy() {
    this.timerWorker?.terminate();
    if (this.mainInterval) clearInterval(this.mainInterval);
  }

  private CANVAS_W = CANVAS_WIDTH;
  private CANVAS_H = CANVAS_HEIGHT;

  loadImageFile(file: File) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas =
        document.querySelector<HTMLCanvasElement>("#originalCanvas");
      const processed =
        document.querySelector<HTMLCanvasElement>("#processedCanvas");
      if (canvas && processed) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, this.CANVAS_W, this.CANVAS_H);
        const scale = Math.min(
          this.CANVAS_W / img.width,
          this.CANVAS_H / img.height,
        );
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        ctx.drawImage(
          img,
          (this.CANVAS_W - scaledWidth) / 2,
          (this.CANVAS_H - scaledHeight) / 2,
          scaledWidth,
          scaledHeight,
        );
        processed
          .getContext("2d")
          ?.clearRect(0, 0, this.CANVAS_W, this.CANVAS_H);
      }
      URL.revokeObjectURL(url);
      this.imageLoaded = true;
      this.imageFileName = file.name;
      this.imageDuration = null;
      this.cdr.detectChanges();
    };
    img.src = url;
  }

  onImageFileChange(event: Event) {
    const { target } = event;
    if (target instanceof HTMLInputElement) {
      const file = target.files?.[0];
      if (file) this.loadImageFile(file);
    }
  }

  onImageDrop(event: DragEvent) {
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.classList.remove("dragover");
    }
    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith("image/")) this.loadImageFile(file);
  }

  onImageDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.classList.add("dragover");
    }
  }

  onImageDragLeave(event: DragEvent) {
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.classList.remove("dragover");
    }
  }

  startRace() {
    this.racing = true;
    this.workerTime = 0;
    this.mainTime = 0;

    const worker = new Worker(
      new URL("../../workers/timer.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (event: MessageEvent<{ elapsed: number }>) => {
      this.workerTime = event.data.elapsed;
      this.cdr.detectChanges();
    };
    worker.postMessage({ command: "start" });
    this.timerWorker = worker;

    let mainElapsed = 0;
    this.mainInterval = setInterval(() => {
      mainElapsed += MAIN_TIMER_INTERVAL_MS;
      this.mainTime = mainElapsed;
      this.cdr.detectChanges();
    }, MAIN_TIMER_INTERVAL_MS);
  }

  stopRace() {
    this.racing = false;
    this.timerWorker?.postMessage({ command: "stop" });
    this.timerWorker?.terminate();
    this.timerWorker = null;
    if (this.mainInterval) clearInterval(this.mainInterval);
    this.mainInterval = null;
  }

  stressMainThread() {
    if (this.stressing) return;
    this.stressing = true;
    const duration = 8000;
    const start = Date.now();
    const heavyChunk = () => {
      const chunkEnd = Date.now() + STRESS_CHUNK_MS;
      while (Date.now() < chunkEnd) {
        Math.sqrt(Math.random() * STRESS_RANDOM_MAX);
      }
      if (Date.now() - start < duration) {
        setTimeout(heavyChunk, STRESS_YIELD_MS);
      } else {
        this.stressing = false;
        this.cdr.detectChanges();
      }
    };
    heavyChunk();
  }

  runHash() {
    this.hashLoading = true;
    const worker = new Worker(
      new URL("../../workers/hash.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (
      event: MessageEvent<{ hash: string; input: string }>,
    ) => {
      this.hashResult = event.data;
      this.hashLoading = false;
      this.cdr.detectChanges();
      worker.terminate();
    };
    worker.postMessage({ text: "Hello, World!" });
  }

  runPrime() {
    this.primeLoading = true;
    const worker = new Worker(
      new URL("../../workers/prime.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (
      event: MessageEvent<{
        prime: number;
        n: number;
        duration: number;
      }>,
    ) => {
      this.primeResult = event.data;
      this.primeLoading = false;
      this.cdr.detectChanges();
      worker.terminate();
    };
    worker.postMessage({ n: 10000 });
  }

  runSort() {
    this.sortLoading = true;
    const worker = new Worker(
      new URL("../../workers/sort.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (
      event: MessageEvent<{
        size: number;
        min: number;
        max: number;
        median: number;
        duration: number;
      }>,
    ) => {
      this.sortResult = event.data;
      this.sortLoading = false;
      this.cdr.detectChanges();
      worker.terminate();
    };
    worker.postMessage({ size: 1000000 });
  }

  runImageProcess() {
    const canvas = document.querySelector<HTMLCanvasElement>("#originalCanvas");
    if (!canvas || !canvas.width || !canvas.height) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    this.imageLoading = true;
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
      const {
        pixels,
        width: imgWidth,
        height: imgHeight,
        duration,
      } = event.data;
      const outCtx = document
        .querySelector<HTMLCanvasElement>("#processedCanvas")
        ?.getContext("2d");
      if (outCtx) {
        const outData = new ImageData(
          new Uint8ClampedArray(pixels),
          imgWidth,
          imgHeight,
        );
        outCtx.putImageData(outData, 0, 0);
      }
      this.imageDuration = duration;
      this.imageLoading = false;
      this.cdr.detectChanges();
      worker.terminate();
    };
    worker.postMessage({ height, pixels: imageData.data, width });
  }

  runParallelRace() {
    for (const worker of this.parallelWorkerRefs) worker.terminate();
    this.parallelWorkerRefs = [];

    this.parallelResetting = true;
    this.parallelLoading = true;
    this.parallelWorkers = [
      { done: false, elapsed: 0, percent: 0 },
      { done: false, elapsed: 0, percent: 0 },
      { done: false, elapsed: 0, percent: 0 },
    ];
    this.cdr.detectChanges();

    requestAnimationFrame(() => {
      this.parallelResetting = false;
      const completedCount: { value: number } = { value: 0 };

      for (let idx = 0; idx < PARALLEL_WORKER_COUNT; idx++) {
        const worker = new Worker(
          new URL("../../workers/parallel.worker.ts", import.meta.url),
          { type: "module" },
        );
        this.parallelWorkerRefs.push(worker);
        worker.onmessage = (event) =>
          this.handleParallelWorkerMessage(worker, completedCount, event);
        worker.postMessage({ difficulty: this.difficulties[idx], id: idx });
      }
    }); // end requestAnimationFrame
  }

  private handleParallelWorkerMessage(
    worker: Worker,
    completedCount: { value: number },
    event: MessageEvent<{ id: number; percent: number; elapsed: number }>,
  ) {
    const { id, percent, elapsed } = event.data;
    const entry = this.parallelWorkers[id];
    if (entry) {
      entry.percent = percent;
      entry.elapsed = elapsed;
      entry.done = percent >= PERCENTAGE_FULL;
    }
    this.cdr.detectChanges();
    if (percent < PERCENTAGE_FULL) return;
    completedCount.value++;
    worker.terminate();
    if (completedCount.value < PARALLEL_WORKER_COUNT) return;
    this.parallelLoading = false;
    this.cdr.detectChanges();
  }

  formatTime(milliseconds: number) {
    return `${(milliseconds / MS_PER_SECOND).toFixed(1)}s`;
  }
}

export const factory = () => new AngularWorkerDemoComponent();
