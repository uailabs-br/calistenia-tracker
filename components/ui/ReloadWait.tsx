"use client";

import { useEffect } from "react";
import { hideReloadWait } from "@/lib/utils/reloadWait";

/**
 * Fica sempre no HTML, escondida pelo CSS até o `data-reload-wait` ligar (ver
 * lib/utils/reloadWait.ts). Montar quer dizer que a recarga terminou.
 */
export function ReloadWait() {
  useEffect(() => {
    hideReloadWait();
  }, []);

  return (
    <div className="reload-wait" role="status">
      <p className="reload-wait-text text-sm text-muted" />
      <span className="reload-wait-line" aria-hidden="true" />
    </div>
  );
}
