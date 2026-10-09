import { db } from "@/lib/db/schema";
import { getWorkoutById, plan } from "@/lib/plan/loader";
import { resolveLogExercise } from "@/lib/plan/resolve";
import type { Plan } from "@/lib/plan/schema";
import { extraSets, plannedSets } from "@/lib/domain/volume";
import { skills, getLevelInfo } from "@/lib/plan/skills";
import {
  mapAnswersToSkillLevels,
  type OnboardingAnswers,
} from "@/lib/domain/onboarding";
import { getOnboardingAnswers } from "@/lib/utils/onboarding";
import {
  getSkillLogs,
  getSkillState,
  type SkillState,
} from "@/lib/db/queries/skillProgression";

export interface AiHistoryExercise {
  name: string;
  target: string;
  /** O que foi feito DENTRO do plano (sem as séries extras). */
  performed: "pulado" | "como previsto" | "feito" | number[];
  /** Séries feitas ALÉM do plano, por vontade do dia. Ausente se não houve. Sinal de que o plano está leve. */
  extra_sets?: number[];
  /** Exercício acrescentado pelo usuário no meio do treino (não fazia parte do plano do dia). */
  added?: true;
  flags: string[];
  note: string | null;
}

export interface AiHistorySession {
  date: string;
  /** Treino do plano ("A — MU + Puxar") ou "avulso". */
  workout: string;
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

/**
 * O que a pessoa declarou no onboarding. Autodeclarado e anterior a qualquer
 * treino: a IA deve tratar como ponto de partida e preferir `progressao`, que
 * vem dos registros, assim que houver histórico.
 */
export interface AiDeclaredProfile {
  equipamento: string;
  /** Autodeclarado: iniciante, intermediario ou avancado (definidos pela escada do app). */
  nivel: string;
  dias_por_semana: number;
  /** Etapa que a pessoa disse estar trabalhando; as anteriores ela já faz. */
  skills: { skill: string; etapa_em_foco: string }[];
  /**
   * O que ela QUER, em uma palavra (forca, resistencia, skills, mobilidade).
   * Todo o resto do export diz o que ela consegue; só isto diz pra onde ir. A
   * skill específica não está aqui: vem de "Meus objetivos" (persona).
   */
  objetivo?: string;
  /** Articulações que ela declarou incomodadas. Nenhum exercício foi tirado por isso. */
  limitacoes?: string[];
}

export function buildDeclaredProfile(a: OnboardingAnswers): AiDeclaredProfile {
  const levels = mapAnswersToSkillLevels(a);
  return {
    equipamento: a.equipment,
    nivel: a.level,
    dias_por_semana: a.days_per_week,
    // Opcionais: quem respondeu antes da versão que passou a perguntar não tem
    // os campos, e campo ausente é melhor que campo inventado.
    ...(a.goal ? { objetivo: a.goal } : {}),
    ...(a.limitations?.length ? { limitacoes: a.limitations } : {}),
    skills: Object.entries(levels).flatMap(([id, idx]) => {
      const skill = skills.find((s) => s.id === id);
      const step = skill?.steps[idx];
      return skill && step ? [{ skill: skill.name, etapa_em_foco: step.label }] : [];
    }),
  };
}

export interface AiExport {
  /** Plano em vigor (o que o app está rodando hoje) — a IA edita a partir daqui,
   *  não reconstrói do zero: nomes de exercício, obs, flags, aquecimento etc.
   *  só existem aqui, não no resumo condensado de `sessions`. */
  plano_atual: Plan;
  /** Só existe se a pessoa fez o onboarding (e não pulou). */
  perfil_declarado?: AiDeclaredProfile;
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

    const workout = session.workout_id ? getWorkoutById(session.workout_id) : undefined;
    const addedIds = new Set(session.added_exercises ?? []);
    const exercises: AiHistoryExercise[] = logs.map((log) => {
      const ex = resolveLogExercise(log, session.workout_id);
      const parsed = ex.parsed;
      let performed: AiHistoryExercise["performed"];
      if (log.skipped) performed = "pulado";
      else if (log.as_target) performed = "como previsto";
      else {
        const values = plannedSets(log, parsed, ex.target);
        performed = values.length > 0 ? values : "feito";
      }
      const extras = extraSets(log);
      return {
        name: ex.name ?? log.exercise_id,
        target: ex.target,
        performed,
        ...(extras.length > 0 ? { extra_sets: extras } : {}),
        ...(addedIds.has(log.exercise_id) ? { added: true as const } : {}),
        flags: log.flags_selected,
        note: log.note,
      };
    });

    out.push({
      date: session.date,
      workout: workout ? `${workout.label} — ${workout.title}` : "avulso",
      exercises,
    });
  }
  return out;
}

/** Skill sem treino nessa janela sai do resumo: a IA não deve recomendar sobre o que ficou pra trás. */
const SKILL_WINDOW_DAYS = 60;

/**
 * Nível mais recentemente treinado de uma skill. Só considera logs "vivos"
 * (sessão válida, exercício ainda vinculado à skill no plano vigente, dentro da
 * janela) — ver `getSkillLogs`.
 */
async function latestLevel(skillId: string): Promise<number | null> {
  const since = Date.now() - SKILL_WINDOW_DAYS * 86_400_000;
  const entries = await getSkillLogs(skillId, { since });
  return entries[0]?.log.level_at_time ?? null;
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
  const out: AiProgressSignal[] = [];
  for (const skill of skills) {
    const level = await latestLevel(skill.id);
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
  const declared = getOnboardingAnswers();
  return {
    plano_atual: plan,
    ...(declared ? { perfil_declarado: buildDeclaredProfile(declared) } : {}),
    sessions,
    progressao,
  };
}
