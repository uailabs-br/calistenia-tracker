import { CheckIcon } from "@/components/ui/icons";

/**
 * Um trecho da escada do pull-up com a posição marcada — o segundo elemento
 * visual da página, porque "evolução em etapas" é mais fácil de ver que de ler.
 *
 * Nomes copiados de `lib/plan/progressions.json`, mas escritos à mão: a página é
 * estática e não deve carregar o catálogo só pra desenhar cinco linhas.
 */
const STEPS = [
  { name: "Dead hang + scapular pull", state: "done" },
  { name: "Row australiano", state: "done" },
  { name: "Pull-up negativo", state: "here" },
  { name: "Pull-up", state: "next" },
  { name: "Pull-up pegada larga", state: "next" },
] as const;

const ACCENT = "#8174e8";

export function LadderPreview() {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <ol className="flex flex-col">
        {STEPS.map((step, i) => (
          <li key={step.name} className="flex items-center gap-3 py-1.5">
            <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
              {/* linha que liga os degraus; não desenha depois do último */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-1/2 left-1/2 h-[calc(100%+0.75rem)] w-px -translate-x-1/2 bg-border"
                />
              )}
              {step.state === "done" ? (
                <span
                  className="relative flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: ACCENT, color: "var(--color-on-accent)" }}
                >
                  <CheckIcon className="h-3 w-3" />
                </span>
              ) : (
                <span
                  className="relative h-3 w-3 rounded-full border"
                  style={{
                    borderColor: step.state === "here" ? ACCENT : "var(--color-border)",
                    background: step.state === "here" ? ACCENT : "var(--color-surface2)",
                  }}
                />
              )}
            </span>

            <span
              className={step.state === "next" ? "text-sm text-muted" : "text-sm"}
              style={step.state === "here" ? { color: ACCENT, fontWeight: 600 } : undefined}
            >
              {step.name}
            </span>

            {step.state === "here" && (
              <span className="ml-auto shrink-0 font-mono text-[11px] text-muted">
                você está aqui
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted">
        Escada do pull-up. O app traz 16 delas, até planche e manna.
      </p>
    </div>
  );
}
