/** IDs de selos já vistos pelo usuário (para o marcador "novo"). Local. */

const KEY = "calistenia:badges-seen";

export function getSeenBadges(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return new Set(Array.isArray(raw) ? (raw as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markBadgesSeen(ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(ids));
}
