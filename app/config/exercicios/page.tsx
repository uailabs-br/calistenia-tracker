"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { BackLink } from "@/components/ui/BackLink";
import { CustomExercisesCard } from "@/components/config/CustomExercisesCard";

export default function ExerciciosPage() {
  return (
    <div className="px-4">
      <BackLink />
      <PageHeader title="Meus exercícios" />
      <CustomExercisesCard />
      <div className="h-8" />
    </div>
  );
}
