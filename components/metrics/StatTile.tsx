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
    <div className="card px-4 py-3">
      <p className="display text-3xl" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
