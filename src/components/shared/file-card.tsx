import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileCardProps {
  fileName: string;
  fileSize: number;
  onRemove: () => void;
}

export function FileCard({ fileName, fileSize, onRemove }: FileCardProps) {
  // Convert bytes to human readable format (KB or MB)
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-surface-200 bg-white p-4 shadow-sm animate-fade-in">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
        <FileText className="h-5 w-5 text-primary-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-700 truncate" title={fileName}>
          {fileName}
        </p>
        <p className="text-xs text-surface-400">{formatSize(fileSize)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="text-surface-400 hover:text-error-500 hover:bg-error-50"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
