"use client";

import { useId, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Modal";
import { accentVars } from "@/components/ui/accent";

/**
 * "Como foi?" e nota, logo depois de fechar o exercício e antes do descanso.
 * Fora do card ele fica enxuto durante as séries, e a marcação vem quando o
 * exercício inteiro já aconteceu. Fechar por qualquer caminho (botão, fundo,
 * arrastar, Esc) grava o que foi marcado: toque dado não se perde.
 */
export function ExerciseFeedbackSheet({
  exerciseName,
  flags,
  accent,
  onDone,
  onUndo,
}: {
  exerciseName: string;
  flags: string[];
  accent: string;
  onDone: (flags: string[], note: string) => void;
  /** Desfaz o registro do exercício (no lugar do toast, que cobriria o sheet). */
  onUndo: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const titleId = useId();

  // fecha uma vez só: Esc e o toque no fundo podem chegar juntos
  const closed = useRef(false);
  const finish = () => {
    if (closed.current) return;
    closed.current = true;
    onDone(selected, note);
  };

  const toggle = (flag: string) =>
    setSelected((prev) => (prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]));

  return (
    <Sheet
      labelledBy={titleId}
      onClose={finish}
      draggable
      className="p-5 pb-8"
      style={accentVars(accent)}
    >
      <p className="eyebrow">Registrado</p>
      <h2 id={titleId} className="display mt-0.5 text-[1.625rem] leading-tight">
        {exerciseName}
      </h2>

      {flags.length > 0 && (
        <div className="mt-4">
          <p className="font-medium">Como foi?</p>
          <p className="mb-2 text-2xs text-muted">se foi a maioria das reps</p>
          <div className="flex flex-wrap gap-2">
            {flags.map((flag) => {
              const on = selected.includes(flag);
              return (
                <button
                  key={flag}
                  type="button"
                  onClick={() => toggle(flag)}
                  aria-pressed={on}
                  className={`tap rounded-full border px-3 text-sm transition-colors duration-200 ${
                    on ? "border-ac bg-ac text-on-accent" : "border-border text-muted"
                  }`}
                >
                  {flag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota (opcional). Ex: punho doeu no 3º set"
        rows={2}
        aria-label="Nota do exercício (opcional)"
        className="field mt-4 resize-none py-2"
      />

      <button
        type="button"
        onClick={finish}
        className="btn-primary tap mt-4 w-full rounded-xl py-3.5 font-medium"
      >
        Concluir exercício
      </button>
      <button
        type="button"
        onClick={() => {
          closed.current = true;
          onUndo();
        }}
        className="tap mx-auto mt-1 block px-3 font-mono text-xs text-muted"
      >
        desfazer registro
      </button>
    </Sheet>
  );
}
