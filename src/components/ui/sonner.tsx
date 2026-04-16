import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      position="top-right"
      visibleToasts={3}
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white/[0.06] group-[.toaster]:backdrop-blur-2xl group-[.toaster]:text-foreground group-[.toaster]:border-white/[0.12] group-[.toaster]:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success:
            "group-[.toaster]:!border-l-[3px] group-[.toaster]:!border-l-neon-green group-[.toaster]:shadow-[0_0_20px_hsl(150,100%,50%,0.08)]",
          error:
            "group-[.toaster]:!border-l-[3px] group-[.toaster]:!border-l-destructive group-[.toaster]:shadow-[0_0_20px_hsl(0,100%,60%,0.08)]",
          warning:
            "group-[.toaster]:!border-l-[3px] group-[.toaster]:!border-l-neon-amber group-[.toaster]:shadow-[0_0_20px_hsl(38,100%,50%,0.08)]",
          info:
            "group-[.toaster]:!border-l-[3px] group-[.toaster]:!border-l-primary group-[.toaster]:shadow-[0_0_20px_hsl(185,100%,50%,0.08)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
