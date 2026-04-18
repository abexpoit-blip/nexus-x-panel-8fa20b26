import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Shared page-state synced to a URL query param so refresh / share keeps
 * users on the same page. Multiple tables on one page can each pass a
 * unique `key` (e.g. "page", "wd", "ledger") to avoid collisions.
 *
 * Falls back gracefully to plain useState when no Router is mounted (tests).
 */
export function usePageParam(key = "page", initial = 1): [number, (n: number) => void] {
  // Try to use react-router; fall back if absent.
  let sp: URLSearchParams | null = null;
  let setSp: ((next: URLSearchParams, opts?: { replace?: boolean }) => void) | null = null;
  try {
    const [params, setParams] = useSearchParams();
    sp = params;
    setSp = (next, opts) => setParams(next, opts);
  } catch {
    /* no router context — use local state */
  }

  const fromUrl = sp ? Math.max(1, parseInt(sp.get(key) || "", 10) || initial) : initial;
  const [local, setLocal] = useState(fromUrl);

  // Keep local in sync if URL changes externally (e.g. browser back).
  useEffect(() => {
    if (sp) {
      const v = Math.max(1, parseInt(sp.get(key) || "", 10) || initial);
      if (v !== local) setLocal(v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp?.get(key)]);

  const setPage = useCallback(
    (n: number) => {
      const next = Math.max(1, n | 0);
      setLocal(next);
      if (sp && setSp) {
        const updated = new URLSearchParams(sp);
        if (next === 1) updated.delete(key); // keep URL clean for page 1
        else updated.set(key, String(next));
        setSp(updated, { replace: true });
      }
    },
    [sp, setSp, key]
  );

  return [local, setPage];
}
