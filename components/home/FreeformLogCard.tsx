"use client";

import { useState } from "react";
import type { Session } from "@/lib/db/schema";
import {
  createFreeformSession,
  softDeleteSession,
} from "@/lib/db/repositories/sessions";
import { FreeformLogModal, type LoggableDay } from "./FreeformLogModal";
import { PlusIcon, CheckIcon } from "@/components/ui/icons";

/**
 * CTA de treino avulso na home. `freeformSessionToday` é a sessão avulsa já
 * concluída hoje (se houver) — some o CTA de hoje mas mantém aberto o de
 * dias anteriores. `loggableDays` são os dias (dentre hoje/ontem/anteontem)
 * ainda sem nenhum treino — cobre esquecer de registrar no dia certo
 * (ver app/page.tsx pras regras de visibilidade).
 */
export function FreeformLogCard({
  freeformSessionToday,
  loggableDays,
}: {
  freeformSessionToday: Session | null;
  loggableDays: LoggableDay[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {freeformSessionToday && (
        <div className="anim-fade-in flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3">
          <span className="flex items-center gap-2 text-sm">
            <CheckIcon className="h-4 w-4 text-muted" />
            Treino avulso registrado hoje
          </span>
          <button
            type="button"
            onClick={() => softDeleteSession(freeformSessionToday.id)}
            className="tap text-sm text-muted underline-offset-2 active:opacity-70"
          >
            desfazer
          </button>
        </div>
      )}

      {loggableDays.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="tap flex w-full items-center justify-center gap-2 rounded-card border border-dashed border-border py-3 text-sm font-medium text-muted active:scale-[0.99]"
          >
            <PlusIcon className="h-4 w-4" />
            Treinei fora do programa
          </button>
          {open && (
            <FreeformLogModal
              days={loggableDays}
              onCancel={() => setOpen(false)}
              onConfirm={async (daysAgo, durationMinutes) => {
                await createFreeformSession(durationMinutes, daysAgo);
                setOpen(false);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
