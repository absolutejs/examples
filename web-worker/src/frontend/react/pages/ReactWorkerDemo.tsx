import { useCallback, useRef, useState } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAIN_TIMER_INTERVAL_MS,
  MS_PER_SECOND,
  PARALLEL_DIFFICULTIES,
  PARALLEL_WORKER_COUNT,
  PERCENTAGE_FULL,
  RACE_BAR_MAX_MS,
  STRESS_CHUNK_MS,
  STRESS_RANDOM_MAX,
  STRESS_YIELD_MS,
} from "../../constants";
import { HashCard } from "../components/HashCard";
import { Head } from "../components/Head";
import { ImageCard } from "../components/ImageCard";
import { Nav } from "../components/Nav";
import {
  type ParallelWorkerState,
  ParallelCard,
} from "../components/ParallelCard";
import { PrimeCard } from "../components/PrimeCard";
import { SortCard } from "../components/SortCard";
import { ThreadRaceCard } from "../components/ThreadRaceCard";

type WorkerDemoProps = {
  cssPath?: string;
};

const WorkerDemoApp = () => {
  // Thread Race
  const [racing, setRacing] = useState(false);
  const [workerTime, setWorkerTime] = useState(0);
  const [mainTime, setMainTime] = useState(0);
  const [stressing, setStressing] = useState(false);
  const timerWorkerRef = useRef<Worker | null>(null);
  const mainIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mainTimeRef = useRef(0);

  const [imageLoading, setImageLoading] = useState(false);
  const [imageDuration, setImageDuration] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [parallelLoading, setParallelLoading] = useState(false);
  const [parallelResetting, setParallelResetting] = useState(false);
  const [parallelWorkers, setParallelWorkers] = useState<ParallelWorkerState[]>(
    [
      { done: false, elapsed: 0, percent: 0 },
      { done: false, elapsed: 0, percent: 0 },
      { done: false, elapsed: 0, percent: 0 },
    ],
  );

  const CANVAS_W = CANVAS_WIDTH;
  const CANVAS_H = CANVAS_HEIGHT;

  const loadImageFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = originalCanvasRef.current;
      const processed = processedCanvasRef.current;
      if (canvas && processed) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        ctx.drawImage(
          img,
          (CANVAS_W - scaledWidth) / 2,
          (CANVAS_H - scaledHeight) / 2,
          scaledWidth,
          scaledHeight,
        );
        processed.getContext("2d")?.clearRect(0, 0, CANVAS_W, CANVAS_H);
      }
      URL.revokeObjectURL(url);
      setImageLoaded(true);
      setImageFileName(file.name);
      setImageDuration(null);
    };
    img.src = url;
  }, []);

  const workerBarRef = useRef<HTMLDivElement>(null);
  const workerTimeRef = useRef<HTMLSpanElement>(null);
  const mainBarRef = useRef<HTMLDivElement>(null);
  const mainTimeLabelRef = useRef<HTMLSpanElement>(null);

  const startRace = useCallback(() => {
    setRacing(true);
    setWorkerTime(0);
    setMainTime(0);
    mainTimeRef.current = 0;

    // Start worker timer — update DOM directly for smoothest visual
    const worker = new Worker(
      new URL("../../workers/timer.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (event: MessageEvent<{ elapsed: number }>) => {
      const { elapsed } = event.data;
      setWorkerTime(elapsed);
      // Direct DOM update bypasses React batching
      if (workerBarRef.current)
        workerBarRef.current.style.width = `${Math.min((elapsed / RACE_BAR_MAX_MS) * PERCENTAGE_FULL, PERCENTAGE_FULL)}%`;
      if (workerTimeRef.current)
        workerTimeRef.current.textContent = `${(elapsed / MS_PER_SECOND).toFixed(1)}s`;
    };
    worker.postMessage({ command: "start" });
    timerWorkerRef.current = worker;

    // Main thread timer — also direct DOM update
    let mainElapsed = 0;
    mainIntervalRef.current = setInterval(() => {
      mainElapsed += MAIN_TIMER_INTERVAL_MS;
      mainTimeRef.current = mainElapsed;
      setMainTime(mainElapsed);
      if (mainBarRef.current)
        mainBarRef.current.style.width = `${Math.min((mainElapsed / RACE_BAR_MAX_MS) * PERCENTAGE_FULL, PERCENTAGE_FULL)}%`;
      if (mainTimeLabelRef.current)
        mainTimeLabelRef.current.textContent = `${(mainElapsed / MS_PER_SECOND).toFixed(1)}s`;
    }, MAIN_TIMER_INTERVAL_MS);
  }, []);

  const stopRace = useCallback(() => {
    setRacing(false);
    timerWorkerRef.current?.postMessage({ command: "stop" });
    timerWorkerRef.current?.terminate();
    timerWorkerRef.current = null;
    if (mainIntervalRef.current) clearInterval(mainIntervalRef.current);
    mainIntervalRef.current = null;
  }, []);

  const stressMainThread = useCallback(() => {
    setStressing(true);
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
        setStressing(false);
      }
    };
    heavyChunk();
  }, []);

  const runImageProcess = useCallback(() => {
    const canvas = originalCanvasRef.current;
    if (!canvas || !canvas.width || !canvas.height) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setImageLoading(true);
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
      const outCtx = processedCanvasRef.current?.getContext("2d");
      if (outCtx) {
        const outData = new ImageData(
          new Uint8ClampedArray(pixels),
          imgWidth,
          imgHeight,
        );
        outCtx.putImageData(outData, 0, 0);
      }
      setImageDuration(duration);
      setImageLoading(false);
      worker.terminate();
    };
    worker.postMessage({ height, pixels: imageData.data, width });
  }, []);

  const difficulties = PARALLEL_DIFFICULTIES;

  const activeWorkersRef = useRef<Worker[]>([]);

  const runParallelRace = useCallback(() => {
    // Terminate any workers still running from a previous race
    activeWorkersRef.current.forEach((worker) => worker.terminate());
    activeWorkersRef.current = [];

    // Reset progress instantly (no CSS transition)
    setParallelResetting(true);
    setParallelWorkers([
      { done: false, elapsed: 0, percent: 0 },
      { done: false, elapsed: 0, percent: 0 },
      { done: false, elapsed: 0, percent: 0 },
    ]);
    setParallelLoading(true);

    // Re-enable transitions after a frame, then start workers
    requestAnimationFrame(() => {
      setParallelResetting(false);

      const completedCount: { value: number } = { value: 0 };
      const workers: Worker[] = [];

      const onMessage = (
        targetWorker: Worker,
        event: MessageEvent<{ id: number; percent: number; elapsed: number }>,
      ) => {
        const { id, percent, elapsed } = event.data;
        setParallelWorkers((prev) => {
          const next = [...prev];
          const entry = next[id];
          if (entry) {
            next[id] = { done: percent >= PERCENTAGE_FULL, elapsed, percent };
          }

          return next;
        });
        if (percent < PERCENTAGE_FULL) return;
        completedCount.value++;
        targetWorker.terminate();
        if (completedCount.value >= PARALLEL_WORKER_COUNT)
          setParallelLoading(false);
      };

      for (let idx = 0; idx < PARALLEL_WORKER_COUNT; idx++) {
        const worker = new Worker(
          new URL("../../workers/parallel.worker.ts", import.meta.url),
          { type: "module" },
        );
        workers.push(worker);
        worker.onmessage = (event) => onMessage(worker, event);
        worker.postMessage({ difficulty: difficulties[idx], id: idx });
      }
      activeWorkersRef.current = workers;
    }); // end requestAnimationFrame
  }, []);

  const formatTime = (milliseconds: number) =>
    `${(milliseconds / MS_PER_SECOND).toFixed(1)}s`;

  return (
    <main>
      <div className="page-title">
        <img alt="React" height={32} src="/assets/svg/react.svg" />
        <h1>React</h1>
      </div>

      <div className="worker-cards">
        <HashCard />
        <PrimeCard />
        <SortCard />
        <ThreadRaceCard
          formatTime={formatTime}
          mainBarRef={mainBarRef}
          mainTime={mainTime}
          mainTimeLabelRef={mainTimeLabelRef}
          onStart={startRace}
          onStop={stopRace}
          onStress={stressMainThread}
          racing={racing}
          stressing={stressing}
          workerBarRef={workerBarRef}
          workerTime={workerTime}
          workerTimeRef={workerTimeRef}
        />
        <ImageCard
          duration={imageDuration}
          imageFileName={imageFileName}
          imageLoaded={imageLoaded}
          loading={imageLoading}
          onFileLoad={loadImageFile}
          onRun={runImageProcess}
          originalCanvasRef={originalCanvasRef}
          processedCanvasRef={processedCanvasRef}
        />
        <ParallelCard
          loading={parallelLoading}
          onRun={runParallelRace}
          resetting={parallelResetting}
          workers={parallelWorkers}
        />
      </div>

      <p className="footer">
        <img alt="" src="/assets/png/absolutejs-temp.png" />
        Powered by{" "}
        <a
          href="https://absolutejs.com"
          rel="noopener noreferrer"
          target="_blank"
        >
          AbsoluteJS
        </a>
      </p>
    </main>
  );
};

export const ReactWorkerDemo = ({ cssPath }: WorkerDemoProps) => (
  <html lang="en">
    <Head cssPath={cssPath} />
    <body>
      <Nav />
      <WorkerDemoApp />
    </body>
  </html>
);
