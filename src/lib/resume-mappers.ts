import type {
  ParsedResume,
  ResumePreviewData,
  TailoredResumeContent,
} from "@/types/resume";
import { cleanDisplayText } from "@/types/resume";

function formatDuration(start?: string, end?: string): string {
  const startLabel = cleanDisplayText(start);
  const endLabel = cleanDisplayText(end);
  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`;
  return startLabel || endLabel || "";
}

export function parsedResumeToPreview(resume: ParsedResume): ResumePreviewData {
  const latestRole =
    cleanDisplayText(resume.experience[0]?.role) ||
    cleanDisplayText(resume.experience[0]?.company);

  return {
    fullName: cleanDisplayText(resume.fullName) || "Candidate",
    title: latestRole,
    email: cleanDisplayText(resume.email),
    phone: cleanDisplayText(resume.phone),
    location: cleanDisplayText(resume.location),
    links: (resume.links ?? []).map(cleanDisplayText).filter(Boolean),
    summary: cleanDisplayText(resume.summary),
    skills: (resume.skills ?? []).map(cleanDisplayText).filter(Boolean),
    experience: (resume.experience ?? []).map((job) => ({
      role: cleanDisplayText(job.role),
      company: cleanDisplayText(job.company),
      subtitle: cleanDisplayText(job.subtitle) || undefined,
      duration: formatDuration(job.startDate, job.endDate),
      highlights: (job.highlights ?? []).map(cleanDisplayText).filter(Boolean),
    })),
    education: (resume.education ?? []).map((edu) => ({
      degree: cleanDisplayText(edu.degree),
      institution: cleanDisplayText(edu.institution),
      duration: formatDuration(edu.startDate, edu.endDate),
      details: (edu.details ?? []).map(cleanDisplayText).filter(Boolean),
    })),
    certifications: (resume.certifications ?? [])
      .map(cleanDisplayText)
      .filter(Boolean),
  };
}

export function tailoredContentToPreview(
  content: TailoredResumeContent
): ResumePreviewData {
  return parsedResumeToPreview({
    fullName: content.fullName,
    email: content.email,
    phone: content.phone,
    location: content.location,
    links: content.links,
    summary: content.summary,
    skills: content.skills,
    experience: content.experience,
    education: content.education,
    projects: content.projects,
    certifications: content.certifications,
  });
}

export function deriveNameFromFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
