import { describe, it, expect } from "vitest";
import { firstWeek } from "@/lib/domain/firstWeek";
import { countReturns, returnAt } from "@/lib/domain/returnNudge";

const workouts = [
  { id: "A", label: "A", title: "Puxar" },
  { id: "B", label: "B", title: "Empurrar" },
  { id: "C", label: "C", title: "Pernas" },
];
const plan = (date: string, workout_id: string) => ({ date, workout_id, source: "plan" });

describe("firstWeek", () => {
  it("antes do primeiro treino já começa com 1 de 4: o plano montado", () => {
    const w = firstWeek({ sessions: [], workouts, today: "2026-10-28" })!;
    expect(w.done).toBe(1);
    expect(w.items).toHaveLength(4);
    expect(w.items[0]).toEqual({ id: "plano", label: "Montar o plano", done: true });
  });

  it("marca cada treino do plano feito ao menos uma vez", () => {
    const w = firstWeek({ sessions: [plan("2026-10-28", "A")], workouts, today: "2026-10-29" })!;
    expect(w.done).toBe(2);
    expect(w.items.find((i) => i.id === "A")!.done).toBe(true);
  });

  it("treino avulso não marca treino do plano", () => {
    const avulso = { date: "2026-10-28", workout_id: null, source: "freeform" };
    expect(firstWeek({ sessions: [avulso], workouts, today: "2026-10-29" })!.done).toBe(1);
  });

  it("some quando todos os treinos foram feitos", () => {
    const s = [plan("2026-10-28", "A"), plan("2026-10-30", "B"), plan("2026-11-01", "C")];
    expect(firstWeek({ sessions: s, workouts, today: "2026-11-01" })).toBeNull();
  });

  it("some 7 dias depois do primeiro treino, mesmo incompleta", () => {
    expect(firstWeek({ sessions: [plan("2026-10-28", "A")], workouts, today: "2026-11-04" })).toBeNull();
  });
});

describe("voltas depois de pausa", () => {
  it("conta pausas de 7+ dias entre dias de treino", () => {
    expect(countReturns(["2026-10-01", "2026-10-03", "2026-10-12", "2026-10-13", "2026-10-25"])).toBe(2);
  });

  it("returnAt diz se o treino daquele dia encerrou uma pausa, e qual volta foi", () => {
    const d = ["2026-10-01", "2026-10-12", "2026-10-25"];
    expect(returnAt(d, "2026-10-12")).toEqual({ days: 11, nth: 1 });
    expect(returnAt(d, "2026-10-25")).toEqual({ days: 13, nth: 2 });
    expect(returnAt(d, "2026-10-01")).toBeNull();
  });

  it("pausa curta não é volta", () => {
    expect(returnAt(["2026-10-01", "2026-10-05"], "2026-10-05")).toBeNull();
  });
});
