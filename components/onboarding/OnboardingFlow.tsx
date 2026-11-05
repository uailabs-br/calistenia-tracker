"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { hasLiveSessions } from "@/lib/db/queries/sessions";
import {
  aboveTopSeed,
  earliestStepWeek,
  focusKind,
  GOALS,
  MAX_FOCUS_GROUPS,
  MAX_FOCUS_SKILLS,
  mapAnswersToSkillLevels,
  levelSkillsFor,
  pathSkillId,
  seedFits,
  suggestSeed,
  PLACE_GEAR,
  hasBar,
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
import { estimateDurationSeconds } from "@/lib/domain/estimateDuration";
import { plan } from "@/lib/plan/loader";
import { getOnboardingAnswers } from "@/lib/utils/onboarding";
import { commitOnboarding } from "@/lib/utils/onboardingCommit";
import { clearOnboardingDraft, getOnboardingDraft, saveOnboardingDraft } from "@/lib/utils/onboardingDraft";
import { showReloadWait } from "@/lib/utils/reloadWait";
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
  pathNote,
  SKILL_SHORT_LABEL,
  stepDestination,
  stepShort,
  daysFeedback,
  type Option,
} from "@/components/onboarding/questions";

type Step =
  | "nome"
  | "lugar"
  | "equipamento"
  | "parcial"
  | "nivel"
  | "limitacoes"
  | "objetivo"
  | "foco"
  | "frequencia"
  | "resumo";

// Primeira vez: o que a pessoa quer vem antes do que ela tem. O plano sai de
// equipamento + nível, então a tela parcial entra logo depois do nível e já mostra
// o treino de verdade. O nome vem no fim: é o que menos muda o que o app entrega.
const FIRST_STEPS: Step[] = [
  "objetivo",
  "lugar",
  "equipamento",
  "foco",
  "nivel",
  "parcial",
  "limitacoes",
  "frequencia",
  "nome",
  "resumo",
];

// A barra começa andada e fecha as últimas telas em passos curtos: a sensação de
// já ter começado é o que segura a pessoa até o fim (Nunes e Drèze, 2006). Fixa por
// tela, senão ela salta quando o foco é pulado.
const FIRST_PROGRESS: Partial<Record<Step, number>> = {
  objetivo: 14,
  lugar: 24,
  equipamento: 36,
  foco: 46,
  nivel: 56,
  parcial: 66,
  limitacoes: 76,
  frequencia: 86,
  nome: 94,
  resumo: 100,
};

/** Tempo pra ver a marcação antes de a tela sair; sem ele o toque parece perdido. */
const AUTO_ADVANCE_MS = 220;

