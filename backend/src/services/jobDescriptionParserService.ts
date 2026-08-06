import { ParsedJobDescription } from "../types";

type SectionKey = "required" | "preferred" | "responsibilities";

interface SectionDefinition {
  key: SectionKey;
  /** Matches a full-line header, optionally with trailing content after a colon */
  pattern: RegExp;
}

const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: "required",
    pattern:
      /^(?:required(?:\s+skills?|\s+qualifications?)?|requirements|must[\s-]haves?|minimum\s+qualifications?|basic\s+qualifications?|qualifications|what\s+you(?:'ll|\s+will)\s+need|essential\s+skills?|core\s+skills?|technical\s+skills?)\s*:?\s*(.*)$/i,
  },
  {
    key: "preferred",
    pattern:
      /^(?:preferred(?:\s+skills?|\s+qualifications?)?|nice[\s-]to[\s-]haves?|bonus(?:\s+points?)?|desired(?:\s+skills?)?|plus(?:es)?|additional\s+skills?|good[\s-]to[\s-]haves?)\s*:?\s*(.*)$/i,
  },
  {
    key: "responsibilities",
    pattern:
      /^(?:responsibilities|key\s+responsibilities|what\s+you(?:'ll|\s+will)\s+do|duties|day[\s-]to[\s-]day|your\s+impact|what\s+you'll\s+be\s+doing)\s*:?\s*(.*)$/i,
  },
];

const TITLE_LABEL_PATTERN =
  /^(?:job\s+title|position|role|opening|title)\s*:\s*(.+)$/i;

const EXPERIENCE_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /(\d+)\s*\+\s*years?(?:\s+of)?(?:\s+(?:professional\s+)?experience)?/i,
    label: "years-plus",
  },
  {
    pattern: /(\d+)\s*[-–to]+\s*(\d+)\s*years?(?:\s+of)?(?:\s+(?:professional\s+)?experience)?/i,
    label: "years-range",
  },
  {
    pattern: /(\d+)\s*years?(?:\s+of)?(?:\s+(?:professional\s+)?experience)/i,
    label: "years",
  },
  { pattern: /\b(principal|staff|distinguished)\b/i, label: "Principal" },
  { pattern: /\b(lead|head\s+of)\b/i, label: "Lead" },
  { pattern: /\b(senior|sr\.?)\b/i, label: "Senior" },
  { pattern: /\b(mid[\s-]?level|intermediate)\b/i, label: "Mid-Level" },
  { pattern: /\b(junior|jr\.?|entry[\s-]?level)\b/i, label: "Junior" },
  { pattern: /\b(intern(?:ship)?|graduate|new\s+grad)\b/i, label: "Entry Level" },
];

/** Known tech / domain terms — matched case-insensitively, returned in canonical form */
const TECH_KEYWORDS = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C#",
  "C++",
  "Go",
  "Rust",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "Scala",
  "React Native",
  "React",
  "Next.js",
  "Vue",
  "Angular",
  "Svelte",
  "Node.js",
  "Express",
  "NestJS",
  "Django",
  "Flask",
  "FastAPI",
  "Spring Boot",
  "ASP.NET",
  ".NET",
  "GraphQL",
  "REST APIs",
  "REST",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Sass",
  "Webpack",
  "Vite",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "DynamoDB",
  "SQL",
  "NoSQL",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "CI/CD",
  "Jenkins",
  "GitHub Actions",
  "GitLab CI",
  "Git",
  "Linux",
  "Agile",
  "Scrum",
  "Jira",
  "Figma",
  "Microservices",
  "Machine Learning",
  "TensorFlow",
  "PyTorch",
  "Data Analysis",
  "Tableau",
  "Power BI",
  "Snowflake",
  "Spark",
  "Kafka",
  "RabbitMQ",
  "gRPC",
  "OAuth",
  "JWT",
  "TDD",
  "Unit Testing",
  "Jest",
  "Cypress",
  "Playwright",
  "Selenium",
  "Redux",
  "Zustand",
  "Prisma",
  "Accessibility",
];

const KEYWORD_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "your",
  "our",
  "will",
  "are",
  "have",
  "this",
  "that",
  "from",
  "into",
  "about",
  "role",
  "team",
  "work",
  "using",
  "ability",
  "experience",
  "skills",
  "strong",
  "excellent",
  "good",
  "plus",
  "required",
  "preferred",
  "responsibilities",
  "qualifications",
  "minimum",
  "requirements",
  "build",
  "collaborate",
  "write",
  "engineer",
  "senior",
  "junior",
  "lead",
  "developer",
  "software",
  "computer",
  "science",
  "bachelor",
  "degree",
  "proficiency",
  "company",
  "position",
  "looking",
  "seeking",
  "familiarity",
  "mentor",
  "optimize",
  "nice",
  "frontend",
  "backend",
]);

