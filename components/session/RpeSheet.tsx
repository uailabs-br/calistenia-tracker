"use client";

import { useState } from "react";

const RPE_LABELS = [
  { v: 1, label: "leve" },
  { v: 2, label: "tranquilo" },
  { v: 3, label: "moderado" },
  { v: 4, label: "puxado" },
  { v: 5, label: "no limite" },
];

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

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-md rounded-t-2xl border-t border-border bg-surface p-5 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h2 className="text-lg font-semibold">Como foi a sessão?</h2>
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
                className="tap flex flex-col items-center justify-center gap-1 rounded-xl border py-3 transition-colors duration-200"
                style={
                  on
                    ? { background: accent, borderColor: accent, color: "#0e0e0f" }
                    : {
                        borderColor: "var(--color-border)",
                        color: "var(--color-text)",
                      }
                }
              >
                <span className="tnum text-lg font-semibold">{v}</span>
                <span className="text-[10px] leading-none">{label}</span>
              </button>
            );
          })}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          rows={2}
          className="mt-4 w-full resize-none rounded-xl border border-border bg-surface2 px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-muted"
        />

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="tap rounded-xl border border-border bg-surface2 px-4 py-3 font-medium text-muted"
          >
            voltar
          </button>
          <button
            type="button"
            disabled={rpe === null}
            onClick={() => rpe !== null && onConfirm(rpe, note)}
            className="tap flex-1 rounded-xl py-3 font-medium transition-opacity disabled:opacity-40"
            style={{ background: accent, color: "#0e0e0f" }}
          >
            finalizar
          </button>
        </div>
      </div>
    </div>
  );
}
