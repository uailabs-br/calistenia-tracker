import type { PlanDay } from "@/lib/plan/schema";

/** Cabeçalho da tela de treino: apenas título + metadados. O "por que" e o
 *  aquecimento são renderizados depois do progresso (ver SessionRunner e a
 *  tela de treino) para a sequência: título → progresso → por que → aquec. */
export function DayHeader({ day }: { day: PlanDay }) {
  return (
    <header className="pt-8 pb-4">
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 font-mono text-xs"
          style={{ background: day.accent_bg, color: day.accent }}
        >
          {day.label}
        </span>
        <span className="font-mono text-xs text-muted">{day.duration}</span>
        {day.is_practice && (
          <span className="font-mono text-xs text-muted">· prática</span>
        )}
      </div>
      <h1 className="mt-2 text-2xl font-semibold leading-tight">{day.title}</h1>
    </header>
  );
}
