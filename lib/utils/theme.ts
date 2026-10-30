/**
 * Estilo visual (Ajustes → Aparência). Local, fora do backup, como o nome: é
 * preferência de tela, não dado de treino.
 *
 * O tema mora em atributos do <html> (`data-theme`, `data-tone`, `data-scanlines`)
 * e o CSS faz o resto. Nenhum componente decide nada pelo tema: assim o HTML
 * estático é o mesmo em todos e a hidratação não quebra (regra 10).
 */

export const THEME_KEY = "calistenia:theme";

export const THEME_STYLES = ["padrao", "tatico", "futurista"] as const;
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

export interface ThemePref {
  style: ThemeStyle;
  tone: TacticalTone;
  /** Scanlines e vinheta por cima da tela (só no tático). */
  scanlines: boolean;
  futureTone: FutureTone;
}

export const DEFAULT_THEME: ThemePref = {
  style: "padrao",
  tone: "verde",
  scanlines: true,
  futureTone: "ciano",
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

/** Escreve os atributos que o CSS lê. No padrão, nenhum: o <html> fica como sempre foi. */
export function applyThemePref(el: AttrTarget, pref: ThemePref): void {
  if (pref.style === "padrao") {
    el.removeAttribute("data-theme");
    el.removeAttribute("data-tone");
    el.removeAttribute("data-scanlines");
    return;
  }
  el.setAttribute("data-theme", pref.style);
  el.setAttribute("data-tone", pref.style === "tatico" ? pref.tone : pref.futureTone);
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
}

/**
 * Roda no <head>, antes da primeira pintura: sem ele a tela abriria no tema
 * padrão e repintaria no escolhido depois do React montar. É a mesma regra de
 * `parseThemePref` + `applyThemePref`, escrita em JS puro (o teste trava as duas
 * juntas). Erro aqui não pode derrubar a página, daí o try sem nada no catch.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(
  THEME_KEY
)})||"null");if(!p)return;var d=document.documentElement;if(p.style==="tatico"){var t=${JSON.stringify(
  TACTICAL_TONES
)};d.setAttribute("data-theme","tatico");d.setAttribute("data-tone",t.indexOf(p.tone)>=0?p.tone:${JSON.stringify(
  DEFAULT_THEME.tone
)});if(p.scanlines!==false)d.setAttribute("data-scanlines","");}else if(p.style==="futurista"){var f=${JSON.stringify(
  FUTURE_TONES
)};d.setAttribute("data-theme","futurista");d.setAttribute("data-tone",f.indexOf(p.futureTone)>=0?p.futureTone:${JSON.stringify(
  DEFAULT_THEME.futureTone
)});}}catch(e){}})();`;
