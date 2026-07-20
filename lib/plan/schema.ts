import { z } from "zod";

/**
 * Schema Zod do plan.json - espelha o PRD seção 5.
 * Usado em build (scripts/validate-plan.mjs) e disponível para dev.
 */

export const parsedSchema = z
  .object({
    sets: z.number().int().positive(),
    target: z.number().positive(),
    unit: z.enum(["reps", "seconds", "attempts"]),
    per_side: z.boolean(),
  })
  .strict();

export const exerciseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    target: z.string().min(1),
    parsed: parsedSchema.nullable(),
    obs: z.string(),
    rest: z.string(),
    flags: z.array(z.string()),
    // labels de flags que contam como execução "suja" (subconjunto de `flags`)
    neg_flags: z.array(z.string()).optional(),
  })
  .strict();

export const blockSchema = z
  .object({
    label: z.string().min(1),
    is_skill: z.boolean(),
    exercises: z.array(exerciseSchema).min(1),
  })
  .strict();

export const progressionSchema = z
  .object({
    exercise_id: z.string().nullable(),
    label: z.string().optional(),
    criteria: z.string(),
  })
  .strict();

export const daySchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    label: z.string().min(1),
    title: z.string().min(1),
    skill: z.string(),
    duration: z.string(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent_bg: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    is_practice: z.boolean(),
    warmup: z.string(),
    tip: z.string(),
    blocks: z.array(blockSchema).min(1),
    progression: z.array(progressionSchema),
  })
  .strict();

export const planSchema = z
  .object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    name: z.string().min(1),
    source: z.string(),
    imported_at: z.string(),
    days: z.array(daySchema).min(1),
  })
  .strict()
  .superRefine((plan, ctx) => {
    // IDs de exercício: o mesmo movimento compartilha ID entre dias (histórico
    // e flags agregam por movimento). Único DENTRO de um dia, repetível ENTRE dias.
    for (const day of plan.days) {
      const seen = new Set<string>();
      for (const block of day.blocks) {
        for (const ex of block.exercises) {
          if (seen.has(ex.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `ID de exercício duplicado no mesmo dia (${day.label}): ${ex.id}`,
              path: ["days"],
            });
          }
          seen.add(ex.id);
          for (const neg of ex.neg_flags ?? []) {
            if (!ex.flags.includes(neg)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `neg_flag inexistente em flags (${day.label} / ${ex.id}): ${neg}`,
                path: ["days"],
              });
            }
          }
        }
      }
    }
  });

export type Plan = z.infer<typeof planSchema>;
export type PlanDay = z.infer<typeof daySchema>;
export type PlanBlock = z.infer<typeof blockSchema>;
export type PlanExercise = z.infer<typeof exerciseSchema>;
export type Parsed = z.infer<typeof parsedSchema>;
export type Progression = z.infer<typeof progressionSchema>;
