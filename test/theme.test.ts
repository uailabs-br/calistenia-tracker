import { describe, it, expect } from "vitest";
import {
  applyThemePref,
  barColor,
  DEFAULT_THEME,
  parseThemePref,
  THEME_BOOT_SCRIPT,
  THEME_KEY,
} from "@/lib/utils/theme";
import { accentVars, themedAccent, themedAccentBg } from "@/components/ui/accent";

/** <html> de mentira: só os atributos que o tema escreve. */
function fakeEl() {
  const attrs = new Map<string, string>();
  return {
    attrs,
    setAttribute: (k: string, v: string) => void attrs.set(k, v),
    removeAttribute: (k: string) => void attrs.delete(k),
  };
}

/** Roda o boot script do <head> com um localStorage e um document falsos. */
function boot(raw: string | null) {
  const el = fakeEl();
  const localStorage = { getItem: (k: string) => (k === THEME_KEY ? raw : null) };
  new Function("localStorage", "document", THEME_BOOT_SCRIPT)(localStorage, { documentElement: el });
  return el.attrs;
}

describe("preferência de tema", () => {
  it("sem nada gravado, ou gravado quebrado, é o tema padrão (o futurista gelo)", () => {
    expect(DEFAULT_THEME.style).toBe("futurista");
    expect(DEFAULT_THEME.futureTone).toBe("gelo");
    expect(parseThemePref(null)).toEqual(DEFAULT_THEME);
    expect(parseThemePref("{quebrado")).toEqual(DEFAULT_THEME);
    expect(parseThemePref('"tatico"')).toEqual(DEFAULT_THEME);
  });

  it("campo inválido cai no padrão sem levar os outros junto", () => {
    expect(parseThemePref(JSON.stringify({ style: "tatico", tone: "rosa" }))).toEqual({
      style: "tatico",
      tone: "verde",
      scanlines: true,
      futureTone: "gelo",
      cleanTone: "papel",
    });
    expect(parseThemePref(JSON.stringify({ style: "neon", tone: "gelo", scanlines: false }))).toEqual({
      style: "futurista",
      tone: "gelo",
      scanlines: false,
      futureTone: "gelo",
      cleanTone: "papel",
    });
    // tom do tático não vale no futurista, e vice-versa
    expect(parseThemePref(JSON.stringify({ style: "futurista", tone: "lilas", futureTone: "verde" }))).toEqual({
      style: "futurista",
      tone: "verde",
      scanlines: true,
      futureTone: "gelo",
      cleanTone: "papel",
    });
  });

  it("no padrão o <html> fica sem atributo de tema", () => {
    const el = fakeEl();
    el.setAttribute("data-theme", "tatico");
    el.setAttribute("data-tone", "ciano");
    el.setAttribute("data-scanlines", "");
    applyThemePref(el, { ...DEFAULT_THEME, style: "padrao" });
    expect(el.attrs.size).toBe(0);
  });

  it("quem escolheu o padrão continua nele", () => {
    expect(parseThemePref(JSON.stringify({ style: "padrao" })).style).toBe("padrao");
  });

  it("no tático marca tema, tom e scanlines", () => {
    const el = fakeEl();
    applyThemePref(el, { ...DEFAULT_THEME, style: "tatico", tone: "ambar", scanlines: true });
    expect(Object.fromEntries(el.attrs)).toEqual({
      "data-theme": "tatico",
      "data-tone": "ambar",
      "data-scanlines": "",
    });
    applyThemePref(el, { ...DEFAULT_THEME, style: "tatico", tone: "ambar", scanlines: false });
    expect(el.attrs.has("data-scanlines")).toBe(false);
  });

  it("no futurista marca tema e o tom dele, sem scanlines mesmo ligadas", () => {
    const el = fakeEl();
    el.setAttribute("data-scanlines", "");
    applyThemePref(el, { ...DEFAULT_THEME, style: "futurista", tone: "ambar", scanlines: true, futureTone: "limao" });
    expect(Object.fromEntries(el.attrs)).toEqual({
      "data-theme": "futurista",
      "data-tone": "limao",
    });
  });
});

describe("tema espaço", () => {
  it("marca só o tema: cor única, sem tom nem scanlines", () => {
    const el = fakeEl();
    el.setAttribute("data-tone", "ciano");
    el.setAttribute("data-scanlines", "");
    applyThemePref(el, { ...DEFAULT_THEME, style: "espaco", scanlines: true });
    expect(Object.fromEntries(el.attrs)).toEqual({ "data-theme": "espaco" });
  });
});

