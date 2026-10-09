"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { plan } from "@/lib/plan/loader";
import { applyPlan, hasPlanOverride, hasRecoveryOptOut } from "@/lib/plan/importPlan";
import { decidePlanBoot } from "@/lib/plan/boot";
import {
  isOnboardingDone,
  markPlanLostNotified,
  wasPlanLostNotified,
} from "@/lib/utils/onboarding";
import { useToast } from "@/components/ui/Toast";

/**
 * Roda no layout, não na home: o tester pode entrar direto em /historico.
 * Recupera o plano certo pelo histórico e manda quem não tem rastro de uso
 * pro onboarding. Ver lib/plan/boot.ts.
 */
export function PlanBoot() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  // Uma decisão por carga do app: a leitura varre a tabela de sessões, e repetir
  // isso a cada navegação não muda a resposta (aplicar um plano recarrega a página).
  const decided = useRef(false);

  useEffect(() => {
    if (pathname.startsWith("/onboarding") || decided.current) return;
    decided.current = true;
    let cancelled = false;

    (async () => {
      const decision = await decidePlanBoot({
        currentPlanId: plan.id,
        hasOverride: hasPlanOverride(),
        onboardingDone: isOnboardingDone(),
        recoveryOptOut: hasRecoveryOptOut(),
      });
      if (cancelled) return;

      if (decision.action === "apply") {
        try {
          applyPlan(decision.plan);
        } catch {
          return; // sem storage: não adianta recarregar
        }
        // Se o storage engoliu a escrita, recarregar daria loop.
        if (hasPlanOverride()) window.location.reload();
      } else if (decision.action === "lost") {
        if (wasPlanLostNotified(decision.planId)) return;
        markPlanLostNotified(decision.planId);
        toast({
          message:
            "Não achei o plano que você vinha usando neste aparelho. Seu histórico está intacto; importe o treino de novo em Config.",
          duration: 9000,
        });
      } else if (decision.action === "onboarding") {
        router.replace("/onboarding");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, toast]);

  return null;
}
