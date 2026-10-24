"use client";

import { useId, useMemo, useState } from "react";
import type { CustomExercise } from "@/lib/db/schema";
import type { CustomExerciseInput } from "@/lib/db/repositories/customExercises";
import {
  catalog,
  catalogSkillChips,
  normalizeSearch,
  searchCatalog,
  templateToPlanExercise,
  type CatalogCategory,
  type CatalogExercise,
} from "@/lib/plan/catalog";
import { customToCatalogLike } from "@/lib/plan/addedExercises";
import { SKILL_CATEGORIES } from "@/lib/plan/skills";
import { Sheet } from "@/components/ui/Modal";
import { accentVars } from "@/components/ui/accent";
import { ChevronDownIcon, PlusIcon } from "@/components/ui/icons";

const SKILL_CHIPS = catalogSkillChips();

/**
 * Sheet "Adicionar exercício": busca + filtros (grupo e skill) + toque único
 * pra adicionar. Sem resultado (ou com nome novo), oferece criar na hora.
 * Um toque na linha já adiciona — sem confirmação, o exercício entra aberto no
 * treino e dá pra remover se foi engano.
 */
export function AddExerciseSheet({
  accent,
  presentIds,
  customExercises,
  recentIds = [],
  onPick,
  onCreate,
  onClose,
}: {
  accent: string;
  /** ids que já estão no treino (plano do dia + adicionados) */
  presentIds: Set<string>;
  customExercises: CustomExercise[];
  /** ids feitos recentemente (mais novo primeiro): viram o grupo "Recentes" no topo */
  recentIds?: string[];
  onPick: (id: string) => void;
  /** Cria o exercício e já o adiciona ao treino. Rejeita com mensagem legível. */
  onCreate: (input: CustomExerciseInput) => Promise<void>;
  onClose: () => void;
}) {
  const titleId = useId();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CatalogCategory | null>(null);
  const [skill, setSkill] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const source = useMemo(
    () => [...customExercises.map(customToCatalogLike), ...catalog],
    [customExercises]
  );
  const byId = useMemo(() => new Map(source.map((e) => [e.id, e])), [source]);
  const results = useMemo(
    () => searchCatalog(query, { category, skill }, source),
    [query, category, skill, source]
  );

  const filtering = query.trim() !== "" || category !== null || skill !== null;
  const exactMatch = useMemo(() => {
    const key = normalizeSearch(query);
    return key !== "" && source.some((e) => normalizeSearch(e.name) === key);
  }, [query, source]);
  const canCreate = query.trim() !== "" && !exactMatch;

  // sem busca/filtro: agrupa por categoria (criados por você primeiro)
  const groups = useMemo(() => {
    if (filtering) return null;
    const mine = results.filter((e) => e.id.startsWith("custom-"));
    const out: { label: string; items: CatalogExercise[] }[] = [];
    if (mine.length > 0) out.push({ label: "Criados por você", items: mine });
    for (const cat of SKILL_CATEGORIES) {
      out.push({
        label: cat,
        items: results.filter((e) => e.category === cat && !e.id.startsWith("custom-")),
      });
    }
    return out.filter((g) => g.items.length > 0);
  }, [filtering, results]);

  // Recentes: só sem busca/filtro, só o que dá pra adicionar (existe e ainda não está no treino)
  const recentItems = filtering
    ? []
    : recentIds
        .map((id) => byId.get(id))
        .filter((e): e is CatalogExercise => !!e && !presentIds.has(e.id))
        .slice(0, 6);

  if (creating) {
    return (
      <ExerciseSheet titleId={titleId} accent={accent} onClose={onClose}>
        <CreateForm
          titleId={titleId}
          initialName={query.trim()}
          initialCategory={category ?? "Puxar"}
          onBack={() => setCreating(false)}
          onCreate={onCreate}
        />
      </ExerciseSheet>
    );
  }

  const renderRow = (e: CatalogExercise) => {
    const present = presentIds.has(e.id);
    const open = expanded === e.id;
    const hasAlt = e.easier.length + e.harder.length > 0;
    const meta = [templateToPlanExercise(e).target, e.equipment.slice(0, 2).join(", ")]
      .filter(Boolean)
      .join(" · ");
    return (
      <li key={e.id} className="border-b border-border last:border-b-0">
        <div className="flex items-stretch">
          <button
            type="button"
            disabled={present}
            onClick={() => onPick(e.id)}
            className="tap min-w-0 flex-1 px-4 py-3 text-left disabled:opacity-50"
          >
            <p className="truncate font-medium">{e.name}</p>
            <p className="tnum truncate text-xs text-muted">
              {present ? "já está neste treino" : meta}
              {e.id.startsWith("custom-") && !present && " · criado por você"}
            </p>
          </button>
          {hasAlt && (
            <button
              type="button"
              aria-expanded={open}
              aria-label={`Variações de ${e.name}`}
              onClick={() => setExpanded(open ? null : e.id)}
              className="tap flex shrink-0 items-center px-3 text-muted"
            >
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
        {open && (
          <div className="anim-fade-in flex flex-col gap-2 px-4 pb-3">
            {altRow("mais fácil", e.easier)}
            {altRow("mais difícil", e.harder)}
          </div>
        )}
      </li>
    );
  };

  const altRow = (label: string, ids: string[]) =>
    ids.length === 0 ? null : (
      <div key={label} className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-2xs text-muted">{label}</span>
        {ids.map((id) => {
          const alt = byId.get(id);
          if (!alt) return null;
          const present = presentIds.has(id);
          return (
            <button
              key={id}
              type="button"
              disabled={present}
              onClick={() => onPick(id)}
              className="tap rounded-full border border-border bg-surface2 px-3 text-sm disabled:opacity-40"
            >
              {alt.name}
            </button>
          );
        })}
      </div>
    );

  return (
    <ExerciseSheet titleId={titleId} accent={accent} onClose={onClose} tall>
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 id={titleId} className="text-lg font-semibold">
          Adicionar exercício
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="tap rounded-lg px-2 font-mono text-2xs text-ac"
          >
            criar novo
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tap rounded-lg px-2 font-mono text-2xs text-muted"
          >
            fechar
          </button>
        </div>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar (ex.: barra fixa, prancha, ombro)"
        aria-label="Buscar exercício"
        enterKeyHint="search"
        autoComplete="off"
        className="field mt-3 shrink-0 py-2.5"
      />

      <p className="eyebrow mt-3">Grupo</p>
      <div className="mt-1 grid shrink-0 grid-cols-4 gap-2" role="group" aria-label="Grupo">
        {SKILL_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(category === c ? null : c)}
            className="toggle tap rounded-xl px-1 py-2 text-sm font-medium text-muted transition-colors duration-200"
          >
            {c}
          </button>
        ))}
      </div>

      <p className="eyebrow mt-3">Skill</p>
      <div className="relative -mx-5 mt-1 shrink-0">
        <div
          className="no-scrollbar flex gap-2 overflow-x-auto overscroll-x-contain px-5 pb-1"
          role="group"
          aria-label="Skill"
        >
          {SKILL_CHIPS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={skill === s.id}
              onClick={() => setSkill(skill === s.id ? null : s.id)}
              className="toggle tap shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium text-muted transition-colors duration-200"
            >
              {s.name}
            </button>
          ))}
          {/* espaço final: o último chip não fica colado sob o degradê */}
          <span className="w-6 shrink-0" aria-hidden="true" />
        </div>
        {/* degradê na borda direita: sinaliza que a faixa rola */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-10"
          style={{ background: "linear-gradient(to left, var(--color-surface), transparent)" }}
        />
      </div>

      <div className="-mx-5 mt-3 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 pb-2">
        {results.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Nenhum exercício encontrado.
          </p>
        ) : groups ? (
          [
            ...(recentItems.length > 0 ? [{ label: "Recentes", items: recentItems }] : []),
            ...groups,
          ].map((g) => (
            <section key={g.label} className="mb-3">
              <h3 className="eyebrow mb-1 mt-2">
                {g.label}
              </h3>
              <ul className="overflow-hidden rounded-card border border-border bg-surface2">
                {g.items.map(renderRow)}
              </ul>
            </section>
          ))
        ) : (
          <ul className="overflow-hidden rounded-card border border-border bg-surface2">
            {results.map(renderRow)}
          </ul>
        )}

        {canCreate && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn-outline tap mt-3 mb-2 flex w-full items-center justify-center gap-2 rounded-xl border-dashed py-3 text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            Criar “{query.trim()}”
          </button>
        )}
      </div>
    </ExerciseSheet>
  );
}

