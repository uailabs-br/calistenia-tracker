import { PLAN_OVERRIDE_KEY } from "@/lib/plan/loader";
import { ONBOARDING_KEY } from "@/lib/utils/onboarding";
import { LANDING_ROUTE, ONBOARDING_ROUTE } from "@/lib/utils/routes";

/**
 * Marca a abertura do app nesta sessão. É sessionStorage de propósito: sobrevive
 * às recargas que o próprio app faz (aplicar plano, importar backup, atualizar) e
 * morre quando o app ou a aba fecham, que é o que separa "abrir" de "recarregar".
 */
export const SPLASH_SESSION_KEY = "calistenia:app-opened";

/**
 * A abertura só aparece quando quem já usa o app o abre. A decisão roda no <head>
 * porque depende de storage, que o HTML estático não conhece, e a animação começa
 * no primeiro paint: decidir no React mostraria um pedaço dela antes de sumir.
 *
 * Estreante fica de fora mesmo em "/": de lá o boot o leva pra landing, e a
 * animação seguiria por cima dela. A marca é gravada mesmo sem mostrar, pra a
 * recarga no fim do onboarding não contar como abertura.
 */
export const SPLASH_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  SPLASH_SESSION_KEY
)};if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,"1");var p=location.pathname;if(p.indexOf(${JSON.stringify(
  LANDING_ROUTE
)})===0||p.indexOf(${JSON.stringify(ONBOARDING_ROUTE)})===0)return;if(localStorage.getItem(${JSON.stringify(
  ONBOARDING_KEY
)})||localStorage.getItem(${JSON.stringify(
  PLAN_OVERRIDE_KEY
)}))document.documentElement.setAttribute("data-splash","");}catch(e){}})();`;
