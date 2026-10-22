"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getProgressionMap,
  type ProgressionRow,
} from "@/lib/db/queries/progressionMap";
import { clearAck, ackedAt } from "@/lib/utils/progressionAck";
import { shortDate } from "@/lib/utils/date";
import { usePlanReady } from "@/lib/utils/usePlanReady";
import { BackLink } from "@/components/ui/BackLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChevronRightIcon } from "@/components/ui/icons";

const GROUPS: { id: string; title: string; hint?: string; pick: (r: ProgressionRow) => boolean }[] = [
  {
    id: "ready",
    title: "Prontos pra subir",
    pick: (r) => r.state === "ready" && !r.dismissed,
  },
  {
    id: "regress",
    title: "Vale um passo atrás",
    hint: "Abaixo do alvo ou com execução suja várias sessões seguidas.",
    pick: (r) => r.state === "regress" && !r.dismissed,
  },
  {
    id: "going",
    title: "Em andamento",
    pick: (r) =>
      r.state === "stale" ||
      r.state === "tracking" ||
      r.dismissed,
  },
  {
    id: "new",
    title: "Sem registro ainda",
    pick: (r) => r.state === "new",
  },
];

function statusLine(r: ProgressionRow): string {
  switch (r.state) {
    case "ready":
      return r.skill
        ? "critério batido, pronto pra subir"
        : `bateu o alvo nas últimas ${r.streak} sessões, pronto pra subir`;
    case "regress":
      return "abaixo do alvo várias sessões seguidas, considere um passo atrás";
    case "stale":
      return `${r.sessions} sessões no mesmo degrau sem decisão, troque o estímulo`;
    case "tracking":
      return `${r.streak}/${r.required} sessões seguidas · ${r.sessions} registradas`;
    case "new":
      return "ainda sem registro";
  }
}

function Row({ row, onReactivate }: { row: ProgressionRow; onReactivate: () => void }) {
  const active = (row.state === "ready" || row.state === "regress") && !row.dismissed;
  const color =
    row.state === "regress" ? "var(--color-danger)" : "var(--ac)";
  return (
    <li
      className="rounded-card border bg-surface px-4 py-3"
      style={{ borderColor: active ? color : "var(--color-border)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{row.name}</p>
          <p className="mt-0.5 text-xs text-muted">{statusLine(row)}</p>
        </div>
        <span className="flex shrink-0 gap-1">
          {row.workouts.map((w) => (
            <span
              key={w}
              className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted"
            >
              {w}
            </span>
          ))}
        </span>
      </div>

      {row.skill && (
        <p className="mt-2 text-xs leading-snug text-muted">
          <Link
            href={`/skills/${row.skill.id}`}
            className="inline-flex items-center gap-0.5 underline underline-offset-4"
          >
            {row.skill.name} · {row.skill.ladder} ({row.skill.level}/{row.skill.steps})
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </Link>
          {row.skill.criteria && (
            <span className="mt-0.5 block font-mono text-[11px]">
              critério: {row.skill.criteria}
            </span>
          )}
          {row.state === "ready" && row.skill.next && (
            <span className="mt-0.5 block" style={{ color }}>
              próximo degrau: {row.skill.next}
            </span>
          )}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[11px] text-muted">
        <span>
          alvo {row.target}
          {row.lastDate ? ` · último ${shortDate(row.lastDate)}` : ""}
        </span>
        {row.dismissed && (
          <button
            type="button"
            onClick={onReactivate}
            className="tap -mr-1 rounded-lg px-2 py-1"
          >
            dispensado · reativar
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * Mapa de progressão: o estado de cada exercício do plano vigente, o que o app
 * só mostrava por alguns segundos no fim da sessão. Mesma lógica do aviso de fim
 * de sessão (ver `getProgressionMap`), então os dois nunca discordam.
 */
export default function ProgressaoPage() {
  // O plano vem do localStorage: nada derivado dele antes do mount (regra 10).
  const ready = usePlanReady();
  // reativar mexe no localStorage (fora do Dexie): força a reavaliação
  const [ackVersion, setAckVersion] = useState(0);
  const rows = useLiveQuery(() => (ready ? getProgressionMap(ackedAt) : undefined), [ready, ackVersion]);

  return (
    <div className="px-4">
      <BackLink href="/metricas" label="Evolução" />
      <PageHeader title="Progressão" />
      <p className="-mt-2 mb-5 text-sm text-muted">
        Onde cada exercício do seu treino está: quem já pode subir, quem pede cuidado e
        quem ainda está juntando sessões.
      </p>

      {!rows ? null : rows.every((r) => r.state === "new") ? (
        <p className="mt-8 text-center text-muted">
          Registre sessões e o mapa se preenche aqui.
        </p>
      ) : (
        GROUPS.map((group) => {
          const items = rows.filter(group.pick);
          if (items.length === 0) return null;
          return (
            <section key={group.id} className="mb-6">
              <h2 className="text-sm font-semibold">{group.title}</h2>
              {group.hint && <p className="mb-2 text-xs text-muted">{group.hint}</p>}
              <ul className="mt-2 flex flex-col gap-2">
                {items.map((row) => (
                  <Row
                    key={row.exerciseId}
                    row={row}
                    onReactivate={() => {
                      clearAck(row.ackKey);
                      setAckVersion((v) => v + 1);
                    }}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}

      <Link
        href="/config/plano"
        className="tap mb-8 mt-2 flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3 active:scale-[0.99]"
      >
        <span className="text-sm font-medium">Pedir o próximo ciclo à IA</span>
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
      </Link>
    </div>
  );
}
