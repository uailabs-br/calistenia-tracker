import { describe, it, expect } from "vitest";
import {
  estimateDurationSeconds,
  durationLabel,
  calibrationFactor,
} from "@/lib/domain/estimateDuration";
import type { Workout, PlanExercise } from "@/lib/plan/schema";

const ex = (p: Partial<PlanExercise>): PlanExercise =>
  ({ id: "x", name: "x", target: "", obs: "", flags: [], parsed: null, rest: "", ...p }) as PlanExercise;

const dayWith = (exercises: PlanExercise[], duration = "~30 min", warmup = ""): Workout =>
  ({ duration, warmup, blocks: [{ label: "b", is_skill: false, exercises }] }) as Workout;

describe("estimateDurationSeconds", () => {
  it("soma trabalho + descanso intra e inter exercícios", () => {
    const workout = dayWith([
      ex({
        parsed: { sets: 3, target: 10, unit: "reps", per_side: false },
        rest: "descanso 60s",
      }),
      ex({
        parsed: { sets: 2, target: 20, unit: "seconds", per_side: false },
        rest: "descanso 30s",
      }),
    ]);
    // ex1: 3*30 trabalho + 2*60 intra + 60 descanso + 45 troca = 90+120+60+45 = 315
    // ex2: 2*20 trabalho + 1*30 intra (último: sem troca)       = 40+30       = 70
    expect(estimateDurationSeconds(workout)).toBe(385);
  });

  it("alvo em intervalo (parsed null, o formato da IA) entra pelo texto", () => {
    const workout = dayWith([ex({ target: "3 × 8-10", rest: "descanso 60s" })]);
    // 3 × 8 reps (piso) × 3s + 2 × 60s
    expect(estimateDurationSeconds(workout)).toBe(72 + 120);
  });

  it("por lado dobra o trabalho, não o descanso", () => {
    const one = dayWith([ex({ target: "3 × 8s", rest: "descanso 60s" })]);
    const both = dayWith([ex({ target: "3 × 8s/lado", rest: "descanso 60s" })]);
    expect(estimateDurationSeconds(both) - estimateDurationSeconds(one)).toBe(24);
  });

  it("tentativas descansam entre si", () => {
    const workout = dayWith([ex({ target: "1 × 10 tentativas", rest: "30-45s entre tentativas" })]);
    // 10 × 10s + 9 × 45s
    expect(estimateDurationSeconds(workout)).toBe(100 + 405);
  });

  it("soma o aquecimento declarado, ou 2 min se ele não diz quanto", () => {
    const base = [ex({ target: "3 × 10", rest: "" })];
    expect(estimateDurationSeconds(dayWith(base, "", "Hang 30s · wrist prep — 3 min"))).toBe(90 + 180);
    expect(estimateDurationSeconds(dayWith(base, "", "Wrist prep"))).toBe(90 + 120);
  });

  it("ignora exercícios sem número no alvo", () => {
    const workout = dayWith([ex({ target: "até a falha", rest: "descanso 60s" })]);
    expect(estimateDurationSeconds(workout)).toBe(0);
  });
});

describe("calibrationFactor", () => {
  const s = (realMin: number, estMin: number) => ({ real: realMin * 60, estimated: estMin * 60 });

  it("menos de 3 treinos medidos: sem calibração", () => {
    expect(calibrationFactor([s(40, 30), s(40, 30)])).toBe(1);
  });

  it("mediana da razão real/estimado, arredondada a 0,05", () => {
    expect(calibrationFactor([s(39, 30), s(38, 30), s(41, 30)])).toBe(1.3);
  });

  it("sessão esquecida aberta ou fechada sem treinar não conta", () => {
    expect(calibrationFactor([s(40, 30), s(39, 30), s(600, 30), s(2, 30)])).toBe(1);
  });

  it("fator limitado: plano novo muito diferente não vira 3×", () => {
    expect(calibrationFactor([s(90, 30), s(90, 30), s(90, 30)])).toBe(1.75);
  });
});

describe("durationLabel", () => {
  it("mostra ~Xmin quando estimável", () => {
    const workout = dayWith([
      ex({ parsed: { sets: 2, target: 60, unit: "seconds", per_side: false }, rest: "" }),
    ]);
    expect(durationLabel(workout)).toBe("~2min");
    expect(durationLabel(workout, 1.5)).toBe("~3min");
  });

  it("cai no texto do plano quando não há parsed", () => {
    const workout = dayWith([ex({ parsed: null, target: "livre" })], "10-12 min");
    expect(durationLabel(workout)).toBe("10-12 min");
  });
});
