import { type RefObject, useRef } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../../constants";

export type ImageCardProps = {
  loading: boolean;
  duration: number | null;
  imageLoaded: boolean;
  imageFileName: string | null;
  originalCanvasRef: RefObject<HTMLCanvasElement | null>;
  processedCanvasRef: RefObject<HTMLCanvasElement | null>;
  onRun: () => void;
  onFileLoad: (file: File) => void;
};

export const ImageCard = ({
  loading,
  duration,
  imageLoaded,
  imageFileName,
  originalCanvasRef,
  processedCanvasRef,
  onRun,
  onFileLoad,
}: ImageCardProps) => {
  const uploadRef = useRef<HTMLLabelElement>(null);

  return (
    <div className="worker-card">
      <div className="card-title">Image Processing</div>
      <p className="card-desc">
        Grayscale conversion via worker on pixel data.
      </p>
      <label
        className="file-upload"
        onDragLeave={() => uploadRef.current?.classList.remove("dragover")}
        onDragOver={(event) => {
          event.preventDefault();
          uploadRef.current?.classList.add("dragover");
        }}
        onDrop={(event) => {
          event.preventDefault();
          uploadRef.current?.classList.remove("dragover");
          const file = event.dataTransfer?.files[0];
          if (file && file.type.startsWith("image/")) onFileLoad(file);
        }}
        ref={uploadRef}
      >
        <input
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFileLoad(file);
          }}
          type="file"
        />
        <span>{imageFileName ?? "Drop an image or click to upload"}</span>
      </label>
      <button
        className={loading ? "loading" : ""}
        disabled={loading || !imageLoaded}
        onClick={onRun}
      >
        {loading && "Processing"}
        {!loading &&
          (duration !== null
            ? `Apply Grayscale \u2014 ${duration}ms`
            : "Apply Grayscale")}
      </button>
      <div
        className="canvas-row"
        style={imageLoaded ? {} : { display: "none" }}
      >
        <canvas
          height={CANVAS_HEIGHT}
          ref={originalCanvasRef}
          width={CANVAS_WIDTH}
        />
        <canvas
          height={CANVAS_HEIGHT}
          ref={processedCanvasRef}
          width={CANVAS_WIDTH}
        />
      </div>
    </div>
  );
};
