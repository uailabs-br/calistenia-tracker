"use client";

import { useCallback, useEffect, useState } from "react";
import { plan } from "@/lib/plan/loader";
import type { Plan } from "@/lib/plan/schema";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { PlanPreview } from "@/components/plan/PlanPreview";
import { GoalPicker } from "@/components/plan/GoalPicker";
import {
  BackButton,
  ChoiceStep,
  CopyStep,
  PasteStep,
  StepHeader,
  WriteStep,
  type PasteFailure,
} from "@/components/plan/AiFlowSteps";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { useToast } from "@/components/ui/Toast";
import { ListIcon } from "@/components/ui/icons";
import { buildAiPrompt } from "@/lib/plan/aiPrompt";
import { buildConvertPrompt } from "@/lib/plan/aiConvertPrompt";
import { buildFixPrompt } from "@/lib/plan/aiFixPrompt";
import { localDateKey } from "@/lib/utils/date";
import { exportForAI } from "@/lib/plan/exportForAI";
import { getSkillById } from "@/lib/plan/skills";
import { seeds } from "@/lib/plan/seeds";
import { getAiGoals, getAiNotes, buildPersonaText } from "@/lib/utils/aiPersona";
import { haptic } from "@/lib/utils/haptics";
import { parsePlanInput, applyPlan, summarize, type PlanSummary } from "@/lib/plan/importPlan";
import {
  FLOW_STEPS,
  clearAiFlow,
  getAiFlow,
  isAiFlowMode,
  saveAiFlow,
  type AiFlowMode,
  type AiFlowStep,
} from "@/lib/utils/aiFlow";

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

interface View {
  mode: AiFlowMode | null;
  step: AiFlowStep;
}

const BASE = "/config/plano";
const ESCOLHA: View = { mode: null, step: "escolha" };

/**
 * O passo mora na URL (`?modo=novo&passo=colar`) e cada avanço é um `pushState`:
 * assim o voltar do Android/navegador recua um passo em vez de sair do fluxo, e
 * o aviso da home entra direto em `?modo=novo`.
 */
function viewFromUrl(): View {
  const params = new URLSearchParams(window.location.search);
  const modo = params.get("modo");
  if (modo === "pronto") return { mode: null, step: "pronto" };
  if (!isAiFlowMode(modo)) return ESCOLHA;
  const steps = FLOW_STEPS[modo];
  const passo = params.get("passo") as AiFlowStep | null;
  return { mode: modo, step: passo && steps.includes(passo) ? passo : steps[0] };
}

function urlFor(v: View): string {
  if (v.step === "pronto") return `${BASE}?modo=pronto`;
  if (!v.mode) return BASE;
  return v.step === FLOW_STEPS[v.mode][0]
    ? `${BASE}?modo=${v.mode}`
    : `${BASE}?modo=${v.mode}&passo=${v.step}`;
}

/**
 * Empilha/substitui uma entrada do fluxo SEM descartar o estado que o Next guarda
 * no histórico (`__NA` e a árvore): entrada sem ele faz o roteador recarregar a
 * página inteira no voltar.
 */
function writeHistory(kind: "push" | "replace", depth: number, url: string) {
  const state = { ...(window.history.state ?? {}), aiFlowDepth: depth };
  if (kind === "push") window.history.pushState(state, "", url);
  else window.history.replaceState(state, "", url);
}

/** Quantos passos deste fluxo estão empilhados no histórico, pro "Voltar" da tela. */
function historyDepth(): number {
  const d = (window.history.state as { aiFlowDepth?: unknown } | null)?.aiFlowDepth;
  return typeof d === "number" ? d : 0;
}

const TITLES: Record<AiFlowStep, string> = {
  escolha: "Montar treino com IA",
  pronto: "Treinos prontos",
  objetivos: "O que treinar agora?",
  escrever: "Seu treino atual",
  copiar: "Copie o pedido",
  colar: "Cole a resposta",
};

