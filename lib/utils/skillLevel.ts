/**
 * Ajuste manual de nível por skill (skillId → índice da etapa "estou aqui").
 * Complementa a detecção pelos logs: a posição exibida é o maior entre o que os
 * logs evidenciam e o que o usuário marcou. Local, por dispositivo.
 */

const KEY = "calistenia:skill-levels";

export function getSkillLevels(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return raw && typeof raw === "object" ? (raw as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function setSkillLevel(id: string, index: number): void {
  if (typeof window === "undefined") return;
  const all = getSkillLevels();
  all[id] = index;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function clearSkillLevel(id: string): void {
  if (typeof window === "undefined") return;
  const all = getSkillLevels();
  delete all[id];
  localStorage.setItem(KEY, JSON.stringify(all));
}
