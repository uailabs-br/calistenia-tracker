"use client";

import { usePathname } from "next/navigation";

/**
 * Refaz um fade-up sutil a cada troca de rota (chave = pathname).
 * O movimento é anulado sob prefers-reduced-motion (ver globals.css).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="anim-page">
      {children}
    </div>
  );
}
