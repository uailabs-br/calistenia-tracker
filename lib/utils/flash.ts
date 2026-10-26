/**
 * Recado pra próxima tela que abrir, atravessando um recarregamento. Existe pro
 * "o que foi feito" das ações que recarregam o app (trocar de plano): o toast
 * mostrado antes do reload morre com a página. sessionStorage e não localStorage:
 * recado velho não pode aparecer amanhã, ao abrir o app.
 */
const KEY = "calistenia:flash";

export interface Flash {
  message: string;
  variant?: "info" | "success" | "error";
}

export function setFlash(flash: Flash): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(flash));
  } catch {
    // aba privada ou storage bloqueado: fica sem o recado, a ação já foi feita
  }
}

/** Lê e apaga: cada recado aparece uma vez. */
export function takeFlash(): Flash | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const f = JSON.parse(raw) as Flash;
    return typeof f?.message === "string" ? f : null;
  } catch {
    return null;
  }
}