function escapeRegex(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\t/g, " ").trim();
}

function isBulletLine(line: string): boolean {
  return /^[\s]*(?:[-*•●▪◦]|\d+[.)])\s+/.test(line);
}

function stripBullet(line: string): string {
  return line.replace(/^[\s]*(?:[-*•●▪◦]|\d+[.)])\s+/, "").trim();
}

function detectSectionMatch(line: string): { key: SectionKey; inline: string } | null {
  const trimmed = line.trim();
  for (const { key, pattern } of SECTION_DEFINITIONS) {
    const match = trimmed.match(pattern);
    if (match) {
      return { key, inline: (match[1] ?? "").trim() };
    }
  }
  return null;
}

function isExperiencePhrase(text: string): boolean {
  return /\d+\s*\+?\s*years?/i.test(text) || /years?\s+of\s+(?:professional\s+)?experience/i.test(text);
}

function cleanSkillCandidate(item: string): string {
  return item
    .replace(/^(?:proficiency|experience|knowledge|familiarity|hands[\s-]?on\s+experience)\s+(?:in|with|of)\s+/i, "")
    .replace(/^(?:strong\s+)?(?:proficiency|background)\s+(?:in|with)\s+/i, "")
    .replace(/\.$/, "")
    .trim();
}

function dedupeItems(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const cleaned = item.trim();
    if (!cleaned || cleaned.length < 2) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

function findTechKeywordsInText(text: string): string[] {
  const found: string[] = [];
  const sorted = [...TECH_KEYWORDS].sort((a, b) => b.length - a.length);
  const matchedSpans: Array<{ start: number; end: number }> = [];

  for (const keyword of sorted) {
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = matchedSpans.some((span) => start < span.end && end > span.start);
      if (overlaps) continue;
      matchedSpans.push({ start, end });
      found.push(keyword);
    }
  }

  return dedupeItems(found);
}

/**
 * Extract skills from section lines:
 * - Prefer known tech keywords inside the line
 * - Fall back to short comma-separated tokens
 * - Skip year/experience phrases (handled by experienceLevel)
 */
function extractSkillsFromSectionLines(lines: string[]): string[] {
  const skills: string[] = [];

  for (const raw of lines) {
    const line = stripBullet(raw.trim());
    if (!line || isExperiencePhrase(line)) continue;

    const techInLine = findTechKeywordsInText(line);
    if (techInLine.length > 0) {
      skills.push(...techInLine);
      continue;
    }

    const cleaned = cleanSkillCandidate(line);
    if (!cleaned || cleaned.length > 60) continue;

    if (cleaned.includes(",")) {
      const parts = cleaned
        .split(",")
        .map((part) => cleanSkillCandidate(part.replace(/\band\b/gi, "").trim()))
        .filter((part) => part.length >= 2 && part.length <= 40 && !isExperiencePhrase(part));
      skills.push(...parts);
      continue;
    }

    if (cleaned.split(/\s+/).length <= 6) {
      skills.push(cleaned);
    }
  }

  return dedupeItems(skills);
}

function parseSections(text: string): Record<SectionKey, string[]> {
  const lines = normalizeText(text).split("\n");
  const sections: Record<SectionKey, string[]> = {
    required: [],
    preferred: [],
    responsibilities: [],
  };

  let currentSection: SectionKey | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentSection || buffer.length === 0) return;
    sections[currentSection].push(...buffer);
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const sectionMatch = detectSectionMatch(line);
    if (sectionMatch) {
      flush();
      currentSection = sectionMatch.key;
      if (sectionMatch.inline) {
        buffer.push(sectionMatch.inline);
      }
      continue;
    }

    if (currentSection) {
      buffer.push(line);
    }
  }

  flush();
  return sections;
}

function extractJobTitle(text: string): string | null {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 8)) {
    const labelMatch = line.match(TITLE_LABEL_PATTERN);
    if (labelMatch?.[1]) {
      return labelMatch[1].trim().replace(/\s{2,}/g, " ");
    }
  }

  for (const line of lines.slice(0, 5)) {
    if (isBulletLine(line)) continue;
    if (detectSectionMatch(line)) continue;
    if (line.length > 90) continue;
    if (/^(?:about|company|overview|description|we\s+are|looking\s+for)\b/i.test(line)) {
      continue;
    }

    const titleCandidate = line
      .replace(/\s*[-–|]\s*.+$/, "")
      .replace(/\s*\(.+\)\s*$/, "")
      .trim();

    if (titleCandidate.length >= 3 && titleCandidate.length <= 70) {
      return titleCandidate;
    }
  }

  return null;
}

