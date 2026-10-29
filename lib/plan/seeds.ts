import type { Plan } from "./schema";
import type { Equipment, SeedId } from "@/lib/domain/onboarding";
import semBarra from "./seeds/iniciante-sem-barra.json";
import comBarra from "./seeds/iniciante-com-barra.json";
import intermediario from "./seeds/intermediario.json";
import iniCorpoSemBarra from "./seeds/iniciante-corpo-inteiro-sem-barra.json";
import iniCorpoComBarra from "./seeds/iniciante-corpo-inteiro-com-barra.json";
import intSemBarra from "./seeds/intermediario-sem-barra.json";
import intComBarra from "./seeds/intermediario-com-barra.json";

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
  /** Equipamentos do catálogo que a semente pode usar (cada exercício precisa de ao menos um). */
  tags: string[];
  plan: Plan;
  /**
   * `false`: fora das listas de escolha (onboarding e "Planos prontos"), mas
   * continua aqui porque o histórico de quem já usa aponta pro id dele.
   */
  listed?: boolean;
}

/** Sementes oferecidas pra escolha. */
export function listedSeeds(): Seed[] {
  return seeds.filter((s) => s.listed !== false);
}

export const seeds: Seed[] = [
  // Corpo inteiro primeiro: são as sugeridas (ver suggestSeed) e a ordem aqui é a
  // da lista "Trocar de plano".
  {
    id: "iniciante-corpo-inteiro-sem-barra",
    name: "Iniciante — corpo inteiro, sem barra",
    summary: "3 treinos de corpo inteiro só com chão e parede: flexão, pernas e core em todos, parada de mão no C.",
    tags: ["chão", "parede", "porta"],
    plan: iniCorpoSemBarra as unknown as Plan,
  },
  {
    id: "iniciante-corpo-inteiro-com-barra",
    name: "Iniciante — corpo inteiro, com barra",
    summary: "3 treinos de corpo inteiro: puxar, empurrar, pernas e core em todos, parada de mão no C.",
    tags: ["chão", "parede", "barra"],
    plan: iniCorpoComBarra as unknown as Plan,
  },
  {
    id: "intermediario-sem-barra",
    name: "Intermediário — sem barra",
    summary: "3 treinos de corpo inteiro com chão e parede: flexão arqueiro, parada e HSPU na parede, pistol e planche lean.",
    tags: ["chão", "parede", "porta"],
    plan: intSemBarra as unknown as Plan,
  },
  {
    id: "intermediario-com-barra",
    name: "Intermediário — barra, sem paralelas",
    summary: "3 treinos de corpo inteiro: pull-up, flexão diamante e arqueiro, parada de mão, pistol e tuck front lever.",
    tags: ["chão", "parede", "barra"],
    plan: intComBarra as unknown as Plan,
  },
  {
    id: "iniciante-sem-barra",
    name: "Iniciante — sem barra",
    summary: "3 treinos só com o chão e a parede: flexão, pernas e parada de mão, com core.",
    tags: ["chão", "parede"],
    plan: semBarra as unknown as Plan,
    // Dividida: substituída pela de corpo inteiro, fica só pelo histórico.
    listed: false,
  },
  {
    id: "iniciante-com-barra",
    name: "Iniciante — com barra",
    summary: "3 treinos: puxar na barra, empurrar com pernas, e parada de mão com core.",
    tags: ["chão", "parede", "barra"],
    plan: comBarra as unknown as Plan,
    listed: false,
  },
  {
    id: "intermediario",
    name: "Intermediário — barra e paralelas",
    summary: "3 treinos: barra, dips e empurrar, e parada de mão com L-sit e pernas.",
    tags: ["chão", "parede", "barra", "paralelas"],
    plan: intermediario as unknown as Plan,
  },
];

/** Plano do bundle e do "pular" no onboarding. */
export const DEFAULT_SEED_ID: SeedId = "iniciante-com-barra";

export function getSeed(id: SeedId): Seed | undefined {
  return seeds.find((s) => s.id === id);
}

/**
 * O plano em uso ainda é um dos prontos (ou o bundlado, que tem o id de uma
 * semente)? O onboarding aplica semente via `applyPlan`, então "tem override" não
 * distingue "escolhi pronto" de "montei com IA" — o id distingue.
 */
export function isSeedPlanId(planId: string): boolean {
  return seeds.some((s) => s.plan.id === planId);
}
