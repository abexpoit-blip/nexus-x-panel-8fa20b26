import { cn } from "@/lib/utils";

interface NexusLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showVersion?: boolean;
}

const APP_VERSION = "v1.0.0";

const sizes = {
  sm: { container: "gap-0.5", nexus: "text-lg", x: "text-2xl" },
  md: { container: "gap-1", nexus: "text-2xl", x: "text-4xl" },
  lg: { container: "gap-1", nexus: "text-4xl", x: "text-6xl" },
};

export const NexusLogo = ({ size = "md", className, showVersion = false }: NexusLogoProps) => {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center select-none", s.container, className)}>
      <span className={cn("font-display font-bold tracking-tight text-foreground", s.nexus)}>
        Nexus
      </span>
      <span
        className={cn("font-display font-black relative", s.x)}
        style={{
          background: "linear-gradient(135deg, hsl(300, 100%, 45%), hsl(185, 100%, 50%), hsl(300, 100%, 55%))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "x-glow 3s ease-in-out infinite",
          filter: "drop-shadow(0 0 15px hsl(300, 100%, 45% / 0.6)) drop-shadow(0 0 30px hsl(185, 100%, 50% / 0.3))",
        }}
      >
        X
      </span>
      {showVersion && (
        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-white/[0.06] text-muted-foreground border border-white/[0.08]">
          {APP_VERSION}
        </span>
      )}
    </div>
  );
};

export { APP_VERSION };
