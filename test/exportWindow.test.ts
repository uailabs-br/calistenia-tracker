import { describe, it, expect, beforeEach } from "vitest";
import { db, type Session } from "@/lib/db/schema";
import { exportForAI, detailWindow } from "@/lib/plan/exportForAI";
import { shiftDays, localDateKey } from "@/lib/utils/date";

/** Sessão num dia passado, com started_at coerente com a data (a janela ordena por ele). */
function session(daysAgo: number, workoutId: string | null): Session {
  const date = daysAgo > 0 ? shiftDays(localDateKey(), -daysAgo) : localDateKey();
  const ts = new Date(date + "T12:00:00").getTime();
  return {
    id: crypto.randomUUID(),
    plan_day_id: workoutId ? `p:${workoutId}` : null,
    plan_version: 1,
    workout_id: workoutId,
    date,
    status: "completed",
    started_at: ts,
    ended_at: ts,
    rpe: 3,
    note: null,
    source: workoutId ? "plan" : "freeform",
    updated_at: ts,
    deleted_at: null,
  };
}

async function addLog(sessionId: string, exerciseId: string, value: number, ts: number) {
  await db.exerciseLogs.add({
    id: crypto.randomUUID(),
    session_id: sessionId,
    exercise_id: exerciseId,
    as_target: false,
    sets: [{ index: 0, value }],
    flags_selected: [],
    note: null,
    skipped: false,
    logged_at: ts,
    updated_at: ts,
    deleted_at: null,
    skill_id: null,
    level_at_time: null,
    criteria_type: null,
    sets_performed: null,
    criterion_met: null,
  });
}

/** n sessões de plano, uma por dia, da mais antiga pra mais nova. */
async function seedPlanSessions(n: number, exerciseId = "mu-toes-to-bar") {
  for (let i = n; i >= 1; i--) {
    const s = session(i, "A");
    await db.sessions.add(s);
    // valor cresce com o tempo: a melhor série do período antigo é menor
    await addLog(s.id, exerciseId, n - i + 1, s.started_at);
  }
}

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

describe("detailWindow", () => {
  it("são seis voltas do ciclo, com piso pra plano curto", () => {
    expect(detailWindow(5)).toBe(30);
    expect(detailWindow(8)).toBe(48);
    // 6 × 2 = 12 ficaria abaixo do piso
    expect(detailWindow(2)).toBe(18);
    expect(detailWindow(3)).toBe(18);
  });
});

describe("exportForAI — janela de detalhe", () => {
  it("histórico que cabe na janela vai inteiro, sem resumo", async () => {
    await seedPlanSessions(5);
    const out = await exportForAI({ windowSessions: 10 });
    expect(out.sessions).toHaveLength(5);
    expect("historico_anterior" in out).toBe(false);
  });

  it("acima da janela, detalha as últimas e resume o resto", async () => {
    await seedPlanSessions(14);
    const out = await exportForAI({ windowSessions: 10 });
    expect(out.sessions).toHaveLength(10);
    // as detalhadas são as MAIS RECENTES, em ordem cronológica
    expect(out.sessions[0].date).toBe(shiftDays(localDateKey(), -10));
    expect(out.sessions[9].date).toBe(shiftDays(localDateKey(), -1));
    expect(out.historico_anterior).toHaveLength(1);
  });

  it("o resumo leva desde/ate/sessoes e a melhor série limpa do período", async () => {
    await seedPlanSessions(14);
    const [resumo] = (await exportForAI({ windowSessions: 10 })).historico_anterior!;
    expect(resumo.id).toBe("mu-toes-to-bar");
    expect(resumo.sessoes).toBe(4);
    expect(resumo.desde).toBe(shiftDays(localDateKey(), -14));
    expect(resumo.ate).toBe(shiftDays(localDateKey(), -11));
    // valores 1..4 nas quatro sessões antigas (o 14º dia é o 1)
    expect(resumo.melhor_serie).toBe("4 reps");
  });

  it("sessão avulsa não consome janela, mas entra se cair no período", async () => {
    await seedPlanSessions(6);
    const avulsa = session(3, null); // mesmo período das sessões de plano mantidas
    await db.sessions.add(avulsa);
    await addLog(avulsa.id, "mu-toes-to-bar", 9, avulsa.started_at);
    const velha = session(40, null); // bem antes da janela
    await db.sessions.add(velha);
    await addLog(velha.id, "mu-toes-to-bar", 2, velha.started_at);

    const out = await exportForAI({ windowSessions: 4 });
    // 4 sessões de plano + a avulsa do mesmo período = 5 detalhadas
    expect(out.sessions).toHaveLength(5);
    expect(out.sessions.filter((s) => s.workout === "avulso")).toHaveLength(1);
    // a avulsa antiga foi pro resumo, junto das 2 sessões de plano que sobraram
    expect(out.historico_anterior![0].sessoes).toBe(3);
    expect(out.historico_anterior![0].desde).toBe(shiftDays(localDateKey(), -40));
  });

  it("sessão vazia (sem log) não ocupa vaga na janela", async () => {
    await seedPlanSessions(3);
    const vazia = session(2, "B");
    await db.sessions.add(vazia);
    const out = await exportForAI({ windowSessions: 3 });
    expect(out.sessions).toHaveLength(3);
    expect("historico_anterior" in out).toBe(false);
  });
});
