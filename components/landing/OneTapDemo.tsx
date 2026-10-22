"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/components/ui/icons";

/**
 * O cartão de sessão de verdade, tocável, no topo da página. É o herói porque a
 * promessa principal ("um toque por série") se prova em 2 segundos e não cabe
 * num parágrafo.
 *
 * Conteúdo fixo de propósito: nada aqui sai de `plan.json`, que vem do
 * localStorage e quebraria a hidratação desta página estática (regra 10).
 */
const ACCENT = "#8174e8";

const EXERCISES = [
  { name: "Muscle-up negativa", target: "3 × 3", last: "3, 3, 2" },
  { name: "Pull-up", target: "4 × 8", last: "8, 8, 7, 6" },
  { name: "Dip nas paralelas", target: "3 × 10", last: "10, 10, 8" },
] as const;

export function OneTapDemo() {
  const [done, setDone] = useState(0);
  const [hint, setHint] = useState(false);
  const touched = useRef(false);

  // Um único momento de movimento não pedido: se a pessoa não tocar, o primeiro
  // cartão se registra sozinho pra mostrar o que acontece. Uma vez só.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => {
      if (!touched.current) setDone((d) => (d === 0 ? 1 : d));
    }, 3500);
    return () => clearTimeout(t);
  }, []);

  function record() {
    touched.current = true;
    setHint(false);
    setDone((d) => d + 1);
  }

  function restart() {
    touched.current = true;
    setHint(false);
    setDone(0);
  }

  const finished = done >= EXERCISES.length;

  return (
    <div
      className="flex flex-col gap-2"
      style={{ "--ac": ACCENT } as React.CSSProperties}
      aria-label="Demonstração: registrar uma série com um toque"
    >
      {EXERCISES.map((ex, i) => {
        if (i < done) {
          return (
            <div
              key={ex.name}
              className="flex items-center justify-between gap-3 rounded-card border bg-surface px-4 py-3"
              style={{ borderColor: ACCENT }}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{ex.name}</p>
                <p className="tnum text-xs text-muted">{ex.target} · como previsto</p>
              </div>
              <span
                className="anim-pop flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{ background: ACCENT, color: "var(--color-on-accent)" }}
                aria-label="concluído"
              >
                <CheckIcon className="h-4 w-4" />
              </span>
            </div>
          );
        }

        if (i > done) {
          return (
            <div
              key={ex.name}
              className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3"
            >
              <p className="truncate font-medium text-muted">{ex.name}</p>
              <span className="tnum shrink-0 text-xs text-muted">{ex.target}</span>
            </div>
          );
        }

        return (
          <div
            key={ex.name}
            className="anim-fade-in-up rounded-card border bg-surface px-4 py-4"
            style={{ borderColor: ACCENT }}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="truncate font-semibold">{ex.name}</h3>
              <span className="tnum shrink-0 text-sm text-muted">{ex.target}</span>
            </div>
            <p className="tnum mt-0.5 text-xs text-muted">última: {ex.last}</p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={record}
                className="btn-primary tap flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-medium"
              >
                <CheckIcon className="h-5 w-5" />
                Fiz como previsto
              </button>
              <button
                type="button"
                onClick={() => {
                  touched.current = true;
                  setHint((h) => !h);
                }}
                className="btn-secondary tap rounded-xl px-4 font-medium"
                aria-expanded={hint}
              >
                Ajustar
              </button>
            </div>

            {hint && (
              <p className="anim-fade-in mt-3 text-xs text-muted">
                No app, aqui abrem os contadores de cada série — sem teclado.
              </p>
            )}
          </div>
        );
      })}

      <p className="mt-1 text-center text-xs text-muted">
        {finished ? (
          <>
            Treino registrado.{" "}
            <button
              type="button"
              onClick={restart}
              className="tap underline underline-offset-4"
              style={{ color: ACCENT }}
            >
              ver de novo
            </button>
          </>
        ) : (
          "Toque e veja: é assim que você registra, entre uma série e outra."
        )}
      </p>
    </div>
  );
}
