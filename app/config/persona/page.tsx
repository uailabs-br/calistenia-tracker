"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { GoalPicker } from "@/components/plan/GoalPicker";

/** Objetivos (skills prioritárias) + notas livres pra montar a persona da IA. */
export default function PersonaPage() {
  return (
    <div className="px-4">
      <BackLink />
      <PageHeader title="Meus objetivos" />
      <p className="-mt-2 mb-4 text-sm text-muted">
        Marca as skills que são prioridade agora. O app monta o pedido
        sozinho pra você colar na IA, junto com seu treino atual e seu histórico.
      </p>
      <GoalPicker />
      <div className="h-8" />
    </div>
  );
}
