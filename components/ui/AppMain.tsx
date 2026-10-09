"use client";

import { usePathname } from "next/navigation";

/**
 * O `main` do app. O `pb-24` existe pra nenhum conteúdo ficar embaixo da
 * `BottomNav`, que é fixa — então ele tem que sair justamente nas rotas onde a
 * nav não é montada (ver BottomNav). Com o padding, o onboarding tem 96px de
 * scroll em qualquer aparelho, e ele é feito pra caber na tela sem rolar.
 */
export function AppMain({ children }: { children: React.ReactNode }) {
  const fullscreen = usePathname().startsWith("/onboarding");
  return (
    <main className={`mx-auto w-full max-w-md ${fullscreen ? "" : "min-h-dvh pb-24"}`}>
      {children}
    </main>
  );
}
