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

function estimateMatchScore(
  resume: ParsedResume,
  jd: ParsedJobDescription
): number | null {
  const resumeSkills = new Set(resume.skills.map((skill) => skill.toLowerCase()));
  const targetSkills = [...jd.requiredSkills, ...jd.preferredSkills];
  if (targetSkills.length === 0) return null;

  const matches = targetSkills.filter((skill) =>
    resumeSkills.has(skill.toLowerCase())
  ).length;

  return Math.round((matches / targetSkills.length) * 100);
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
      matchScore: estimateMatchScore(input.resume, input.jobDescription),
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
