import { DEFAULT_ACCENT as ACCENT } from "@/components/ui/accent";

/**
 * Resumo do aviso de subir de nível, com o rótulo da tela do app
 * (components/session/LevelUpMoment.tsx). Mostra o nível que vem depois porque é
 * isso que a página promete: o critério sozinho não diz o próximo passo.
 * Os dois nomes e as 2 sessões são os níveis 3 e 4 de lib/plan/progressions.json.
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
      <p className="mt-2 text-sm font-medium">Barra fixa negativa → Barra fixa</p>
      <p className="mt-1 text-sm text-muted">
        Você bateu a meta em 2 sessões seguidas, com execução limpa.
      </p>
    </section>
  );
}
