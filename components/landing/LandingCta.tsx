"use client";

import Link from "next/link";
import { markLandingSeen, startPeek } from "@/lib/utils/landing";

/**
 * Saídas da página. Marcam que ela já foi vista — é esse registro que faz o
 * boot parar de trazer a pessoa pra cá (ver components/ui/PlanBoot.tsx).
 */
export function LandingCta({ peek = true }: { peek?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Link
        href="/onboarding"
        onClick={markLandingSeen}
        className="btn-primary tap flex w-full max-w-xs items-center justify-center rounded-xl py-3.5 font-semibold"
      >
        Começar
      </Link>
      {peek && (
        <Link
          href="/"
          onClick={() => {
            markLandingSeen();
            startPeek();
          }}
          className="tap flex items-center text-sm text-muted underline underline-offset-4"
        >
          Ver o app primeiro
        </Link>
      )}
    </div>
  );
}
