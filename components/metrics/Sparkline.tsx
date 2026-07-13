import type { VolumePoint } from "@/lib/db/queries/metrics";

/** Sparkline SVG própria (sem lib). Volume por sessão. */
export function Sparkline({
  points,
  accent,
}: {
  points: VolumePoint[];
  accent: string;
}) {
  const w = 300;
  const h = 60;
  const pad = 4;
  if (points.length === 0) {
    return <p className="text-xs text-muted">sem dados</p>;
  }
  if (points.length === 1) {
    return (
      <p className="tnum text-sm" style={{ color: accent }}>
        {points[0].volume}
      </p>
    );
  }
  const max = Math.max(...points.map((p) => p.volume), 1);
  const min = Math.min(...points.map((p) => p.volume));
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (p.volume - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const path = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill={accent} />
      ))}
    </svg>
  );
}
