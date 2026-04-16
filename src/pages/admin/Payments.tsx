import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DataTable } from "@/components/DataTable";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AdminPayments = () => {
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState("manual");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const { data: agents } = useQuery({ queryKey: ["agents"], queryFn: () => api.admin.agents() });
  const { data, isLoading } = useQuery({ queryKey: ["payments-all"], queryFn: () => api.payments.all(), refetchInterval: 30000 });

  const topup = useMutation({
    mutationFn: () => api.payments.topup({
      user_id: Number(userId),
      amount_bdt: Number(amount),
      method, reference: reference || undefined, note: note || undefined,
    }),
    onSuccess: () => {
      toast.success("Top-up applied");
      setUserId(""); setAmount(""); setReference(""); setNote("");
      qc.invalidateQueries({ queryKey: ["payments-all"] });
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-7 h-7 text-neon-amber" /> Payments
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Top-up agent balances and view all transactions</p>
      </div>

      <GlassCard>
        <h3 className="font-display font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-neon-green" /> New Top-up</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Agent</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full h-10 px-3 rounded-md bg-white/[0.04] border border-white/[0.08]">
              <option value="">— select —</option>
              {(agents?.agents || []).map((a) => (
                <option key={a.id} value={a.id}>{a.username} (৳{a.balance.toFixed(2)})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Amount (৳)</label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full h-10 px-3 rounded-md bg-white/[0.04] border border-white/[0.08]">
              <option value="manual">Manual</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="bank">Bank</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Reference</label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TX ID" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Note</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={() => topup.mutate()} disabled={!userId || !amount || topup.isPending} className="bg-primary text-primary-foreground">
            {topup.isPending ? "Applying…" : "Apply Top-up"}
          </Button>
        </div>
      </GlassCard>

      <DataTable
        columns={[
          { key: "created_at", header: "Date", render: (r) => new Date(r.created_at * 1000).toLocaleString() },
          { key: "username", header: "Agent", render: (r) => r.username || `#${r.user_id}` },
          {
            key: "type",
            header: "Type",
            render: (r) => (
              <span className={cn("px-2 py-0.5 rounded text-xs font-semibold uppercase",
                r.type === "topup" && "bg-neon-green/15 text-neon-green",
                r.type === "debit" && "bg-destructive/15 text-destructive",
                r.type === "refund" && "bg-neon-amber/15 text-neon-amber",
              )}>{r.type}</span>
            ),
          },
          { key: "method", header: "Method", render: (r) => r.method || "—" },
          { key: "reference", header: "Ref", render: (r) => <span className="font-mono text-xs">{r.reference || "—"}</span> },
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
        data={data?.payments || []}
      />
      {isLoading && <p className="text-center text-muted-foreground text-sm">Loading…</p>}
    </div>
  );
};

export default AdminPayments;
