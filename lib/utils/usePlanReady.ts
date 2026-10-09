"use client";

import { useEffect, useState } from "react";

/**
 * `false` no primeiro render, `true` depois do mount.
 *
 * O plano vem de `loadPlan()`, que lê o override do localStorage — inexistente
 * no HTML estático. Qualquer texto derivado do plano renderizado antes do mount
 * difere entre servidor e cliente e quebra a hidratação (React #418), que
 * descarta a árvore e re-renderiza. Telas que mostram conteúdo do plano esperam
 * este hook antes de pintar.
 */
export function usePlanReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
