import Dexie, { type EntityTable } from "dexie";

/** Modelo de dados - PRD seção 5. Convenções: UUID, updated_at, soft delete. */

export type SessionStatus = "in_progress" | "completed" | "abandoned";

/** "plan" = treino do dia do programa; "freeform" = treino avulso, fora do plano. */
export type SessionSource = "plan" | "freeform";

export interface Session {
  id: string; // UUID
  plan_day_id: string | null; // `${plan.id}:${weekday}` - null em sessões freeform
  plan_version: number;
  weekday: number;
  date: string; // dateKey local YYYY-MM-DD
  status: SessionStatus;
  started_at: number;
  ended_at: number | null;
  rpe: number | null; // 1-5
  note: string | null;
  source: SessionSource;
  updated_at: number;
  deleted_at: number | null;
}

export interface SetValue {
  index: number;
  value: number;
}

/**
 * Performance declarada num exercício mapeado a um nível de skill (granularidade
 * de sessão: um form_ok/RIR por exercício, não por série individual).
 */
export type SetPerformed =
  | { type: "reps_rir"; reps: number[]; rir: number; form_ok: boolean }
  | { type: "hold_clean"; durations_seconds: number[]; form_ok: boolean }
  | { type: "skill_consistency"; attempts_total: number; attempts_good: number };

export interface ExerciseLog {
  id: string; // UUID
  session_id: string;
  exercise_id: string; // slug estável do plano
  as_target: boolean;
  sets: SetValue[] | null; // presente só se ajustou
  flags_selected: string[];
  note: string | null; // nota curta opcional por exercício
  skipped: boolean;
  logged_at: number; // instrumentação: quando foi registrado
  updated_at: number;
  deleted_at: number | null;
  // Motor de progressão v2 — presentes só quando o exercício está mapeado a
  // um nível de skill (ver lib/plan/skills.ts, exerciseSkillMapping).
  skill_id: string | null;
  level_at_time: number | null;
  criteria_type: SetPerformed["type"] | null;
  sets_performed: SetPerformed | null;
  criterion_met: boolean | null;
}

export class TrackerDB extends Dexie {
  sessions!: EntityTable<Session, "id">;
  exerciseLogs!: EntityTable<ExerciseLog, "id">;

  constructor() {
    super("calistenia-tracker");
    this.version(1).stores({
      // Índices: chave primária + campos consultados
      sessions: "id, plan_day_id, date, status, weekday, updated_at, deleted_at",
      exerciseLogs: "id, session_id, exercise_id, updated_at, deleted_at",
    });
    // v2: treino avulso (fora do plano) — `source` novo, `plan_day_id` vira opcional.
    this.version(2)
      .stores({
        sessions:
          "id, plan_day_id, date, status, weekday, source, updated_at, deleted_at",
        exerciseLogs: "id, session_id, exercise_id, updated_at, deleted_at",
      })
      .upgrade(async (tx) => {
        await tx
          .table("sessions")
          .toCollection()
          .modify((s) => {
            if (s.source === undefined) s.source = "plan";
          });
      });
    // v3: motor de progressão — campos novos ficam `undefined` nos logs
    // existentes (tratados como `null` em runtime pelas queries); IndexedDB
    // não indexa `undefined`, então não precisa de `.upgrade()` percorrendo
    // os registros — eles simplesmente não aparecem nas buscas por `skill_id`.
    this.version(3).stores({
      sessions:
        "id, plan_day_id, date, status, weekday, source, updated_at, deleted_at",
      exerciseLogs:
        "id, session_id, exercise_id, skill_id, updated_at, deleted_at",
    });
  }
}

export const db = new TrackerDB();
