"use client";

import { useState } from "react";
import { ChevronDownIcon } from "./icons";

/** Card colapsável — mostra só o título por padrão, expande pro conteúdo inteiro. */
export function CollapsibleCard({
  title,
  defaultOpen = false,
  danger = false,
  className = "",
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  danger?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={`rounded-card border bg-surface ${className}`}
      style={{
        borderColor: danger
          ? "color-mix(in srgb, var(--color-danger) 25%, transparent)"
          : "var(--color-border)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="tap flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <h2
          className="font-semibold"
          style={danger ? { color: "var(--color-danger)" } : undefined}
        >
          {title}
        </h2>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
            open ? "" : "-rotate-90"
          }`}
        />
      </button>
      {open && <div className="px-4 pb-4 -mt-2">{children}</div>}
    </section>
  );
}
