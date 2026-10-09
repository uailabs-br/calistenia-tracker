import type { Plan } from "./schema";
import type { Equipment, SeedId } from "@/lib/domain/onboarding";
import semBarra from "./seeds/iniciante-sem-barra.json";
import comBarra from "./seeds/iniciante-com-barra.json";
import intermediario from "./seeds/intermediario.json";

export type { Equipment, SeedId };

/**
 * Planos-semente: o ponto de partida de quem não tem plano. Escritos à mão; o
 * app não gera treino. Todo `exercise.id` vem do catálogo (validado em build).
 */
export interface Seed {
  id: SeedId;
  name: string;
  /** Mostrado na última tela do onboarding, junto de "escolher outro". */
  summary: string;
  /** Para quais setups de treino a semente serve. */
  equipment: Equipment[];
  /** Equipamentos do catálogo que a semente pode usar (cada exercício precisa de ao menos um). */
  tags: string[];
  plan: Plan;
}

export const seeds: Seed[] = [
  {
    id: "iniciante-sem-barra",
    name: "Iniciante — sem barra",
    summary: "3 treinos só com o chão e a parede: flexão, pernas e parada de mão, com core.",
    equipment: ["chao"],
    tags: ["chão", "parede"],
    plan: semBarra as unknown as Plan,
  },
  {
    id: "iniciante-com-barra",
    name: "Iniciante — com barra",
    summary: "3 treinos: puxar na barra, empurrar com pernas, e parada de mão com core.",
    equipment: ["casa_barra", "praca", "academia"],
    tags: ["chão", "parede", "barra"],
    plan: comBarra as unknown as Plan,
  },
  {
    id: "intermediario",
    name: "Intermediário — barra e paralelas",
    summary: "3 treinos: barra, dips e empurrar, e parada de mão com L-sit e pernas.",
    equipment: ["praca", "academia"],
    tags: ["chão", "parede", "barra", "paralelas"],
    plan: intermediario as unknown as Plan,
  },
];

/** Plano do bundle e do "pular" no onboarding. */
export const DEFAULT_SEED_ID: SeedId = "iniciante-com-barra";

export function getSeed(id: SeedId): Seed | undefined {
  return seeds.find((s) => s.id === id);
}
