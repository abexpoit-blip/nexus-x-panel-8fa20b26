import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DataTable } from "@/components/DataTable";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Receipt, Search, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GradientMesh, PageHeader } from "@/components/premium";

const AdminCDR = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["cdr-all"], queryFn: () => api.cdr.all(), refetchInterval: 20000 });

  const refund = useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => api.cdr.refund(id, note),
    onSuccess: () => {
      toast.success("Refunded");
      qc.invalidateQueries({ queryKey: ["cdr-all"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const all = data?.cdr || [];
    if (!q) return all;
    const ql = q.toLowerCase();
    return all.filter((c) =>
      c.phone_number.toLowerCase().includes(ql) ||
      (c.username || "").toLowerCase().includes(ql) ||
      c.provider.toLowerCase().includes(ql)
    );
  }, [data, q]);

  return (
    <div className="relative space-y-6">
      <GradientMesh variant="default" />
      <PageHeader
        eyebrow="Billing"
        title="Call Detail Records"
        description="All billable events across the platform · auto-refresh 20s"
        icon={<Receipt className="w-5 h-5 text-neon-cyan" />}
      />

      <GlassCard className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search number, agent, provider…" className="pl-9 bg-white/[0.04] border-white/[0.08]" />
        </div>
      </GlassCard>

      <DataTable
        columns={[
          { key: "created_at", header: "Time", render: (r) => new Date(r.created_at * 1000).toLocaleString() },
          { key: "username", header: "Agent", render: (r) => r.username || `#${r.user_id}` },
          { key: "provider", header: "Provider", render: (r) => <span className="uppercase text-xs">{r.provider}</span> },
          { key: "phone_number", header: "Number", render: (r) => <span className="font-mono">{r.phone_number}</span> },
          { key: "operator", header: "Operator", render: (r) => r.operator || "—" },
          { key: "otp_code", header: "OTP", render: (r) => r.otp_code ? <span className="font-mono text-neon-green">{r.otp_code}</span> : "—" },
          { key: "price_bdt", header: "Price", render: (r) => <span className="font-mono">৳{r.price_bdt.toFixed(2)}</span> },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <span className={cn("px-2 py-0.5 rounded text-xs font-semibold uppercase",
                r.status === "billed" && "bg-neon-green/15 text-neon-green",
                r.status === "refunded" && "bg-neon-amber/15 text-neon-amber",
                r.status === "failed" && "bg-destructive/15 text-destructive",
              )}>{r.status}</span>
            ),
          },
          {
            key: "actions",
            header: "",
            render: (r) =>
              r.status === "billed" ? (
                <button
                  onClick={() => {
                    const note = prompt("Refund note (optional):") || undefined;
                    if (confirm(`Refund ৳${r.price_bdt.toFixed(2)} to ${r.username || `#${r.user_id}`}?`)) refund.mutate({ id: r.id, note });
                  }}
                  className="text-neon-amber hover:underline text-xs flex items-center gap-1"
                >
                  <Undo2 className="w-3 h-3" /> Refund
                </button>
              ) : null,
          },
        ]}
        data={rows}
      />
      {isLoading && <p className="text-center text-muted-foreground text-sm">Loading…</p>}
    </div>
  );
};

export default AdminCDR;
