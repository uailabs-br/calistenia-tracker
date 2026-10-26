import catalogData from "./catalog.json";
import type { Plan, PlanExercise, Workout } from "./schema";
import { criterionThreshold, getCriteria, type Criteria } from "./skills";
import { parseRestSeconds, targetValue, unitOf, type TargetUnit } from "@/lib/domain/parseTarget";

/**
 * O que muda ao trocar de plano, por treino, e o que o schema não pega.
 *
 * Existe porque o JSON que a IA devolve passa fácil de 400 linhas: validar a
 * forma (Zod) e mostrar "3 treinos, 18 exercícios" não deixa decidir nada. A
 * comparação é por `id` de exercício DENTRO do treino — é a identidade que o
 * histórico usa.
 */

export interface DiffExercise {
  id: string;
  name: string;
  target: string;
}

export interface KeptExercise extends DiffExercise {
  /** alvo anterior, quando mudou */
  from?: string;
}

export type WorkoutStatus = "new" | "removed" | "kept";

export interface WorkoutDiff {
  id: string;
  label: string;
  title: string;
  status: WorkoutStatus;
  entering: DiffExercise[];
  leaving: DiffExercise[];
  kept: KeptExercise[];
}

export interface PlanWarning {
  /** exercício a que o aviso se refere, quando há */
  exerciseId: string | null;
  message: string;
}

export interface PlanDiff {
  /** Plano com outro `id`: o histórico antigo aponta pro plano anterior. */
  samePlan: boolean;
  workouts: WorkoutDiff[];
  totals: {
    entering: number;
    leaving: number;
    kept: number;
    retargeted: number;
    /** movimentos que não existiam no plano anterior (nenhum treino) */
    newMovements: number;
    /** movimentos do plano anterior que nenhum treino novo tem */
    droppedMovements: number;
  };
  warnings: PlanWarning[];
}

const CATALOG = catalogData as { id: string; name: string; aliases: string[] }[];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Id sem separador: "mu-false-grip-pull-up" e "mu-false-grip-pullup" viram o mesmo. */
const compactId = (id: string) => id.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Prefixos de padrão de movimento que a IA põe (ou tira) por conta própria:
 * "core-hanging-knee-raise" pro "hanging-knee-raise" do catálogo. Do mais longo
 * pro mais curto, pra "pull-up-" não sobrar como "up-".
 */
const ID_PREFIXES = ["pull-up-", "push-up-", "core-", "legs-", "pull-", "push-", "row-", "mu-", "hs-", "fl-"];
const unprefixed = (id: string) => {
  const p = ID_PREFIXES.find((x) => id.startsWith(x));
  return p ? compactId(id.slice(p.length)) : null;
};

/** O tipo de critério do degrau → a unidade que o alvo tem que ter pra tela registrar o certo. */
const CRITERIA_UNIT: Record<Criteria["type"], TargetUnit> = {
  reps_rir: "reps",
  hold_clean: "seconds",
  skill_consistency: "attempts",
};
const UNIT_PT: Record<TargetUnit, string> = {
  reps: "repetições",
  seconds: "segundos",
  attempts: "tentativas",
};

/**
 * Ids conhecidos e os jeitos de reconhecer o mesmo movimento com outro id. A IA
 * recebe a lista de ids e mesmo assim reinventa: separador diferente, prefixo a
 * mais ou a menos, ou o nome em inglês de algo que o catálogo tem como alias.
 * Prefixo só é ignorado de um lado — dos dois, "pull-up-arqueiro" casaria
 * "push-up-arqueiro".
 */
class KnownIds {
  private ids = new Set<string>();
  private byName = new Map<string, string>();
  private byCompact = new Map<string, string>();
  private byUnprefixed = new Map<string, string>();

