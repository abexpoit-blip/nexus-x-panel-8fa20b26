import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";
import { GradientMesh, PageHeader } from "@/components/premium";

const AdminNotifications = () => {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [target, setTarget] = useState<string>("all");

  const { data: agents } = useQuery({ queryKey: ["agents"], queryFn: () => api.admin.agents() });
  const { data: notifs } = useQuery({ queryKey: ["notifications"], queryFn: () => api.notifications.list(), refetchInterval: 30000 });

  const send = useMutation({
    mutationFn: () => api.notifications.broadcast({
      title, message, type,
      user_id: target === "all" ? null : Number(target),
    }),
    onSuccess: () => {
      toast.success("Notification sent");
      setTitle(""); setMessage("");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="relative space-y-6">
      <GradientMesh variant="default" />
      <PageHeader
        eyebrow="Communication"
        title="Notifications"
        description="Broadcast or send targeted messages to agents"
        icon={<Megaphone className="w-5 h-5 text-neon-magenta" />}
      />

      <GlassCard>
        <h3 className="font-display font-semibold mb-4">Compose</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Recipient</label>
              <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full h-10 px-3 rounded-md bg-white/[0.04] border border-white/[0.08]">
                <option value="all">All agents (broadcast)</option>
                {(agents?.agents || []).map((a) => (
                  <option key={a.id} value={a.id}>{a.username}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-10 px-3 rounded-md bg-white/[0.04] border border-white/[0.08]">
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short headline" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Message</label>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write the announcement…" />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => send.mutate()} disabled={!title || !message || send.isPending} className="bg-primary text-primary-foreground">
              <Send className="w-4 h-4 mr-2" /> {send.isPending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="font-display font-semibold mb-4">Recent Notifications</h3>
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {(notifs?.notifications || []).map((n) => (
            <div key={n.id} className="p-3 rounded-lg border border-white/[0.05] hover:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">{n.title}</h4>
                <span className="text-xs text-muted-foreground">{new Date(n.created_at * 1000).toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
              <div className="flex gap-2 mt-2 text-[10px] uppercase tracking-wider">
                <span className="text-primary">{n.type}</span>
                <span className="text-muted-foreground">{n.user_id ? `→ user #${n.user_id}` : "→ broadcast"}</span>
              </div>
            </div>
          ))}
          {!(notifs?.notifications || []).length && <p className="text-center text-muted-foreground text-sm py-8">No notifications yet</p>}
        </div>
      </GlassCard>
    </div>
  );
};

export default AdminNotifications;
