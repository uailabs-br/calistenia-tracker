export function StatTile({
  value,
  label,
  accent,
}: {
  value: string | number;
  label: string;
  accent?: string;
}) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <p className="tnum text-2xl font-semibold" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
