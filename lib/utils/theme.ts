/**
 * Estilo visual (Ajustes → Aparência). Local, fora do backup, como o nome: é
 * preferência de tela, não dado de treino.
 *
 * O tema mora em atributos do <html> (`data-theme`, `data-tone`, `data-scanlines`)
 * e o CSS faz o resto. Nenhum componente decide nada pelo tema: assim o HTML
 * estático é o mesmo em todos e a hidratação não quebra (regra 10).
 */

export const THEME_KEY = "calistenia:theme";

export const THEME_STYLES = ["padrao", "tatico", "futurista", "espaco", "clean"] as const;
export type ThemeStyle = (typeof THEME_STYLES)[number];

/** Cor única do tema tático. Os valores ficam no CSS (`--tone-*`), aqui só o id. */
export const TACTICAL_TONES = ["verde", "ciano", "ambar", "oliva", "gelo"] as const;
export type TacticalTone = (typeof TACTICAL_TONES)[number];

export const TONE_LABEL: Record<TacticalTone, string> = {
  verde: "Verde fósforo",
  ciano: "Ciano",
  ambar: "Âmbar",
  oliva: "Oliva",
  gelo: "Branco gelo",
};

/**
 * Cor única do futurista. Lista e campo próprios: cada estilo lembra a sua cor,
 * e voltar pro tático não traz um tom que ele não tem.
 */
export const FUTURE_TONES = ["ciano", "lilas", "limao", "laranja", "gelo"] as const;
export type FutureTone = (typeof FUTURE_TONES)[number];

export const FUTURE_TONE_LABEL: Record<FutureTone, string> = {
  ciano: "Ciano",
  lilas: "Lilás",
  limao: "Limão",
  laranja: "Laranja",
  gelo: "Gelo",
};

/** Fundo do clean: o único tema claro (papel) e a versão escura dele (grafite). */
export const CLEAN_TONES = ["papel", "grafite"] as const;
export type CleanTone = (typeof CLEAN_TONES)[number];

export const CLEAN_TONE_LABEL: Record<CleanTone, string> = {
  papel: "Papel",
  grafite: "Grafite",
};

/**
 * Cor da barra do sistema (meta theme-color, Android). Todo tema escuro fica
 * bem com a do padrão; só o papel, claro, precisa da sua.
 */
export const BAR_COLOR = "#0e0e0f"; // = --color-bg do padrão
export const PAPER_BAR_COLOR = "#f4f3ef"; // = --ctone-papel

export function barColor(pref: ThemePref): string {
  return pref.style === "clean" && pref.cleanTone === "papel" ? PAPER_BAR_COLOR : BAR_COLOR;
}

export interface ThemePref {
  style: ThemeStyle;
  tone: TacticalTone;
  /** Scanlines e vinheta por cima da tela (só no tático). */
  scanlines: boolean;
  futureTone: FutureTone;
  cleanTone: CleanTone;
}

/**
 * Quem nunca escolheu estilo cai no espaço (desde 31/10/2026). Quem escolheu o
 * padrão continua nele: a escolha fica gravada.
 */
export const DEFAULT_THEME: ThemePref = {
  style: "espaco",
  tone: "verde",
  scanlines: true,
  futureTone: "ciano",
  cleanTone: "papel",
};

/** Lê o que estiver gravado; qualquer coisa estranha cai no padrão campo a campo. */
export function parseThemePref(raw: string | null): ThemePref {
  let v: unknown = null;
  try {
    v = JSON.parse(raw ?? "null");
  } catch {
    /* valor corrompido → padrão */
  }
  if (!v || typeof v !== "object") return { ...DEFAULT_THEME };
  const o = v as Record<string, unknown>;
  return {
    style: THEME_STYLES.includes(o.style as ThemeStyle) ? (o.style as ThemeStyle) : DEFAULT_THEME.style,
    tone: TACTICAL_TONES.includes(o.tone as TacticalTone) ? (o.tone as TacticalTone) : DEFAULT_THEME.tone,
    scanlines: o.scanlines !== false,
    futureTone: FUTURE_TONES.includes(o.futureTone as FutureTone)
      ? (o.futureTone as FutureTone)
      : DEFAULT_THEME.futureTone,
    cleanTone: CLEAN_TONES.includes(o.cleanTone as CleanTone)
      ? (o.cleanTone as CleanTone)
      : DEFAULT_THEME.cleanTone,
  };
}

