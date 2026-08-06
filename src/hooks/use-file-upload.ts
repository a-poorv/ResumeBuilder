import { useState, useCallback, useRef } from "react";
import {
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
} from "@/lib/file-constants";

export interface FileError {
  fileName: string;
  message: string;
}

export interface UseFileUploadReturn {
  /** The currently held file, if any. */
  file: File | null;
  /** Validation error from the most recent attempt, if any. */
  error: FileError | null;
  /** Whether a drag is currently over the drop zone. */
  isDragOver: boolean;
  /** Ref to attach to the hidden `<input type="file">`. */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Handle a native `change` event from the file input. */
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handle `dragenter` / `dragover` on the drop zone. */
  handleDragOver: (e: React.DragEvent) => void;
  /** Handle `dragleave` on the drop zone. */
  handleDragLeave: (e: React.DragEvent) => void;
  /** Handle `drop` on the drop zone. */
  handleDrop: (e: React.DragEvent) => void;
  /** Programmatically open the file picker. */
  openFilePicker: () => void;
  /** Remove the currently held file. */
  removeFile: () => void;
  /** Clear the current error. */
  clearError: () => void;
}

/**
 * Encapsulates single-file upload logic:
 * - Drag & drop state tracking
 * - MIME type validation (PDF, DOCX)
 * - File size validation (≤ 10 MB)
 * - File / error state management
 */
export function useFileUpload(): UseFileUploadReturn {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<FileError | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // ── Validation ───────────────────────────────────────────
  const validate = useCallback((candidate: File): FileError | null => {
    const isAcceptedType = ACCEPTED_MIME_TYPES.some(
      (mime) => candidate.type === mime
    );

    if (!isAcceptedType) {
      const ext = candidate.name.split(".").pop()?.toLowerCase() ?? "";
      return {
        fileName: candidate.name,
        message: `.${ext} files are not supported. Please upload a PDF or DOCX file.`,
      };
    }

    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      return {
        fileName: candidate.name,
        message: `File exceeds the ${MAX_FILE_SIZE_LABEL} limit. Please upload a smaller file.`,
      };
    }

    return null;
  }, []);

  // ── Process a file from any source ───────────────────────
  const processFile = useCallback(
    (candidate: File) => {
      const validationError = validate(candidate);
      if (validationError) {
        setError(validationError);
        setFile(null);
        return;
      }
      setError(null);
      setFile(candidate);
    },
    [validate]
  );

  // ── Input change handler ─────────────────────────────────
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) processFile(selected);
      // Reset so re-selecting the same file still triggers change
      if (inputRef.current) inputRef.current.value = "";
    },
    [processFile]
  );

  // ── Drag handlers ────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const dropped = e.dataTransfer.files?.[0];
      if (dropped) processFile(dropped);
    },
    [processFile]
  );

  // ── Actions ──────────────────────────────────────────────
  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const removeFile = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    file,
    error,
    isDragOver,
    inputRef,
    handleInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    openFilePicker,
    removeFile,
    clearError,
  };
}
