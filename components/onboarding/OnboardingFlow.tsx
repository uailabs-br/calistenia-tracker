"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { hasLiveSessions } from "@/lib/db/queries/sessions";
import {
  aboveTopSeed,
  focusKind,
  GOALS,
  MAX_FOCUS_GROUPS,
  MAX_FOCUS_SKILLS,
  mapAnswersToSkillLevels,
  levelSkillsFor,
  seedFits,
  suggestSeed,
  PLACE_GEAR,
  type Equipment,
  type Place,
  type Goal,
  type Limitation,
  type OnboardingAnswers,
  type Level,
  type MuscleGroup,
  type SeedId,
} from "@/lib/domain/onboarding";
import { getSeed, listedSeeds } from "@/lib/plan/seeds";
import { getSkillById } from "@/lib/plan/skills";
import { durationLabel } from "@/lib/domain/estimateDuration";
import { plan } from "@/lib/plan/loader";
import { getOnboardingAnswers } from "@/lib/utils/onboarding";
import { commitOnboarding } from "@/lib/utils/onboardingCommit";
import { getProfileName } from "@/lib/utils/profile";
import { usePlanReady } from "@/lib/utils/usePlanReady";
import { CheckIcon } from "@/components/ui/icons";
import {
  DAYS_OPTIONS,
  GEAR_OPTIONS,
  MUSCLE_GROUP_OPTIONS,
  PLACE_OPTIONS,
  focusSkillOptions,
  focusSummary,
  gearSummary,
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
  | "foco"
  | "frequencia"
  | "resumo";

// O nome vem no fim: é a pergunta que menos muda o que o app entrega.
const STEPS: Step[] = [
  "equipamento",
  "nivel",
  "limitacoes",
  "objetivo",
  "foco",
  "frequencia",
  "nome",
  "resumo",
];

/** "plano" é desvio a partir do resumo, não um passo da sequência. */
type View = "step" | "plano";

const SAVE_ERROR =
  "Não consegui salvar neste navegador. Confira se o armazenamento do site está liberado.";

/**
 * Pergunta do passo e, quando precisa, uma linha embaixo. Só tem linha onde ela
 * evita um erro ou uma expectativa errada (docs/onboarding-copy.md).
 */
function StepHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <>
      <h1 className="display text-display leading-[1.1]">{title}</h1>
      {children && <p className="mt-2.5 text-md leading-relaxed text-muted">{children}</p>}
    </>
  );
}

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
      className="option tap w-full rounded-card px-4 py-3 text-left active:scale-[0.99]"
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

/**
 * Lista do foco: múltipla até `max`, e a primeira opção é "nada em especial" (a
 * lista vazia), já marcada, pra quem não liga passar com um toque.
 */
