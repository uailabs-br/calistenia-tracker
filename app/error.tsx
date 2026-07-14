"use client";

/**
 * Error boundary de rota (App Router). Evita que uma exceção em runtime
 * deixe a tela presa em branco/"Carregando…". Os dados no IndexedDB
 * permanecem intactos — só a renderização falhou.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border">
        <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-muted">
          <path
            d="M12 8v5M12 16h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="mt-1 max-w-xs text-sm text-muted">
        Seus dados continuam salvos neste dispositivo. Tente recarregar a tela.
      </p>
      <button
        type="button"
        onClick={reset}
        className="tap mt-5 rounded-xl bg-text px-5 py-3 font-medium text-bg"
      >
        Tentar de novo
      </button>
    </div>
  );
}
