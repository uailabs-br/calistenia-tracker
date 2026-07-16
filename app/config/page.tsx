"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { plan } from "@/lib/plan/loader";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getProfileName, setProfileName } from "@/lib/utils/profile";
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
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [name, setName] = useState("");
  const [install, setInstall] = useState<InstallState | null>(null);

  // Só no cliente: localStorage (nome) e detecção de instalação.
  useEffect(() => {
    setName(getProfileName());
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

      <section className="mb-3 rounded-card border border-border bg-surface px-4 py-4">
        <h2 className="font-semibold">Perfil</h2>
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
      </section>

      {pendingBackup >= 4 && (
        <div
          className="mb-4 rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "var(--color-warn)", color: "var(--color-warn)" }}
        >
          {pendingBackup} sessões sem backup. Exporte para não perder o histórico.
        </div>
      )}

      <section className="rounded-card border border-border bg-surface px-4 py-4">
        <h2 className="font-semibold">Exportar</h2>
        <p className="mt-1 text-sm text-muted">
          Baixa todo o histórico (sessões + registros) num arquivo JSON. Guarde
          em local seguro. O navegador do iOS pode apagar os dados sob pressão
          de armazenamento.
        </p>
        <button
          type="button"
          onClick={handleExport}
          className="tap mt-3 w-full rounded-xl bg-text py-3 font-medium text-bg"
        >
          Exportar backup
        </button>
      </section>

      <section className="mt-3 rounded-card border border-border bg-surface px-4 py-4">
        <h2 className="font-semibold">Importar</h2>
        <p className="mt-1 text-sm text-muted">
          Mescla um backup por ID (não sobrescreve o que for mais recente).
          Arquivo inválido não toca no banco.
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
      </section>

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

      <section className="mt-3 rounded-card border border-border bg-surface px-4 py-4">
        <h2 className="font-semibold">Instalar app</h2>
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
      </section>

      <section
        className="mt-6 rounded-card border px-4 py-4"
        style={{ borderColor: "color-mix(in srgb, var(--color-danger) 25%, transparent)" }}
      >
        <h2 className="font-semibold" style={{ color: "var(--color-danger)" }}>
          Zona de perigo
        </h2>
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
          Resetar dados
        </button>
      </section>

      <section className="mt-6 text-xs text-muted">
        <p>Calistenia Tracker v{pkg.version.split(".").slice(0, 2).join(".")}</p>
        <p>
          Plano: {plan.name} (v{plan.version})
        </p>
      </section>
      <div className="h-4" />

      {showReset && (
        <ConfirmDialog
          title="Resetar todos os dados?"
          message="Todo o histórico de sessões e registros será apagado deste dispositivo. Esta ação não pode ser desfeita."
          confirmLabel="Apagar tudo"
          danger
          onConfirm={handleReset}
          onCancel={() => setShowReset(false)}
        />
      )}
    </div>
  );
}
