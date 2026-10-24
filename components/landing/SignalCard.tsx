import { DEFAULT_ACCENT as ACCENT } from "@/components/ui/accent";

/**
 * O "Sinal de progressão" como o app mostra no fim do treino. Copiado do visual
 * de components/session/ProgressionNudge.tsx: ver o aviso vale mais que ler a
 * explicação do critério.
 */
export function SignalCard() {
  return (
    <section
      className="rounded-card border px-4 py-4"
      style={{ borderColor: ACCENT }}
      aria-label="Exemplo de sinal de progressão"
    >
      <p className="text-sm font-semibold" style={{ color: ACCENT }}>
        Sinal de progressão
      </p>
      <ul className="mt-2 flex flex-col gap-3 text-sm">
        <li>
          <span className="font-medium">Pull-up negativo</span>
          <span className="text-muted"> · 2 sessões no alvo, execução limpa</span>
          <p className="mt-0.5 text-xs text-muted">critério do nível: Pull-up (Pronado)</p>
        </li>
      </ul>
    </section>
  );
}
