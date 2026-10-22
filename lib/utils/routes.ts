/**
 * Rotas que rodam sem o chrome do app (nav inferior e largura do `main`):
 * a primeira visita e o onboarding. Fica em um lugar só porque AppMain e
 * BottomNav precisam concordar — quando discordam, sobra nav em cima de
 * conteúdo ou padding sem nav embaixo.
 */
export const LANDING_ROUTE = "/sobre";
export const ONBOARDING_ROUTE = "/onboarding";

export function isLanding(pathname: string): boolean {
  return pathname.startsWith(LANDING_ROUTE);
}

export function isOnboarding(pathname: string): boolean {
  return pathname.startsWith(ONBOARDING_ROUTE);
}

export function isChromeless(pathname: string): boolean {
  return isLanding(pathname) || isOnboarding(pathname);
}
