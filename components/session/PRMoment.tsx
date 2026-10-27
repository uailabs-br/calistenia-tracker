"use client";

import { useEffect, useRef, useState } from "react";
import type { PRResult } from "@/lib/db/queries/pr";
import { Portal } from "@/components/ui/Portal";
import { TrophyIcon } from "@/components/ui/icons";
import { countAt, easeOutCubic, progressAt } from "@/lib/domain/timeline";
import { useTimeline } from "@/lib/utils/useTimeline";
import { haptic } from "@/lib/utils/haptics";

const at = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;
const AUTO_CLOSE_MS = 6000;
const LEAVE_MS = 280;
/** A contagem começa depois que nome e número já entraram. */
const COUNT_START_MS = 900;
const COUNT_MS = 1100;

/**
 * Tela de recorde. Entra por opacidade, com brilho dourado no topo, e o número
 * conta do recorde anterior até o novo. Antes era flash claro + cortes secos
 * (steps): no celular aquilo lia como tela piscando, parecia bug. É o único
 * momento do treino que interrompe a tela inteira, então fecha sozinha e
 * qualquer toque dispensa. O toast com "Desfazer" fica por baixo.
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
  // Número sobe do recorde anterior até o novo, como no resumo do treino.
  const t = useTimeline(COUNT_START_MS + COUNT_MS);
  const counted = t >= COUNT_START_MS + COUNT_MS;
  const [leaving, setLeaving] = useState(false);
  // O pai re-renderiza a cada mudança no banco: os efeitos rodam só na montagem,
  // senão o fechamento automático reinicia e a vibração repete.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Foco no container, não no botão: leitor de tela anuncia o recorde e o
  // botão não nasce com o anel de foco aceso por cima do layout.
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    haptic(60);
    rootRef.current?.focus();
    const auto = window.setTimeout(() => setLeaving(true), AUTO_CLOSE_MS);
    return () => window.clearTimeout(auto);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => onCloseRef.current(), LEAVE_MS);
    return () => window.clearTimeout(id);
  }, [leaving]);

  const unitLabel = pr.unit === "seconds" ? "segundos numa série" : "reps numa série";
  const delta = pr.value - pr.previous;
  // A barra sai de onde estava o recorde anterior e enche junto com a contagem.
  const p = easeOutCubic(progressAt(t, COUNT_START_MS, COUNT_MS));
  const fill = (pr.previous + delta * p) / pr.value;

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
        onClick={() => setLeaving(true)}
        className={`pr-screen fixed inset-0 z-[60] flex flex-col px-5 text-text outline-none ${leaving ? "anim-leave" : "anim-fade-in"}`}
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 1.75rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
        }}
      >
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <span
            className="anim-rise flex h-14 w-14 items-center justify-center rounded-full border border-gold/50 bg-gold/18 text-gold"
            style={at(150)}
          >
            <TrophyIcon className="h-7 w-7" />
          </span>
          <p className="anim-rise eyebrow-lg mt-5 text-gold" style={at(250)}>
            Novo recorde
          </p>
          <p className="anim-rise mt-0.5 text-xl font-semibold leading-snug [text-wrap:balance]" style={at(300)}>
            {exerciseName}
          </p>
          <div className="anim-rise mt-5 flex items-end gap-3.5" style={at(400)}>
            <span className="display overflow-hidden pt-1.5 text-[length:min(46vw,11rem)] leading-[0.82] tracking-[-0.02em] text-gold">
              {countAt(t, pr.value, COUNT_START_MS, COUNT_MS, pr.previous)}
            </span>
            {counted && delta > 0 && (
              <span className="anim-pop mb-4 rounded-full bg-gold px-2.5 py-1 font-mono text-sm font-medium text-on-accent">
                +{delta}
              </span>
            )}
          </div>
          <div className="anim-rise mt-3.5 h-1 overflow-hidden rounded-full bg-gold/18" style={at(400)}>
            <div
              className="h-full origin-left bg-gold"
              style={{ transform: `scaleX(${fill})` }}
            />
          </div>
          <div
            className="anim-rise mt-2.5 flex items-baseline justify-between gap-4 font-mono text-sm text-muted"
            style={at(450)}
          >
            <span>{unitLabel}</span>
            <span className="shrink-0">antes {pr.previous}</span>
          </div>
        </div>
        <div className="mx-auto mb-3 h-0.5 w-full max-w-md overflow-hidden bg-surface2" aria-hidden="true">
          <div className="pr-drain h-full bg-muted" style={{ "--t": `${AUTO_CLOSE_MS}ms` } as React.CSSProperties} />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLeaving(true);
          }}
          className="tap mx-auto w-full max-w-md text-center font-mono text-2xs uppercase tracking-[0.14em] text-muted"
        >
          toque pra fechar
        </button>
      </div>
    </Portal>
  );
}
