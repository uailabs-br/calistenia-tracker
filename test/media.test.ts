import { describe, it, expect } from "vitest";
import { getExerciseMedia, mediaExerciseIds } from "@/lib/plan/media";
import { getCatalogExercise } from "@/lib/plan/catalog";

describe("mídia dos exercícios", () => {
  it("só mapeia ids que existem no catálogo (pega id digitado errado)", () => {
    for (const id of mediaExerciseIds()) {
      expect(getCatalogExercise(id), id).toBeDefined();
    }
  });

  it("devolve 1 ou 2 URLs https de .webp, na ordem início → topo", () => {
    for (const id of mediaExerciseIds()) {
      const urls = getExerciseMedia(id)!;
      expect(urls.length).toBeGreaterThanOrEqual(1);
      expect(urls.length).toBeLessThanOrEqual(2);
      for (const u of urls) expect(u).toMatch(/^https:\/\/exercise-dataset\.com\/images\/flat\/.+\.webp$/);
    }
    const [start, peak] = getExerciseMedia("push-up")!;
    expect(start).toContain("start");
    expect(peak).toContain("peak");
  });

  it("isometria tem uma pose só", () => {
    expect(getExerciseMedia("core-l-sit-chao")).toHaveLength(1);
  });

  it("exercício sem mídia (ou id livre da IA) devolve null", () => {
    expect(getExerciseMedia("mu-puxada-explosiva")).toBeNull();
    expect(getExerciseMedia("custom-123")).toBeNull();
  });
});
