"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import { shortSkillName, type CampaignItem } from "@/lib/domain/campaign";
import { formatCriteria, getCriteria } from "@/lib/plan/skills";
import { useModalA11y } from "@/lib/utils/useModalA11y";
import { haptic } from "@/lib/utils/haptics";
import { Portal } from "@/components/ui/Portal";
import { accentVars } from "@/components/ui/accent";
import { SkillLadder } from "./SkillLadder";

const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/**
 * Cena de nível concluído, no molde da tela de recorde (flash, cortes secos),
 * mas na cor do treino: recorde é número, isto é a escada andando. Abre quando
 * a pessoa toca em "Continuar" no fim do treino, não sozinha: aparecer logo
 * depois do resumo confundia. Com dois níveis fechados no mesmo treino, uma
 * cena por vez (`index` de `total`).
 */
export function LevelUpMoment({
  item,
  accent,
  index,
  total,
  onAdjust,
  onLater,
}: {
  item: CampaignItem;
  accent: string;
  index: number;
  total: number;
  onAdjust: () => void;
  onLater: () => void;
}) {
  const titleId = useId();
  const ref = useModalA11y<HTMLDivElement>(onLater);
  const [flash, setFlash] = useState(true);

  useEffect(() => {
    haptic(60);
    const off = window.setTimeout(() => setFlash(false), 120);
    return () => window.clearTimeout(off);
  }, []);

  const next = item.ladder[item.level] ?? null;
  const nextCriteria = next ? getCriteria(item.skillId, item.level + 1) : undefined;

  return (
    <Portal>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`fixed inset-0 z-[60] flex flex-col overflow-y-auto px-5 outline-none ${flash ? "bg-ac" : "bg-bg"}`}
        style={{
          ...accentVars(accent),
          paddingTop: "calc(env(safe-area-inset-top) + 2.5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
        }}
      >
        <div
          className={`mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-[18px] ${flash ? "invisible" : ""}`}
        >
          <div className="pr-cut flex items-center justify-between gap-3" style={at(0)}>
            <span className="bg-ac px-2 py-1 font-mono text-xs font-medium uppercase tracking-[0.14em] text-on-accent">
              Nível concluído
            </span>
            {total > 1 && (
              <span className="font-mono text-xs text-muted">
                {index + 1} de {total}
              </span>
            )}
          </div>
          <p className="pr-cut font-mono text-sm uppercase leading-snug tracking-[0.14em]" style={at(180)}>
            {shortSkillName(item.skillName)} · {item.ladder[item.level - 1]}
          </p>
          <p
            id={titleId}
            className="pr-slam display-caps text-display-hero leading-[0.8] text-ac"
            style={at(380)}
          >
            Nível {item.level}
          </p>
          <span className="pr-wipe block h-2 w-full bg-ac" style={at(620)} />
          <div className="pr-cut" style={at(900)}>
            <SkillLadder names={item.ladder} level={item.level} mode="levelUp" />
          </div>
          <div className="pr-cut" style={at(1700)}>
            {next ? (
              <>
                <p className="eyebrow">Próximo nível · desbloqueado</p>
                <h2 className="display mt-1 text-display leading-tight">{next}</h2>
                {nextCriteria && (
                  <p className="mt-2 text-sm leading-snug text-muted">{formatCriteria(nextCriteria)}</p>
                )}
              </>
            ) : (
              <>
                <p className="eyebrow">Escada completa</p>
                <h2 className="display mt-1 text-display leading-tight">{item.skillName}</h2>
              </>
            )}
          </div>
        </div>
        <div className="pr-cut mx-auto mt-6 flex w-full max-w-md flex-col gap-1" style={at(2000)}>
          <button
            type="button"
            onClick={onAdjust}
            className="btn-primary tap w-full rounded-xl py-3.5 font-medium"
          >
            Ajustar plano agora
          </button>
          <button type="button" onClick={onLater} className="tap w-full text-sm text-muted">
            Ajustar mais tarde
          </button>
        </div>
      </div>
    </Portal>
  );
}
