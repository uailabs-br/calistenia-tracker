import type { CSSProperties } from "react";
import { CheckIcon, LockIcon } from "@/components/ui/icons";

/** Posição (%) do traço preenchido até o degrau `index`, entre o centro do 1º e o do último. */
function fillAt(index: number, total: number): string {
  if (total < 2) return "0%";
  return `${(index / (total - 1)) * (100 - 100 / total)}%`;
}

const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/**
 * Escada de níveis de uma skill: vencidos acesos, o atual com anel, os de cima
 * trancados. `intro` acende os degraus um a um a partir de `delay`; `levelUp`
 * é a cena de nível concluído: o atual ganha o check desenhado e o seguinte
 * destranca.
 */
export function SkillLadder({
  names,
  level,
  mode = "intro",
  delay = 0,
}: {
  names: string[];
  /** Nível que o plano treina (1-indexed). */
  level: number;
  mode?: "intro" | "levelUp";
  delay?: number;
}) {
  const total = names.length;
  const current = level - 1;
  const edge = `${50 / total}%`;
  const levelUp = mode === "levelUp";

  return (
    <div
      className="relative grid"
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      role="img"
      aria-label={`Nível ${level} de ${total}: ${names[current] ?? ""}`}
    >
      <span className="absolute top-[15px] h-0.5 bg-border" style={{ left: edge, right: edge }} />
      {/* o traço anda junto com os degraus: na entrada, do 1º até o atual; na
          cena, do atual até o que destranca */}
      <span
        className="ladder-fill absolute top-[15px] h-0.5 bg-ac"
        style={
          {
            left: edge,
            width: fillAt(levelUp ? current + 1 : current, total),
            "--from": levelUp ? fillAt(current, total) : "0%",
            "--to": fillAt(levelUp ? current + 1 : current, total),
            ...at(levelUp ? 1300 : delay),
          } as CSSProperties
        }
      />
      {names.map((name, i) => {
        const closing = levelUp && i === current;
        const unlocking = levelUp && i === current + 1;
        const state = i < current || closing ? "done" : i === current || unlocking ? "current" : "locked";
        const anim = closing
          ? "anim-lit"
          : unlocking
            ? "anim-unlock"
            : !levelUp && i <= current
              ? "anim-lit"
              : "";
        const style = closing ? at(1150) : unlocking ? at(1450) : !levelUp ? at(delay + i * 90) : undefined;
        return (
          <div key={name} className="relative flex flex-col items-center gap-1.5">
            <span
              data-state={state}
              className={`ladder-node relative flex h-8 w-8 items-center justify-center rounded-full ${anim} ${
                state === "done"
                  ? "bg-ac text-on-accent"
                  : state === "current"
                    ? "ladder-ring border-2 border-ac bg-bg text-ac"
                    : "border border-border bg-bg text-muted"
              }`}
              style={style}
            >
              {state === "done" ? (
                closing ? (
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path
                      d="M5 12.5l4.5 4.5L19 7"
                      stroke="currentColor"
                      strokeWidth={2.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="check-draw-at"
                      style={at(1200)}
                    />
                  </svg>
                ) : (
                  <CheckIcon className="h-3.5 w-3.5" />
                )
              ) : state === "current" ? (
                <span className="font-mono text-xs">{i + 1}</span>
              ) : (
                <LockIcon className="h-3.5 w-3.5" />
              )}
            </span>
            <span className={`font-mono text-3xs ${i === (levelUp ? current + 1 : current) ? "text-ac" : "text-muted"}`}>
              {i + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
}
