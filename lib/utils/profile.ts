/** Nome do usuário para a saudação da home. Local, fora do backup (trivial de redigitar). */

const KEY = "calistenia:profile-name";

export function getProfileName(): string {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem(KEY) ?? "").trim();
}

export function setProfileName(name: string): void {
  const clean = name.trim();
  if (clean) localStorage.setItem(KEY, clean);
  else localStorage.removeItem(KEY);
}

/** Meta semanal (dias de treino). Override opcional do padrão (plan.days.length). */
const GOAL_KEY = "calistenia:week-goal";

export function getWeekGoal(): number | null {
  if (typeof window === "undefined") return null;
  const raw = Number(localStorage.getItem(GOAL_KEY));
  return Number.isInteger(raw) && raw >= 1 && raw <= 7 ? raw : null;
}

export function setWeekGoal(goal: number | null): void {
  if (goal && goal >= 1 && goal <= 7) localStorage.setItem(GOAL_KEY, String(goal));
  else localStorage.removeItem(GOAL_KEY);
}

/** Lembrete de treino: horário e se está ligado. Local (fora do backup). */
export interface ReminderPref {
  enabled: boolean;
  time: string; // "HH:MM"
}
const REMINDER_KEY = "calistenia:reminder";

export function getReminder(): ReminderPref {
  if (typeof window === "undefined") return { enabled: false, time: "18:00" };
  try {
    const raw = JSON.parse(localStorage.getItem(REMINDER_KEY) ?? "null");
    if (raw && typeof raw.time === "string") {
      return { enabled: Boolean(raw.enabled), time: raw.time };
    }
  } catch {
    /* valor corrompido → padrão */
  }
  return { enabled: false, time: "18:00" };
}

export function setReminder(pref: ReminderPref): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMINDER_KEY, JSON.stringify(pref));
}
