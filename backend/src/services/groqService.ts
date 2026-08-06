import OpenAI from "openai";
import {
  GenerateResumeRequest,
  ParsedJobDescription,
  ParsedResume,
  ParsedResumeEducation,
  ParsedResumeExperience,
  TailoredResumeContent,
} from "../types";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are an expert resume editor who writes like a hiring manager and ATS scanner expect — plain, concrete, human.

EVERY generation is for a real job application. Always rewrite for THIS job's title, responsibilities, skills, keywords, and seniority — whatever domain it is. Role-lens reframing is the default for all applications.

NOT keyword stuffing. NOT soft-skill self-praise. NOT inventing experience.

## What "intelligent tailoring" means (every application)
1. Read the target job: title + responsibilities + required/preferred skills + keywords + seniority. That defines the TARGET LENS and the ATS keyword set.
2. Read the candidate's real work across summary, experience, skills, AND projects.
3. Map genuine overlaps between resume evidence and THIS JD.
4. Identify real gaps (JD asks for something the resume does not evidence).
5. Rewrite so overlapping JD language appears naturally where the work already supports it — across summary, experience bullets, skills order, AND project descriptions/highlights.
6. Put overlaps, gaps, ATS keywords placed, and what you refused to invent in notesForUser.

## ATS readiness (critical — still honest)
ATS systems scan the WHOLE resume. Important overlapping terms must not live only in Analysis notes.
- When a JD skill/keyword/theme is already evidenced in the resume, surface that exact or near-exact wording in at least one visible place: summary, a relevant experience bullet, skills list, or a project description/highlight.
- Prefer natural sentences over comma-stuffed keyword lists.
- Distribute coverage: do not dump every keyword into one bullet.
- PROJECTS are high-value for ATS: rewrite project description + highlights to mirror overlapping JD language when the project work supports it. Keep project names honest.
- If a JD keyword has no resume evidence, do NOT force it in — list it under gaps in notesForUser.

## Role lens (always apply — any from → to)
- KEEP past job titles and project names honest.
- CHANGE the writing lens to match what THIS JD values most.
- Reframe is allowed. Invention is not.
- Summary must read as someone applying to THIS specific job — grounded only in real experience.

## Bullet / project voice
- Select the most JD-relevant bullets per role (typically 3–5). Drop impressive-but-irrelevant achievements for this application.
- Each bullet: strong past-tense action verb (present tense only for current role), one idea, under ~30 words, no first person.
- Prefer one quantified outcome when the master profile provides a number.
- Ban filler without evidence: "results-driven", "team player", "passionate", etc.
- Choose verbs and nouns that match THIS JD when resume evidence supports them.

## Hard bans
- NEVER end lines with soft-skill meta tags ("demonstrating ability…", "showcasing…", "highlighting capacity…", etc.).
- Do NOT glue missing JD keywords onto unrelated work.
- Do NOT invent tools, metrics, stakeholders, methods, or responsibilities.
- Do NOT change companies, job titles/roles, dates, education, or certifications.
- Do NOT rename projects. Do NOT reorder jobs. Same experience count/order.
- NEVER output the strings "null" or "undefined". Use "" when empty.

## How to rewrite well
- Keep every original fact and metric. Sharpen verbs; reframe for THIS job; weave overlapping ATS terms where truthful.
- Reorder skills to surface JD-overlapping skills first (only skills already on the resume).
- Rewrite projects: description + highlights + technology order for ATS alignment when overlap is real.
- Summary: 2–4 sentences angled to THIS job using real experience and key overlapping terms.
- Section content order in the JSON: summary → skills → experience → projects → education → certifications.

## Selection rules
- From the full bullet inventory, keep only bullets relevant to THIS JD's responsibilities/keywords.
- Prioritize bullets whose verbs/nouns overlap the JD keyword list.
- You may recombine related facts from the same role into stronger bullets — still without inventing.

## notesForUser must include
- Target lens used
- Overlaps emphasized (JD → resume evidence)
- ATS keywords placed in the tailored resume (list them)
- Real gaps vs THIS JD
- What you refused to invent

