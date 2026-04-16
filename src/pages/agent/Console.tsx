import { useState, useEffect } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Eye, EyeOff, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface SmsMessage {
  id: string;
  number: string;
  country: string;
  operator: string;
  sender: string;
  text: string;
  time: string;
  agentId: string;
}

const MOCK_SMS: SmsMessage[] = [
  { id: "1", number: "+8801711XXXXX", country: "BD", operator: "Grameenphone", sender: "WhatsApp", text: "Your WhatsApp code: 482-193. Don't share this code.", time: "12:45:32", agentId: "2" },
  { id: "2", number: "+8801811XXXXX", country: "BD", operator: "Robi", sender: "Telegram", text: "Telegram code: 59302", time: "12:44:18", agentId: "3" },
  { id: "3", number: "+8801911XXXXX", country: "BD", operator: "Banglalink", sender: "Google", text: "G-284519 is your Google verification code.", time: "12:42:55", agentId: "2" },
  { id: "4", number: "+8801511XXXXX", country: "BD", operator: "Teletalk", sender: "Facebook", text: "Your Facebook code is: 38291", time: "12:40:07", agentId: "4" },
  { id: "5", number: "+8801711XXXXX", country: "BD", operator: "Grameenphone", sender: "Amazon", text: "Your Amazon OTP is 482910.", time: "12:38:22", agentId: "2" },
];

const maskOtp = (text: string) => text.replace(/\d{4,}/g, (m) => "X".repeat(m.length));

const AgentConsole = () => {
  const { user } = useAuth();
  const [messages] = useState(MOCK_SMS);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = messages.filter(
    (m) =>
      m.number.includes(search) ||
      m.sender.toLowerCase().includes(search.toLowerCase()) ||
      m.text.toLowerCase().includes(search.toLowerCase())
  );

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  useEffect(() => {
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const isOwnMessage = (msg: SmsMessage) => String(msg.agentId) === String(user?.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Console</h1>
          <p className="text-sm text-muted-foreground mt-1">Live SMS inbox — active ranges & recent messages. OTPs masked for others.</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 glass rounded-lg text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by number, sender, or message..."
          className="pl-10 bg-white/[0.04] border-white/[0.1] h-11"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((msg) => {
          const own = isOwnMessage(msg);
          const revealed = revealedIds.has(msg.id);
          const displayText = (own && revealed) ? msg.text : maskOtp(msg.text);

          return (
            <GlassCard key={msg.id} className={cn("!p-4 transition-all cursor-default", own && "hover:neon-border-cyan")}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono text-primary">{msg.number}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neon-cyan/10 text-neon-cyan">
                      {msg.operator}
                    </span>
                    {own && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neon-green/10 text-neon-green">
                        YOUR OTP
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-foreground leading-relaxed font-mono">
                    {displayText}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {own && (
                    <>
                      <button
                        onClick={() => toggleReveal(msg.id)}
                        className="p-1.5 rounded-md hover:bg-white/[0.06] text-muted-foreground hover:text-primary transition-colors"
                        title={revealed ? "Hide OTP" : "Show OTP"}
                      >
                        {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {revealed && (
                        <button
                          onClick={() => copyText(msg.id, msg.text)}
                          className="p-1.5 rounded-md hover:bg-white/[0.06] text-muted-foreground hover:text-neon-green transition-colors"
                          title="Copy"
                        >
                          {copiedId === msg.id ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </>
                  )}
                  <div className="text-right ml-2">
                    <p className="text-xs font-semibold text-foreground">{msg.sender}</p>
                    <p className="text-xs text-muted-foreground">{msg.time}</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No messages found</div>
        )}
      </div>
    </div>
  );
};

export default AgentConsole;
