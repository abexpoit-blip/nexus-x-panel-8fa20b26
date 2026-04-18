import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/GlassCard";
import { DataTable } from "@/components/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { History as HistoryIcon, Search, ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const AgentHistory = () => {
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const PAGE_SIZE = 50;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["otp-history", page, q],
    queryFn: () => api.numberHistory({ page, page_size: PAGE_SIZE, q: q || undefined }),
    placeholderData: (prev) => prev,
  });

  const copyOtp = async (id: number, otp: string) => {
    try {
      await navigator.clipboard.writeText(otp);
      setCopiedId(id);
      toast.success("OTP copied");
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  };

  const totalPages = data?.total_pages ?? 1;
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <HistoryIcon className="w-7 h-7 text-primary" /> OTP History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Permanent log of every successful OTP you've delivered.
          </p>
        </div>
        {summary && (
          <div className="flex gap-3 text-xs">
            <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
              <span className="text-muted-foreground">Total OTPs: </span>
              <span className="font-mono font-semibold text-foreground">{summary.count}</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-neon-green/10 border border-neon-green/20">
              <span className="text-muted-foreground">Earned: </span>
              <span className="font-mono font-semibold text-neon-green">৳{summary.earnings_bdt.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      <GlassCard className="p-4">
        <form onSubmit={submitSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search phone, OTP code, or operator…"
              className="pl-9 bg-white/[0.04] border-white/[0.08]"
            />
          </div>
          <Button type="submit" variant="outline">Search</Button>
          {q && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setQInput(""); setQ(""); setPage(1); }}
            >
              Clear
            </Button>
          )}
        </form>
      </GlassCard>

      <DataTable
        columns={[
          {
            key: "phone_number",
            header: "Number",
            render: (r) => <span className="font-mono text-foreground">{r.phone_number}</span>,
          },
          {
            key: "country_code",
            header: "Country",
            render: (r) => <span className="text-muted-foreground text-xs">{r.country_code || "—"}</span>,
          },
          {
            key: "operator",
            header: "Operator",
            render: (r) => <span className="text-muted-foreground text-xs">{r.operator || "—"}</span>,
          },
          {
            key: "otp_code",
            header: "OTP",
            render: (r) => (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-neon-green font-bold">{r.otp_code}</span>
                <button
                  onClick={() => copyOtp(r.id, r.otp_code)}
                  className="p-1 rounded hover:bg-white/[0.06] text-muted-foreground hover:text-neon-green transition-colors"
                  title="Copy OTP"
                >
                  {copiedId === r.id ? <Check className="w-3 h-3 text-neon-green" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ),
          },
          {
            key: "price_bdt",
            header: "Earned",
            render: (r) => (
              <span className="font-mono text-neon-green/80 text-xs">
                {r.price_bdt > 0 ? `৳${r.price_bdt.toFixed(2)}` : "—"}
              </span>
            ),
          },
          {
            key: "created_at",
            header: "Time",
            render: (r) => (
              <span className="text-xs text-muted-foreground tabular-nums">
                {new Date(r.created_at * 1000).toLocaleString()}
              </span>
            ),
          },
        ]}
        data={data?.rows ?? []}
      />

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {isLoading ? "Loading…" : data
            ? `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, data.total)} of ${data.total}`
            : "—"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isFetching}
          >
            <ChevronLeft className="w-3 h-3 mr-1" /> Prev
          </Button>
          <span className={cn("px-3 py-1 rounded-md font-mono text-foreground", isFetching && "opacity-50")}>
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isFetching}
          >
            Next <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>Refresh</Button>
        </div>
      </div>
    </div>
  );
};

export default AgentHistory;
