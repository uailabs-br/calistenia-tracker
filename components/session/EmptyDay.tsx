export function EmptyDay({ weekdayLabel }: { weekdayLabel: string }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border">
        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-muted">
          <path
            d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1 className="text-xl font-semibold">Dia de descanso</h1>
      <p className="mt-1 text-muted">
        Sem treino programado para {weekdayLabel}. Recupera bem.
      </p>
    </div>
  );
}
