import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-50">
      {/* ── Mobile Overlay ──────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar (mobile: slide-in, desktop: persistent) */}
      <div
        className={cn(
          "lg:block",
          mobileOpen
            ? "fixed inset-y-0 left-0 z-50 block"
            : "hidden"
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* ── Main Area ───────────────────────────────────── */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300",
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-64"
        )}
      >
        <TopBar
          sidebarCollapsed={sidebarCollapsed}
          onMenuClick={() => setMobileOpen(true)}
        />

        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>

        {/* ── Footer ──────────────────────────────────────── */}
        <footer className="border-t border-surface-200 px-6 py-4">
          <p className="text-center text-xs text-surface-400">
            © {new Date().getFullYear()} ResumeTailor — Built with AI in mind
          </p>
        </footer>
      </div>
    </div>
  );
}
