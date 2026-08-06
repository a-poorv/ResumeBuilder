import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  FileText,
  SearchCheck,
  Sparkles,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type React from "react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  description: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    description: "Overview & quick actions",
  },
  {
    label: "Upload Resume",
    path: "/upload",
    icon: Upload,
    description: "Upload your master resume",
  },
  {
    label: "Job Description",
    path: "/job-description",
    icon: FileText,
    description: "Paste target job details",
  },
  {
    label: "Analysis",
    path: "/analysis",
    icon: SearchCheck,
    description: "Review resume match",
  },
  {
    label: "Generator",
    path: "/generator",
    icon: Sparkles,
    description: "Generate tailored resume",
  },
  {
    label: "History",
    path: "/history",
    icon: History,
    description: "Past tailored resumes",
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-surface-200 bg-white transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* ── Brand ─────────────────────────────────────────── */}
      <div className="flex h-16 items-center gap-3 border-b border-surface-200 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md shadow-primary-500/25">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <h1 className="text-base font-bold tracking-tight text-surface-900">
              ResumeTailor
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-primary-500">
              AI-Powered
            </p>
          </div>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary-50 text-primary-700 shadow-sm"
                  : "text-surface-500 hover:bg-surface-50 hover:text-surface-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary-500 animate-slide-in-left" />
                )}

                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive
                      ? "text-primary-600"
                      : "text-surface-400 group-hover:text-surface-600"
                  )}
                />

                {!collapsed && (
                  <div className="animate-fade-in overflow-hidden">
                    <span className="block truncate">{item.label}</span>
                    <span
                      className={cn(
                        "block truncate text-[11px] font-normal",
                        isActive ? "text-primary-500" : "text-surface-400"
                      )}
                    >
                      {item.description}
                    </span>
                  </div>
                )}

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full ml-3 hidden rounded-lg bg-surface-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
                    {item.label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Collapse Toggle ───────────────────────────────── */}
      <div className="border-t border-surface-200 p-3">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="animate-fade-in">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
