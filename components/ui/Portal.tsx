"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Monta os filhos direto no `document.body`, fora de qualquer ancestral com
 * `transform` (ex.: PageTransition) que quebra `position: fixed`. Garante que
 * overlays/dialogs centralizem na viewport real. No-op no SSR.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
