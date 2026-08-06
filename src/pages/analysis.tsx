import { Link } from "react-router-dom";
import {
  FileText,
  Briefcase,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Lightbulb,
  Upload,
  ListChecks,
} from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResumeSession } from "@/context/resume-session";
import type { ParsedResume } from "@/types/resume";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function buildResumeCorpus(resume: ParsedResume): string {
  return [
    resume.summary ?? "",
    ...resume.skills,
    ...(resume.certifications ?? []),
    ...resume.experience.flatMap((job) => [
      job.role,
      job.company,
      job.subtitle ?? "",
      ...job.highlights,
    ]),
    ...(resume.projects ?? []).flatMap((project) => [
      project.name,
      project.description ?? "",
      ...(project.highlights ?? []),
      ...(project.technologies ?? []),
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

/** True if skill/theme appears as skill list hit OR as phrase in resume body. */
function resumeEvidences(skill: string, skillSet: Set<string>, corpus: string) {
  const key = normalize(skill);
  if (!key) return false;
  if (skillSet.has(key)) return true;
  if (key.length >= 3 && corpus.includes(key)) return true;

  // Soft match for multi-word themes (all significant tokens present).
  const tokens = key.split(/[^a-z0-9+#.]+/).filter((t) => t.length > 2);
  if (tokens.length >= 2) {
    return tokens.every((token) => corpus.includes(token));
  }
  return false;
}

export function AnalysisPage() {
  const { originalResume, parsedJd, instructions } = useResumeSession();

  if (!originalResume) {
    return (
      <PageShell>
        <EmptyState
          icon={Upload}
          title="Upload your resume first"
          description="Analysis compares your uploaded resume with the job you’re applying for."
        >
          <Link to="/upload">
            <Button>Upload Resume</Button>
          </Link>
        </EmptyState>
      </PageShell>
    );
  }

  if (!parsedJd) {
    return (
      <PageShell>
        <EmptyState
          icon={FileText}
          title="Add a job description"
          description="Paste the posting you’re targeting so we can show where you fit — and where you don’t."
        >
          <Link to="/job-description">
            <Button>Paste Job Description</Button>
          </Link>
        </EmptyState>
      </PageShell>
    );
  }

  const resumeSkillSet = new Set(originalResume.skills.map(normalize));
  const corpus = buildResumeCorpus(originalResume);
  const jdSkills = [
    ...parsedJd.requiredSkills,
    ...parsedJd.preferredSkills,
  ];
  const uniqueJdSkills = Array.from(
    new Map(jdSkills.map((skill) => [normalize(skill), skill])).values()
  );

  const matchingSkills = uniqueJdSkills.filter((skill) =>
    resumeEvidences(skill, resumeSkillSet, corpus)
  );
  const missingSkills = uniqueJdSkills.filter(
    (skill) => !resumeEvidences(skill, resumeSkillSet, corpus)
  );

  const responsibilityHits = parsedJd.responsibilities.filter((item) => {
    const tokens = normalize(item)
      .split(/[^a-z0-9+#.]+/)
      .filter((t) => t.length > 3)
      .slice(0, 6);
    if (tokens.length === 0) return false;
    const hitCount = tokens.filter((token) => corpus.includes(token)).length;
    return hitCount >= Math.min(2, tokens.length);
  });

  const strengths: string[] = [];
  if (matchingSkills.length > 0) {
    strengths.push(
      `Your background already covers ${matchingSkills
        .slice(0, 5)
        .join(", ")}${matchingSkills.length > 5 ? ", and more" : ""}.`
    );
  }
  if (responsibilityHits.length > 0) {
    strengths.push(
      `Several role responsibilities look familiar from your experience (e.g. themes around ${responsibilityHits
        .slice(0, 2)
        .map((r) => r.split(/[,.(]/)[0].trim())
        .join("; ")}).`
    );
  }
  if (originalResume.experience.length > 0) {
    strengths.push(
      `${originalResume.experience.length} role${
        originalResume.experience.length === 1 ? "" : "s"
      } ready to reframe for ${
        parsedJd.jobTitle || instructions.targetRole || "this job"
      }.`
    );
  }
  if (strengths.length === 0) {
    strengths.push(
      "We couldn’t find clear overlaps yet — generate a tailored version after clarifying skills on your resume."
    );
  }

  const improvements: string[] = missingSkills.slice(0, 6).map((skill) => {
    const isRequired = parsedJd.requiredSkills.some(
      (required) => normalize(required) === normalize(skill)
    );
    return isRequired
      ? `This role expects ${skill}. If you’ve done related work, make it explicit before generating.`
      : `${skill} is listed as preferred — add it only if it’s real experience.`;
  });

  const uncoveredResponsibilities = parsedJd.responsibilities
    .filter((item) => !responsibilityHits.includes(item))
    .slice(0, 3);

  for (const item of uncoveredResponsibilities) {
    improvements.push(
      `JD asks you to: “${item.length > 110 ? `${item.slice(0, 110)}…` : item}” — check whether your bullets already show this.`
    );
  }

  if (improvements.length === 0) {
    improvements.push(
      "No major gaps jumped out. Review responsibilities wording so your tailored resume mirrors this posting’s language."
    );
  }

  const targetLabel =
    parsedJd.jobTitle || instructions.targetRole || "Target role";

  return (
    <PageShell>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-surface-400">
                Matching signals
              </p>
              <p className="text-2xl font-bold text-surface-900">
                {matchingSkills.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-surface-400">
                Gaps to review
              </p>
              <p className="text-2xl font-bold text-surface-900">
                {missingSkills.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary-500" />
                  Your resume
                </CardTitle>
                <CardDescription className="mt-1.5">
                  From your upload
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {originalResume.experience.length} roles
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-base font-semibold text-surface-900">
                {originalResume.fullName}
              </p>
              <p className="text-sm text-primary-600">
                {originalResume.experience[0]?.role || "Candidate"}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-surface-600">
              {originalResume.summary ||
                "No summary on file yet — we’ll still use your roles and skills."}
            </p>
            <div className="flex flex-wrap gap-2">
              {originalResume.skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary-500" />
                  This job
                </CardTitle>
                <CardDescription className="mt-1.5">
                  Extracted from the posting (any section layout)
                </CardDescription>
              </div>
              {parsedJd.experienceLevel && (
                <Badge variant="warning">{parsedJd.experienceLevel}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-base font-semibold text-surface-900">
                {targetLabel}
              </p>
              <p className="text-sm text-surface-500">Role you’re targeting</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">
                Must-haves
              </p>
              <div className="flex flex-wrap gap-2">
                {parsedJd.requiredSkills.length > 0 ? (
                  parsedJd.requiredSkills.map((skill) => (
                    <Badge key={skill} variant="default">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-surface-400">
                    None clearly marked as required.
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-400">
                Nice to have
              </p>
              <div className="flex flex-wrap gap-2">
                {parsedJd.preferredSkills.length > 0 ? (
                  parsedJd.preferredSkills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-surface-400">
                    No separate preferred list in this posting.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {parsedJd.responsibilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary-500" />
              What this role actually does
            </CardTitle>
            <CardDescription>
              Pulled from the posting by meaning — not only from a
              “Responsibilities” header.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {parsedJd.responsibilities.slice(0, 10).map((item) => {
                const covered = responsibilityHits.includes(item);
                return (
                  <li
                    key={item}
                    className="flex gap-3 rounded-xl border border-surface-100 bg-surface-50/60 p-3 text-sm text-surface-700"
                  >
                    {covered ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-surface-300" />
                    )}
                    <span>
                      {item}
                      {covered ? (
                        <span className="ml-2 text-xs font-medium text-emerald-600">
                          Possible overlap
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Matching skills & themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {matchingSkills.length > 0 ? (
                matchingSkills.map((skill) => (
                  <Badge key={skill} variant="success">
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-surface-400">
                  No clear overlaps yet in skills or resume wording.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Missing from your resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {missingSkills.length > 0 ? (
                missingSkills.map((skill) => (
                  <Badge key={skill} variant="danger">
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-surface-400">
                  No major skill gaps detected.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {strengths.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-sm text-surface-700"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Gaps to think about
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {improvements.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-sm text-surface-700"
                >
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary-200 bg-primary-50/40">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100">
              <Sparkles className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-900">
                Ready to tailor for this role?
              </p>
              <p className="mt-1 text-sm text-surface-500">
                We’ll rewrite your real experience in this job’s language — without
                inventing missing skills.
              </p>
            </div>
          </div>
          <Link to="/generator">
            <Button>
              Continue to Generator
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </PageShell>
  );
}
