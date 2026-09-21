"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { CustomExercise } from "@/lib/db/schema";
import {
  deleteCustomExercise,
  getCustomExercises,
} from "@/lib/db/repositories/customExercises";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

/** Exercícios que você criou durante o treino: ver e apagar. */
export function CustomExercisesCard({ className = "" }: { className?: string }) {
  const { toast } = useToast();
  const items = useLiveQuery(() => getCustomExercises(), []);
  const [toDelete, setToDelete] = useState<CustomExercise | null>(null);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteCustomExercise(toDelete.id);
      toast({ message: `${toDelete.name} apagado` });
    } catch {
      toast({ message: "Não foi possível apagar.", variant: "error" });
    }
    setToDelete(null);
  };

  return (
    <>
      <CollapsibleCard title="Meus exercícios" className={className}>
        {!items || items.length === 0 ? (
          <p className="mt-1 text-sm text-muted">
            Você ainda não criou nenhum. Durante o treino, toque em “Adicionar
            exercício” e depois em “criar novo”.
          </p>
        ) : (
          <ul className="mt-1 flex flex-col">
            {items.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted">
                    {c.category} · {c.unit === "reps" ? "repetições" : "tempo"}
                    {c.per_side ? " · por lado" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setToDelete(c)}
                  className="tap shrink-0 rounded-lg px-2 py-1 font-mono text-[11px] text-muted"
                >
                  apagar
                </button>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleCard>

      {toDelete && (
        <ConfirmDialog
          title={`Apagar “${toDelete.name}”?`}
          message="Ele some da busca de novos treinos. O histórico que já tem esse exercício continua, com o nome de quando foi feito."
          confirmLabel="Apagar"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
