"use client";

import { useId, useMemo } from "react";
import type { Plan } from "@/lib/plan/schema";
import { diffPlans, type WorkoutDiff } from "@/lib/plan/diffPlan";
import { summarize } from "@/lib/plan/importPlan";
import { useModalA11y } from "@/lib/utils/useModalA11y";
import { Portal } from "@/components/ui/Portal";

const STATUS_LABEL: Record<WorkoutDiff["status"], string> = {
  new: "treino novo",
  removed: "sai do plano",
  kept: "",
};

function Group({
  title,
  sign,
  color,
  items,
}: {
  title: string;
  sign: string;
  color: string;
  items: { id: string; name: string; target: string; from?: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      {title && (
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted">{title}</p>
      )}
      <ul className="mt-1 flex flex-col gap-0.5">
        {items.map((e) => (
          <li key={e.id} className="flex items-baseline gap-2 text-sm">
            <span className="w-3 shrink-0 font-mono" style={{ color }} aria-hidden>
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
  const ref = useModalA11y<HTMLDivElement>(onCancel);
  const titleId = useId();
  const diff = useMemo(() => diffPlans(current, next), [current, next]);
  const summary = summarize(next);
  const { totals } = diff;
  const unchanged = totals.entering === 0 && totals.leaving === 0 && totals.retargeted === 0;

  return (
    <Portal>
      <div
        className="anim-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4"
        onClick={onCancel}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="anim-scale-in flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-surface outline-none sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border px-5 pb-3 pt-5">
            <h2 id={titleId} className="text-lg font-semibold">
              Trocar de treino?
            </h2>
            <p className="mt-1 text-sm text-muted">
              &ldquo;{summary.name}&rdquo; · {summary.workouts} treinos ·{" "}
              {summary.exercises} exercícios · v{summary.version}
            </p>
            <p className="mt-2 text-xs text-muted">
              {unchanged ? (
                "Nenhum exercício muda em relação ao treino atual."
              ) : (
                <>
                  <span style={{ color: "var(--ac)" }}>+{totals.entering} entram</span>
                  {" · "}
                  <span>−{totals.leaving} saem</span>
                  {" · "}
                  {totals.retargeted} com alvo novo
                  {totals.newMovements > 0 && ` · ${totals.newMovements} movimentos inéditos`}
                </>
              )}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {diff.warnings.length > 0 && (
              <div
                className="mb-4 rounded-card border px-3 py-2 text-xs"
                style={{ borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
                role="note"
              >
                <p className="font-medium">
                  {diff.warnings.length === 1
                    ? "1 ponto pra conferir antes de aplicar:"
                    : `${diff.warnings.length} pontos pra conferir antes de aplicar:`}
                </p>
                <ul className="mt-1 list-disc pl-4">
                  {diff.warnings.map((w, i) => (
                    <li key={i}>{w.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {!diff.samePlan && (
              <p className="mb-4 text-xs text-muted">
                É um plano diferente do atual. Seu histórico fica intacto e os movimentos com o
                mesmo id seguem de onde pararam.
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
                        className="font-mono text-[11px]"
                        style={{
                          color: w.status === "new" ? "var(--ac)" : "var(--color-muted)",
                        }}
                      >
                        {STATUS_LABEL[w.status]}
                      </span>
                    )}
                  </div>
                  <Group title="Entram" sign="+" color="var(--ac)" items={w.entering} />
                  <Group title="Saem" sign="−" color="var(--color-danger)" items={w.leaving} />
                  <Group
                    title={w.status === "kept" ? "Continuam" : ""}
                    sign="·"
                    color="var(--color-muted)"
                    items={w.kept}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={onCancel}
              className="tap flex-1 rounded-xl border border-border bg-surface2 py-3 font-medium text-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="tap flex-1 rounded-xl py-3 font-medium"
              style={{ background: "var(--color-text)", color: "var(--color-bg)" }}
            >
              Trocar
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
