"use client";

import type { HeatmapDay } from "@/lib/db/queries/metrics";
import { heatLevel, type HeatLevel } from "@/lib/domain/heatLevel";
import { shortDate } from "@/lib/utils/date";

const DAY_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Seg→Dom

/** Rótulos acessíveis: a letra sozinha ("S", "Q") é ambígua para leitor de tela. */
const DAY_NAMES = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

/** Azul-violeta do accent das métricas, em rgb pra montar as sombras com transparência. */
const RGB = "129, 116, 232";

/**
 * Treinou = gradiente com brilho (luz vindo de cima, sombra colorida embaixo);
 * não treinou = rebaixo sutil, como um slot vazio. Futuro = invisível.
 */
export function heatStyle(level: HeatLevel, isToday: boolean): React.CSSProperties {
  const ring = isToday ? `0 0 0 1.5px rgba(${RGB}, 0.9), ` : "";
  switch (level) {
    case "future":
      return { background: "transparent" };
    case "empty":
      return {
        background: "linear-gradient(180deg, #1c1c1e 0%, var(--color-surface2) 100%)",
        boxShadow: `${ring}inset 0 1px 2px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.03)`,
      };
    case "trained":
      return {
        background: `linear-gradient(145deg, #ada5f0 0%, #8174e8 55%, #6e63c5 100%)`,
        boxShadow: `${ring}inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 2px 8px -2px rgba(${RGB}, 0.3)`,
      };
  }
}

function describe(d: HeatmapDay): string {
  const n = d.count;
  return `${shortDate(d.date)} · ${n === 0 ? "não treinou" : `${n} ${n === 1 ? "treino" : "treinos"}`}`;
}

/**
 * Uma grade só: a coluna das letras e as semanas compartilham as 7 linhas, então
 * a altura de cada letra é a do quadrado ao lado. (Antes eram duas grades
 * independentes e as letras ficavam espremidas no topo, fora de alinhamento.)
 */
export function ConsistencyHeatmap({ weeks }: { weeks: HeatmapDay[][] }) {
  const trained = weeks.flat().filter((d) => d.count > 0).length;
  const todayRow = weeks[weeks.length - 1]?.findIndex((d) => d.isToday) ?? -1;

  return (
    <div
      role="img"
      aria-label={`Calendário de constância das últimas ${weeks.length} semanas: ${trained} ${
        trained === 1 ? "dia treinado" : "dias treinados"
      }`}
    >
      <div
        className="grid grid-flow-col grid-rows-7 gap-1.5"
        style={{ gridTemplateColumns: `auto repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {DAY_LETTERS.map((letter, row) => (
          <span
            key={`l${row}`}
            title={DAY_NAMES[row]}
            className={`flex items-center pr-1 font-mono text-[10px] leading-none ${
              row === todayRow ? "text-text" : "text-muted"
            }`}
          >
            {letter}
          </span>
        ))}
        {weeks.map((week, w) =>
          week.map((d) => (
            <div
              key={d.date}
              title={describe(d)}
              className="anim-fade-in aspect-square rounded-[5px]"
              style={{
                ...heatStyle(heatLevel(d), d.isToday),
                animationDelay: `${w * 25}ms`,
                animationFillMode: "backwards",
              }}
            />
          ))
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted">
        {(
          [
            ["empty", "não treinou"],
            ["trained", "treinou"],
          ] as const
        ).map(([level, label]) => (
          <span key={level} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px]" style={heatStyle(level, false)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
