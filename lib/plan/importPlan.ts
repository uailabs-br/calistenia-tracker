import { planSchema, type Plan } from "./schema";
import { PLAN_OVERRIDE_KEY } from "./loader";

export interface PlanSummary {
  name: string;
  version: number;
  days: number;
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

function summarize(plan: Plan): PlanSummary {
  const exercises = plan.days.reduce(
    (n, d) => n + d.blocks.reduce((m, b) => m + b.exercises.length, 0),
    0
  );
  return { name: plan.name, version: plan.version, days: plan.days.length, exercises };
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

  const result = planSchema.safeParse(json);
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

export function applyPlan(plan: Plan): void {
  localStorage.setItem(PLAN_OVERRIDE_KEY, JSON.stringify(plan));
}

export function clearPlanOverride(): void {
  localStorage.removeItem(PLAN_OVERRIDE_KEY);
}

export function hasPlanOverride(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PLAN_OVERRIDE_KEY) !== null;
}
