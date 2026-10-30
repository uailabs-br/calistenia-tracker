"use client";

import { useRef, useState } from "react";
import { importMerge } from "@/lib/db/backup";
import { useBackupExport } from "./useBackupExport";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { useToast } from "@/components/ui/Toast";
import { DownloadIcon, UploadIcon } from "@/components/ui/icons";
import { haptic } from "@/lib/utils/haptics";
import { setFlash } from "@/lib/utils/flash";

/** "Seus dados": backup e restauração. Apagar tudo fica em `ResetSettings`, no fim da tela. */
export function DataSettings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { exporting, pendingBackup, handleExport } = useBackupExport();
  const [importing, setImporting] = useState(false);
  // Erro de restauração fica à vista junto das linhas de backup (o toast some e
  // a mensagem do arquivo inválido costuma ser longa demais pra caber nele).
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const raw = JSON.parse(await file.text());
      const r = await importMerge(raw);
      haptic();
      const message = `Backup restaurado: +${r.sessionsAdded} sessões, +${r.logsAdded} registros`;
      if (r.planRestored) {
        // o plano é lido uma vez na carga do app: só aparece depois de recarregar
        setFlash({ message: `${message} e o treino que você usava`, variant: "success" });
        window.location.reload();
        return;
      }
      toast({ message, variant: "success" });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Esse arquivo não é um backup do app.");
      toast({ message: "Não deu pra restaurar esse arquivo", variant: "error" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <SettingsGroup
        title="Seus dados"
        footer={
          importError ? (
            <span role="alert" className="text-danger">
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
          description={pendingBackup >= 4 ? `${pendingBackup} sessões sem backup` : undefined}
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
      </SettingsGroup>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportFile}
        className="hidden"
      />

    </>
  );
}
