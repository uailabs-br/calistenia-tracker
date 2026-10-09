/**
 * Bloco de linhas de ajuste, no estilo "lista agrupada" do iOS: rótulo da seção
 * acima, card com divisórias entre as linhas e, opcionalmente, uma nota explicativa
 * abaixo (o rodapé é onde mora a explicação longa — a linha fica só com o rótulo).
 */
export function SettingsGroup({
  title,
  footer,
  className = "",
  children,
}: {
  title?: string;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`mb-6 ${className}`}>
      {title && (
        <h2 className="mb-2 px-1 font-mono text-xs uppercase tracking-wide text-muted">
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {children}
      </div>
      {footer && <p className="mt-2 px-1 text-xs leading-snug text-muted">{footer}</p>}
    </section>
  );
}
