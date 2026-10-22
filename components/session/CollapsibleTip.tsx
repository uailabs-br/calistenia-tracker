"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { ExerciseMedia } from "./ExerciseMedia";

/** Texto explicativo colapsado por padrão para não ocupar a tela: "por que esse
 *  treino?" no treino e "como executar" na instrução de cada exercício. */
export function CollapsibleTip({
  tip,
  accent,
  label = "por que esse treino?",
  media,
  mediaName = "",
}: {
  tip: string;
  accent: string;
  label?: string;
  /** URLs da demonstração visual; aparece junto do texto, só com o bloco aberto. */
  media?: string[] | null;
  mediaName?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!tip && !media) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="tap flex items-center gap-1 font-mono text-xs"
        style={{ color: accent }}
        aria-expanded={open}
      >
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform duration-200 ${
            open ? "" : "-rotate-90"
          }`}
        />
        {label}
      </button>
      {open && media && <ExerciseMedia urls={media} name={mediaName} accent={accent} />}
      {open && tip && (
        <p
          className="mt-2 rounded-card border-l-2 bg-surface px-3 py-2 text-sm leading-relaxed text-muted"
          style={{ borderColor: accent }}
        >
          {tip}
        </p>
      )}
    </div>
  );
}