export function getThemePref(): ThemePref {
  if (typeof window === "undefined") return { ...DEFAULT_THEME };
  try {
    return parseThemePref(localStorage.getItem(THEME_KEY));
  } catch {
    return { ...DEFAULT_THEME };
  }
}

interface AttrTarget {
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

/**
 * Escreve os atributos que o CSS lê. No padrão, nenhum: o <html> fica como sempre foi.
 * O espaço tem uma cor só (gelo), então não marca tom.
 */
export function applyThemePref(el: AttrTarget, pref: ThemePref): void {
  if (pref.style === "padrao" || pref.style === "espaco") {
    if (pref.style === "espaco") el.setAttribute("data-theme", "espaco");
    else el.removeAttribute("data-theme");
    el.removeAttribute("data-tone");
    el.removeAttribute("data-scanlines");
    return;
  }
  el.setAttribute("data-theme", pref.style);
  el.setAttribute(
    "data-tone",
    pref.style === "tatico" ? pref.tone : pref.style === "clean" ? pref.cleanTone : pref.futureTone
  );
  if (pref.style === "tatico" && pref.scanlines) el.setAttribute("data-scanlines", "");
  else el.removeAttribute("data-scanlines");
}

export function setThemePref(pref: ThemePref): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(pref));
  } catch {
    /* storage cheio ou bloqueado: aplica só nesta sessão */
  }
  applyThemePref(document.documentElement, pref);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", barColor(pref));
}

/**
 * Roda no <head>, antes da primeira pintura: sem ele a tela abriria sem tema
 * e repintaria no escolhido depois do React montar. Sem nada gravado (ou com o
 * storage bloqueado) aplica o DEFAULT_THEME, como `getThemePref`. É a mesma regra de
 * `parseThemePref` + `applyThemePref`, escrita em JS puro (o teste trava as duas
 * juntas). Erro aqui não pode derrubar a página, daí o try sem nada no catch.
 * No papel ele também clareia a barra do sistema: a meta theme-color vem antes
 * dele no <head>.
 */
export const THEME_BOOT_SCRIPT = `(function(){var p=null;try{p=JSON.parse(localStorage.getItem(${JSON.stringify(
  THEME_KEY
)})||"null");}catch(e){}if(!p||typeof p!=="object")p={};try{var d=document.documentElement,s=${JSON.stringify(
  THEME_STYLES
)}.indexOf(p.style)>=0?p.style:${JSON.stringify(DEFAULT_THEME.style)};if(s==="tatico"){var t=${JSON.stringify(
  TACTICAL_TONES
)};d.setAttribute("data-theme","tatico");d.setAttribute("data-tone",t.indexOf(p.tone)>=0?p.tone:${JSON.stringify(
  DEFAULT_THEME.tone
)});if(p.scanlines!==false)d.setAttribute("data-scanlines","");}else if(s==="futurista"){var f=${JSON.stringify(
  FUTURE_TONES
)};d.setAttribute("data-theme","futurista");d.setAttribute("data-tone",f.indexOf(p.futureTone)>=0?p.futureTone:${JSON.stringify(
  DEFAULT_THEME.futureTone
)});}else if(s==="espaco"){d.setAttribute("data-theme","espaco");}else if(s==="clean"){var c=${JSON.stringify(
  CLEAN_TONES
)};d.setAttribute("data-theme","clean");d.setAttribute("data-tone",c.indexOf(p.cleanTone)>=0?p.cleanTone:${JSON.stringify(
  DEFAULT_THEME.cleanTone
)});if(p.cleanTone!=="grafite"){var m=document.querySelector&&document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",${JSON.stringify(
  PAPER_BAR_COLOR
)});}}}catch(e){}})();`;
