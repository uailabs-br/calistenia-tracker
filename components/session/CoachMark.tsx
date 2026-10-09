"use client";

import { COACH_COPY, type CoachId } from "@/lib/utils/coachMarks";

/** Dica de primeiro uso, inline no cartão (não bloqueia o toque no resto). */
export function CoachMark({
  id,
  accent,
  onDismiss,
}: {
  id: CoachId;
  accent: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="note"
      className="anim-fade-in mt-3 flex items-center gap-3 rounded-card border bg-surface px-3 py-2"
      style={{ borderColor: accent }}
    >
      <p className="flex-1 text-sm leading-snug">{COACH_COPY[id]}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="tap shrink-0 font-mono text-xs active:opacity-70"
        style={{ color: accent }}
      >
        Entendi
      </button>
    </div>
  );
}
