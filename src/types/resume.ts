export interface ResumeExperience {
  role: string;
  company: string;
  subtitle?: string;
  duration: string;
  highlights: string[];
}

export interface ResumePreviewData {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  projects: Array<{
    name: string;
    description?: string;
    highlights: string[];
    technologies: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    duration: string;
    details?: string[];
  }>;
  certifications: string[];
}

export interface ParsedJobDescription {
  jobTitle: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  experienceLevel: string | null;
  keywords: string[];
}

export interface ParsedResumeExperience {
  role: string;
  company: string;
  location?: string;
  subtitle?: string;
  startDate: string;
  endDate: string;
  highlights: string[];
}

export interface ParsedResumeEducation {
  degree: string;
  institution: string;
  startDate?: string;
  endDate?: string;
  details?: string[];
}

export interface ParsedResume {
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: string[];
  summary?: string;
  skills: string[];
  experience: ParsedResumeExperience[];
  education?: ParsedResumeEducation[];
  projects?: Array<{
    name: string;
    description?: string;
    highlights?: string[];
    technologies?: string[];
  }>;
  certifications?: string[];
}

export interface UserInstructions {
  targetRole?: string;
  highlightSkills?: string[];
  keepUnchanged?: string[];
  resumeLength?: "auto" | "1page" | "2page" | "same";
  additionalNotes?: string;
}

export interface TailoredResumeContent {
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: string[];
  summary: string;
  skills: string[];
  experience: Array<{
    role: string;
    company: string;
    location?: string;
    subtitle?: string;
    startDate: string;
    endDate: string;
    highlights: string[];
  }>;
  education?: ParsedResumeEducation[];
  projects?: Array<{
    name: string;
    description?: string;
    highlights?: string[];
    technologies?: string[];
  }>;
  certifications?: string[];
  highlightedSkills: string[];
  notesForUser: string[];
}

export interface TailoredResume {
  id: string;
  targetRole: string;
  /** ATS match on original (pre-tailor) resume corpus */
  matchScoreBefore?: number | null;
  matchScore: number | null;
  atsCoverage?: {
    mustPlace: string[];
    placed: string[];
    missing: string[];
    gaps: string[];
  };
  source: "groq" | "mock";
  tailoredContent: TailoredResumeContent;
  generatedAt: string;
}

export type PreviewDecision = "pending" | "accepted" | "rejected";

export function cleanDisplayText(value: unknown): string {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text || /^null$/i.test(text) || /^undefined$/i.test(text)) return "";
  return text;
}

export function formatJobHeading(job: {
  role?: string;
  company?: string;
}): string {
  const role = cleanDisplayText(job.role);
  const company = cleanDisplayText(job.company);
  if (company && role) return `${company} | ${role}`;
  return role || company || "Experience";
}

export function resumeToPlainText(resume: ResumePreviewData): string {
  const lines: string[] = [
    resume.fullName,
    resume.title,
    [resume.email, resume.phone, resume.location, ...resume.links]
      .filter(Boolean)
      .join(" | "),
    "",
    "SUMMARY",
    resume.summary,
    "",
    "SKILLS",
    resume.skills.join(", "),
    "",
    "EXPERIENCE",
  ];

  for (const job of resume.experience) {
    lines.push(formatJobHeading(job));
    if (job.subtitle) lines.push(job.subtitle);
    lines.push(job.duration);
    for (const highlight of job.highlights) {
      lines.push(`- ${highlight}`);
    }
    lines.push("");
  }

  if ((resume.projects?.length ?? 0) > 0) {
    lines.push("PROJECTS");
    for (const project of resume.projects) {
      lines.push(project.name);
      if (project.description) lines.push(project.description);
      if (project.technologies.length > 0) {
        lines.push(project.technologies.join(", "));
      }
      for (const highlight of project.highlights) {
        lines.push(`- ${highlight}`);
      }
      lines.push("");
    }
  }

  lines.push("EDUCATION");
  for (const edu of resume.education) {
    lines.push(`${edu.degree} — ${edu.institution}`);
    if (edu.duration) lines.push(edu.duration);
    for (const detail of edu.details ?? []) {
      lines.push(`- ${detail}`);
    }
  }

  if (resume.certifications.length > 0) {
    lines.push("");
    lines.push("CERTIFICATIONS & ACHIEVEMENTS");
    for (const item of resume.certifications) {
      lines.push(`- ${item}`);
    }
  }

  return lines.join("\n").trim();
}
