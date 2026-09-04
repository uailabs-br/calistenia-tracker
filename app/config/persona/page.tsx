"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { skills, type SkillCategory } from "@/lib/plan/skills";
import { getAiGoals, setAiGoals, getAiNotes, setAiNotes } from "@/lib/utils/aiPersona";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChevronLeftIcon, CheckIcon } from "@/components/ui/icons";

const CAT_ACCENT: Record<SkillCategory, string> = {
  Puxar: "#a89cff",
  Empurrar: "#7fd1ae",
  Core: "#f2b366",
  Pernas: "#e88fb0",
};

const CATEGORIES: SkillCategory[] = ["Puxar", "Empurrar", "Core", "Pernas"];

const BackLink = () => (
  <Link
    href="/config"
    className="tap -ml-2 mb-2 inline-flex items-center gap-1 pt-6 text-sm text-muted"
  >
    <ChevronLeftIcon className="h-4 w-4" />
    Config
  </Link>
);

/** Objetivos (skills prioritárias) + notas livres pra montar a persona da IA. */
export default function PersonaPage() {
  const [goals, setGoals] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setGoals(getAiGoals());
    setNotes(getAiNotes());
  }, []);

  const toggle = (id: string) => {
    const next = goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id];
    setGoals(next);
    setAiGoals(next);
  };

  return (
    <div className="px-4">
      <BackLink />
      <PageHeader title="Meus objetivos" subtitle="pra montar o prompt da IA" />
      <p className="-mt-2 mb-4 text-sm text-muted">
        Marca as skills que são prioridade agora. O app monta o texto de
        persona sozinho pra colar na IA junto com o esquema e o histórico.
      </p>

      {CATEGORIES.map((cat) => {
        const items = skills.filter((s) => s.category === cat);
        if (items.length === 0) return null;
        const accent = CAT_ACCENT[cat];
        return (
          <div key={cat} className="mb-5">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">
              {cat}
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((skill) => {
                const active = goals.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggle(skill.id)}
                    aria-pressed={active}
                    className="tap flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium active:scale-[0.97]"
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

      <label htmlFor="ai-notes" className="mt-2 block text-sm font-medium">
        Algo mais a considerar?
      </label>
      <p className="mt-0.5 text-xs text-muted">
        Lesão, restrição, equipamento disponível — o que os objetivos acima
        não cobrem.
      </p>
      <textarea
        id="ai-notes"
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setAiNotes(e.target.value);
        }}
        placeholder="ex: ombro direito sensível, sem acesso a paralelas essa semana…"
        rows={3}
        className="mt-2 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
      />

      <div className="h-8" />
    </div>
  );
}
