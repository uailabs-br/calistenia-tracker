"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

/** Correção do "como foi?" no card já registrado. Cor: `--ac` do card. */
export function FlagChips({
  flags,
  selected,
  onToggle,
}: {
  flags: string[];
  selected: string[];
  onToggle: (flag: string) => void;
}) {
  const [open, setOpen] = useState(selected.length > 0);
  if (flags.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="tap flex items-center gap-1 py-1 font-mono text-xs text-muted"
        aria-expanded={open}
      >
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform duration-200 ${
            open ? "" : "-rotate-90"
          }`}
        />
        como foi?{" "}
        {selected.length > 0 && !open && (
          <span className="text-ac">· {selected.length}</span>
        )}
      </button>
      {open && (
        <>
          <p className="mb-1.5 text-2xs text-muted">se foi a maioria das reps</p>
          <div className="flex flex-wrap gap-2">
            {flags.map((flag) => {
              const on = selected.includes(flag);
              return (
                <button
                  key={flag}
                  type="button"
                  onClick={() => onToggle(flag)}
                  aria-pressed={on}
                  className="toggle tap rounded-full px-3 text-sm text-muted transition-colors duration-200"
                >
                  {flag}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