  /** `override`: o nome passa a apontar pra este id (o plano atual vence o catálogo). */
  add(id: string, names: string[], override = false) {
    this.ids.add(id);
    this.byCompact.set(compactId(id), id);
    const u = unprefixed(id);
    if (u) this.byUnprefixed.set(u, id);
    for (const n of names) if (override || !this.byName.has(norm(n))) this.byName.set(norm(n), id);
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  twinOf(e: PlanExercise): string | undefined {
    const c = compactId(e.id);
    const u = unprefixed(e.id);
    return (
      this.byCompact.get(c) ??
      this.byUnprefixed.get(c) ??
      (u ? this.byCompact.get(u) : undefined) ??
      this.byName.get(norm(e.name))
    );
  }
}

const flat = (w: Workout): PlanExercise[] => w.blocks.flatMap((b) => b.exercises);
const brief = (e: PlanExercise): DiffExercise => ({ id: e.id, name: e.name, target: e.target });

export function diffPlans(current: Plan, next: Plan): PlanDiff {
  const currentById = new Map(current.workouts.map((w) => [w.id, w]));
  const nextIds = new Set(next.workouts.map((w) => w.id));
  const workouts: WorkoutDiff[] = [];

  for (const w of next.workouts) {
    const before = currentById.get(w.id);
    const now = flat(w);
    if (!before) {
      workouts.push({
        id: w.id,
        label: w.label,
        title: w.title,
        status: "new",
        entering: now.map(brief),
        leaving: [],
        kept: [],
      });
      continue;
    }
    const prev = new Map(flat(before).map((e) => [e.id, e]));
    const nowIds = new Set(now.map((e) => e.id));
    workouts.push({
      id: w.id,
      label: w.label,
      title: w.title,
      status: "kept",
      entering: now.filter((e) => !prev.has(e.id)).map(brief),
      leaving: [...prev.values()].filter((e) => !nowIds.has(e.id)).map(brief),
      kept: now
        .filter((e) => prev.has(e.id))
        .map((e) => {
          const old = prev.get(e.id)!;
          return { ...brief(e), ...(old.target !== e.target ? { from: old.target } : {}) };
        }),
    });
  }
  for (const w of current.workouts) {
    if (nextIds.has(w.id)) continue;
    workouts.push({
      id: w.id,
      label: w.label,
      title: w.title,
      status: "removed",
      entering: [],
      leaving: flat(w).map(brief),
      kept: [],
    });
  }

  const sum = (f: (w: WorkoutDiff) => number) => workouts.reduce((n, w) => n + f(w), 0);
  const currentMovements = new Set(current.workouts.flatMap((w) => flat(w).map((e) => e.id)));
  const nextMovements = new Set(next.workouts.flatMap((w) => flat(w).map((e) => e.id)));

  return {
    samePlan: current.id === next.id,
    workouts,
    totals: {
      entering: sum((w) => w.entering.length),
      leaving: sum((w) => w.leaving.length),
      kept: sum((w) => w.kept.length),
      retargeted: sum((w) => w.kept.filter((k) => k.from).length),
      newMovements: [...nextMovements].filter((id) => !currentMovements.has(id)).length,
      droppedMovements: [...currentMovements].filter((id) => !nextMovements.has(id)).length,
    },
    warnings: planWarnings(current, next),
  };
}

/**
 * Problemas que o schema aceita mas que quebram o app em silêncio: o motor de
 * progressão que nunca fica "pronto", o cronômetro de 2 segundos, o histórico
 * de um movimento que recomeça do zero com outro id.
 */
export function planWarnings(current: Plan, next: Plan): PlanWarning[] {
  const out: PlanWarning[] = [];
  const catalog = new KnownIds();
  for (const e of CATALOG) catalog.add(e.id, [e.name, ...e.aliases]);
  // Catálogo + plano atual: o que conta como "já existe" pra um id novo.
  const known = new KnownIds();
  for (const e of CATALOG) known.add(e.id, [e.name, ...e.aliases]);
  for (const w of current.workouts) {
    for (const e of flat(w)) known.add(e.id, [e.name], true);
  }

  // Maior nível que o plano atual declara por skill: base do aviso de salto.
  const currentLevel = new Map<string, number>();
  for (const w of current.workouts) {
    for (const e of flat(w)) {
      if (!e.skill_ref) continue;
      const lv = currentLevel.get(e.skill_ref.skill_id) ?? 0;
      currentLevel.set(e.skill_ref.skill_id, Math.max(lv, e.skill_ref.level));
    }
  }

  const done = new Set<string>();
  for (const w of next.workouts) {
    for (const e of flat(w)) {
      // O mesmo movimento em vários treinos só avisa uma vez.
      const once = (kind: string, message: string) => {
        const key = `${kind}:${e.id}`;
        if (done.has(key)) return;
        done.add(key);
        out.push({ exerciseId: e.id, message });
      };

      if (!/^\s*\d+\s*[×xX]\s*\d+/.test(e.target)) {
        once(
          "target",
          `${e.name}: alvo "${e.target}" fora do formato "N × M" — a tela lê 1 série só.`
        );
      }

      if (e.skill_ref) {
        // Intervalo ("3 × 6-8") não é problema: targetValue cai no piso do texto.
        // Só avisa quando não há número nenhum pra comparar.
        const value = targetValue(e.parsed, e.target);
        if (value === null) {
          once(
            "parsed",
            `${e.name}: nível de skill sem número no alvo — o app não reconhece o alvo batido.`
          );
        }
        const criteria = getCriteria(e.skill_ref.skill_id, e.skill_ref.level);
        const unit = unitOf(e.parsed, e.target);
        const expected = criteria ? CRITERIA_UNIT[criteria.type] : null;
        if (expected && unit && unit !== expected) {
          // Degrau de tentativas: a tela segue o critério e mostra o placar, então
          // o alvo escrito ("3 × 15s") nunca é o que se registra. Nos outros, a
          // tela segue o alvo e o motor compara reps com segundos (ou o inverso).
          // Nos dois casos a comparação com o critério abaixo não faz sentido.
          once(
            "unit",
            expected === "attempts"
              ? `${e.name}: o nível é medido em tentativas boas, mas o alvo está em ${UNIT_PT[unit]} — a tela vai pedir tentativas, não o alvo escrito.`
              : `${e.name}: o nível é medido em ${UNIT_PT[expected]}, mas o alvo está em ${UNIT_PT[unit]} — o motor compara um com o outro e o degrau nunca fecha.`
          );
        } else {
          const needed = criteria ? criterionThreshold(criteria) : null;
          if (needed !== null && value !== null && value < needed) {
            once(
              "criteria",
              `${e.name}: o alvo (${value}) fica abaixo do critério do nível (${needed}) — você cumpre o plano e nunca fica pronto pra subir de nível.`
            );
          }
        }

        const before = currentLevel.get(e.skill_ref.skill_id);
        if (before !== undefined && e.skill_ref.level > before + 1) {
          once(
            "jump",
            `${e.name}: pula do nível ${before} pro ${e.skill_ref.level} — a escada sobe um degrau por vez.`
          );
        }
      }

      if (/\d\s*(min|minutos?)\b/i.test(e.rest)) {
        once(
          "rest",
          `${e.name}: descanso "${e.rest}" em minutos — o app lê o número como segundos (${parseRestSeconds(e.rest) ?? "?"}s).`
        );
      }

      if (!known.has(e.id)) {
        const twin = known.twinOf(e);
        if (twin && twin !== e.id) {
          once(
            "id",
            `${e.name}: id novo (${e.id}) pra um movimento que já existe como ${twin} — o histórico dele recomeça do zero.`
          );
        }
      } else if (!catalog.has(e.id)) {
        // Id que já veio inventado no plano atual: não é novo, então o aviso de
        // cima nunca dispara, e o histórico segue partido em dois pra sempre.
        const twin = catalog.twinOf(e);
        if (twin && twin !== e.id) {
          once(
            "id",
            `${e.name}: o id ${e.id} é o mesmo movimento que ${twin} no catálogo — o histórico fica dividido entre os dois. Peça pra IA usar ${twin}.`
          );
        }
      }
    }
  }
  return out;
}
