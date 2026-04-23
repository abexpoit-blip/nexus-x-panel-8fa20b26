import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type Props = { children: ReactNode; routeKey: string };
type State = { error: Error | null; retrying: boolean };

// Catches chunk-load failures (common after a deploy — old hashed JS chunks
// 404) and any other render error inside a lazy route. On the FIRST chunk
// failure we silently force-reload the page once (with a session flag so we
// don't loop forever), so the user never has to manually press F5.
const RELOAD_FLAG = "__nx_chunk_reload__";

function isChunkError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || err);
  return /Loading chunk|Loading CSS chunk|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg);
}

export class RouteBoundary extends Component<Props, State> {
  state: State = { error: null, retrying: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, retrying: false };
  }

  componentDidUpdate(prevProps: Props) {
    // Reset on route change so a fresh navigation gets a clean attempt
    if (prevProps.routeKey !== this.props.routeKey && this.state.error) {
      this.setState({ error: null, retrying: false });
    }
  }

  componentDidCatch(error: Error) {
    if (isChunkError(error)) {
      try {
        const already = sessionStorage.getItem(RELOAD_FLAG);
        if (!already) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          this.setState({ retrying: true });
          // Hard reload — picks up the new asset manifest after a deploy
          window.location.reload();
          return;
        }
      } catch (_) { /* sessionStorage unavailable */ }
    }
    // eslint-disable-next-line no-console
    console.error("[RouteBoundary]", error);
  }

  retry = () => {
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch (_) {}
    this.setState({ error: null });
  };

  hardReload = () => {
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch (_) {}
    window.location.reload();
  };

  render() {
    if (this.state.retrying) {
      return (
        <div className="min-h-[40vh] flex items-center justify-center text-muted-foreground text-sm">
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Updating to latest version…
        </div>
      );
    }
    if (this.state.error) {
      const chunk = isChunkError(this.state.error);
      return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-center p-6">
          <div className="text-base font-semibold">
            {chunk ? "App was updated" : "Something went wrong loading this page"}
          </div>
          <div className="text-xs text-muted-foreground max-w-md">
            {chunk
              ? "A new version is available. Reload to continue."
              : this.state.error.message}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={this.retry}>Try again</Button>
            <Button size="sm" onClick={this.hardReload}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reload
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global listener: chunk preload failures sometimes surface as
// unhandledrejection BEFORE React's render cycle catches them. Reload once.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (ev) => {
    if (isChunkError(ev.reason)) {
      try {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, "1");
          window.location.reload();
        }
      } catch (_) {}
    }
  });
  // Clear the flag on a successful full load so future deploys can self-heal again
  window.addEventListener("load", () => {
    setTimeout(() => { try { sessionStorage.removeItem(RELOAD_FLAG); } catch (_) {} }, 5000);
  });
}
