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

EVERY generation is for a real job application. Always rewrite for THIS job's title, responsibilities, skills, and seniority — whatever domain it is (engineering, product, data, design, sales, marketing, operations, finance, support, etc.). Role-lens reframing is the default for all applications, not a special case.

NOT keyword stuffing. NOT soft-skill self-praise. NOT inventing experience.

## What "intelligent tailoring" means (every application)
1. Read the target job: title + responsibilities + required/preferred skills + keywords + seniority. That defines the TARGET LENS.
2. Read the candidate's real work: scope, outcomes, tools, domain already present on the resume.
3. Map genuine overlaps between resume evidence and THIS JD's responsibilities.
4. Identify real gaps (JD asks for something the resume does not evidence).
5. Reframe existing work in the language and priorities of THIS job so that hiring manager sees the fit — without inventing new duties.
6. Put overlaps, gaps, and what you refused to invent in notesForUser.

## Role lens (always apply — any from → to)
Whether the pivot is large (engineer → product) or small (backend eng → fullstack, analyst → data scientist, same title at a new company):
- KEEP past job titles honest. Do not rename prior roles to match the target title.
- CHANGE the writing lens to match what THIS JD values most.
  Examples of lenses (use the one that matches the JD, not a fixed list):
  - Product: users, outcomes, adoption, retention, shipped impact, cross-functional delivery
  - Engineering: systems, reliability, performance, scale, architecture, delivery quality
  - Data: metrics, pipelines, insight quality, decision support, accuracy/latency
  - Design: user problems, usability, research-informed decisions, craft, accessibility
  - Sales/CS/ops/etc.: revenue, pipeline, customers, SLAs, process, efficiency — as evidenced
- Lead with what the JD cares about; keep less-relevant detail as supporting context.
- Reframe is allowed. Invention is not.
  - Allowed: same facts, rewritten so a hiring manager for THIS role recognizes the overlap
  - Forbidden: claiming responsibilities, tools, methods, or metrics that are not already evidenced on the resume
- Summary must read as someone applying to THIS specific job — grounded only in real experience.

## Bullet voice (critical — write like real resumes)
- One idea per bullet: strong verb + what you delivered + scope / who benefited + measurable result when available.
- Choose verbs and nouns that match THIS JD's responsibilities when the resume supports them.
- Sound like a human wrote it for this application — concise, factual, no fluff.
- Prefer concrete nouns from the work + THIS JD over personality claims.

## Hard bans (never do these)
- NEVER end bullets with soft-skill meta tags such as:
  "demonstrating ability to…", "showcasing understanding of…", "highlighting capacity for…",
  "proving expertise in…", "reflecting strong…", "underscoring commitment to…",
  "exhibiting proficiency…", "illustrating ability…".
- Do NOT glue missing JD keywords onto unrelated work.
- Do NOT invent tools, metrics, stakeholders, methods, or responsibilities.
- Do NOT change companies, job titles/roles, dates, project/subtitle lines, education, or certifications.
- Do NOT reorder jobs. Same count, same order.
- NEVER output the strings "null" or "undefined". Use "" when empty.

## How to rewrite well
- Keep every original fact and metric. Sharpen verbs; reframe for THIS job's lens; do not inflate.
- Reorder skills to surface skills that matter for THIS JD first (only skills already on the resume).
- Summary: 2–4 sentences angled to THIS job using real experience — no soft-skill padding.

## notesForUser must include (gap analysis for every application)
- Target lens used (e.g. "Aligned writing to Data Analyst JD priorities: SQL, reporting, stakeholder-ready insights")
- Overlaps emphasized (which JD responsibilities mapped to which real evidence)
- Real gaps vs THIS JD — actionable and specific
- What you refused to invent

