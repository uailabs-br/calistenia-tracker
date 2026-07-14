"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

/**
 * Nota curta opcional por exercício. Colapsada por padrão (zero-fricção);
 * persiste ao sair do campo (blur) via onCommit.
 */
export function ExerciseNote({
  value,
  accent,
  onCommit,
}: {
  value: string;
  accent: string;
  onCommit: (value: string) => void;
}) {
  const [open, setOpen] = useState(value.trim().length > 0);
  const [draft, setDraft] = useState(value);

  // mantém o rascunho em sincronia quando o valor persistido muda (retomada)
  useEffect(() => {
    setDraft(value);
    if (value.trim().length > 0) setOpen(true);
  }, [value]);

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
        nota{" "}
        {!open && value.trim().length > 0 && (
          <span style={{ color: accent }}>· 1</span>
        )}
      </button>
      {open && (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== value) onCommit(draft);
          }}
          placeholder="Ex: punho doeu no 3º set"
          rows={2}
          aria-label="Nota do exercício"
          className="mt-1 w-full resize-none rounded-xl border border-border bg-surface2 px-3 py-2 text-base outline-none placeholder:text-muted focus:border-muted"
        />
      )}
    </div>
  );
}
