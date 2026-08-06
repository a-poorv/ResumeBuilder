import type React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

/** Consistent page wrapper with entrance animation. */
export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn("space-y-6 animate-fade-in", className)}>
      {children}
    </div>
  );
}
