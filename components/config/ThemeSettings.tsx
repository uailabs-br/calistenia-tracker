"use client";

import { useEffect, useState } from "react";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { Switch } from "@/components/ui/Switch";
import { ChevronDownIcon, MonitorIcon, ScanlinesIcon } from "@/components/ui/icons";
import { haptic } from "@/lib/utils/haptics";
import {
  FUTURE_TONE_LABEL,
  FUTURE_TONES,
  getThemePref,
  setThemePref,
  TACTICAL_TONES,
  TONE_LABEL,
  type ThemePref,
  type ThemeStyle,
} from "@/lib/utils/theme";

const STYLE_LABEL: Record<ThemeStyle, string> = {
  padrao: "Padrão",
  tatico: "Tático",
  futurista: "Futurista",
  espaco: "Espaço",
};

/**
 * "Aparência": o estilo e, no tático e no futurista, a cor única (e as scanlines
 * do tático). O espaço tem cor fixa. A troca vale na hora (atributos do <html>),
 * sem recarregar. Estilo e cor ficam recolhidos numa linha cada.
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

  const style = pref?.style;

  return (
    <SettingsGroup title="Aparência">
      <StylePicker value={style} onPick={(s) => update({ style: s })} />

      {pref && style === "tatico" && (
        <>
          <TonePicker
            label="Cor do tema tático"
            tones={TACTICAL_TONES}
            labels={TONE_LABEL}
            swatch={(t) => `var(--tone-${t})`}
            value={pref.tone}
            onPick={(tone) => update({ tone })}
          />
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

      {pref && style === "futurista" && (
        <TonePicker
          label="Cor do tema futurista"
          tones={FUTURE_TONES}
          labels={FUTURE_TONE_LABEL}
          swatch={(t) => `var(--ftone-${t})`}
          value={pref.futureTone}
          onPick={(futureTone) => update({ futureTone })}
        />
      )}
    </SettingsGroup>
  );
}

/**
 * Estilo recolhido numa linha (nome do atual); o toque abre os quatro e escolher
 * fecha de novo, como a cor. `value` vazio até o mount (regra 10).
 */
function StylePicker({
  value,
  onPick,
}: {
  value: ThemeStyle | undefined;
  onPick: (style: ThemeStyle) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        disabled={!value}
        className="tap flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface2"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface2">
          <MonitorIcon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1 text-md font-medium">Estilo</span>
        <span className="shrink-0 text-sm text-muted">{value ? STYLE_LABEL[value] : ""}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        // Grade 2×2: quatro estilos numa linha estouravam "Futurista" em tela de 360px.
        <div className="anim-fade-in grid grid-cols-2 gap-1.5 px-4 pb-3" role="group" aria-label="Estilo">
          {(Object.keys(STYLE_LABEL) as ThemeStyle[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={value === s}
              onClick={() => {
                onPick(s);
                setOpen(false);
              }}
              className="toggle tap rounded-full px-3 py-1.5 text-sm text-muted"
            >
              {STYLE_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Cor recolhida numa linha (amostra + nome); o toque abre as opções e escolher
 * fecha de novo. Aberta o tempo todo, a lista de chips ocupava meia tela.
 */
function TonePicker<T extends string>({
  label,
  tones,
  labels,
  swatch,
  value,
  onPick,
}: {
  label: string;
  tones: readonly T[];
  labels: Record<T, string>;
  swatch: (tone: T) => string;
  value: T;
  onPick: (tone: T) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface2"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface2">
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 rounded-full"
            style={{ background: swatch(value) }}
          />
        </span>
        <span className="min-w-0 flex-1 text-md font-medium">Cor</span>
        <span className="shrink-0 text-sm text-muted">{labels[value]}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="anim-fade-in flex flex-wrap gap-2 px-4 pb-3" role="group" aria-label={label}>
          {tones.map((tone) => (
            <button
              key={tone}
              type="button"
              aria-pressed={value === tone}
              onClick={() => {
                onPick(tone);
                setOpen(false);
              }}
              className="toggle tap flex items-center gap-2 rounded-full px-3 text-sm text-muted"
            >
              {/* a amostra vem do mesmo token que pinta o tema; a borda segue o
                  texto pra não sumir no chip marcado, que tem o mesmo fundo */}
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full border border-current"
                style={{ background: swatch(tone) }}
              />
              {labels[tone]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
