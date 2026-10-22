import catalogData from "./catalog.json";
import type { Plan, PlanExercise, Workout } from "./schema";
import { getCriteria } from "./skills";
import { parseRestSeconds, targetValue } from "@/lib/domain/parseTarget";

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

const CATALOG = catalogData as { id: string; name: string }[];

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

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
  const known = new Map<string, string>(); // nome normalizado → id (plano atual + catálogo)
  const knownIds = new Set<string>();
  for (const e of CATALOG) {
    known.set(norm(e.name), e.id);
    knownIds.add(e.id);
  }
  for (const w of current.workouts) {
    for (const e of flat(w)) {
      known.set(norm(e.name), e.id);
      knownIds.add(e.id);
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
            `${e.name}: degrau de skill sem número no alvo — o app não reconhece o alvo batido.`
          );
        }
        const criteria = getCriteria(e.skill_ref.skill_id, e.skill_ref.level);
        const needed =
          criteria?.type === "reps_rir"
            ? criteria.reps
            : criteria?.type === "hold_clean"
              ? criteria.duration_seconds
              : null;
        if (criteria && needed !== null && value !== null && value < needed) {
          once(
            "criteria",
            `${e.name}: o alvo (${value}) fica abaixo do critério do degrau (${needed}) — você cumpre o plano e nunca fica pronto pra subir.`
          );
        }
      }

      if (/\d\s*(min|minutos?)\b/i.test(e.rest)) {
        once(
          "rest",
          `${e.name}: descanso "${e.rest}" em minutos — o app lê o número como segundos (${parseRestSeconds(e.rest) ?? "?"}s).`
        );
      }

      if (!knownIds.has(e.id)) {
        const twin = known.get(norm(e.name));
        if (twin && twin !== e.id) {
          once(
            "id",
            `${e.name}: id novo (${e.id}) pra um movimento que já existe como ${twin} — o histórico dele recomeça do zero.`
          );
        }
      }
    }
  }
  return out;
}
