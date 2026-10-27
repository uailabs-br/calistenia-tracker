import type { SessionCampaignItem } from "@/lib/db/queries/campaign";
import { outcomeLine, sessionOutcome, shortSkillName, streakAfter } from "@/lib/domain/campaign";
import { revealStyle } from "@/lib/domain/timeline";
import { StreakBar } from "./StreakBar";

/** Atraso entre a entrada do bloco e a barra receber a sessão de hoje. */
export const CAMPAIGN_FILL_MS = 600;
/** Um objetivo enche depois do outro. */
export const CAMPAIGN_STAGGER_MS = 450;
/** Quanto a sequência fica na cor de alerta antes de zerar. */
const WARN_MS = 450;

/** Fim da animação dos blocos, contado a partir de `start`. */
export function campaignDuration(count: number): number {
  return count === 0 ? 0 : CAMPAIGN_FILL_MS + (count - 1) * CAMPAIGN_STAGGER_MS + 600;
}

/**
 * Objetivos no fim do treino: um bloco por objetivo que o treino moveu, com a
 * barra partindo da sequência de antes e recebendo a sessão de hoje. Substitui,
 * pra essas skills, o aviso "subir de nível" do ProgressionNudge.
 */
export function CampaignResult({
  results,
  t,
  start,
}: {
  results: SessionCampaignItem[];
  /** Relógio da tela de fim de treino (ms). */
  t: number;
  start: number;
}) {
  if (results.length === 0) return null;
  return (
    <section aria-label="Objetivos" style={revealStyle(t, start)}>
      <p className="eyebrow mb-2">{results.length > 1 ? "Objetivos" : "Objetivo"}</p>
      <div className="flex flex-col gap-2.5">
        {results.map(({ item, before, today }, i) => {
          const outcome = sessionOutcome(before, today, item.required);
          const after = streakAfter(before, outcome, item.required);
          const fillAt = start + CAMPAIGN_FILL_MS + i * CAMPAIGN_STAGGER_MS;
          const counted = t >= fillAt;
          const warning = outcome === "reset" && counted && t < fillAt + WARN_MS;
          const shown = !counted || warning ? Math.min(before, item.required) : after;
          return (
            <div
              key={item.skillId}
              className="glow flex flex-col gap-3 rounded-card bg-surface p-4"
              style={revealStyle(t, start + i * 150)}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-semibold">
                  {shortSkillName(item.skillName)} · nível {item.level}
                </span>
                <span className="tnum shrink-0 font-mono text-xs text-muted">
                  {counted ? after : Math.min(before, item.required)} de {item.required}
                </span>
              </div>
              <p className="-mt-2 truncate text-sm text-muted">{item.ladder[item.level - 1]}</p>
              <StreakBar total={item.required} filled={shown} warn={warning} />
              <p
                className={`text-sm leading-snug ${
                  !counted ? "text-muted" : outcome === "closed" ? "font-medium text-ac" : ""
                }`}
              >
                {counted
                  ? outcomeLine(outcome, after, item.required, today?.neutral ?? false)
                  : "Contando a sessão de hoje…"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
