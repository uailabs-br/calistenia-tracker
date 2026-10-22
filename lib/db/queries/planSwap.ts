import { db } from "@/lib/db/schema";
import { plan } from "@/lib/plan/loader";
import { swapSignal, type SwapSignal } from "@/lib/domain/planSwap";
import { getPlanAppliedAt, getSwapAck } from "@/lib/utils/planSwap";
import { getProgressionMap, type ProgressionRow } from "./progressionMap";

export interface PlanSwapState extends SwapSignal {
  /** exercícios prontos, pra nomear no aviso */
  ready: ProgressionRow[];
}

/**
 * Sinal de "hora de trocar de treino". Conta o estado "pronto" IGNORANDO a
 * dispensa por exercício do fim da sessão: quem dispensa um "pronto pra subir"
 * está dizendo "já vi", não "o plano não está vencido" — se isso contasse, o
 * aviso da home nunca dispararia pra quem toca em dispensar. A dispensa do próprio
 * aviso (por conjunto de ids) é que impede a repetição.
 */
export async function getPlanSwapSignal(): Promise<PlanSwapState> {
  const rows = await getProgressionMap();
  // Um voto por degrau, não por exercício: dois exercícios no mesmo skill+nível
  // compartilham os logs e ficariam prontos juntos, contando em dobro pro limiar
  // (o ProgressionNudge deduplica do mesmo jeito).
  const byRung = new Map<string, ProgressionRow>();
  for (const r of rows) {
    if (!r.skill) continue;
    const key = `${r.skill.id}:${r.skill.level}`;
    if (!byRung.has(key)) byRung.set(key, r);
  }
  const skillRows = [...byRung.values()];
  const ready = skillRows.filter((r) => r.state === "ready");

  const since = getPlanAppliedAt() ?? 0;
  const sessions = await db.sessions.where("status").equals("completed").toArray();
  const sessionsSinceSwap = sessions.filter(
    (s) => !s.deleted_at && s.source === "plan" && s.started_at >= since
  ).length;

  const signal = swapSignal({
    readyIds: ready.map((r) => r.exerciseId),
    skillCount: skillRows.length,
    sessionsSinceSwap,
    cycleLength: plan.workouts.length,
    acked: getSwapAck(),
  });
  return { ...signal, ready };
}
