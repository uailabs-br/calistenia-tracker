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
        <p className="eyebrow-lg">
          {subtitle}
        </p>
      )}
      <h1 className="display-caps text-3xl">{title}</h1>
    </header>
  );
}
