/**
 * Sessões seguidas no critério do nível, em segmentos: um por sessão exigida.
 * `sm` é a versão de linha (home, "também avança hoje"); `lg`, a do fim de
 * treino, onde o segmento enche com transição. `warn` pinta os cheios na cor de
 * alerta: é o instante antes de a sequência zerar.
 */
export function StreakBar({
  total,
  filled,
  size = "lg",
  warn = false,
}: {
  total: number;
  filled: number;
  size?: "sm" | "lg";
  warn?: boolean;
}) {
  const segments = Array.from({ length: total }, (_, i) => i < filled);
  if (size === "sm") {
    return (
      <span className="flex shrink-0 gap-[3px]" aria-hidden="true">
        {segments.map((on, i) => (
          <span key={i} className={`h-1.5 w-3.5 rounded-full ${on ? "bg-ac" : "bg-ac/20"}`} />
        ))}
      </span>
    );
  }
  return (
    <span
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {segments.map((on, i) => (
        <span key={i} className="relative h-2.5 overflow-hidden rounded-full bg-surface2">
          <span
            className={`absolute inset-0 origin-left transition-transform duration-500 ${warn ? "bg-warn" : "bg-ac"}`}
            style={{ transform: `scaleX(${on ? 1 : 0})` }}
          />
        </span>
      ))}
    </span>
  );
}