## Quality check
Reject any line that invents duties, glues unsupported JD jargon, or ends with showcasing/demonstrating fluff. Every line = real work, rewritten for THIS job + ATS-visible overlap where earned.`;

function cleanText(value: unknown): string {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text || /^null$/i.test(text) || /^undefined$/i.test(text)) return "";
  return text;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(cleanText).filter(Boolean);
}

function cleanExperience(entry: Partial<ParsedResumeExperience>): ParsedResumeExperience {
  return {
    role: cleanText(entry.role),
    company: cleanText(entry.company),
    location: cleanText(entry.location) || undefined,
    subtitle: cleanText((entry as { subtitle?: string }).subtitle) || undefined,
    startDate: cleanText(entry.startDate),
    endDate: cleanText(entry.endDate),
    highlights: cleanStringArray(entry.highlights),
  };
}

function cleanEducation(entry: Partial<ParsedResumeEducation>): ParsedResumeEducation {
  return {
    degree: cleanText(entry.degree),
    institution: cleanText(entry.institution),
    startDate: cleanText(entry.startDate) || undefined,
    endDate: cleanText(entry.endDate) || undefined,
    details: cleanStringArray(entry.details),
  };
}

function sanitizeParsedJobDescription(
  raw: Partial<ParsedJobDescription>,
  extraKeywords: string[] = []
): ParsedJobDescription {
  const requiredSkills = cleanStringArray(raw.requiredSkills);
  const preferredSkills = cleanStringArray(raw.preferredSkills).filter(
    (skill) =>
      !requiredSkills.some((required) => required.toLowerCase() === skill.toLowerCase())
  );
  const responsibilities = cleanStringArray(raw.responsibilities);
  const baseKeywords = cleanStringArray(raw.keywords);
  const keywords = [
    ...baseKeywords,
    ...extraKeywords.map(cleanText).filter(Boolean),
  ];
  const seen = new Set<string>();
  const dedupedKeywords = keywords.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    jobTitle: cleanText(raw.jobTitle) || null,
    requiredSkills,
    preferredSkills,
    responsibilities,
    experienceLevel: cleanText(raw.experienceLevel) || null,
    keywords: dedupedKeywords,
  };
}

function sanitizeParsedResume(raw: ParsedResume): ParsedResume {
  return {
    fullName: cleanText(raw.fullName) || "Candidate",
    email: cleanText(raw.email) || undefined,
    phone: cleanText(raw.phone) || undefined,
    location: cleanText(raw.location) || undefined,
    links: cleanStringArray(raw.links),
    summary: cleanText(raw.summary) || undefined,
    skills: cleanStringArray(raw.skills),
    experience: (raw.experience ?? []).map(cleanExperience),
    education: (raw.education ?? []).map(cleanEducation),
    projects: (raw.projects ?? []).map((project) => ({
      name: cleanText(project.name),
      description: cleanText(project.description) || undefined,
      highlights: cleanStringArray(project.highlights),
      technologies: cleanStringArray(project.technologies),
    })),
    certifications: cleanStringArray(raw.certifications),
  };
}

/** Force tailored output to keep original structure/chronology. */
function alignTailoredToOriginal(
  original: ParsedResume,
  tailored: TailoredResumeContent
): TailoredResumeContent {
  const safe = sanitizeParsedResume({
    ...tailored,
    fullName: tailored.fullName,
    summary: tailored.summary,
    skills: tailored.skills,
    experience: tailored.experience,
    education: tailored.education,
    projects: tailored.projects,
    certifications: tailored.certifications,
  } as ParsedResume);

  const originalCorpus = [
    original.summary ?? "",
    ...original.skills,
    ...original.experience.flatMap((job) => [
      job.role,
      job.company,
      job.subtitle ?? "",
      ...job.highlights,
    ]),
    ...(original.projects ?? []).flatMap((project) => [
      project.name,
      project.description ?? "",
      ...(project.highlights ?? []),
      ...(project.technologies ?? []),
    ]),
    ...(original.certifications ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const scrubForcedJargon = (rewritten: string, originalText: string): string => {
    const originalLower = originalText.toLowerCase();
    let text = rewritten;

    // Strip soft-skill meta endings AI loves to append (never belong on ATS bullets).
    const softSkillMetaPatterns = [
      /[,;]?\s*(demonstrating|showcasing|highlighting|proving|illustrating|exhibiting|underscoring|reflecting)\s+(ability|capacity|understanding|expertise|proficiency|commitment|strong|focus)[^.]*\.?$/i,
      /\s+,\s*(demonstrating|showcasing|highlighting)\s+[^.]*$/i,
    ];
    for (const pattern of softSkillMetaPatterns) {
      if (!pattern.test(originalText) && pattern.test(text)) {
        text = text.replace(pattern, "").trim();
      }
    }

    // Strip tacked-on JD clauses that were not in the source bullet.
    const forcedClausePatterns = [
      /,\s*applying principles?[^.]*$/i,
      /,\s*focusing on (metrics|market research|a\/b testing)[^.]*$/i,
      /,\s*using (a\/b testing|market analysis|market research)[^.]*$/i,
      /\s+for product enhancement\.?$/i,
      /\s+similar to a\/b testing[^.]*$/i,
    ];

    for (const pattern of forcedClausePatterns) {
      if (!pattern.test(originalText) && pattern.test(text)) {
        text = text.replace(pattern, "").trim();
      }
    }

    // If rewrite introduces A/B testing / market research and source never had it, revert bullet.
    const bannedUnlessPresent = ["a/b testing", "ab testing", "market research", "market analysis"];
    for (const phrase of bannedUnlessPresent) {
      const inOriginalBullet = originalLower.includes(phrase);
      const inCorpus = originalCorpus.includes(phrase);
      const inRewrite = text.toLowerCase().includes(phrase);
      if (inRewrite && !inOriginalBullet && !inCorpus) {
        return originalText;
      }
    }

    return text.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();
  };

  const alignedExperience = original.experience.map((originalJob, index) => {
    const tailoredJob = safe.experience[index];
    // Allow 3–5 selected bullets (not forced 1:1 with original count/order).
    const selected =
      tailoredJob?.highlights?.length
        ? tailoredJob.highlights.slice(0, 6)
        : originalJob.highlights;
    const jobCorpus = originalJob.highlights.join(" ");
    const highlights = selected.map((highlight) =>
      scrubForcedJargon(highlight, jobCorpus || highlight)
    );

    return {
      role: originalJob.role,
      company: cleanText(tailoredJob?.company) || originalJob.company,
      location: cleanText(tailoredJob?.location) || originalJob.location,
      subtitle: cleanText(tailoredJob?.subtitle) || originalJob.subtitle,
      startDate: originalJob.startDate,
      endDate: originalJob.endDate,
      highlights,
    };
  });

  // Skills: keep only skills that already exist on the resume (case-insensitive).
  const originalSkillSet = new Set(original.skills.map((skill) => skill.toLowerCase()));
  const filteredSkills = safe.skills.filter((skill) =>
    originalSkillSet.has(skill.toLowerCase())
  );

  const originalProjects = original.projects ?? [];
  const alignedProjects = originalProjects.map((originalProject, index) => {
    const tailoredProject = safe.projects?.[index];
    const sourceDescription = originalProject.description ?? "";
    const description = scrubForcedJargon(
      cleanText(tailoredProject?.description) || sourceDescription,
      sourceDescription
    );

    const sourceHighlights = originalProject.highlights ?? [];
    const projectCorpus = [
      sourceDescription,
      ...sourceHighlights,
      ...(originalProject.technologies ?? []),
    ].join(" ");
    const tailoredHighlights =
      tailoredProject?.highlights?.length
        ? tailoredProject.highlights.slice(0, 6)
        : sourceHighlights;
    const highlights = tailoredHighlights.map((highlight) =>
      scrubForcedJargon(highlight, projectCorpus || highlight)
    );

    const originalTechSet = new Set(
      (originalProject.technologies ?? []).map((tech) => tech.toLowerCase())
    );
    const techPool = new Set([
      ...originalTechSet,
      ...[...originalSkillSet],
    ]);
    const technologies = cleanStringArray(tailoredProject?.technologies).filter(
      (tech) => techPool.has(tech.toLowerCase())
    );

    return {
      name: originalProject.name,
      description: description || undefined,
      highlights,
      technologies: technologies.length
        ? technologies
        : originalProject.technologies ?? [],
    };
  });

  return {
    fullName: cleanText(safe.fullName) || original.fullName,
    email: cleanText(safe.email) || original.email,
    phone: cleanText(safe.phone) || original.phone,
    location: cleanText(safe.location) || original.location,
    links: safe.links?.length ? safe.links : original.links ?? [],
    summary: (() => {
      const summary = cleanText(safe.summary) || original.summary || "";
      return scrubForcedJargon(summary, original.summary || summary);
    })(),
    skills: filteredSkills.length ? filteredSkills : original.skills,
    experience: alignedExperience,
    education:
      safe.education && safe.education.length > 0
        ? safe.education
        : original.education ?? [],
    projects: alignedProjects.length
      ? alignedProjects
      : original.projects ?? [],
    certifications:
      safe.certifications && safe.certifications.length > 0
        ? safe.certifications
        : original.certifications ?? [],
    highlightedSkills: cleanStringArray(
      (tailored as TailoredResumeContent).highlightedSkills
    ).filter((skill) => originalSkillSet.has(skill.toLowerCase())),
    notesForUser: cleanStringArray((tailored as TailoredResumeContent).notesForUser),
  };
}

function buildUserPrompt(
  input: GenerateResumeRequest,
  atsHints?: { mustPlace: string[]; gaps: string[] }
): string {
  const targetRole =
    input.instructions?.targetRole ||
    input.jobDescription.jobTitle ||
    "target role";

  return [
    `This candidate is applying for: ${targetRole}`,
    "Two-input tailor: INPUT A = Candidate Master Profile (ground truth). INPUT B = Extracted JD requirements.",
    "Never invent metrics, tools, titles, or responsibilities missing from INPUT A. Flag gaps instead.",
    "Weave overlapping JD vocabulary into summary + experience + skills + projects where INPUT A supports it.",
    "",
    "Process:",
    "1) Use INPUT B lens + ATS keyword set.",
    "2) Select the most relevant 3–5 bullets per role from INPUT A (drop irrelevant ones).",
    "3) Rewrite selected content with JD vocabulary where factually accurate; preserve every number/scope.",
    "4) Place every MUST-PLACE ATS term somewhere visible in the resume (summary/experience/skills/projects).",
    "5) List gaps + ATS keywords placed in notesForUser. Do not fabricate GAP terms.",
    "",
    "=== INPUT A — CANDIDATE MASTER PROFILE (immutable ground truth) ===",
    JSON.stringify(input.resume, null, 2),
    "",
    "=== INPUT B — EXTRACTED JD REQUIREMENTS ===",
    JSON.stringify(input.jobDescription, null, 2),
    "",
    "=== ATS MUST-PLACE TERMS (evidence exists in master profile — must appear in tailored output) ===",
    JSON.stringify(atsHints?.mustPlace ?? [], null, 2),
    "",
    "=== ATS GAP TERMS (no evidence — do NOT invent; list under notesForUser gaps) ===",
    JSON.stringify(atsHints?.gaps ?? [], null, 2),
    "",
    "=== USER INSTRUCTIONS ===",
    JSON.stringify(input.instructions ?? {}, null, 2),
    "",
    "ATS / PROJECT EXAMPLE:",
    "MUST-PLACE includes reporting export + usage metrics; project evidence exists.",
    "GOOD: \"Built multi-format reporting export APIs (.NET) used in dashboards so stakeholders could track usage metrics without manual pulls.\"",
    "BAD: invent roadmap ownership / A/B testing when not in INPUT A.",
  ].join("\n");
}

function extractJsonContent(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) return trimmed;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export class GroqService {
  private client: OpenAI | null = null;

  isConfigured(): boolean {
    return Boolean(process.env.GROQ_API_KEY);
  }

  private getClient(): OpenAI {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY is not configured. Add it to backend/.env to enable AI features."
      );
    }

    if (!this.client) {
      this.client = new OpenAI({
        apiKey,
        baseURL: GROQ_BASE_URL,
      });
    }

    return this.client;
  }

  private getModel(): string {
    return process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  }

  private async createJsonCompletion(input: {
    system: string;
    user: string;
    temperature: number;
  }): Promise<string> {
    const client = this.getClient();
    const model = this.getModel();

    const completion = await client.chat.completions.create({
      model,
      temperature: input.temperature,
      messages: [
        {
          role: "system",
          content: `${input.system}\n\nAlways respond with a single valid JSON object only. No markdown fences. Never use the strings "null" or "undefined".`,
        },
        { role: "user", content: input.user },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Groq returned an empty response.");
    }

    return extractJsonContent(content);
  }

  async parseResumeFromText(text: string, fileName: string): Promise<ParsedResume> {
    const content = await this.createJsonCompletion({
      temperature: 0,
      system: `Extract structured resume JSON from resume text.
