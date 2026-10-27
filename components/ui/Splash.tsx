"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isLanding } from "@/lib/utils/routes";

/** Tempo com a abertura inteira na tela antes de sumir, pra dar tempo de ver completa. */
const HOLD_MS = 1000;
/** Igual à transição de opacidade do `.splash` em globals.css. */
const FADE_MS = 320;
/**
 * Rede de segurança: se o `animationend` do nome não chegar (aba aberta em
 * segundo plano, animação suspensa), a abertura sai mesmo assim. Sequência
 * (~1,7 s) + parada + folga.
 */
const MAX_MS = 4200;

type Phase = "in" | "out" | "gone";

/**
 * Tela de abertura: o A se desenha e o nome sobe, e ela some sozinha.
 *
 * Fica no layout, que não remonta entre rotas, então só aparece quando a página
 * carrega do zero — trocar de aba ou voltar pro app não mostra de novo. O app
 * monta por baixo enquanto isso, então a retomada de um treino não espera por ela.
 * Um toque pula.
 *
 * A fase inicial é decidida no primeiro render (mesmo valor no HTML estático e
 * no cliente, sem quebrar a hidratação) e nunca volta pra "in": quem entra pela
 * landing e navega pro app não vê a abertura no meio do caminho.
 */
export function Splash() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>(() => (isLanding(pathname) ? "gone" : "in"));
  const nameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "gone") return;
    const t = setTimeout(() => setPhase(phase === "in" ? "out" : "gone"), phase === "in" ? MAX_MS : FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // O nome é a última peça a assentar. A animação é CSS e começa no primeiro
  // paint; num aparelho lento ela pode acabar antes da hidratação, e aí um
  // onAnimationEnd nunca chegaria. `finished` resolve na hora nesse caso.
  useEffect(() => {
    const anims = nameRef.current?.getAnimations?.() ?? [];
    if (anims.length === 0) return; // sem a API: fica com o MAX_MS
    let hold: ReturnType<typeof setTimeout> | undefined;
    let alive = true;
    Promise.all(anims.map((a) => a.finished))
      .then(() => {
        if (alive) hold = setTimeout(() => setPhase("out"), HOLD_MS);
      })
      .catch(() => {}); // animação cancelada (componente saiu): nada a fazer
    return () => {
      alive = false;
      clearTimeout(hold);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div className="splash" data-phase={phase} aria-hidden="true" onClick={() => setPhase("out")}>
      <div className="splash-lockup">
        <svg className="splash-mark" viewBox="-12 -12 453 384">
          <path className="splash-legs" d="M0 360 L214.6 0 L429.1 360 L346 360 L214.6 99.6 L83.1 360 Z" />
          <path
            className="splash-bar"
            d="M131.5 264.1 L214.6 206 L297.6 264.1 L307.8 284.2 L214.6 219 L121.4 284.2 Z"
          />
        </svg>
        <div ref={nameRef} className="splash-name">
          GRAVKS
        </div>
      </div>
    </div>
  );
}
