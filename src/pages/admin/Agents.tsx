import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DataTable } from "@/components/DataTable";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AgentForm = {
  id?: number;
  username: string;
  password?: string;
  full_name?: string;
  phone?: string;
  telegram?: string;
  daily_limit?: number;
  per_request_limit?: number;
  status?: string;
};

const empty: AgentForm = { username: "", password: "", daily_limit: 100, per_request_limit: 5, status: "active" };

const AdminAgents = () => {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AgentForm>(empty);

  const { data, isLoading } = useQuery({ queryKey: ["agents"], queryFn: () => api.admin.agents() });

  const save = useMutation({
    mutationFn: async (f: AgentForm) => {
      if (f.id) {
        const { id, password, ...rest } = f;
        return api.admin.updateAgent(id, password ? { ...rest, password } : rest);
      }
      return api.admin.createAgent(f);
    },
    onSuccess: () => {
      toast.success(form.id ? "Agent updated" : "Agent created");
      qc.invalidateQueries({ queryKey: ["agents"] });
      setOpen(false);
      setForm(empty);
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const del = useMutation({
    mutationFn: (id: number) => api.admin.deleteAgent(id),
    onSuccess: () => {
      toast.success("Agent deleted");
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const rows = (data?.agents || []).filter((a) =>
    !q || a.username.toLowerCase().includes(q.toLowerCase()) || a.full_name?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" /> Agents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all agent accounts</p>
        </div>
        <Button onClick={() => { setForm(empty); setOpen(true); }} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> New Agent
        </Button>
      </div>

      <GlassCard className="p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username or name…" className="pl-9 bg-white/[0.04] border-white/[0.08]" />
        </div>
      </GlassCard>

      <DataTable
        columns={[
          { key: "username", header: "Username", render: (r) => <span className="font-semibold">{r.username}</span> },
          { key: "full_name", header: "Name", render: (r) => r.full_name || "—" },
          { key: "balance", header: "Balance", render: (r) => <span className="font-mono text-neon-green">৳{r.balance.toFixed(2)}</span> },
          { key: "otp_count", header: "OTPs", render: (r) => r.otp_count.toLocaleString() },
          { key: "daily_limit", header: "Daily limit", render: (r) => r.daily_limit },
          { key: "per_request_limit", header: "Per req", render: (r) => r.per_request_limit },
          {
            key: "status",
            header: "Status",
            render: (r) => (
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-semibold uppercase",
                r.status === "active" ? "bg-neon-green/15 text-neon-green" : "bg-destructive/15 text-destructive"
              )}>{r.status}</span>
            ),
          },
          {
            key: "actions",
            header: "",
            render: (r) => (
              <div className="flex gap-2">
                <button onClick={() => { setForm({ ...r, password: "" }); setOpen(true); }} className="text-primary hover:underline text-xs flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => { if (confirm(`Delete ${r.username}?`)) del.mutate(r.id); }} className="text-destructive hover:underline text-xs flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            ),
          },
        ]}
        data={rows}
      />
      {isLoading && <p className="text-center text-muted-foreground text-sm">Loading…</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-white/10">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Agent" : "New Agent"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Username"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!form.id} /></Field>
            <Field label={form.id ? "New password (leave blank to keep)" : "Password"}>
              <Input type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Full name"><Input value={form.full_name || ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone"><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Telegram"><Input value={form.telegram || ""} onChange={(e) => setForm({ ...form, telegram: e.target.value })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Daily limit"><Input type="number" value={form.daily_limit ?? 0} onChange={(e) => setForm({ ...form, daily_limit: +e.target.value })} /></Field>
              <Field label="Per-request limit"><Input type="number" value={form.per_request_limit ?? 0} onChange={(e) => setForm({ ...form, per_request_limit: +e.target.value })} /></Field>
            </div>
            <Field label="Status">
              <select value={form.status || "active"} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-10 px-3 rounded-md bg-white/[0.04] border border-white/[0.08]">
                <option value="active">active</option>
                <option value="suspended">suspended</option>
              </select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
    {children}
  </div>
);

export default AdminAgents;