Rules:
- Never invent employers, roles, dates, skills, metrics, education, or certifications.
- Preserve every job in the same order as the document (usually most recent first).
- For each job capture: role, company, optional project/subtitle line, startDate, endDate, highlights.
- If company is missing, use "" (empty string), never null.
- Extract certifications/awards into certifications array.
- Extract LinkedIn and other URLs into links.
- Use empty arrays when a section is missing.`,
      user: [
        `File name: ${fileName}`,
        "",
        "Return JSON with this shape:",
        JSON.stringify(
          {
            fullName: "string",
            email: "string",
            phone: "string",
            location: "string",
            links: ["string"],
            summary: "string",
            skills: ["string"],
            experience: [
              {
                role: "string",
                company: "string",
                subtitle: "string",
                location: "string",
                startDate: "string",
                endDate: "string",
                highlights: ["string"],
              },
            ],
            education: [
              {
                degree: "string",
                institution: "string",
                startDate: "string",
                endDate: "string",
                details: ["string"],
              },
            ],
            projects: [
              {
                name: "string",
                description: "string",
                highlights: ["string"],
                technologies: ["string"],
              },
            ],
            certifications: ["string"],
          },
          null,
          2
        ),
        "",
        "Resume text:",
        text.slice(0, 14000),
      ].join("\n"),
    });

    const parsed = JSON.parse(content) as ParsedResume;
    return sanitizeParsedResume(parsed);
  }

  /**
   * Context-aware JD extraction. Does not rely on exact headers like
   * "Responsibilities" / "Requirements" — understands varied posting formats.
   */
  async parseJobDescription(
    jobDescription: string,
    extraKeywords: string[] = []
  ): Promise<ParsedJobDescription> {
    const content = await this.createJsonCompletion({
      temperature: 0,
      system: `You extract structured hiring signals from messy real-world job postings.

