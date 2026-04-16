import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

export type NotificationType = "info" | "success" | "warning" | "error" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: Date;
  read: boolean;
  icon?: string;
}

export interface NotificationPreferences {
  soundEnabled: boolean;
  soundVolume: number; // 0-100
  toastsEnabled: boolean;
  enabledTypes: Record<NotificationType, boolean>;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  soundVolume: 50,
  toastsEnabled: true,
  enabledTypes: { info: true, success: true, warning: true, error: true, system: true },
};

export interface Announcement {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: Date;
  read: boolean;
  icon?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  announcements: Announcement[];
  unreadCount: number;
  panelOpen: boolean;
  preferences: NotificationPreferences;
  addNotification: (n: Omit<Notification, "id" | "time" | "read">) => void;
  sendAnnouncement: (n: Omit<Announcement, "id" | "time" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  markAnnouncementRead: (id: string) => void;
  clearAll: () => void;
  togglePanel: () => void;
  closePanel: () => void;
  updatePreferences: (p: Partial<NotificationPreferences>) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

function playNotificationSound(volume: number) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    osc.type = "sine";

    const vol = (volume / 100) * 0.3;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);

    setTimeout(() => ctx.close(), 500);
  } catch {
    // Audio not available
  }
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: "1", type: "info", title: "New BD range added", message: "Grameenphone numbers now available for allocation", time: new Date(Date.now() - 2 * 60000), read: false, icon: "📱" },
  { id: "2", type: "success", title: "Rate card updated", message: "Robi operator rates adjusted to ৳22/OTP", time: new Date(Date.now() - 60 * 60000), read: false, icon: "💰" },
  { id: "3", type: "warning", title: "Provider latency spike", message: "IMS SMS latency exceeded 500ms threshold", time: new Date(Date.now() - 90 * 60000), read: false, icon: "⚡" },
  { id: "4", type: "system", title: "Scheduled maintenance", message: "System maintenance window at 3:00 AM BST", time: new Date(Date.now() - 3 * 3600000), read: true, icon: "🔧" },
  { id: "5", type: "error", title: "Seven1Tel offline", message: "Provider connection lost — 6,800 numbers affected", time: new Date(Date.now() - 4 * 3600000), read: true, icon: "🚫" },
];

const SIMULATED_EVENTS: Omit<Notification, "id" | "time" | "read">[] = [
  { type: "success", title: "Agent registered", message: "agent_phoenix just created an account", icon: "🆕" },
  { type: "info", title: "OTP batch completed", message: "245 OTPs delivered successfully via AccHub", icon: "✅" },
  { type: "warning", title: "High traffic alert", message: "SMS volume exceeding 500/min on MSI SMS", icon: "📊" },
  { type: "success", title: "Withdrawal processed", message: "agent_pro withdrew ৳5,200 to bKash", icon: "💸" },
  { type: "info", title: "Numbers restocked", message: "1,200 new Banglalink numbers added to pool", icon: "📱" },
  { type: "error", title: "Failed delivery", message: "12 OTPs failed on IMS SMS — auto-rerouting", icon: "⚠️" },
  { type: "system", title: "Rate limit triggered", message: "agent_king exceeded 50 req/min — throttled", icon: "🛡️" },
];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  { id: "a1", type: "info", title: "New BD Grameenphone range added", message: "500 new numbers available for BD-GP. Check Get Number to allocate.", time: new Date(Date.now() - 2 * 3600000), read: false, icon: "📱" },
  { id: "a2", type: "success", title: "Rate update for Robi", message: "Sell rate increased to ৳1.20 per OTP effective immediately.", time: new Date(Date.now() - 24 * 3600000), read: false, icon: "💰" },
  { id: "a3", type: "system", title: "Scheduled maintenance", message: "System maintenance window at 3:00 AM BST on April 18. Expect 15 min downtime.", time: new Date(Date.now() - 48 * 3600000), read: true, icon: "🔧" },
];

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const stored = localStorage.getItem("nexus_announcements");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((a: any) => ({ ...a, time: new Date(a.time) }));
      } catch { /* fallback */ }
    }
    return INITIAL_ANNOUNCEMENTS;
  });
  const [panelOpen, setPanelOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    const stored = localStorage.getItem("nexus_notif_prefs");
    return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
  });
  const eventIndexRef = useRef(0);
  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;

  // Persist announcements to localStorage
  useEffect(() => {
    localStorage.setItem("nexus_announcements", JSON.stringify(announcements));
  }, [announcements]);

  // Update browser tab title with unread count
  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadAnnouncements = announcements.filter((a) => !a.read).length;
  const totalUnread = unreadCount + unreadAnnouncements;

  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread}) Nexus X` : "Nexus X";
    return () => { document.title = "Nexus X"; };
  }, [totalUnread]);

  const addNotification = useCallback((n: Omit<Notification, "id" | "time" | "read">) => {
    const prefs = prefsRef.current;
    if (!prefs.enabledTypes[n.type]) return;

    const newNotif: Notification = {
      ...n,
      id: crypto.randomUUID(),
      time: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    if (prefs.soundEnabled) playNotificationSound(prefs.soundVolume);

    if (prefs.toastsEnabled) {
      const toastMethod = n.type === "error" ? toast.error
        : n.type === "warning" ? toast.warning
        : n.type === "success" ? toast.success
        : toast.info;
      toastMethod(n.title, { description: n.message, duration: 4000 });
    }
  }, []);

  const sendAnnouncement = useCallback((n: Omit<Announcement, "id" | "time" | "read">) => {
    const newAnnouncement: Announcement = {
      ...n,
      id: crypto.randomUUID(),
      time: new Date(),
      read: false,
    };
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const event = SIMULATED_EVENTS[eventIndexRef.current % SIMULATED_EVENTS.length];
      eventIndexRef.current += 1;
      addNotification(event);
    }, 18000 + Math.random() * 12000);

    return () => clearInterval(interval);
  }, [addNotification]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  const markAnnouncementRead = useCallback((id: string) => {
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);
  const togglePanel = useCallback(() => setPanelOpen((p) => !p), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  const updatePreferences = useCallback((p: Partial<NotificationPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...p };
      localStorage.setItem("nexus_notif_prefs", JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications, announcements, unreadCount, panelOpen, preferences,
      addNotification, sendAnnouncement, markAsRead, markAllRead, markAnnouncementRead,
      clearAll, togglePanel, closePanel, updatePreferences,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};
