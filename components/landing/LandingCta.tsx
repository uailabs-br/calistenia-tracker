"use client";

import Link from "next/link";
import { markLandingSeen } from "@/lib/utils/landing";

/**
 * Saída da página. Marca que ela já foi vista — é esse registro que faz o
 * boot parar de trazer a pessoa pra cá (ver components/ui/PlanBoot.tsx).
 * "Ver meu plano" porque é o que aparece no onboarding logo depois do nível.
 */
export function LandingCta() {
  return (
    <div className="flex w-full flex-col items-center">
      <Link
        href="/onboarding"
        onClick={markLandingSeen}
        className="btn-primary tap flex w-full max-w-xs items-center justify-center rounded-xl py-3.5 font-semibold"
      >
        Ver meu plano
      </Link>
      <p className="mt-2 text-xs text-muted">Grátis e sem anúncio.</p>
    </div>
  );
}
