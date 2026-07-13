"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { plan } from "@/lib/plan/loader";
import { PageHeader } from "@/components/ui/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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

export default function ConfigPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showReset, setShowReset] = useState(false);

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
      <PageHeader title="Config" subtitle="Backup e dados" />

      {pendingBackup >= 4 && (
        <div
          className="mb-4 rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "#FF9066", color: "#FF9066" }}
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
            borderColor: msg.ok ? "#6ECFAB" : "#FF6B6B",
            color: msg.ok ? "#6ECFAB" : "#FF6B6B",
          }}
        >
          {msg.text}
        </p>
      )}

      <section className="mt-6 rounded-card border px-4 py-4" style={{ borderColor: "#FF6B6B33" }}>
        <h2 className="font-semibold" style={{ color: "#FF6B6B" }}>
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
          style={{ borderColor: "#FF6B6B", color: "#FF6B6B" }}
        >
          Resetar dados
        </button>
      </section>

      <section className="mt-6 text-xs text-muted">
        <p>
          Plano: {plan.name} (v{plan.version})
        </p>
        <p>Sessões concluídas: {completed ?? "…"}</p>
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
