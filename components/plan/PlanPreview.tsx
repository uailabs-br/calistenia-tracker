"use client";

import { useId, useMemo } from "react";
import type { Plan } from "@/lib/plan/schema";
import { diffPlans, type WorkoutDiff } from "@/lib/plan/diffPlan";
import { summarize } from "@/lib/plan/importPlan";
import { ModalShell } from "@/components/ui/Modal";

const STATUS_LABEL: Record<WorkoutDiff["status"], string> = {
  new: "treino novo",
  removed: "sai do plano",
  kept: "",
};

function Group({
  title,
  sign,
  tone,
  items,
}: {
  title: string;
  sign: string;
  /** Classe de cor do sinal (+ entra, − sai, · fica). */
  tone: string;
  items: { id: string; name: string; target: string; from?: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      {title && (
        <p className="eyebrow">{title}</p>
      )}
      <ul className="mt-1 flex flex-col gap-0.5">
        {items.map((e) => (
          <li key={e.id} className="flex items-baseline gap-2 text-sm">
            <span className={`w-3 shrink-0 font-mono ${tone}`} aria-hidden>
              {sign}
            </span>
            <span className="min-w-0 flex-1 truncate">{e.name}</span>
            <span className="tnum shrink-0 text-xs text-muted">
              {e.from ? `${e.from} → ${e.target}` : e.target}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Count({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="rounded-xl bg-surface2 px-2 py-2 text-center">
      <p className={`tnum text-xl font-semibold ${value > 0 ? tone : "text-muted"}`}>{value}</p>
      <p className="text-2xs text-muted">{label}</p>
    </div>
  );
}

/**
 * Preview da troca de plano: o que entra, o que sai e o que muda de alvo, por
 * treino, mais os avisos que a validação não pega. É leitura — nada se edita aqui
 * (editor de plano está fora de escopo); a decisão é aplicar ou cancelar.
 */
export function PlanPreview({
  current,
  next,
  onConfirm,
  onCancel,
}: {
  current: Plan;
  next: Plan;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const diff = useMemo(() => diffPlans(current, next), [current, next]);
  const summary = summarize(next);
  const { totals } = diff;
  const unchanged = totals.entering === 0 && totals.leaving === 0 && totals.retargeted === 0;

  return (
    // Sheet no celular, diálogo do sm pra cima: por isso a casca e não um preset.
    <ModalShell
      labelledBy={titleId}
      onClose={onCancel}
      overlayClassName="z-50 flex items-end justify-center sm:items-center sm:px-4"
      panelClassName="anim-scale-in flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-surface sm:rounded-2xl"
    >
      <div className="border-b border-border px-5 pb-3 pt-5">
        <h2 id={titleId} className="text-lg font-semibold">
          Trocar de treino?
        </h2>
        <p className="mt-1 text-sm text-muted">
          &ldquo;{summary.name}&rdquo; · {summary.workouts} treinos · {summary.exercises}{" "}
          exercícios
        </p>
        {unchanged ? (
          <p className="mt-2 text-xs text-muted">
            Nenhum exercício muda em relação ao treino atual.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Count value={totals.entering} label="entram" tone="text-ac" />
            <Count value={totals.leaving} label="saem" tone="text-danger" />
            <Count value={totals.retargeted} label="mudam o alvo" tone="text-text" />
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {diff.warnings.length > 0 && (
          <div
            className="mb-4 rounded-card border border-gold px-3 py-2 text-xs text-gold"
            role="note"
          >
            <p className="font-medium">Confira antes de trocar:</p>
            <p className="mt-1">{diff.warnings[0].message}</p>
            {diff.warnings.length > 1 && (
              <details className="mt-1">
                <summary className="tap cursor-pointer leading-[44px]">
                  mais {diff.warnings.length - 1}
                </summary>
                <ul className="list-disc pl-4">
                  {diff.warnings.slice(1).map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {!diff.samePlan && (
          <p className="mb-4 text-xs text-muted">
            Seu histórico continua. Exercício que já existia segue de onde parou.
          </p>
        )}

        <ul className="flex flex-col gap-4">
          {diff.workouts.map((w) => (
            <li key={w.id}>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {w.label} · {w.title}
                </h3>
                {STATUS_LABEL[w.status] && (
                  <span
                    className={`font-mono text-2xs ${w.status === "new" ? "text-ac" : "text-muted"}`}
                  >
                    {STATUS_LABEL[w.status]}
                  </span>
                )}
              </div>
              <Group title="Entram" sign="+" tone="text-ac" items={w.entering} />
              <Group title="Saem" sign="−" tone="text-danger" items={w.leaving} />
              {w.kept.length > 0 &&
                (w.status === "kept" ? (
                  // O que interessa é o que muda: o que continua igual fica fechado.
                  <details>
                    <summary className="eyebrow tap cursor-pointer leading-[44px]">
                      Continuam iguais ({w.kept.length})
                    </summary>
                    <Group title="" sign="·" tone="text-muted" items={w.kept} />
                  </details>
                ) : (
                  <Group title="" sign="·" tone="text-muted" items={w.kept} />
                ))}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2 border-t border-border px-5 py-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn-neutral tap flex-1 rounded-xl py-3 font-medium text-muted"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="btn-inverse tap flex-1 rounded-xl py-3 font-medium"
        >
          Trocar
        </button>
      </div>
    </ModalShell>
  );
}
