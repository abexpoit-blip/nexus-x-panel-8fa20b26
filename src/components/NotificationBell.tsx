import { Bell } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";

export const NotificationBell = () => {
  const { unreadCount, togglePanel } = useNotifications();

  return (
    <button
      onClick={togglePanel}
      className="relative p-2 rounded-lg glass hover:bg-white/[0.08] transition-colors"
    >
      <Bell className="w-5 h-5 text-muted-foreground" />
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] bg-neon-magenta rounded-full text-[10px] font-bold flex items-center justify-center text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};