## Goal
Produce clean JSON a resume product can use for match analysis and tailoring.
Understand MEANING and CONTEXT. Do NOT depend on specific section titles.

## Section headers vary wildly — treat them as optional hints only
Postings may use any mix of labels (or none), for example:
Responsibilities, Requirements, What you'll do, About the role, Must have,
Nice to have, Qualifications, Key accountabilities, Day to day, Success looks like,
Who you are, Skills, Experience, The opportunity, etc.
Some posts are one blob of prose with no headers. Still extract correctly.

## How to classify content
- responsibilities: work the person will DO (duties, outcomes, collaboration, ownership). Prefer concise bullet-like phrases from the posting.
- requiredSkills: must-haves for the role — tools, methods, domains, credentials, hard requirements (e.g. MBA, JIRA, Excel, Agile, client delivery, dashboards). Include non-tech skills when they are clearly required.
- preferredSkills: nice-to-haves / preferred only. If the posting does not distinguish preferred, leave this array empty rather than guessing.
- jobTitle: best title for the opening. If missing, infer from context (e.g. Product Manager). Use "" if truly unclear.
- experienceLevel: short label like "2+ years", "Senior", "Entry Level", or "" if unknown.
- keywords: ATS-relevant phrases and themes from the posting (product launch, stakeholder management, usage metrics, cross-functional, etc.) that are useful for matching — not a dump of every word.

