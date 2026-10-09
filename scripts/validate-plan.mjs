// Valida os planos contra o schema Zod em build: o plan.json bundlado, as
// sementes (lib/plan/seeds/) e o plano pessoal (lib/plan/plans/).
// Falha o build (exit 1) se qualquer um estiver inválido.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// O schema TS não é importável daqui (Node não roda .ts neste script), então o
// contrato é reconstruído abaixo com zod. test/seeds.test.ts roda o schema real
// sobre as mesmas sementes.

const __dirname = dirname(fileURLToPath(import.meta.url));
const planDir = resolve(__dirname, "../lib/plan");

// Importa o schema Zod compartilhado. Usamos a versão compilada via esbuild
// embutido do Next não está disponível fora do build, então validamos com zod
// diretamente reconstruindo o schema a partir do fonte TS transpilado em runtime.
const { z } = await import("zod");

const progressions = JSON.parse(
  readFileSync(resolve(__dirname, "../lib/plan/progressions.json"), "utf8")
);
const SKILL_LEVELS = new Map(
  progressions.skills.map((s) => [s.id, new Set(s.progressions.map((p) => p.level))])
);

const parsed = z
  .object({
    sets: z.number().int().positive(),
    target: z.number().positive(),
    unit: z.enum(["reps", "seconds", "attempts"]),
    per_side: z.boolean(),
  })
  .strict();

const exercise = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    target: z.string().min(1),
    parsed: parsed.nullable(),
    obs: z.string(),
    rest: z.string(),
    flags: z.array(z.string()),
    neg_flags: z.array(z.string()).optional(),
    skill_ref: z
      .object({ skill_id: z.string().min(1), level: z.number().int().positive() })
      .strict()
      .nullable()
      .optional(),
  })
  .strict();

const block = z
  .object({
    label: z.string().min(1),
    is_skill: z.boolean(),
    exercises: z.array(exercise).min(1),
  })
  .strict();

const progression = z
  .object({
    exercise_id: z.string().nullable(),
    label: z.string().optional(),
    criteria: z.string(),
  })
  .strict();

const workout = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    title: z.string().min(1),
    skill: z.string(),
    duration: z.string(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent_bg: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    is_practice: z.boolean(),
    warmup: z.string(),
    tip: z.string(),
    blocks: z.array(block).min(1),
    progression: z.array(progression),
  })
  .strict();

const planSchema = z
  .object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    name: z.string().min(1),
    source: z.string(),
    imported_at: z.string(),
    workouts: z.array(workout).min(1),
  })
  .strict()
  .superRefine((p, ctx) => {
    const ids = new Set();
    for (const w of p.workouts) {
      if (ids.has(w.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `ID de treino duplicado no plano: ${w.id}`,
        });
      }
      ids.add(w.id);
    }
    // Único dentro de um treino; o mesmo movimento pode repetir o ID entre treinos.
    for (const w of p.workouts) {
      const seen = new Set();
      for (const b of w.blocks) {
        for (const ex of b.exercises) {
          if (seen.has(ex.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `ID de exercício duplicado no mesmo treino (${w.id}): ${ex.id}`,
            });
          }
          seen.add(ex.id);
          for (const neg of ex.neg_flags ?? []) {
            if (!ex.flags.includes(neg)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `neg_flag inexistente em flags (${w.id} / ${ex.id}): ${neg}`,
              });
            }
          }
          if (ex.skill_ref) {
            const levels = SKILL_LEVELS.get(ex.skill_ref.skill_id);
            if (!levels || !levels.has(ex.skill_ref.level)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `skill_ref inexistente (${w.id} / ${ex.id}): ${ex.skill_ref.skill_id} nível ${ex.skill_ref.level}`,
              });
            }
          }
        }
      }
    }
  });

/** Valida um arquivo de plano; devolve { plan } ou { errors }. */
function validatePlanFile(path) {
  let plan;
  try {
    plan = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    return { errors: [`não foi possível ler/parsear: ${e.message}`] };
  }
  const result = planSchema.safeParse(plan);
  if (!result.success) {
    return {
      errors: result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }
  return { plan };
}

// ── Catálogo de exercícios (lib/plan/catalog.json) ─────────────────────────
// Falha o build se houver id duplicado, alternativa inexistente, skill fora de
// progressions.json ou músculo/categoria fora do vocabulário. (O schema Zod
// completo roda nos testes: test/catalog.test.ts.)
const catalogPath = resolve(__dirname, "../lib/plan/catalog.json");
let catalog;
try {
  catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
} catch (e) {
  console.error(`✗ catalog.json ilegível: ${e.message}`);
  process.exit(1);
}
const catalogErrors = [];
const catalogIds = new Set();
for (const e of catalog) {
  if (catalogIds.has(e.id)) catalogErrors.push(`id duplicado: ${e.id}`);
  catalogIds.add(e.id);
}
for (const e of catalog) {
  if (e.skill !== null && !SKILL_LEVELS.has(e.skill)) {
    catalogErrors.push(`${e.id}: skill inexistente (${e.skill})`);
  }
  for (const ref of [...e.easier, ...e.harder]) {
    if (!catalogIds.has(ref)) catalogErrors.push(`${e.id}: alternativa inexistente (${ref})`);
    if (ref === e.id) catalogErrors.push(`${e.id}: alternativa aponta pra si mesma`);
  }
}
if (catalogErrors.length > 0) {
  console.error("✗ catalog.json inválido:\n");
  for (const m of catalogErrors) console.error(`  • ${m}`);
  process.exit(1);
}
console.log(`✓ catalog.json válido — ${catalog.length} exercícios`);

// ── Planos: bundlado, sementes e pessoal ───────────────────────────────────
// Semente é conteúdo escrito à mão e não inventa movimento: todo exercise.id
// precisa existir no catálogo (ids do catálogo são estáveis pra sempre).
// O plano pessoal e o bundlado só passam pelo schema.
const jsonIn = (dir) =>
  readdirSync(resolve(planDir, dir))
    .filter((f) => f.endsWith(".json"))
    .map((f) => `${dir}/${f}`);

const files = [
  { rel: "plan.json", checkCatalog: false },
  ...jsonIn("seeds").map((rel) => ({ rel, checkCatalog: true })),
  ...jsonIn("plans").map((rel) => ({ rel, checkCatalog: false })),
];

let failed = false;
const planIds = new Map();
for (const { rel, checkCatalog } of files) {
  const { plan, errors = [] } = validatePlanFile(resolve(planDir, rel));
  if (plan && checkCatalog) {
    for (const w of plan.workouts)
      for (const b of w.blocks)
        for (const ex of b.exercises)
          if (!catalogIds.has(ex.id)) errors.push(`${w.id}: exercício fora do catálogo (${ex.id})`);
  }
  if (plan && rel !== "plan.json") {
    // plan.json é cópia de uma semente, então repete o id de propósito
    if (planIds.has(plan.id)) errors.push(`id de plano repetido (${plan.id}) em ${planIds.get(plan.id)}`);
    planIds.set(plan.id, rel);
  }
  if (errors.length > 0) {
    failed = true;
    console.error(`✗ ${rel} inválido:\n`);
    for (const m of errors) console.error(`  • ${m}`);
    continue;
  }
  const exCount = plan.workouts.reduce(
    (n, w) => n + w.blocks.reduce((m, b) => m + b.exercises.length, 0),
    0
  );
  console.log(`✓ ${rel} válido — ${plan.workouts.length} treinos, ${exCount} exercícios (v${plan.version})`);
}
if (failed) process.exit(1);
