"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

/** Dica do dia — colapsada por padrão para não ocupar a tela. */
export function CollapsibleTip({
  tip,
  accent,
}: {
  tip: string;
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  if (!tip) return null;

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
        por que esse treino?
      </button>
      {open && (
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
