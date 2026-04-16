import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { GlassCard } from "@/components/GlassCard";
import { Users, UserCheck, Hash, Activity, MessageSquare, TrendingUp, Wallet, Clock } from "lucide-react";

const AdminDashboard = () => {
  const { data } = useQuery({ queryKey: ["admin-stats"], queryFn: () => api.admin.stats(), refetchInterval: 15000 });
  const { data: lb } = useQuery({ queryKey: ["leaderboard"], queryFn: () => api.admin.leaderboard() });

  const s = data || {
    totalAgents: 0, activeAgents: 0, totalAlloc: 0, activeAlloc: 0,
    totalOtp: 0, todayOtp: 0, todayRevenue: 0, totalRevenue: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Realtime platform overview · refreshes every 15s</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 glass rounded-xl">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Agents" value={s.totalAgents} icon={Users} color="cyan" />
        <StatCard label="Active Agents" value={s.activeAgents} icon={UserCheck} color="green" />
        <StatCard label="Active Numbers" value={s.activeAlloc} icon={Hash} color="amber" />
        <StatCard label="Total Allocations" value={s.totalAlloc} icon={Activity} color="magenta" />
        <StatCard label="Today OTP" value={s.todayOtp} icon={MessageSquare} color="cyan" />
        <StatCard label="Total OTP" value={s.totalOtp} icon={TrendingUp} color="magenta" />
        <StatCard label="Today Revenue" value={`৳${s.todayRevenue.toFixed(2)}`} icon={Wallet} color="green" />
        <StatCard label="Total Revenue" value={`৳${s.totalRevenue.toFixed(2)}`} icon={Wallet} color="amber" />
      </div>

      <GlassCard>
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Top Agents
        </h3>
        <div className="space-y-2">
          {(lb?.leaderboard || []).slice(0, 10).map((r, i) => (
            <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.03] border-b border-white/[0.04] last:border-0">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-mono text-muted-foreground">{i + 1}</span>
                <span className="font-semibold">{r.username}</span>
              </div>
              <span className="font-bold">{r.otp_count.toLocaleString()} <span className="text-xs text-muted-foreground">OTPs</span></span>
            </div>
          ))}
          {!(lb?.leaderboard || []).length && <p className="text-center text-muted-foreground text-sm py-8">No data yet</p>}
        </div>
      </GlassCard>
    </div>
  );
};

export default AdminDashboard;
