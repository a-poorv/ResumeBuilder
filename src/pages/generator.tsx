import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Copy,
  Download,
  Sparkles,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  FileText,
  Info,
} from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ResumeDocument } from "@/components/resume/resume-document";
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
import { generateTailoredResume } from "@/lib/api";
import {
  parsedResumeToPreview,
  tailoredContentToPreview,
} from "@/lib/resume-mappers";
import { resumeToPlainText } from "@/types/resume";
import { downloadResumeDocx, downloadResumePdf } from "@/lib/export-resume";

export function GeneratorPage() {
  const {
    originalResume,
    parsedJd,
    instructions,
    tailoredResume,
    decision,
    setTailoredResume,
    setDecision,
    clearTailored,
  } = useResumeSession();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState<"pdf" | "docx" | null>(null);

  const originalPreview = originalResume
    ? parsedResumeToPreview(originalResume)
    : null;
  const tailoredPreview = tailoredResume
    ? tailoredContentToPreview(tailoredResume.tailoredContent)
    : null;

  const canGenerate = Boolean(originalResume && parsedJd);
  const hasTailored = Boolean(tailoredPreview);
  const exportBusy = isExporting !== null;

  // Clear stale "accepted" if tailored resume is missing
  useEffect(() => {
    if (!tailoredResume && decision === "accepted") {
      setDecision("pending");
    }
  }, [tailoredResume, decision, setDecision]);

  const handleGenerate = async () => {
    if (!originalResume || !parsedJd) return;
    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateTailoredResume({
        resume: originalResume,
        jobDescription: parsedJd,
        instructions,
      });
      setTailoredResume(result);
      setDecision("pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!tailoredPreview) return;
    try {
      await navigator.clipboard.writeText(resumeToPlainText(tailoredPreview));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleReject = () => {
    setDecision("rejected");
    clearTailored();
  };

  const handleExportPdf = () => {
    if (!tailoredPreview) return;
    setError(null);
    setIsExporting("pdf");
    try {
      downloadResumePdf(tailoredPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF export failed.");
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportDocx = async () => {
    if (!tailoredPreview) return;
    setError(null);
    setIsExporting("docx");
    try {
      await downloadResumeDocx(tailoredPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "DOCX export failed.");
    } finally {
      setIsExporting(null);
    }
  };

  if (!originalResume) {
    return (
      <PageShell>
        <EmptyState
          icon={Upload}
          title="Upload your resume first"
          description="Preview compares your uploaded resume with a tailored version generated for you."
        >
          <Link to="/upload">
            <Button>
              Upload Resume
              <Upload className="h-4 w-4" />
            </Button>
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
          description="We need your target JD in session before generating a tailored resume preview."
        >
          <Link to="/job-description">
            <Button>
              Paste Job Description
              <FileText className="h-4 w-4" />
            </Button>
          </Link>
        </EmptyState>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-none">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary-500" />
                Resume Preview
              </CardTitle>
              <CardDescription className="mt-1.5">
                Compare original vs tailored, then download PDF or DOCX.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{originalResume.fullName}</Badge>
              {hasTailored ? (
                <Badge variant="success">Tailored ready</Badge>
              ) : (
                <Badge variant="warning">Not generated yet</Badge>
              )}
              {typeof tailoredResume?.matchScore === "number" && (
                <Badge variant="secondary">
                  {typeof tailoredResume.matchScoreBefore === "number"
                    ? `${tailoredResume.matchScoreBefore}% → ${tailoredResume.matchScore}%`
                    : `${tailoredResume.matchScore}% match`}
                </Badge>
              )}
              {decision === "accepted" && hasTailored && (
                <Badge variant="success">Accepted</Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 border-t border-surface-100 pt-4">
          {!hasTailored && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">Generate a tailored resume first</p>
                <p className="mt-0.5 text-amber-800/90">
                  Accept, Copy stay disabled until you click{" "}
                  <strong>Generate Tailored Resume</strong>. Download buttons
                  appear at the bottom after generation. The resume below on the
                  left is your original upload only.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {hasTailored ? "Regenerate" : "Generate Tailored Resume"}
                </>
              )}
            </Button>

            <Button
              variant="secondary"
              onClick={() => setDecision("accepted")}
              disabled={!hasTailored || decision === "accepted"}
              title={
                !hasTailored
                  ? "Generate a tailored resume first"
                  : decision === "accepted"
                    ? "Already accepted"
                    : "Accept this tailored version"
              }
            >
              <Check className="h-4 w-4" />
              Accept
            </Button>

            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!hasTailored}
              title={!hasTailored ? "Generate a tailored resume first" : "Reject"}
            >
              <X className="h-4 w-4" />
              Reject
            </Button>

            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={!hasTailored}
              title={!hasTailored ? "Generate a tailored resume first" : "Copy"}
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          {decision === "accepted" && hasTailored && (
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Tailored resume accepted — use Download PDF / DOCX at the bottom.
            </div>
          )}
          {decision === "rejected" && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="h-4 w-4" />
              Tailored resume rejected. Generate again to continue.
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl border border-error-500/20 bg-error-500/5 p-4 text-sm text-error-500">
          {error}
        </div>
      )}

      {/* Side-by-side from lg breakpoint so both panes are visible */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <h3 className="text-sm font-semibold text-surface-600">
              Original Resume
            </h3>
            <Badge variant="secondary">Your upload</Badge>
          </div>
          {originalPreview && <ResumeDocument resume={originalPreview} />}
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-primary-700">
              <Sparkles className="h-4 w-4" />
              Tailored Resume
            </h3>
            <Badge variant={hasTailored ? "default" : "warning"}>
              {hasTailored ? "Generated for you" : "Waiting for generate"}
            </Badge>
          </div>

          {hasTailored && originalPreview && tailoredPreview ? (
            <ResumeDocument
              resume={tailoredPreview}
              compareWith={originalPreview}
              highlightChanges
              className="border-primary-200 shadow-md shadow-primary-500/5"
            />
          ) : (
            <Card className="border-dashed border-primary-200 bg-primary-50/30">
              <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-8 text-center">
                <Sparkles className="h-8 w-8 text-primary-400" />
                <div>
                  <p className="text-sm font-semibold text-surface-800">
                    No tailored resume yet
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-surface-500">
                    Click the purple <strong>Generate Tailored Resume</strong>{" "}
                    button above. After it finishes, scroll to the bottom for
                    Download PDF / DOCX.
                  </p>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Tailored Resume
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {hasTailored && (
        <>
          {(typeof tailoredResume?.matchScore === "number" ||
            tailoredResume?.atsCoverage) && (
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-surface-900">
                  ATS match (before → after)
                </CardTitle>
                <CardDescription>
                  Weighted keyword coverage against this JD. After score includes
                  a second pass that places evidenced terms still missing from
                  the first draft.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  {typeof tailoredResume?.matchScoreBefore === "number" ? (
                    <Badge variant="secondary">
                      Before {tailoredResume.matchScoreBefore}%
                    </Badge>
                  ) : null}
                  {typeof tailoredResume?.matchScore === "number" ? (
                    <Badge variant="success">
                      After {tailoredResume.matchScore}%
                    </Badge>
                  ) : null}
                  {typeof tailoredResume?.matchScoreBefore === "number" &&
                  typeof tailoredResume?.matchScore === "number" &&
                  tailoredResume.matchScore > tailoredResume.matchScoreBefore ? (
                    <span className="text-sm text-emerald-800">
                      +
                      {tailoredResume.matchScore -
                        tailoredResume.matchScoreBefore}{" "}
                      pts
                    </span>
                  ) : null}
                </div>
                {tailoredResume?.atsCoverage ? (
                  <div className="grid gap-2 text-sm text-surface-700 sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-surface-800">
                        Evidenced terms placed:{" "}
                      </span>
                      {tailoredResume.atsCoverage.placed.length}/
                      {tailoredResume.atsCoverage.mustPlace.length}
                    </p>
                    <p>
                      <span className="font-medium text-surface-800">
                        True gaps (not invented):{" "}
                      </span>
                      {tailoredResume.atsCoverage.gaps.length}
                    </p>
                    {tailoredResume.atsCoverage.missing.length > 0 ? (
                      <p className="sm:col-span-2 text-amber-900">
                        Still weak:{" "}
                        {tailoredResume.atsCoverage.missing
                          .slice(0, 8)
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {tailoredResume?.tailoredContent?.notesForUser?.length ? (
            <Card className="border-amber-200 bg-amber-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-surface-900">
                  <Info className="h-4 w-4 text-amber-700" />
                  Fit & gap analysis
                </CardTitle>
                <CardDescription>
                  How we aligned your experience to this job application, and
                  where the JD still asks for things your resume does not show.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm text-surface-700">
                  {tailoredResume.tailoredContent.notesForUser.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-primary-200 bg-primary-50/40">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-surface-900">
                  Export tailored resume
                </p>
                <p className="mt-1 text-xs text-surface-500">
                  ATS-friendly single-column PDF or DOCX. No tables, icons, or
                  images.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleExportPdf} disabled={exportBusy}>
                  {isExporting === "pdf" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download PDF
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportDocx}
                  disabled={exportBusy}
                >
                  {isExporting === "docx" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download DOCX
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-wrap items-center gap-4 p-4 text-xs text-surface-500">
              <span className="font-medium text-surface-600">Legend</span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-8 rounded bg-amber-50 ring-1 ring-inset ring-amber-200" />
                Changed line
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-8 rounded bg-white ring-1 ring-inset ring-surface-200" />
                Unchanged
              </span>
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}
