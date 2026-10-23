import { CONTACT_URL } from "@/lib/appInfo";
import { buildFeedbackLink, type FeedbackContext } from "@/lib/domain/feedback";
import { isIOS, isStandalone } from "@/lib/utils/installPrompt";
import pkg from "@/package.json";

/**
 * Lado de aparelho do feedback: localStorage do convite e abertura do link.
 * Fora do Dexie de propósito, como as outras dispensas: é preferência de UI.
 */
export const FEEDBACK_ACK_KEY = "calistenia:feedback-ack";

/** Nº de treinos quando o convite foi dispensado, ou null se nunca foi. */
export function getFeedbackAck(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FEEDBACK_ACK_KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function ackFeedback(completed: number): void {
  try {
    localStorage.setItem(FEEDBACK_ACK_KEY, String(completed));
  } catch {
    /* storage cheio/bloqueado: o convite só não lembra */
  }
}

function deviceLabel(): string {
  if (isIOS()) return "iPhone";
  if (/android/i.test(navigator.userAgent)) return "Android";
  return "computador";
}

/** Link de feedback pronto, ou null enquanto não houver canal (`CONTACT_URL`). */
export function feedbackLink(planId: string, workouts: number): string | null {
  if (!CONTACT_URL) return null;
  const ctx: FeedbackContext = {
    version: pkg.version.split(".").slice(0, 2).join("."),
    planId,
    workouts,
    device: deviceLabel(),
    installed: isStandalone(),
  };
  return buildFeedbackLink(CONTACT_URL, ctx);
}

/**
 * Abre fora do app. Com o PWA instalado, navegar na mesma janela pra um site
 * externo tira a pessoa do app; `mailto:` não abre aba, então vai direto.
 */
export function openFeedback(link: string): void {
  if (link.startsWith("mailto:")) {
    window.location.href = link;
    return;
  }
  window.open(link, "_blank", "noopener,noreferrer");
}
