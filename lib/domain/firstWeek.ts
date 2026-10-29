import { daysBetween } from "@/lib/utils/date";

export interface FirstWeekItem {
  id: string;
  label: string;
  done: boolean;
}

export interface FirstWeek {
  items: FirstWeekItem[];
  done: number;
}

/**
 * Lista "Sua primeira semana": montar o plano (já feito) e cada treino do plano.
 * Começar com um passo marcado é o efeito do progresso concedido (Nunes e Drèze,
 * 2006): cartão de fidelidade que já vinha com 2 carimbos foi completado por 34%
 * dos clientes, contra 19% do cartão vazio.
 *
 * Vale até a pessoa fazer todos os treinos do plano ou passarem 7 dias do
 * primeiro, o que vier antes. Depois disso, `null`: a home volta pra constância.
 */
export function firstWeek(input: {
  sessions: readonly { date: string; workout_id: string | null; source: string }[];
  workouts: readonly { id: string; label: string; title: string }[];
  today: string;
}): FirstWeek | null {
  const { sessions, workouts, today } = input;
  if (workouts.length === 0) return null;
  const first = sessions.map((s) => s.date).sort()[0];
  if (first && daysBetween(first, today) >= 7) return null;

  const doneIds = new Set(
    sessions.filter((s) => s.source === "plan" && s.workout_id).map((s) => s.workout_id)
  );
  const items: FirstWeekItem[] = [
    { id: "plano", label: "Montar o plano", done: true },
    ...workouts.map((w) => ({
      id: w.id,
      label: `Treino ${w.label} · ${w.title}`,
      done: doneIds.has(w.id),
    })),
  ];
  if (items.every((i) => i.done)) return null;
  return { items, done: items.filter((i) => i.done).length };
}
