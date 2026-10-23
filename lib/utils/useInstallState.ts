"use client";

import { useEffect, useState } from "react";
import {
  getDeferredInstall,
  isIOS,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from "@/lib/utils/installPrompt";

/** Estado da instalação PWA nesta visita. null até o mount (depende do navegador). */
export type InstallState = "standalone" | "ios" | "prompt" | "manual";

export function useInstallState() {
  const [install, setInstall] = useState<InstallState | null>(null);

  useEffect(() => {
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

  return { install, handleInstall };
}
