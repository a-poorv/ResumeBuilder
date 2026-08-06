import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Lightbulb, ArrowRight, Clipboard, Trash2, Loader2 } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useResumeSession } from "@/context/resume-session";
import { analyzeJobDescription } from "@/lib/api";
import type { UserInstructions } from "@/types/resume";

export function JobDescriptionPage() {
  const navigate = useNavigate();
  const {
    jobDescriptionText,
    instructions,
    setJobDescriptionText,
    setParsedJd,
    setInstructions,
  } = useResumeSession();

  const [jobDescription, setJobDescription] = useState(jobDescriptionText);
  const [targetRole, setTargetRole] = useState(instructions.targetRole ?? "");
  const [highlightSkills, setHighlightSkills] = useState(
    (instructions.highlightSkills ?? []).join(", ")
  );
  const [keepUnchanged, setKeepUnchanged] = useState(
    (instructions.keepUnchanged ?? []).join(", ")
  );
  const [resumeLength, setResumeLength] = useState<
    NonNullable<UserInstructions["resumeLength"]>
  >(instructions.resumeLength ?? "auto");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClear = () => setJobDescription("");

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJobDescription(text);
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  };

  const splitList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const handleContinue = async () => {
    if (!jobDescription.trim()) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const nextInstructions: UserInstructions = {
        targetRole: targetRole.trim() || undefined,
        highlightSkills: splitList(highlightSkills),
        keepUnchanged: splitList(keepUnchanged),
        resumeLength,
      };

      const parsed = await analyzeJobDescription({
        jobDescription,
        highlightSkills: highlightSkills.trim() || undefined,
      });

      setJobDescriptionText(jobDescription);
      setInstructions(nextInstructions);
      setParsedJd(parsed);
      navigate("/analysis");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze job description.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const charCount = jobDescription.length;
  const wordCount =
    jobDescription.trim() === ""
      ? 0
      : jobDescription.trim().split(/\s+/).length;

  return (
    <PageShell>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
              <CardDescription>
                Paste the full posting. We read it by meaning — any layout,
                any section titles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-xl border border-error-500/20 bg-error-500/5 p-3 text-sm text-error-500">
                  {error}
                </div>
              )}
              <div className="relative">
                <textarea
                  id="job-description-input"
                  rows={12}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here…"
                  className="w-full resize-none rounded-xl border border-surface-300 bg-surface-50/50 px-4 py-3 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handlePaste}
                    type="button"
                    className="h-8 px-2.5 text-xs text-surface-600 bg-white"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                    Paste
                  </Button>
                  {jobDescription && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClear}
                      type="button"
                      className="h-8 px-2.5 text-xs text-error-500 border-error-200 hover:bg-error-50 hover:border-error-300 bg-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-surface-400">
                <p>
                  {charCount.toLocaleString()} characters ·{" "}
                  {wordCount.toLocaleString()} words
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Additional Instructions{" "}
                <span className="font-normal text-sm text-surface-400">(optional)</span>
              </CardTitle>
              <CardDescription>
                Customize how the AI optimizes your experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="target-role" className="text-xs font-semibold text-surface-700">
                  Target Role Title
                </label>
                <input
                  id="target-role"
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="rounded-xl border border-surface-300 bg-surface-50/50 px-3.5 py-2 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus:border-primary-400 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="resume-length" className="text-xs font-semibold text-surface-700">
                  Target Resume Length
                </label>
                <select
                  id="resume-length"
                  value={resumeLength}
                  onChange={(e) =>
                    setResumeLength(
                      e.target.value as "auto" | "1page" | "2page" | "same"
                    )
                  }
                  className="rounded-xl border border-surface-300 bg-surface-50/50 px-3.5 py-2 text-sm text-surface-900 transition-colors focus:border-primary-400 focus:bg-white focus:outline-none"
                >
                  <option value="auto">Auto (Balanced)</option>
                  <option value="1page">Keep to 1 Page</option>
                  <option value="2page">Keep to 2 Pages</option>
                  <option value="same">Keep original length</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="highlight-skills" className="text-xs font-semibold text-surface-700">
                  Highlight Specific Skills / Keywords
                </label>
                <input
                  id="highlight-skills"
                  type="text"
                  value={highlightSkills}
                  onChange={(e) => setHighlightSkills(e.target.value)}
                  placeholder="e.g. React, Next.js, WebGL (comma separated)"
                  className="rounded-xl border border-surface-300 bg-surface-50/50 px-3.5 py-2 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus:border-primary-400 focus:bg-white focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="keep-unchanged" className="text-xs font-semibold text-surface-700">
                  Sections or details to keep exactly unchanged
                </label>
                <input
                  id="keep-unchanged"
                  type="text"
                  value={keepUnchanged}
                  onChange={(e) => setKeepUnchanged(e.target.value)}
                  placeholder="e.g. Personal details, Education, Project Alpha"
                  className="rounded-xl border border-surface-300 bg-surface-50/50 px-3.5 py-2 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus:border-primary-400 focus:bg-white focus:outline-none"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              size="lg"
              disabled={!jobDescription.trim() || isAnalyzing}
              onClick={handleContinue}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  Continue to Analysis
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm">Pro Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-surface-600">
              <p>
                <strong className="text-surface-800">Paste the whole listing:</strong>{" "}
                Duties, must-haves, and preferred items — even if headers differ
                from “Responsibilities” / “Requirements.”
              </p>
              <p>
                <strong className="text-surface-800">Keep the messy parts:</strong>{" "}
                Tools, credentials, and day-to-day language help match analysis.
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="flex items-start gap-3 p-5">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Target role (optional)
                </p>
                <p className="mt-1 text-xs text-amber-600">
                  If the posting title is vague, set the role you want so
                  tailoring uses the right lens.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