/** Troca de treino em passos: criar com IA, trazer o próprio, ou partir de um pronto. */
export default function PlanoPage() {
  const { toast } = useToast();
  // null até o mount: a URL e o `plan` (override do localStorage) não existem no
  // HTML estático. Renderizar o passo ou o plano direto quebra a hidratação.
  const [view, setView] = useState<View | null>(null);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [ownWorkout, setOwnWorkout] = useState("");
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const [goalsCount, setGoalsCount] = useState(0);
  const [pasteText, setPasteText] = useState("");
  const [failure, setFailure] = useState<PasteFailure | null>(null);
  const [pendingPlan, setPendingPlan] = useState<{ plan: Plan; summary: PlanSummary } | null>(null);

  useEffect(() => {
    setActivePlan(plan);
    let v = viewFromUrl();
    let resume: number | undefined;
    const saved = getAiFlow();
    if (saved && (v.step === "escolha" || v.mode === saved.mode)) {
      if (saved.mode === "meu") setOwnWorkout(saved.ownWorkout);
      setCopied(saved.copied);
      // Pedido já copiado = a pessoa está voltando da IA. Cai no colar, com a
      // escolha embaixo no histórico pra o voltar ter pra onde ir.
      if (saved.copied && v.step !== "colar") {
        const target: View = { mode: saved.mode, step: "colar" };
        v = target;
        // Fora do mount: o effect do filho roda antes do roteador do Next
        // assumir o histórico, e um pushState aqui ficaria fora do estado dele.
        resume = window.setTimeout(() => {
          writeHistory("replace", 0, BASE);
          writeHistory("push", 1, urlFor(target));
        }, 0);
      }
    }
    setView(v);

    const onPop = () => setView(viewFromUrl());
    window.addEventListener("popstate", onPop);
    return () => {
      window.clearTimeout(resume);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const go = useCallback((next: View) => {
    writeHistory("push", historyDepth() + 1, urlFor(next));
    setView(next);
    window.scrollTo(0, 0);
  }, []);

  const back = () => {
    if (historyDepth() > 0) {
      window.history.back();
      return;
    }
    // Entrou direto num passo (ex.: aviso da home): não há passo anterior no
    // histórico, então o voltar da tela recua sem empilhar.
    if (!view) return;
    let prev = ESCOLHA;
    if (view.mode) {
      const steps = FLOW_STEPS[view.mode];
      const i = steps.indexOf(view.step);
      if (i > 0) prev = { mode: view.mode, step: steps[i - 1] };
    }
    writeHistory("replace", 0, urlFor(prev));
    setView(prev);
  };

  const pick = (choice: "novo" | "meu" | "pronto") => {
    if (choice === "pronto") {
      go({ mode: null, step: "pronto" });
      return;
    }
    setCopied(false);
    setFailure(null);
    setPasteText("");
    saveAiFlow({ mode: choice, copied: false, ownWorkout: choice === "meu" ? ownWorkout : "" });
    go({ mode: choice, step: FLOW_STEPS[choice][0] });
  };

  const changeOwnWorkout = (text: string) => {
    setOwnWorkout(text);
    // O pedido copiado leva o texto de antes; mudou o treino, tem que copiar de novo.
    setCopied(false);
    saveAiFlow({ mode: "meu", copied: false, ownWorkout: text });
  };

  const handleCopy = async () => {
    if (!view?.mode) return;
    setCopying(true);
    try {
      if (view.mode === "novo") {
        const goalNames = getAiGoals()
          .map((id) => getSkillById(id)?.name)
          .filter((n): n is string => Boolean(n));
        const persona = buildPersonaText(goalNames, getAiNotes());
        await copyText(buildAiPrompt(persona, await exportForAI()));
      } else {
        await copyText(buildConvertPrompt(ownWorkout, localDateKey()));
      }
      haptic();
      setCopied(true);
      saveAiFlow({ mode: view.mode, copied: true, ownWorkout: view.mode === "meu" ? ownWorkout : "" });
    } catch {
      toast({ message: "Não deu pra copiar", variant: "error" });
    } finally {
      setCopying(false);
    }
  };

  const submit = (text: string) => {
    setPasteText(text);
    const result = parsePlanInput(text);
    if (!result.ok) {
      setFailure({ reason: result.reason, errors: result.errors });
      return;
    }
    setFailure(null);
    setPendingPlan(result);
  };

  const pasteFromClipboard = async (): Promise<boolean> => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast({ message: "A área de transferência está vazia", variant: "error" });
        return true;
      }
      submit(text);
      return true;
    } catch {
      toast({ message: "Toque e segure na caixa abaixo pra colar" });
      return false;
    }
  };

  const handleCopyFix = async () => {
    if (!failure) return;
    try {
      await copyText(buildFixPrompt(failure.reason, failure.errors));
      haptic();
      toast({ message: "Copiado. Cole na mesma conversa", variant: "success" });
    } catch {
      toast({ message: "Não deu pra copiar", variant: "error" });
    }
  };

  const handleApplyPlan = () => {
    if (!pendingPlan) return;
    haptic();
    applyPlan(pendingPlan.plan);
    clearAiFlow();
    // O plano é lido uma vez no boot (lib/plan/loader), então recarregar é o que
    // garante que nenhuma tela fique com o treino antigo em memória.
    toast({ message: "Treino aplicado", variant: "success" });
    setTimeout(() => window.location.assign("/"), 450);
  };

  if (!view) return <div className="px-4" />;

  const steps = view.mode ? FLOW_STEPS[view.mode] : null;

  return (
    <div className="px-4">
      {steps ? (
        <StepHeader
          step={steps.indexOf(view.step) + 1}
          total={steps.length}
          title={TITLES[view.step]}
          onBack={back}
        />
      ) : view.step === "pronto" ? (
        <>
          <BackButton onBack={back} />
          <PageHeader title={TITLES.pronto} />
        </>
      ) : (
        <>
          <BackLink href="/plano" label="Treino" />
          <PageHeader title={TITLES.escolha} />
        </>
      )}

      <div key={view.step} className="anim-fade-in">
        {view.step === "escolha" && <ChoiceStep onPick={pick} />}

        {view.step === "objetivos" && (
          <>
            <p className="-mt-2 mb-4 text-sm text-muted">Marque o que é prioridade. Pode pular.</p>
            <GoalPicker notesCollapsed onGoalsChange={setGoalsCount} />
            <button
              type="button"
              onClick={() => go({ mode: "novo", step: "copiar" })}
              className="btn-primary tap mt-6 flex min-h-[48px] w-full items-center justify-center rounded-xl py-3 font-medium"
            >
              {goalsCount > 0 ? "Continuar" : "Pular"}
            </button>
          </>
        )}

        {view.step === "escrever" && (
          <WriteStep
            value={ownWorkout}
            onChange={changeOwnWorkout}
            onNext={() => go({ mode: "meu", step: "copiar" })}
          />
        )}

        {view.step === "copiar" && view.mode && (
          <CopyStep
            context={
              view.mode === "novo"
                ? "O pedido leva seu treino atual, seu histórico e seus objetivos."
                : "O pedido leva o treino que você escreveu."
            }
            copied={copied}
            busy={copying}
            onCopy={handleCopy}
            onNext={() => view.mode && go({ mode: view.mode, step: "colar" })}
          />
        )}

        {view.step === "colar" && (
          <PasteStep
            value={pasteText}
            failure={failure}
            onChange={(text) => {
              setPasteText(text);
              setFailure(null);
            }}
            onSubmit={submit}
            onPasteFromClipboard={pasteFromClipboard}
            onCopyFix={handleCopyFix}
          />
        )}

        {view.step === "pronto" && (
          <SettingsGroup>
            {seeds.map((seed) => (
              <SettingsRow
                key={seed.id}
                icon={ListIcon}
                label={seed.name}
                description={seed.summary}
                value={seed.plan.id === activePlan?.id ? "em uso" : undefined}
                onClick={() => setPendingPlan({ plan: seed.plan, summary: summarize(seed.plan) })}
              />
            ))}
          </SettingsGroup>
        )}
      </div>
      <div className="h-8" />

      {pendingPlan && activePlan && (
        <PlanPreview
          current={activePlan}
          next={pendingPlan.plan}
          onConfirm={handleApplyPlan}
          onCancel={() => setPendingPlan(null)}
        />
      )}
    </div>
  );
}
