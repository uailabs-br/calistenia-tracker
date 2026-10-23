"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { plan } from "@/lib/plan/loader";
import type { Plan } from "@/lib/plan/schema";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { useToast } from "@/components/ui/Toast";
import { ReminderSettings } from "@/components/config/ReminderSettings";
import {
  DeviceIcon,
  DownloadIcon,
  FlagIcon,
  HistoryIcon,
  ListIcon,
  MinusIcon,
  PlusIcon,
  SlidersIcon,
  SparkleIcon,
  TargetIcon,
  TrashIcon,
  UploadIcon,
  UserIcon,
} from "@/components/ui/icons";
import { getCustomExercises } from "@/lib/db/repositories/customExercises";
import { getAiGoals } from "@/lib/utils/aiPersona";
import { clearPlanOverride, hasPlanOverride } from "@/lib/plan/importPlan";
import { haptic } from "@/lib/utils/haptics";
import {
  getProfileName,
  setProfileName,
  getWeekGoal,
  setWeekGoal,
  WEEK_GOAL_MAX,
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
} from "@/lib/db/backup";

/** Estado da instalação PWA nesta visita. */
type InstallState = "standalone" | "ios" | "prompt" | "manual";

export default function ConfigPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [showReset, setShowReset] = useState(false);
  const [name, setName] = useState("");
  // null até o mount: `plan` vem do override do localStorage, que não existe no
  // HTML estático. Renderizar qualquer coisa derivada dele direto quebra a hidratação.
  const [goal, setGoal] = useState<number | null>(null);
  const [install, setInstall] = useState<InstallState | null>(null);
  /** Plano em vigor. Só depois do mount — ver o comentário de `goal`. */
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [aiGoalsCount, setAiGoalsCount] = useState(0);
  const [hasOverride, setHasOverride] = useState(false);
  const [showRestorePlan, setShowRestorePlan] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  // Erro de restauração fica à vista junto das linhas de backup (o toast some e
  // a mensagem do arquivo inválido costuma ser longa demais pra caber nele).
  const [importError, setImportError] = useState<string | null>(null);

  // Só no cliente: localStorage (nome, meta) e detecção de instalação.
  useEffect(() => {
    setName(getProfileName());
    setGoal(getWeekGoal() ?? plan.workouts.length);
    setActivePlan(plan);
    setAiGoalsCount(getAiGoals().length);
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

  const handleRestoreDefaultPlan = () => {
    setShowRestorePlan(false);
    clearPlanOverride();
    toast({ message: "Voltando ao treino original", variant: "success" });
    // Mesmo motivo do aplicar: o plano é lido uma vez no boot.
    setTimeout(() => window.location.assign("/config"), 450);
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    setInstall(accepted ? "standalone" : "manual");
  };

  const completed = useLiveQuery(async () => {
    const rows = await db.sessions.where("status").equals("completed").toArray();
    return rows.filter((s) => !s.deleted_at).length;
  }, []);
  const customCount = useLiveQuery(async () => (await getCustomExercises()).length, []);

  const pendingBackup = completed !== undefined ? sessionsSinceExport(completed) : 0;

  const changeGoal = (delta: number) => {
    if (goal === null) return;
    const next = Math.min(WEEK_GOAL_MAX, Math.max(1, goal + delta));
    if (next === goal) return;
    haptic();
    setGoal(next);
    // Igual ao padrão do plano = sem override, pra meta acompanhar o plano se ele mudar.
    setWeekGoal(next === activePlan?.workouts.length ? null : next);
  };

  const handleExport = async (): Promise<boolean> => {
    setExporting(true);
    try {
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
          haptic();
          toast({ message: "Backup compartilhado", variant: "success" });
          return true;
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
      haptic();
      toast({ message: "Backup salvo", variant: "success" });
      return true;
    } catch {
      toast({ message: "Não deu pra fazer o backup", variant: "error" });
      return false;
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const raw = JSON.parse(await file.text());
      const r = await importMerge(raw);
      haptic();
      toast({
        message: `Backup restaurado: +${r.sessionsAdded} sessões, +${r.logsAdded} registros`,
        variant: "success",
      });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Esse arquivo não é um backup do app.");
      toast({ message: "Não deu pra restaurar esse arquivo", variant: "error" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleReset = async () => {
    setShowReset(false);
    try {
      await resetAll();
      haptic(20);
      toast({ message: "Dados apagados. Tudo começa do zero." });
    } catch {
      toast({ message: "Não deu pra apagar os dados", variant: "error" });
    }
  };

  const installRow = {
    standalone: { description: "Já instalado. Abrindo pela tela inicial, o app funciona sem internet.", value: "Instalado" },
    ios: { description: "No Safari: toque em Compartilhar e depois em “Adicionar à Tela de Início”.", value: undefined },
    prompt: { description: "Adicione à tela inicial pra abrir sem internet e proteger seu histórico.", value: undefined },
    manual: { description: "Use o menu do navegador → “Adicionar à tela inicial”.", value: undefined },
  } as const;
  const installInfo = install ? installRow[install] : null;

  return (
    <div className="px-4">
      <PageHeader title="Ajustes" />

      <SettingsGroup title="Perfil">
        <SettingsRow
          icon={UserIcon}
          label="Nome"
          trailing={
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setProfileName(e.target.value);
              }}
              placeholder="Como te chamar"
              aria-label="Seu nome"
              maxLength={30}
              autoComplete="given-name"
              className="w-40 min-w-0 bg-transparent text-right text-base outline-none placeholder:text-muted"
            />
          }
        />
        <SettingsRow
          icon={TargetIcon}
          label="Meta semanal"
          trailing={
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => changeGoal(-1)}
                disabled={goal === null || goal <= 1}
                aria-label="Diminuir meta semanal"
                className="tap flex items-center justify-center rounded-full text-muted disabled:opacity-30"
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              <span className="tnum min-w-[2ch] text-center text-base" aria-live="polite">
                {goal ?? "–"}
              </span>
              <button
                type="button"
                onClick={() => changeGoal(1)}
                disabled={goal === null || goal >= WEEK_GOAL_MAX}
                aria-label="Aumentar meta semanal"
                className="tap flex items-center justify-center rounded-full text-muted disabled:opacity-30"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </span>
          }
        />
        <SettingsRow
          icon={SlidersIcon}
          label="Nível e equipamento"
          href="/onboarding/refazer"
        />
      </SettingsGroup>

      <SettingsGroup title="Treino">
        <SettingsRow
          icon={SparkleIcon}
          label="Montar treino com IA"
          href="/config/plano"
        />
        <SettingsRow
          icon={FlagIcon}
          label="Meus objetivos"
          value={aiGoalsCount > 0 ? `${aiGoalsCount} escolhidos` : "nenhum ainda"}
          href="/config/persona"
        />
        <SettingsRow
          icon={ListIcon}
          label="Meus exercícios"
          value={customCount ? String(customCount) : undefined}
          href="/config/exercicios"
        />
        {hasOverride && (
          <SettingsRow
            icon={HistoryIcon}
            label="Voltar ao treino original do app"
            onClick={() => setShowRestorePlan(true)}
          />
        )}
      </SettingsGroup>

      <ReminderSettings />

      <SettingsGroup
        title="Dados"
        footer={
          importError ? (
            <span role="alert" style={{ color: "var(--color-danger)" }}>
              {importError}
            </span>
          ) : (
            "O backup guarda os treinos que você já fez num arquivo. Guarde em um lugar seguro: no iPhone, o navegador pode apagar os dados do app. Restaurar junta com o que já está aqui, sem sobrescrever o mais recente."
          )
        }
      >
        <SettingsRow
          icon={DownloadIcon}
          label="Fazer backup"
          description={
            pendingBackup >= 4
              ? `${pendingBackup} sessões sem backup`
              : undefined
          }
          attention={pendingBackup >= 4}
          onClick={handleExport}
          busy={exporting}
        />
        <SettingsRow
          icon={UploadIcon}
          label="Restaurar backup"
          onClick={() => fileRef.current?.click()}
          busy={importing}
        />
        {installInfo && (
          <SettingsRow
            icon={DeviceIcon}
            label="Instalar o app"
            description={installInfo.description}
            value={installInfo.value}
            onClick={install === "prompt" ? handleInstall : undefined}
          />
        )}
      </SettingsGroup>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportFile}
        className="hidden"
      />

      <SettingsGroup className="mt-8">
        <SettingsRow
          icon={TrashIcon}
          label="Apagar todos os dados"
          description="Remove os treinos que você fez e os exercícios que criou, deste aparelho. Não dá pra desfazer."
          onClick={() => setShowReset(true)}
          danger
        />
      </SettingsGroup>

      <section className="text-xs text-muted">
        <p>Calistenia Tracker v{pkg.version.split(".").slice(0, 2).join(".")}</p>
        <p>{activePlan ? `Treino atual: ${activePlan.name} (v${activePlan.version})` : ""}</p>
        <p className="mt-1">
          Ilustrações dos exercícios:{" "}
          <a
            href="https://repdb.co"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Exercise data by RepDB (repdb.co)
          </a>
        </p>
      </section>
      <div className="h-4" />

      {showReset && (
        <ConfirmDialog
          title="Apagar todos os dados?"
          message="Todos os treinos que você fez e os exercícios que criou serão apagados deste aparelho. Não dá pra desfazer. Se quiser guardar, faça um backup antes."
          confirmLabel="Apagar tudo"
          danger
          secondaryLabel="Fazer backup antes"
          onSecondary={handleExport}
          onConfirm={handleReset}
          onCancel={() => setShowReset(false)}
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
