import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

const AgentLeaderboard = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["leaderboard"], queryFn: () => api.admin.leaderboard(), refetchInterval: 60000 });
  const rows = data?.leaderboard || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-7 h-7 text-neon-amber" /> Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Top agents ranked by total OTPs received</p>
      </div>

      <GlassCard className="p-2">
        <div className="space-y-1">
          {rows.map((r, i) => {
            const isMe = r.id === user?.id;
            const medal = i === 0 ? "text-neon-amber" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-orange-400" : "text-muted-foreground/40";
            return (
              <div
                key={r.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg transition-colors",
                  isMe ? "bg-primary/10 border border-primary/30" : "hover:bg-white/[0.03]"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 text-center">
                    {i < 3 ? <Medal className={cn("w-6 h-6 mx-auto", medal)} /> : <span className="font-mono text-muted-foreground">{i + 1}</span>}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {r.username} {isMe && <span className="text-xs text-primary ml-2">(You)</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-display font-bold text-foreground">{r.otp_count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">OTPs</p>
                </div>
              </div>
            );
          })}
          {!rows.length && !isLoading && <p className="text-center text-muted-foreground py-12 text-sm">No data yet</p>}
        </div>
      </GlassCard>
    </div>
  );
};

export default AgentLeaderboard;
