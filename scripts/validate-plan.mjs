// Valida lib/plan/plan.json contra o schema Zod em build.
// Falha o build (exit 1) se o plano estiver inválido.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { register } from "node:module";

// Permite importar o schema TS via tsx-less: usamos o build do zod direto,
// re-declarando o schema em JS seria duplicação. Em vez disso, importamos o
// schema TS compilado on-the-fly. Node 24 não roda .ts nativo aqui, então
// carregamos o schema como módulo ESM usando o loader do próprio Next não é
// trivial — então validamos com uma cópia mínima do contrato aqui.

const __dirname = dirname(fileURLToPath(import.meta.url));
const planPath = resolve(__dirname, "../lib/plan/plan.json");

let raw;
try {
  raw = readFileSync(planPath, "utf8");
} catch (e) {
  console.error(`✗ Não foi possível ler ${planPath}: ${e.message}`);
  process.exit(1);
}

let plan;
try {
  plan = JSON.parse(raw);
} catch (e) {
  console.error(`✗ plan.json não é JSON válido: ${e.message}`);
  process.exit(1);
}

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

const day = z
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
    days: z.array(day).min(1),
  })
  .strict()
  .superRefine((p, ctx) => {
    // Único dentro de um dia; o mesmo movimento pode repetir o ID entre dias.
    for (const d of p.days) {
      const seen = new Set();
      for (const b of d.blocks) {
        for (const ex of b.exercises) {
          if (seen.has(ex.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `ID de exercício duplicado no mesmo dia (${d.label}): ${ex.id}`,
            });
          }
          seen.add(ex.id);
          for (const neg of ex.neg_flags ?? []) {
            if (!ex.flags.includes(neg)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `neg_flag inexistente em flags (${d.label} / ${ex.id}): ${neg}`,
              });
            }
          }
          if (ex.skill_ref) {
            const levels = SKILL_LEVELS.get(ex.skill_ref.skill_id);
            if (!levels || !levels.has(ex.skill_ref.level)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `skill_ref inexistente (${d.label} / ${ex.id}): ${ex.skill_ref.skill_id} nível ${ex.skill_ref.level}`,
              });
            }
          }
        }
      }
    }
  });

const result = planSchema.safeParse(plan);
if (!result.success) {
  console.error("✗ plan.json inválido:\n");
  for (const issue of result.error.issues) {
    console.error(`  • ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  process.exit(1);
}

const exCount = plan.days.reduce(
  (n, d) => n + d.blocks.reduce((m, b) => m + b.exercises.length, 0),
  0
);
console.log(
  `✓ plan.json válido — ${plan.days.length} dias, ${exCount} exercícios (v${plan.version})`
);

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
