import { LADDER } from "@/components/landing/content";

// Cor herdada do `--ac` da página, como em LadderPreview.
const ACCENT = "var(--ac)";

/**
 * Resumo do aviso de subir de nível, com o rótulo da tela do app
 * (components/session/LevelUpMoment.tsx). Continua o exemplo da seção de cima:
 * o nível atual de lá é o que acabou de ser batido aqui.
 */
export function SignalCard() {
  return (
    <section
      className="rounded-card border px-4 py-4"
      style={{ borderColor: ACCENT }}
      aria-label="Exemplo de aviso de novo nível"
    >
      <p className="text-sm font-semibold" style={{ color: ACCENT }}>
        Próximo nível · desbloqueado
      </p>
      <p className="mt-2 text-sm font-medium">
        {LADDER.here} → {LADDER.next}
      </p>
      <p className="mt-1 text-sm text-muted">
        Você bateu a meta em {LADDER.sessions} treinos seguidos, com execução limpa.
      </p>
    </section>
  );
}
