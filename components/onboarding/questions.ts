import {
  hasBar,
  hasParallels,
  type Equipment,
  type Goal,
  type Level,
  type LevelSkill,
  type Limitation,
} from "@/lib/domain/onboarding";

/**
 * Textos do onboarding. Linguagem de quem nunca ouviu "RIR" nem "etapa de
 * escada": a pergunta é sobre algo que a pessoa sabe se faz, e "nunca tentei"
 * é resposta de primeira classe, não fracasso.
 */
export interface Option<V extends string> {
  value: V;
  label: string;
  hint?: string;
}

export const EQUIPMENT_OPTIONS: Option<Equipment>[] = [
  { value: "chao", label: "Em casa, só o chão", hint: "Uma parede ajuda, mas não precisa de mais nada." },
  { value: "casa_barra", label: "Em casa, com barra", hint: "Barra fixa na porta ou na parede." },
  { value: "praca", label: "Na praça", hint: "Barra e paralelas." },
  { value: "academia", label: "Academia", hint: "Barra e paralelas à vontade." },
];

/**
 * Nível: a frase de baixo cita CONQUISTAS da escada do app (progressions.json),
 * não contagem de repetição — "intermediário" sem âncora vira o que cada um
 * quiser. Os critérios citados são os que a escada usa pra dar a etapa por
 * batida: pull-up 3×8, dip completo 3×8, diamante 3×10, handstand na parede 30s.
 * O texto muda com o equipamento pra ninguém ler sobre barra sem ter barra.
 */
export function levelOptions(equipment: Equipment): Option<Level>[] {
  const bar = hasBar(equipment);
  const dips = hasParallels(equipment);
  return [
    {
      value: "iniciante",
      label: "Iniciante",
      hint: bar
        ? "Ainda construo a base: menos de 10 flexões seguidas e ainda não faço 8 barras."
        : "Ainda construo a base: menos de 10 flexões limpas seguidas e parada de mão ainda não.",
    },
    {
      value: "intermediario",
      label: "Intermediário",
      hint: bar
        ? `Faço 8 barras${dips ? ", dips completos" : ""} e parada de mão na parede por 30s. Começo a treinar skills.`
        : "Faço 10 flexões limpas e seguro a parada de mão na parede por 30s. Começo a treinar skills.",
    },
    {
      value: "avancado",
      label: "Avançado",
      hint: bar
        ? "Já faço muscle-up ou treino planche e front lever de verdade. Parada de mão livre."
        : "Parada de mão livre, flexão archer e planche em progressão. Skills são o meu treino.",
    },
  ];
}

/**
 * Nome curto de cada skill no resumo final. O catálogo chama de "Push-up",
 * "Handstand (Equilíbrio)"; aqui vale a palavra que a pergunta usou.
 */
export const SKILL_SHORT_LABEL: Record<LevelSkill, string> = {
  push_up: "Flexão",
  pull_up: "Barra",
  handstand_hold: "Parada de mão",
  dips: "Paralelas",
};

/**
 * Objetivo, em uma palavra (ver `Goal`). Não muda o plano sugerido: é o que a IA
 * usa pra escrever o próximo ciclo, e o que o resumo devolve pra pessoa.
 */
export const GOAL_OPTIONS: Option<Goal>[] = [
  { value: "forca", label: "Força", hint: "Ficar mais forte" },
  { value: "resistencia", label: "Resistência", hint: "Mais repetições" },
  { value: "skills", label: "Skills", hint: "Movimentos avançados" },
  { value: "mobilidade", label: "Mobilidade", hint: "Flexibilidade ativa" },
];

export const GOAL_LABEL: Record<Goal, string> = {
  forca: "Força",
  resistencia: "Resistência",
  skills: "Skills",
  mobilidade: "Mobilidade",
};

/** Limitações: múltipla escolha, e "nada" é a lista vazia. */
export const LIMITATION_OPTIONS: { value: Limitation; label: string }[] = [
  { value: "ombro", label: "Ombro" },
  { value: "punho", label: "Punho" },
  { value: "cotovelo", label: "Cotovelo" },
  { value: "joelho", label: "Joelho" },
  { value: "lombar", label: "Lombar" },
];

export const DAYS_OPTIONS = [2, 3, 4, 5, 6] as const;

export function daysFeedback(days: number): string {
  if (days <= 3) return "Um ritmo que dá pra manter — consistência vale mais que volume.";
  if (days === 4) return "O ponto de equilíbrio entre evoluir e recuperar.";
  return "Alta frequência — capriche no descanso e no sono.";
}
