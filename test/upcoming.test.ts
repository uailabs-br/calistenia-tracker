import { describe, it, expect } from "vitest";
import { upcomingDays } from "@/lib/domain/upcoming";
import type { PlanDay } from "@/lib/plan/schema";

const day = (weekday: number): PlanDay => ({ weekday }) as PlanDay;
const days = [day(1), day(2), day(4)]; // Seg, Ter, Qui

describe("upcomingDays", () => {
  it("exclui hoje e ordena por proximidade", () => {
    // hoje = quarta (3): próximos = Qui(1), Seg(5), Ter(6)
    expect(upcomingDays(3, days).map((d) => d.weekday)).toEqual([4, 1, 2]);
  });

  it("dia de treino feito hoje não reaparece como próximo", () => {
    // hoje = segunda (1): Seg é o hero, some da lista → Ter, Qui
    expect(upcomingDays(1, days).map((d) => d.weekday)).toEqual([2, 4]);
  });
});
