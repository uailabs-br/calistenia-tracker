import { describe, it, expect } from "vitest";
import { buildAiPrompt } from "@/lib/plan/aiPrompt";
import { AI_SCHEMA_PROMPT } from "@/lib/plan/aiSchema";
import { WORKOUT_SKILL_LABELS } from "@/lib/plan/skills";
import { plan } from "@/lib/plan/loader";
import catalogData from "@/lib/plan/catalog.json";
import progressionsData from "@/lib/plan/progressions.json";
import type { AiExport } from "@/lib/plan/exportForAI";

const EMPTY: AiExport = { plano_atual: plan, sessions: [], progressao: [] };

describe("buildAiPrompt — montagem", () => {
  it("põe o briefing antes do contrato e os dados no fim", () => {
    const text = buildAiPrompt("", EMPTY);
    const papel = text.indexOf("# PAPEL");
    const contrato = text.indexOf("# CONTRATO DE SAÍDA");
    const checklist = text.indexOf("# ANTES DE RESPONDER");
    const dados = text.indexOf("# DADOS DO ATLETA");
    expect(papel).toBe(0);
    expect(papel).toBeLessThan(contrato);
    expect(contrato).toBeLessThan(checklist);
    // o checklist é a última instrução antes do JSON, e o JSON é o fim
    expect(checklist).toBeLessThan(dados);
    expect(text.trimEnd().endsWith("}")).toBe(true);
  });

  it("inclui o plano em vigor nos dados, pra IA editar em vez de reescrever", () => {
    const text = buildAiPrompt("", EMPTY);
    const data = JSON.parse(text.slice(text.indexOf("# DADOS DO ATLETA") + 18));
    expect(data.plano_atual.id).toBe(plan.id);
  });

  it("indenta o plano (a IA edita) e compacta o histórico (a IA só lê)", () => {
    const comHistorico: AiExport = {
      ...EMPTY,
      sessions: [
        {
          date: "2026-03-12",
          workout: "A — MU + Puxar",
          exercises: [
            { name: "Puxada explosiva", target: "4 × 4", performed: [4, 4], flags: [], note: null },
          ],
        },
      ],
    };
    const bloco = buildAiPrompt("", comHistorico).slice(
      buildAiPrompt("", comHistorico).indexOf("# DADOS DO ATLETA") + 18
    );
    // segue sendo UM JSON válido, com as duas formas de serialização dentro
    expect(JSON.parse(bloco).sessions[0].date).toBe("2026-03-12");
    expect(bloco).toContain('"plano_atual": {\n  "id"');
    expect(bloco).toContain('"sessions": [{"date":"2026-03-12"');
  });

  it("abre a seção de prioridades só quando há persona", () => {
    expect(buildAiPrompt("", EMPTY)).not.toContain("PRIORIDADES DECLARADAS");
    expect(buildAiPrompt("   \n ", EMPTY)).not.toContain("PRIORIDADES DECLARADAS");
    const text = buildAiPrompt("Skills prioritárias agora: Front Lever.", EMPTY);
    expect(text).toContain("# PRIORIDADES DECLARADAS PELO ATLETA");
    expect(text).toContain("Front Lever");
  });
});

describe("AI_SCHEMA_PROMPT — contrato do que o app valida", () => {
  it("documenta os campos de topo do plano (sem eles o import falha inteiro)", () => {
    for (const field of ["id", "version", "name", "source", "imported_at", "workouts"]) {
      expect(AI_SCHEMA_PROMPT).toContain(`"${field}"`);
    }
  });

  it("avisa das duas armadilhas de runtime: alvo em prosa e descanso em minutos", () => {
    expect(AI_SCHEMA_PROMPT).toContain('formato "N × M"');
    expect(AI_SCHEMA_PROMPT).toContain("cronômetro de 2 segundos");
  });

  it("lista todo rótulo de skill que o app sabe resolver", () => {
    for (const label of WORKOUT_SKILL_LABELS) {
      expect(AI_SCHEMA_PROMPT).toContain(`"${label}"`);
    }
  });
});

describe("AI_SCHEMA_PROMPT — escadas", () => {
  const skills = progressionsData.skills as { id: string; progressions: { level: number; name: string }[] }[];

  it("lista toda skill e todo degrau, pra IA não inventar skill_ref", () => {
    for (const skill of skills) {
      expect(AI_SCHEMA_PROMPT).toContain(`${skill.id} — `);
      for (const step of skill.progressions) {
        expect(AI_SCHEMA_PROMPT).toContain(`${step.level}=${step.name}`);
      }
    }
  });

  it("leva o critério numérico de cada degrau — é ele que o motor verifica", () => {
    // alvo menor que o critério trava o atleta em "tracking" pra sempre
    expect(AI_SCHEMA_PROMPT).toContain("4=Pull-up (Pronado) → 3×8 reps · 2 sessões seguidas");
  });

  it("marca equipamento e pré-requisito, pra não prescrever o impossível", () => {
    expect(AI_SCHEMA_PROMPT).toContain("front_lever — Front Lever (puxar · barra fixa · só depois de pull_up nível 4)");
    expect(AI_SCHEMA_PROMPT).toContain("push_up — Push-up (empurrar · só o chão)");
  });
});

describe("AI_SCHEMA_PROMPT — ids conhecidos", () => {
  it("lista todo id do catálogo (o histórico agrega por id)", () => {
    for (const item of catalogData as { id: string; name: string }[]) {
      expect(AI_SCHEMA_PROMPT).toContain(`${item.id} = ${item.name}`);
    }
  });
});

describe("buildAiPrompt — método de progressão", () => {
  it("diz o que fazer com cada sinal do motor, não só o nome do sinal", () => {
    const text = buildAiPrompt("", EMPTY);
    expect(text).toContain("`ready`");
    expect(text).toContain("proximo_degrau");
    expect(text).toContain("`regress`");
    expect(text).toContain("degrau_anterior");
    expect(text).toContain("`stale`");
    expect(text).toContain("`tracking`");
  });

  it("traduz os tokens do perfil declarado (a IA vê 'casa_barra' cru no JSON)", () => {
    const text = buildAiPrompt("", EMPTY);
    for (const token of ["chao", "casa_barra", "praca", "academia"]) {
      expect(text).toContain(`\`${token}\``);
    }
    expect(text).toContain("limitacoes");
  });
});

describe("buildAiPrompt — texto enxuto", () => {
  const text = buildAiPrompt("", EMPTY);
  it("pede obs de uma frase no contrato e no briefing", () => {
    expect(AI_SCHEMA_PROMPT).toContain("REGRAS DE TAMANHO DO TEXTO");
    expect(AI_SCHEMA_PROMPT).toContain("UMA frase");
    expect(text).toContain("ENXUTO");
  });
  it("confere o tamanho no checklist final", () => {
    const checklist = text.slice(text.indexOf("# ANTES DE RESPONDER"), text.indexOf("# DADOS DO ATLETA"));
    expect(checklist).toContain("uma frase só");
  });
});

