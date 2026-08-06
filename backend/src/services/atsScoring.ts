import {
  ParsedJobDescription,
  ParsedResume,
  TailoredResumeContent,
} from "../types";

export type ResumeCorpusSource = Pick<
  ParsedResume | TailoredResumeContent,
  "summary" | "skills" | "experience" | "projects" | "certifications"
>;

export function buildResumeCorpus(resume: ResumeCorpusSource): string {
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

/**
 * Prefer exact/near-exact phrase hits. Multi-token soft match only when
 * every meaningful token appears (avoids rewarding long noisy originals).
 */
export function phraseFoundInCorpus(phrase: string, corpus: string): boolean {
  const key = phrase.trim().toLowerCase();
  if (!key) return false;
  if (corpus.includes(key)) return true;

  // Common ATS aliases
  const aliases: Record<string, string[]> = {
    "node.js": ["nodejs", "node js"],
    nodejs: ["node.js", "node js"],
    "ci/cd": ["cicd", "ci cd"],
    "rest apis": ["rest api", "restful api", "restful apis"],
    "rest api": ["rest apis", "restful api"],
  };
  for (const alias of aliases[key] ?? []) {
    if (corpus.includes(alias)) return true;
  }

  const tokens = key.split(/[^a-z0-9+#.]+/).filter((token) => token.length > 2);
  if (tokens.length >= 2) {
    return tokens.every((token) => corpus.includes(token));
  }
  // Single short tokens (e.g. "sql", "aws") — whole-word-ish check
  if (tokens.length === 1) {
    const token = tokens[0];
    const re = new RegExp(
      `(^|[^a-z0-9+#.])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9+#.]|$)`,
      "i"
    );
    return re.test(corpus);
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

function weightedJdTerms(
  jd: ParsedJobDescription
): Array<{ term: string; weight: number }> {
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
  return Array.from(byTerm.values());
}

/**
 * Honest JD keyword fit from skills/keywords only (no fuzzy responsibility
 * bonus — that was rewarding long original resumes and causing after < before).
 */
export function estimateMatchScore(
  resume: ResumeCorpusSource,
  jd: ParsedJobDescription
): number | null {
  const terms = weightedJdTerms(jd);
  if (terms.length === 0) return null;

  const corpus = buildResumeCorpus(resume);
  let earned = 0;
  let possible = 0;
  for (const item of terms) {
    possible += item.weight;
    if (phraseFoundInCorpus(item.term, corpus)) {
      earned += item.weight;
    }
  }
  return Math.round((earned / possible) * 100);
}

/** Max honest score if every evidenced term is placed and gaps stay missing. */
export function estimateFitCeiling(
  mustPlace: string[],
  jd: ParsedJobDescription
): number | null {
  const terms = weightedJdTerms(jd);
  if (terms.length === 0) return null;

  const mustSet = new Set(mustPlace.map((t) => t.trim().toLowerCase()));
  let earned = 0;
  let possible = 0;
  for (const item of terms) {
    possible += item.weight;
    if (mustSet.has(item.term.trim().toLowerCase())) {
      earned += item.weight;
    }
  }
  return Math.round((earned / possible) * 100);
}

export function coverageAgainstTerms(
  resume: ResumeCorpusSource,
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

export function placementPercent(placed: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((placed / total) * 100);
}

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
