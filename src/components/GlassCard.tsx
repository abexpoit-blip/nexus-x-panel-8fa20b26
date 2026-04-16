import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  glow?: "cyan" | "magenta" | "none";
}

export const GlassCard = ({ className, glow = "none", children, ...props }: GlassCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className={cn(
      "glass-card p-6 transition-all duration-300",
      glow === "cyan" && "neon-glow-cyan hover:neon-border-cyan",
      glow === "magenta" && "neon-glow-magenta hover:neon-border-magenta",
      className
    )}
    {...props}
  >
    {children}
  </motion.div>
);
