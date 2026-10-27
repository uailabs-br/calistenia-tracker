"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import type { Workout } from "@/lib/plan/schema";
import { useModalA11y } from "@/lib/utils/useModalA11y";
import { useTimeline } from "@/lib/utils/useTimeline";
import { getAiGoals } from "@/lib/utils/aiPersona";
import { countAt, easeOutCubic, progressAt, revealStyle as reveal } from "@/lib/domain/timeline";
import { sessionOutcome } from "@/lib/domain/campaign";
import { Portal } from "@/components/ui/Portal";
import { CheckIcon, TrophyIcon } from "@/components/ui/icons";
import { accentVars, themedAccent } from "@/components/ui/accent";
import type { PRResult } from "@/lib/db/queries/pr";
import { getSessionCampaign, type SessionCampaignItem } from "@/lib/db/queries/campaign";
import { ProgressionNudge } from "./ProgressionNudge";
import { CampaignResult, campaignDuration } from "./CampaignResult";
import { LevelUpMoment } from "./LevelUpMoment";

export interface SessionPR {
  id: string;
  name: string;
  pr: PRResult;
}

// Linha do tempo da entrada (ms desde a abertura). Os números sobem rápido e
// assentam; recorde e progressão entram depois, nessa ordem.
const T = {
  check: 0,
  title: 120,
  hero: 300,
  delta: 1250,
  tiles: [450, 550, 650],
  extra: 1450,
  pr: 1350,
  prCount: 1500,
};
const PR_COUNT_MS = 450;

interface SummaryProps {
  workout: Workout;
  /** Sessão que acabou de fechar: a campanha mostra o que ela fez com cada objetivo. */
  sessionId: string;
  prs: SessionPR[];
  /** Exercícios registrados (não pulados) nesta sessão. */
  exercisesDone: number;
  exercisesTotal: number;
  /** Soma das reps efetivas dos exercícios em unidade "reps" (ignora holds/tentativas). */
  repsVolume: number;
  /** Reps da última vez que este treino foi feito; null sem comparação. */
  prevRepsVolume: number | null;
  /** Séries planejadas feitas (as extras vêm à parte). */
  setsCount: number;
  /** Séries feitas além do plano nesta sessão. */
  extraSets?: number;
  minutes: number;
  onClose: () => void;
}

/**
 * Tela de fim de treino, em tela cheia: os números do treino contando, recordes
 * da sessão, os objetivos andando e, por último, os sinais de progressão. Sem
 * frase motivacional: o número já diz como foi. Fecha só pelo botão (ou Esc) e
 * volta pra home; se um nível fechou, o botão vira "Continuar" e abre a cena.
 */
export function SessionSummary(props: SummaryProps) {
  // Só monta depois de finalizar: ler o localStorage aqui não afeta a hidratação.
  const [goals] = useState(getAiGoals);
  const campaign = useLiveQuery(
    () => getSessionCampaign(props.workout, goals, props.sessionId),
    [props.workout, goals, props.sessionId]
  );
  // A linha do tempo depende de quantos objetivos entram: espera a consulta (ms)
  // em vez de reiniciar a animação quando ela chega.
  if (campaign === undefined) {
    return (
      <Portal>
        <div className="fixed inset-0 z-40 bg-bg" />
      </Portal>
    );
  }
  return <SummaryScreen {...props} campaign={campaign} />;
}

