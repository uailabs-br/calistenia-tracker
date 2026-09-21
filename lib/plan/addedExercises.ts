import type { CustomExercise, ExerciseSnapshot } from "@/lib/db/schema";
import type { PlanExercise } from "./schema";
import {
  getCatalogExercise,
  templateToPlanExercise,
  type CatalogExercise,
} from "./catalog";

/** Exercício criado pelo usuário no formato do catálogo, pra busca/lista unificadas. */
export function customToCatalogLike(c: CustomExercise): CatalogExercise {
  return {
    id: c.id,
    name: c.name,
    aliases: [],
    category: c.category,
    muscles: [],
    skill: null,
    equipment: [],
    unit: c.unit,
    per_side: c.per_side,
    sets: c.sets,
    target: c.target,
    rest: c.rest,
    easier: [],
    harder: [],
  };
}

/**
 * Id acrescentado ao treino → exercício no formato do plano (o que o cartão
 * entende). Ordem: catálogo, criado pelo usuário, e por último o snapshot do
 * log (exercício criado que foi apagado depois, mas já tinha sido registrado).
 * Sem nada disso: null, e o runner simplesmente não mostra.
 */
export function resolveAddedExercise(
  id: string,
  customs: CustomExercise[],
  snapshot?: ExerciseSnapshot | null
): PlanExercise | null {
  const cat = getCatalogExercise(id);
  if (cat) return templateToPlanExercise(cat);
  const custom = customs.find((c) => c.id === id && !c.deleted_at);
  if (custom) return templateToPlanExercise(custom);
  if (snapshot) {
    return {
      id,
      name: snapshot.name,
      target: snapshot.target,
      parsed: snapshot.parsed,
      obs: "",
      rest: "descanso 90s",
      flags: [],
    };
  }
  return null;
}
