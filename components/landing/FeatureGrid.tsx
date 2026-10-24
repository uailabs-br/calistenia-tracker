import {
  ChartIcon,
  DumbbellIcon,
  HistoryIcon,
  PlusIcon,
  TrophyIcon,
} from "@/components/ui/icons";

/** O resto do app, em uma linha cada. Lista longa vira textão; aqui cabe de relance. */
const FEATURES = [
  { Icon: HistoryIcon, text: "Sua última vez naquele exercício, no próprio cartão" },
  { Icon: DumbbellIcon, text: "Demonstração e dica de execução em cada movimento" },
  { Icon: PlusIcon, text: "Tirar ou botar série e adicionar exercício no meio do treino" },
  { Icon: ChartIcon, text: "Constância, volume e recordes calculados sozinhos" },
  { Icon: TrophyIcon, text: "Seus dados ficam no aparelho e você exporta quando quiser" },
] as const;

export function FeatureGrid() {
  return (
    <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {FEATURES.map(({ Icon, text }) => (
        <li key={text} className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-ac" />
          <span className="text-sm leading-relaxed">{text}</span>
        </li>
      ))}
    </ul>
  );
}
