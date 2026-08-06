import { FileUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE_LABEL } from "@/lib/file-constants";

interface FileDropZoneProps {
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FileDropZone({
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  inputRef,
  onChange,
}: FileDropZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 transition-all duration-200",
        isDragOver
          ? "border-primary-500 bg-primary-50/50 shadow-inner"
          : "border-surface-300 bg-surface-50/50 hover:border-primary-400 hover:bg-primary-50/30"
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-110",
          isDragOver ? "bg-primary-200" : "bg-primary-100"
        )}
      >
        <FileUp className="h-8 w-8 text-primary-500" />
      </div>
      <p className="mb-1 text-sm font-semibold text-surface-700">
        Drop your resume here, or{" "}
        <span className="text-primary-600 underline underline-offset-2">
          browse files
        </span>
      </p>
      <p className="text-xs text-surface-400">
        Supports {ACCEPTED_EXTENSIONS.join(", ")} — Max {MAX_FILE_SIZE_LABEL}
      </p>

      <input
        type="file"
        ref={inputRef}
        onChange={onChange}
        className="hidden"
        accept={Object.keys(ACCEPTED_EXTENSIONS).join(",")}
        id="resume-upload-input"
      />
    </div>
  );
}
