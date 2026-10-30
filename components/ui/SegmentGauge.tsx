import { CheckIcon } from "./icons";

/** Arco de círculo em graus (0 = topo, sentido horário). */
function arcPath(c: number, r: number, from: number, to: number): string {
  const pt = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return `${(c + r * Math.sin(rad)).toFixed(2)} ${(c - r * Math.cos(rad)).toFixed(2)}`;
  };
  return `M${pt(from)}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${pt(to)}`;
}

/** Régua da semana: 7 marcas longas (os dias) com 3 curtas entre elas. */
function weekTicks(c: number, outer: number): string {
  let d = "";
  for (let i = 0; i < 28; i++) {
    const rad = (i * 360 * Math.PI) / (28 * 180);
    const inner = outer - (i % 4 === 0 ? 7 : 3);
    const s = Math.sin(rad);
    const k = Math.cos(rad);
    d += `M${(c + inner * s).toFixed(2)} ${(c - inner * k).toFixed(2)}L${(c + outer * s).toFixed(2)} ${(c - outer * k).toFixed(2)}`;
  }
  return d;
}

/**
 * Meta da semana em segmentos (um por treino), com a régua dos dias por fora.
 * É o desenho do tema futurista: o ConsistencyCard renderiza este e o
 * ProgressRing, e o CSS do tema escolhe qual aparece (regra 10).
 */
export function SegmentGauge({
  value,
  total,
  size = 104,
  className = "",
}: {
  value: number;
  total: number;
  size?: number;
  className?: string;
}) {
  const segments = Math.max(1, total);
  const complete = total > 0 && value >= total;
  const c = size / 2;
  const r = c - 16;
  const gap = segments > 1 ? 8 : 0;
  const step = 360 / segments;

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true" className="overflow-visible">
        <path d={weekTicks(c, c - 1)} stroke="var(--color-muted)" strokeWidth={1} opacity={0.6} />
        {Array.from({ length: segments }, (_, i) => {
          const on = i < value;
          return (
            <path
              key={i}
              d={
                segments === 1
                  ? arcPath(c, r, 0, 359.99)
                  : arcPath(c, r, i * step + gap / 2, (i + 1) * step - gap / 2)
              }
              fill="none"
              stroke={on ? "var(--ac)" : "var(--color-border)"}
              strokeWidth={8}
              className={on ? "gauge-on" : undefined}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {complete ? (
          <CheckIcon className="h-9 w-9 text-success" />
        ) : (
          <span className="display text-display-sm leading-none">
            {value}
            <span className="text-md text-muted">/{total}</span>
          </span>
        )}
      </div>
    </div>
  );
}
