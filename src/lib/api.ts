import type {
  ParsedJobDescription,
  ParsedResume,
  TailoredResume,
  UserInstructions,
} from "@/types/resume";
import { getClientId } from "@/lib/client-id";

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:3000";

function clientHeaders(extra?: HeadersInit): HeadersInit {
  return {
    "x-client-id": getClientId(),
    ...extra,
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data.error) return data.error;
  } catch {
    // ignore JSON parse errors
  }
  return `Request failed with status ${response.status}`;
}

export async function uploadResume(file: File): Promise<{
  fileName: string;
  size: number;
  mimeType: string;
  message: string;
  parsedResume: ParsedResume | null;
  extractedText?: string;
}> {
  const formData = new FormData();
  formData.append("resume", file);

  const response = await fetch(`${API_BASE_URL}/upload-resume`, {
    method: "POST",
    headers: clientHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export async function analyzeJobDescription(input: {
  jobDescription: string;
  highlightSkills?: string;
}): Promise<ParsedJobDescription> {
  const response = await fetch(`${API_BASE_URL}/analyze-jd`, {
    method: "POST",
    headers: clientHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

export async function generateTailoredResume(input: {
  resume: ParsedResume;
  jobDescription: ParsedJobDescription;
  instructions?: UserInstructions;
}): Promise<TailoredResume> {
  const response = await fetch(`${API_BASE_URL}/generate-resume`, {
    method: "POST",
    headers: clientHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json();
}

/** Cloud/server history when Supabase is configured; otherwise in-memory server list. */
export async function fetchGenerationHistory(): Promise<TailoredResume[]> {
  const response = await fetch(
    `${API_BASE_URL}/history?clientId=${encodeURIComponent(getClientId())}`,
    {
      headers: clientHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const data = await response.json();
  return Array.isArray(data) ? (data as TailoredResume[]) : [];
}
