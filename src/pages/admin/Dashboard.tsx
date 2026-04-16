import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { GlassCard } from "@/components/GlassCard";
import { Users, UserCheck, Hash, Activity, MessageSquare, TrendingUp, Wallet, Trophy, Globe } from "lucide-react";
import { RevenueArea, OtpLine, TopAgentsBar, CountryPie } from "@/components/charts/Charts";
import { useMemo } from "react";

const AdminDashboard = () => {
  const { data } = useQuery({ queryKey: ["admin-stats"], queryFn: () => api.admin.stats(), refetchInterval: 15000 });
  const { data: lb } = useQuery({ queryKey: ["leaderboard"], queryFn: () => api.admin.leaderboard() });
  const { data: alloc } = useQuery({ queryKey: ["admin-allocations"], queryFn: () => api.admin.allocations(), refetchInterval: 30000 });

  const s = data || {
    totalAgents: 0, activeAgents: 0, totalAlloc: 0, activeAlloc: 0,
    totalOtp: 0, todayOtp: 0, todayRevenue: 0, totalRevenue: 0,
  };

  // Derive 14-day revenue + OTP series from allocations
  const { revenueSeries, otpSeries, countrySeries } = useMemo(() => {
    const items = alloc?.allocations || [];
    const days = 14;
    const buckets: Record<string, { rev: number; otp: number }> = {};
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(5, 10); // MM-DD
      buckets[key] = { rev: 0, otp: 0 };
    }
    const countryMap: Record<string, number> = {};
    items.forEach((a: any) => {
      const date = new Date((a.allocated_at || 0) * 1000);
      const key = date.toISOString().slice(5, 10);
      if (buckets[key] && a.otp) {
        buckets[key].otp += 1;
        buckets[key].rev += Number(a.price_bdt || 0);
      }
      if (a.otp && a.country_code) countryMap[a.country_code] = (countryMap[a.country_code] || 0) + 1;
    });
    const revenueSeries = Object.entries(buckets).map(([label, v]) => ({ label, value: Math.round(v.rev) }));
    const otpSeries = Object.entries(buckets).map(([label, v]) => ({ label, value: v.otp }));
    const countrySeries = Object.entries(countryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    return { revenueSeries, otpSeries, countrySeries };
  }, [alloc]);

  const topAgents = (lb?.leaderboard || []).slice(0, 8).map((r) => ({ name: r.username, value: r.otp_count }));

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

      {/* Revenue & OTP charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard glow="cyan">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" /> Revenue (last 14 days)
            </h3>
            <span className="text-xs text-muted-foreground">৳ BDT</span>
          </div>
          <RevenueArea data={revenueSeries} />
        </GlassCard>

        <GlassCard glow="magenta">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-neon-magenta" /> OTP delivered (last 14 days)
            </h3>
            <span className="text-xs text-muted-foreground">count</span>
          </div>
          <OtpLine data={otpSeries} />
        </GlassCard>
      </div>

      {/* Pie + Top Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-1">
          <h3 className="font-display font-semibold text-foreground mb-2 flex items-center gap-2">
            <Globe className="w-4 h-4 text-neon-green" /> Top Countries
          </h3>
          {countrySeries.length === 0 ? (
            <p className="text-center text-muted-foreground text-xs py-12">No country data yet</p>
          ) : (
            <>
              <CountryPie data={countrySeries} />
              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                {countrySeries.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ background: ["hsl(185 100% 50%)","hsl(300 100% 45%)","hsl(150 100% 50%)","hsl(38 100% 50%)","hsl(0 100% 60%)","hsl(210 100% 60%)"][i % 6] }} />
                    <span className="text-muted-foreground">{c.name}</span>
                    <span className="ml-auto font-mono text-foreground">{c.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-neon-amber" /> Top Agents by OTP
          </h3>
          {topAgents.length === 0 ? (
            <p className="text-center text-muted-foreground text-xs py-12">No leaderboard data yet</p>
          ) : (
            <TopAgentsBar data={topAgents} />
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default AdminDashboard;