function SummaryScreen({
  workout,
  prs,
  exercisesDone,
  exercisesTotal,
  repsVolume,
  prevRepsVolume,
  setsCount,
  extraSets = 0,
  minutes,
  onClose,
  campaign,
}: SummaryProps & { campaign: SessionCampaignItem[] }) {
  const router = useRouter();
  const ref = useModalA11y<HTMLDivElement>(onClose);
  const titleId = useId();
  const accent = themedAccent(workout.accent);

  // Sem recorde, os objetivos sobem pro lugar dele em vez de esperar à toa.
  const campaignAt = prs.length > 0 ? T.prCount + (prs.length - 1) * 150 + 500 : T.pr + 100;
  const signalsAt = campaignAt + campaignDuration(campaign.length);
  const buttonAt = signalsAt + 400;
  const closed = campaign
    .filter((c) => sessionOutcome(c.before, c.today, c.item.required) === "closed")
    .map((c) => c.item);
  // Cena de nível concluído aberta (índice em `closed`), uma depois da outra.
  const [scene, setScene] = useState<number | null>(null);
  const t = useTimeline(buttonAt + 400);

  const pop = easeOutCubic(progressAt(t, T.check, 320));

  // Treino só de isometria/tentativas não tem reps: o tempo vira o número grande.
  const hasReps = repsVolume > 0;
  const minutesLabel = minutes === 1 ? "minuto" : "minutos";
  const hero = hasReps
    ? { value: repsVolume, label: "reps no treino" }
    : { value: minutes, label: `${minutesLabel} de treino` };
  const tiles = [
    ...(hasReps ? [{ key: "min", value: minutes, total: null, label: minutesLabel }] : []),
    { key: "ex", value: exercisesDone, total: exercisesTotal, label: "exercícios" },
    { key: "sets", value: setsCount, total: null, label: setsCount === 1 ? "série" : "séries" },
  ];

  const delta = hasReps && prevRepsVolume !== null ? repsVolume - prevRepsVolume : null;
  const deltaText =
    delta === null
      ? null
      : delta > 0
        ? `+${delta} vs. último ${workout.label}`
        : delta < 0
          ? `−${-delta} vs. último ${workout.label}`
          : `igual ao último ${workout.label}`;

  return (
    <Portal>
      <div
        className="anim-fade-in fixed inset-0 z-40 overflow-y-auto bg-bg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          ref={ref}
          tabIndex={-1}
          className="mx-auto flex max-w-md flex-col gap-[22px] px-4 pb-8 outline-none"
          style={{ ...accentVars(accent), paddingTop: "calc(env(safe-area-inset-top) + 2rem)" }}
        >
          <header>
            <p
              className="eyebrow-lg"
              style={reveal(t, T.title)}
            >
              Treino {workout.label} · {workout.title}
            </p>
            <div className="mt-1.5 flex items-center gap-2.5">
              <span
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-ac text-on-accent"
                style={{
                  opacity: Math.min(1, pop * 2),
                  transform: `scale(${pop < 1 ? 0.4 + pop * 0.75 : 1})`,
                }}
                aria-hidden="true"
              >
                <CheckIcon className="h-5 w-5" />
              </span>
              <h2
                id={titleId}
                className="display-caps text-display leading-none"
                style={reveal(t, T.title)}
              >
                Treino concluído
              </h2>
            </div>
          </header>

          <section aria-label="Números do treino" className="flex flex-col gap-2.5">
            <div className="card flex items-end justify-between gap-3 p-4">
              <div>
                <p
                  className="display text-display-hero leading-[0.9] text-ac"
                  aria-label={`${hero.value} ${hero.label}`}
                >
                  {countAt(t, hero.value, T.hero, 950)}
                </p>
                <p className="mt-1.5 font-mono text-xs text-muted">{hero.label}</p>
              </div>
              {deltaText && (
                <span
                  className="tnum mb-1 shrink-0 rounded-full px-2.5 py-1 text-xs"
                  style={{
                    ...reveal(t, T.delta),
                    ...(delta! > 0
                      ? {
                          background: "color-mix(in oklab, var(--color-success) 14%, transparent)",
                          color: "var(--color-success)",
                        }
                      : { border: "1px solid var(--color-border)", color: "var(--color-muted)" }),
                  }}
                >
                  {deltaText}
                </span>
              )}
            </div>

            <div
              className={`grid gap-2.5 ${tiles.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
            >
              {tiles.map((tile, i) => (
                <div key={tile.key} className="card p-3">
                  <p
                    className="display text-display leading-none"
                    aria-label={`${tile.value} ${tile.label}`}
                  >
                    {countAt(t, tile.value, T.tiles[i] ?? T.tiles[0], 800)}
                    {tile.total !== null && (
                      <span className="text-xl text-muted">/{tile.total}</span>
                    )}
                  </p>
                  <p className="mt-1 font-mono text-2xs text-muted">
                    {tile.label}
                    {tile.key === "sets" && extraSets > 0 && (
                      <span className="text-ac" style={{ opacity: progressAt(t, T.extra, 300) }}>
                        {" "}+{extraSets} extra
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {prs.length > 0 && (
            <section aria-label="Recordes" style={reveal(t, T.pr)}>
              <p className="eyebrow mb-2">
                {prs.length === 1 ? "Recorde" : "Recordes"}
              </p>
              <ul
                className="rounded-card border"
                style={{
                  borderColor: "color-mix(in oklab, var(--color-gold) 25%, var(--color-border))",
                  background: "color-mix(in oklab, var(--color-gold) 5%, var(--color-surface))",
                }}
              >
                {prs.map((p, i) => {
                  const start = T.prCount + i * 150;
                  const done = t >= start + PR_COUNT_MS;
                  // tranco curto quando o número chega no recorde
                  const bump = done && t < start + PR_COUNT_MS + 250;
                  const u = p.pr.unit === "seconds" ? "s" : "";
                  return (
                    <li
                      key={p.id}
                      className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}
                    >
                      <span className="shrink-0 text-gold" aria-hidden="true">
                        <TrophyIcon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      <span
                        className="tnum shrink-0 text-sm text-muted"
                        aria-label={`de ${p.pr.previous} para ${p.pr.value}${p.pr.unit === "seconds" ? " segundos" : " reps"}`}
                      >
                        {p.pr.previous}
                        {u} →{" "}
                        <span
                          className="display inline-block text-2xl text-gold"
                          style={{
                            transform: `scale(${bump ? 1.25 : 1})`,
                            transition: "transform 0.18s cubic-bezier(0.3, 1.6, 0.5, 1)",
                          }}
                        >
                          {countAt(t, p.pr.value, start, PR_COUNT_MS, p.pr.previous)}
                          {u}
                        </span>
                        {u ? "" : " reps"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <CampaignResult results={campaign} t={t} start={campaignAt} />

          <ProgressionNudge
            workout={workout}
            accent={accent}
            excludeSkills={campaign.map((c) => c.item.skillId)}
            style={reveal(t, signalsAt)}
          />

          {/* entrada no invólucro: transform inline no botão mataria o :active */}
          <div style={reveal(t, buttonAt)}>
            <button
              type="button"
              onClick={closed.length > 0 ? () => setScene(0) : onClose}
              className="btn-primary tap w-full rounded-xl py-3.5 font-medium"
            >
              {closed.length > 0 ? "Continuar" : "Voltar pro início"}
            </button>
          </div>
        </div>
      </div>

      {scene !== null && closed[scene] && (
        <LevelUpMoment
          key={scene}
          item={closed[scene]}
          accent={accent}
          index={scene}
          total={closed.length}
          onAdjust={() => router.push("/config/plano?modo=novo")}
          onLater={() => (scene + 1 < closed.length ? setScene(scene + 1) : onClose())}
        />
      )}
    </Portal>
  );
}
