"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { plan } from "@/lib/plan/loader";
import type { Plan } from "@/lib/plan/schema";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { useToast } from "@/components/ui/Toast";
import { ReminderSettings } from "@/components/config/ReminderSettings";
import { AI_SCHEMA_PROMPT } from "@/lib/plan/aiSchema";
import {
  parsePlanInput,
  applyPlan,
  clearPlanOverride,
  hasPlanOverride,
  type PlanSummary,
} from "@/lib/plan/importPlan";
import {
  getProfileName,
  setProfileName,
  getWeekGoal,
  setWeekGoal,
} from "@/lib/utils/profile";
import pkg from "@/package.json";
import {
  getDeferredInstall,
  isIOS,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from "@/lib/utils/installPrompt";
import {
  exportAll,
  backupToBlob,
  backupFilename,
  importMerge,
  markExported,
  sessionsSinceExport,
  resetAll,
  type ImportResult,
} from "@/lib/db/backup";

/** Estado da instalação PWA nesta visita. */
type InstallState = "standalone" | "ios" | "prompt" | "manual";

export default function ConfigPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState(plan.days.length);
  const [install, setInstall] = useState<InstallState | null>(null);
  const [planText, setPlanText] = useState("");
  const [planErrors, setPlanErrors] = useState<string[] | null>(null);
  const [pendingPlan, setPendingPlan] = useState<{ plan: Plan; summary: PlanSummary } | null>(
    null
  );
  const [showRestorePlan, setShowRestorePlan] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);

  // Só no cliente: localStorage (nome, meta) e detecção de instalação.
  useEffect(() => {
    setName(getProfileName());
    setGoal(getWeekGoal() ?? plan.days.length);
    setHasOverride(hasPlanOverride());
    if (isStandalone()) {
      setInstall("standalone");
      return;
    }
    if (isIOS()) {
      setInstall("ios");
      return;
    }
    setInstall(getDeferredInstall() ? "prompt" : "manual");
    // se o beforeinstallprompt chegar depois do mount, habilita o botão
    return subscribeInstall(() => setInstall("prompt"));
  }, []);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    setInstall(accepted ? "standalone" : "manual");
  };

  const completed = useLiveQuery(async () => {
    const rows = await db.sessions.where("status").equals("completed").toArray();
    return rows.filter((s) => !s.deleted_at).length;
  }, []);

  const pendingBackup =
    completed !== undefined ? sessionsSinceExport(completed) : 0;

  const handleExport = async () => {
    setMsg(null);
    const backup = await exportAll();
    const blob = backupToBlob(backup);
    const filename = backupFilename();

    // Web Share (iOS/Android) com fallback para download
    const file = new File([blob], filename, { type: "application/json" });
    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
    };
    if (nav.canShare?.({ files: [file] }) && navigator.share) {
      try {
        await navigator.share({ files: [file], title: filename });
        markExported(completed ?? 0);
        setMsg({ ok: true, text: "Backup compartilhado." });
        return;
      } catch {
        /* usuário cancelou - cai no download */
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    markExported(completed ?? 0);
    setMsg({ ok: true, text: `Backup salvo: ${filename}` });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const r: ImportResult = await importMerge(raw);
      setMsg({
        ok: true,
        text: `Importado: +${r.sessionsAdded} sessões, +${r.logsAdded} registros (atualizados: ${r.sessionsUpdated}/${r.logsUpdated}).`,
      });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Falha ao importar.",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleCopySchema = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(AI_SCHEMA_PROMPT);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = AI_SCHEMA_PROMPT;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast({ message: "Esquema copiado — cola na IA", variant: "success" });
    } catch {
      toast({ message: "Não deu pra copiar", variant: "error" });
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
    applyPlan(pendingPlan.plan);
    window.location.reload();
  };

  const handleRestoreDefaultPlan = () => {
    setShowRestorePlan(false);
    clearPlanOverride();
    window.location.reload();
  };

  const handleReset = async () => {
    setShowReset(false);
    setMsg(null);
    try {
      await resetAll();
      setMsg({ ok: true, text: "Dados apagados. Tudo começa do zero." });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Falha ao resetar.",
      });
    }
  };

  return (
    <div className="px-4">
      <PageHeader title="Config" subtitle="Perfil, backup e dados" />

      <CollapsibleCard title="Perfil" className="mb-3">
        <p className="mt-1 text-sm text-muted">
          Seu nome aparece na saudação da tela inicial.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setProfileName(e.target.value);
          }}
          placeholder="Seu nome"
          aria-label="Seu nome"
          maxLength={30}
          autoComplete="given-name"
          className="mt-3 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-base outline-none placeholder:text-muted focus:border-muted"
        />

        <label htmlFor="week-goal" className="mt-4 block text-sm font-medium">
          Meta semanal
        </label>
        <p className="mt-0.5 text-sm text-muted">
          Quantos treinos por semana fecham o anel. Padrão: {plan.days.length}.
        </p>
        <input
          id="week-goal"
          type="number"
          min={1}
          max={7}
          value={goal}
          onChange={(e) => {
            const n = Number(e.target.value);
            setGoal(n);
            setWeekGoal(n === plan.days.length ? null : n);
          }}
          className="tnum mt-2 w-20 rounded-xl border border-border bg-surface2 px-3 py-2.5 text-base outline-none focus:border-muted"
        />
      </CollapsibleCard>

      <CollapsibleCard title="Criar treino com IA" className="mb-3">
        <p className="mt-1 text-sm text-muted">
          1. Copia o esquema e pede pra IA (Claude etc.) ajustar seu treino. 2.
          Cola a resposta abaixo pra aplicar no app. Isso troca só os
          exercícios do plano — seu histórico de sessões não é afetado.
        </p>
        <button
          type="button"
          onClick={handleCopySchema}
          className="tap mt-3 w-full rounded-xl border border-border bg-surface2 py-3 font-medium"
        >
          Copiar esquema para IA
        </button>

        <textarea
          value={planText}
          onChange={(e) => {
            setPlanText(e.target.value);
            setPlanErrors(null);
          }}
          placeholder="Cola aqui o JSON do treino que a IA devolveu…"
          rows={4}
          aria-label="JSON do treino"
          className="mt-4 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
        />

        {planErrors && (
          <div
            className="mt-2 rounded-card border px-3 py-2 text-xs"
            style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
          >
            <p className="font-medium">Não deu pra importar:</p>
            <ul className="mt-1 list-disc pl-4">
              {planErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={handleValidatePlan}
          disabled={!planText.trim()}
          className="tap mt-2 w-full rounded-xl border border-border bg-surface2 py-3 font-medium disabled:opacity-40"
        >
          Importar treino
        </button>

        {hasOverride && (
          <button
            type="button"
            onClick={() => setShowRestorePlan(true)}
            className="tap mt-2 w-full text-center text-xs text-muted underline"
          >
            Restaurar plano padrão
          </button>
        )}
      </CollapsibleCard>

      <ReminderSettings />

      {pendingBackup >= 4 && (
        <div
          className="mb-4 rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "var(--color-warn)", color: "var(--color-warn)" }}
        >
          {pendingBackup} sessões sem backup. Exporte para não perder o histórico.
        </div>
      )}

      <CollapsibleCard title="Exportar histórico">
        <p className="mt-1 text-sm text-muted">
          Baixa suas sessões e registros de treino (o que você já fez) num
          arquivo JSON. Guarde em local seguro. O navegador do iOS pode apagar
          os dados sob pressão de armazenamento.
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="tap mt-3 w-full rounded-xl bg-text py-3 font-medium text-bg"
        >
          Exportar backup
        </button>
      </CollapsibleCard>

      <CollapsibleCard title="Importar histórico" className="mt-3">
        <p className="mt-1 text-sm text-muted">
          Restaura sessões e registros a partir de um backup exportado por
          este app (mescla por ID, não sobrescreve o que for mais recente).
          Não muda o treino que você está seguindo — pra isso, veja
          &quot;Criar treino com IA&quot; acima.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="tap mt-3 w-full rounded-xl border border-border bg-surface2 py-3 font-medium"
        >
          Escolher arquivo…
        </button>
      </CollapsibleCard>

      {msg && (
        <p
          className="mt-3 rounded-card border px-4 py-3 text-sm"
          style={{
            borderColor: msg.ok ? "var(--color-success)" : "var(--color-danger)",
            color: msg.ok ? "var(--color-success)" : "var(--color-danger)",
          }}
        >
          {msg.text}
        </p>
      )}

      <CollapsibleCard title="Instalar app" className="mt-3">
        {install === "standalone" ? (
          <p className="mt-1 text-sm text-muted">
            Já instalado neste dispositivo. Abrindo pela tela inicial, o app
            funciona offline e o histórico fica protegido contra limpeza
            automática de armazenamento.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              {install === "ios"
                ? "No Safari: toque em Compartilhar e depois em “Adicionar à Tela de Início”. Protege seu histórico contra limpeza automática do iOS."
                : "Adicione à tela inicial para abrir offline e proteger seu histórico contra limpeza de armazenamento."}
            </p>
            {install === "prompt" && (
              <button
                type="button"
                onClick={handleInstall}
                className="tap mt-3 w-full rounded-xl border border-border bg-surface2 py-3 font-medium"
              >
                Instalar
              </button>
            )}
            {install === "manual" && (
              <p className="mt-2 text-xs text-muted">
                Se o botão de instalar não aparecer, use o menu do navegador →
                “Adicionar à tela inicial”.
              </p>
            )}
          </>
        )}
      </CollapsibleCard>

      <CollapsibleCard title="Deletar dados" className="mt-6" danger>
        <p className="mt-1 text-sm text-muted">
          Apaga todo o histórico (sessões e registros) deste dispositivo. Não dá
          para desfazer. Exporte um backup antes se quiser guardar.
        </p>
        <button
          type="button"
          onClick={() => setShowReset(true)}
          className="tap mt-3 w-full rounded-xl border py-3 font-medium"
          style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
        >
          Deletar pra sempre
        </button>
      </CollapsibleCard>

      <section className="mt-6 text-xs text-muted">
        <p>Calistenia Tracker v{pkg.version.split(".").slice(0, 2).join(".")}</p>
        <p>
          Plano: {plan.name} (v{plan.version})
        </p>
      </section>
      <div className="h-4" />

      {showReset && (
        <ConfirmDialog
          title="Deletar todos os dados?"
          message="Todo o histórico de sessões e registros será apagado deste dispositivo. Esta ação não pode ser desfeita."
          confirmLabel="Deletar pra sempre"
          danger
          onConfirm={handleReset}
          onCancel={() => setShowReset(false)}
        />
      )}

      {pendingPlan && (
        <ConfirmDialog
          title="Importar treino novo?"
          message={`Substitui o plano atual por "${pendingPlan.summary.name}" — ${pendingPlan.summary.days} dias, ${pendingPlan.summary.exercises} exercícios (v${pendingPlan.summary.version}). O app recarrega pra aplicar.`}
          confirmLabel="Importar"
          onConfirm={handleApplyPlan}
          onCancel={() => setPendingPlan(null)}
        />
      )}

      {showRestorePlan && (
        <ConfirmDialog
          title="Restaurar plano padrão?"
          message="Volta pro treino embutido no app, descartando o treino importado neste dispositivo. Seu histórico de sessões não é afetado."
          confirmLabel="Restaurar"
          onConfirm={handleRestoreDefaultPlan}
          onCancel={() => setShowRestorePlan(false)}
        />
      )}
    </div>
  );
}
