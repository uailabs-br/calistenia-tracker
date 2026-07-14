"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "calistenia:install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Nudge de instalação. Só aparece fora do modo standalone — instalar na tela
 * inicial é a mitigação real contra o iOS apagar o IndexedDB sob pressão de
 * armazenamento. Android/Chrome usa beforeinstallprompt; iOS mostra instrução.
 */
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIOS(ios);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS não dispara beforeinstallprompt — mostra instrução manual.
    if (ios) setVisible(true);

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="mt-4 rounded-card border border-border bg-surface px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Instale o app</p>
          <p className="mt-1 text-xs leading-snug text-muted">
            {isIOS
              ? "No Safari: toque em Compartilhar e depois em “Adicionar à Tela de Início”. Protege seu histórico contra limpeza automática do iOS."
              : "Adicione à tela inicial para abrir offline e proteger seu histórico contra limpeza de armazenamento."}
          </p>
          {!isIOS && deferred && (
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
