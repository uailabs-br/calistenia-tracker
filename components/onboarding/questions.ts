import type { Equipment, OnboardingAnswers, QuestionKey } from "@/lib/domain/onboarding";

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

interface Question<K extends QuestionKey> {
  title: string;
  hint?: string;
  options: Option<NonNullable<OnboardingAnswers[K]>>[];
}

export const QUESTIONS: { [K in QuestionKey]: Question<K> } = {
  push_up: {
    title: "Quantas flexões seguidas você faz?",
    hint: "Com o peito chegando perto do chão, sem parar no meio.",
    options: [
      { value: "0", label: "Nenhuma ainda" },
      { value: "1-5", label: "1 a 5" },
      { value: "6-15", label: "6 a 15" },
      { value: "16+", label: "16 ou mais" },
    ],
  },
  pull_up: {
    title: "Consegue fazer uma barra?",
    hint: "Do braço esticado até o queixo passar da barra.",
    options: [
      { value: "nunca", label: "Nunca tentei" },
      { value: "ainda_nao", label: "Tentei, ainda não consigo" },
      { value: "1-2", label: "1 a 2" },
      { value: "3-7", label: "3 a 7" },
      { value: "8+", label: "8 ou mais" },
    ],
  },
  handstand_hold: {
    title: "Consegue ficar de cabeça pra baixo?",
    hint: "Apoiado nas mãos, com os pés na parede.",
    options: [
      { value: "nunca", label: "Nunca tentei" },
      { value: "segundos", label: "Alguns segundos" },
      { value: "30s", label: "30 segundos ou mais" },
      { value: "solto", label: "Sem parede, solto" },
    ],
  },
  dips: {
    title: "Consegue descer e subir nas paralelas?",
    hint: "Apoiado nos braços, sem dar impulso.",
    options: [
      { value: "nunca", label: "Nunca tentei" },
      { value: "pes_chao", label: "Só com os pés no chão ajudando" },
      { value: "completo", label: "Sim, de 1 a 7" },
      { value: "8+", label: "Sim, 8 ou mais" },
    ],
  },
};

/** Padrão de cada capacidade: a menor resposta, que erra pra baixo (ver domain/onboarding.ts). */
export const CAPACITY_DEFAULTS = {
  push_up: "0",
  pull_up: "nunca",
  handstand_hold: "nunca",
  dips: "nunca",
} as const;

export const DAYS_OPTIONS = [2, 3, 4, 5, 6] as const;

export function daysFeedback(days: number): string {
  if (days <= 3) return "Ótimo para começar com consistência.";
  if (days === 4) return "Frequência ideal para evolução constante.";
  return "Alta frequência — certifique-se de recuperar bem.";
}
