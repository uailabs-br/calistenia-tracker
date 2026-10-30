import { describe, it, expect } from "vitest";
import { TRAVEL_MS, routeDepth, travelBetween } from "@/lib/utils/spaceTravel";

describe("profundidade das telas no tema espaço", () => {
  it("as abas seguem a ordem da nav, e a sessão é o ponto mais fundo", () => {
    expect(["/", "/plano", "/metricas", "/config"].map(routeDepth)).toEqual([0, 1, 2, 3]);
    expect(routeDepth("/treino/abc")).toBe(4);
  });

  it("subtela fica atrás da aba dela, mais fundo quanto mais segmentos", () => {
    expect(routeDepth("/historico")).toBe(2.25);
    expect(routeDepth("/historico/abc")).toBe(2.5);
    // /config/plano é aba Treino, não Ajustes
    expect(routeDepth("/config/plano")).toBe(1.5);
  });

  it("landing e onboarding ficam fora", () => {
    expect(routeDepth("/sobre")).toBeNull();
    expect(routeDepth("/onboarding")).toBeNull();
  });
});

describe("viagem entre telas", () => {
  it("aba à direita avança, à esquerda volta", () => {
    expect(travelBetween("/", "/metricas")?.dir).toBe(1);
    expect(travelBetween("/config", "/plano")?.dir).toBe(-1);
  });

  it("a viagem dura o mesmo perto ou longe", () => {
    expect(travelBetween("/", "/treino/abc")).toEqual({ dir: 1, ms: TRAVEL_MS });
    expect(travelBetween("/plano", "/metricas")).toEqual({ dir: 1, ms: TRAVEL_MS });
  });

  it("sem viagem na mesma profundidade ou saindo do app", () => {
    expect(travelBetween("/treino/a", "/treino/b")).toBeNull();
    expect(travelBetween("/onboarding", "/")).toBeNull();
  });
});
