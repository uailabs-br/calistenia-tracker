"use client";

import Link from "next/link";
import { markLandingSeen } from "@/lib/utils/landing";

/**
 * Saída da página. Marca que ela já foi vista — é esse registro que faz o
 * boot parar de trazer a pessoa pra cá (ver components/ui/PlanBoot.tsx).
 */
export function LandingCta() {
  return (
    <div className="flex flex-col items-center">
      <Link
        href="/onboarding"
        onClick={markLandingSeen}
        className="btn-primary tap flex w-full max-w-xs items-center justify-center rounded-xl py-3.5 font-semibold"
      >
        Começar grátis
      </Link>
    </div>
  );
}
