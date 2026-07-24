import { CheckIcon } from "./icons";

/** Anel de progresso SVG: um alvo inequívoco (done/total). */
export function ProgressRing({
  value,
  total,
  size = 56,
  stroke = 5,
}: {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  const complete = value >= total && total > 0;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const color = complete ? "var(--color-success)" : "var(--ac)";
  // Texto/ícone escalam com o anel — mesma proporção do desenho original (56px/text-sm).
  const valueFontSize = size * 0.32;
  const iconSize = size * 0.36;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {complete ? (
          <span style={{ color, width: iconSize, height: iconSize }}>
            <CheckIcon className="h-full w-full" />
          </span>
        ) : (
          <span
            className="tnum font-semibold"
            style={{ fontSize: valueFontSize, lineHeight: 1 }}
          >
            {value}
            <span
              className="text-muted"
              style={{ fontSize: valueFontSize * 0.6 }}
            >
              /{total}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
