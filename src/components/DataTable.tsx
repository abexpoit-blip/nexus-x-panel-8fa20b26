import { cn } from "@/lib/utils";
import { TableSkeleton } from "./TableSkeleton";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  className?: string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyText?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  className,
  onRowClick,
  loading,
  emptyText = "No data available",
}: DataTableProps<T>) {
  if (loading && data.length === 0) {
    return <TableSkeleton rows={6} cols={columns.length} className={className} />;
  }

  return (
    <div className={cn("glass-card overflow-hidden", className)}>
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 text-sm text-foreground", col.className)}>
                    {col.render ? col.render(row, i) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {data.length === 0 && !loading && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground text-sm">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