/** A sheet das duas telas (busca e criar): coluna que ocupa até 92% da altura. */
function ExerciseSheet({
  titleId,
  accent,
  onClose,
  tall = false,
  children,
}: {
  titleId: string;
  accent: string;
  onClose: () => void;
  /** Altura fixa (a lista precisa de espaço garantido pra rolar); senão só limita. */
  tall?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Sheet
      labelledBy={titleId}
      onClose={onClose}
      className={`flex flex-col px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] ${
        tall ? "h-[92dvh]" : "max-h-[92dvh]"
      }`}
      style={accentVars(accent)}
    >
      {children}
    </Sheet>
  );
}

/** Criar exercício: nome, tipo (reps/tempo), grupo, por lado. Mínimo de campos. */
function CreateForm({
  titleId,
  initialName,
  initialCategory,
  onBack,
  onCreate,
}: {
  titleId: string;
  initialName: string;
  initialCategory: CatalogCategory;
  onBack: () => void;
  onCreate: (input: CustomExerciseInput) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [unit, setUnit] = useState<"reps" | "seconds">("reps");
  const [category, setCategory] = useState<CatalogCategory>(initialCategory);
  const [perSide, setPerSide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy || name.trim() === "") return;
    setBusy(true);
    setError(null);
    try {
      await onCreate({ name, category, unit, per_side: perSide });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar o exercício.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="text-lg font-semibold">
          Novo exercício
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="tap rounded-lg px-2 font-mono text-2xs text-muted"
        >
          voltar
        </button>
      </div>

      <label className="mt-3 block text-sm text-muted" htmlFor="ex-name">
        Nome
      </label>
      <input
        id="ex-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        placeholder="Ex.: Remada no anel"
        autoComplete="off"
        className="field mt-1 py-2.5"
      />

      <p className="mt-4 text-sm text-muted">Como se conta</p>
      <div className="mt-1 grid grid-cols-2 gap-2" role="group" aria-label="Tipo">
        {(
          [
            ["reps", "Repetições"],
            ["seconds", "Tempo (segundos)"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-pressed={unit === v}
            onClick={() => setUnit(v)}
            className="toggle tap rounded-xl py-2.5 text-sm font-medium text-muted transition-colors duration-200"
          >
            {label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-muted">Grupo</p>
      <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Grupo">
        {SKILL_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
            className="toggle tap rounded-full px-3 text-sm text-muted transition-colors duration-200"
          >
            {c}
          </button>
        ))}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={perSide}
          onChange={(e) => setPerSide(e.target.checked)}
          className="h-4 w-4"
        />
        Feito de cada lado (unilateral)
      </label>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={busy || name.trim() === ""}
        onClick={() => void submit()}
        className="btn-primary tap mt-5 w-full rounded-xl py-3 font-medium transition-opacity disabled:opacity-40"
      >
        Criar e adicionar ao treino
      </button>
    </div>
  );
}
