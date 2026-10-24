"use client";

import Link from "next/link";
import { SparkleIcon, ChevronRightIcon } from "@/components/ui/icons";

/**
 * Porta de entrada pro criador de treino com IA. Aparece só enquanto o plano é
 * um dos prontos (ver `isSeedPlanId`): quem já tem plano próprio acha a entrada
 * na aba Treino, e a home não vira painel de avisos.
 */
export function PlanBuilderCard({ first }: { first: boolean }) {
  return (
    <Link
      href="/config/plano"
      className="card anim-fade-in tap flex items-center gap-3 px-4 py-3 active:scale-[0.99]"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-ac"
        aria-hidden="true"
      >
        <SparkleIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">
          {first ? "Crie seu primeiro treino com IA" : "Monte seu treino com IA"}
        </span>
        <span className="block text-xs text-muted">
          Copie o pedido, cole na IA e traga o treino pronto.
        </span>
      </span>
      <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
    </Link>
  );
}
