import { db } from "@/lib/db/schema";
import { getDayByWeekday, getExerciseInDay, plan } from "@/lib/plan/loader";
import type { Plan } from "@/lib/plan/schema";
import { effectiveSets } from "@/lib/domain/volume";
import { skills, getLevelInfo } from "@/lib/plan/skills";
import { getSkillState, type SkillState } from "@/lib/db/queries/skillProgression";

export interface AiHistoryExercise {
  name: string;
  target: string;
  performed: "pulado" | "como previsto" | "feito" | number[];
  flags: string[];
  note: string | null;
}

export interface AiHistorySession {
  date: string;
  day: string;
  exercises: AiHistoryExercise[];
}

export interface AiProgressSignal {
  skill: string;
  nivel_atual: string;
  sinal: SkillState;
  /** Nome do degrau anterior na escada canônica — pra onde "regress" desce. */
  degrau_anterior: string | null;
  /** Nome do próximo degrau na escada canônica — pra onde "ready" avança. */
  proximo_degrau: string | null;
}

export interface AiExport {
  /** Plano em vigor (o que o app está rodando hoje) — a IA edita a partir daqui,
   *  não reconstrói do zero: nomes de exercício, obs, flags, aquecimento etc.
   *  só existem aqui, não no resumo condensado de `sessions`. */
  plano_atual: Plan;
  sessions: AiHistorySession[];
  progressao: AiProgressSignal[];
}

async function buildSessions(): Promise<AiHistorySession[]> {
  const sessions = (await db.sessions.toArray())
    .filter((s) => s.status === "completed" && !s.deleted_at)
    .sort((a, b) => (a.started_at ?? 0) - (b.started_at ?? 0));

  const out: AiHistorySession[] = [];
  for (const session of sessions) {
    const logs = (
      await db.exerciseLogs.where("session_id").equals(session.id).toArray()
    ).filter((l) => !l.deleted_at);
    if (logs.length === 0) continue;

    const day = getDayByWeekday(session.weekday);
    const exercises: AiHistoryExercise[] = logs.map((log) => {
      const ex = getExerciseInDay(session.weekday, log.exercise_id);
      const parsed = ex?.parsed ?? null;
      let performed: AiHistoryExercise["performed"];
      if (log.skipped) performed = "pulado";
      else if (log.as_target) performed = "como previsto";
      else {
        const values = effectiveSets(log, parsed, ex?.target);
        performed = values.length > 0 ? values : "feito";
      }
      return {
        name: ex?.name ?? log.exercise_id,
        target: ex?.target ?? "",
        performed,
        flags: log.flags_selected,
        note: log.note,
      };
    });

    out.push({
      date: session.date,
      day: day ? `${day.label} — ${day.title}` : `dia ${session.weekday}`,
      exercises,
    });
  }
  return out;
}

/** Nível mais recentemente treinado de uma skill (log mais recente por data da sessão). */
async function latestLevel(
  skillId: string,
  sessionStartedAt: Map<string, number>
): Promise<number | null> {
  const logs = (
    await db.exerciseLogs.where("skill_id").equals(skillId).toArray()
  ).filter((l) => !l.deleted_at && !l.skipped);
  if (logs.length === 0) return null;

  logs.sort(
    (a, b) =>
      (sessionStartedAt.get(b.session_id) ?? 0) - (sessionStartedAt.get(a.session_id) ?? 0)
  );
  return logs[0].level_at_time;
}

/**
 * Sinal de progressão por skill: olha o NÍVEL MAIS RECENTE de fato treinado
 * (não a posição teórica na escada via `skillPosition` — essa fica presa se
 * o nível inicial da escada não tiver exercício no plano ativo, o que já
 * acontece hoje pra mais de uma skill) + o estado ready/regress/stale/tracking
 * do motor v2 (`getSkillState`) — a mesma leitura que o `ProgressionNudge` já
 * faz durante a sessão, só que aqui pro histórico completo, não um dia. Só
 * entram skills com histórico de fato — o resto do catálogo (nunca treinado)
 * não polui o resumo.
 *
 * Cada sinal vem com o degrau anterior/próximo (nomes da escada canônica de
 * `progressions.json`) — sem isso "regress"/"ready" são só um rótulo solto,
 * e a IA teria que adivinhar o destino a partir do conhecimento geral dela
 * em vez do framework específico deste app.
 */
async function buildProgressao(): Promise<AiProgressSignal[]> {
  const sessions = await db.sessions.toArray();
  const startedAt = new Map(sessions.map((s) => [s.id, s.started_at ?? 0]));

  const out: AiProgressSignal[] = [];
  for (const skill of skills) {
    const level = await latestLevel(skill.id, startedAt);
    if (level === null) continue;

    const info = getLevelInfo(skill.id, level);
    const state = await getSkillState(skill.id, level);
    const idx = skill.steps.findIndex((s) => s.level === level);
    out.push({
      skill: skill.name,
      nivel_atual: `${info?.name ?? `nível ${level}`} (nível ${level}/${skill.steps.length})`,
      sinal: state,
      degrau_anterior: idx > 0 ? skill.steps[idx - 1].label : null,
      proximo_degrau:
        idx >= 0 && idx < skill.steps.length - 1 ? skill.steps[idx + 1].label : null,
    });
  }
  return out;
}

/** Plano em vigor + resumo do histórico + sinal de progressão, pronto pra colar numa IA externa. */
export async function exportForAI(): Promise<AiExport> {
  const [sessions, progressao] = await Promise.all([buildSessions(), buildProgressao()]);
  return { plano_atual: plan, sessions, progressao };
}
