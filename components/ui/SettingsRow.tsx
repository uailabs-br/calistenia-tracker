"use client";

import Link from "next/link";
import { ChevronRightIcon, SpinnerIcon } from "./icons";

type IconType = React.ComponentType<{ className?: string }>;

interface SettingsRowProps {
  icon: IconType;
  label: string;
  /** Linha de apoio sob o rótulo. Quebra linha — nunca é cortada (pt-BR é longo). */
  description?: string;
  /** Pinta a descrição de alerta (ex.: backup atrasado). */
  attention?: boolean;
  /** Valor curto à direita (ex.: "3 por semana"). */
  value?: string;
  /** Conteúdo próprio à direita (switch, campo). Tem prioridade sobre `value`/chevron. */
  trailing?: React.ReactNode;
  /** Navega pra outra tela e mostra o chevron. */
  href?: string;
  /** Executa uma ação. Sem `href` nem `onClick`, a linha é só informativa. */
  onClick?: () => void;
  /** Trabalhando: mostra o spinner e bloqueia o toque. */
  busy?: boolean;
  disabled?: boolean;
  /** Ação destrutiva: rótulo e ícone em vermelho. */
  danger?: boolean;
}

const BASE = "tap flex w-full items-center gap-3 px-4 py-3 text-left";

/** Uma linha de Ajustes: ícone + rótulo (+ descrição) + valor, chevron ou controle. */
export function SettingsRow({
  icon: Icon,
  label,
  description,
  attention = false,
  value,
  trailing,
  href,
  onClick,
  busy = false,
  disabled = false,
  danger = false,
}: SettingsRowProps) {
  const tone = danger ? { color: "var(--color-danger)" } : undefined;

  const content = (
    <>
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          danger ? "" : "bg-surface2 text-text"
        }`}
        style={
          danger
            ? { ...tone, background: "color-mix(in srgb, var(--color-danger) 14%, transparent)" }
            : undefined
        }
      >
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium leading-snug" style={tone}>
          {label}
        </span>
        {description && (
          <span
            className="mt-0.5 block text-xs leading-snug text-muted"
            style={attention ? { color: "var(--color-warn)" } : undefined}
          >
            {description}
          </span>
        )}
      </span>
      {trailing ? (
        trailing
      ) : busy ? (
        <SpinnerIcon className="h-4 w-4 shrink-0 animate-spin text-muted" />
      ) : (
        <>
          {value && <span className="shrink-0 text-sm text-muted">{value}</span>}
          {href && <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted" />}
        </>
      )}
    </>
  );

  const divider = "border-b border-border last:border-b-0";

  if (href) {
    return (
      <Link href={href} className={`${BASE} ${divider} active:bg-surface2`}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        className={`${BASE} ${divider} active:bg-surface2 disabled:opacity-50`}
      >
        {content}
      </button>
    );
  }

  // Informativa ou com controle próprio (switch, campo): não é um botão.
  return <div className={`${BASE} ${divider}`}>{content}</div>;
}
