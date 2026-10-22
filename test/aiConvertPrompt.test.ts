import { describe, it, expect } from "vitest";
import { buildConvertPrompt } from "@/lib/plan/aiConvertPrompt";
import { AI_SCHEMA_PROMPT } from "@/lib/plan/aiSchema";
import { parsePlanInput } from "@/lib/plan/importPlan";
import { diffPlans } from "@/lib/plan/diffPlan";

const TREINO = "Treino A\nBarra fixa 4x6\nFlexão 3x12";

describe("buildConvertPrompt", () => {
  const prompt = buildConvertPrompt(`  ${TREINO}  `, "2026-10-22");

  it("traz o treino da pessoa e a data, por último", () => {
    expect(prompt).toContain(TREINO);
    expect(prompt).toContain("2026-10-22");
    expect(prompt.indexOf("# TREINO DA PESSOA")).toBeGreaterThan(prompt.indexOf("# CONTRATO DE SAÍDA"));
    expect(prompt.trimEnd().endsWith("Flexão 3x12")).toBe(true);
  });

  it("reusa o contrato de saída do app, sem o briefing de coach", () => {
    expect(prompt).toContain(AI_SCHEMA_PROMPT);
    expect(prompt).not.toContain("coach de calistenia escrevendo o próximo ciclo");
    expect(prompt).toContain("NÃO MELHORE O TREINO");
  });

  it("não deixa a IA pôr dia da semana nem comentário no JSON", () => {
    expect(prompt).toContain("não existe dia da semana");
    expect(prompt).toContain("sem comentário");
  });
});

describe("resposta convertida entra pelo mesmo caminho de qualquer plano", () => {
  const ex = (id: string, name: string, target: string, parsed: object | null) => ({
    id,
    name,
    target,
    parsed,
    obs: "",
    rest: "descanso 90s",
    flags: ["limpo", "sujo"],
    neg_flags: ["sujo"],
  });
  const converted = {
    id: "treino-do-joao-2026-10",
    version: 1,
    name: "Treino do João",
    source: "importado-ia",
    imported_at: "2026-10-22",
    workouts: [
      {
        id: "A",
        label: "A",
        title: "Barra e flexão",
        skill: "Barra",
        duration: "30 min",
        accent: "#8174E8",
        accent_bg: "#1D1B2B",
        is_practice: false,
        warmup: "",
        tip: "",
        blocks: [
          {
            label: "Força",
            is_skill: false,
            exercises: [
              ex("pull-up", "Barra fixa", "4 × 6", { sets: 4, target: 6, unit: "reps", per_side: false }),
              ex("push-up", "Flexão", "3 × 12", { sets: 3, target: 12, unit: "reps", per_side: false }),
            ],
          },
        ],
        progression: [],
      },
    ],
  };

  it("aceita a resposta com texto em volta e vírgula sobrando, e gera preview", () => {
    const dirty = JSON.stringify(converted).replace(/\}\]\}$/, "},]}");
    expect(dirty).toContain("},]}"); // a vírgula sobrando está mesmo lá
    const raw = "Aqui está o seu treino:\n```json\n" + dirty + "\n```\nQualquer ajuste é só pedir.";
    const result = parsePlanInput(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary).toMatchObject({ workouts: 1, exercises: 2 });

    const diff = diffPlans({ ...result.plan, id: "atual", workouts: [] } as never, result.plan);
    expect(diff.totals.entering).toBe(2);
    expect(diff.workouts[0].status).toBe("new");
  });
});
