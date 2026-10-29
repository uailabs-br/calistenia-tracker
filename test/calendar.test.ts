import { describe, it, expect } from "vitest";
import { buildIcs, suggestedGap } from "@/lib/domain/calendar";

const base = {
  uid: "abc",
  title: "Treino B · Pernas",
  description: "~22 min no Gravks.",
  date: "2026-10-30",
  time: "07:00",
  minutes: 30,
  now: Date.UTC(2026, 9, 28, 21, 5, 9),
};

describe("buildIcs", () => {
  it("monta um evento com início, fim e alarme na hora", () => {
    const ics = buildIcs(base);
    expect(ics).toContain("DTSTART:20261030T070000");
    expect(ics).toContain("DTEND:20261030T073000");
    expect(ics).toContain("DTSTAMP:20261028T210509Z");
    expect(ics).toContain("TRIGGER:PT0M");
    expect(ics).toContain("UID:abc@gravks");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });

  it("fim que passa da meia-noite cai no dia seguinte", () => {
    const ics = buildIcs({ ...base, time: "23:45", minutes: 30 });
    expect(ics).toContain("DTEND:20261031T001500");
  });

  it("escapa vírgula e ponto e vírgula do texto", () => {
    const ics = buildIcs({ ...base, title: "Treino A, B; C" });
    expect(ics).toContain("SUMMARY:Treino A\\, B\\; C");
  });
});

describe("suggestedGap", () => {
  it("até 3 treinos por semana sugere um dia de folga", () => {
    expect(suggestedGap(2)).toBe(2);
    expect(suggestedGap(3)).toBe(2);
    expect(suggestedGap(4)).toBe(1);
  });
});
