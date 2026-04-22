import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Agent } from "@/lib/api";
import { DataTable } from "@/components/DataTable";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sliders, Pencil, ChevronDown, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GradientMesh, PageHeader } from "@/components/premium";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const AdminAllocation = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Agent | null>(null);
  const [daily, setDaily] = useState(0);
  const [perReq, setPerReq] = useState(0);
  const [tab, setTab] = useState<"limits" | "live" | "inspector">("limits");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const { data } = useQuery({ queryKey: ["agents"], queryFn: () => api.admin.agents() });
  const { data: alloc } = useQuery({ queryKey: ["all-allocations"], queryFn: () => api.admin.allocations(), refetchInterval: 15000 });
  const { data: pool } = useQuery({
    queryKey: ["pool-inspector"],
    queryFn: () => api.admin.poolInspector(),
    refetchInterval: 20000,
    enabled: tab === "inspector",
  });

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = pool?.countries || [];
    if (!q) return list;
    return list.filter(
      (c) =>
        c.country_name.toLowerCase().includes(q) ||
        c.country_code.toLowerCase().includes(q) ||
        c.ranges.some((r) => r.range.toLowerCase().includes(q))
    );
  }, [pool, search]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const save = useMutation({
    mutationFn: () => api.admin.updateAgent(editing!.id, { daily_limit: daily, per_request_limit: perReq }),
    onSuccess: () => {
      toast.success("Limits updated");
      qc.invalidateQueries({ queryKey: ["agents"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (a: Agent) => {
    setEditing(a);
    setDaily(a.daily_limit);
    setPerReq(a.per_request_limit);
  };

  return (
    <div className="relative space-y-6">
      <GradientMesh variant="default" />
      <PageHeader
        eyebrow="Quotas"
        title="Allocation & Limits"
        description="Per-agent daily and per-request quotas + live allocations"
        icon={<Sliders className="w-5 h-5 text-neon-amber" />}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
        <TabsList>
          <TabsTrigger value="limits">Agent Limits</TabsTrigger>
          <TabsTrigger value="live">Live Allocations</TabsTrigger>
          <TabsTrigger value="inspector">Pool Inspector</TabsTrigger>
        </TabsList>

      <TabsContent value="limits" className="space-y-6 mt-4">
      <GlassCard className="p-0">
        <div className="p-4 border-b border-white/[0.04]">
          <h3 className="font-display font-semibold">Agent Limits</h3>
        </div>
        <DataTable
          className="border-0 rounded-none"
          columns={[
            { key: "username", header: "Agent", render: (r) => <span className="font-semibold">{r.username}</span> },
            { key: "daily_limit", header: "Daily limit", render: (r) => <span className="font-mono">{r.daily_limit}</span> },
            { key: "per_request_limit", header: "Per request", render: (r) => <span className="font-mono">{r.per_request_limit}</span> },
            { key: "otp_count", header: "Total OTPs", render: (r) => r.otp_count.toLocaleString() },
            {
              key: "actions",
              header: "",
              render: (r) => (
                <button onClick={() => openEdit(r)} className="text-primary hover:underline text-xs flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Edit limits
                </button>
              ),
            },
          ]}
          data={data?.agents || []}
        />
      </GlassCard>
      </TabsContent>

      <TabsContent value="live" className="space-y-6 mt-4">
      <GlassCard className="p-0">
        <div className="p-4 border-b border-white/[0.04]">
          <h3 className="font-display font-semibold">Live Allocations</h3>
        </div>
        <DataTable
          className="border-0 rounded-none"
          columns={[
            { key: "username", header: "Agent", render: (r) => r.username || `#${r.user_id}` },
            { key: "phone_number", header: "Number", render: (r) => <span className="font-mono">{r.phone_number}</span> },
            { key: "provider", header: "Provider", render: (r) => <span className="uppercase text-xs">{r.provider}</span> },
            { key: "operator", header: "Operator", render: (r) => r.operator || "—" },
            { key: "status", header: "Status" },
            { key: "allocated_at", header: "Time", render: (r) => new Date(r.allocated_at * 1000).toLocaleString() },
          ]}
          data={alloc?.allocations || []}
        />
      </GlassCard>
      </TabsContent>

      <TabsContent value="inspector" className="space-y-4 mt-4">
        <GlassCard className="p-0">
          <div className="p-4 border-b border-white/[0.04] flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-display font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neon-amber" /> Pool Inspector
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Country → Range buckets the agents see, with every contributing bot. Inferred country names are shown in italics.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or range..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {filteredCountries.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {pool ? "No buckets match your search." : "Loading pool data..."}
              </div>
            ) : (
              filteredCountries.map((c) => {
                const open = expanded.has(c.country_code);
                return (
                  <div key={c.country_code}>
                    <button
                      onClick={() => toggle(c.country_code)}
                      className="w-full px-4 py-3 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground shrink-0">
                          {c.country_code}
                        </span>
                        <span className={cn("font-semibold truncate", c.inferred && "italic text-neon-amber")}>
                          {c.country_name}
                          {c.inferred && <span className="ml-2 text-[10px] font-normal text-neon-amber/70">(inferred)</span>}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <span className="text-muted-foreground">{c.ranges.length} ranges</span>
                        <span className="font-mono text-neon-green font-semibold">{c.total.toLocaleString()} avail</span>
                      </div>
                    </button>
                    {open && (
                      <div className="bg-black/20 border-t border-white/[0.04]">
                        {c.ranges.map((r) => (
                          <div key={r.range} className="px-4 py-3 border-b border-white/[0.03] last:border-b-0">
                            <div className="flex items-center justify-between gap-4 mb-2">
                              <span className="font-mono text-sm truncate">{r.range}</span>
                              <span className="font-mono text-xs text-neon-green font-semibold">{r.total} avail</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {r.bots.map((b) => (
                                <span
                                  key={b.provider}
                                  className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono"
                                  title={`${b.provider} → ${b.label}`}
                                >
                                  {b.label} · {b.count}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>
      </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="glass-card border-white/10">
          <DialogHeader><DialogTitle>Edit Limits — {editing?.username}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily limit</label>
              <Input type="number" value={daily} onChange={(e) => setDaily(+e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Per-request limit</label>
              <Input type="number" value={perReq} onChange={(e) => setPerReq(+e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAllocation;