function extractExperienceLevel(text: string): string | null {
  for (const { pattern, label } of EXPERIENCE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    if (label === "years-plus") {
      return `${match[1]}+ years`;
    }
    if (label === "years-range") {
      return `${match[1]}-${match[2]} years`;
    }
    if (label === "years") {
      return `${match[1]} years`;
    }
    return label;
  }

  return null;
}

function extractKeywords(
  text: string,
  requiredSkills: string[],
  preferredSkills: string[],
  extraKeywords: string[] = []
): string[] {
  const keywords: string[] = [];

  keywords.push(...findTechKeywordsInText(text));

  for (const keyword of [...requiredSkills, ...preferredSkills, ...extraKeywords]) {
    const trimmed = keyword.trim();
    if (!trimmed || trimmed.split(/\s+/).length > 4) continue;
    if (KEYWORD_STOP_WORDS.has(trimmed.toLowerCase())) continue;
    if (isExperiencePhrase(trimmed)) continue;
    keywords.push(trimmed);
  }

  return dedupeItems(keywords).slice(0, 25);
}

function inferSkillsFromContext(text: string, contextPattern: RegExp): string[] {
  const inferred: string[] = [];
  for (const keyword of TECH_KEYWORDS) {
    const pattern = new RegExp(
      `${contextPattern.source}[^.\\n]{0,80}\\b${escapeRegex(keyword)}\\b`,
      "i"
    );
    if (pattern.test(text)) {
      inferred.push(keyword);
    }
  }
  return inferred;
}

function inferRequiredSkills(text: string, sectionLines: string[]): string[] {
  const fromSection = extractSkillsFromSectionLines(sectionLines);
  if (fromSection.length > 0) {
    return fromSection;
  }

  const fromContext = inferSkillsFromContext(
    text,
    /(?:required|must\s+have|proficiency\s+in|experience\s+with|strong\s+(?:knowledge|background)\s+in)/i
  );

  if (fromContext.length > 0) {
    return dedupeItems(fromContext);
  }

  return findTechKeywordsInText(text).slice(0, 12);
}

function inferPreferredSkills(text: string, sectionLines: string[]): string[] {
  const fromSection = extractSkillsFromSectionLines(sectionLines);
  if (fromSection.length > 0) {
    return fromSection;
  }

  return dedupeItems(
    inferSkillsFromContext(
      text,
      /(?:preferred|nice\s+to\s+have|bonus|desired|plus|good\s+to\s+have)/i
    )
  );
}

function inferResponsibilities(sectionLines: string[], fullText: string): string[] {
  const fromSection = sectionLines
    .map((line) => stripBullet(line.trim()))
    .filter((line) => line.length >= 12 && line.length <= 220);

  if (fromSection.length > 0) {
    return dedupeItems(fromSection).slice(0, 15);
  }

  const actionStart =
    /^(?:build|design|develop|create|implement|lead|own|collaborate|partner|write|maintain|improve|optimize|mentor|drive|deliver|architect|ship|support|manage|coordinate|ensure|contribute|work\s+with)\b/i;

  const inferred = normalizeText(fullText)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => isBulletLine(line))
    .map((line) => stripBullet(line))
    .filter((line) => line.length >= 12 && line.length <= 220 && actionStart.test(line));

  return dedupeItems(inferred).slice(0, 15);
}

export class JobDescriptionParserService {
  parse(jobDescription: string, extraKeywords: string[] = []): ParsedJobDescription {
    const text = normalizeText(jobDescription);
    const sections = parseSections(text);

    const requiredSkills = inferRequiredSkills(text, sections.required);
    const preferredSkills = inferPreferredSkills(text, sections.preferred).filter(
      (skill) => !requiredSkills.some((required) => required.toLowerCase() === skill.toLowerCase())
    );
    const responsibilities = inferResponsibilities(sections.responsibilities, text);
    const jobTitle = extractJobTitle(text);
    const experienceLevel = extractExperienceLevel(text);
    const keywords = extractKeywords(text, requiredSkills, preferredSkills, extraKeywords);

    return {
      jobTitle,
      requiredSkills,
      preferredSkills,
      responsibilities,
      experienceLevel,
      keywords,
    };
  }
}

export const jobDescriptionParserService = new JobDescriptionParserService();
