"use client";

import { useEffect, useState } from "react";
import { returnNudge, type ReturnNudge } from "@/lib/domain/returnNudge";
import { getWeekGoal } from "@/lib/utils/profile";
import { localDateKey } from "@/lib/utils/date";

/**
 * Volta depois de uma pausa (ver returnNudge). Fica acima do treino e some no
 * primeiro treino concluído, porque aí a pausa acabou.
 */
export function ReturnCard({
  lastWorkoutDate,
  planTotal,
}: {
  lastWorkoutDate: string | null;
  /** meta padrão quando a pessoa não definiu outra */
  planTotal: number;
}) {
  // Meta vem do localStorage: só depois do mount.
  const [nudge, setNudge] = useState<ReturnNudge | null>(null);
  useEffect(() => {
    setNudge(
      returnNudge({
        lastWorkoutDate,
        today: localDateKey(),
        weekGoal: getWeekGoal() ?? planTotal,
      })
    );
  }, [lastWorkoutDate, planTotal]);

  if (!nudge) return null;

  return (
    <section className="card anim-fade-in px-4 py-3">
      <p className="text-sm font-semibold">Faz {nudge.days} dias desde o último treino</p>
      <p className="mt-0.5 text-sm text-muted">{nudge.line}</p>
    </section>
  );
}
