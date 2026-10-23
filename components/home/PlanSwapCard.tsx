"use client";

import Link from "next/link";
import { SparkleIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { ProgressionRow } from "@/lib/db/queries/progressionMap";

const SHOWN = 3;

/**
 * Aviso de que vários degraus estão prontos e o treino atual já cumpriu seu ciclo.
 * Orienta a troca, não a faz: o pedido à IA é externo (copiar, colar lá, trazer de
 * volta), e o preview mostra o que entra antes de aplicar.
 */
export function PlanSwapCard({
  ready,
  onDismiss,
}: {
  ready: ProgressionRow[];
  onDismiss: () => void;
}) {
  const names = ready.slice(0, SHOWN).map((r) => r.name);
  const rest = ready.length - names.length;

  return (
    <section
      className="anim-fade-in rounded-card border px-4 py-4"
      style={{ borderColor: "var(--ac)" }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--color-surface2)", color: "var(--ac)" }}
          aria-hidden="true"
        >
          <SparkleIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Seu treino pede uma revisão</p>
          <p className="mt-1 text-sm leading-snug text-muted">
            {ready.length === 1
              ? "Um exercício está pronto pra subir de nível"
              : `${ready.length} exercícios estão prontos pra subir de nível`}
            : {names.join(", ")}
            {rest > 0 ? ` e mais ${rest}` : ""}. Você já passou por um ciclo inteiro, então
            vale pedir o próximo treino à IA.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <Link
          href="/config/plano?modo=novo"
          className="btn-primary tap flex items-center justify-center gap-2 rounded-xl py-3 font-medium"
        >
          Pedir o próximo treino à IA
        </Link>
        <div className="flex items-center justify-between">
          <Link
            href="/progressao"
            className="tap -ml-1 inline-flex items-center gap-0.5 rounded-lg px-1 py-1 text-sm text-muted"
          >
            ver o que está pronto
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="tap -mr-1 rounded-lg px-2 py-1 font-mono text-[11px] text-muted"
          >
            dispensar
          </button>
        </div>
      </div>
    </section>
  );
}
