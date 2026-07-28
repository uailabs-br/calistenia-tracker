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
  }
}

export const db = new TrackerDB();
