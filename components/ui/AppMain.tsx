"use client";

import { usePathname } from "next/navigation";
import { isLanding, isOnboarding } from "@/lib/utils/routes";

/**
 * O `main` do app. O `pb-24` existe pra nenhum conteúdo ficar embaixo da
 * `BottomNav`, que é fixa — então ele tem que sair justamente nas rotas onde a
 * nav não é montada (ver BottomNav). Com o padding, o onboarding tem 96px de
 * scroll em qualquer aparelho, e ele é feito pra caber na tela sem rolar.
 *
 * A landing é a exceção na largura: a coluna de 448px do app é estreita pra uma
 * página de leitura, então ela não herda o `max-w-md` e cuida da própria medida.
 */
export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isLanding(pathname)) return <main className="w-full">{children}</main>;

  const fullscreen = isOnboarding(pathname);
  return (
    <main className={`mx-auto w-full max-w-md ${fullscreen ? "" : "min-h-dvh pb-24"}`}>
      {children}
    </main>
  );
}
