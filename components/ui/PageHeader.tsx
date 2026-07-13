export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="pt-8 pb-5">
      {subtitle && (
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          {subtitle}
        </p>
      )}
      <h1 className="text-2xl font-semibold">{title}</h1>
    </header>
  );
}
