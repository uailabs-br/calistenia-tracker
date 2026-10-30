"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { plan } from "@/lib/plan/loader";
import { clearPlanOverride, hasPlanOverride } from "@/lib/plan/importPlan";
import { getLastPlanWorkoutId } from "@/lib/db/repositories/sessions";
import { getCustomExercises } from "@/lib/db/repositories/customExercises";
import { queueFrom } from "@/lib/domain/nextWorkout";
import { getAiGoals } from "@/lib/utils/aiPersona";
import { usePlanReady } from "@/lib/utils/usePlanReady";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { WorkoutCard, WorkoutSheet } from "@/components/plan/WorkoutCard";
import {
  FlagIcon,
  HistoryIcon,
  ListIcon,
  ProgressionIcon,
  SlidersIcon,
  SparkleIcon,
  TrophyIcon,
} from "@/components/ui/icons";

/**
 * Aba Treino: o plano em vigor primeiro (é o que se consulta), depois pra onde
 * ele vai (progressão e skills) e, por último, como mudar. A configuração do
 * treino morava em Ajustes, misturada com backup e instalação.
 */
export default function PlanoPage() {
  const { toast } = useToast();
  // `plan` vem do localStorage: nada derivado dele antes do mount (regra 10).
  const ready = usePlanReady();
  const [hasOverride, setHasOverride] = useState(false);
  const [aiGoalsCount, setAiGoalsCount] = useState(0);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const rowRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setHasOverride(hasPlanOverride());
    setAiGoalsCount(getAiGoals().length);
  }, []);

  const lastPlanId = useLiveQuery(() => getLastPlanWorkoutId(), []);
  const customCount = useLiveQuery(async () => (await getCustomExercises()).length, []);
  const nextId =
    ready && lastPlanId !== undefined ? queueFrom(lastPlanId, plan.workouts)[0]?.id : undefined;
  const openWorkout = openId ? plan.workouts.find((w) => w.id === openId) : undefined;

  // A fila abre no próximo treino (o snap deixa a ponta do anterior no recuo,
  // e ela mostra que rola pros dois lados). Sem animação: é a posição inicial.
  useEffect(() => {
    const row = rowRef.current;
    const el = nextId ? row?.querySelector<HTMLElement>(`[data-workout="${nextId}"]`) : null;
    if (!row || !el) return;
    row.scrollLeft = el.offsetLeft - row.offsetLeft - 16;
  }, [nextId]);

  const restore = () => {
    setConfirmRestore(false);
    clearPlanOverride();
    toast({ message: "Voltando ao treino original", variant: "success" });
    // O plano é lido uma vez no boot: só recarregando ele troca de verdade.
    setTimeout(() => window.location.assign("/plano"), 450);
  };

  const count = plan.workouts.length;

  return (
    <div className="px-4">
      <PageHeader title="Treino" subtitle={ready ? plan.name : undefined} />

      {/* Fila horizontal: o plano inteiro numa linha, os exercícios abrem na folha.
          Altura mínima porque os cards só chegam depois do mount. */}
      <ul
        ref={rowRef}
        className="no-scrollbar -mx-4 mb-2 flex min-h-[7.5rem] snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [&>li]:snap-start"
      >
        {ready &&
          plan.workouts.map((w) => (
            <WorkoutCard
              key={w.id}
              workout={w}
              next={w.id === nextId}
              onOpen={() => setOpenId(w.id)}
            />
          ))}
      </ul>
      <p className="mb-6 px-1 text-xs text-muted">
        {ready
          ? `${count} ${count === 1 ? "treino" : "treinos"} em sequência. Depois do último, volta pro primeiro.`
          : ""}
      </p>

      <SettingsGroup title="Progressão">
        <SettingsRow
          icon={TrophyIcon}
          label="Exercícios"
          description="Quem já pode subir de nível e quem pede cuidado"
          href="/progressao"
        />
        <SettingsRow
          icon={ProgressionIcon}
          label="Skills"
          description="Onde você está em cada sequência de progressões"
          href="/skills"
        />
      </SettingsGroup>

      <SettingsGroup title="Mudar o treino">
        <SettingsRow
          icon={SparkleIcon}
          label="Montar treino com IA"
          description="Criar um novo ou trazer o que você já faz"
          href="/config/plano"
        />
        <SettingsRow
          icon={FlagIcon}
          label="Meus objetivos"
          value={aiGoalsCount > 0 ? `${aiGoalsCount} escolhidos` : "nenhum ainda"}
          href="/config/persona"
        />
        <SettingsRow icon={SlidersIcon} label="Nível e equipamento" href="/onboarding/refazer" />
        <SettingsRow
          icon={ListIcon}
          label="Meus exercícios"
          value={customCount ? String(customCount) : undefined}
          href="/config/exercicios"
        />
        {hasOverride && (
          <SettingsRow
            icon={HistoryIcon}
            label="Voltar ao treino original do app"
            onClick={() => setConfirmRestore(true)}
          />
        )}
      </SettingsGroup>

      {openWorkout && (
        <WorkoutSheet
          workout={openWorkout}
          next={openWorkout.id === nextId}
          onClose={() => setOpenId(null)}
        />
      )}

      {confirmRestore && (
        <ConfirmDialog
          title="Voltar ao treino original?"
          message="Descarta o treino que você aplicou neste aparelho e volta pro que vem no app. Seu histórico de sessões não é afetado."
          confirmLabel="Voltar"
          onConfirm={restore}
          onCancel={() => setConfirmRestore(false)}
        />
      )}
    </div>
  );
}
