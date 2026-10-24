"use client";

import { useEffect, useId, useState } from "react";
import { skills, SKILL_CATEGORIES } from "@/lib/plan/skills";
import { getAiGoals, setAiGoals, getAiNotes, setAiNotes } from "@/lib/utils/aiPersona";
import { CheckIcon, PlusIcon } from "@/components/ui/icons";
import { accentVars, CATEGORY_ACCENT } from "@/components/ui/accent";

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
      {SKILL_CATEGORIES.map((cat) => {
        const items = skills.filter((s) => s.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="mb-5" style={accentVars(CATEGORY_ACCENT[cat])}>
            <p className="eyebrow-lg mb-2">{cat}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((skill) => {
                const active = goals.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggle(skill.id)}
                    aria-pressed={active}
                    className="toggle tap flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-text active:scale-[0.97]"
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
            className="field mt-2 py-2.5"
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setNotesOpen(true)}
          className="tap -ml-1 flex items-center gap-1.5 rounded-lg px-1 text-sm text-muted"
        >
          <PlusIcon className="h-4 w-4" />
          Lesão, equipamento ou outra coisa
        </button>
      )}
    </>
  );
}
