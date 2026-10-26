"use client";

import { useId, useRef } from "react";
import type { ParseFailReason } from "@/lib/plan/importPlan";
import type { ExportSummary } from "@/lib/plan/exportForAI";
import { useDelayedFlag } from "@/lib/utils/useDelayedFlag";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  ExternalIcon,
  ListIcon,
  PasteIcon,
  PencilIcon,
  SparkleIcon,
  SpinnerIcon,
} from "@/components/ui/icons";

/*
 * Telas do fluxo de treino com IA (`app/config/plano`). Cada uma tem uma pergunta
 * e um botão principal; o estado e a navegação ficam na página.
 */

const PRIMARY =
  "btn-primary tap flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium disabled:opacity-40";
const SECONDARY =
  "tap flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface2 px-4 py-3 font-medium";

/** Voltar um passo. Botão, não link: o passo é estado da página, não uma rota. */
export function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="tap -ml-2 mb-2 inline-flex min-h-[44px] items-center gap-1 pt-6 text-sm text-muted"
    >
      <ChevronLeftIcon className="h-4 w-4" />
      Voltar
    </button>
  );
}

/** Voltar, "Passo N de 3" e a barra de progresso. */
export function StepHeader({
  step,
  total,
  title,
  onBack,
}: {
  step: number;
  total: number;
  title: string;
  onBack: () => void;
}) {
  return (
    <>
      <BackButton onBack={onBack} />
      <header className="pt-2 pb-5">
        <p className="eyebrow-lg">
          Passo {step} de {total}
        </p>
        <h1 className="display-caps text-3xl">{title}</h1>
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i < step ? "bg-ac" : "bg-surface2"}`}
            />
          ))}
        </div>
      </header>
    </>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card tap flex w-full items-center gap-3 px-4 py-4 text-left active:scale-[0.99]"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface2 text-ac"
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-muted">{description}</span>
      </span>
      <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
    </button>
  );
}

export function ChoiceStep({
  onPick,
}: {
  onPick: (choice: "novo" | "meu" | "pronto") => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ChoiceCard
        icon={SparkleIcon}
        title="Criar um treino novo"
        description="A IA monta a partir do que você já treinou"
        onClick={() => onPick("novo")}
      />
      <ChoiceCard
        icon={PencilIcon}
        title="Trazer o treino que já faço"
        description="Você escreve, a IA só passa pro formato do app"
        onClick={() => onPick("meu")}
      />
      <ChoiceCard
        icon={ListIcon}
        title="Escolher um pronto"
        description="Treinos montados pra começar"
        onClick={() => onPick("pronto")}
      />
    </div>
  );
}

/** Passo 1 do "trazer o meu": o treino do jeito que a pessoa tem. */
export function WriteStep({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="block text-sm font-medium">
        Seu treino
      </label>
      <p className="mt-0.5 text-xs text-muted">
        Do jeito que estiver. A IA não muda nada, só organiza.
      </p>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Treino A\nBarra fixa 4x6\nFlexão 3x12…"}
        rows={8}
        className="field mt-2 py-3"
      />
      <button type="button" onClick={onNext} disabled={!value.trim()} className={`${PRIMARY} mt-4`}>
        Continuar
      </button>
    </>
  );
}

const AI_LINKS = [
  { name: "ChatGPT", href: "https://chatgpt.com/" },
  { name: "Claude", href: "https://claude.ai/new" },
  { name: "Gemini", href: "https://gemini.google.com/app" },
];

/** Passo 2: copiar o pedido e abrir uma IA. "Já tenho a resposta" só depois de copiar. */
export function CopyStep({
  context,
  copied,
  busy,
  busyLabel,
  summary,
  onCopy,
  onNext,
}: {
  context: string;
  copied: boolean;
  busy: boolean;
  /** o que o export está fazendo agora ("lendo 46 treinos…") */
  busyLabel?: string | null;
  /** o que foi no pedido; só no pedido com histórico */
  summary?: ExportSummary | null;
  onCopy: () => void;
  onNext: () => void;
}) {
  // A etapa só aparece se demorar: em quem tem pouco histórico, o texto piscaria.
  const slow = useDelayedFlag(busy && !!busyLabel, 300);
  return (
    <>
      <p className="mb-4 text-sm text-muted">{context}</p>
      <button
        type="button"
        onClick={onCopy}
        disabled={busy}
        className={copied ? SECONDARY : PRIMARY}
      >
        {busy ? (
          <SpinnerIcon className="h-5 w-5 animate-spin" />
        ) : copied ? (
          <CheckIcon className="h-5 w-5" />
        ) : (
          <CopyIcon className="h-5 w-5" />
        )}
        {slow ? busyLabel : copied ? "Copiado · copiar de novo" : "Copiar pedido"}
      </button>

      <div aria-live="polite">
        {copied && summary && <ExportSummaryCard summary={summary} />}
        {copied && (
          <div className="anim-fade-in mt-6">
            <p className="text-sm font-medium">Agora abra uma IA e cole lá:</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {AI_LINKS.map((ai) => (
                <a
                  key={ai.name}
                  href={ai.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-border bg-surface px-2 text-sm font-medium"
                >
                  {ai.name}
                  <ExternalIcon className="h-3.5 w-3.5 text-muted" />
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              A resposta é um texto grande, cheio de chaves. É assim mesmo.
            </p>
            <button type="button" onClick={onNext} className={`${PRIMARY} mt-6`}>
              Já tenho a resposta
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const perWeek = (n: number) =>
  `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${n === 1 ? "dia" : "dias"}/sem.`;

/** Depois de copiar: o que a IA vai receber, pra conferir antes de colar. */
function ExportSummaryCard({ summary: s }: { summary: ExportSummary }) {
  const rows: [string, React.ReactNode][] = [
    ["Treinos em detalhe", s.detalhe],
    ...(s.resumidos > 0 ? [["Antes disso, resumido", `${s.resumidos} movimentos`] as [string, string]] : []),
    ...(s.skills > 0
      ? [
          [
            "Skills com sinal",
            <>
              {s.skills}
              {s.prontas > 0 && (
                <span className="text-ac">
                  {" "}
                  · {s.prontas} {s.prontas === 1 ? "pronta" : "prontas"}
                </span>
              )}
            </>,
          ] as [string, React.ReactNode],
        ]
      : []),
    ...(s.frequencia !== undefined
      ? [["Frequência real", perWeek(s.frequencia)] as [string, string]]
      : []),
  ];
  // Só vale avisar quando a diferença muda o formato do ciclo (≥ 1 dia).
  const differs =
    s.frequencia !== undefined && s.declarado !== undefined && Math.abs(s.frequencia - s.declarado) >= 1;

  return (
    <section aria-label="O que foi no pedido" className="card anim-fade-in mt-4 px-4 py-3">
      <p className="eyebrow">Foi no pedido</p>
      <ul className="mt-2 flex flex-col gap-2 text-sm">
        {rows.map(([label, value]) => (
          <li key={label} className="flex justify-between gap-3">
            <span>{label}</span>
            <span className="tnum text-muted">{value}</span>
          </li>
        ))}
      </ul>
      {differs && (
        <p className="mt-2.5 text-xs text-muted">
          Você declarou {s.declarado} {s.declarado === 1 ? "dia" : "dias"} por semana. A IA vai
          usar o que você fez de fato.
        </p>
      )}
    </section>
  );
}

const FAIL_TITLE: Record<ParseFailReason, string> = {
  "no-json": "Não achei o treino nessa resposta.",
  cut: "A resposta veio cortada no meio.",
  "invalid-json": "A resposta veio com erro de formato.",
  schema: "A IA errou alguns campos do treino.",
};

export interface PasteFailure {
  reason: ParseFailReason;
  errors: string[];
}

/** Passo 3: colar a resposta. Colou, conferiu — sem botão "Aplicar" no meio. */
export function PasteStep({
  value,
  failure,
  onChange,
  onSubmit,
  onPasteFromClipboard,
  onCopyFix,
}: {
  value: string;
  failure: PasteFailure | null;
  onChange: (v: string) => void;
  onSubmit: (text: string) => void;
  /** Devolve `false` quando o navegador não deixa ler a área de transferência. */
  onPasteFromClipboard: () => Promise<boolean>;
  onCopyFix: () => void;
}) {
  const id = useId();
  const areaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (!(await onPasteFromClipboard())) areaRef.current?.focus();
        }}
        className={PRIMARY}
      >
        <PasteIcon className="h-5 w-5" />
        Colar resposta
      </button>

      {failure && (
        <div
          className="anim-fade-in mt-4 rounded-card border border-danger px-4 py-3"
          role="alert"
        >
          <p className="text-sm font-medium text-danger">
            {FAIL_TITLE[failure.reason]}
          </p>
          <p className="mt-1 text-sm text-muted">
            {failure.reason === "no-json"
              ? "Confira se copiou a resposta inteira. Se copiou, peça pra IA reenviar:"
              : "Peça pra IA corrigir. Copie isto, cole na mesma conversa e traga a nova resposta:"}
          </p>
          <button type="button" onClick={onCopyFix} className={`${SECONDARY} mt-3`}>
            <CopyIcon className="h-5 w-5" />
            Copiar pedido de correção
          </button>
          <details className="mt-1 text-xs text-muted">
            <summary className="tap cursor-pointer leading-[44px]">Detalhes técnicos</summary>
            <ul className="mt-1 list-disc break-words pl-4">
              {failure.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </details>
        </div>
      )}

      <label htmlFor={id} className="mt-6 block text-sm font-medium">
        Ou cole aqui
      </label>
      <textarea
        id={id}
        ref={areaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // Colar substitui o que havia: a caixa tem um propósito só, e a resposta
        // corrigida pela IA não pode grudar na anterior.
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (!text) return;
          e.preventDefault();
          onSubmit(text);
        }}
        placeholder="Toque e segure pra colar"
        rows={4}
        className="field mt-2 py-3"
      />
      {value.trim() && !failure && (
        <button type="button" onClick={() => onSubmit(value)} className={`${SECONDARY} mt-3`}>
          Conferir resposta
        </button>
      )}
    </>
  );
}
