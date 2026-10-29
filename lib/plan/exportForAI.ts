import type { ExerciseLog, Session } from "@/lib/db/schema";
import { getCompletedSessions, getLiveLogs, groupBySession } from "@/lib/db/queries/sessions";
import { getExerciseById, getWorkoutById, negFlagsOf, plan } from "@/lib/plan/loader";
import { resolveLogExercise } from "@/lib/plan/resolve";
import type { Plan } from "@/lib/plan/schema";
import { effectiveSets, extraSets, plannedSets } from "@/lib/domain/volume";
import { isClean } from "@/lib/db/queries/progressionReady";
import { skills, getLevelEquipment, getLevelInfo, type Skill } from "@/lib/plan/skills";
import {
  mapAnswersToSkillLevels,
  stepFitsEquipment,
  type Equipment,
  type OnboardingAnswers,
} from "@/lib/domain/onboarding";
import { daysBetween, localDateKey } from "@/lib/utils/date";
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

/**
 * Movimento que ficou ANTES da janela de detalhe, em quatro números. `desde` é
 * o que separa "treina isso há três semanas" de "treina há oito meses e a
 * melhor série não mudou" — o segundo caso pede mudar de abordagem, não de
 * degrau, e sem ele a IA não tem como ver a diferença.
 */
export interface AiHistorySummary {
  id: string;
  exercicio: string;
  /** Primeira e última vez NESSE período (não no histórico todo). */
  desde: string;
  ate: string;
  sessoes: number;
  /** Melhor série limpa do período ("8 reps", "32s"). Ausente em alvo de tentativas. */
  melhor_serie?: string;
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
  /**
   * Degraus acima do atual que o equipamento declarado não comporta, na ordem.
   * `proximo_degrau` já pula esses; null com esta lista = topo alcançável com o
   * equipamento. Ausente se nada foi pulado ou se não há perfil declarado.
   */
  fora_do_equipamento?: string[];
}

/**
 * Exercício acrescentado no meio do treino em várias sessões da janela. A IA
 * conseguiria contar sozinha, mas não conta: o sinal só serve se vier pronto.
 */
export interface AiRecurringAdded {
  id: string;
  exercicio: string;
  sessoes: number;
}

/**
 * Exercício do plano pulado nas últimas N vezes em que apareceu. Não é falha de
 * degrau (pulado não vota na progressão): é rejeição do movimento, e o que se
 * faz com ela é trocar o exercício, não baixar o nível.
 */
export interface AiRepeatedSkip {
  id: string;
  exercicio: string;
  vezes: number;
}

/** Quantos dias por semana ele treinou de fato, pra comparar com o declarado. */
export interface AiObservedFrequency {
  dias_por_semana: number;
  dias_treinados: number;
  /** Período medido: as últimas 4 semanas, ou desde o primeiro treino se for mais recente. */
  periodo_dias: number;
}

/**
 * O que a pessoa declarou no onboarding. Autodeclarado e anterior a qualquer
 * treino: a IA deve tratar como ponto de partida e preferir `progressao`, que
 * vem dos registros, assim que houver histórico.
 */
export interface AiDeclaredProfile {
  /** O que a pessoa tem além de chão e porta (ver GearItem). */
  equipamento: string[];
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
    equipamento: [...a.equipment],
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
  /** Janela de detalhe: as sessões recentes inteiras (ver `detailWindow`). */
  sessions: AiHistorySession[];
  /** Só existe se houver histórico mais antigo que a janela. */
  historico_anterior?: AiHistorySummary[];
  progressao: AiProgressSignal[];
  /** Só existe se houver treino concluído nas últimas 4 semanas. */
  frequencia_observada?: AiObservedFrequency;
  /** Só existem quando há o que mostrar (ver os tipos). */
  acrescentados_recorrentes?: AiRecurringAdded[];
  pulados_seguidos?: AiRepeatedSkip[];
}

/**
 * Janela de DETALHE do histórico, medida em sessões de plano — não em dias.
 *
 * O que decide o próximo ciclo é quantas vezes a IA vê cada movimento, e um
 * exercício mora num treino só: num plano de 5 treinos ele volta a cada 5
 * sessões. Janela em dias dá resolução diferente pra cada formato de plano
 * (30 dias num plano de 5 treinos = 2,6 passadas por exercício, abaixo das 3
 * sessões seguidas que o motor precisa pra decidir regressão) e zera o
 * histórico de quem parou cinco semanas. Seis voltas do ciclo dão ~6 passadas
 * por exercício, com piso pra plano curto.
 */
