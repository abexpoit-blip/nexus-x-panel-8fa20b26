import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, Check, CheckCheck, Trash2, X } from "lucide-react";
import { useNotifications, type NotificationType } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const typeBorder: Record<NotificationType, string> = {
  info: "border-l-primary",
  success: "border-l-neon-green",
  warning: "border-l-neon-amber",
  error: "border-l-destructive",
  system: "border-l-neon-cyan",
};

const typeDot: Record<NotificationType, string> = {
  info: "bg-primary",
  success: "bg-neon-green",
  warning: "bg-neon-amber",
  error: "bg-destructive",
  system: "bg-neon-cyan",
};

export const NotificationPanel = () => {
  const {
    notifications, unreadCount, panelOpen, preferences,
    markAsRead, markAllRead, clearAll, closePanel, updatePreferences,
  } = useNotifications();
  const { soundEnabled } = preferences;
  const toggleSound = () => updatePreferences({ soundEnabled: !soundEnabled });

  return (
    <AnimatePresence>
      {panelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={closePanel}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 z-[101] h-full w-full sm:w-[420px] flex flex-col bg-card border-l border-border shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-semibold text-foreground text-lg">Notifications</h2>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleSound}
                  className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground hover:text-foreground"
                  title={soundEnabled ? "Mute sounds" : "Enable sounds"}
                >
                  {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground hover:text-foreground"
                    title="Mark all read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground hover:text-foreground"
                  title="Clear all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={closePanel}
                  className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto scrollbar-none">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-8">
                  <div className="p-4 rounded-2xl bg-white/[0.03]">
                    <Bell className="w-10 h-10 opacity-30" />
                  </div>
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="py-2">
                  <AnimatePresence initial={false}>
                    {notifications.map((n, i) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 30, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: "auto" }}
                        exit={{ opacity: 0, x: 30, height: 0 }}
                        transition={{ duration: 0.25, delay: i < 5 ? i * 0.03 : 0 }}
                      >
                        <button
                          onClick={() => markAsRead(n.id)}
                          className={cn(
                            "w-full text-left px-5 py-3.5 border-l-[3px] transition-all hover:bg-white/[0.04] group",
                            typeBorder[n.type],
                            !n.read ? "bg-white/[0.02]" : "opacity-60 hover:opacity-100"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-xl mt-0.5 shrink-0">{n.icon || "🔔"}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {!n.read && (
                                    <span className={cn("w-2 h-2 rounded-full shrink-0", typeDot[n.type])} />
                                  )}
                                  <p className={cn(
                                    "text-sm truncate",
                                    !n.read ? "font-semibold text-foreground" : "text-muted-foreground"
                                  )}>
                                    {n.title}
                                  </p>
                                </div>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                                  {timeAgo(n.time)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                            </div>
                            {!n.read && (
                              <Check className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                            )}
                          </div>
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-5 py-3 border-t border-border text-center shrink-0">
                <p className="text-xs text-muted-foreground">
                  {notifications.length} notification{notifications.length !== 1 ? "s" : ""} • Real-time updates active
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
