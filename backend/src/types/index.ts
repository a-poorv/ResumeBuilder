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
  /** Optional project / product line under the role */
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

export interface GenerateResumeRequest {
  resume: ParsedResume;
  jobDescription: ParsedJobDescription;
  instructions?: UserInstructions;
}

export interface TailoredExperienceEntry {
  role: string;
  company: string;
  location?: string;
  subtitle?: string;
  startDate: string;
  endDate: string;
  highlights: string[];
}

export interface TailoredResumeContent {
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: string[];
  summary: string;
  skills: string[];
  experience: TailoredExperienceEntry[];
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
  matchScore: number | null;
  source: "groq" | "mock";
  tailoredContent: TailoredResumeContent;
  generatedAt: string;
}
