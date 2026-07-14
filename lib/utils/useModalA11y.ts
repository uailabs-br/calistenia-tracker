"use client";

import { useEffect, useRef } from "react";

/**
 * Comportamento de acessibilidade para diálogos/sheets modais:
 * - trava o scroll do fundo enquanto aberto
 * - fecha no Esc
 * - foca o primeiro elemento e mantém o foco preso (focus trap)
 * - restaura o foco anterior ao fechar
 *
 * Uso: aplique o ref retornado ao container do modal e passe onClose.
 */
export function useModalA11y<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);

  // onClose costuma ser uma closure nova a cada render do pai. Guardamos em ref
  // para o efeito rodar só na montagem — sem re-travar o scroll nem re-roubar o
  // foco quando o pai (ou o próprio modal) re-renderiza enquanto está aberto.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Scroll lock
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = () =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => !el.hasAttribute("disabled"))
        : [];

    // Foca o primeiro elemento interativo (ou o container)
    const first = focusable()[0];
    (first ?? node)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
    // Setup só na montagem; onClose sempre atual via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
