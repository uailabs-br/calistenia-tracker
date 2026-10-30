import { CheckIcon } from "./icons";

/**
 * Meta da semana como uma órbita: uma lua por treino, acesa quando feito, e o
 * arco já percorrido. É o desenho do tema espaço; o ConsistencyCard renderiza
 * este junto com os outros e o CSS do tema escolhe qual aparece (regra 10).
 */
export function OrbitGauge({
  value,
  total,
  size = 84,
  className = "",
}: {
  value: number;
  total: number;
  size?: number;
  className?: string;
}) {
  const moons = Math.max(1, total);
  const complete = total > 0 && value >= total;
  const c = size / 2;
  const r = c - 7;
  const at = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [c + r * Math.sin(rad), c - r * Math.cos(rad)] as const;
  };
  const sweep = Math.min(1, value / moons) * 360;
  const [ex, ey] = at(Math.min(sweep, 359.99));

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true" className="overflow-visible">
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-border)" strokeWidth={1} />
        {sweep > 0 && (
          <path
            d={`M${c} ${c - r}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`}
            fill="none"
            stroke="var(--ac)"
            strokeWidth={1.5}
            opacity={0.8}
          />
        )}
        <circle cx={c} cy={c} r={r * 0.5} fill="color-mix(in oklab, var(--ac) 8%, transparent)" />
        {Array.from({ length: moons }, (_, i) => {
          const [x, y] = at((i * 360) / moons);
          return i < value ? (
            <circle key={i} cx={x} cy={y} r={5} fill="var(--ac)" className="gauge-on" />
          ) : (
            <circle key={i} cx={x} cy={y} r={4} fill="var(--color-bg)" stroke="var(--color-muted)" strokeWidth={1.2} />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {complete ? (
          <CheckIcon className="h-7 w-7 text-success" />
        ) : (
          <span className="display text-display-sm leading-none">
            {value}
            <span className="text-sm text-muted">/{total}</span>
          </span>
        )}
      </div>
    </div>
  );
}
