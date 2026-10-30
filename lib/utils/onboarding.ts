/**
 * Persistência do onboarding. Local, por aparelho e fora do backup do Dexie,
 * como nome e meta semanal (ver profile.ts).
 */
import {
  levelFromLegacy,
  normalizeEquipment,
  type LegacyAnswers,
  type OnboardingAnswers,
} from "@/lib/domain/onboarding";

const KEY = "calistenia:onboarding";
const LOST_KEY = "calistenia:plan-lost";

interface Stored {
  done: true;
  answers: OnboardingAnswers | null;
  at: string;
}

/**
 * Respostas de versões anteriores: as gravadas antes da pergunta de nível ganham
 * o nível que elas implicam, e as gravadas quando a pergunta era o lugar
 * ("praca") ganham a lista que o lugar implicava.
 */
function upgrade(answers: unknown): OnboardingAnswers | null {
  if (!answers || typeof answers !== "object") return null;
  const a = answers as Partial<OnboardingAnswers> & Partial<LegacyAnswers>;
  const level = a.level ?? levelFromLegacy(a as LegacyAnswers);
  return { ...(a as object), level, equipment: normalizeEquipment(a.equipment) } as OnboardingAnswers;
}

function read(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!raw || raw.done !== true) return null;
    return { ...raw, answers: upgrade(raw.answers) } as Stored;
  } catch {
    return null;
  }
}

export function isOnboardingDone(): boolean {
  return read() !== null;
}

export function getOnboardingAnswers(): OnboardingAnswers | null {
  return read()?.answers ?? null;
}

/** `answers = null` quando a pessoa pulou. */
export function saveOnboarding(answers: OnboardingAnswers | null): void {
  const value: Stored = { done: true, answers, at: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(value));
}

/** Já avisamos que o plano deste id se perdeu? Evita repetir o aviso a cada abertura. */
export function wasPlanLostNotified(planId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(LOST_KEY) === planId;
  } catch {
    return true;
  }
}

export function markPlanLostNotified(planId: string): void {
  try {
    localStorage.setItem(LOST_KEY, planId);
  } catch {
    /* sem storage: pior caso, avisa de novo */
  }
}
