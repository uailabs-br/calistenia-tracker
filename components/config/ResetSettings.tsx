"use client";

import { useState } from "react";
import { resetAll } from "@/lib/db/backup";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { useToast } from "@/components/ui/Toast";
import { TrashIcon } from "@/components/ui/icons";
import { haptic } from "@/lib/utils/haptics";
import { setFlash } from "@/lib/utils/flash";
import { useBackupExport } from "./useBackupExport";

/** Apagar tudo, por último e sozinho: longe do toque distraído no backup. */
export function ResetSettings() {
  const { toast } = useToast();
  const { handleExport } = useBackupExport();
  const [show, setShow] = useState(false);

  const handleReset = async () => {
    setShow(false);
    try {
      await resetAll();
      haptic(20);
      // O plano e os ajustes vivem em memória desde o boot: sem recarregar, a
      // tela seguia com o plano e a meta de antes e parecia que nada tinha sido
      // apagado. Toast aqui morreria no recarregamento, então vai de recado.
      setFlash({ message: "Dados apagados. Tudo começa do zero." });
      window.location.assign("/");
    } catch {
      toast({ message: "Não deu pra apagar os dados", variant: "error" });
    }
  };

  return (
    <>
      <SettingsGroup className="mt-8">
        <SettingsRow
          icon={TrashIcon}
          label="Apagar todos os dados"
          description="Remove os treinos que você fez e os exercícios que criou, deste aparelho. Não dá pra desfazer."
          onClick={() => setShow(true)}
          danger
        />
      </SettingsGroup>

      {show && (
        <ConfirmDialog
          title="Apagar todos os dados?"
          message="Todos os treinos que você fez e os exercícios que criou serão apagados deste aparelho. Não dá pra desfazer. Se quiser guardar, faça um backup antes."
          confirmLabel="Apagar tudo"
          danger
          secondaryLabel="Fazer backup antes"
          onSecondary={handleExport}
          onConfirm={handleReset}
          onCancel={() => setShow(false)}
        />
      )}
    </>
  );
}
