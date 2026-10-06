import { describe, it, expect } from "vitest";
import { nextIndex, queueFrom } from "@/lib/domain/nextWorkout";
import type { Workout } from "@/lib/plan/schema";

const w = (id: string) => ({ id }) as Workout;
const plan = [w("A"), w("B"), w("C")];

describe("nextIndex", () => {
  it("nunca treinou: começa pelo primeiro", () => {
    expect(nextIndex(null, plan)).toBe(0);
  });

  it("anda pra frente a partir do último concluído", () => {
    expect(nextIndex("A", plan)).toBe(1);
    expect(nextIndex("B", plan)).toBe(2);
  });

  it("volta ao início depois do último", () => {
    expect(nextIndex("C", plan)).toBe(0);
  });

  it("treino que saiu do plano recomeça pelo primeiro", () => {
    expect(nextIndex("Z", plan)).toBe(0);
  });

  it("plano de um treino: o próximo é sempre ele", () => {
    expect(nextIndex("A", [w("A")])).toBe(0);
  });
});

describe("queueFrom", () => {
  it("dá a volta inteira, sem repetir, começando pelo próximo", () => {
    expect(queueFrom("A", plan).map((x) => x.id)).toEqual(["B", "C", "A"]);
  });

  it("plano vazio devolve fila vazia", () => {
    expect(queueFrom(null, [])).toEqual([]);
  });
});
