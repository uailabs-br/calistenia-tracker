import { PLAN_OVERRIDE_KEY } from "@/lib/plan/loader";
import { ONBOARDING_KEY } from "@/lib/utils/onboarding";
import { LANDING_ROUTE, ONBOARDING_ROUTE } from "@/lib/utils/routes";

/**
 * Quem chega em "/" sem nenhum rastro no storage pode estar a caminho da landing,
 * mas só o boot sabe: a decisão lê as sessões no IndexedDB, que é assíncrono. Até
 * lá o conteúdo fica escondido, senão a home pisca antes do redirect. Redirecionar
 * daqui mesmo erraria com quem tem histórico e perdeu só o localStorage.
 *
 * O CSS revela sozinho depois de 4 s, caso a decisão nunca chegue.
 */
export const BOOT_COVER_SCRIPT = `(function(){try{var p=location.pathname;if(p.indexOf(${JSON.stringify(
  LANDING_ROUTE
)})===0||p.indexOf(${JSON.stringify(ONBOARDING_ROUTE)})===0)return;if(localStorage.getItem(${JSON.stringify(
  ONBOARDING_KEY
)})||localStorage.getItem(${JSON.stringify(
  PLAN_OVERRIDE_KEY
)}))return;document.documentElement.setAttribute("data-boot-pending","");}catch(e){}})();`;

export function revealAfterBoot(): void {
  document.documentElement.removeAttribute("data-boot-pending");
}
