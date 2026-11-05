import {
  hasBar,
  hasParallels,
  stepFitsEquipment,
  type Equipment,
  type FocusKind,
  type GearItem,
  type Place,
  type Goal,
  type Level,
  type LevelSkill,
  type Limitation,
  type MuscleGroup,
} from "@/lib/domain/onboarding";
import { getSkillEquipment } from "@/lib/plan/skills";

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

/** Atalho de lugar: pré-marca a lista (ver PLACE_GEAR). */
export const PLACE_OPTIONS: Option<Place>[] = [
  { value: "casa", label: "Em casa" },
  { value: "praca", label: "Na praça" },
  { value: "academia", label: "Academia" },
];

/** O que a pessoa marca. O chão não entra: todo mundo tem. */
export const GEAR_OPTIONS: Option<GearItem>[] = [
  { value: "parede", label: "Parede livre", hint: "pra parada de mão" },
  { value: "barra", label: "Barra fixa" },
  { value: "paralelas", label: "Paralelas", hint: "barras de dip" },
  { value: "banco", label: "Banco ou degrau" },
  { value: "argolas", label: "Argolas" },
  { value: "paralettes", label: "Paralettes", hint: "mini paralelas de chão" },
  { value: "elastico", label: "Elástico" },
  { value: "peso", label: "Peso" },
];

/** "chão, parede livre, barra fixa": o resumo do que foi marcado. */
export function gearSummary(e: Equipment): string {
  return ["chão", ...GEAR_OPTIONS.filter((o) => e.includes(o.value)).map((o) => o.label.toLowerCase())].join(", ");
}

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
        ? "Menos de 10 flexões e ainda não faço 8 barras."
        : "Menos de 10 flexões limpas. Parada de mão, ainda não.",
    },
    {
      value: "intermediario",
      label: "Intermediário",
      hint: bar
        ? `8 barras${dips ? ", dips completos" : ""} e 30s de parada de mão na parede.`
        : "10 flexões limpas e 30s de parada de mão na parede.",
    },
    {
      value: "avancado",
      label: "Avançado",
      hint: bar
        ? "Muscle-up, ou planche e front lever de verdade."
        : "Parada de mão livre, flexão archer e planche.",
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
  { value: "definir", label: "Perder peso / definir", hint: "Menos gordura, corpo mais marcado" },
];

export const GOAL_LABEL: Record<Goal, string> = {
  forca: "Força",
  resistencia: "Resistência",
  skills: "Skills",
  mobilidade: "Mobilidade",
  definir: "Perder peso / definir",
};

export const MUSCLE_GROUP_OPTIONS: Option<MuscleGroup>[] = [
  { value: "peito", label: "Peito" },
  { value: "costas", label: "Costas" },
  { value: "ombros", label: "Ombros" },
  { value: "bracos", label: "Braços" },
  { value: "abdomen", label: "Abdômen" },
  { value: "pernas", label: "Pernas" },
  { value: "gluteos", label: "Glúteos" },
];

/**
 * Habilidades com o nome curto, as mais conhecidas primeiro. Human flag fica de
 * fora: pede poste, que ninguém declara, então nunca caberia no equipamento.
 */
const FOCUS_SKILL_OPTIONS: Option<string>[] = [
  { value: "handstand_hold", label: "Parada de mão" },
  { value: "push_up", label: "Flexão" },
  { value: "l_sit", label: "L-sit" },
  { value: "pistol_squat", label: "Pistol" },
  { value: "pull_up", label: "Barra" },
  { value: "muscle_up", label: "Muscle-up" },
  { value: "front_lever", label: "Front lever" },
  { value: "back_lever", label: "Back lever" },
  { value: "planche", label: "Planche" },
  { value: "hspu", label: "HSPU" },
  { value: "v_sit", label: "V-sit" },
  { value: "press_handstand", label: "Press handstand" },
  { value: "bent_arm_press", label: "Push to handstand" },
  { value: "dips", label: "Dips" },
  { value: "dragon_flag", label: "Dragon flag" },
  { value: "manna", label: "Manna" },
];

