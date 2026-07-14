"use client";

import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/domain/parseTarget";
import { PlusIcon } from "@/components/ui/icons";
import { useModalA11y } from "@/lib/utils/useModalA11y";

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
  const [total, setTotal] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const [finished, setFinished] = useState(false);
  const endRef = useRef(Date.now() + seconds * 1000);

  // Centraliza o timer, trava o fundo, foca o card ao iniciar e fecha no Esc.
  const modalRef = useModalA11y<HTMLDivElement>(onDone);

  // Countdown por relógio de parede (robusto a throttling de aba em background)
  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) setFinished(true);
    };
    tick();
    const id = window.setInterval(tick, 250);
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

  const addTime = () => {
    endRef.current += 15_000;
    setTotal((t) => t + 15);
    setFinished(false);
  };

  const pct = total > 0 ? Math.max(0, (remaining / total) * 100) : 0;

  // Anel de progresso (SVG), centralizado sobre o overlay escurecido.
  const size = 176;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const color = finished ? "var(--color-success)" : accent;

  return (
    <div
      className="anim-fade-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div
        ref={modalRef}
        className="anim-scale-in flex flex-col items-center gap-4 rounded-2xl border bg-surface2 px-7 py-6 shadow-2xl outline-none"
        style={{ borderColor: color }}
      >
        <div className="relative" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            className="-rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={stroke}
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
              className="transition-[stroke-dashoffset] duration-300 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="tnum text-[3.25rem] font-semibold leading-none tabular-nums"
              style={{ color }}
            >
              {finished ? "✓" : formatClock(remaining)}
            </span>
            <span className="mt-1.5 font-mono text-xs uppercase tracking-wide text-muted">
              {finished ? "concluído" : "descanso"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!finished && (
            <button
              type="button"
              onClick={addTime}
              className="tap flex items-center gap-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4" />
              15s
            </button>
          )}
          <button
            type="button"
            onClick={onDone}
            className="tap rounded-xl px-5 py-2.5 text-sm font-semibold"
            style={
              finished
                ? { background: color, color: "var(--color-on-accent)" }
                : { color: accent }
            }
          >
            {finished ? "ok" : "pular"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
