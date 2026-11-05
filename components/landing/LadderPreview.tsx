import { CheckIcon } from "@/components/ui/icons";
import { LADDER } from "@/components/landing/content";

// Cor herdada do `--ac` da página (gelo no tema padrão), nunca hex fixo.
const ACCENT = "var(--ac)";

/**
 * Três níveis da barra fixa: o feito, o atual com a meta e o próximo. Era a
 * escada inteira com abas, e confundia: muito nome, nada dizendo o que fazer com
 * aquilo. Três linhas bastam pra mostrar a ideia (nível, meta, próximo nível), e
 * sem toque, porque aqui ninguém está marcando nível de verdade.
 */
export function LadderPreview() {
  const rows = [
    { name: LADDER.done, state: "done" },
    { name: LADDER.here, state: "here" },
    { name: LADDER.next, state: "next" },
  ] as const;

  return (
    <div className="card p-4">
      <ol className="flex flex-col">
        {rows.map((row, i) => (
          <li key={row.name} className="relative flex items-start gap-3 py-2">
            {/* linha que liga os níveis; não desenha depois do último */}
            {i < rows.length - 1 && (
              <span aria-hidden className="absolute top-5 bottom-[-0.75rem] left-2.5 w-px -translate-x-1/2 bg-border" />
            )}
            <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
              {row.state === "done" ? (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: ACCENT, color: "var(--color-on-accent)" }}
                >
                  <CheckIcon className="h-3 w-3" />
                </span>
              ) : (
                <span
                  className="h-3 w-3 rounded-full border"
                  style={{
                    borderColor: row.state === "here" ? ACCENT : "var(--color-border)",
                    background: row.state === "here" ? ACCENT : "var(--color-surface2)",
                  }}
                />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={row.state === "next" ? "text-sm text-muted" : "text-sm"}
                style={row.state === "here" ? { color: ACCENT, fontWeight: 600 } : undefined}
              >
                {row.name}
              </p>
              {row.state === "here" && (
                <>
                  <p className="mt-0.5 text-xs text-muted">
                    Meta: {LADDER.sets} séries de {LADDER.reps}, em {LADDER.sessions} treinos seguidos
                  </p>
                  <div className="mt-2 flex max-w-40 gap-1" aria-hidden>
                    {Array.from({ length: LADDER.sessions }, (_, k) => (
                      <span
                        key={k}
                        className="h-1 flex-1 rounded-full"
                        style={{ background: k === 0 ? ACCENT : "var(--color-surface2)" }}
                      />
                    ))}
                  </div>
                  <p className="mt-1 font-mono text-2xs text-muted">1 de {LADDER.sessions} treinos</p>
                </>
              )}
              {row.state === "next" && <p className="mt-0.5 text-xs text-muted">Próximo nível</p>}
            </div>

            {row.state === "here" && (
              <span className="shrink-0 font-mono text-2xs text-muted">seu nível</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
