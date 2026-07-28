"use client";

import { useId, useState } from "react";
import { useModalA11y } from "@/lib/utils/useModalA11y";
import { Portal } from "@/components/ui/Portal";

export interface LoggableDay {
  daysAgo: number;
  label: string;
}

/** Form mínimo pra registrar um treino avulso: dia + duração aproximada. */
export function FreeformLogModal({
  days,
  onConfirm,
  onCancel,
}: {
  /** Dias sem nenhum treino registrado ainda (hoje, ontem, anteontem...). */
  days: LoggableDay[];
  onConfirm: (daysAgo: number, durationMinutes?: number) => void;
  onCancel: () => void;
}) {
  const [daysAgo, setDaysAgo] = useState(days[0]?.daysAgo ?? 0);
  const [minutes, setMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useModalA11y<HTMLDivElement>(onCancel);
  const titleId = useId();
  const inputId = useId();

  const submit = async () => {
    setSaving(true);
    const parsed = Number(minutes);
    onConfirm(daysAgo, minutes.trim() && parsed > 0 ? parsed : undefined);
  };

  return (
    <Portal>
      <div
        className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
        onClick={onCancel}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="anim-scale-in w-full max-w-sm rounded-2xl border border-border bg-surface p-5 outline-none"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id={titleId} className="text-lg font-semibold">
            Treino fora do programa
          </h2>
          <p className="mt-1 text-sm leading-snug text-muted">
            Marca o dia como treinado, mesmo sem seguir o plano.
          </p>

          {days.length > 1 && (
            <>
              <p className="mt-4 text-sm font-medium">Qual dia?</p>
              <div className="mt-1.5 flex gap-2">
                {days.map((d) => {
                  const on = d.daysAgo === daysAgo;
                  return (
                    <button
                      key={d.daysAgo}
                      type="button"
                      onClick={() => setDaysAgo(d.daysAgo)}
                      aria-pressed={on}
                      className="tap flex-1 rounded-xl border py-2 text-sm font-medium transition-colors duration-200"
                      style={
                        on
                          ? {
                              background: "var(--color-text)",
                              borderColor: "var(--color-text)",
                              color: "var(--color-bg)",
                            }
                          : {
                              borderColor: "var(--color-border)",
                              color: "var(--color-text)",
                            }
                      }
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <label htmlFor={inputId} className="mt-4 block text-sm font-medium">
            Duração aproximada (opcional)
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="ex: 30"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-base outline-none placeholder:text-muted focus:border-muted"
            />
            <span className="shrink-0 text-sm text-muted">min</span>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="tap flex-1 rounded-xl border border-border bg-surface2 py-3 font-medium text-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="tap flex-1 rounded-xl py-3 font-medium transition-opacity disabled:opacity-60"
              style={{ background: "var(--color-text)", color: "var(--color-bg)" }}
            >
              {saving ? "Registrando…" : "Registrar treino"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
