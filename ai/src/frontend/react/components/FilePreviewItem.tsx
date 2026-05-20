type PendingFile = {
  data: string;
  media_type:
    | "image/png"
    | "image/jpeg"
    | "image/gif"
    | "image/webp"
    | "application/pdf";
  name: string;
  preview: string;
};

type FilePreviewItemProps = {
  file: PendingFile;
  onRemove: () => void;
};

export const FilePreviewItem = ({ file, onRemove }: FilePreviewItemProps) => (
  <div className="file-preview">
    {file.media_type === "application/pdf" ? (
      <PdfThumbnail name={file.name} />
    ) : (
      <img alt={file.name} src={file.preview} />
    )}
    <button className="file-preview-remove" onClick={onRemove} type="button">
      <svg
        fill="none"
        height="10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="10"
      >
        <line x1="18" x2="6" y1="6" y2="18" />
        <line x1="6" x2="18" y1="6" y2="18" />
      </svg>
    </button>
  </div>
);

const PdfThumbnail = ({ name }: { name: string }) => (
  <div className="file-preview-pdf" title={name}>
    <svg
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="24"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
    <span className="file-preview-pdf-label">PDF</span>
  </div>
);
