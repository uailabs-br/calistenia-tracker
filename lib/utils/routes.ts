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

/**
 * Rotas que cada aba da nav inferior cobre. Histórico não tem aba (é consulta,
 * mora em Evolução); Progressão, Skills e as telas de montar o treino moram em
 * Treino. As URLs antigas ficam (`/config/plano` etc.): só a aba acesa muda.
 */
export const TAB_ROUTES: Record<string, string[]> = {
  "/": [],
  "/plano": ["/plano", "/progressao", "/skills", "/config/plano", "/config/persona", "/config/exercicios"],
  "/metricas": ["/metricas", "/historico"],
  "/config": ["/config"],
};

/** Prefixo por segmento: `/skills` cobre `/skills/pull_up`, mas não `/skillsx`. */
function covers(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

/**
 * Aba acesa pra uma rota, ou null quando nenhuma cobre (ex.: sessão de treino).
 * Vence o prefixo mais longo: `/config/plano` é Treino, mesmo `/config` sendo Ajustes.
 */
export function activeTab(pathname: string): string | null {
  if (pathname === "/") return "/";
  let best: { tab: string; len: number } | null = null;
  for (const [tab, routes] of Object.entries(TAB_ROUTES)) {
    for (const r of routes) {
      if (covers(pathname, r) && (!best || r.length > best.len)) best = { tab, len: r.length };
    }
  }
  return best?.tab ?? null;
}
