"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { CustomExercise } from "@/lib/db/schema";
import {
  deleteCustomExercise,
  getCustomExercises,
} from "@/lib/db/repositories/customExercises";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { haptic } from "@/lib/utils/haptics";

/** Exercícios que você criou durante o treino: ver e apagar. */
export function CustomExercisesCard() {
  const { toast } = useToast();
  const items = useLiveQuery(() => getCustomExercises(), []);
  const [toDelete, setToDelete] = useState<CustomExercise | null>(null);

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteCustomExercise(toDelete.id);
      haptic();
      toast({ message: `${toDelete.name} apagado` });
    } catch {
      toast({ message: "Não foi possível apagar.", variant: "error" });
    }
    setToDelete(null);
  };

  return (
    <>
      {!items || items.length === 0 ? (
        <p className="px-1 text-sm text-muted">
          Você ainda não criou nenhum. Durante o treino, toque em “Adicionar
          exercício” e depois em “criar novo”.
        </p>
      ) : (
        <SettingsGroup>
          {items.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-medium leading-snug">{c.name}</p>
                <p className="text-xs text-muted">
                  {c.category} · {c.unit === "reps" ? "repetições" : "tempo"}
                  {c.per_side ? " · por lado" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setToDelete(c)}
                aria-label={`Apagar ${c.name}`}
                className="tap shrink-0 rounded-lg px-3 text-sm"
                style={{ color: "var(--color-danger)" }}
              >
                Apagar
              </button>
            </div>
          ))}
        </SettingsGroup>
      )}

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
