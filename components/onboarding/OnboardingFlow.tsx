"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db/schema";
import {
  questionsFor,
  seedFits,
  suggestSeed,
  type Equipment,
  type OnboardingAnswers,
  type QuestionKey,
  type SeedId,
} from "@/lib/domain/onboarding";
import { DEFAULT_SEED_ID, getSeed, seeds } from "@/lib/plan/seeds";
import { plan } from "@/lib/plan/loader";
import { applyPlan } from "@/lib/plan/importPlan";
import { getOnboardingAnswers, saveOnboarding } from "@/lib/utils/onboarding";
import { commitOnboarding } from "@/lib/utils/onboardingCommit";
import { getProfileName } from "@/lib/utils/profile";
import {
  CAPACITY_DEFAULTS,
  DAYS_OPTIONS,
  EQUIPMENT_OPTIONS,
  QUESTIONS,
  daysFeedback,
  type Option,
} from "@/components/onboarding/questions";

type Step = "nome" | "equipamento" | QuestionKey | "frequencia" | "plano";

type Capacity = {
  [K in QuestionKey]: NonNullable<OnboardingAnswers[K]>;
};

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
      className="tap w-full rounded-card border p-4 text-left active:scale-[0.99]"
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
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-3">
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

export type OnboardingMode = "first" | "redo";

/**
 * "first": quem ainda não tem rastro de uso (ver PlanBoot). "redo": quem já usa o
 * app e quer refazer as perguntas; nada é gravado até o último passo, e o plano
 * em uso é a opção padrão, porque trocar de plano é a parte destrutiva.
 */
export function OnboardingFlow({ mode }: { mode: OnboardingMode }) {
  const redo = mode === "redo";
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState<Equipment>("chao");
  const [capacity, setCapacity] = useState<Capacity>({ ...CAPACITY_DEFAULTS });
  const [days, setDays] = useState<number>(3);
  // null = padrão do modo: a sugerida (first) ou "manter meu plano" (redo)
  const [chosenSeed, setChosenSeed] = useState<SeedId | "current" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

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
    setCapacity((c) => ({
      push_up: prev.push_up,
      pull_up: prev.pull_up ?? c.pull_up,
      handstand_hold: prev.handstand_hold,
      dips: prev.dips ?? c.dips,
    }));
    setDays(prev.days_per_week);
  }, [redo, router]);

  const steps: Step[] = useMemo(
    () => ["nome", "equipamento", ...questionsFor(equipment), "frequencia", "plano"],
    [equipment]
  );
  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = step === "plano";

  const answers: OnboardingAnswers = {
    equipment,
    push_up: capacity.push_up,
    pull_up: capacity.pull_up,
    handstand_hold: capacity.handstand_hold,
    dips: capacity.dips,
    days_per_week: days,
  };
  const suggested = suggestSeed(answers);
  const seedId: SeedId | "current" = chosenSeed ?? (redo ? "current" : suggested);

  /**
   * A navegação final é completa (location.assign), não do router, porque `plan`
   * é avaliado no load do módulo. A gravação e sua ordem estão em commitOnboarding.
   */
  const finish = () => {
    setFinishing(true);
    setError(null);
    try {
      commitOnboarding({
        answers,
        name,
        plan: seedId === "current" ? null : getSeed(seedId)!.plan,
      });
      window.location.assign(redo ? "/config" : "/");
    } catch {
      setFinishing(false);
      setError("Não consegui salvar neste navegador. Confira se o armazenamento do site está liberado.");
    }
  };

  /** "Pular" só existe na primeira vez; aplica a semente padrão. Ao refazer, cancela. */
  const skip = () => {
    if (redo) {
      router.push("/config");
      return;
    }
    setFinishing(true);
    try {
      saveOnboarding(null);
      applyPlan(getSeed(DEFAULT_SEED_ID)!.plan);
      window.location.assign("/");
    } catch {
      setFinishing(false);
      setError("Não consegui salvar neste navegador. Confira se o armazenamento do site está liberado.");
    }
  };

  const next = () => (isLast ? finish() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  return (
    <div className="flex min-h-dvh flex-col px-4 pb-8 pt-6">
      <div
        className="h-1 overflow-hidden rounded-full bg-surface2"
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

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={skip}
          disabled={finishing}
          className="tap px-2 text-sm text-muted active:opacity-70"
        >
          {redo ? "Cancelar" : "Pular"}
        </button>
      </div>

      <div className="anim-fade-in flex-1 pt-4" key={step}>
        {step === "nome" && (
          <>
            <h1 className="text-2xl font-semibold">{redo ? "Refazer suas respostas" : "Como te chamo?"}</h1>
            <p className="mt-2 text-sm text-muted">
              {redo
                ? "Seu histórico não muda. Só o nível e o equipamento que o app considera. Como te chamo?"
                : "Só pra te cumprimentar. Pode deixar em branco."}
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              aria-label="Seu nome"
              maxLength={30}
              autoComplete="given-name"
              className="mt-6 w-full rounded-xl border border-border bg-surface2 px-3 py-3 text-base outline-none placeholder:text-muted focus:border-muted"
            />
          </>
        )}

        {step === "equipamento" && (
          <>
            <h1 className="text-2xl font-semibold">Onde você treina?</h1>
            <p className="mt-2 text-sm text-muted">
              Só mostro exercícios que você consegue fazer aí.
            </p>
            <div className="mt-6">
              <Choices
                label="Onde você treina"
                options={EQUIPMENT_OPTIONS}
                value={equipment}
                onChange={setEquipment}
              />
            </div>
          </>
        )}

        {(step === "push_up" ||
          step === "pull_up" ||
          step === "handstand_hold" ||
          step === "dips") && (
          <>
            <h1 className="text-2xl font-semibold">{QUESTIONS[step].title}</h1>
            <p className="mt-2 text-sm text-muted">{QUESTIONS[step].hint}</p>
            <div className="mt-6">
              <Choices
                label={QUESTIONS[step].title}
                options={QUESTIONS[step].options as Option<string>[]}
                value={capacity[step]}
                onChange={(v) => setCapacity((c) => ({ ...c, [step]: v }))}
              />
            </div>
            <p className="mt-4 text-sm text-muted">
              Na dúvida, marque a menor. O app sobe sozinho quando você treinar.
            </p>
          </>
        )}

        {step === "frequencia" && (
          <>
            <h1 className="text-2xl font-semibold">Quantos dias por semana?</h1>
            <p className="mt-2 text-sm text-muted">Escolha uma frequência realista pra sua rotina.</p>
            <div className="mt-8 flex justify-center gap-3" role="radiogroup" aria-label="Dias por semana">
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
            <p className="mt-6 text-center text-sm text-muted">{daysFeedback(days)}</p>
          </>
        )}

        {step === "plano" && (
          <>
            <h1 className="text-2xl font-semibold">{redo ? "E o plano?" : "Seu ponto de partida"}</h1>
            <p className="mt-2 text-sm text-muted">
              {redo
                ? "Trocar de plano não apaga nada do histórico, mas muda os treinos daqui pra frente."
                : "Escolhi um plano pra você. Se não fizer sentido, troque."}
            </p>
            <div role="radiogroup" aria-label="Plano" className="mt-6 flex flex-col gap-3">
              {redo && (
                <OptionButton
                  selected={seedId === "current"}
                  onClick={() => setChosenSeed("current")}
                  label="Manter meu plano atual"
                  hint={`${plan.name}. Só atualiza seu nível nas skills.`}
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
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
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
      </div>
    </div>
  );
}
