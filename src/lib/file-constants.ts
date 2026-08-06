/** Accepted file MIME types and their display labels. */
export const ACCEPTED_FILE_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
} as const;

/** MIME strings accepted by the file input `accept` attribute. */
export const ACCEPTED_MIME_TYPES = Object.keys(ACCEPTED_FILE_TYPES) as Array<
  keyof typeof ACCEPTED_FILE_TYPES
>;

/** File extensions for display purposes. */
export const ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_FILE_TYPES);

/** Maximum allowed file size in bytes (10 MB). */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Human-readable max file size label. */
export const MAX_FILE_SIZE_LABEL = "10 MB";
