import type { Workout } from "@/lib/plan/schema";
import { themedAccent, themedAccentBg } from "@/components/ui/accent";
import { durationLabel } from "@/lib/domain/estimateDuration";
import { useDurationFactor } from "@/lib/utils/useDurationFactor";

/** Cabeçalho da tela de treino: apenas título + metadados. O "por que" e o
 *  aquecimento são renderizados depois do progresso (ver SessionRunner e a
 *  tela de treino) para a sequência: título → progresso → por que → aquec. */
export function WorkoutHeader({ workout }: { workout: Workout }) {
  const factor = useDurationFactor();
  return (
    <header className="pt-8 pb-4">
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 font-mono text-xs"
          style={{ background: themedAccentBg(workout.accent_bg), color: themedAccent(workout.accent) }}
        >
          {workout.label}
        </span>
        <span className="font-mono text-xs text-muted">{durationLabel(workout, factor)}</span>
        {workout.is_practice && (
          <span className="font-mono text-xs text-muted">· prática</span>
        )}
      </div>
      <h1 className="display mt-2 text-3xl leading-tight">{workout.title}</h1>
    </header>
  );
}
