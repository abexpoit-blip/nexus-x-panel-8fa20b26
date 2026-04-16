import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DataTable } from "@/components/DataTable";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const AgentPayments = () => {
  const { data, isLoading } = useQuery({ queryKey: ["my-payments"], queryFn: () => api.payments.mine() });
  const rows = data?.payments || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-7 h-7 text-neon-amber" /> Payments
        </h1>
        <p className="text-sm text-muted-foreground mt-1">All top-ups, refunds and adjustments on your account</p>
      </div>

      <DataTable
        columns={[
          { key: "created_at", header: "Date", render: (r) => new Date(r.created_at * 1000).toLocaleString() },
          {
            key: "type",
            header: "Type",
            render: (r) => (
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-semibold uppercase",
                r.type === "topup" && "bg-neon-green/15 text-neon-green",
                r.type === "debit" && "bg-destructive/15 text-destructive",
                r.type === "refund" && "bg-neon-amber/15 text-neon-amber",
              )}>{r.type}</span>
            ),
          },
          { key: "method", header: "Method", render: (r) => r.method || "—" },
          { key: "reference", header: "Reference", render: (r) => <span className="font-mono text-xs">{r.reference || "—"}</span> },
          {
            key: "amount_bdt",
            header: "Amount",
            render: (r) => (
              <span className={cn("font-bold font-mono", r.amount_bdt >= 0 ? "text-neon-green" : "text-destructive")}>
                {r.amount_bdt >= 0 ? "+" : ""}৳{r.amount_bdt.toFixed(2)}
              </span>
            ),
          },
          { key: "note", header: "Note", render: (r) => <span className="text-xs text-muted-foreground">{r.note || "—"}</span> },
        ]}
        data={rows}
      />
      {isLoading && <p className="text-center text-muted-foreground text-sm">Loading…</p>}
    </div>
  );
};

export default AgentPayments;
