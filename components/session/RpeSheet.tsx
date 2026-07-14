"use client";

import { useId, useRef, useState } from "react";
import { useModalA11y } from "@/lib/utils/useModalA11y";

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
  const ref = useModalA11y<HTMLDivElement>(onCancel);
  const titleId = useId();

  // ── drag-to-dismiss ────────────────────────────────────────────────
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const onDragStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const onDragMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  };
  const onDragEnd = () => {
    if (dragY > 110) onCancel();
    setDragY(0);
    startY.current = null;
  };

  return (
    <div
      className="anim-fade-in fixed inset-0 z-40 flex items-end justify-center bg-black/60"
      onClick={onCancel}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="anim-slide-up w-full max-w-md rounded-t-2xl border-t border-border bg-surface p-5 pb-8 outline-none"
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="-mt-2 flex cursor-grab justify-center py-2 active:cursor-grabbing"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
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
                className="tap flex flex-col items-center justify-center gap-1 rounded-xl border py-3 transition-colors duration-200"
                style={
                  on
                    ? { background: accent, borderColor: accent, color: "var(--color-on-accent)" }
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
          aria-label="Nota da sessão (opcional)"
          className="mt-4 w-full resize-none rounded-xl border border-border bg-surface2 px-3 py-2 text-base outline-none placeholder:text-muted focus:border-muted"
        />

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="tap rounded-xl border border-border bg-surface2 px-4 py-3 font-medium text-muted"
          >
            Voltar
          </button>
          <button
            type="button"
            disabled={rpe === null}
            onClick={() => rpe !== null && onConfirm(rpe, note)}
            className="tap flex-1 rounded-xl py-3 font-medium transition-opacity disabled:opacity-40"
            style={{ background: accent, color: "var(--color-on-accent)" }}
          >
            Finalizar
          </button>
        </div>
      </div>
    </div>
  );
}