## Rules
- Extract only what the posting supports. Do not invent employer brand fluff as skills.
- Prefer concrete, reusable skill/theme tokens over long soft-skill essays.
- Deduplicate. Keep arrays reasonably sized (skills ~8–20, responsibilities ~6–15, keywords ~8–25).
- Never output null/undefined — use "" or [].`,
      user: [
        "Parse this job posting with context awareness (ignore exact header names).",
        "",
        "Return JSON with this shape:",
        JSON.stringify(
          {
            jobTitle: "string",
            requiredSkills: ["string"],
            preferredSkills: ["string"],
            responsibilities: ["string"],
            experienceLevel: "string",
            keywords: ["string"],
          },
          null,
          2
        ),
        "",
        "Job posting text:",
        jobDescription.slice(0, 16000),
      ].join("\n"),
    });

    let parsed: Partial<ParsedJobDescription>;
    try {
      parsed = JSON.parse(content) as Partial<ParsedJobDescription>;
    } catch {
      throw new Error("Groq returned invalid JSON for the job description.");
    }

    return sanitizeParsedJobDescription(parsed, extraKeywords);
  }

  async generateTailoredResume(
    input: GenerateResumeRequest,
    atsHints?: { mustPlace: string[]; gaps: string[] }
  ): Promise<TailoredResumeContent> {
    const original = sanitizeParsedResume(input.resume);

    const content = await this.createJsonCompletion({
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      user: [
        buildUserPrompt({ ...input, resume: original }, atsHints),
        "",
        "Return JSON with this shape (same experience job count/order as source; bullets per role may be fewer if you selected the best ones):",
        JSON.stringify(
          {
            fullName: "string",
            email: "string",
            phone: "string",
            location: "string",
            links: ["string"],
            summary: "string",
            skills: ["string"],
            experience: [
              {
                role: "string",
                company: "string",
                subtitle: "string",
                location: "string",
                startDate: "string",
                endDate: "string",
                highlights: ["string"],
              },
            ],
            education: [
              {
                degree: "string",
                institution: "string",
                startDate: "string",
                endDate: "string",
                details: ["string"],
              },
            ],
            projects: [
              {
                name: "string",
                description: "string",
                highlights: ["string"],
                technologies: ["string"],
              },
            ],
            certifications: ["string"],
            highlightedSkills: ["string"],
            notesForUser: [
              "Target lens: ...",
              "Overlaps emphasized: ...",
              "ATS keywords placed: ...",
              "Real gaps vs this JD: ...",
              "Did not invent: ...",
            ],
          },
          null,
          2
        ),
      ].join("\n"),
    });

    let parsed: TailoredResumeContent;
    try {
      parsed = JSON.parse(content) as TailoredResumeContent;
    } catch {
      throw new Error("Groq returned invalid JSON for the tailored resume.");
    }

    return alignTailoredToOriginal(original, parsed);
  }

  /**
   * Second-pass ATS fix: place evidenced keywords that are still missing from the draft.
   * Does not invent new experience — only rewrites existing content.
   */
  async improveAtsCoverage(input: {
    original: ParsedResume;
    tailored: TailoredResumeContent;
    jobDescription: ParsedJobDescription;
    missingMustPlace: string[];
  }): Promise<TailoredResumeContent> {
    if (input.missingMustPlace.length === 0) return input.tailored;

    const content = await this.createJsonCompletion({
      temperature: 0.2,
      system: `You improve ATS keyword coverage on an already-tailored resume.
