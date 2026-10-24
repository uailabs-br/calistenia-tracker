"use client";

import { useId, useState } from "react";
import { Sheet } from "@/components/ui/Modal";
import { accentVars } from "@/components/ui/accent";

const RPE_LABELS = [
  { v: 1, label: "leve" },
  { v: 2, label: "tranquilo" },
  { v: 3, label: "moderado" },
  { v: 4, label: "puxado" },
  { v: 5, label: "no limite" },
];

// Boca por nível: sorriso largo → neutro → careta (traço, estilo dos ícones do app)
const MOUTHS: Record<number, string> = {
  1: "M8.5 13.5c1.2 2 5.8 2 7 0",
  2: "M9 14c1.2 1.2 4.8 1.2 6 0",
  3: "M9 14.75h6",
  4: "M9 15.5c1.2-1.2 4.8-1.2 6 0",
};

/** Carinha de esforço (1 leve → 5 no limite). SVG stroke, currentColor. */
function EffortFace({ level, className }: { level: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="9.5" r="1.1" fill="currentColor" />
      <circle cx="15" cy="9.5" r="1.1" fill="currentColor" />
      {level === 5 ? (
        // boca aberta: esforço máximo
        <ellipse cx="12" cy="15" rx="2" ry="2.4" stroke="currentColor" strokeWidth="1.8" />
      ) : (
        <path
          d={MOUTHS[level]}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function RpeSheet({
  accent,
  pendingCount,
  onConfirm,
  onCancel,
}: {
  accent: string;
  pendingCount: number;
  onConfirm: (rpe: number, note: string) => void;
  onCancel: () => void;
}) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const titleId = useId();

  return (
    <Sheet
      labelledBy={titleId}
      onClose={onCancel}
      draggable
      className="p-5 pb-8"
      style={accentVars(accent)}
    >
      <h2 id={titleId} className="text-lg font-semibold">
        Como foi a sessão?
      </h2>
      {pendingCount > 0 && (
        <p className="mt-1 text-sm text-muted">
          {pendingCount}{" "}
          {pendingCount === 1 ? "exercício não marcado" : "exercícios não marcados"}{" "}
          ficam sem registro.
        </p>
      )}

      <div className="mt-4 grid grid-cols-5 gap-2">
        {RPE_LABELS.map(({ v, label }) => {
          const on = rpe === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setRpe(v)}
              aria-pressed={on}
              aria-label={`RPE ${v} — ${label}`}
              className={`tap flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 transition-colors duration-200 ${
                on ? "border-ac bg-ac text-on-accent" : "border-border text-text"
              }`}
            >
              <EffortFace level={v} className="h-6 w-6" />
              <span className="tnum text-xs font-semibold">{v}</span>
              <span className="text-3xs leading-none">{label}</span>
            </button>
          );
        })}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (opcional)"
        rows={2}
        aria-label="Nota da sessão (opcional)"
        className="field mt-4 resize-none py-2"
      />

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-neutral tap rounded-xl px-4 py-3 font-medium text-muted"
        >
          Voltar
        </button>
        <button
          type="button"
          disabled={rpe === null}
          onClick={() => rpe !== null && onConfirm(rpe, note)}
          className="btn-primary tap flex-1 rounded-xl py-3 font-medium transition-opacity disabled:opacity-40"
        >
          Finalizar
        </button>
      </div>
    </Sheet>
  );
}
