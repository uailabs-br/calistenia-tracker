import { describe, it, expect } from "vitest";
import { parsePlanInput } from "@/lib/plan/importPlan";

function minimalPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-test",
    version: 1,
    name: "Plano de teste",
    source: "test",
    imported_at: "2026-08-24",
    workouts: [
      {
        id: "A",
        label: "A",
        title: "Dia de teste",
        skill: "Teste",
        duration: "~10 min",
        accent: "#A89CFF",
        accent_bg: "#1E1B35",
        is_practice: false,
        warmup: "aquecimento",
        tip: "dica",
        blocks: [
          {
            label: "Bloco · 10 min",
            is_skill: true,
            exercises: [
              {
                id: "ex-1",
                name: "Exercício 1",
                target: "3 × 5",
                parsed: { sets: 3, target: 5, unit: "reps", per_side: false },
                obs: "observação",
                rest: "descanso 60s",
                flags: ["flag boa", "flag ruim"],
                neg_flags: ["flag ruim"],
              },
            ],
          },
        ],
        progression: [],
      },
    ],
    ...overrides,
  };
}

describe("parsePlanInput", () => {
  it("plano válido → summary correto", () => {
    const result = parsePlanInput(JSON.stringify(minimalPlan()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary).toEqual({
      name: "Plano de teste",
      version: 1,
      workouts: 1,
      exercises: 1,
    });
  });

  it("plano no formato antigo (agenda por dia) → convertido em treinos A, B…", () => {
    const old = minimalPlan();
    const legacy = {
      ...old,
      days: [{ ...(old.workouts[0] as object), weekday: 3, label: "Qua" }],
      workouts: undefined,
    };
    const result = parsePlanInput(JSON.stringify(legacy));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.workouts.map((w) => [w.id, w.label])).toEqual([["A", "A"]]);
    expect(result.summary.workouts).toBe(1);
  });

  it("JSON inválido mas fechado → mensagem amigável com o trecho do erro", () => {
    const result = parsePlanInput('{ "id": "x" "version": 1 }');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/não parece ser um JSON válido/i);
    expect(result.errors[0]).toMatch(/Perto de/);
  });

  it("texto sem nenhum JSON → diz pra copiar a resposta inteira", () => {
    const result = parsePlanInput("não consegui gerar o plano agora");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/não achei nenhum JSON/i);
  });

  it("resposta cortada no meio → aponta o corte, não 'JSON inválido'", () => {
    const truncated = JSON.stringify(minimalPlan()).slice(0, 220) + "}";
    const result = parsePlanInput(truncated);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/cortada no meio/i);
  });

  it("envolto em cercas ```json ``` → ainda valida", () => {
    const wrapped = "```json\n" + JSON.stringify(minimalPlan()) + "\n```";
    const result = parsePlanInput(wrapped);
    expect(result.ok).toBe(true);
  });

  it("cerca de código no MEIO de texto explicativo → ainda valida", () => {
    const wrapped =
      "Claro! Aqui está o plano ajustado, subindo o MU de nível:\n\n```json\n" +
      JSON.stringify(minimalPlan()) +
      "\n```\n\nPrincipais mudanças: aumentei o alvo da puxada explosiva.";
    const result = parsePlanInput(wrapped);
    expect(result.ok).toBe(true);
  });

  it("prosa em volta sem cerca nenhuma → ainda valida", () => {
    const result = parsePlanInput(
      "Aqui está:\n" + JSON.stringify(minimalPlan()) + "\nQualquer dúvida é só falar."
    );
    expect(result.ok).toBe(true);
  });

  it("comentários // e /* */ copiados do esquema → tolerados", () => {
    const withComments = `{
      // plano ajustado
      "id": "plan-test", /* mantém o id do plano atual */
      "version": 1,
      "name": "Plano de teste",
      "source": "test",
      "imported_at": "2026-08-24",
      "workouts": ${JSON.stringify(minimalPlan().workouts)}
    }`;
    const result = parsePlanInput(withComments);
    expect(result.ok).toBe(true);
  });

  it("vírgula sobrando antes de } ou ] → tolerada", () => {
    // duas vírgulas sobrando: antes do ] de workouts e antes do } do plano
    const trailing = JSON.stringify(minimalPlan()).replace(/\}\]\}$/, "},],}");
    const result = parsePlanInput(trailing);
    expect(result.ok).toBe(true);
  });

  it("escape de markdown da IA (\\~, \\*, \\_) → tolerado, texto preservado", () => {
    // caso real: a IA devolveu "duration":"\~38 min" e o JSON.parse abortava ali
    const raw = JSON.stringify(minimalPlan())
      .replace('"~10 min"', '"\\~38 min"')
      .replace('"dica"', '"foco no \\*controle\\* da descida"');
    const result = parsePlanInput(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.workouts[0].duration).toBe("~38 min");
    expect(result.plan.workouts[0].tip).toBe("foco no *controle* da descida");
  });

  it("escapes válidos de JSON seguem funcionando", () => {
    const plan = minimalPlan() as { workouts: { tip: string }[] };
    plan.workouts[0].tip = 'quebra\nde linha, aspas "assim" e barra \\ literal';
    const result = parsePlanInput(JSON.stringify(plan));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.workouts[0].tip).toBe(
      'quebra\nde linha, aspas "assim" e barra \\ literal'
    );
  });

  it("não mutila // nem vírgula dentro de string", () => {
    const plan = minimalPlan() as { workouts: { tip: string; blocks: { exercises: { obs: string }[] }[] }[] };
    plan.workouts[0].tip = "veja https://exemplo.com/guia — referência";
    plan.workouts[0].blocks[0].exercises[0].obs = "desce até 90°, } sem passar";
    const result = parsePlanInput(JSON.stringify(plan));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const w = result.plan.workouts[0];
    expect(w.tip).toBe("veja https://exemplo.com/guia — referência");
    expect(w.blocks[0].exercises[0].obs).toBe("desce até 90°, } sem passar");
  });

  it("exercise_id duplicado no mesmo treino → erro legível", () => {
    const plan = minimalPlan();
    const day = plan.workouts[0] as { blocks: { exercises: unknown[] }[] };
    const dup = { ...(day.blocks[0].exercises[0] as object) };
    day.blocks[0].exercises.push(dup);
    const result = parsePlanInput(JSON.stringify(plan));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /duplicado/i.test(e))).toBe(true);
  });

  it("neg_flag fora de flags → erro legível", () => {
    const plan = minimalPlan();
    const day = plan.workouts[0] as { blocks: { exercises: { neg_flags: string[] }[] }[] };
    day.blocks[0].exercises[0].neg_flags = ["não está em flags"];
    const result = parsePlanInput(JSON.stringify(plan));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /neg_flag/i.test(e))).toBe(true);
  });

  it("campo obrigatório faltando → erro legível", () => {
    const plan = minimalPlan();
    delete (plan as { name?: string }).name;
    const result = parsePlanInput(JSON.stringify(plan));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
