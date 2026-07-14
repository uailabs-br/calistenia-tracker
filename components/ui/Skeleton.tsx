/** Placeholders de carregamento — evitam flash de texto e layout shift. */

function Bar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-surface2 ${className}`}
      aria-hidden="true"
    />
  );
}

function CardRow() {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <Bar className="h-4 w-2/5" />
      <Bar className="mt-2 h-3 w-1/4" />
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando histórico">
      {Array.from({ length: 5 }).map((_, i) => (
        <CardRow key={i} />
      ))}
    </div>
  );
}

export function MetricsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando métricas">
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border bg-surface px-4 py-3">
            <Bar className="h-7 w-1/2" />
            <Bar className="mt-2 h-3 w-3/4" />
          </div>
        ))}
      </div>
      <Bar className="mt-6 h-4 w-1/3" />
      <div className="mt-2 rounded-card border border-border bg-surface px-4 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bar key={i} className="mb-2 h-2 w-full" />
        ))}
      </div>
    </div>
  );
}
