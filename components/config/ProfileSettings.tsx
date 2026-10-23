"use client";

import { useEffect, useState } from "react";
import { plan } from "@/lib/plan/loader";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { MinusIcon, PlusIcon, TargetIcon, UserIcon } from "@/components/ui/icons";
import { haptic } from "@/lib/utils/haptics";
import {
  getProfileName,
  setProfileName,
  getWeekGoal,
  setWeekGoal,
  WEEK_GOAL_MAX,
} from "@/lib/utils/profile";

/** "Você": nome e meta semanal. Os dois vivem no localStorage, não no Dexie. */
export function ProfileSettings() {
  const [name, setName] = useState("");
  // null até o mount: o padrão da meta é o nº de treinos do plano (regra 10).
  const [goal, setGoal] = useState<number | null>(null);

  useEffect(() => {
    setName(getProfileName());
    setGoal(getWeekGoal() ?? plan.workouts.length);
  }, []);

  const changeGoal = (delta: number) => {
    if (goal === null) return;
    const next = Math.min(WEEK_GOAL_MAX, Math.max(1, goal + delta));
    if (next === goal) return;
    haptic();
    setGoal(next);
    // Igual ao padrão do plano = sem override, pra meta acompanhar o plano se ele mudar.
    setWeekGoal(next === plan.workouts.length ? null : next);
  };

  return (
    <SettingsGroup title="Você">
      <SettingsRow
        icon={UserIcon}
        label="Nome"
        trailing={
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setProfileName(e.target.value);
            }}
            placeholder="Como te chamar"
            aria-label="Seu nome"
            maxLength={30}
            autoComplete="given-name"
            className="w-40 min-w-0 bg-transparent text-right text-base outline-none placeholder:text-muted"
          />
        }
      />
      <SettingsRow
        icon={TargetIcon}
        label="Meta semanal"
        trailing={
          <span className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => changeGoal(-1)}
              disabled={goal === null || goal <= 1}
              aria-label="Diminuir meta semanal"
              className="tap flex items-center justify-center rounded-full text-muted disabled:opacity-30"
            >
              <MinusIcon className="h-4 w-4" />
            </button>
            <span className="tnum min-w-[2ch] text-center text-base" aria-live="polite">
              {goal ?? "–"}
            </span>
            <button
              type="button"
              onClick={() => changeGoal(1)}
              disabled={goal === null || goal >= WEEK_GOAL_MAX}
              aria-label="Aumentar meta semanal"
              className="tap flex items-center justify-center rounded-full text-muted disabled:opacity-30"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </span>
        }
      />
    </SettingsGroup>
  );
}
