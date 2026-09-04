/**
 * Objetivos (skill_ids) e notas livres pra montar o prompt de persona da IA
 * em "Criar treino com IA". Local, fora do backup — mesmo padrão de profile.ts.
 */

const GOALS_KEY = "calistenia:ai-goals";
const NOTES_KEY = "calistenia:ai-notes";

export function getAiGoals(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(GOALS_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function setAiGoals(ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GOALS_KEY, JSON.stringify(ids));
}

export function getAiNotes(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(NOTES_KEY) ?? "";
}

export function setAiNotes(text: string): void {
  if (typeof window === "undefined") return;
  const clean = text.trim();
  if (clean) localStorage.setItem(NOTES_KEY, clean);
  else localStorage.removeItem(NOTES_KEY);
}

/**
 * Monta o texto de persona a partir dos nomes das skills marcadas como
 * objetivo + notas livres (equipamento, lesão, restrição — o que os
 * objetivos por skill não cobrem).
 */
export function buildPersonaText(goalNames: string[], notes: string): string {
  const lines = [
    "Aja como um coach especialista em calistenia. Use meu histórico e o sinal " +
      "de progressão por skill (ready/regress/stale/tracking) anexados abaixo " +
      "pra decidir o que ajustar — sem pular etapa de nível.",
  ];
  if (goalNames.length > 0) {
    lines.push(`Meus objetivos prioritários agora: ${goalNames.join(", ")}.`);
  }
  const cleanNotes = notes.trim();
  if (cleanNotes) lines.push(cleanNotes);
  return lines.join("\n");
}