// Refazer segue na ordem antiga: quem refaz vai ajustar uma resposta, e o resumo
// completo é o que interessa pra ele.
const REDO_STEPS: Step[] = [
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
      <h1 tabIndex={-1} className="display text-display leading-[1.1] outline-none">{title}</h1>
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
  value: V | null;
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
  const [dir, setDir] = useState<"fwd" | "bwd" | null>(null);
  const [view, setView] = useState<View>("step");
  // Primeira vez: nada vem marcado nas telas de toque único, e a marcação só aparece
  // depois da resposta. O estado tem valor padrão só pras contas que dependem dele.
  const [picked, setPicked] = useState({ goal: false, level: false, pain: false });
  const [showAnswers, setShowAnswers] = useState(false);
  const [restored, setRestored] = useState(false);
  const advance = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);
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
      const draft = getOnboardingDraft();
      if (draft) {
        setName(draft.name);
        setEquipment(draft.equipment);
        setLevel(draft.level);
        setDays(draft.days);
        setGoal(draft.goal);
        setFocusGroups(draft.focusGroups);
        setFocusSkills(draft.focusSkills);
        setLimitations(draft.limitations);
        setPicked(draft.picked);
        const list = focusKind(draft.goal) ? FIRST_STEPS : FIRST_STEPS.filter((s) => s !== "foco");
        setIndex(Math.max(0, list.indexOf(draft.step as Step)));
      }
      setRestored(true);
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
  const allSteps = redo ? REDO_STEPS : FIRST_STEPS;
  const steps = kind ? allSteps : allSteps.filter((s) => s !== "foco");
  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = step === "resumo" && view === "step";

  // Toda troca de tela começa do topo. O miolo é remontado (key), o que já
  // zera o scroll dele; o window.scrollTo cobre quem chegou aqui de uma página
  // rolada (ex.: "refazer onboarding", que fica em Ajustes).
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
    // A tela troca sozinha nos toques únicos: o foco acompanha pra leitor de tela e
    // teclado não ficarem presos num botão que sumiu.
    if (firstRender.current) firstRender.current = false;
    else scroller.current?.querySelector("h1")?.focus({ preventScroll: true });
  }, [index, view]);

  useEffect(() => () => {
    if (advance.current) clearTimeout(advance.current);
  }, []);

  useEffect(() => {
    if (redo || !restored || finishing) return;
    saveOnboardingDraft({ step, name, equipment: [...equipment], level, days, goal, focusGroups, focusSkills, limitations, picked });
  }, [redo, restored, finishing, step, name, equipment, level, days, goal, focusGroups, focusSkills, limitations, picked]);

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
      clearOnboardingDraft();
      showReloadWait("Preparando seu treino");
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

  const next = () => {
    if (isLast) return finish();
    setDir("fwd");
    setIndex((i) => i + 1);
  };
  const back = () => {
    if (advance.current) clearTimeout(advance.current);
    advance.current = null;
    setDir("bwd");
    setIndex((i) => Math.max(0, i - 1));
  };
  /** Toque único de primeira vez: marca, deixa ver e segue. */
  const autoNext = () => {
    if (redo || advance.current) return;
    advance.current = setTimeout(() => {
      advance.current = null;
      next();
    }, AUTO_ADVANCE_MS);
  };
  const autoStep =
    !redo && (step === "objetivo" || step === "lugar" || step === "nivel" || (step === "limitacoes" && limitations.length === 0));

  // Abre direto na sessão, sem passar pela home: o centro do botão vai na URL como
  // no card do próximo treino (a tela de carregamento abre a partir dele).
  const startFirstWorkout = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!firstWorkout) return finish();
    const r = e.currentTarget.getBoundingClientRect();
    finish(`/treino/${firstWorkout.id}?start=${Math.round(r.left + r.width / 2)},${Math.round(r.top + r.height / 2)}`);
  };
  const firstMinutes = firstWorkout ? Math.round(estimateDurationSeconds(firstWorkout) / 60) : 0;
  const firstExercises = firstWorkout?.blocks.flatMap((b) => b.exercises) ?? [];
  const pathSteps = useMemo(() => {
    const id = pathSkillId(answers);
    const start = mapAnswersToSkillLevels(answers)[id] ?? 0;
    return (getSkillById(id)?.steps ?? []).slice(start, start + 4).map((s) => s.label);
  }, [answers]);
  const pathGoal = pathSteps[pathSteps.length - 1];
  const firstName = name.trim();
  const showWeek = level !== "avancado" && goal !== "skills" && !!chosen;
  const stepWeek = earliestStepWeek(chosen?.plan.workouts.length ?? 3, days);
  const pathPhoto = pathSkillId(answers) === "handstand_hold" || !hasBar(equipment) ? "parada" : "barra";

  const summaryRows = (
    <ul className="mt-2 flex flex-col gap-0.5">
      {ladder.map((r) => (
        <SummaryRow key={r.key} label={SKILL_SHORT_LABEL[r.key]} value={stepShort(r.label)} />
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
  );

  return (
    <div
      className="flex h-dvh flex-col px-4 pt-4"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className="h-1 shrink-0 overflow-hidden rounded-full bg-surface2"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={redo ? steps.length : 100}
        aria-valuenow={redo ? index + 1 : FIRST_PROGRESS[step]}
        aria-label="Progresso do onboarding"
      >
        <div
          className="h-full rounded-full bg-ac transition-all duration-500"
          style={{ width: `${redo ? ((index + 1) / steps.length) * 100 : FIRST_PROGRESS[step]}%` }}
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
        className={`${dir === "fwd" ? "anim-step-fwd" : dir === "bwd" ? "anim-step-bwd" : "anim-fade-in"} flex min-h-0 flex-1 flex-col overflow-y-auto`}
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
            <StepHeading title="O que você tem disponível?">
              {redo ? "Seu histórico fica como está." : "Tire o que não tiver."}
            </StepHeading>
            {redo && <div role="radiogroup" aria-label="Onde você treina" className="mt-4 flex flex-wrap gap-2">
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
            </div>}
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
                    {o.hint && <span className="block text-xs text-muted">{o.hint}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {view === "step" && step === "nivel" && (
          <>
            <StepHeading title="Qual seu nível atual?" />
            <div className="mt-4">
              <Choices
                label="Seu nível"
                options={levelOptions(equipment)}
                value={redo || picked.level ? level : null}
                onChange={(v) => {
                  setLevel(v);
                  setPicked((p) => ({ ...p, level: true }));
                  autoNext();
                }}
              />
            </div>
          </>
        )}

        {view === "step" && step === "lugar" && (
          <>
            <StepHeading title="Onde você treina?" />
            <div className="mt-6">
              <Choices
                label="Onde você treina"
                options={PLACE_OPTIONS}
                value={place}
                onChange={(v) => {
                  setPlace(v);
                  setEquipment(PLACE_GEAR[v]);
                  autoNext();
                }}
              />
            </div>
          </>
        )}

        {view === "step" && step === "parcial" && firstWorkout && (
          <>
            <StepHeading title="Já tenho quase tudo.">
              Com o que você tem disponível e o seu nível, começamos pelo Treino {firstWorkout.label},{" "}
              {firstMinutes} min. Só mais três perguntas.
            </StepHeading>
            <div className="card glow mt-4 p-3.5">
              <p className="eyebrow-lg">
                Treino {firstWorkout.label} · {firstMinutes} min
              </p>
              <p className="display mt-1 text-xl leading-tight">{firstWorkout.title}</p>
              <ul className="mt-2.5 flex flex-col gap-1.5 text-sm">
                {firstExercises.map((ex) => (
                  <li key={ex.id}>{ex.name}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {view === "step" && step === "limitacoes" && (
          <>
            <StepHeading title="Alguma dor ou limitação hoje?">
              O Gravks pega leve nessa região no próximo plano de treino.
            </StepHeading>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Dor ou limitação">
              <button
                type="button"
                aria-pressed={limitations.length === 0 && (redo || picked.pain)}
                onClick={() => {
                  setLimitations([]);
                  setPicked((p) => ({ ...p, pain: true }));
                  autoNext();
                }}
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
                  aria-checked={(redo || picked.goal) && o.value === goal}
                  onClick={() => {
                    setGoal(o.value);
                    setPicked((p) => ({ ...p, goal: true }));
                    autoNext();
                  }}
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

        {view === "step" && step === "resumo" && !redo && (
          <>
            {/* Recorte sem fundo: some no tema sem criar retângulo, igual à abertura da landing. */}
            <div aria-hidden className={`onb-photo onb-photo-${pathPhoto}`}>
              <img
                src={pathPhoto === "barra" ? "/landing/hero-barra.webp" : "/landing/hero-parada-de-mao.webp"}
                alt=""
              />
            </div>
            <div className="onb-photo-text">
              <StepHeading
                title={`${firstName ? `${firstName}, seu` : "Seu"} caminho até ${pathGoal ? stepDestination(pathGoal) : "o próximo nível"}`}
              >
                {pathNote(goal)}
              </StepHeading>
              <ol className="onb-path" aria-label="Etapas até o destino">
                {pathSteps.map((label, i) => (
                  <li key={label} data-kind={i === 0 ? "now" : i === pathSteps.length - 1 ? "goal" : undefined}>
                    <span className="onb-path-name">{stepShort(label)}</span>
                    {/* A posição fica à vista: palpite alto de nível não se corrige sozinho. */}
                    {i === 0 && <span className="onb-path-now">Você começa aqui</span>}
                  </li>
                ))}
              </ol>
              {showWeek && (
                <p className="mt-3 text-sm text-muted">
                  Em {stepWeek} {stepWeek === 1 ? "semana" : "semanas"} já é possível subir de nível.
                </p>
              )}
              {acimaDasSementes && (
                <p className="mt-3 rounded-xl bg-ac-bg px-3 py-1.5 text-sm">
                  Estes planos param no intermediário — pelo que você respondeu,
                  vão te ficar fáceis.
                </p>
              )}
              <button
                type="button"
                aria-expanded={showAnswers}
                onClick={() => setShowAnswers((v) => !v)}
                className="tap mt-2 text-sm font-medium text-ac underline underline-offset-4 active:opacity-70"
              >
                {showAnswers ? "Esconder respostas" : "Revisar respostas ou trocar de plano"}
              </button>
              {showAnswers && (
                <div className="card mt-2 p-3.5">
                  {summaryRows}
                  <p className="mt-2 text-sm text-muted">{chosen?.name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setView("plano")}
                      className="tap text-sm font-medium text-ac underline underline-offset-4 active:opacity-70"
                    >
                      Trocar de plano
                    </button>
                    {acimaDasSementes && (
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
              )}
            </div>
          </>
        )}

        {view === "step" && step === "resumo" && redo && (
          <>
            <StepHeading title="Tudo certo" />

            <div className="card mt-3 p-3.5">
              <p className="eyebrow-lg">Onde você começa</p>
              {summaryRows}
            </div>

            <div className="card mt-2 p-3.5">
              <p className="font-medium">{chosen ? chosen.name : currentPlanName}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                {chosen ? chosen.summary : "Seus treinos continuam os mesmos."}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setView("plano")}
                  className="tap text-sm font-medium text-ac underline underline-offset-4 active:opacity-70"
                >
                  Trocar de plano
                </button>
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

      <div className={`mt-4 flex shrink-0 gap-3 ${isLast && !redo ? "flex-col gap-1" : ""}`}>
        {isLast && !redo && view === "step" ? (
          <>
            <button
              type="button"
              onClick={startFirstWorkout}
              disabled={finishing}
              className="btn-primary tap w-full rounded-xl py-3.5 font-semibold active:scale-[0.99] disabled:opacity-60"
            >
              {finishing
                ? "Salvando..."
                : firstWorkout
                  ? `Começar Treino ${firstWorkout.label} · ${firstMinutes} min`
                  : "Começar"}
            </button>
            <div className="flex items-center justify-between">
              {/* Voltar fica: é por aqui que se corrige um nível alto antes de gravar. */}
              <button
                type="button"
                onClick={back}
                disabled={finishing}
                className="tap p-2.5 text-sm font-medium active:opacity-70"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => finish("/")}
                disabled={finishing}
                className="tap p-2.5 text-sm font-medium active:opacity-70"
              >
                Treinar depois
              </button>
            </div>
          </>
        ) : view === "plano" ? (
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
            {!autoStep && (
              <button
                type="button"
                onClick={next}
                disabled={finishing}
                className="btn-primary tap flex-1 rounded-xl py-3.5 font-semibold active:scale-[0.99] disabled:opacity-60"
              >
                {isLast ? (finishing ? "Salvando..." : "Salvar") : "Continuar"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
