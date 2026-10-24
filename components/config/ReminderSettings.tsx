"use client";

import { useEffect, useState } from "react";
import { getReminder, setReminder } from "@/lib/utils/profile";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { Switch } from "@/components/ui/Switch";
import { BellIcon, TimerIcon } from "@/components/ui/icons";
import { haptic } from "@/lib/utils/haptics";

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
    haptic();
    persist({ enabled: !enabled });
  };

  return (
    <SettingsGroup
      title="Lembrete"
      footer={
        perm === "denied" ? (
          <span className="text-warn">
            O navegador bloqueou as notificações. Libere nas configurações do
            navegador para ativar o lembrete.
          </span>
        ) : undefined
      }
    >
      <SettingsRow
        icon={BellIcon}
        label="Lembrete de treino"
        description={
          perm === "unsupported" ? "Este navegador não permite lembretes." : undefined
        }
        trailing={
          perm !== "unsupported" ? (
            <Switch checked={enabled} onToggle={toggle} label="Ativar lembrete de treino" />
          ) : undefined
        }
      />
      {enabled && perm === "granted" && (
        <SettingsRow
          icon={TimerIcon}
          label="Horário"
          trailing={
            <input
              id="reminder-time"
              type="time"
              value={time}
              aria-label="Horário do lembrete"
              onChange={(e) => persist({ time: e.target.value })}
              className="tnum rounded-xl border border-border bg-surface2 px-3 py-2 text-base outline-none focus:border-muted"
            />
          }
        />
      )}
    </SettingsGroup>
  );
}
