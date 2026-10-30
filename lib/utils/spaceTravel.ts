import { activeTab } from "./routes";

/**
 * Tema espaço: cada tela tem uma profundidade no eixo z e trocar de tela é
 * viajar (a deriva: a tela afunda ou volta de leve). As abas, na ordem da nav,
 * são o perto → longe; uma subtela (Histórico, Skills, um treino antigo) fica um
 * passo atrás da aba dela; a sessão de treino é o ponto mais fundo. Decisão em docs/PLAN-tema-espaco.md.
 */
const TAB_DEPTH: Record<string, number> = { "/": 0, "/plano": 1, "/metricas": 2, "/config": 3 };
const SESSION_DEPTH = 4;
/** Cada segmento de URL abaixo da aba afunda um pouco. */
const SUB_STEP = 0.25;

/** Profundidade da rota, ou null pra tela fora do app (landing, onboarding). */
export function routeDepth(pathname: string): number | null {
  if (pathname.startsWith("/treino/")) return SESSION_DEPTH;
  const tab = activeTab(pathname);
  if (tab === null) return null;
  const base = TAB_DEPTH[tab];
  if (pathname === tab) return base;
  const segments = pathname.split("/").filter(Boolean).length;
  return base + SUB_STEP * segments;
}

export interface Travel {
  /** 1 = avança (a tela atual vem pra perto e some), -1 = volta. */
  dir: 1 | -1;
  ms: number;
}

/**
 * Duração fixa, qualquer distância. A dobra (mais longa quanto mais longe, até
 * 0,8 s, com as estrelas em risco) foi trocada pela deriva depois de vista no app.
 */
export const TRAVEL_MS = 450;

/** A viagem entre duas rotas, ou null quando não há (mesma profundidade, tela fora do app). */
export function travelBetween(from: string, to: string): Travel | null {
  const a = routeDepth(from);
  const b = routeDepth(to);
  if (a === null || b === null || a === b) return null;
  return { dir: b > a ? 1 : -1, ms: TRAVEL_MS };
}
