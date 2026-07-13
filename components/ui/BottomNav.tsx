"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DumbbellIcon,
  HistoryIcon,
  ChartIcon,
  CogIcon,
} from "./icons";

const items = [
  { href: "/", label: "Treino", Icon: DumbbellIcon },
  { href: "/historico", label: "Histórico", Icon: HistoryIcon },
  { href: "/metricas", label: "Métricas", Icon: ChartIcon },
  { href: "/config", label: "Config", Icon: CogIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md">
        {items.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`tap flex flex-col items-center justify-center gap-1 py-2 text-[11px] transition-colors duration-200 ${
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