const WINDOW_CYCLES = 6;
const WINDOW_MIN_SESSIONS = 18;

export function detailWindow(workouts: number): number {
  return Math.max(WINDOW_MIN_SESSIONS, WINDOW_CYCLES * workouts);
}

/** Melhor série do log, na definição de recorde do app (só execução limpa). */
function bestSet(log: ExerciseLog, workoutId: string | null): { value: number; unit: "reps" | "seconds" } | null {
  if (log.skipped || !isClean(log, negFlagsOf(log.exercise_id))) return null;
  const ex = resolveLogExercise(log, workoutId);
  // `attempts` não tem recorde comparável (ver computePR)
  if (!ex.parsed || ex.parsed.unit === "attempts") return null;
  const sets = effectiveSets(log, ex.parsed, ex.target);
  return sets.length > 0 ? { value: Math.max(...sets), unit: ex.parsed.unit } : null;
}

function summarizeOld(entries: { session: Session; logs: ExerciseLog[] }[]): AiHistorySummary[] {
  const acc = new Map<
    string,
    { nome: string; desde: string; ate: string; sessoes: number; best: { value: number; unit: "reps" | "seconds" } | null }
  >();
  for (const { session, logs } of entries) {
    for (const log of logs) {
      if (log.skipped) continue; // pulado não é treino desse movimento
      const ex = resolveLogExercise(log, session.workout_id);
      const cur = acc.get(log.exercise_id);
      const best = bestSet(log, session.workout_id);
      if (!cur) {
        acc.set(log.exercise_id, {
          nome: ex.name ?? log.exercise_id,
          desde: session.date,
          ate: session.date,
          sessoes: 1,
          best,
        });
        continue;
      }
      cur.sessoes += 1;
      if (session.date < cur.desde) cur.desde = session.date;
      if (session.date > cur.ate) cur.ate = session.date;
      if (best && (!cur.best || best.value > cur.best.value)) cur.best = best;
    }
  }
  return [...acc.entries()].map(([id, v]) => ({
    id,
    exercicio: v.nome,
    desde: v.desde,
    ate: v.ate,
    sessoes: v.sessoes,
    ...(v.best
      ? { melhor_serie: v.best.unit === "seconds" ? `${v.best.value}s` : `${v.best.value} reps` }
      : {}),
  }));
}

/** Sessões com o mesmo acrescentado a partir das quais ele vira sinal (e pulos seguidos idem). */
export const RECURRING_MIN = 3;

type Entry = { session: Session; logs: ExerciseLog[] };

/** Acrescentados em RECURRING_MIN+ sessões. `entries` em qualquer ordem. */
export function recurringAdded(entries: Entry[]): AiRecurringAdded[] {
  const acc = new Map<string, AiRecurringAdded>();
  for (const { session, logs } of entries) {
    const added = new Set(session.added_exercises ?? []);
    for (const log of logs) {
      if (!added.has(log.exercise_id) || log.skipped) continue;
      const cur = acc.get(log.exercise_id);
      if (cur) cur.sessoes += 1;
      else {
        const name = resolveLogExercise(log, session.workout_id).name ?? log.exercise_id;
        acc.set(log.exercise_id, { id: log.exercise_id, exercicio: name, sessoes: 1 });
      }
    }
  }
  return [...acc.values()]
    .filter((a) => a.sessoes >= RECURRING_MIN)
    .sort((a, b) => b.sessoes - a.sessoes);
}

/**
 * Exercícios do plano VIGENTE pulados nas últimas RECURRING_MIN+ aparições
 * seguidas. `entries` do mais antigo pro mais recente (a ordem do histórico).
 * Quem já saiu do plano não entra: a IA não tem o que trocar.
 */
