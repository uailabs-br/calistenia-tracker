"use client";

import { useEffect } from "react";

/**
 * Mantém a tela acesa enquanto `active`. Re-adquire em visibilitychange
 * (obrigatório no iOS: o lock cai ao trocar de app).
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined") return;
    const wl = navigator.wakeLock;
    if (!wl) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await wl.request("screen");
      } catch {
        /* negado / bateria baixa — segue sem lock */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !cancelled) acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
