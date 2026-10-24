"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeTab, isChromeless } from "@/lib/utils/routes";
import {
  HomeIcon,
  DumbbellIcon,
  ChartIcon,
  CogIcon,
} from "./icons";

// Histórico não é aba: é consulta, não uso do dia a dia. Mora em Evolução.
// Treino abre em /plano porque /treino/[id] é a sessão em andamento.
const items = [
  { href: "/", label: "Início", Icon: HomeIcon },
  { href: "/plano", label: "Treino", Icon: DumbbellIcon },
  { href: "/metricas", label: "Evolução", Icon: ChartIcon },
  { href: "/config", label: "Ajustes", Icon: CogIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  // Onboarding e landing são tela cheia: sem navegação até a pessoa ter um plano.
  if (isChromeless(pathname)) return null;
  const current = activeTab(pathname);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md">
        {items.map(({ href, label, Icon }) => {
          const active = current === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`tap flex flex-col items-center justify-center gap-1 py-2 text-2xs transition-colors duration-200 active:scale-95 ${
                  active ? "text-text" : "text-muted"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-6 w-6" />
                <span className="font-mono">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
