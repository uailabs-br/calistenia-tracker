"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { travelBetween } from "@/lib/utils/spaceTravel";

/**
 * Refaz um fade-up sutil a cada troca de rota (chave = pathname).
 * O movimento é anulado sob prefers-reduced-motion (ver globals.css).
 *
 * No tema espaço a troca é uma viagem no eixo z (deriva): a tela velha vem um
 * pouco pra perto e some (ou recua pro fundo) enquanto a nova chega. O React
 * tira a tela velha do DOM na troca, então uma cópia dela é tirada na limpeza
 * do ref (React 19 roda a limpeza com o nó ainda no lugar) e anima por cima,
 * sem React e sem toque.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Estável: com a chave mudando, ele roda uma vez por tela que sai e entra.
  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    arrive(el);
    return () => leave(el);
  }, []);
  return (
    <div key={pathname} ref={ref} data-path={pathname} className="anim-page">
      {children}
    </div>
  );
}

interface Ghost {
  node: HTMLElement;
  path: string;
  top: number;
  left: number;
  width: number;
  at: number;
}

let ghost: Ghost | null = null;

const spaceOn = () => document.documentElement.dataset.theme === "espaco";
/** Onde fica o "olho" da câmera: um pouco acima do meio, como no protótipo. */
const eyeY = (top: number) => `50% ${window.innerHeight * 0.42 - top}px`;

function leave(el: HTMLElement) {
  if (!spaceOn()) return;
  const r = el.getBoundingClientRect();
  ghost = {
    node: el.cloneNode(true) as HTMLElement,
    path: el.dataset.path ?? "",
    top: r.top,
    left: r.left,
    width: r.width,
    at: performance.now(),
  };
}

function arrive(el: HTMLElement) {
  const g = ghost;
  ghost = null;
  // A cópia precisa ser de outra tela e recente: o StrictMode desmonta e
  // remonta o mesmo nó, e uma navegação abortada deixaria cópia velha.
  if (!g || !spaceOn() || g.path === el.dataset.path || performance.now() - g.at > 2000) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const t = travelBetween(g.path, el.dataset.path ?? "");
  if (!t) return;

  document.querySelectorAll(".space-ghost").forEach((n) => n.remove());
  const layer = document.createElement("div");
  layer.className = "space-ghost";
  layer.setAttribute("aria-hidden", "true");
  layer.inert = true;
  // Voltando, a tela velha recua pro fundo: fica atrás da nova.
  if (t.dir < 0) layer.dataset.behind = "";
  const { node } = g;
  node.classList.remove("anim-page");
  node.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
  Object.assign(node.style, {
    position: "absolute",
    top: `${g.top}px`,
    left: `${g.left}px`,
    width: `${g.width}px`,
    margin: "0",
    transformOrigin: eyeY(g.top),
  });
  layer.appendChild(node);
  document.body.appendChild(layer);

  const near = 160;
  const far = 380;
  const zOut = t.dir > 0 ? near : -far;
  const zIn = t.dir > 0 ? -far : near;
  const easing = "cubic-bezier(0.3, 0, 0.2, 1)";
  const z = (px: number) => `perspective(900px) translateZ(${px}px)`;

  node
    .animate(
      [
        { transform: z(0), opacity: 1 },
        { transform: z(zOut * 0.5), opacity: 0.35, offset: 0.5 },
        { transform: z(zOut), opacity: 0 },
      ],
      { duration: t.ms * 0.85, easing, fill: "forwards" }
    )
    .finished.finally(() => layer.remove())
    .catch(() => {});

  el.style.transformOrigin = eyeY(el.getBoundingClientRect().top);
  el.animate(
    [
      { transform: z(zIn), opacity: 0 },
      { opacity: 0.4, offset: 0.45 },
      { transform: z(0), opacity: 1 },
    ],
    { duration: t.ms, easing }
  )
    .finished.finally(() => (el.style.transformOrigin = ""))
    .catch(() => {});
}
