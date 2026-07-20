import { plan } from "@/lib/plan/loader";
import type { PlanDay } from "@/lib/plan/schema";

/**
 * "Próximos treinos": dias do plano a partir de amanhã (exclui hoje),
 * ordenados por proximidade. São ocorrências futuras — nunca concluídas —
 * então quem consome não deve marcá-las como feitas.
 */
export function upcomingDays(today: number, days: PlanDay[] = plan.days): PlanDay[] {
  return days
    .map((d) => ({ day: d, dist: (d.weekday - today + 7) % 7 }))
    .filter((x) => x.dist !== 0) // hoje é o hero
    .sort((a, b) => a.dist - b.dist)
    .map((x) => x.day);
}
