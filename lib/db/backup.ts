import { z } from "zod";
import { db, type Session, type ExerciseLog } from "@/lib/db/schema";
import { plan } from "@/lib/plan/loader";

const BACKUP_FORMAT = "calistenia-tracker-backup";
const BACKUP_VERSION = 1;

const setValueSchema = z.object({
  index: z.number(),
  value: z.number(),
});

const sessionSchema = z.object({
  id: z.string(),
  plan_day_id: z.string(),
  plan_version: z.number(),
  weekday: z.number(),
  date: z.string(),
  status: z.enum(["in_progress", "completed", "abandoned"]),
  started_at: z.number(),
  ended_at: z.number().nullable(),
  rpe: z.number().nullable(),
  note: z.string().nullable(),
  updated_at: z.number(),
  deleted_at: z.number().nullable(),
});

const logSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  exercise_id: z.string(),
  as_target: z.boolean(),
  sets: z.array(setValueSchema).nullable(),
  flags_selected: z.array(z.string()),
  skipped: z.boolean(),
  logged_at: z.number(),
  updated_at: z.number(),
  deleted_at: z.number().nullable(),
});

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number(),
  exported_at: z.string(),
  plan: z.object({ id: z.string(), version: z.number() }),
  sessions: z.array(sessionSchema),
  exerciseLogs: z.array(logSchema),
});

export type Backup = z.infer<typeof backupSchema>;

/** Dump completo (inclui tombstones para merge correto). */
export async function exportAll(): Promise<Backup> {
  const sessions = await db.sessions.toArray();
  const exerciseLogs = await db.exerciseLogs.toArray();
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    plan: { id: plan.id, version: plan.version },
    sessions,
    exerciseLogs,
  };
}

export function backupToBlob(backup: Backup): Blob {
  return new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
}

export function backupFilename(): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `calistenia-backup-${stamp}.json`;
}

export interface ImportResult {
  sessionsAdded: number;
  sessionsUpdated: number;
  logsAdded: number;
  logsUpdated: number;
}

/**
 * Merge por UUID com last-write-wins (updated_at). Nunca sobrescreve cegamente:
 * registro local mais novo prevalece. Valida antes de tocar no banco.
 */
export async function importMerge(raw: unknown): Promise<ImportResult> {
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      "Arquivo de backup inválido ou corrompido. Nada foi importado."
    );
  }
  const data = parsed.data;
  const result: ImportResult = {
    sessionsAdded: 0,
    sessionsUpdated: 0,
    logsAdded: 0,
    logsUpdated: 0,
  };

  await db.transaction("rw", db.sessions, db.exerciseLogs, async () => {
    for (const s of data.sessions) {
      const existing = await db.sessions.get(s.id);
      if (!existing) {
        await db.sessions.add(s as Session);
        result.sessionsAdded++;
      } else if (s.updated_at > existing.updated_at) {
        await db.sessions.put(s as Session);
        result.sessionsUpdated++;
      }
    }
    for (const l of data.exerciseLogs) {
      const existing = await db.exerciseLogs.get(l.id);
      if (!existing) {
        await db.exerciseLogs.add(l as ExerciseLog);
        result.logsAdded++;
      } else if (l.updated_at > existing.updated_at) {
        await db.exerciseLogs.put(l as ExerciseLog);
        result.logsUpdated++;
      }
    }
  });

  return result;
}

/** Nº de sessões concluídas desde o último export (para o lembrete). */
const LAST_EXPORT_KEY = "calistenia:last-export";

export function markExported(sessionCount: number): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    LAST_EXPORT_KEY,
    JSON.stringify({ at: Date.now(), sessionCount })
  );
}

/** Apaga TODOS os dados locais (sessões + registros). Irreversível. */
export async function resetAll(): Promise<void> {
  await db.transaction("rw", db.sessions, db.exerciseLogs, async () => {
    await db.exerciseLogs.clear();
    await db.sessions.clear();
  });
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(LAST_EXPORT_KEY);
  }
}

export function sessionsSinceExport(currentCompleted: number): number {
  if (typeof localStorage === "undefined") return 0;
  const raw = localStorage.getItem(LAST_EXPORT_KEY);
  if (!raw) return currentCompleted;
  try {
    const { sessionCount } = JSON.parse(raw);
    return Math.max(0, currentCompleted - sessionCount);
  } catch {
    return currentCompleted;
  }
}
