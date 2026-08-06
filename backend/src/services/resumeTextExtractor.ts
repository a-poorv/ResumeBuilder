import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import type { ParsedResume } from "../types";

export async function extractResumeText(
  file: Express.Multer.File
): Promise<string> {
  if (file.mimetype === "application/pdf") {
    const parser = new PDFParse({ data: file.buffer });
    try {
      const result = await parser.getText();
      return (result.text || "").trim();
    } finally {
      await parser.destroy();
    }
  }

  if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return (result.value || "").trim();
  }

  throw new Error("Unsupported file type for text extraction.");
}

export function fallbackParsedResumeFromText(
  fileName: string,
  text: string
): ParsedResume {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const fullName =
    lines[0]?.slice(0, 80) ||
    fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() ||
    "Candidate";

  return {
    fullName,
    summary: text.slice(0, 600),
    skills: [],
    experience: [],
    education: [],
  };
}
