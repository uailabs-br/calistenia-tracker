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
    <div className="card px-4 py-3">
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
          <div key={i} className="card px-4 py-3">
            <Bar className="h-7 w-1/2" />
            <Bar className="mt-2 h-3 w-3/4" />
          </div>
        ))}
      </div>
      <Bar className="mt-6 h-4 w-1/3" />
      <div className="card mt-2 px-4 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bar key={i} className="mb-2 h-2 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Início: constância, conquistas e o próximo treino, na posição em que entram. */
export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando o início">
      <div className="card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Bar className="h-4 w-1/4" />
            <Bar className="mt-2 h-3 w-2/5" />
          </div>
          <Bar className="h-15 w-15 rounded-full" />
        </div>
        <div className="mt-3 flex justify-between">
          {Array.from({ length: 7 }).map((_, i) => (
            <Bar key={i} className="h-7 w-7 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Bar className="h-28 rounded-card" />
        <Bar className="h-28 rounded-card" />
      </div>
      <div className="card p-5">
        <Bar className="h-4 w-1/3" />
        <Bar className="mt-3 h-7 w-1/2" />
        <Bar className="mt-4 h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Tela de treino antes de saber se há sessão em andamento (prévia ou runner). */
export function WorkoutSkeleton() {
  return (
    <div className="px-4 pt-6" aria-busy="true" aria-label="Carregando o treino">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Bar key={i} className="h-16 w-28 shrink-0 rounded-card" />
        ))}
      </div>
      <div className="pb-4 pt-8">
        <Bar className="h-4 w-1/4" />
        <Bar className="mt-3 h-8 w-2/3" />
      </div>
      <Bar className="h-12 w-full rounded-xl" />
      <div className="mt-5 flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardRow key={i} />
        ))}
      </div>
    </div>
  );
}
