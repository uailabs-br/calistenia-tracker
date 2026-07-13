import type { FlagIncidence } from "@/lib/db/queries/metrics";

/**
 * Uma linha por (exercício, flag). Sequência de bolinhas por sessão:
 * cheia = padrão ocorreu, vazia = não ocorreu. Lê tendência da esquerda
 * (mais antiga) para a direita (mais recente).
 */
export function FlagIncidenceRow({
  item,
  accent,
}: {
  item: FlagIncidence;
  accent: string;
}) {
  const occ = item.series.filter((p) => p.occurred).length;
  const total = item.series.length;
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{item.flag}</span>
        <span className="tnum text-xs text-muted">
          {occ}/{total}
        </span>
      </div>
      <p className="mb-2 text-xs text-muted">{item.exerciseName}</p>
      <div className="flex flex-wrap gap-1.5">
        {item.series.map((p, i) => (
          <span
            key={i}
            title={p.date}
            className="h-3 w-3 rounded-full border"
            style={
              p.occurred
                ? { background: accent, borderColor: accent }
                : { borderColor: "var(--color-border)" }
            }
          />
        ))}
      </div>
    </div>
  );
}
