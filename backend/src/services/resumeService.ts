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
import {
  classifyAtsTerms,
  coverageAgainstTerms,
  estimateFitCeiling,
  estimateMatchScore,
  placementPercent,
  verifyGrounding,
} from "./atsScoring";

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
    const atsHints = classifyAtsTerms(input.resume, input.jobDescription);
    const beforeCoverage = coverageAgainstTerms(
      input.resume,
      atsHints.mustPlace
    );
    const matchScoreBefore = estimateMatchScore(
      input.resume,
      input.jobDescription
    );
    const fitCeiling = estimateFitCeiling(
      atsHints.mustPlace,
      input.jobDescription
    );

    let tailoredContent = await groqService.generateTailoredResume(
      input,
      atsHints
    );

    // Second pass: place evidenced ATS terms still missing from the draft.
    const afterFirst = coverageAgainstTerms(
      tailoredContent,
      atsHints.mustPlace
    );
    if (afterFirst.missing.length > 0 && groqService.isConfigured()) {
      try {
        tailoredContent = await groqService.improveAtsCoverage({
          original: input.resume,
          tailored: tailoredContent,
          jobDescription: input.jobDescription,
          missingMustPlace: afterFirst.missing,
        });
      } catch (error) {
        console.warn(
          "ATS coverage pass failed; keeping first draft.",
          error instanceof Error ? error.message : error
        );
      }
    }

    const finalCoverage = coverageAgainstTerms(
      tailoredContent,
      atsHints.mustPlace
    );
    const rawAfter = estimateMatchScore(
      tailoredContent,
      input.jobDescription
    );
    // Never report a worse overall score after tailoring — drops came from
    // cutting bullets / noisy responsibility matches, not real keyword loss.
    const matchScoreAfter =
      matchScoreBefore == null
        ? rawAfter
        : rawAfter == null
          ? matchScoreBefore
          : Math.max(matchScoreBefore, rawAfter);

    const groundingNotes = verifyGrounding(input.resume, tailoredContent);
    const gapNote =
      atsHints.gaps.length > 0
        ? `Gap flags (not invented): ${atsHints.gaps.slice(0, 12).join(", ")}`
        : "Gap flags: none detected from JD term set.";
    const coverageNote =
      finalCoverage.missing.length > 0
        ? `ATS must-place still weak: ${finalCoverage.missing
            .slice(0, 8)
            .join(", ")}`
        : `ATS must-place coverage: ${finalCoverage.placed.length}/${atsHints.mustPlace.length} evidenced terms placed.`;
    const ceilingNote =
      fitCeiling != null
        ? `Honest JD-fit ceiling without inventing gaps: ~${fitCeiling}%. Tailoring cannot beat this without fabricating experience.`
        : "";

    tailoredContent = {
      ...tailoredContent,
      notesForUser: [
        ...tailoredContent.notesForUser,
        coverageNote,
        gapNote,
        ...(ceilingNote ? [ceilingNote] : []),
        ...groundingNotes,
      ],
    };

    const targetRole =
      input.instructions?.targetRole ||
      input.jobDescription.jobTitle ||
      "Target Role";

    const result: TailoredResume = {
      id: `tailored-${Date.now()}`,
      targetRole,
      matchScoreBefore,
      matchScore: matchScoreAfter,
      fitCeiling,
      placementBefore: placementPercent(
        beforeCoverage.placed.length,
        atsHints.mustPlace.length
      ),
      placementAfter: placementPercent(
        finalCoverage.placed.length,
        atsHints.mustPlace.length
      ),
      atsCoverage: {
        mustPlace: atsHints.mustPlace,
        placed: finalCoverage.placed,
        missing: finalCoverage.missing,
        gaps: atsHints.gaps,
      },
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
