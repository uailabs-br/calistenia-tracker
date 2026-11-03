import { ArrowUpIcon, OfflineIcon, TimerIcon } from "@/components/ui/icons";

/**
 * Duas promessas de "não atrapalhar o treino" e o diferencial, a progressão, em
 * uma linha cada. Viraram tiles porque ninguém lê prosa em pé, esperando o descanso.
 */
const TILES = [
  { Icon: ArrowUpIcon, title: "Te diz quando subir de nível", line: "Mostra quantas sessões faltam pro próximo nível e avisa quando você chegar lá." },
  { Icon: TimerIcon, title: "Descanso automático", line: "O cronômetro começa quando você fecha a série." },
  { Icon: OfflineIcon, title: "Funciona sem internet", line: "Pra você conseguir treinar de qualquer lugar." },
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
