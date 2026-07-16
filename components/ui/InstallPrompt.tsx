"use client";

import { useEffect, useState } from "react";
import {
  getDeferredInstall,
  isIOS,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from "@/lib/utils/installPrompt";

const DISMISS_KEY = "calistenia:install-dismissed";

/**
 * Nudge de instalação. Só aparece fora do modo standalone — instalar na tela
 * inicial é a mitigação real contra o iOS apagar o IndexedDB sob pressão de
 * armazenamento. Android/Chrome usa beforeinstallprompt (via singleton
 * compartilhado com Config); iOS mostra instrução.
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (isStandalone()) return;

    const iosDevice = isIOS();
    setIos(iosDevice);

    // iOS não dispara beforeinstallprompt — mostra instrução manual.
    if (iosDevice) {
      setVisible(true);
      return;
    }
    if (getDeferredInstall()) {
      setCanPrompt(true);
      setVisible(true);
    }
    return subscribeInstall(() => {
      setCanPrompt(true);
      setVisible(true);
    });
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    await promptInstall();
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="mt-4 rounded-card border border-border bg-surface px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Instale o app</p>
          <p className="mt-1 text-xs leading-snug text-muted">
            {ios
              ? "No Safari: toque em Compartilhar e depois em “Adicionar à Tela de Início”. Protege seu histórico contra limpeza automática do iOS."
              : "Adicione à tela inicial para abrir offline e proteger seu histórico contra limpeza de armazenamento."}
          </p>
          {!ios && canPrompt && (
            <button
              type="button"
              onClick={install}
              className="tap mt-2 rounded-lg bg-text px-3 py-1.5 text-sm font-medium text-bg"
            >
              Instalar
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar"
          className="tap -mr-2 -mt-1 shrink-0 rounded-lg px-2 py-1 text-xs text-muted"
        >
          agora não
        </button>
      </div>
    </div>
  );
}
