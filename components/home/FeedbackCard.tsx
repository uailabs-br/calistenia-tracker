"use client";

import { useEffect, useState } from "react";
import { CONTACT_URL } from "@/lib/appInfo";
import { shouldPromptFeedback } from "@/lib/domain/feedback";
import { ackFeedback, feedbackLink, getFeedbackAck, openFeedback } from "@/lib/utils/feedback";
import { MessageIcon } from "@/components/ui/icons";

/**
 * Convite pra mandar feedback. Fica no pé da home e aparece raramente (ver
 * `shouldPromptFeedback`): a home é a tela do treino, não um painel de avisos.
 * A entrada fixa mora em Ajustes. Mandar também conta como dispensar.
 */
export function FeedbackCard({
  completed,
  planId,
  sessionActive,
}: {
  completed: number;
  planId: string;
  sessionActive: boolean;
}) {
  // undefined = ainda não leu o localStorage (evita flash na hidratação)
  const [ackedAt, setAckedAt] = useState<number | null | undefined>(undefined);
  useEffect(() => setAckedAt(getFeedbackAck()), []);

  if (!CONTACT_URL || ackedAt === undefined) return null;
  if (!shouldPromptFeedback({ completed, ackedAt, sessionActive })) return null;

  const close = () => {
    ackFeedback(completed);
    setAckedAt(completed);
  };
  const send = () => {
    // montado no toque: lê navigator, que não existe no prerender
    const link = feedbackLink(planId, completed);
    close();
    if (link) openFeedback(link);
  };

  return (
    <section className="anim-fade-in flex gap-3 rounded-card border border-dashed border-border px-4 py-3">
      <MessageIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Algo te atrapalhou ou faltou no app?</p>
        <p className="mt-0.5 text-xs text-muted">
          Me manda uma mensagem. Eu leio tudo e é daí que sai o que muda no app.
        </p>
        <div className="mt-2 flex gap-5">
          <button
            type="button"
            onClick={send}
            className="tap text-sm font-medium text-ac"
          >
            Mandar mensagem
          </button>
          <button type="button" onClick={close} className="tap text-sm text-muted">
            Agora não
          </button>
        </div>
      </div>
    </section>
  );
}
