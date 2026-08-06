import {
  ParsedJobDescription,
  ParsedResume,
  TailoredResumeContent,
} from "../types";

export function buildResumeCorpus(
  resume: Pick<
    ParsedResume | TailoredResumeContent,
    "summary" | "skills" | "experience" | "projects" | "certifications"
  >
): string {
  return [
    resume.summary ?? "",
    ...resume.skills,
    ...resume.experience.flatMap((job) => [
      job.role,
      job.company,
      ("subtitle" in job ? job.subtitle : "") ?? "",
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

export function phraseFoundInCorpus(phrase: string, corpus: string): boolean {
  const key = phrase.trim().toLowerCase();
  if (!key) return false;
  if (corpus.includes(key)) return true;

  const tokens = key.split(/[^a-z0-9+#.]+/).filter((token) => token.length > 2);
  if (tokens.length >= 2) {
    return tokens.every((token) => corpus.includes(token));
  }
  return false;
}

export function collectJdTerms(jd: ParsedJobDescription): string[] {
  const raw = [...jd.requiredSkills, ...jd.preferredSkills, ...jd.keywords];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of raw) {
    const key = term.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(term.trim());
  }
  return out;
}

/** Split JD terms into those evidenced in the master resume vs true gaps. */
export function classifyAtsTerms(
  resume: ParsedResume,
  jd: ParsedJobDescription
): { mustPlace: string[]; gaps: string[] } {
  const corpus = buildResumeCorpus(resume);
  const mustPlace: string[] = [];
  const gaps: string[] = [];
  for (const term of collectJdTerms(jd)) {
    if (phraseFoundInCorpus(term, corpus)) mustPlace.push(term);
    else gaps.push(term);
  }
  return { mustPlace, gaps };
}

/**
 * ATS match against full resume text, weighted toward required skills + keywords.
 */
export function estimateMatchScore(
  resume: Pick<
    ParsedResume | TailoredResumeContent,
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

export function coverageAgainstTerms(
  resume: Pick<
    ParsedResume | TailoredResumeContent,
    "summary" | "skills" | "experience" | "projects" | "certifications"
  >,
  terms: string[]
): { placed: string[]; missing: string[] } {
  const corpus = buildResumeCorpus(resume);
  const placed: string[] = [];
  const missing: string[] = [];
  for (const term of terms) {
    if (phraseFoundInCorpus(term, corpus)) placed.push(term);
    else missing.push(term);
  }
  return { placed, missing };
}

/** Deterministic grounding self-check (numbers + unsupported new skills). */
export function verifyGrounding(
  original: ParsedResume,
  tailored: TailoredResumeContent
): string[] {
  const notes: string[] = [];
  const originalCorpus = buildResumeCorpus(original);
  const tailoredCorpus = buildResumeCorpus(tailored);

  const numberPattern = /\b\d+(?:[.,]\d+)?%?\b/g;
  const originalNumbers = new Set(originalCorpus.match(numberPattern) ?? []);
  const tailoredNumbers = tailoredCorpus.match(numberPattern) ?? [];
  const inventedNumbers = [...new Set(tailoredNumbers)].filter(
    (n) => !originalNumbers.has(n)
  );
  if (inventedNumbers.length > 0) {
    notes.push(
      `Self-check: metrics not found in master profile — review: ${inventedNumbers
        .slice(0, 8)
        .join(", ")}`
    );
  }

  const originalSkillSet = new Set(
    original.skills.map((skill) => skill.toLowerCase())
  );
  const addedSkills = tailored.skills.filter(
    (skill) => !originalSkillSet.has(skill.toLowerCase())
  );
  if (addedSkills.length > 0) {
    notes.push(
      `Self-check: skills introduced outside master profile — removed/ignored: ${addedSkills.join(
        ", "
      )}`
    );
  }

  return notes;
}
