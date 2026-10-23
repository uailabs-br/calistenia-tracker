"use client";

import { useEffect, useId, useState } from "react";
import { skills, type SkillCategory } from "@/lib/plan/skills";
import { getAiGoals, setAiGoals, getAiNotes, setAiNotes } from "@/lib/utils/aiPersona";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";

const CAT_ACCENT: Record<SkillCategory, string> = {
  Puxar: "#8174e8",
  Empurrar: "#7fd1ae",
  Core: "#f2b366",
  Pernas: "#e88fb0",
};

const CATEGORIES: SkillCategory[] = ["Puxar", "Empurrar", "Core", "Pernas"];

/**
 * Objetivos (skills prioritárias) + notas livres pra persona da IA. Mora em dois
 * lugares — Ajustes e o passo 1 do fluxo com IA — e grava direto no localStorage,
 * então os dois sempre mostram o mesmo.
 *
 * `notesCollapsed`: no fluxo as notas começam fechadas, pra tela ter uma pergunta
 * só. Abrem sozinhas se já houver texto.
 */
export function GoalPicker({
  notesCollapsed = false,
  onGoalsChange,
}: {
  notesCollapsed?: boolean;
  onGoalsChange?: (count: number) => void;
}) {
  const notesId = useId();
  const [goals, setGoals] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [notesOpen, setNotesOpen] = useState(!notesCollapsed);

  useEffect(() => {
    const g = getAiGoals();
    const n = getAiNotes();
    setGoals(g);
    setNotes(n);
    if (n) setNotesOpen(true);
    onGoalsChange?.(g.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) => {
    const next = goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id];
    setGoals(next);
    setAiGoals(next);
    onGoalsChange?.(next.length);
  };

  return (
    <>
      {CATEGORIES.map((cat) => {
        const items = skills.filter((s) => s.category === cat);
        if (items.length === 0) return null;
        const accent = CAT_ACCENT[cat];
        return (
          <div key={cat} className="mb-5">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">{cat}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((skill) => {
                const active = goals.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggle(skill.id)}
                    aria-pressed={active}
                    className="tap flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium active:scale-[0.97]"
                    style={
                      active
                        ? { background: accent, borderColor: accent, color: "var(--color-on-accent)" }
                        : { borderColor: "var(--color-border)", color: "var(--color-text)" }
                    }
                  >
                    {active && <CheckIcon className="h-3.5 w-3.5" />}
                    {skill.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {notesOpen ? (
        <>
          <label htmlFor={notesId} className="mt-2 block text-sm font-medium">
            Algo mais a considerar?
          </label>
          <p className="mt-0.5 text-xs text-muted">
            Lesão, restrição, equipamento disponível — o que os objetivos acima não cobrem.
          </p>
          <textarea
            id={notesId}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setAiNotes(e.target.value);
            }}
            placeholder="ex: ombro direito sensível, sem acesso a paralelas essa semana…"
            rows={3}
            autoFocus={notesCollapsed}
            className="mt-2 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-base outline-none placeholder:text-muted focus:border-muted"
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setNotesOpen(true)}
          className="tap -ml-1 flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-sm text-muted"
        >
          <PlusIcon className="h-4 w-4" />
          Lesão, equipamento ou outra coisa
        </button>
      )}
    </>
  );
}
