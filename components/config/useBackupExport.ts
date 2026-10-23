"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { countCompletedSessions } from "@/lib/db/queries/metrics";
import {
  exportAll,
  backupToBlob,
  backupFilename,
  markExported,
  sessionsSinceExport,
} from "@/lib/db/backup";
import { useToast } from "@/components/ui/Toast";
import { haptic } from "@/lib/utils/haptics";

/**
 * Fazer backup, usado em dois lugares de Ajustes: a linha de backup e o
 * "Fazer backup antes" do apagar tudo.
 */
export function useBackupExport() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const completed = useLiveQuery(() => countCompletedSessions(), []);
  const pendingBackup = completed !== undefined ? sessionsSinceExport(completed) : 0;

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

  return { exporting, pendingBackup, handleExport };
}
