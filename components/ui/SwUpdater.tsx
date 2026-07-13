"use client";

import { useEffect, useState } from "react";

/**
 * Registra o service worker e mostra um prompt de reload quando há
 * atualização esperando (estratégia skipWaiting-por-prompt).
 */
export function SwUpdater() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }

    let reg: ServiceWorkerRegistration | null = null;

    const onUpdateFound = () => {
      const sw = reg?.installing;
      if (!sw) return;
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && navigator.serviceWorker.controller) {
          setWaiting(sw);
        }
      });
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        reg = registration;
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaiting(registration.waiting);
        }
        registration.addEventListener("updatefound", onUpdateFound);
      })
      .catch(() => {
        /* SW indisponível — app segue funcionando online */
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    // Best-effort: pede persistência do storage (mitiga eviction no iOS)
    if (navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed inset-x-3 top-3 z-50 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface2 px-4 py-3 text-sm shadow-lg">
      <span>Nova versão disponível.</span>
      <button
        onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}
        className="tap rounded-lg bg-text px-3 py-1.5 font-medium text-bg"
      >
        Atualizar
      </button>
    </div>
  );
}
