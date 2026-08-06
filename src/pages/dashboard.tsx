import { Link } from "react-router-dom";
import {
  Upload,
  FileText,
  SearchCheck,
  Sparkles,
  History,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Clock,
} from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useResumeSession } from "@/context/resume-session";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { useSyncGenerationHistory } from "@/hooks/use-sync-generation-history";

/* ── Quick-action cards ────────────────────────────────── */
const quickActions = [
  {
    label: "Upload Resume",
    description: "Start with your master resume",
    path: "/upload",
    icon: Upload,
    color: "from-violet-500 to-purple-600",
  },
  {
    label: "Paste Job Description",
    description: "Add the role you're targeting",
    path: "/job-description",
    icon: FileText,
    color: "from-blue-500 to-cyan-500",
  },
  {
    label: "Analyze Match",
    description: "See how well you fit",
    path: "/analysis",
    icon: SearchCheck,
    color: "from-emerald-500 to-green-500",
  },
  {
    label: "Generate Resume",
    description: "AI-tailored in seconds",
    path: "/generator",
    icon: Sparkles,
    color: "from-amber-500 to-orange-500",
  },
];

export function DashboardPage() {
  useSyncGenerationHistory();
  const { generationHistory } = useResumeSession();

  const resumesTailored = generationHistory.length;
  const scored = generationHistory.filter(
    (item) => typeof item.matchScore === "number"
  );
  const avgMatch =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, item) => sum + (item.matchScore ?? 0), 0) /
            scored.length
        )
      : null;
  const lastGenerated = generationHistory[0]?.generatedAt ?? null;
  const recent = generationHistory.slice(0, 5);

  const stats = [
    {
      label: "Resumes Tailored",
      value: String(resumesTailored),
      icon: FileCheck,
    },
    {
      label: "Match Rate (avg)",
      value: avgMatch === null ? "—" : `${avgMatch}%`,
      icon: TrendingUp,
    },
    {
      label: "Last Generated",
      value: formatRelativeTime(lastGenerated),
      icon: Clock,
    },
  ];

  return (
    <PageShell>
      {/* ── Hero Banner ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-8 text-white shadow-xl shadow-primary-500/20 md:p-10">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5" />

        <Badge className="mb-4 bg-white/15 text-white backdrop-blur-sm">
          Beta
        </Badge>
        <h1 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">
          Tailor your resume with AI
        </h1>
        <p className="mb-6 max-w-lg text-sm text-primary-200">
          Upload your master resume, paste a job description, and let AI craft a
          perfectly tailored version — without inventing a single detail.
        </p>
        <Link to="/upload">
          <Button
            size="lg"
            className="bg-white text-primary-700 shadow-lg hover:bg-primary-50"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* ── Stats Row ────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50">
                <stat.icon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-surface-400">
                  {stat.label}
                </p>
                <p className="text-xl font-bold text-surface-900">
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Quick Actions ────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-surface-700">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.path} to={action.path} className="group">
              <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <CardHeader>
                  <div
                    className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} shadow-sm`}
                  >
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-sm">{action.label}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Link to="/history">
              <Button variant="ghost" size="sm">
                View all
                <History className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100">
                <History className="h-6 w-6 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-500">
                No activity yet
              </p>
              <p className="mt-1 text-xs text-surface-400">
                Your tailored resumes will appear here after you generate
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-surface-100">
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-surface-800">
                      {item.targetRole || "Tailored resume"}
                    </p>
                    <p className="text-xs text-surface-400">
                      {formatRelativeTime(item.generatedAt)}
                      {typeof item.matchScore === "number"
                        ? ` · ${item.matchScore}% match`
                        : ""}
                    </p>
                  </div>
                  <Link to="/generator">
                    <Button variant="ghost" size="sm">
                      Open
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
