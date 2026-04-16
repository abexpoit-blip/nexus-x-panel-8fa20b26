import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Cpu, HardDrive, Wifi, Clock, Zap, Database, Globe, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthMetric {
  label: string;
  value: number;
  max: number;
  unit: string;
  icon: React.ElementType;
  color: string;
  status: "healthy" | "warning" | "critical";
}

const getInitialMetrics = (): HealthMetric[] => [
  { label: "CPU Usage", value: 23, max: 100, unit: "%", icon: Cpu, color: "neon-cyan", status: "healthy" },
  { label: "Memory", value: 61, max: 100, unit: "%", icon: HardDrive, color: "neon-magenta", status: "healthy" },
  { label: "API Latency", value: 42, max: 500, unit: "ms", icon: Wifi, color: "neon-green", status: "healthy" },
  { label: "DB Queries/s", value: 284, max: 1000, unit: "/s", icon: Database, color: "neon-amber", status: "healthy" },
  { label: "Uptime", value: 99.97, max: 100, unit: "%", icon: Clock, color: "neon-green", status: "healthy" },
  { label: "Active Conns", value: 147, max: 500, unit: "", icon: Globe, color: "neon-cyan", status: "healthy" },
  { label: "Throughput", value: 1240, max: 5000, unit: "req/m", icon: Zap, color: "neon-magenta", status: "healthy" },
  { label: "SSL Cert", value: 42, max: 90, unit: "days", icon: Shield, color: "neon-green", status: "healthy" },
];

const getStatus = (val: number, max: number): "healthy" | "warning" | "critical" => {
  const ratio = val / max;
  // For uptime/SSL: higher is better, invert
  if (ratio > 0.85) return "healthy";
  if (ratio > 0.6) return "warning";
  return "critical";
};

const statusColors = {
  healthy: "bg-neon-green",
  warning: "bg-neon-amber",
  critical: "bg-neon-red",
};

export const SystemHealthMonitor = () => {
  const [metrics, setMetrics] = useState<HealthMetric[]>(getInitialMetrics);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate live metric fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((m) => {
          if (m.label === "Uptime" || m.label === "SSL Cert") return m;
          const jitter = (Math.random() - 0.5) * m.max * 0.08;
          const newVal = Math.max(1, Math.min(m.max * 0.9, m.value + jitter));
          const rounded = m.unit === "%" ? Math.round(newVal * 100) / 100 : Math.round(newVal);
          return { ...m, value: rounded, status: getStatus(rounded, m.max) };
        })
      );
      setLastUpdate(new Date());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" /> System Health
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span className="text-[10px] text-muted-foreground font-mono">
            Live • {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <m.icon className={cn("w-4 h-4 text-${m.color}", `text-${m.color}`)} />
              <div className={cn("w-1.5 h-1.5 rounded-full", statusColors[m.status])} />
            </div>
            <p className="text-lg font-display font-bold text-foreground">
              {m.label === "Uptime" ? (
                <>{m.value}{m.unit}</>
              ) : (
                <AnimatedCounter value={Math.round(m.value)} duration={800} suffix={m.unit} />
              )}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{m.label}</p>
            {/* Progress bar */}
            <div className="mt-2 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", `bg-${m.color}`)}
                initial={{ width: 0 }}
                animate={{ width: `${(m.value / m.max) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
};
