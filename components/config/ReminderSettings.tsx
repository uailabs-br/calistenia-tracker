"use client";

import { useEffect, useState } from "react";
import { getReminder, setReminder } from "@/lib/utils/profile";

type Permission = "default" | "granted" | "denied" | "unsupported";

function currentPermission(): Permission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as Permission;
}

/**
 * Lembrete de treino (5.1). Guarda horário/ativação e pede permissão de
 * notificação. A entrega em background depende da plataforma; aqui garantimos
 * permissão e preferências, degradando sem quebrar quando não há suporte.
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
    if (perm === "unsupported") return;
    if (!enabled && perm !== "granted") {
      const result = await Notification.requestPermission();
      setPerm(result as Permission);
      if (result !== "granted") return; // sem permissão, não ativa
    }
    persist({ enabled: !enabled });
  };

  return (
    <section className="mb-3 rounded-card border border-border bg-surface px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Lembrete de treino</h2>
          <p className="mt-0.5 text-sm text-muted">
            {perm === "unsupported"
              ? "Não suportado neste navegador."
              : "Um empurrão no horário que você escolher."}
          </p>
        </div>

        {perm !== "unsupported" && (
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Ativar lembrete de treino"
            onClick={toggle}
            className="relative inline-flex shrink-0 items-center transition-colors"
            style={{
              width: 44,
              height: 24,
              borderRadius: 9999,
              border: "1px solid var(--color-border)",
              background: enabled ? "var(--ac)" : "var(--color-surface2)",
            }}
          >
            <span
              className="block bg-white shadow transition-transform"
              style={{
                width: 18,
                height: 18,
                borderRadius: 9999,
                transform: enabled ? "translateX(23px)" : "translateX(3px)",
              }}
            />
          </button>
        )}
      </div>

      {perm === "denied" && (
        <p className="mt-3 text-xs" style={{ color: "var(--color-warn)" }}>
          Permissão de notificação bloqueada. Libere nas configurações do
          navegador para ativar.
        </p>
      )}

      {enabled && perm === "granted" && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <label htmlFor="reminder-time" className="text-sm font-medium">
            Horário
          </label>
          <input
            id="reminder-time"
            type="time"
            value={time}
            onChange={(e) => persist({ time: e.target.value })}
            className="tnum rounded-xl border border-border bg-surface2 px-3 py-2 text-base outline-none focus:border-muted"
          />
        </div>
      )}
    </section>
  );
}