function FocusChips<V extends string>({
  label,
  noneLabel,
  options,
  value,
  max,
  onChange,
}: {
  label: string;
  noneLabel: string;
  options: Option<V>[];
  value: readonly V[];
  max: number;
  onChange: (v: V[]) => void;
}) {
  const chip =
    "toggle tap flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-text active:scale-[0.97] disabled:opacity-40";
  return (
    <div role="group" aria-label={label} className="mt-2.5 flex flex-wrap gap-2">
      <button
        type="button"
        aria-pressed={value.length === 0}
        onClick={() => onChange([])}
        className={chip}
      >
        {value.length === 0 && <CheckIcon className="h-3.5 w-3.5" />}
        {noneLabel}
      </button>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            disabled={!on && value.length >= max}
            onClick={() =>
              onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])
            }
            className={chip}
          >
            {on && <CheckIcon className="h-3.5 w-3.5" />}
            {o.label}
          </button>
        );
      })}
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
  const [equipment, setEquipment] = useState<Equipment>(["parede"]);
  // Lugar tocado por último: só pré-marca a lista, não é gravado.
  const [place, setPlace] = useState<Place | null>(null);
  const [level, setLevel] = useState<Level>("iniciante");
  const [days, setDays] = useState<number>(3);
  const [goal, setGoal] = useState<Goal>("forca");
  const [focusGroups, setFocusGroups] = useState<MuscleGroup[]>([]);
  const [focusSkills, setFocusSkills] = useState<string[]>([]);
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
      void hasLiveSessions().then((used) => {
        if (used) router.replace("/");
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
    if (prev.focus_groups) setFocusGroups(prev.focus_groups);
    if (prev.focus_skills) setFocusSkills(prev.focus_skills);
    if (prev.limitations) setLimitations(prev.limitations);
  }, [redo, router]);

  // O objetivo só muda na tela dele, antes do foco: o índice não salta com a troca.
  const kind = focusKind(goal);
  const steps = kind ? STEPS : STEPS.filter((s) => s !== "foco");
  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = step === "resumo" && view === "step";

  // Toda troca de tela começa do topo. O miolo é remontado (key), o que já
  // zera o scroll dele; o window.scrollTo cobre quem chegou aqui de uma página
  // rolada (ex.: "refazer onboarding", que fica em Ajustes).
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [index, view]);

  // Voltar e tirar a barra pode deixar marcada uma habilidade que não cabe mais.
  const skillOptions = useMemo(() => focusSkillOptions(equipment), [equipment]);
  const liveSkills = useMemo(
    () => focusSkills.filter((id) => skillOptions.some((o) => o.value === id)),
    [focusSkills, skillOptions]
  );

  const answers: OnboardingAnswers = useMemo(
    () => ({
      equipment,
      level,
      goal,
      // Só a lista que o objetivo pediu: as marcações da outra ficam na tela, não no dado.
      ...(kind === "grupos" && focusGroups.length > 0 ? { focus_groups: focusGroups } : {}),
      ...(kind === "habilidades" && liveSkills.length > 0 ? { focus_skills: liveSkills } : {}),
      limitations,
      days_per_week: days,
    }),
    [equipment, level, goal, kind, focusGroups, liveSkills, limitations, days]
  );
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
      setError(SAVE_ERROR);
    }
  };

  /**
   * Só quem refaz pode sair no meio ("Cancelar"). Na primeira vez não há
   * "Pular": sem equipamento respondido, o plano aplicado seria um palpite.
   */
  const cancel = () => router.push("/plano");

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
          className="h-full rounded-full bg-ac transition-all duration-500"
          style={{ width: `${((index + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div
        className={`flex shrink-0 items-center justify-end ${
          view === "step" && redo ? "h-7" : "h-2"
        }`}
      >
        {view === "step" && redo && (
          <button
            type="button"
            onClick={cancel}
            disabled={finishing}
            className="tap px-2 text-sm text-muted active:opacity-70"
          >
            Cancelar
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
            <StepHeading title="Escolher o plano">
              {redo ? "Muda só os próximos treinos. O histórico fica." : null}
            </StepHeading>
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
              {listedSeeds().map((s) => {
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
            <StepHeading title="Como te chamo?" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome (opcional)"
              aria-label="Seu nome"
              maxLength={30}
              autoComplete="given-name"
              className="field mt-5 py-3"
            />
          </>
        )}

        {view === "step" && step === "equipamento" && (
          <>
            {/* Ao refazer, esta é a primeira tela: é aqui que o medo de perder o
                histórico aparece, e a lista já vem com as respostas de antes. */}
            <StepHeading title="O que você tem pra treinar?">
              {redo ? "Seu histórico fica como está." : "Escolha o lugar e tire o que ele não tem."}
            </StepHeading>
            <div role="radiogroup" aria-label="Onde você treina" className="mt-4 flex flex-wrap gap-2">
              {PLACE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={place === o.value}
                  onClick={() => {
                    setPlace(o.value);
                    setEquipment(PLACE_GEAR[o.value]);
                  }}
                  className="option tap rounded-full px-4 py-2.5 text-sm font-medium active:scale-[0.98]"
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div role="group" aria-label="Equipamento" className="mt-3 grid grid-cols-2 gap-2">
              {GEAR_OPTIONS.map((o) => {
                const on = equipment.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() =>
                      setEquipment((e) =>
                        on ? e.filter((g) => g !== o.value) : [...e, o.value]
                      )
                    }
                    className="option tap rounded-card px-3 py-2 text-left active:scale-[0.99]"
                  >
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-xs text-muted">{o.hint}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {view === "step" && step === "nivel" && (
          <>
            <StepHeading title="Qual seu nível atual?">
              Na dúvida, escolha o menor. O treino sobe com você.
            </StepHeading>
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
            <StepHeading title="Alguma dor ou limitação hoje?">
              O treino não muda. A IA pega leve nessa região no próximo plano.
            </StepHeading>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Dor ou limitação">
              <button
                type="button"
                aria-pressed={limitations.length === 0}
                onClick={() => setLimitations([])}
                className="option tap rounded-full px-4 py-2.5 text-sm font-medium active:scale-[0.98]"
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
                    className="option tap rounded-full px-4 py-2.5 text-sm font-medium active:scale-[0.98]"
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
            <StepHeading title="Qual seu foco principal?">
              Guia o Gravks no seu próximo plano.
            </StepHeading>
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
                  className={`option tap flex flex-col items-center justify-center gap-1 rounded-card px-4 text-center active:scale-[0.99] ${
                    o.value === "definir" ? "col-span-2 min-h-[5.5rem] py-4" : "min-h-[7rem] py-5"
                  }`}
                >
                  <span className="block text-lg font-semibold">{o.label}</span>
                  <span className="block text-sm leading-snug text-muted">{o.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {view === "step" && step === "foco" && kind === "grupos" && (
          <>
            <StepHeading title="Quais grupos quer focar?">
              {/* Quem escolhe abdômen pra perder peso espera secar a barriga. */}
              {goal === "definir"
                ? "Gordura sai do corpo todo. Aqui você só diz onde quer mais treino."
                : null}
            </StepHeading>
            <p className="mt-3.5 text-sm text-muted">Escolha até {MAX_FOCUS_GROUPS}.</p>
            <FocusChips
              label="Grupos musculares"
              noneLabel="Todos"
              options={MUSCLE_GROUP_OPTIONS}
              value={focusGroups}
              max={MAX_FOCUS_GROUPS}
              onChange={setFocusGroups}
            />
          </>
        )}

        {view === "step" && step === "foco" && kind === "habilidades" && (
          <>
            <StepHeading title="Quais habilidades quer treinar?" />
            <p className="mt-3.5 text-sm text-muted">Escolha até {MAX_FOCUS_SKILLS}.</p>
            <FocusChips
              label="Habilidades"
              noneLabel="Ainda não sei"
              options={skillOptions}
              value={liveSkills}
              max={MAX_FOCUS_SKILLS}
              onChange={setFocusSkills}
            />
          </>
        )}

        {view === "step" && step === "frequencia" && (
          <>
            <StepHeading title="Quantos dias por semana?" />
            <div className="mt-6 flex justify-center gap-3" role="radiogroup" aria-label="Dias por semana">
              {DAYS_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={d === days}
                  onClick={() => setDays(d)}
                  className={`tap h-14 w-14 rounded-2xl text-xl font-semibold tnum active:scale-95 ${
                    d === days ? "bg-ac text-on-accent" : "bg-surface2 text-text"
                  }`}
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
            <StepHeading title={redo ? "Tudo certo" : "Seu ponto de partida"} />

            <div className="card mt-3 p-3.5">
              <p className="eyebrow-lg">Onde você começa</p>
              <ul className="mt-2 flex flex-col gap-0.5">
                {ladder.map((r) => (
                  <SummaryRow key={r.key} label={SKILL_SHORT_LABEL[r.key]} value={r.label} />
                ))}
                <SummaryRow label="Objetivo" value={GOAL_LABEL[goal]} />
                {kind && (
                  <SummaryRow
                    label="Foco"
                    value={focusSummary(kind, kind === "grupos" ? focusGroups : liveSkills)}
                  />
                )}
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
                <SummaryRow label="Equipamento" value={gearSummary(equipment)} />
                <SummaryRow label="Meta semanal" value={`${days} treinos`} />
              </ul>
            </div>

            <div className="card mt-2 p-3.5">
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
                <p className="mt-1.5 rounded-xl bg-ac-bg px-3 py-1.5 text-sm">
                  Estes planos param no intermediário — pelo que você respondeu,
                  vão te ficar fáceis.
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setView("plano")}
                  className="tap text-sm font-medium text-ac underline underline-offset-4 active:opacity-70"
                >
                  Trocar de plano
                </button>
                {acimaDasSementes && !redo && (
                  <button
                    type="button"
                    disabled={finishing}
                    onClick={() => finish("/config/plano?modo=meu")}
                    className="tap text-sm font-medium text-ac underline underline-offset-4 active:opacity-70"
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
        <p role="alert" className="mt-3 shrink-0 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex shrink-0 gap-3">
        {view === "plano" ? (
          <button
            type="button"
            onClick={() => setView("step")}
            className="btn-primary tap flex-1 rounded-xl py-3.5 font-semibold active:scale-[0.99]"
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
              className="btn-primary tap flex-1 rounded-xl py-3.5 font-semibold active:scale-[0.99] disabled:opacity-60"
            >
              {isLast ? (finishing ? "Salvando..." : redo ? "Salvar" : "Começar") : "Continuar"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
