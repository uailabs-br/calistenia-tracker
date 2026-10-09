/**
 * Objetivos (skill_ids) e notas livres pra montar o prompt de persona da IA
 * em "Montar treino com IA". Local, fora do backup — mesmo padrão de profile.ts.
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
 * Bloco de prioridades do atleta dentro do prompt: nomes das skills marcadas
 * como objetivo + notas livres (equipamento do dia, lesão, restrição — o que os
 * objetivos por skill não cobrem). O papel de coach e o método ficam no prompt
 * (lib/plan/aiPrompt.ts): repetir aqui só diluía a instrução.
 *
 * Vazio quando não há nada marcado nem escrito — o prompt omite a seção em vez
 * de abrir com um título sem conteúdo.
 */
export function buildPersonaText(goalNames: string[], notes: string): string {
  const lines: string[] = [];
  if (goalNames.length > 0) {
    lines.push(
      `Skills prioritárias agora: ${goalNames.join(", ")}. ` +
        "Trate o resto do plano como manutenção: volume suficiente pra não " +
        "regredir, sem roubar recuperação dessas."
    );
  }
  const cleanNotes = notes.trim();
  if (cleanNotes) lines.push(`Contexto que ele escreveu: ${cleanNotes}`);
  return lines.join("\n");
}
