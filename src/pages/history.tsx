import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { History, Search, Sparkles } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useResumeSession } from "@/context/resume-session";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { useSyncGenerationHistory } from "@/hooks/use-sync-generation-history";

export function HistoryPage() {
  useSyncGenerationHistory();
  const { generationHistory, setTailoredResume } = useResumeSession();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return generationHistory;
    return generationHistory.filter((item) => {
      const haystack = [
        item.targetRole,
        item.tailoredContent?.fullName,
        ...(item.tailoredContent?.highlightedSkills ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [generationHistory, query]);

  const thisMonth = generationHistory.filter((item) => {
    const date = new Date(item.generatedAt);
    if (Number.isNaN(date.getTime())) return false;
    const now = new Date();
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }).length;

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

  return (
    <PageShell>
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              id="history-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by job title or keywords…"
              className="w-full rounded-xl border border-surface-300 bg-surface-50/50 py-2.5 pl-10 pr-4 text-sm text-surface-900 placeholder:text-surface-400 transition-colors focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-surface-900">
              {generationHistory.length}
            </p>
            <p className="text-xs text-surface-400">Total Resumes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-surface-900">{thisMonth}</p>
            <p className="text-xs text-surface-400">This Month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold text-primary-600">
              {avgMatch === null ? "—%" : `${avgMatch}%`}
            </p>
            <p className="text-xs text-surface-400">Avg Match Rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tailored Resumes</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState
              icon={History}
              title="No History Yet"
              description="Once you generate tailored resumes, they'll appear here for easy access."
            >
              <Link to="/generator">
                <Button>
                  <Sparkles className="h-4 w-4" />
                  Go to Generator
                </Button>
              </Link>
            </EmptyState>
          ) : (
            <ul className="divide-y divide-surface-100">
              {filtered.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-surface-900">
                        {item.targetRole || "Tailored resume"}
                      </p>
                      {typeof item.matchScore === "number" && (
                        <Badge variant="secondary">{item.matchScore}% match</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-surface-400">
                      {formatRelativeTime(item.generatedAt)} · {item.source}
                    </p>
                  </div>
                  <Link
                    to="/generator"
                    onClick={() => setTailoredResume(item)}
                  >
                    <Button variant="secondary" size="sm">
                      Open in Generator
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
