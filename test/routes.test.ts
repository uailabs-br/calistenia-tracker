import { describe, expect, it } from "vitest";
import { activeTab } from "@/lib/utils/routes";

describe("activeTab", () => {
  it("início só na raiz exata", () => {
    expect(activeTab("/")).toBe("/");
    // a sessão em andamento não é aba nenhuma, nem Treino
    expect(activeTab("/treino/abc")).toBeNull();
  });

  it("histórico acende Evolução", () => {
    expect(activeTab("/metricas")).toBe("/metricas");
    expect(activeTab("/historico")).toBe("/metricas");
    expect(activeTab("/historico/123")).toBe("/metricas");
  });

  it("progressão, skills e montar o treino acendem Treino", () => {
    expect(activeTab("/plano")).toBe("/plano");
    expect(activeTab("/progressao")).toBe("/plano");
    expect(activeTab("/skills/pull_up")).toBe("/plano");
    expect(activeTab("/config/plano")).toBe("/plano");
    expect(activeTab("/config/persona")).toBe("/plano");
    expect(activeTab("/config/exercicios")).toBe("/plano");
  });

  it("o resto de /config continua em Ajustes", () => {
    expect(activeTab("/config")).toBe("/config");
  });

  it("prefixo vale por segmento, não por texto", () => {
    expect(activeTab("/skillsx")).toBeNull();
    expect(activeTab("/configurar")).toBeNull();
  });
});
