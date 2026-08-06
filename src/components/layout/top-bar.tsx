import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Welcome back — here's your overview" },
  "/upload": {
    title: "Upload Resume",
    subtitle: "Upload your master resume to get started",
  },
  "/job-description": {
    title: "Job Description",
    subtitle: "Paste the job posting you're targeting",
  },
  "/analysis": {
    title: "Resume Analysis",
    subtitle: "See how your resume matches the job",
  },
  "/generator": {
    title: "Resume Generator",
    subtitle: "Generate a tailored resume for this role",
  },
  "/history": {
    title: "History",
    subtitle: "Browse your previously tailored resumes",
  },
};

interface TopBarProps {
  sidebarCollapsed: boolean;
  onMenuClick: () => void;
}

export function TopBar({ sidebarCollapsed, onMenuClick }: TopBarProps) {
  const location = useLocation();
  const pageInfo = pageTitles[location.pathname] ?? {
    title: "ResumeTailor",
    subtitle: "",
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-surface-200 bg-white/80 px-6 backdrop-blur-md transition-all duration-300",
        sidebarCollapsed ? "lg:pl-[96px]" : "lg:pl-[280px]"
      )}
    >
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 lg:hidden cursor-pointer"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="animate-fade-in">
        <h2 className="text-lg font-semibold text-surface-900">
          {pageInfo.title}
        </h2>
        <p className="text-xs text-surface-400">{pageInfo.subtitle}</p>
      </div>
    </header>
  );
}
