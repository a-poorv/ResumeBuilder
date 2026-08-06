import type React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

/** Reusable empty state placeholder for pages awaiting implementation. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-200 bg-white/50 px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
        <Icon className="h-8 w-8 text-primary-500" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-surface-900">{title}</h3>
      <p className="max-w-sm text-sm text-surface-500">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
