import {
  GenerateResumeRequest,
  ParsedJobDescription,
  ParsedResume,
  TailoredResume,
  UserInstructions,
} from "../types";
import { jobDescriptionParserService } from "./jobDescriptionParserService";
import { groqService } from "./groqService";
import {
  extractResumeText,
  fallbackParsedResumeFromText,
} from "./resumeTextExtractor";
import { historyStore } from "./historyStore";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function validateGenerateResumeRequest(body: unknown): {
  ok: true;
  value: GenerateResumeRequest;
} | {
  ok: false;
  error: string;
} {
  if (!isObject(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const { resume, jobDescription, instructions } = body;

  if (!isObject(resume)) {
    return { ok: false, error: "resume (Parsed Resume JSON) is required." };
  }
  if (typeof resume.fullName !== "string" || !resume.fullName.trim()) {
    return { ok: false, error: "resume.fullName is required." };
  }
  if (!isStringArray(resume.skills)) {
    return { ok: false, error: "resume.skills must be an array of strings." };
  }
  if (!Array.isArray(resume.experience)) {
    return { ok: false, error: "resume.experience must be an array." };
  }

  if (!isObject(jobDescription)) {
    return { ok: false, error: "jobDescription (Parsed JD JSON) is required." };
  }
  if (!isStringArray(jobDescription.requiredSkills)) {
    return { ok: false, error: "jobDescription.requiredSkills must be an array of strings." };
  }
  if (!isStringArray(jobDescription.preferredSkills)) {
    return { ok: false, error: "jobDescription.preferredSkills must be an array of strings." };
  }
  if (!isStringArray(jobDescription.responsibilities)) {
    return { ok: false, error: "jobDescription.responsibilities must be an array of strings." };
  }
  if (!isStringArray(jobDescription.keywords)) {
    return { ok: false, error: "jobDescription.keywords must be an array of strings." };
  }

  let parsedInstructions: UserInstructions | undefined;
  if (instructions !== undefined) {
    if (!isObject(instructions)) {
      return { ok: false, error: "instructions must be an object when provided." };
    }
    parsedInstructions = instructions as UserInstructions;
  }

  return {
    ok: true,
    value: {
      resume: resume as unknown as ParsedResume,
      jobDescription: jobDescription as unknown as ParsedJobDescription,
      instructions: parsedInstructions,
    },
  };
}

function buildResumeCorpus(
  resume: Pick<
    ParsedResume,
    "summary" | "skills" | "experience" | "projects" | "certifications"
  >
): string {
  return [
    resume.summary ?? "",
    ...resume.skills,
    ...resume.experience.flatMap((job) => [
      job.role,
      job.company,
      job.subtitle ?? "",
      ...job.highlights,
    ]),
    ...(resume.projects ?? []).flatMap((project) => [
      project.name,
      project.description ?? "",
      ...(project.highlights ?? []),
      ...(project.technologies ?? []),
    ]),
    ...(resume.certifications ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function phraseFoundInCorpus(phrase: string, corpus: string): boolean {
  const key = phrase.trim().toLowerCase();
  if (!key) return false;
  if (corpus.includes(key)) return true;

  const tokens = key.split(/[^a-z0-9+#.]+/).filter((token) => token.length > 2);
  if (tokens.length >= 2) {
    return tokens.every((token) => corpus.includes(token));
  }
  return false;
}

/**
 * ATS-oriented match score against the FULL resume text (skills + bullets + projects),
 * weighted toward required skills and JD keywords.
 */
function estimateMatchScore(
  resume: Pick<
    ParsedResume,
    "summary" | "skills" | "experience" | "projects" | "certifications"
  >,
  jd: ParsedJobDescription
): number | null {
  const corpus = buildResumeCorpus(resume);
  const weighted: Array<{ term: string; weight: number }> = [
    ...jd.requiredSkills.map((term) => ({ term, weight: 3 })),
    ...jd.preferredSkills.map((term) => ({ term, weight: 1.5 })),
    ...jd.keywords.map((term) => ({ term, weight: 2 })),
  ];

  // Deduplicate by lowercase term, keep highest weight.
  const byTerm = new Map<string, { term: string; weight: number }>();
  for (const item of weighted) {
    const key = item.term.trim().toLowerCase();
    if (!key) continue;
    const existing = byTerm.get(key);
    if (!existing || item.weight > existing.weight) {
      byTerm.set(key, item);
    }
  }

  const terms = Array.from(byTerm.values());
  if (terms.length === 0) return null;

  let earned = 0;
  let possible = 0;
  for (const item of terms) {
    possible += item.weight;
    if (phraseFoundInCorpus(item.term, corpus)) {
      earned += item.weight;
    }
  }

  // Light bonus when responsibility themes appear in the corpus.
  const responsibilityHits = jd.responsibilities.filter((item) => {
    const tokens = item
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((token) => token.length > 3)
      .slice(0, 5);
    if (tokens.length === 0) return false;
    const hits = tokens.filter((token) => corpus.includes(token)).length;
    return hits >= Math.min(2, tokens.length);
  }).length;
  if (jd.responsibilities.length > 0) {
    const respWeight = 8;
    possible += respWeight;
    earned +=
      (responsibilityHits / Math.max(jd.responsibilities.length, 1)) * respWeight;
  }

  return Math.round((earned / possible) * 100);
}

export class ResumeService {
  async processResumeUpload(file: Express.Multer.File) {
    const extractedText = await extractResumeText(file);

    let parsedResume: ParsedResume | null = null;
    if (groqService.isConfigured() && extractedText.length > 40) {
      try {
        parsedResume = await groqService.parseResumeFromText(
          extractedText,
          file.originalname
        );
      } catch (error) {
        console.error("Resume parse via Groq failed:", error);
        parsedResume = fallbackParsedResumeFromText(file.originalname, extractedText);
      }
    } else if (extractedText.length > 0) {
      parsedResume = fallbackParsedResumeFromText(file.originalname, extractedText);
    }

    return {
      fileName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      message: "Resume uploaded and stored successfully.",
      extractedText: extractedText.slice(0, 2000),
      parsedResume,
    };
  }

  async analyzeJobDescription(
    jobDescription: string,
    skillsToHighlight?: string[]
  ): Promise<ParsedJobDescription> {
    const extras = skillsToHighlight ?? [];

    // Prefer LLM context extraction; fall back to rules if Groq is down/unconfigured.
    if (groqService.isConfigured()) {
      try {
        return await groqService.parseJobDescription(jobDescription, extras);
      } catch (error) {
        console.warn(
          "Groq JD parse failed; using rule-based fallback.",
          error instanceof Error ? error.message : error
        );
      }
    }

    return jobDescriptionParserService.parse(jobDescription, extras);
  }

  async generateTailoredResume(
    input: GenerateResumeRequest,
    clientId?: string
  ): Promise<TailoredResume> {
    const tailoredContent = await groqService.generateTailoredResume(input);
    const targetRole =
      input.instructions?.targetRole ||
      input.jobDescription.jobTitle ||
      "Target Role";

    const result: TailoredResume = {
      id: `tailored-${Date.now()}`,
      targetRole,
      matchScore: estimateMatchScore(tailoredContent, input.jobDescription),
      source: "groq",
      tailoredContent,
      generatedAt: new Date().toISOString(),
    };

    // Never block generation on history persistence failures.
    await historyStore.save(result, clientId);
    return result;
  }

  async getHistory(clientId?: string) {
    return historyStore.list(clientId);
  }
}

export const resumeService = new ResumeService();
