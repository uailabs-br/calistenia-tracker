"use client";

import { useId, useState } from "react";
import { Dialog } from "@/components/ui/Modal";

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
  const titleId = useId();
  const inputId = useId();

  const submit = () => {
    setSaving(true);
    const parsed = Number(minutes);
    onConfirm(daysAgo, minutes.trim() && parsed > 0 ? parsed : undefined);
  };

  return (
    <Dialog labelledBy={titleId} onClose={onCancel}>
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
                  className={`tap flex-1 rounded-xl border py-2 text-sm font-medium transition-colors duration-200 ${
                    on ? "border-text bg-text text-bg" : "border-border text-text"
                  }`}
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
          className="field py-2.5"
        />
        <span className="shrink-0 text-sm text-muted">min</span>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-neutral tap flex-1 rounded-xl py-3 font-medium text-muted"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={submit}
          className="btn-inverse tap flex-1 rounded-xl py-3 font-medium transition-opacity disabled:opacity-60"
        >
          {saving ? "Registrando…" : "Registrar treino"}
        </button>
      </div>
    </Dialog>
  );
}
