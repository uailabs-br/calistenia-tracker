import Link from "next/link";
import { ChevronLeftIcon } from "./icons";

/** Volta pra uma tela-mãe (as subtelas de Ajustes). */
export function BackLink({ href = "/config", label = "Ajustes" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="tap -ml-2 mb-2 inline-flex items-center gap-1 pt-6 text-sm text-muted">
      <ChevronLeftIcon className="h-4 w-4" />
      {label}
    </Link>
  );
}
