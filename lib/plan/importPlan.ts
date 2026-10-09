import { planSchema, type Plan } from "./schema";
import { PLAN_OVERRIDE_KEY } from "./loader";
import { convertLegacyPlan, isLegacyPlan } from "./legacyPlan";

export interface PlanSummary {
  name: string;
  version: number;
  workouts: number;
  exercises: number;
}

export type ParsePlanResult =
  | { ok: true; plan: Plan; summary: PlanSummary }
  | { ok: false; errors: string[] };

/** Tira cercas de código ```json ... ``` se a IA colar isso junto do JSON. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function summarize(plan: Plan): PlanSummary {
  const exercises = plan.workouts.reduce(
    (n, w) => n + w.blocks.reduce((m, b) => m + b.exercises.length, 0),
    0
  );
  return { name: plan.name, version: plan.version, workouts: plan.workouts.length, exercises };
}

/** Valida o JSON de um treino colado pelo usuário contra o mesmo schema do build. */
export function parsePlanInput(raw: string): ParsePlanResult {
  let json: unknown;
  try {
    json = JSON.parse(stripCodeFences(raw));
  } catch {
    return {
      ok: false,
      errors: ["Não parece ser um JSON válido — confira se copiou a resposta inteira."],
    };
  }

  // Plano no formato antigo (agenda por dia da semana) é convertido, não recusado.
  const result = planSchema.safeParse(isLegacyPlan(json) ? convertLegacyPlan(json) : json);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map(
        (issue) => `${issue.path.join(".") || "(raiz)"}: ${issue.message}`
      ),
    };
  }

  return { ok: true, plan: result.data, summary: summarize(result.data) };
}

/**
 * Voltar ao plano padrão foi escolha explícita. Sem este registro, o PlanBoot
 * (lib/plan/boot.ts) reaplicaria o plano do histórico no boot seguinte e o botão
 * "Restaurar plano padrão" não faria nada. Aplicar um plano apaga o registro.
 */
const RECOVERY_OPT_OUT_KEY = "calistenia:plan-recovery-off";

export function applyPlan(plan: Plan): void {
  localStorage.setItem(PLAN_OVERRIDE_KEY, JSON.stringify(plan));
  localStorage.removeItem(RECOVERY_OPT_OUT_KEY);
}

export function clearPlanOverride(): void {
  localStorage.removeItem(PLAN_OVERRIDE_KEY);
  localStorage.setItem(RECOVERY_OPT_OUT_KEY, "1");
}

export function hasRecoveryOptOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(RECOVERY_OPT_OUT_KEY) !== null;
  } catch {
    return false;
  }
}

export function hasPlanOverride(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PLAN_OVERRIDE_KEY) !== null;
}
