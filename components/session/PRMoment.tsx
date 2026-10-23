"use client";

import { useEffect, useRef, useState } from "react";
import type { PRResult } from "@/lib/db/queries/pr";
import { Portal } from "@/components/ui/Portal";
import { haptic } from "@/lib/utils/haptics";

/**
 * Tela de recorde, brutalista de propósito: só preto e branco, sem brilho nem
 * easing. Um quadro de flash claro, corte seco pro escuro e os blocos entrando
 * um a um. É o único momento do treino que interrompe a tela inteira, então
 * fecha sozinho e qualquer toque dispensa. O toast com "Desfazer" fica por baixo.
 */
export function PRMoment({
  exerciseName,
  pr,
  onClose,
}: {
  exerciseName: string;
  pr: PRResult;
  onClose: () => void;
}) {
  const [flash, setFlash] = useState(true);
  // O pai re-renderiza a cada mudança no banco: o efeito roda só na montagem,
  // senão o fechamento automático reinicia e a vibração repete.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Foco no container, não no botão: leitor de tela anuncia o recorde e o
  // botão não nasce com o anel de foco aceso por cima do layout.
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    haptic(60);
    rootRef.current?.focus();
    const off = window.setTimeout(() => setFlash(false), 120);
    // entrada rápida (~1,3s), mas a tela fica parada o resto: lida ofegante
    const auto = window.setTimeout(() => onCloseRef.current(), 7000);
    return () => {
      window.clearTimeout(off);
      window.clearTimeout(auto);
    };
  }, []);

  const unitLabel = pr.unit === "seconds" ? "segundos numa série" : "reps numa série";
  const at = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

  return (
    <Portal>
      {/* div e não button na raiz: dentro de <button> o layout em coluna não
          respeita a largura e o texto vaza pela direita. */}
      <div
        ref={rootRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Novo recorde: ${pr.value} ${unitLabel} de ${exerciseName}, antes ${pr.previous}`}
        onClick={onClose}
        className={`fixed inset-0 z-[60] flex flex-col px-5 outline-none ${flash ? "bg-text" : "bg-bg"}`}
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
        }}
      >
        <div
          className={`mx-auto flex w-full max-w-md flex-1 flex-col justify-center text-text ${flash ? "opacity-0" : ""}`}
        >
          <span
            className="pr-cut self-start bg-text px-2 py-1 font-mono text-xs font-medium uppercase tracking-[0.14em] text-bg"
            style={at(0)}
          >
            Recorde
          </span>
          <p
            className="pr-cut mt-4 font-mono text-sm uppercase leading-snug tracking-[0.14em] [text-wrap:balance]"
            style={at(180)}
          >
            {exerciseName}
          </p>
          <span
            className="pr-slam display -ml-[0.06em] mt-6 mb-4 text-[length:min(72vw,18rem)] leading-[0.76] tracking-[-0.03em]"
            style={at(380)}
          >
            {pr.value}
          </span>
          <span className="pr-wipe block h-2.5 w-full bg-text" style={at(620)} />
          <div
            className="pr-cut flex items-baseline justify-between gap-4 pt-3 font-mono text-[13px] uppercase tracking-[0.1em]"
            style={at(900)}
          >
            <span>{unitLabel}</span>
            <span className="shrink-0">
              antes {pr.previous}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="pr-cut tap mx-auto w-full max-w-md text-left font-mono text-[11px] uppercase tracking-[0.1em] text-muted"
          style={at(1250)}
        >
          toque pra fechar
        </button>
      </div>
    </Portal>
  );
}
