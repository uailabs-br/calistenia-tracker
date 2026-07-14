"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

export function FlagChips({
  flags,
  selected,
  accent,
  onToggle,
}: {
  flags: string[];
  selected: string[];
  accent: string;
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
          <span style={{ color: accent }}>· {selected.length}</span>
        )}
      </button>
      {open && (
        <div className="mt-1 flex flex-wrap gap-2">
          {flags.map((flag) => {
            const on = selected.includes(flag);
            return (
              <button
                key={flag}
                type="button"
                onClick={() => onToggle(flag)}
                aria-pressed={on}
                className="tap rounded-full border px-3 text-sm transition-colors duration-200"
                style={
                  on
                    ? { background: accent, borderColor: accent, color: "var(--color-on-accent)" }
                    : { borderColor: "var(--color-border)", color: "var(--color-muted)" }
                }
              >
                {flag}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
