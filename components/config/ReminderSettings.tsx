"use client";

import { useEffect, useState } from "react";
import { getReminder, setReminder } from "@/lib/utils/profile";
import { reminderCopy } from "@/lib/domain/reminderCopy";
import { localDateKey } from "@/lib/utils/date";

type Permission = "default" | "granted" | "denied" | "unsupported";

function currentPermission(): Permission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as Permission;
}

/**
 * Lembrete de treino (5.1). Guarda horário/ativação e pede permissão de
 * notificação. A entrega em background depende da plataforma (iOS PWA é pouco
 * confiável); aqui garantimos permissão, preferências e uma notificação de
 * teste — degradando sem quebrar quando não há suporte.
 */
export function ReminderSettings() {
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState("18:00");
  const [perm, setPerm] = useState<Permission>("default");

  useEffect(() => {
    const r = getReminder();
    setEnabled(r.enabled);
    setTime(r.time);
    setPerm(currentPermission());
  }, []);

  const persist = (next: { enabled?: boolean; time?: string }) => {
    const value = { enabled, time, ...next };
    setEnabled(value.enabled);
    setTime(value.time);
    setReminder(value);
  };

  const toggle = async () => {
    if (!enabled && perm !== "granted") {
      if (perm === "unsupported") return;
      const result = await Notification.requestPermission();
      setPerm(result as Permission);
      if (result !== "granted") return; // sem permissão, não ativa
    }
    persist({ enabled: !enabled });
  };

  const test = () => {
    if (perm !== "granted") return;
    new Notification("Treinei — hora do treino", {
      body: reminderCopy(localDateKey()),
    });
  };

  return (
    <section className="mt-3 rounded-card border border-border bg-surface px-4 py-4">
      <h2 className="font-semibold">Lembrete de treino</h2>
      {perm === "unsupported" ? (
        <p className="mt-1 text-sm text-muted">
          Este navegador não suporta notificações.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Um empurrão no horário que você escolher. Em alguns dispositivos (iOS
            instalado) a entrega em segundo plano pode falhar.
          </p>

          <div className="mt-3 flex items-center justify-between">
            <label htmlFor="reminder-on" className="text-sm font-medium">
              Ativar lembrete
            </label>
            <button
              id="reminder-on"
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={toggle}
              className="tap relative h-6 w-11 rounded-full transition-colors"
              style={{ background: enabled ? "var(--ac)" : "var(--color-surface2)" }}
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                style={{ transform: enabled ? "translateX(22px)" : "translateX(2px)" }}
              />
            </button>
          </div>

          {perm === "denied" && (
            <p className="mt-2 text-xs" style={{ color: "var(--color-warn)" }}>
              Permissão de notificação bloqueada. Libere nas configurações do
              navegador para ativar.
            </p>
          )}

          <label htmlFor="reminder-time" className="mt-4 block text-sm font-medium">
            Horário
          </label>
          <input
            id="reminder-time"
            type="time"
            value={time}
            onChange={(e) => persist({ time: e.target.value })}
            className="tnum mt-2 rounded-xl border border-border bg-surface2 px-3 py-2.5 text-base outline-none focus:border-muted"
          />

          {perm === "granted" && (
            <button
              type="button"
              onClick={test}
              className="tap mt-3 block w-full rounded-xl border border-border bg-surface2 py-2.5 text-sm font-medium"
            >
              Enviar notificação de teste
            </button>
          )}
        </>
      )}
    </section>
  );
}
