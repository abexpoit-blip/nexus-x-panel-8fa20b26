import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

/** Premium shimmer skeleton for tables while data loads */
export const TableSkeleton = ({ rows = 6, cols = 5, className }: TableSkeletonProps) => (
  <div className={cn("glass-card overflow-hidden", className)}>
    <div className="border-b border-white/[0.08] px-4 py-3 flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="flex-1 h-3 rounded shimmer-bar" />
      ))}
    </div>
    <div className="divide-y divide-white/[0.04]">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="px-4 py-4 flex gap-4 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="flex-1 h-4 rounded shimmer-bar"
              style={{ animationDelay: `${(r * cols + c) * 60}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const CardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn("glass-card p-6 space-y-3", className)}>
    <div className="h-3 w-24 rounded shimmer-bar" />
    <div className="h-8 w-32 rounded shimmer-bar" />
    <div className="h-3 w-16 rounded shimmer-bar" />
  </div>
);
