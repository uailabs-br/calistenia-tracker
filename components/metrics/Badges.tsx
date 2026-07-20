"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getBadges } from "@/lib/db/queries/badges";
import { getSeenBadges, markBadgesSeen } from "@/lib/utils/badgesSeen";

/** Seção "Conquistas": selos ganhos e bloqueados, com marcador de novidade. */
export function Badges({ accent }: { accent: string }) {
  const badges = useLiveQuery(() => getBadges(), []);

  // Snapshot do "já visto" na montagem: os ganhos ainda não vistos ganham o
  // marcador nesta visita; ao final marcamos todos os ganhos como vistos.
  const [seen, setSeen] = useState<Set<string> | null>(null);
  useEffect(() => setSeen(getSeenBadges()), []);

  useEffect(() => {
    if (!badges) return;
    markBadgesSeen(badges.filter((b) => b.earned).map((b) => b.id));
  }, [badges]);

  if (!badges || badges.length === 0) return null;

  const earned = badges.filter((b) => b.earned);

  return (
    <>
      <h2 className="mb-1 mt-6 text-sm font-semibold">Conquistas</h2>
      <p className="mb-2 text-xs text-muted">
        {earned.length}/{badges.length} desbloqueadas.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {badges.map((b) => {
          const isNew = b.earned && seen !== null && !seen.has(b.id);
          return (
            <div
              key={b.id}
              className="relative rounded-card border px-3 py-2.5"
              style={
                b.earned
                  ? { borderColor: accent, background: "var(--color-surface)" }
                  : { borderColor: "var(--color-border)", background: "transparent" }
              }
            >
              {isNew && (
                <span
                  className="absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase"
                  style={{ background: accent, color: "var(--color-on-accent)" }}
                >
                  novo
                </span>
              )}
              <p
                className="text-sm font-medium"
                style={b.earned ? { color: accent } : { color: "var(--color-muted)" }}
              >
                {b.title}
              </p>
              <p className="mt-0.5 text-xs text-muted">{b.description}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
