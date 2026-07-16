/**
 * Singleton do `beforeinstallprompt`. O evento dispara uma única vez por
 * page-load — capturado aqui no import do módulo, fica disponível para
 * qualquer tela (nudge da home e entrada em Config).
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Listener = (e: BeforeInstallPromptEvent | null) => void;

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<Listener>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l(deferred));
  });
}

/** Evento capturado (ou null se ainda não disparou / já foi consumido). */
export function getDeferredInstall(): BeforeInstallPromptEvent | null {
  return deferred;
}

/** Notifica quando o evento chegar depois do mount. Retorna unsubscribe. */
export function subscribeInstall(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Abre o prompt nativo de instalação. true se o usuário aceitou. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const evt = deferred;
  deferred = null; // o prompt só pode ser usado uma vez
  await evt.prompt();
  const choice = await evt.userChoice;
  return choice.outcome === "accepted";
}

/** Já roda instalado (standalone)? */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

/** iOS não dispara beforeinstallprompt — instalação é manual via Safari. */
export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}