/** Só o que cabe no que a pessoa marcou: sem barra, muscle-up nem aparece. */
export function focusSkillOptions(equipment: Equipment): Option<string>[] {
  return FOCUS_SKILL_OPTIONS.filter((o) => stepFitsEquipment(getSkillEquipment(o.value), equipment));
}

/** Linha "Foco" do resumo. Nada marcado é a opção de cima da tela. */
export function focusSummary(kind: FocusKind, picks: readonly string[]): string {
  if (picks.length === 0) return kind === "grupos" ? "Todos os grupos" : "Ainda não sei";
  const options: Option<string>[] = kind === "grupos" ? MUSCLE_GROUP_OPTIONS : FOCUS_SKILL_OPTIONS;
  return options
    .filter((o) => picks.includes(o.value))
    .map((o) => o.label)
    .join(", ");
}

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

/** Tela final: nome curto das etapas. Quem não está aqui usa o nome do catálogo. */
const STEP_SHORT: Record<string, string> = {
  "Suspensão + puxada escapular": "Suspensão e puxada escapular",
  "L-sit Pull-up": "Barra com L-sit",
  "Archer Pull-up": "Barra arqueiro",
  "One-Arm Pull-up Negativo": "Barra com um braço, negativa",
  "Flexão Inclinada": "Flexão inclinada",
  "Flexão no Chão": "Flexão no chão",
  "Flexão Diamante": "Flexão diamante",
  "Archer Push-up": "Flexão arqueiro",
  "One-Arm Push-up Elevado": "Flexão com um braço, elevada",
  "One-Arm Push-up": "Flexão com um braço",
  "Aquecimento de punhos + canoinha": "Aquecimento de punhos e canoinha",
  "Handstand com Peito à Parede": "Parada com o peito na parede",
  "Handstand com Costas à Parede": "Parada com as costas na parede",
  "Toe-pull / Heel-pull off the wall": "Saindo da parede",
  "Kick-up para Handstand Livre": "Subir pra parada livre",
  "Handstand Livre (10-30s)": "Parada de mão livre",
  "Support Hold (Suporte Estático)": "Suporte parado",
  "Ring Dip": "Dip na argola",
  "One-Leg L-sit": "L-sit com uma perna",
  "Full L-sit": "L-sit completo",
  "Straddle L-sit": "L-sit aberto",
  "Bulgarian Split Squat": "Agachamento búlgaro",
  "Pistol Assistido (apoio)": "Pistol com apoio",
  "Pistol em Caixa (Box Pistol)": "Pistol na caixa",
  "Pistol Squat Completo": "Pistol completo",
};

export function stepShort(label: string): string {
  return STEP_SHORT[label] ?? label;
}

/** Como o título nomeia a etapa quando ela é o destino. Sem entrada, vai o nome curto. */
const STEP_DESTINATION: Record<string, string> = {
  "Barra fixa": "a sua primeira barra",
  "Barra fixa negativa": "a barra negativa",
  "L-sit Pull-up": "a barra com L-sit",
  "Archer Pull-up": "a barra arqueiro",
  "One-Arm Pull-up Negativo": "a barra com um braço",
  "Flexão Diamante": "a flexão diamante",
  "Archer Push-up": "a flexão arqueiro",
  "One-Arm Push-up Elevado": "a flexão com um braço",
  "One-Arm Push-up": "a flexão com um braço",
  "Handstand Livre (10-30s)": "a parada de mão livre",
  "Kick-up para Handstand Livre": "a parada de mão livre",
};

export function stepDestination(label: string): string {
  return STEP_DESTINATION[label] ?? stepShort(label);
}

/**
 * Só onde a escada sozinha criaria uma expectativa errada; nos outros objetivos a
 * tela não tem frase. Definir não promete corpo, e a habilidade escolhida pode não
 * estar no plano sugerido.
 */
export function pathNote(goal: Goal): string | null {
  if (goal === "definir") return "O que a balança mostra também depende da comida. O treino cuida da força e do músculo.";
  if (goal === "mobilidade") return "Mobilidade entra no seu próximo plano. Este aqui constrói a base.";
  if (goal === "skills") return "Essa fica nos seus objetivos, e o Gravks marca cada etapa que você bater.";
  return null;
}

