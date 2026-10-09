"use client";

import { useEffect, useState } from "react";
import { plan } from "@/lib/plan/loader";
import type { Plan } from "@/lib/plan/schema";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { useToast } from "@/components/ui/Toast";
import { FlagIcon, ListIcon, SparkleIcon, UploadIcon, HistoryIcon } from "@/components/ui/icons";
import { buildAiPrompt } from "@/lib/plan/aiPrompt";
import { exportForAI } from "@/lib/plan/exportForAI";
import { getSkillById } from "@/lib/plan/skills";
import { seeds } from "@/lib/plan/seeds";
import { getAiGoals, getAiNotes, buildPersonaText } from "@/lib/utils/aiPersona";
import { haptic } from "@/lib/utils/haptics";
import {
  parsePlanInput,
  applyPlan,
  clearPlanOverride,
  hasPlanOverride,
  summarize,
  type PlanSummary,
} from "@/lib/plan/importPlan";

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

/** Troca de treino: pedir à IA, aplicar a resposta, ou partir de um treino pronto. */
export default function PlanoPage() {
  const { toast } = useToast();
  const [planText, setPlanText] = useState("");
  const [planErrors, setPlanErrors] = useState<string[] | null>(null);
  const [pendingPlan, setPendingPlan] = useState<{ plan: Plan; summary: PlanSummary } | null>(null);
  const [showRestorePlan, setShowRestorePlan] = useState(false);
  const [copying, setCopying] = useState(false);
  // null até o mount: `plan` vem do override do localStorage, que não existe no
  // HTML estático. Renderizar qualquer coisa derivada dele direto quebra a hidratação.
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [hasOverride, setHasOverride] = useState(false);
  const [goalsCount, setGoalsCount] = useState(0);

  useEffect(() => {
    setActivePlan(plan);
    setHasOverride(hasPlanOverride());
    setGoalsCount(getAiGoals().length);
  }, []);

  const handleCopyAll = async () => {
    setCopying(true);
    try {
      const goalNames = getAiGoals()
        .map((id) => getSkillById(id)?.name)
        .filter((n): n is string => Boolean(n));
      const persona = buildPersonaText(goalNames, getAiNotes());
      const historico = await exportForAI();
      await copyText(buildAiPrompt(persona, historico));
      haptic();
      toast({ message: "Pedido copiado — cola na IA", variant: "success" });
    } catch {
      toast({ message: "Não deu pra copiar", variant: "error" });
    } finally {
      setCopying(false);
    }
  };

  const handleValidatePlan = () => {
    setPlanErrors(null);
    const result = parsePlanInput(planText);
    if (!result.ok) {
      setPlanErrors(result.errors);
      return;
    }
    setPendingPlan(result);
  };

  const handleApplyPlan = () => {
    if (!pendingPlan) return;
    haptic();
    applyPlan(pendingPlan.plan);
    // O plano é lido uma vez no boot (lib/plan/loader), então recarregar é o que
    // garante que nenhuma tela fique com o treino antigo em memória.
    toast({ message: "Treino aplicado", variant: "success" });
    setTimeout(() => window.location.assign("/config"), 450);
  };

  const handleRestoreDefaultPlan = () => {
    setShowRestorePlan(false);
    clearPlanOverride();
    toast({ message: "Voltando ao treino original", variant: "success" });
    setTimeout(() => window.location.assign("/config"), 450);
  };

  return (
    <div className="px-4">
      <BackLink />
      <PageHeader title="Montar treino com IA" />
      <p className="-mt-2 mb-5 text-sm text-muted">
        Você copia um pedido pronto, cola na IA (Claude, ChatGPT…) e traz a resposta
        de volta pra cá. Só os exercícios do treino mudam — seu histórico fica intacto.
      </p>

      <SettingsGroup title="1 · Pedir à IA">
        <SettingsRow
          icon={FlagIcon}
          label="Meus objetivos"
          value={goalsCount > 0 ? `${goalsCount} escolhidos` : "nenhum ainda"}
          href="/config/persona"
        />
        <SettingsRow
          icon={SparkleIcon}
          label="Copiar pedido pra IA"
          onClick={handleCopyAll}
          busy={copying}
        />
      </SettingsGroup>

      <section className="mb-6">
        <h2 className="mb-2 px-1 font-mono text-xs uppercase tracking-wide text-muted">
          2 · Aplicar a resposta
        </h2>
        <textarea
          value={planText}
          onChange={(e) => {
            setPlanText(e.target.value);
            setPlanErrors(null);
          }}
          placeholder="Cola aqui a resposta da IA…"
          rows={5}
          aria-label="Resposta da IA com o treino"
          className="w-full rounded-card border border-border bg-surface px-4 py-3 text-base outline-none placeholder:text-muted focus:border-muted"
        />
        {planErrors && (
          <div
            className="mt-2 rounded-card border px-3 py-2 text-xs"
            style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
            role="alert"
          >
            <p className="font-medium">Não deu pra aplicar essa resposta:</p>
            <ul className="mt-1 list-disc pl-4">
              {planErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-2 overflow-hidden rounded-card border border-border bg-surface">
          <SettingsRow
            icon={UploadIcon}
            label="Aplicar treino da IA"
            onClick={handleValidatePlan}
            disabled={!planText.trim()}
          />
        </div>
      </section>

      <SettingsGroup title="Ou comece de um treino pronto">
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

      {hasOverride && (
        <SettingsGroup>
          <SettingsRow
            icon={HistoryIcon}
            label="Voltar ao treino original do app"
            onClick={() => setShowRestorePlan(true)}
          />
        </SettingsGroup>
      )}
      <div className="h-4" />

      {pendingPlan && (
        <ConfirmDialog
          title="Trocar de treino?"
          message={`O treino atual vira "${pendingPlan.summary.name}" — ${pendingPlan.summary.workouts} treinos, ${pendingPlan.summary.exercises} exercícios (v${pendingPlan.summary.version}). O app recarrega pra aplicar.`}
          confirmLabel="Trocar"
          onConfirm={handleApplyPlan}
          onCancel={() => setPendingPlan(null)}
        />
      )}

      {showRestorePlan && (
        <ConfirmDialog
          title="Voltar ao treino original?"
          message="Descarta o treino que você aplicou neste aparelho e volta pro que vem no app. Seu histórico de sessões não é afetado."
          confirmLabel="Voltar"
          onConfirm={handleRestoreDefaultPlan}
          onCancel={() => setShowRestorePlan(false)}
        />
      )}
    </div>
  );
}