Rules:
- Only use facts from the Candidate Master Profile.
- Naturally place each missing must-place term into summary, a relevant experience/project bullet, or skills — where evidence supports it.
- Do not invent tools, metrics, or duties.
- Keep companies, titles, dates, project names unchanged.
- Keep writing human and ATS-friendly (no keyword dumps, no soft-skill fluff endings).
- Return the full tailored resume JSON.`,
      user: [
        "=== CANDIDATE MASTER PROFILE ===",
        JSON.stringify(input.original, null, 2),
        "",
        "=== CURRENT TAILORED DRAFT ===",
        JSON.stringify(input.tailored, null, 2),
        "",
        "=== JD (context) ===",
        JSON.stringify(input.jobDescription, null, 2),
        "",
        "=== MISSING MUST-PLACE TERMS (evidence exists in master profile) ===",
        JSON.stringify(input.missingMustPlace, null, 2),
        "",
        "Return the full updated tailored resume JSON with the same shape as the draft (including notesForUser).",
      ].join("\n"),
    });

    let parsed: TailoredResumeContent;
    try {
      parsed = JSON.parse(content) as TailoredResumeContent;
    } catch {
      return input.tailored;
    }

    return alignTailoredToOriginal(input.original, parsed);
  }
}

export const groqService = new GroqService();