## Quality check before answering
Reject any bullet that: (a) invents duties not in the resume, (b) glues JD jargon onto unrelated work, OR (c) ends with showcasing/demonstrating fluff. Every bullet = real work, rewritten for THIS job's lens + result.`;

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
    const highlights = (tailoredJob?.highlights?.length
      ? tailoredJob.highlights
      : originalJob.highlights
    ).map((highlight, highlightIndex) => {
      const source = originalJob.highlights[highlightIndex] ?? originalJob.highlights[0] ?? "";
      return scrubForcedJargon(highlight, source || highlight);
    });

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
    projects:
      safe.projects && safe.projects.length > 0
        ? safe.projects
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

function buildUserPrompt(input: GenerateResumeRequest): string {
  const targetRole =
    input.instructions?.targetRole ||
    input.jobDescription.jobTitle ||
    "target role";

  return [
    `This candidate is applying for: ${targetRole}`,
    "Tailor the resume for THIS job application — every time, for any role/domain.",
    "Use role-lens reframing from the JD (not a fixed playbook). No keyword stuffing. No soft-skill fluff. No invented experience.",
    "",
    "Process:",
    "1) From the JD, infer what THIS hiring manager values (the target lens).",
    "2) Map JD responsibilities/skills to real resume evidence (overlaps).",
    "3) List real gaps in notesForUser (candidate gap analysis for this application).",
    "4) Rewrite summary + bullets in THIS job's language using only real facts.",
    "5) Keep past job titles honest. Never invent missing tools, methods, or ownership.",
    "",
    "Voice rules:",
    "- Write like a real person applying to this specific job.",
    "- Ban endings like 'demonstrating ability…', 'showcasing…', 'highlighting capacity…'.",
    "- Lead with what THIS JD cares about; demote less-relevant detail to support.",
    "",
    "=== TARGET ROLE (application) ===",
    targetRole,
    "",
    "=== RESUME JSON ===",
    JSON.stringify(input.resume, null, 2),
    "",
    "=== JOB DESCRIPTION JSON (source of truth for lens) ===",
    JSON.stringify(input.jobDescription, null, 2),
    "",
    "=== USER INSTRUCTIONS ===",
    JSON.stringify(input.instructions ?? {}, null, 2),
    "",
    "GENERAL RULE EXAMPLES (apply the same idea to ANY from→to):",
    "",
    "If JD is product-oriented and resume is engineering-heavy:",
    "BAD:  \"Developed a high-scale analytics platform using Angular 17+ and .NET 8.\"",
    "GOOD: \"Shipped a high-scale analytics platform (Angular 17+, .NET 8) that helped teams cut reporting query times to under 3 seconds.\"",
    "",
    "If JD is engineering-oriented and resume is already technical:",
    "BAD:  vague soft claims or product buzzwords with no systems detail",
    "GOOD: keep systems/performance/reliability front; align nouns to THIS JD's stack/responsibilities when evidenced",
    "",
    "If JD asks for work the resume does not show:",
    "BAD:  invent it into a bullet",
    "GOOD: keep the bullet truthful; list the missing requirement under notesForUser gaps",
    "",
    "BAD (soft-skill padding):",
    '"Improved system stability by 45%…, demonstrating ability to analyze and resolve complex issues."',
    "GOOD:",
    '"Improved system stability by 45% by reducing production incidents through root-cause analysis and targeted fixes."',
    "",
    "BAD (glued JD jargon onto unrelated work):",
    '"Built 15+ reusable Angular widgets, applying principles similar to A/B testing for optimization"',
    "GOOD (same facts, outcome language when supported):",
    '"Cut feature delivery time 30% by shipping a library of 15+ reusable UI components adopted across product workflows"',
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
    input: GenerateResumeRequest
  ): Promise<TailoredResumeContent> {
    const original = sanitizeParsedResume(input.resume);

    const content = await this.createJsonCompletion({
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      user: [
        buildUserPrompt({ ...input, resume: original }),
        "",
        "Return JSON with this shape (same experience length/order as source):",
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
              "Target lens: <derived from THIS JD title + responsibilities>",
              "Overlaps emphasized: ...",
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
}

export const groqService = new GroqService();
