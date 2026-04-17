import { Bell } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/** Soft "ding-ding" alert tone using WebAudio (no asset needed) */
function playAlertSound(volume = 0.4) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.18].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now + delay);
      osc.frequency.exponentialRampToValueAtTime(1320, now + delay + 0.12);
      gain.gain.setValueAtTime(volume, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);
      osc.start(now + delay);
      osc.stop(now + delay + 0.3);
    });
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    /* audio not available */
  }
}

export const NotificationBell = () => {
  const { togglePanel } = useNotifications();
  const { user } = useAuth();

  // Poll real backend notifications every 15 s when logged in
  const { data } = useQuery({
    queryKey: ["nav-notifications", user?.id],
    queryFn: () => api.notifications.list(),
    enabled: !!user,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const unread = data?.unread ?? 0;
  const lastUnreadRef = useRef<number>(unread);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!data?.notifications) return;

    // First load — just record IDs, no alert
    if (!initializedRef.current) {
      data.notifications.forEach((n) => seenIdsRef.current.add(n.id));
      initializedRef.current = true;
      lastUnreadRef.current = unread;
      return;
    }

    // New unread items detected → fire alert
    const fresh = data.notifications.filter(
      (n) => !seenIdsRef.current.has(n.id) && !n.is_read,
    );
    if (fresh.length > 0) {
      playAlertSound();
      const top = fresh[0];
      const toastFn =
        top.type === "error" ? toast.error :
        top.type === "warning" ? toast.warning :
        top.type === "success" ? toast.success :
        toast.info;
      toastFn(top.title, {
        description: top.message,
        duration: 5000,
        action: { label: "View", onClick: () => togglePanel() },
      });
    }
    data.notifications.forEach((n) => seenIdsRef.current.add(n.id));
    lastUnreadRef.current = unread;
  }, [data, unread, togglePanel]);

  return (
    <button
      onClick={togglePanel}
      className="relative p-2 rounded-lg glass hover:bg-white/[0.08] transition-colors"
      aria-label={`Notifications (${unread} unread)`}
    >
      <Bell
        className={
          unread > 0
            ? "w-5 h-5 text-neon-magenta animate-[wiggle_1s_ease-in-out_infinite]"
            : "w-5 h-5 text-muted-foreground"
        }
      />
      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-neon-magenta rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow-[0_0_10px_hsl(300_100%_55%/0.6)]"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};