export function repeatedSkips(entries: Entry[]): AiRepeatedSkip[] {
  const streak = new Map<string, { name: string; n: number; broken: boolean }>();
  for (let i = entries.length - 1; i >= 0; i--) {
    const { session, logs } = entries[i];
    if (!session.workout_id) continue; // avulso não tem plano pra pular
    const added = new Set(session.added_exercises ?? []);
    for (const log of logs) {
      if (added.has(log.exercise_id)) continue;
      const cur = streak.get(log.exercise_id) ?? {
        name: resolveLogExercise(log, session.workout_id).name ?? log.exercise_id,
        n: 0,
        broken: false,
      };
      if (!cur.broken) {
        if (log.skipped) cur.n += 1;
        else cur.broken = true;
      }
      streak.set(log.exercise_id, cur);
    }
  }
  return [...streak.entries()]
    .filter(([id, v]) => v.n >= RECURRING_MIN && getExerciseById(id))
    .map(([id, v]) => ({ id, exercicio: v.name, vezes: v.n }))
    .sort((a, b) => b.vezes - a.vezes);
}

/** Janela da frequência observada: 4 semanas inteiras, pra dividir por 4 sem sobra. */
const FREQ_WINDOW_DAYS = 28;
/** Piso do período: 2 treinos no primeiro dia não são "14 por semana". */
const FREQ_MIN_DAYS = 7;

/**
 * Dias distintos com treino concluído (plano ou avulso) por semana. Quem começou
 * há menos de 4 semanas é medido desde o primeiro treino — senão a frequência sai
 * subestimada justo no começo, quando a IA mais lê o `perfil_declarado`.
 */
export function observedFrequency(
  dates: string[],
  today: string = localDateKey()
): AiObservedFrequency | undefined {
  const inWindow = dates.filter((d) => {
    const ago = daysBetween(d, today);
    return ago >= 0 && ago < FREQ_WINDOW_DAYS;
  });
  if (inWindow.length === 0) return undefined;
  const first = dates.reduce((a, b) => (a < b ? a : b));
  const since = daysBetween(first, today) + 1;
  const period = Math.max(FREQ_MIN_DAYS, Math.min(FREQ_WINDOW_DAYS, since));
  const days = new Set(inWindow).size;
  return {
    dias_por_semana: Math.round((days / period) * 7 * 10) / 10,
    dias_treinados: days,
    periodo_dias: period,
  };
}

