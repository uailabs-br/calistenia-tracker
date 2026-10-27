"use client";

import { useTimeline } from "@/lib/utils/useTimeline";
import { countAt } from "@/lib/domain/timeline";

const COUNT_MS = 750;

/**
 * Número grande de Evolução. Com `animate`, conta de 0 até o valor a partir de
 * `delay` (os quatro entram em degrau); sem, já aparece pronto.
 */
export function StatTile({
  value,
  label,
  accent,
  animate = false,
  delay = 0,
}: {
  value: number;
  label: string;
  accent?: string;
  animate?: boolean;
  delay?: number;
}) {
  const t = useTimeline(delay + COUNT_MS, animate);
  return (
    <div className="card px-4 py-3">
      <p
        className="display text-3xl"
        style={accent ? { color: accent } : undefined}
        aria-label={String(value)}
      >
        {countAt(t, value, delay, COUNT_MS)}
      </p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
