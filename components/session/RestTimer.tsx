"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatClock } from "@/lib/domain/parseTarget";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import { useModalA11y } from "@/lib/utils/useModalA11y";
import { Portal } from "@/components/ui/Portal";
import { themedAccent } from "@/components/ui/accent";

/**
 * Timer de descanso pós-registro. Countdown no accent do dia, com feedback
 * tátil/sonoro ao terminar. Remonta a cada novo descanso (key no pai).
 */
export function RestTimer({
  seconds,
  accent,
  onDone,
}: {
  seconds: number;
  accent: string;
  onDone: () => void;
}) {
  const [totalMs, setTotalMs] = useState(seconds * 1000);
  const [remainingMs, setRemainingMs] = useState(seconds * 1000);
  const [finished, setFinished] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const endRef = useRef(Date.now() + seconds * 1000);

  // Centraliza o timer, trava o fundo, foca o card ao iniciar e fecha no Esc.
  // Desliga tudo isso quando minimizado, pra liberar navegação no resto do app.
  const modalRef = useModalA11y<HTMLDivElement>(onDone, !minimized);

  // Countdown por relógio de parede (robusto a throttling de aba em background).
  // Tick de 100ms + precisão de ms: o anel anda contínuo, não em degraus de 1s.
  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, endRef.current - Date.now());
      setRemainingMs(left);
      if (left <= 0) setFinished(true);
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, []);

  // Feedback ao terminar + auto-dismiss
  useEffect(() => {
    if (!finished) return;
    navigator.vibrate?.([80, 60, 80]);
    beep();
    const id = window.setTimeout(onDone, 1400);
    return () => window.clearTimeout(id);
  }, [finished, onDone]);

  // Ajuste de ±5s. No "−", clampa em agora: com menos de 5s restantes,
  // encurtar encerra o descanso naturalmente no próximo tick.
  const adjust = (deltaSec: number) => {
    endRef.current = Math.max(Date.now(), endRef.current + deltaSec * 1000);
    setTotalMs((t) => Math.max(1000, t + deltaSec * 1000));
  };

  const pct =
    totalMs > 0 ? Math.min(100, Math.max(0, (remainingMs / totalMs) * 100)) : 0;
  // ceil: mostra o segundo corrente até ele de fato acabar
  const remaining = Math.ceil(remainingMs / 1000);
  // reta final: pulsa nos últimos 5s para avisar sem depender do olhar no número
  const ending = !finished && remaining <= 5;

  // Anel fino por fora + disco que enche de líquido conforme o descanso passa.
  // Cheio = descansado: o líquido vira verde e o número dá lugar a um check.
  // Futurista e espaço desenham como nos protótipos (classes `rest-*`): sem o
  // líquido, com régua, anel maior e título em cima; o espaço põe um satélite
  // na ponta do arco.
  const size = 176;
  const stroke = 3;
  const radius = (size - stroke) / 2 - 1;
  const circ = 2 * Math.PI * radius;
  const disc = size / 2 - 9;
  // No tema tático o descanso tem cor própria (--rest-color, laranja de alerta);
  // no padrão a variável não existe e segue o accent do treino.
  const ac = `var(--rest-color, ${themedAccent(accent)})`;
  const color = finished ? "var(--color-success)" : ac;
  const elapsed = finished ? 1 : 1 - pct / 100;
  // y da superfície: começa abaixo do disco e termina acima dele, pra a crista
  // da onda não deixar fresta no topo quando enche.
  const level = size - elapsed * (size + WAVE_AMP * 2);
  // Líquido translúcido durante a contagem: o número em --color-text continua
  // legível com qualquer accent por baixo. No fim, cor cheia sob o check escuro.
  const liquidFront = finished ? color : `color-mix(in oklab, ${color} 55%, transparent)`;
  const liquidBack = `color-mix(in oklab, ${color} 28%, transparent)`;
  // Ponta do arco (0° = topo, horário): onde o satélite do espaço fica.
  const head = (pct / 100) * 2 * Math.PI;
  const satX = size / 2 + radius * Math.sin(head);
  const satY = size / 2 - radius * Math.cos(head);

  if (minimized) {
    return (
      <Portal>
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="Expandir timer de descanso"
          className="tap anim-fade-in fixed inset-x-0 top-0 z-40 mx-auto flex w-fit items-center gap-2 rounded-b-2xl border border-t-0 bg-surface2 px-4 pb-2 shadow-lg"
          style={{ borderColor: color, paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
        >
          <span
            className={`tnum text-lg font-semibold tabular-nums ${ending ? "anim-pulse" : ""}`}
            style={{ color }}
          >
            {finished ? "✓" : formatClock(remaining)}
          </span>
          <span className="eyebrow-lg">
            descanso
          </span>
        </button>
      </Portal>
    );
  }

  return (
    <Portal>
    <div
      className="anim-fade-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      onClick={() => setMinimized(true)}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="rest-card glass glass-key anim-scale-in flex flex-col items-center gap-4 rounded-2xl border bg-surface2 px-7 py-6 shadow-2xl outline-none"
        style={{ borderColor: color }}
      >
        <p className="rest-title eyebrow-lg hidden">{finished ? "Pronto" : "Descanso"}</p>
        <div className="rest-ring relative" style={{ width: size, height: size }}>
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${size} ${size}`}
            className="overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <clipPath id={CLIP_ID}>
                <circle cx={size / 2} cy={size / 2} r={disc} />
              </clipPath>
            </defs>
            <path
              d={restTicks(size / 2, radius)}
              stroke="var(--color-muted)"
              strokeWidth={1}
              opacity={0.55}
              className="rest-ticks hidden"
            />
            <circle className="rest-disc" cx={size / 2} cy={size / 2} r={disc} fill="var(--color-bg)" />
            <circle
              className="rest-core hidden"
              cx={size / 2}
              cy={size / 2}
              r={size * 0.26}
              fill="color-mix(in oklab, var(--ac) 6%, transparent)"
            />
            <g className="rest-liquid" clipPath={`url(#${CLIP_ID})`}>
              <g
                className="transition-transform duration-150 ease-linear"
                style={{ transform: `translateY(${level}px)` }}
              >
                <path
                  d={WAVE_PATH}
                  className="rest-wave-back transition-[fill] duration-500"
                  style={{ fill: liquidBack, "--wave-shift": `-${WAVE_LEN}px` } as CSSProperties}
                />
                {/* defasagem no <g>: a animação CSS sobrescreve o transform do próprio path */}
                <g transform={`translate(${-WAVE_LEN / 2} ${WAVE_AMP})`}>
                  <path
                    d={WAVE_PATH}
                    className="rest-wave transition-[fill] duration-500"
                    style={{ fill: liquidFront, "--wave-shift": `-${WAVE_LEN}px` } as CSSProperties}
                  />
                </g>
              </g>
            </g>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={stroke}
              className="rest-track"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={finished ? 0 : circ * (1 - pct / 100)}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className={`rest-arc transition-[stroke-dashoffset] duration-150 ease-linear ${finished ? "rest-arc-done" : ""}`}
              style={{
                // overflow-visible no svg: o arco encosta na borda e cortaria o brilho.
                filter: `drop-shadow(0 0 4px color-mix(in oklab, ${color} 50%, transparent)) drop-shadow(0 0 10px color-mix(in oklab, ${color} 22%, transparent))`,
              }}
            />
            {!finished && (
              <circle
                className="rest-sat hidden"
                cx={satX}
                cy={satY}
                r={6}
                fill={color}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {finished ? (
              <>
              <span className="rest-ok display hidden">OK</span>
              <svg
                viewBox="0 0 24 24"
                className="rest-check h-[72px] w-[72px]"
                fill="none"
                stroke="var(--color-on-accent)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                role="img"
                aria-label="Descanso concluído"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" className="check-draw" />
              </svg>
              </>
            ) : (
              <>
                <span
                  className={`rest-clock display text-display-lg leading-none ${ending ? "anim-pulse" : ""}`}
                  style={{ textShadow: "0 2px 12px rgb(0 0 0 / 0.5)" }}
                >
                  {formatClock(remaining)}
                </span>
                <span className="rest-label eyebrow-lg mt-1.5">
                  descanso
                </span>
              </>
            )}
          </div>
        </div>

        {/* No fim não tem botão: ele fecha sozinho em 1,4s. */}
        {!finished && (
          <div className="rest-btns flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjust(-5)}
              aria-label="Diminuir 5 segundos"
              className="tap flex items-center gap-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium"
            >
              <MinusIcon className="h-4 w-4" />
              5s
            </button>
            <button
              type="button"
              onClick={() => adjust(5)}
              aria-label="Aumentar 5 segundos"
              className="tap flex items-center gap-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4" />
              5s
            </button>
            <button
              type="button"
              onClick={onDone}
              className="rest-skip tap rounded-xl px-5 py-2.5 text-sm font-semibold"
              style={{ color: ac }}
            >
              pular
            </button>
          </div>
        )}
      </div>
    </div>
    </Portal>
  );
}

/** Régua do futurista por fora do anel: 60 marcas, a cada 5 uma mais longa. */
function restTicks(c: number, ring: number): string {
  const outer = ring + 13;
  let d = "";
  for (let i = 0; i < 60; i++) {
    const rad = (i * 6 * Math.PI) / 180;
    const inner = i % 5 === 0 ? ring + 6 : ring + 9;
    const s = Math.sin(rad);
    const k = Math.cos(rad);
    d += `M${(c + inner * s).toFixed(2)} ${(c - inner * k).toFixed(2)}L${(c + outer * s).toFixed(2)} ${(c - outer * k).toFixed(2)}`;
  }
  return d;
}

// Só existe um timer montado por vez, então o id do clip pode ser fixo.
const CLIP_ID = "rest-timer-disc";
/** Onda do líquido: comprimento e amplitude em px (o svg não tem viewBox). */
const WAVE_LEN = 88;
const WAVE_AMP = 6;
// Largura de 3 ondas além do disco: o path desliza um comprimento sem expor a ponta.
const WAVE_PATH = (() => {
  let d = `M0 0`;
  for (let i = 0; i < 5; i++) d += ` q ${WAVE_LEN / 4} ${-WAVE_AMP} ${WAVE_LEN / 2} 0 t ${WAVE_LEN / 2} 0`;
  return `${d} V 400 H 0 Z`;
})();

/** Bip curto via Web Audio (sem asset). Silencioso se indisponível. */
function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
    osc.onended = () => ctx.close();
  } catch {
    /* áudio bloqueado — segue só com vibração */
  }
}
