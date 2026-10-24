import { TimerIcon } from "@/components/ui/icons";

/**
 * Aquecimento em destaque, visualmente distinto dos exercícios do treino:
 * fundo tingido no accent do dia (vs. surface neutro dos cards de exercício),
 * marcando que é preparação — não parte da série de trabalho. Cores: `--ac` e
 * `--ac-bg` do container.
 */
export function WarmupCard({ warmup }: { warmup: string }) {
  if (!warmup) return null;
  return (
    <section className="rounded-card border border-ac bg-ac-bg px-4 py-3">
      <p className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wide text-ac">
        <TimerIcon className="h-3.5 w-3.5" />
        Aquecimento
      </p>
      <p className="mt-1.5 text-sm leading-snug">{warmup}</p>
    </section>
  );
}
