import { describe, it, expect } from "vitest";
import {
  targetSets,
  adjustSets,
  unitLabel,
  formatValue,
  unitOf,
  perSideOf,
} from "@/lib/domain/parseTarget";
import { effectiveSets, totalVolume, repsVolume } from "@/lib/domain/volume";
import type { Parsed } from "@/lib/plan/schema";

const reps: Parsed = { sets: 4, target: 4, unit: "reps", per_side: false };
const secs: Parsed = { sets: 2, target: 20, unit: "seconds", per_side: false };
const perSide: Parsed = { sets: 3, target: 8, unit: "reps", per_side: true };

describe("parseTarget", () => {
  it("reconstitui séries alvo", () => {
    expect(targetSets(reps)).toEqual([4, 4, 4, 4]);
    expect(targetSets(null)).toEqual([]);
  });
  it("rótulos e formatação de unidade", () => {
    expect(unitLabel(secs)).toBe("s");
    expect(formatValue(20, secs)).toBe("20s");
    expect(formatValue(4, reps)).toBe("4");
  });
  it("com parsed null, extrai sets do texto em vez de zerar tudo", () => {
    // regressão: "3 × 6-8/lado" com parsed: null tinha só 1 marcador
    expect(adjustSets(null, "3 × 6-8/lado")).toEqual([6, 6, 6]);
    expect(targetSets(null, "4 × 2")).toEqual([2, 2, 2, 2]);
    expect(targetSets(null, "3 × 2-3")).toEqual([2, 2, 2]);
  });
  it("sempre pré-preenche pelo piso do intervalo, mesmo com parsed presente", () => {
    // parsed.target pode ter capturado o teto ("6-8" → 8); o texto manda
    const highCaptured: Parsed = {
      sets: 3,
      target: 8,
      unit: "reps",
      per_side: true,
    };
    expect(targetSets(highCaptured, "3 × 6-8/lado")).toEqual([6, 6, 6]);
  });
  it("sem número reconhecível em lugar nenhum, cai no fallback de 1 marcador", () => {
    expect(adjustSets(null, "")).toEqual([1]);
  });
});

describe("volume", () => {
  it("as_target reconstitui do parsed", () => {
    const sets = effectiveSets(
      { as_target: true, sets: null, skipped: false },
      reps
    );
    expect(sets).toEqual([4, 4, 4, 4]);
    expect(totalVolume({ as_target: true, sets: null, skipped: false }, reps)).toBe(16);
  });
  it("usa sets ajustados quando presentes", () => {
    const log = {
      as_target: false,
      sets: [
        { index: 0, value: 4 },
        { index: 1, value: 4 },
        { index: 2, value: 3 },
      ],
      skipped: false,
    };
    expect(effectiveSets(log, reps)).toEqual([4, 4, 3]);
    expect(totalVolume(log, reps)).toBe(11);
  });
  it("skipped resulta em zero", () => {
    expect(
      totalVolume({ as_target: true, sets: null, skipped: true }, reps)
    ).toBe(0);
  });
  it("per_side dobra o volume", () => {
    expect(
      totalVolume({ as_target: true, sets: null, skipped: false }, perSide)
    ).toBe(48); // 8*3 = 24, *2 lados
  });
});

describe("unidade e lado a partir do texto (parsed null)", () => {
  it("parsed manda quando existe", () => {
    expect(unitOf(secs, "3 × 8")).toBe("seconds");
    expect(perSideOf(perSide, "3 × 8")).toBe(true);
  });
  it("sem parsed, lê o texto do alvo", () => {
    expect(unitOf(null, "3 × 8-10")).toBe("reps");
    expect(unitOf(null, "3 × 20-30s")).toBe("seconds");
    expect(unitOf(null, "30 segundos")).toBe("seconds");
    expect(unitOf(null, "5 × 3 tentativas")).toBe("attempts");
    expect(unitOf(null, "")).toBeNull();
    expect(perSideOf(null, "3 × 6-8/lado")).toBe(true);
    expect(perSideOf(null, "3 × 6-8")).toBe(false);
  });
});

describe("repsVolume — total de reps da sessão", () => {
  const asTarget = { as_target: true, sets: null, skipped: false };
  it("conta exercício com alvo em intervalo (parsed null), que era descartado", () => {
    // regressão: tile mostrava 16 quando o treino somava 70
    const total = repsVolume([
      { log: asTarget, parsed: reps, target: "4 × 4" },
      { log: asTarget, parsed: null, target: "3 × 8-10" },
      { log: asTarget, parsed: null, target: "3 × 10-12" },
    ]);
    expect(total).toBe(16 + 24 + 30);
  });
  it("ignora holds, tentativas e pulados; dobra por lado", () => {
    const total = repsVolume([
      { log: asTarget, parsed: secs, target: "2 × 20s" },
      { log: asTarget, parsed: null, target: "3 × 20-30s" },
      { log: asTarget, parsed: null, target: "5 × 3 tentativas" },
      { log: { ...asTarget, skipped: true }, parsed: reps, target: "4 × 4" },
      { log: asTarget, parsed: null, target: "3 × 6-8/lado" },
    ]);
    expect(total).toBe(36);
  });
  it("inclui série extra", () => {
    const log = { ...asTarget, extra_sets: [5] };
    expect(repsVolume([{ log, parsed: reps, target: "4 × 4" }])).toBe(21);
  });
});
