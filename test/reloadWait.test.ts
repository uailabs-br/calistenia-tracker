import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  RELOAD_WAIT_BOOT_SCRIPT,
  RELOAD_WAIT_KEY,
  hideReloadWait,
  showReloadWait,
} from "@/lib/utils/reloadWait";

/** <html> de mentira: só o que a espera escreve. */
function fakeRoot() {
  const attrs = new Set<string>();
  const vars = new Map<string, string>();
  return {
    attrs,
    vars,
    setAttribute: (k: string) => void attrs.add(k),
    removeAttribute: (k: string) => void attrs.delete(k),
    style: {
      setProperty: (k: string, v: string) => void vars.set(k, v),
      removeProperty: (k: string) => void vars.delete(k),
    },
  };
}

let session: Map<string, string>;
let root: ReturnType<typeof fakeRoot>;
const storage = () => ({
  getItem: (k: string) => session.get(k) ?? null,
  setItem: (k: string, v: string) => void session.set(k, v),
  removeItem: (k: string) => void session.delete(k),
});

beforeEach(() => {
  session = new Map();
  root = fakeRoot();
  vi.unstubAllGlobals();
  vi.stubGlobal("document", { documentElement: root });
  vi.stubGlobal("sessionStorage", storage());
});

/** Uma carga de página nova: só o sessionStorage sobrevive. */
function reload() {
  root = fakeRoot();
  new Function("sessionStorage", "document", RELOAD_WAIT_BOOT_SCRIPT)(storage(), { documentElement: root });
}

describe("espera das recargas", () => {
  it("liga na hora, com o texto como string CSS", () => {
    showReloadWait("Trocando o plano");
    expect(root.attrs.has("data-reload-wait")).toBe(true);
    expect(root.vars.get("--reload-wait-text")).toBe('"Trocando o plano"');
  });

  it("atravessa a recarga, antes do React montar", () => {
    showReloadWait("Trocando o plano");
    reload();
    expect(root.attrs.has("data-reload-wait")).toBe(true);
    expect(root.vars.get("--reload-wait-text")).toBe('"Trocando o plano"');
  });

  it("sem espera pendente, a carga não mostra nada", () => {
    reload();
    expect(root.attrs.size).toBe(0);
  });

  // Importar um backup que não traz plano, ou falhar: não há recarga pra limpar.
  it("desligar limpa a tela e não volta na próxima carga", () => {
    showReloadWait("Restaurando backup");
    vi.stubGlobal("document", { documentElement: root });
    hideReloadWait();
    expect(root.attrs.size).toBe(0);
    expect(root.vars.size).toBe(0);
    expect(session.has(RELOAD_WAIT_KEY)).toBe(false);
    reload();
    expect(root.attrs.size).toBe(0);
  });

  it("sem storage, liga e desliga sem quebrar a ação", () => {
    const blocked = () => {
      throw new Error("storage bloqueado");
    };
    vi.stubGlobal("sessionStorage", { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(() => showReloadWait("Apagando dados")).not.toThrow();
    expect(root.attrs.has("data-reload-wait")).toBe(true);
    expect(() => hideReloadWait()).not.toThrow();
    expect(root.attrs.size).toBe(0);
  });
});