function buildExercises(session: Session, logs: ExerciseLog[]): AiHistoryExercise[] {
  const addedIds = new Set(session.added_exercises ?? []);
  return logs.map((log) => {
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
}

/**
 * Histórico em duas resoluções: as sessões da janela inteiras, o que veio antes
 * resumido por movimento. Sessão avulsa não consome janela — ela entra se cair
 * no período das sessões de plano mantidas, mas não empurra treino de plano pro
 * resumo (quem registra muito treino fora do plano perderia justo a passada dos
 * exercícios que a IA vai editar).
 */
async function buildHistory(
  windowSessions: number,
  onStep?: (s: ExportStep) => void
): Promise<{
  sessions: AiHistorySession[];
  anterior: AiHistorySummary[];
  added: AiRecurringAdded[];
  skips: AiRepeatedSkip[];
  frequency: AiObservedFrequency | undefined;
}> {
  const sessions = await getCompletedSessions();
  onStep?.({ step: "historico", treinos: sessions.length });
  const logsBySession = groupBySession(await getLiveLogs());

  const entries: { session: Session; logs: ExerciseLog[] }[] = [];
  for (const session of sessions) {
    const logs = logsBySession.get(session.id);
    if (logs) entries.push({ session, logs });
  }

  const planned = entries.filter((e) => e.session.workout_id);
  const cutoff =
    planned.length > windowSessions
      ? (planned[planned.length - windowSessions].session.started_at ?? 0)
      : null;
  const recent =
    cutoff === null ? entries : entries.filter((e) => (e.session.started_at ?? 0) >= cutoff);
  const old = cutoff === null ? [] : entries.filter((e) => (e.session.started_at ?? 0) < cutoff);

  return {
    sessions: recent.map(({ session, logs }) => {
      const workout = session.workout_id ? getWorkoutById(session.workout_id) : undefined;
      return {
        date: session.date,
        workout: workout ? `${workout.label} — ${workout.title}` : "avulso",
        exercises: buildExercises(session, logs),
      };
    }),
    anterior: summarizeOld(old),
    added: recurringAdded(recent),
    skips: repeatedSkips(recent),
    frequency: observedFrequency(sessions.map((s) => s.date)),
  };
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
async function buildProgressao(equipment: Equipment | null): Promise<AiProgressSignal[]> {
  const out: AiProgressSignal[] = [];
  for (const skill of skills) {
    const level = await latestLevel(skill.id);
    if (level === null) continue;

    const info = getLevelInfo(skill.id, level);
    const state = await getSkillState(skill.id, level);
    const idx = skill.steps.findIndex((s) => s.level === level);
    const { anterior, proximo, fora } = neighborSteps(skill, idx, equipment);
    out.push({
      skill: skill.name,
      nivel_atual: `${info?.name ?? `nível ${level}`} (nível ${level}/${skill.steps.length})`,
      sinal: state,
      degrau_anterior: anterior,
      proximo_degrau: proximo,
      ...(fora.length > 0 ? { fora_do_equipamento: fora } : {}),
    });
  }
  return out;
}

/**
 * Degraus vizinhos ALCANÇÁVEIS com o equipamento declarado. Sem perfil, a escada
 * crua — não dá pra afirmar o que ele tem. O pulo vale pros dois lados: regredir
 * de um Weighted Dip não pode mandar pro Ring Dip na praça.
 */
export function neighborSteps(
  skill: Skill,
  idx: number,
  equipment: Equipment | null
): { anterior: string | null; proximo: string | null; fora: string[] } {
  const fits = (i: number) =>
    equipment === null || stepFitsEquipment(getLevelEquipment(skill.id, skill.steps[i].level), equipment);
  let anterior: string | null = null;
  for (let i = idx - 1; i >= 0; i--) {
    if (fits(i)) {
      anterior = skill.steps[i].label;
      break;
    }
  }
  let proximo: string | null = null;
  const fora: string[] = [];
  if (idx >= 0) {
    for (let i = idx + 1; i < skill.steps.length; i++) {
      if (fits(i)) {
        proximo = skill.steps[i].label;
        break;
      }
      fora.push(skill.steps[i].label);
    }
  }
  return { anterior, proximo, fora };
}

/** Etapa em curso do export, pra tela dizer o que está fazendo quando demora. */
export type ExportStep = { step: "historico"; treinos: number } | { step: "progressao" };

/** Plano em vigor + histórico (janela + resumo) + sinal de progressão, pronto pra colar numa IA externa. */
export async function exportForAI(
  opts: { windowSessions?: number; onStep?: (s: ExportStep) => void } = {}
): Promise<AiExport> {
  const window = opts.windowSessions ?? detailWindow(plan.workouts.length);
  const declared = getOnboardingAnswers();
  // Em sequência, não em paralelo: as duas leem o IndexedDB numa thread só, e
  // assim a tela consegue dizer em que parte está.
  const history = await buildHistory(window, opts.onStep);
  opts.onStep?.({ step: "progressao" });
  const progressao = await buildProgressao(declared?.equipment ?? null);
  return {
    plano_atual: plan,
    ...(declared ? { perfil_declarado: buildDeclaredProfile(declared) } : {}),
    sessions: history.sessions,
    ...(history.anterior.length > 0 ? { historico_anterior: history.anterior } : {}),
    progressao,
    ...(history.frequency ? { frequencia_observada: history.frequency } : {}),
    ...(history.added.length > 0 ? { acrescentados_recorrentes: history.added } : {}),
    ...(history.skips.length > 0 ? { pulados_seguidos: history.skips } : {}),
  };
}

/** O que foi no pedido, em números, pra mostrar depois de copiar. */
export interface ExportSummary {
  detalhe: number;
  /** movimentos de antes da janela, resumidos */
  resumidos: number;
  skills: number;
  prontas: number;
  frequencia?: number;
  declarado?: number;
}

export function exportSummary(ex: AiExport): ExportSummary {
  return {
    detalhe: ex.sessions.length,
    resumidos: ex.historico_anterior?.length ?? 0,
    skills: ex.progressao.length,
    prontas: ex.progressao.filter((p) => p.sinal === "ready").length,
    ...(ex.frequencia_observada ? { frequencia: ex.frequencia_observada.dias_por_semana } : {}),
    ...(ex.perfil_declarado ? { declarado: ex.perfil_declarado.dias_por_semana } : {}),
  };
}
