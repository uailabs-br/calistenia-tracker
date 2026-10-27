import type { CSSProperties } from "react";
import type { SkillCategory } from "@/lib/plan/skills";

/**
 * Cor de destaque fora de um treino (landing, métricas, histórico sem plano).
 * É o mesmo valor do `--ac` padrão em globals.css: os dois andam juntos.
 */
export const DEFAULT_ACCENT = "#8174e8";

/** Cor de cada categoria de skill (mapa de skills, objetivos da IA). */
export const CATEGORY_ACCENT: Record<SkillCategory, string> = {
  Puxar: "#8174e8",
  Empurrar: "#7fd1ae",
  Core: "#f2b366",
  Pernas: "#e88fb0",
};

/**
 * Cor de treino que o tema pode trocar. No padrão `--theme-ac` não existe e vale
 * o próprio hex; no tático ele é a cor única escolhida em Ajustes. É CSS e não
 * decisão em JS de propósito: o texto é o mesmo no servidor e no cliente
 * (regra 10). Idempotente, pra quem recebe uma cor já passada por aqui.
 */
export function themedAccent(accent: string): string {
  return accent.startsWith("var(") ? accent : `var(--theme-ac, ${accent})`;
}

/** O mesmo pro fundo tingido do treino (`accent_bg`). */
export function themedAccentBg(accentBg: string): string {
  return accentBg.startsWith("var(") ? accentBg : `var(--theme-ac-bg, ${accentBg})`;
}

/**
 * Define a cor do treino num container: tudo dentro dele que usa `--ac`
 * (btn-primary, text-ac, border-ac…) passa a seguir essa cor.
 */
export function accentVars(accent: string, accentBg?: string): CSSProperties {
  const vars: Record<string, string> = { "--ac": themedAccent(accent) };
  if (accentBg) vars["--ac-bg"] = themedAccentBg(accentBg);
  return vars as CSSProperties;
}