describe("tema clean", () => {
  it("marca o tema e o fundo, sem scanlines", () => {
    const el = fakeEl();
    el.setAttribute("data-scanlines", "");
    applyThemePref(el, { ...DEFAULT_THEME, style: "clean", scanlines: true, cleanTone: "grafite" });
    expect(Object.fromEntries(el.attrs)).toEqual({ "data-theme": "clean", "data-tone": "grafite" });
  });

  it("fundo de outro estilo não vale no clean", () => {
    expect(parseThemePref(JSON.stringify({ style: "clean", cleanTone: "ciano" })).cleanTone).toBe("papel");
  });
});

describe("barra do sistema", () => {
  /** Boot com um document que tem a meta theme-color, como o <head> real. */
  function bootBar(raw: string) {
    const meta = fakeEl();
    meta.setAttribute("content", "#0e0e0f");
    const localStorage = { getItem: () => raw };
    const document = { documentElement: fakeEl(), querySelector: () => meta };
    new Function("localStorage", "document", THEME_BOOT_SCRIPT)(localStorage, document);
    return meta.attrs.get("content");
  }

  it.each([
    { style: "clean" },
    { style: "clean", cleanTone: "papel" },
    { style: "clean", cleanTone: "grafite" },
    { style: "clean", cleanTone: "rosa" },
    { style: "espaco", cleanTone: "papel" },
    { style: "tatico" },
  ])("boot e Ajustes dão a mesma cor para %o", (pref) => {
    const raw = JSON.stringify(pref);
    expect(bootBar(raw)).toBe(barColor(parseThemePref(raw)));
  });

  it("só o papel clareia a barra", () => {
    expect(barColor({ ...DEFAULT_THEME, style: "clean", cleanTone: "papel" })).toBe("#f4f3ef");
    expect(barColor({ ...DEFAULT_THEME, style: "clean", cleanTone: "grafite" })).toBe("#0e0e0f");
    expect(barColor({ ...DEFAULT_THEME, cleanTone: "papel" })).toBe("#0e0e0f");
  });
});

describe("boot script do <head>", () => {
  // Ele repete parseThemePref + applyThemePref em JS puro: se divergirem, a tela
  // abre num tema e o React repinta em outro.
  const cases: (string | null)[] = [
    null,
    "{quebrado",
    JSON.stringify({ style: "padrao", tone: "ciano" }),
    JSON.stringify({ style: "neon" }),
    JSON.stringify(["tatico"]),
    '"tatico"',
    JSON.stringify({ style: "tatico" }),
    JSON.stringify({ style: "tatico", tone: "oliva", scanlines: false }),
    JSON.stringify({ style: "tatico", tone: "rosa", scanlines: true }),
    JSON.stringify({ style: "futurista" }),
    JSON.stringify({ style: "futurista", futureTone: "laranja", scanlines: true }),
    JSON.stringify({ style: "futurista", futureTone: "verde", tone: "ambar" }),
    JSON.stringify({ style: "espaco" }),
    JSON.stringify({ style: "espaco", tone: "ambar", futureTone: "lilas", scanlines: true }),
    JSON.stringify({ style: "clean" }),
    JSON.stringify({ style: "clean", cleanTone: "grafite", scanlines: true }),
    JSON.stringify({ style: "clean", cleanTone: "verde", futureTone: "lilas" }),
  ];
  it.each(cases)("dá o mesmo resultado que a versão TS para %s", (raw) => {
    const expected = fakeEl();
    applyThemePref(expected, parseThemePref(raw));
    expect(Object.fromEntries(boot(raw))).toEqual(Object.fromEntries(expected.attrs));
  });

  it("storage bloqueado não derruba a página e abre no tema padrão", () => {
    const el = fakeEl();
    const localStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(() =>
      new Function("localStorage", "document", THEME_BOOT_SCRIPT)(localStorage, { documentElement: el })
    ).not.toThrow();
    expect(Object.fromEntries(el.attrs)).toEqual({ "data-theme": "futurista", "data-tone": "gelo" });
  });
});

describe("cor do treino trocável pelo tema", () => {
  it("no padrão o hex do plano é o fallback; no tático a variável vence", () => {
    expect(themedAccent("#8174E8")).toBe("var(--theme-ac, #8174E8)");
    expect(themedAccentBg("#1D1B2B")).toBe("var(--theme-ac-bg, #1D1B2B)");
  });

  it("passar duas vezes não aninha a variável", () => {
    expect(themedAccent(themedAccent("#8174E8"))).toBe("var(--theme-ac, #8174E8)");
  });

  it("accentVars já entrega as duas cores trocáveis", () => {
    expect(accentVars("#8174E8", "#1D1B2B")).toEqual({
      "--ac": "var(--theme-ac, #8174E8)",
      "--ac-bg": "var(--theme-ac-bg, #1D1B2B)",
    });
  });
});
