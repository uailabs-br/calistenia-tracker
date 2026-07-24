"use client";

import { useModalA11y } from "@/lib/utils/useModalA11y";
import { Portal } from "@/components/ui/Portal";
import { CheckIcon, TrophyIcon } from "@/components/ui/icons";
import { StatTile } from "@/components/metrics/StatTile";
import { formatPR, type PRResult } from "@/lib/db/queries/pr";

// Leve encorajamento, sem hype vazio — uma por sessão, escolhida pelo id
// (determinístico: não pisca entre re-renders, mas varia entre sessões).
const ENCOURAGEMENT = [
  "💪 mais um treino na conta",
  "✅ consistência vencendo novamente",
  "🔥 disciplina bateu a preguiça hoje",
  "🎯 missão cumprida, sem desculpas",
  "📈 evolução acontece um treino de cada vez",
  "🚀 um treino mais perto do objetivo",
];

// Recorde é a própria celebração — substitui a frase genérica, não soma a ela.
const PR_HEADLINE = "você se superou de novo 💪";

function pickPhrase(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return ENCOURAGEMENT[hash % ENCOURAGEMENT.length];
}

export interface SessionPR {
  id: string;
  name: string;
  pr: PRResult;
}

/** Tela de fechamento do treino: recordes da sessão + frase curta. Centralizada,
 *  fecha só por ação do usuário (botão ou toque fora) — aí sim volta pra home. */
export function SessionSummary({
  accent,
  prs,
  exercisesDone,
  repsVolume,
  seed,
  onClose,
}: {
  accent: string;
  prs: SessionPR[];
  /** Exercícios registrados (não pulados) nesta sessão. */
  exercisesDone: number;
  /** Soma das reps efetivas dos exercícios em unidade "reps" (ignora holds/tentativas). */
  repsVolume: number;
  seed: string;
  onClose: () => void;
}) {
  const ref = useModalA11y<HTMLDivElement>(onClose);
  const hasPR = prs.length > 0;
  const phrase = hasPR ? PR_HEADLINE : pickPhrase(seed);

  return (
    <Portal>
      <div
        className="anim-fade-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          ref={ref}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          className="anim-scale-in w-full max-w-sm rounded-2xl border bg-surface2 px-6 py-7 text-center shadow-2xl outline-none"
          style={{ borderColor: accent }}
        >
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: accent, color: "var(--color-on-accent)" }}
            aria-hidden="true"
          >
            <CheckIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Treino concluído</h2>

          <div className="mt-4 grid grid-cols-2 gap-2 text-left">
            <StatTile value={exercisesDone} label="exercícios" accent={accent} />
            <StatTile value={repsVolume} label="reps totais" accent={accent} />
          </div>

          <p className="mt-4 text-sm text-muted">{phrase}</p>

          {hasPR && (
            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-left">
              {prs.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="shrink-0 text-[var(--color-gold)]" aria-hidden="true">
                    <TrophyIcon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {p.name}
                  </span>
                  <span className="tnum shrink-0 text-sm text-muted">
                    {formatPR(p.pr)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="tap mt-6 w-full rounded-xl py-3 font-medium active:scale-[0.99]"
            style={{ background: accent, color: "var(--color-on-accent)" }}
          >
            Voltar pro início
          </button>
        </div>
      </div>
    </Portal>
  );
}
