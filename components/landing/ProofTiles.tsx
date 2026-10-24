import { OfflineIcon, ResumeIcon, TimerIcon } from "@/components/ui/icons";

/**
 * As três promessas de "não atrapalhar o treino", em uma linha cada. Eram três
 * parágrafos — viraram tiles porque ninguém lê prosa em pé, esperando o descanso.
 */
const TILES = [
  { Icon: TimerIcon, title: "Descanso automático", line: "O cronômetro começa quando você fecha a série." },
  { Icon: OfflineIcon, title: "Sem internet", line: "Academia com sinal ruim ou barra da praça, tanto faz." },
  { Icon: ResumeIcon, title: "Volta de onde parou", line: "Fechou o app no meio do treino? Nada se perde." },
] as const;

export function ProofTiles() {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {TILES.map(({ Icon, title, line }) => (
        <li key={title} className="card p-4">
          <Icon className="h-5 w-5 text-ac" />
          <p className="mt-3 font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{line}</p>
        </li>
      ))}
    </ul>
  );
}
