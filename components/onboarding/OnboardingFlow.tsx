"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db/schema";
import {
  aboveTopSeed,
  GOALS,
  mapAnswersToSkillLevels,
  levelSkillsFor,
  seedFits,
  skipSeed,
  suggestSeed,
  type Equipment,
  type Goal,
  type Limitation,
  type OnboardingAnswers,
  type Level,
  type SeedId,
} from "@/lib/domain/onboarding";
import { getSeed, seeds } from "@/lib/plan/seeds";
import { getSkillById } from "@/lib/plan/skills";
import { durationLabel } from "@/lib/domain/estimateDuration";
import { plan } from "@/lib/plan/loader";
import { applyPlan } from "@/lib/plan/importPlan";
import { getOnboardingAnswers, saveOnboarding } from "@/lib/utils/onboarding";
import { commitOnboarding } from "@/lib/utils/onboardingCommit";
import { getProfileName } from "@/lib/utils/profile";
import { usePlanReady } from "@/lib/utils/usePlanReady";
import {
  DAYS_OPTIONS,
  EQUIPMENT_OPTIONS,
  GOAL_LABEL,
  GOAL_OPTIONS,
  LIMITATION_OPTIONS,
  levelOptions,
  SKILL_SHORT_LABEL,
  daysFeedback,
  type Option,
} from "@/components/onboarding/questions";

type Step =
  | "nome"
  | "equipamento"
  | "nivel"
  | "limitacoes"
  | "objetivo"
  | "frequencia"
  | "resumo";

/** "plano" é desvio a partir do resumo, não um passo da sequência. */
type View = "step" | "plano";

function OptionButton({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className="tap w-full rounded-card border px-4 py-3 text-left active:scale-[0.99]"
      style={{
        borderColor: selected ? "var(--ac)" : "var(--color-border)",
        background: selected ? "var(--ac-bg)" : "var(--color-surface)",
      }}
    >
      <span className="block font-medium">{label}</span>
      {hint && <span className="mt-0.5 block text-sm text-muted">{hint}</span>}
    </button>
  );
}

function Choices<V extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<V>[];
  value: V;
  onChange: (v: V) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {options.map((o) => (
        <OptionButton
          key={o.value}
          selected={o.value === value}
          onClick={() => onChange(o.value)}
          label={o.label}
          hint={o.hint}
        />
      ))}
    </div>
  );
}

/** Linha "rótulo → valor" do resumo. */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </li>
  );
}

export type OnboardingMode = "first" | "redo";

/**
 * "first": quem ainda não tem rastro de uso (ver PlanBoot). "redo": quem já usa o
 * app e quer refazer as perguntas; nada é gravado até o último passo, e o plano
 * em uso é a opção padrão, porque trocar de plano é a parte destrutiva.
 *
 * Cada tela é feita pra caber sem scroll (ver AppMain, que tira o padding da nav
 * aqui): altura fixa, conteúdo no meio, botões sempre visíveis no rodapé. Se
 * ainda assim não couber — aparelho muito baixo, fonte grande — só o miolo rola.
 */
