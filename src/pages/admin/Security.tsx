import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/StatCard";
import { Shield, UserX, UserCheck, AlertTriangle, Search, Trophy, Ban, Eye, UserPlus, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const MOCK_AGENTS = [
  { id: "1", username: "agent1", status: "active", earnings: "৳12,450", otps: 8492, numbers: 1283, rank: 1, badge: "🥇" },
  { id: "2", username: "agent2", status: "active", earnings: "৳9,800", otps: 6203, numbers: 920, rank: 2, badge: "🥈" },
  { id: "3", username: "agent3", status: "banned", earnings: "৳200", otps: 15, numbers: 0, rank: "-", badge: "" },
  { id: "4", username: "agent4", status: "warned", earnings: "৳3,200", otps: 1890, numbers: 450, rank: 3, badge: "🥉" },
  { id: "5", username: "agent5", status: "active", earnings: "৳1,100", otps: 500, numbers: 120, rank: 4, badge: "" },
];

const MOCK_LOGS = [
  { id: "1", action: "Agent Banned", target: "agent3", reason: "Abuse of numbers", by: "admin", time: "2 hours ago" },
  { id: "2", action: "Agent Warned", target: "agent4", reason: "Excessive number waste", by: "admin", time: "1 day ago" },
  { id: "3", action: "Agent Unbanned", target: "agent5", reason: "Appeal approved", by: "admin", time: "3 days ago" },
  { id: "4", action: "Reward Sent", target: "agent1", reason: "Top performer bonus ৳500", by: "system", time: "5 days ago" },
];

const statusStyles: Record<string, string> = {
  active: "bg-neon-green/10 text-neon-green",
  banned: "bg-neon-red/10 text-neon-red",
  warned: "bg-neon-amber/10 text-neon-amber",
};

const AdminSecurity = () => {
  const [tab, setTab] = useState<"agents" | "logs" | "rewards" | "settings">("agents");
  const [search, setSearch] = useState("");
  const { signupEnabled, setSignupEnabled } = useAuth();

  const toggleSignup = () => {
    setSignupEnabled(!signupEnabled);
    toast({
      title: signupEnabled ? "Registration Disabled" : "Registration Enabled",
      description: signupEnabled
        ? "New users can no longer register"
        : "New users can now create accounts",
    });
  };

  const agentColumns = [
    { key: "badge", header: "", render: (r: any) => <span className="text-lg">{r.badge}</span> },
    { key: "username", header: "Agent", render: (r: any) => <span className="font-semibold text-foreground">{r.username}</span> },
    { key: "status", header: "Status", render: (r: any) => (
      <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize", statusStyles[r.status])}>
        {r.status}
      </span>
    )},
    { key: "rank", header: "Rank", render: (r: any) => <span className="font-mono text-primary">#{r.rank}</span> },
    { key: "earnings", header: "Total Earnings" },
    { key: "otps", header: "Total OTPs" },
    { key: "actions", header: "Actions", render: (r: any) => (
      <div className="flex gap-1">
        {r.status !== "banned" ? (
          <button className="p-1.5 rounded-md hover:bg-neon-red/10 text-muted-foreground hover:text-neon-red transition-colors" title="Ban Agent">
            <Ban className="w-4 h-4" />
          </button>
        ) : (
          <button className="p-1.5 rounded-md hover:bg-neon-green/10 text-muted-foreground hover:text-neon-green transition-colors" title="Unban Agent">
            <UserCheck className="w-4 h-4" />
          </button>
        )}
        {r.status === "active" && (
          <button className="p-1.5 rounded-md hover:bg-neon-amber/10 text-muted-foreground hover:text-neon-amber transition-colors" title="Warn Agent">
            <AlertTriangle className="w-4 h-4" />
          </button>
        )}
        <button className="p-1.5 rounded-md hover:bg-neon-cyan/10 text-muted-foreground hover:text-neon-cyan transition-colors" title="Send Reward">
          <Trophy className="w-4 h-4" />
        </button>
      </div>
    )},
  ];

  const logColumns = [
    { key: "action", header: "Action", render: (r: any) => {
      const color = r.action.includes("Ban") ? "text-neon-red" : r.action.includes("Warn") ? "text-neon-amber" : r.action.includes("Reward") ? "text-neon-green" : "text-neon-cyan";
      return <span className={cn("font-semibold", color)}>{r.action}</span>;
    }},
    { key: "target", header: "Agent", render: (r: any) => <span className="font-semibold text-foreground">{r.target}</span> },
    { key: "reason", header: "Reason" },
    { key: "by", header: "By" },
    { key: "time", header: "Time" },
  ];

  const topAgents = MOCK_AGENTS.filter(a => a.status === "active").sort((a, b) => b.otps - a.otps).slice(0, 3);

  const tabs = [
    { key: "agents" as const, label: "Agent Control", icon: Shield },
    { key: "logs" as const, label: "Security Logs", icon: Eye },
    { key: "rewards" as const, label: "Top Performers", icon: Trophy },
    { key: "settings" as const, label: "Registration", icon: UserPlus },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Security & Rewards</h1>
        <p className="text-sm text-muted-foreground mt-1">Ban/unban agents, manage warnings, and reward top performers</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Active Agents" value="4" icon={UserCheck} color="green" />
        <StatCard label="Banned" value="1" icon={UserX} color="magenta" />
        <StatCard label="Warnings" value="1" icon={AlertTriangle} color="amber" />
        <StatCard label="Rewards Sent" value="৳2,500" icon={Trophy} color="cyan" />
      </div>

      <div className="flex gap-1 p-1 glass rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === t.key
                ? "bg-primary/10 text-primary neon-border-cyan border"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "agents" && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search agents..." className="pl-10 bg-white/[0.04] border-white/[0.1] h-11" />
          </div>
          <DataTable columns={agentColumns} data={MOCK_AGENTS} />
        </>
      )}

      {tab === "logs" && <DataTable columns={logColumns} data={MOCK_LOGS} />}

      {tab === "rewards" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topAgents.map((agent, i) => (
            <GlassCard key={agent.id} glow={i === 0 ? "cyan" : i === 1 ? "magenta" : "none"} className="text-center">
              <span className="text-4xl">{["🥇", "🥈", "🥉"][i]}</span>
              <h3 className="text-lg font-display font-bold text-foreground mt-2">{agent.username}</h3>
              <p className="text-sm text-muted-foreground mt-1">{agent.otps.toLocaleString()} OTPs</p>
              <p className="text-lg font-mono font-bold text-primary mt-2">{agent.earnings}</p>
              <Button className="mt-4 w-full bg-gradient-to-r from-primary to-neon-magenta text-primary-foreground font-semibold hover:opacity-90 border-0" size="sm">
                <Trophy className="w-4 h-4 mr-2" /> Send Reward
              </Button>
            </GlassCard>
          ))}
        </div>
      )}
      {tab === "settings" && (
        <GlassCard glow={signupEnabled ? "cyan" : undefined}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center",
                signupEnabled ? "bg-neon-green/10" : "bg-neon-red/10"
              )}>
                <Power className={cn("w-7 h-7", signupEnabled ? "text-neon-green" : "text-neon-red")} />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground text-lg">Agent Registration</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {signupEnabled
                    ? "Registration is currently OPEN — new agents can sign up"
                    : "Registration is currently CLOSED — no new signups allowed"}
                </p>
              </div>
            </div>
            <Button
              onClick={toggleSignup}
              className={cn(
                "h-11 font-semibold border-0 px-6",
                signupEnabled
                  ? "bg-neon-red/20 text-neon-red hover:bg-neon-red/30"
                  : "bg-gradient-to-r from-primary to-neon-green text-primary-foreground hover:opacity-90"
              )}
            >
              {signupEnabled ? (
                <><UserX className="w-4 h-4 mr-2" /> Disable Registration</>
              ) : (
                <><UserCheck className="w-4 h-4 mr-2" /> Enable Registration</>
              )}
            </Button>
          </div>
          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className={cn("w-3 h-3 rounded-full", signupEnabled ? "bg-neon-green animate-pulse" : "bg-neon-red")} />
              <span className="text-sm text-muted-foreground">
                Status: <span className={cn("font-semibold", signupEnabled ? "text-neon-green" : "text-neon-red")}>
                  {signupEnabled ? "ACTIVE" : "INACTIVE"}
                </span>
              </span>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
};

export default AdminSecurity;
