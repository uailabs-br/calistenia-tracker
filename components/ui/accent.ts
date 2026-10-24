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
 * Define a cor do treino num container: tudo dentro dele que usa `--ac`
 * (btn-primary, text-ac, border-ac…) passa a seguir essa cor.
 */
export function accentVars(accent: string, accentBg?: string): CSSProperties {
  const vars: Record<string, string> = { "--ac": accent };
  if (accentBg) vars["--ac-bg"] = accentBg;
  return vars as CSSProperties;
}