export function OnboardingFlow({ mode }: { mode: OnboardingMode }) {
  const redo = mode === "redo";
  const router = useRouter();
  const planReady = usePlanReady();
  const [index, setIndex] = useState(0);
  const [view, setView] = useState<View>("step");
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState<Equipment>("chao");
  const [level, setLevel] = useState<Level>("iniciante");
  const [days, setDays] = useState<number>(3);
  const [goal, setGoal] = useState<Goal>("forca");
  const [limitations, setLimitations] = useState<Limitation[]>([]);
  // null = padrão do modo: a sugerida (first) ou "manter meu plano" (redo)
  const [chosenSeed, setChosenSeed] = useState<SeedId | "current" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // Primeira vez: quem já tem histórico não passa por aqui, aplicar uma semente
  // trocaria o plano dele. Ao refazer, parte das respostas anteriores (lidas depois
  // do mount, porque o storage não existe no HTML estático).
  useEffect(() => {
    if (!redo) {
      // Só sessões VIVAS, igual ao decidePlanBoot: contar as apagadas faria o
      // usuário que deletou tudo pingar entre "/" e "/onboarding" pra sempre.
      db.sessions
        .toArray()
        .then((rows) => {
          if (rows.some((r) => !r.deleted_at)) router.replace("/");
        });
      return;
    }
    setName(getProfileName());
    const prev = getOnboardingAnswers();
    if (!prev) return;
    setEquipment(prev.equipment);
    setLevel(prev.level);
    setDays(prev.days_per_week);
    // Respostas gravadas por versão anterior tinham outros valores de objetivo
    if (prev.goal && GOALS.includes(prev.goal)) setGoal(prev.goal);
    if (prev.limitations) setLimitations(prev.limitations);
  }, [redo, router]);

  const steps: Step[] = useMemo(
    () => [
      "nome",
      "equipamento",
      "nivel",
      "limitacoes",
      "objetivo",
      "frequencia",
      "resumo",
    ],
    [equipment]
  );
  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = step === "resumo" && view === "step";

  // Toda troca de tela começa do topo. O miolo é remontado (key), o que já
  // zera o scroll dele; o window.scrollTo cobre quem chegou aqui de uma página
  // rolada (ex.: "refazer onboarding", que fica em Ajustes).
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [index, view]);

  const answers: OnboardingAnswers = {
    equipment,
    level,
    goal,
    limitations,
    days_per_week: days,
  };
  const suggested = suggestSeed(answers);
  const acimaDasSementes = aboveTopSeed(answers);
  const seedId: SeedId | "current" = chosenSeed ?? (redo ? "current" : suggested);

  // Resumo: a mesma conta que o commit grava, mostrada em palavras. É a única
  // chance de a pessoa corrigir um palpite alto ANTES de ele virar ajuste
  // manual — a posição exibida na skill é max(logs, manual), então o que entra
  // alto aqui não é corrigido por nenhum treino depois.
  const ladder = useMemo(() => {
    const levels = mapAnswersToSkillLevels(answers);
    return levelSkillsFor(equipment).flatMap((key) => {
      const skill = getSkillById(key);
      const label = skill?.steps[levels[key] ?? 0]?.label;
      return label ? [{ key, label }] : [];
    });
  }, [answers, equipment]);

  const chosen = seedId === "current" ? null : getSeed(seedId);
  // Texto derivado do plano em uso só depois do mount (ver usePlanReady).
  const currentPlanName = planReady ? plan.name : "";
  const firstWorkout = chosen?.plan.workouts[0];

  /**
   * A navegação final é completa (location.assign), não do router, porque `plan`
   * é avaliado no load do módulo. A gravação e sua ordem estão em commitOnboarding.
   */
  const finish = (dest?: string) => {
    setFinishing(true);
    setError(null);
    try {
      commitOnboarding({ answers, name, plan: chosen?.plan ?? null });
      window.location.assign(dest ?? (redo ? "/plano" : "/"));
    } catch {
      setFinishing(false);
      setError("Não consegui salvar neste navegador. Confira se o armazenamento do site está liberado.");
    }
  };

  /** "Pular" só existe na primeira vez; aplica a semente padrão. Ao refazer, cancela. */
  const skip = () => {
    if (redo) {
      router.push("/plano");
      return;
    }
    setFinishing(true);
    try {
      saveOnboarding(null);
      // Pular não grava respostas, mas o equipamento já respondido manda na
      // escolha da semente — ver skipSeed.
      const id = skipSeed({
        equipmentAnswered: index > steps.indexOf("equipamento"),
        equipment,
      });
      applyPlan(getSeed(id)!.plan);
      window.location.assign("/");
    } catch {
      setFinishing(false);
      setError("Não consegui salvar neste navegador. Confira se o armazenamento do site está liberado.");
    }
  };

  const next = () => (isLast ? finish() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  return (
    <div
      className="flex h-dvh flex-col px-4 pt-4"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className="h-1 shrink-0 overflow-hidden rounded-full bg-surface2"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={index + 1}
        aria-label="Progresso do onboarding"
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${((index + 1) / steps.length) * 100}%`, background: "var(--ac)" }}
        />
      </div>

      <div
        className={`flex shrink-0 items-center justify-end ${
          view === "step" && (redo || step !== "resumo") ? "h-7" : "h-2"
        }`}
      >
        {/* No resumo não existe "pular": tudo já foi respondido, e pular dali
            jogaria fora o que está na tela pra aplicar o plano padrão.
            "Cancelar" (refazer) continua fazendo sentido até o fim. */}
        {view === "step" && (redo || step !== "resumo") && (
          <button
            type="button"
            onClick={skip}
            disabled={finishing}
            className="tap px-2 text-sm text-muted active:opacity-70"
          >
            {redo ? "Cancelar" : "Pular"}
          </button>
        )}
      </div>

      <div
        ref={scroller}
        className="anim-fade-in flex min-h-0 flex-1 flex-col overflow-y-auto"
        key={view === "plano" ? "plano" : step}
      >
        {/* my-auto centra o conteúdo quando sobra espaço (telas curtas ganham ar
            no lugar do vazio no rodapé) e vira 0 quando ele preenche a altura —
            sem cortar nem exigir scroll, ao contrário de justify-center. */}
        <div className="my-auto w-full py-1">
        {view === "plano" && (
          <>
            <h1 className="display text-[2.125rem] leading-[1.1]">Escolher o plano</h1>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted">
              {redo
                ? "Trocar de plano não apaga nada do histórico, mas muda os treinos daqui pra frente."
                : "São planos escritos à mão. O sugerido combina com o que você respondeu."}
            </p>
            <div role="radiogroup" aria-label="Plano" className="mt-4 flex flex-col gap-2">
              {redo && (
                <OptionButton
                  selected={seedId === "current"}
                  onClick={() => setChosenSeed("current")}
                  label="Manter meu plano atual"
                  hint={
                    currentPlanName
                      ? `${currentPlanName}. Só atualiza seu nível nas skills.`
                      : "Só atualiza seu nível nas skills."
                  }
                />
              )}
              {seeds.map((s) => {
                const fits = seedFits(s.tags, equipment);
                return (
                  <OptionButton
                    key={s.id}
                    selected={s.id === seedId}
                    onClick={() => setChosenSeed(s.id)}
                    label={s.id === suggested ? `${s.name} · sugerido` : s.name}
                    hint={fits ? s.summary : `${s.summary} Precisa de equipamento que você não marcou.`}
                  />
                );
              })}
            </div>
          </>
        )}

        {view === "step" && step === "nome" && (
          <>
            <h1 className="display text-[2.125rem] leading-[1.1]">{redo ? "Refazer suas respostas" : "Como te chamo?"}</h1>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted">
              {redo
                ? "Seu histórico fica intacto — vamos só reconferir seu nível e seu equipamento."
                : "Aparece só na sua saudação. Pode deixar em branco."}
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              aria-label="Seu nome"
              maxLength={30}
              autoComplete="given-name"
              className="mt-5 w-full rounded-xl border border-border bg-surface2 px-3 py-3 text-base outline-none placeholder:text-muted focus:border-muted"
            />
          </>
        )}

        {view === "step" && step === "equipamento" && (
          <>
            <h1 className="display text-[2.125rem] leading-[1.1]">Onde você treina?</h1>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted">
              Montamos seu treino com o que você tem à mão.
            </p>
            <div className="mt-4">
              <Choices
                label="Onde você treina"
                options={EQUIPMENT_OPTIONS}
                value={equipment}
                onChange={setEquipment}
              />
            </div>
          </>
        )}

        {view === "step" && step === "nivel" && (
          <>
            <h1 className="display text-[2.125rem] leading-[1.1]">Qual seu nível atual?</h1>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted">
              Na dúvida, fique com o menor — seu treino sobe de nível sozinho conforme você evolui.
            </p>
            <div className="mt-4">
              <Choices
                label="Seu nível"
                options={levelOptions(equipment)}
                value={level}
                onChange={setLevel}
              />
            </div>
          </>
        )}

        {view === "step" && step === "limitacoes" && (
          <>
            <h1 className="display text-[2.125rem] leading-[1.1]">Alguma dor ou limitação hoje?</h1>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted">
              Pode marcar mais de uma. Nada sai do seu treino — serve pra você, e
              pra IA do próximo ciclo, pegar leve na região.
            </p>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Dor ou limitação">
              <button
                type="button"
                aria-pressed={limitations.length === 0}
                onClick={() => setLimitations([])}
                className="tap rounded-full border px-4 py-2.5 text-sm font-medium active:scale-[0.98]"
                style={{
                  borderColor: limitations.length === 0 ? "var(--ac)" : "var(--color-border)",
                  background: limitations.length === 0 ? "var(--ac-bg)" : "var(--color-surface)",
                }}
              >
                Nada por enquanto
              </button>
              {LIMITATION_OPTIONS.map((o) => {
                const on = limitations.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setLimitations((l) =>
                        on ? l.filter((v) => v !== o.value) : [...l, o.value]
                      )
                    }
                    className="tap rounded-full border px-4 py-2.5 text-sm font-medium active:scale-[0.98]"
                    style={{
                      borderColor: on ? "var(--ac)" : "var(--color-border)",
                      background: on ? "var(--ac-bg)" : "var(--color-surface)",
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            {limitations.length > 0 && (
              <p className="mt-4 text-sm text-muted">
                Dor que insiste é caso de fisioterapeuta, não de treino.
              </p>
            )}
          </>
        )}

        {view === "step" && step === "objetivo" && (
          <>
            <h1 className="display text-[2.125rem] leading-[1.1]">Qual seu foco principal?</h1>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted">
              Pra onde você quer evoluir primeiro. Guia a IA no próximo ciclo e não
              muda o plano de agora — skills específicas você escolhe em Treino.
            </p>
            <div
              role="radiogroup"
              aria-label="Seu foco principal"
              className="mt-6 grid grid-cols-2 gap-3"
            >
              {GOAL_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={o.value === goal}
                  onClick={() => setGoal(o.value)}
                  className="tap flex min-h-[7rem] flex-col items-center justify-center gap-1 rounded-card border px-4 py-5 text-center active:scale-[0.99]"
                  style={{
                    borderColor: o.value === goal ? "var(--ac)" : "var(--color-border)",
                    background: o.value === goal ? "var(--ac-bg)" : "var(--color-surface)",
                  }}
                >
                  <span className="block text-lg font-semibold">{o.label}</span>
                  <span className="block text-sm leading-snug text-muted">{o.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {view === "step" && step === "frequencia" && (
          <>
            <h1 className="display text-[2.125rem] leading-[1.1]">Quantos dias por semana?</h1>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted">Escolha o que cabe na sua rotina de verdade.</p>
            <div className="mt-6 flex justify-center gap-3" role="radiogroup" aria-label="Dias por semana">
              {DAYS_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={d === days}
                  onClick={() => setDays(d)}
                  className="tap h-14 w-14 rounded-2xl text-xl font-semibold tnum active:scale-95"
                  style={{
                    background: d === days ? "var(--ac)" : "var(--color-surface2)",
                    color: d === days ? "var(--color-on-accent)" : "var(--color-text)",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="mt-5 text-center text-sm text-muted">{daysFeedback(days)}</p>
          </>
        )}

        {view === "step" && step === "resumo" && (
          <>
            <h1 className="display text-[2.125rem] leading-[1.1]">{redo ? "Tudo certo" : "Seu ponto de partida"}</h1>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted">
              {redo
                ? "É assim que o app passa a te ver. Seu histórico não muda."
                : "Pronto — é daqui que você começa."}
            </p>

            <div className="mt-3 rounded-card border border-border bg-surface p-3.5">
              <p className="font-mono text-xs uppercase tracking-wide text-muted">Onde você começa</p>
              <ul className="mt-2 flex flex-col gap-0.5">
                {ladder.map((r) => (
                  <SummaryRow key={r.key} label={SKILL_SHORT_LABEL[r.key]} value={r.label} />
                ))}
                <SummaryRow label="Objetivo" value={GOAL_LABEL[goal]} />
                <SummaryRow
                  label="Cuidados"
                  value={
                    limitations.length === 0
                      ? "nenhum"
                      : limitations
                          .map((l) => LIMITATION_OPTIONS.find((o) => o.value === l)!.label)
                          .join(", ")
                  }
                />
                <SummaryRow label="Meta semanal" value={`${days} treinos`} />
              </ul>
            </div>

            <div className="mt-2 rounded-card border border-border bg-surface p-3.5">
              <p className="font-medium">{chosen ? chosen.name : currentPlanName}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                {chosen ? chosen.summary : "Seus treinos continuam os mesmos."}
              </p>
              {!redo && !acimaDasSementes && firstWorkout && (
                <p className="mt-2 font-mono text-xs text-muted">
                  Começa em {firstWorkout.label} · {firstWorkout.title} ·{" "}
                  {durationLabel(firstWorkout)}
                </p>
              )}
              {/* As sementes param no "intermediário"; quem marcou o máximo em
                  tudo está acima das três. Não existe plano avançado pra oferecer
                  (escrever um é curadoria), então o app aponta a saída que ele já
                  tem: o plano vem de fora, escrito pela IA, e entra pelo import. */}
              {acimaDasSementes && (
                <p
                  className="mt-1.5 rounded-xl px-3 py-1.5 text-sm"
                  style={{ background: "var(--ac-bg)" }}
                >
                  Estes planos param no intermediário — pelo que você respondeu,
                  vão te ficar fáceis.
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setView("plano")}
                  className="tap text-sm font-medium underline underline-offset-4 active:opacity-70"
                  style={{ color: "var(--ac)" }}
                >
                  Trocar de plano
                </button>
                {acimaDasSementes && !redo && (
                  <button
                    type="button"
                    disabled={finishing}
                    onClick={() => finish("/config/plano?modo=meu")}
                    className="tap text-sm font-medium underline underline-offset-4 active:opacity-70"
                    style={{ color: "var(--ac)" }}
                  >
                    Trazer meu plano
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 shrink-0 text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      <div className="mt-4 flex shrink-0 gap-3">
        {view === "plano" ? (
          <button
            type="button"
            onClick={() => setView("step")}
            className="tap flex-1 rounded-xl py-3.5 font-semibold active:scale-[0.99]"
            style={{ background: "var(--ac)", color: "var(--color-on-accent)" }}
          >
            Usar este plano
          </button>
        ) : (
          <>
            {index > 0 && (
              <button
                type="button"
                onClick={back}
                disabled={finishing}
                className="tap rounded-xl border border-border px-5 py-3.5 font-medium active:scale-[0.99]"
              >
                Voltar
              </button>
            )}
            <button
              type="button"
              onClick={next}
              disabled={finishing}
              className="tap flex-1 rounded-xl py-3.5 font-semibold active:scale-[0.99] disabled:opacity-60"
              style={{ background: "var(--ac)", color: "var(--color-on-accent)" }}
            >
              {isLast ? (finishing ? "Salvando..." : redo ? "Salvar" : "Começar") : "Continuar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
