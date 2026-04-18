// Service/CLI badge color mapping — used on Console + History pages
// Returns Tailwind classes that respect the design system tokens.
export function cliBadgeClass(cli?: string | null): string {
  if (!cli) return "bg-muted/30 text-muted-foreground";
  const c = cli.toLowerCase();
  if (c.includes("facebook")) return "bg-[hsl(217_89%_55%/0.15)] text-[hsl(217_89%_70%)]";
  if (c.includes("whatsapp")) return "bg-[hsl(142_70%_45%/0.15)] text-[hsl(142_70%_60%)]";
  if (c.includes("telegram")) return "bg-[hsl(200_100%_50%/0.15)] text-[hsl(200_100%_65%)]";
  if (c.includes("apple")) return "bg-[hsl(0_0%_60%/0.15)] text-[hsl(0_0%_85%)]";
  if (c.includes("paypal")) return "bg-[hsl(210_60%_45%/0.15)] text-[hsl(210_70%_70%)]";
  if (c.includes("google") || c.includes("gmail")) return "bg-[hsl(4_90%_58%/0.15)] text-[hsl(4_90%_70%)]";
  if (c.includes("instagram")) return "bg-[hsl(330_70%_55%/0.15)] text-[hsl(330_70%_70%)]";
  if (c.includes("tiktok")) return "bg-[hsl(0_0%_30%/0.25)] text-[hsl(0_0%_90%)]";
  if (c.includes("twitter") || c === "x") return "bg-[hsl(0_0%_20%/0.3)] text-[hsl(0_0%_85%)]";
  if (c.includes("discord")) return "bg-[hsl(235_86%_65%/0.15)] text-[hsl(235_86%_75%)]";
  if (c.includes("microsoft") || c.includes("outlook")) return "bg-[hsl(207_100%_42%/0.15)] text-[hsl(207_100%_65%)]";
  return "bg-secondary text-secondary-foreground";
}
