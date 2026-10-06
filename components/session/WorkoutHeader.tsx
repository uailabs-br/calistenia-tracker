import type { Workout } from "@/lib/plan/schema";
import { durationLabel } from "@/lib/domain/estimateDuration";

/** Cabeçalho da tela de treino: apenas título + metadados. O "por que" e o
 *  aquecimento são renderizados depois do progresso (ver SessionRunner e a
 *  tela de treino) para a sequência: título → progresso → por que → aquec. */
export function WorkoutHeader({ workout }: { workout: Workout }) {
  return (
    <header className="pt-8 pb-4">
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 font-mono text-xs"
          style={{ background: workout.accent_bg, color: workout.accent }}
        >
          {workout.label}
        </span>
        <span className="font-mono text-xs text-muted">{durationLabel(workout)}</span>
        {workout.is_practice && (
          <span className="font-mono text-xs text-muted">· prática</span>
        )}
      </div>
      <h1 className="mt-2 text-2xl font-semibold leading-tight">{workout.title}</h1>
    </header>
  );
}
