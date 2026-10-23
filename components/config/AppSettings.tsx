"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { APP_NAME, CONTACT_URL } from "@/lib/appInfo";
import { countCompletedSessions } from "@/lib/db/queries/metrics";
import { plan } from "@/lib/plan/loader";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { DeviceIcon, MessageIcon } from "@/components/ui/icons";
import { feedbackLink, openFeedback } from "@/lib/utils/feedback";
import { useInstallState } from "@/lib/utils/useInstallState";
import pkg from "@/package.json";

const INSTALL_ROW = {
  ios: "No Safari: toque em Compartilhar e depois em “Adicionar à Tela de Início”.",
  prompt: "Adicione à tela inicial pra abrir sem internet e proteger seu histórico.",
  manual: "Use o menu do navegador → “Adicionar à tela inicial”.",
} as const;

/** "App": instalar (some quando já está instalado), feedback, versão e créditos. */
export function AppSettings() {
  const { install, handleInstall } = useInstallState();
  const completed = useLiveQuery(() => countCompletedSessions(), []);

  const sendFeedback = () => {
    // `plan` só é lido no toque, já no cliente (regra 10)
    const link = feedbackLink(plan.id, completed ?? 0);
    if (link) openFeedback(link);
  };

  // Instalado não precisa de linha: era um "Instalado" sem ação ocupando espaço.
  const installHint = install && install !== "standalone" ? INSTALL_ROW[install] : null;

  if (!installHint && !CONTACT_URL) return null;
  return (
    <SettingsGroup title="App">
      {installHint && (
        <SettingsRow
          icon={DeviceIcon}
          label="Instalar o app"
          description={installHint}
          onClick={install === "prompt" ? handleInstall : undefined}
        />
      )}
      {CONTACT_URL && (
        <SettingsRow
          icon={MessageIcon}
          label="Mandar feedback"
          description="Sugestão, problema ou ideia. A mensagem já vai com a versão do app, e você vê tudo antes de enviar."
          onClick={sendFeedback}
        />
      )}
    </SettingsGroup>
  );
}

/** Rodapé de Ajustes: versão e créditos. Fica abaixo de tudo, até do apagar. */
export function AppFooter() {
  return (
    <section className="text-xs text-muted">
      <p>
        {APP_NAME} v{pkg.version.split(".").slice(0, 2).join(".")}
      </p>
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
  );
}
