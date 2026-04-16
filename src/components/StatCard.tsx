import { cn } from "@/lib/utils";
import { GlassCard } from "./GlassCard";
import { AnimatedCounter } from "./AnimatedCounter";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color?: "cyan" | "magenta" | "green" | "amber";
  className?: string;
}

const colorMap = {
  cyan: { icon: "text-neon-cyan", bg: "bg-neon-cyan/10", glow: "cyan" as const },
  magenta: { icon: "text-neon-magenta", bg: "bg-neon-magenta/10", glow: "magenta" as const },
  green: { icon: "text-neon-green", bg: "bg-neon-green/10", glow: "none" as const },
  amber: { icon: "text-neon-amber", bg: "bg-neon-amber/10", glow: "none" as const },
};

/** Extract numeric value and prefix/suffix from a display string like "৳25,800" or "43,000" */
const parseValue = (val: string | number): { num: number; prefix: string; suffix: string } => {
  if (typeof val === "number") return { num: val, prefix: "", suffix: "" };
  const match = val.match(/^([^\d]*?)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) return { num: 0, prefix: "", suffix: val };
  return {
    prefix: match[1],
    num: parseFloat(match[2].replace(/,/g, "")),
    suffix: match[3],
  };
};

export const StatCard = ({ label, value, icon: Icon, trend, color = "cyan", className }: StatCardProps) => {
  const c = colorMap[color];
  const { num, prefix, suffix } = parseValue(value);

  return (
    <GlassCard glow={c.glow} className={cn("flex items-start justify-between", className)}>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="text-3xl font-display font-bold text-foreground">
          <AnimatedCounter value={num} prefix={prefix} suffix={suffix} duration={1800} />
        </p>
        {trend && <p className="text-xs text-neon-green font-medium">{trend}</p>}
      </div>
      <div className={cn("p-3 rounded-xl", c.bg)}>
        <Icon className={cn("w-6 h-6", c.icon)} />
      </div>
    </GlassCard>
  );
};
