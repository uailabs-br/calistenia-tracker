import { z } from "zod";

/**
 * Rascunho do onboarding de primeira vez: fechar o app no meio não pode custar as
 * respostas. Vive no localStorage como as respostas finais (ver onboarding.ts) e é
 * validado na leitura, porque um dado velho aqui não pode travar a primeira tela.
 */
export const ONBOARDING_DRAFT_KEY = "calistenia:onboarding-draft";

const draftSchema = z.object({
  step: z.string(),
  name: z.string().max(30),
  equipment: z.array(z.enum(["parede", "barra", "paralelas", "banco", "argolas", "paralettes", "elastico", "peso"])),
  level: z.enum(["iniciante", "intermediario", "avancado"]),
  days: z.number().int().min(2).max(6),
  goal: z.enum(["forca", "resistencia", "skills", "mobilidade", "definir"]),
  focusGroups: z.array(z.enum(["peito", "costas", "ombros", "bracos", "abdomen", "pernas", "gluteos"])),
  focusSkills: z.array(z.string()),
  limitations: z.array(z.enum(["ombro", "punho", "cotovelo", "joelho", "lombar"])),
  picked: z.object({ goal: z.boolean(), level: z.boolean(), pain: z.boolean() }),
});

export type OnboardingDraft = z.infer<typeof draftSchema>;

export function getOnboardingDraft(): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return null;
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Sem storage, a pessoa só perde a retomada: o fluxo segue normal. */
export function saveOnboardingDraft(draft: OnboardingDraft): void {
  try {
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  } catch {}
}

export function clearOnboardingDraft(): void {
  try {
    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  } catch {}
}
