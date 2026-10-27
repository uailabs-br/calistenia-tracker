"use client";

import { useEffect, useState } from "react";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { Switch } from "@/components/ui/Switch";
import { MonitorIcon, ScanlinesIcon } from "@/components/ui/icons";
import { haptic } from "@/lib/utils/haptics";
import {
  getThemePref,
  setThemePref,
  TACTICAL_TONES,
  TONE_LABEL,
  type ThemePref,
} from "@/lib/utils/theme";

/**
 * "Aparência": estilo padrão ou tático e, no tático, a cor única e as scanlines.
 * A troca vale na hora (atributos do <html>), sem recarregar.
 */
export function ThemeSettings() {
  // null até o mount: a preferência mora no localStorage (regra 10).
  const [pref, setPref] = useState<ThemePref | null>(null);
  useEffect(() => setPref(getThemePref()), []);

  const update = (patch: Partial<ThemePref>) => {
    if (!pref) return;
    const next = { ...pref, ...patch };
    haptic();
    setPref(next);
    setThemePref(next);
  };

  const tactical = pref?.style === "tatico";

  return (
    <SettingsGroup
      title="Aparência"
      footer={tactical ? "No tático, todos os treinos ficam na cor escolhida." : undefined}
    >
      <SettingsRow
        icon={MonitorIcon}
        label="Estilo"
        trailing={
          <span className="flex shrink-0 gap-1.5" role="group" aria-label="Estilo">
            {(["padrao", "tatico"] as const).map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={pref?.style === style}
                disabled={!pref}
                onClick={() => update({ style })}
                className="toggle tap rounded-full px-3 text-sm text-muted"
              >
                {style === "padrao" ? "Padrão" : "Tático"}
              </button>
            ))}
          </span>
        }
      />

      {tactical && pref && (
        <>
          <div className="border-b border-border px-4 py-3">
            <p className="text-md font-medium">Cor</p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Cor do tema tático">
              {TACTICAL_TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  aria-pressed={pref.tone === tone}
                  onClick={() => update({ tone })}
                  className="toggle tap flex items-center gap-2 rounded-full px-3 text-sm text-muted"
                >
                  {/* a amostra vem do mesmo token que pinta o tema; a borda segue o
                      texto pra não sumir no chip marcado, que tem o mesmo fundo */}
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 border border-current"
                    style={{ background: `var(--tone-${tone})` }}
                  />
                  {TONE_LABEL[tone]}
                </button>
              ))}
            </div>
          </div>
          <SettingsRow
            icon={ScanlinesIcon}
            label="Scanlines"
            description="Linhas de monitor antigo por cima da tela. Desligue se atrapalhar a leitura no treino."
            trailing={
              <Switch
                checked={pref.scanlines}
                onToggle={() => update({ scanlines: !pref.scanlines })}
                label="Scanlines"
              />
            }
          />
        </>
      )}
    </SettingsGroup>
  );
}
