import { db, type CustomExercise } from "@/lib/db/schema";
import type { SkillCategory } from "@/lib/plan/skills";
import { normalizeSearch, type ExerciseTemplate } from "@/lib/plan/catalog";
import { uuid, now } from "@/lib/utils/id";

/** Toda escrita de CustomExercise passa por aqui (convenção: repositório único). */

export const CUSTOM_NAME_MAX = 60;

export interface CustomExerciseInput {
  name: string;
  category: SkillCategory;
  unit: "reps" | "seconds";
  per_side?: boolean;
  sets?: number;
  target?: number;
  rest?: number;
}

/** Espaços colapsados, sem pontas, limitado a CUSTOM_NAME_MAX. */
export function cleanExerciseName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, CUSTOM_NAME_MAX).trim();
}

export async function getCustomExercises(): Promise<CustomExercise[]> {
  const rows = await db.customExercises.toArray();
  return rows
    .filter((c) => !c.deleted_at)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * Cria um exercício próprio. Nome igual (sem acento/caixa) a um já criado
 * devolve o existente em vez de duplicar. Padrões: 3 × 8 reps ou 3 × 20s.
 */
export async function createCustomExercise(
  input: CustomExerciseInput
): Promise<CustomExercise> {
  const name = cleanExerciseName(input.name);
  if (!name) throw new Error("Dê um nome ao exercício.");

  const key = normalizeSearch(name);
  const existing = (await getCustomExercises()).find(
    (c) => normalizeSearch(c.name) === key
  );
  if (existing) return existing;

  const ts = now();
  const seconds = input.unit === "seconds";
  const row: CustomExercise = {
    id: `custom-${uuid()}`,
    name,
    category: input.category,
    unit: input.unit,
    per_side: input.per_side ?? false,
    sets: clampInt(input.sets, 3, 1, 20),
    target: clampInt(input.target, seconds ? 20 : 8, 1, 600),
    rest: clampInt(input.rest, seconds ? 60 : 90, 10, 600),
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
  };
  await db.customExercises.add(row);
  return row;
}

/**
 * Soft delete. Logs e sessões antigas continuam legíveis: o nome/alvo vivem no
 * snapshot de cada log.
 */
export async function deleteCustomExercise(id: string): Promise<void> {
  const ts = now();
  await db.customExercises.update(id, { deleted_at: ts, updated_at: ts });
}

export function customToTemplate(c: CustomExercise): ExerciseTemplate {
  return {
    id: c.id,
    name: c.name,
    unit: c.unit,
    per_side: c.per_side,
    sets: c.sets,
    target: c.target,
    rest: c.rest,
  };
}

function clampInt(v: number | undefined, fallback: number, min: number, max: number): number {
  if (v === undefined || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}
