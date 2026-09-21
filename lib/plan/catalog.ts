import { z } from "zod";
import catalogData from "./catalog.json";
import { getSkillById, type SkillCategory } from "./skills";
import type { PlanExercise } from "./schema";

/**
 * Catálogo de exercícios (calistenia + básicos) pra adicionar durante o treino.
 * Estático e offline. Os `id` são estáveis PRA SEMPRE (o histórico segue o id):
 * nunca renomear, só adicionar. Onde o movimento já existe no plano ou na escada
 * de skills, o id é o mesmo — assim o histórico e o motor de progressão seguem.
 */

export type CatalogCategory = SkillCategory;

export const MUSCLES = [
  "costas",
  "bíceps",
  "antebraço",
  "peito",
  "ombros",
  "tríceps",
  "abdômen",
  "oblíquos",
  "lombar",
  "glúteos",
  "quadríceps",
  "posteriores",
  "panturrilha",
] as const;

export const catalogExerciseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    /** termos de busca alternativos (PT/EN, apelidos) */
    aliases: z.array(z.string()),
    category: z.enum(["Puxar", "Empurrar", "Core", "Pernas"]),
    muscles: z.array(z.enum(MUSCLES)).min(1),
    /** id da skill (progressions.json) a que o movimento pertence, se for degrau de alguma */
    skill: z.string().nullable(),
    equipment: z.array(z.string()),
    unit: z.enum(["reps", "seconds", "attempts"]),
    per_side: z.boolean(),
    /** padrão sugerido ao adicionar: séries × alvo por série (tentativas: 1 × N) */
    sets: z.number().int().positive(),
    target: z.number().positive(),
    /** descanso sugerido, em segundos */
    rest: z.number().int().positive(),
    /** alternativas: variações mais fáceis / mais difíceis (ids do catálogo) */
    easier: z.array(z.string()),
    harder: z.array(z.string()),
  })
  .strict();

export type CatalogExercise = z.infer<typeof catalogExerciseSchema>;

export const catalog = catalogData as unknown as CatalogExercise[];

const byId: Map<string, CatalogExercise> = new Map(catalog.map((e) => [e.id, e]));

export function getCatalogExercise(id: string): CatalogExercise | undefined {
  return byId.get(id);
}

/** Molde mínimo pra virar exercício de treino (catálogo ou criado pelo usuário). */
export interface ExerciseTemplate {
  id: string;
  name: string;
  unit: "reps" | "seconds" | "attempts";
  per_side: boolean;
  sets: number;
  target: number;
  /** descanso em segundos */
  rest: number;
}

/**
 * Molde → exercício no formato do plano, pra o runner/cartão tratarem igual a
 * qualquer outro. Sem flags nem obs: o exercício adicionado é registro puro.
 */
export function templateToPlanExercise(t: ExerciseTemplate): PlanExercise {
  const side = t.per_side ? "/lado" : "";
  const target =
    t.unit === "reps"
      ? `${t.sets} × ${t.target}${side}`
      : t.unit === "seconds"
        ? `${t.sets} × ${t.target}s${side}`
        : `${t.target} tentativas`;
  return {
    id: t.id,
    name: t.name,
    target,
    parsed: {
      sets: t.unit === "attempts" ? 1 : t.sets,
      target: t.target,
      unit: t.unit,
      per_side: t.per_side,
    },
    obs: "",
    rest: `descanso ${t.rest}s`,
    flags: [],
  };
}

/** Sem acento e minúsculo: "Extensão" casa com "extensao". */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export interface CatalogFilters {
  category?: CatalogCategory | null;
  skill?: string | null;
}

/**
 * Busca no catálogo. Cada palavra da consulta precisa aparecer em algum lugar
 * (nome, apelidos, músculos, categoria, skill, equipamento). Ordena por onde
 * casou: nome (começo antes) > apelidos > resto. Sem consulta, devolve tudo na
 * ordem do catálogo (já agrupado por categoria e progressão).
 */
export function searchCatalog(
  query: string,
  filters: CatalogFilters = {},
  source: CatalogExercise[] = catalog
): CatalogExercise[] {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const pool = source.filter(
    (e) =>
      (!filters.category || e.category === filters.category) &&
      (!filters.skill || e.skill === filters.skill)
  );
  if (tokens.length === 0) return pool;

  const scored: { e: CatalogExercise; score: number; i: number }[] = [];
  pool.forEach((e, i) => {
    const name = normalizeSearch(e.name);
    const aliases = e.aliases.map(normalizeSearch);
    const skillName = e.skill ? normalizeSearch(getSkillById(e.skill)?.name ?? "") : "";
    const rest = [e.category, ...e.muscles, ...e.equipment, skillName]
      .map(normalizeSearch)
      .join(" ");
    const nameWords = name.split(/[\s\-/()]+/);
    /** 0 começo de palavra do nome · 1 dentro do nome · 2 apelido · 3 resto · null não casa */
    const rank = (t: string): number | null => {
      if (nameWords.some((w) => w.startsWith(t))) return 0;
      if (name.includes(t)) return 1;
      if (aliases.some((a) => a.includes(t))) return 2;
      if (rest.includes(t)) return 3;
      return null;
    };
    let score = 0;
    let matchesAll = true;
    for (const t of tokens) {
      const r = rank(t);
      if (r === null) {
        matchesAll = false;
        break;
      }
      score += r;
    }
    if (!matchesAll) return;
    scored.push({ e, score, i });
  });
  return scored.sort((a, b) => a.score - b.score || a.i - b.i).map((s) => s.e);
}

export interface SkillChip {
  id: string;
  name: string;
  count: number;
}

/** Skills que têm exercício no catálogo, com quantidade — pros chips de filtro. */
export function catalogSkillChips(source: CatalogExercise[] = catalog): SkillChip[] {
  const counts = new Map<string, number>();
  for (const e of source) {
    if (e.skill) counts.set(e.skill, (counts.get(e.skill) ?? 0) + 1);
  }
  return [...counts]
    .map(([id, count]) => ({ id, name: getSkillById(id)?.name ?? id, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
