/**
 * Tela de espera das ações que recarregam o app (o plano é lido uma vez no boot,
 * então trocar de plano só vale depois de recarregar). Precisa atravessar a
 * recarga, senão a tela pisca: o texto vai pro sessionStorage e o boot script o
 * põe de volta no <html> antes do primeiro paint.
 *
 * O texto é uma variável CSS, não estado do React: tem que aparecer antes da
 * hidratação. O componente em components/ui/ReloadWait.tsx tira tudo ao montar.
 */
export const RELOAD_WAIT_KEY = "calistenia:reload-wait";

function mark(text: string): void {
  const root = document.documentElement;
  root.setAttribute("data-reload-wait", "");
  root.style.setProperty("--reload-wait-text", JSON.stringify(text));
}

export function showReloadWait(text: string): void {
  mark(text);
  try {
    sessionStorage.setItem(RELOAD_WAIT_KEY, text);
  } catch {
    // sem storage: a espera vale até a recarga, e a ação segue
  }
}

export function hideReloadWait(): void {
  const root = document.documentElement;
  root.removeAttribute("data-reload-wait");
  root.style.removeProperty("--reload-wait-text");
  try {
    sessionStorage.removeItem(RELOAD_WAIT_KEY);
  } catch {
    // idem
  }
}

export const RELOAD_WAIT_BOOT_SCRIPT = `(function(){try{var t=sessionStorage.getItem(${JSON.stringify(
  RELOAD_WAIT_KEY
)});if(t){var d=document.documentElement;d.setAttribute("data-reload-wait","");d.style.setProperty("--reload-wait-text",JSON.stringify(t));}}catch(e){}})();`;
