/**
 * Marca que a pessoa já viu a página de boas-vindas. Local, por aparelho e fora
 * do backup do Dexie, como o onboarding (ver utils/onboarding.ts).
 */
const KEY = "calistenia:landing-seen";

/**
 * Sem storage responde `true`: o boot usa isso pra decidir um `replace`, e errar
 * pro lado de NÃO redirecionar evita mandar a pessoa pra /sobre a cada carga.
 */
export function isLandingSeen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markLandingSeen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* sem storage: pior caso, a página aparece de novo */
  }
}

export function clearLandingSeen(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* idem */
  }
}
