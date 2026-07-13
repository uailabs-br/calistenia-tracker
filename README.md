# Calistenia Tracker

> PWA offline-first para registrar treinos de calistenia **durante a sessão**, com zero fricção — um toque por exercício, na barra, entre as séries.

Dark-mode, mobile-first, instalável na tela inicial, funciona sem internet. Não gera treino: consome um plano estruturado e registra o que foi feito, fechando o loop de progressão com dados reais.

---

## O problema

Apps de treino genéricos falham no momento que mais importa: **durante o treino**. Formulários longos, muitos toques, teclado abrindo com a mão suada, necessidade de internet. O resultado é que o registro acontece *depois* (de memória, impreciso) ou simplesmente não acontece. Sem registro fiel, não há como verificar critérios de progressão do tipo *"quando sair sem chicken wing por 2 sessões, sobe a carga"*.

No caso específico de calistenia/skills (muscle-up, handstand), o que trava o progresso muitas vezes não é força e sim **padrão de movimento** (ex.: passar um cotovelo de cada vez no MU). Isso é qualitativo e nenhum app rastreia.

## A solução

Um tracker pessoal com três decisões de produto:

1. **Caminho feliz de 1 toque.** O alvo já vem pré-preenchido do plano. `[✓ fiz como previsto]` grava a série inteira. Só quando fugiu do alvo é que aparecem os steppers. Registro em < 10s por exercício, zero teclado.
2. **Flags qualitativas por exercício.** Chips de toque, sem escrita (ex.: `chicken wing`, `grip soltou`, `pausa 1s no topo`). A métrica principal do app é a **incidência de flags ao longo das sessões** — dá pra ver *"chicken wing na negativa: 3/3 → 1/3 → 0/3"* e saber que o padrão está corrigindo.
3. **Offline-first e durável.** Tudo grava local (IndexedDB) e sobrevive a fechar o app no meio. Export/import de backup porque o valor do app é o histórico acumulado.

Cada dia é um **template selecionável**: dá pra fazer o treino de terça numa segunda se for mais conveniente, e o histórico segue o *movimento* (ID de exercício estável entre dias), não o calendário.

## Como funciona (fluxo)

```
Abrir → treino de hoje já na tela → Começar
   ↓
Card ativo expandido, resto colapsado
   ↓
[✓ fiz como previsto]  ou  [ajustar → steppers por série]
   ↓  (colapsa e abre o próximo automaticamente)
opcional: chips "como foi?" · segurar p/ pular
   ↓
Finalizar → RPE (1–5) → nota opcional → salvo
   ↓
Métricas: sequência, aderência, volume, incidência de flags
```

## Arquitetura

Decisão central: **o banco é a única fonte de verdade do estado da sessão** — nada de estado de treino em memória do React. Isso é o que faz a *retomada* funcionar (fechar e reabrir volta ao ponto exato) e o que prepara um eventual sync no v2.

```
┌─────────────────────────────────────────────┐
│  UI (React client components)                │
│  session/  metrics/  ui/                     │
└───────────────┬─────────────────────────────┘
                │  lê via useLiveQuery (reativo)
                │  escreve SÓ via repositórios
┌───────────────▼─────────────────────────────┐
│  lib/db/                                     │
│   repositories/  → toda escrita (sessions,   │
│                    logs) com UUID, updated_at,│
│                    soft-delete               │
│   queries/       → lastPerformance, metrics  │
│   backup.ts      → export/import + merge      │
│   schema.ts      → Dexie (IndexedDB)         │
└───────────────┬─────────────────────────────┘
                │
┌───────────────▼──────────┐   ┌───────────────┐
│  lib/domain/             │   │  lib/plan/     │
│   parseTarget, volume    │   │  plan.json     │
│  (reconstitui séries de  │   │  (bundlado,    │
│   as_target via parsed)  │   │  validado no   │
└──────────────────────────┘   │  build c/ Zod) │
                               └───────────────┘
```

**Convenções (preparam local-first/sync no v2 sem pagar o custo agora):**

- **UUID v4 no client** em todo registro — nunca autoincrement.
- **`updated_at`** em toda escrita; **soft-delete** (`deleted_at`) — nunca delete físico.
- **Camada de repositório**: componente nunca fala com o Dexie direto. Leitura reativa via `useLiveQuery`; escrita só pelos repositórios.
- **IDs de exercício = slug estável** (`mu-puxada-explosiva`), compartilhado entre dias. É o que preserva o histórico de um movimento entre ciclos e permite fazer qualquer treino em qualquer dia.
- **Plano validado em build**: `plan.json` é checado contra um schema Zod; o build falha se estiver inválido.

**PWA:** Serwist para app shell offline + install; atualização de service worker via prompt (skip-waiting controlado, sem servir versão velha silenciosamente). Wake lock durante a sessão com re-aquisição em `visibilitychange` (necessário no iOS). `navigator.storage.persist()` como best-effort contra eviction de IndexedDB.

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **Next.js 15** (App Router) | Host de SPA client-side; porta aberta pra servidor no v2 |
| Linguagem | **TypeScript** strict | |
| Persistência | **Dexie.js** (IndexedDB) | Fonte única de verdade, reatividade com `useLiveQuery` |
| UI | **Tailwind v4** | Paleta e tipografia herdadas do plano original |
| PWA | **Serwist** | Instalável, offline, app shell cacheado |
| Validação | **Zod** | `plan.json` e backups |
| Gráficos | **SVG próprio** | Sem lib pesada — bundle é feature num PWA offline |
| Testes | **Vitest** + fake-indexeddb | Repositórios, domínio e ciclo de backup |

Sem estado global (Zustand/Redux): estado efêmero de UI em `useState`, estado de sessão no banco. Sem backend, sem login, sem variáveis de ambiente — roda 100% no cliente.

## Métricas (só o que sai do log)

Nenhum índice inventado; tudo rastreável a um registro:

- Treinos realizados (total e 30 dias) · sequência de dias atual e maior
- Aderência por treino da semana
- Volume por exercício ao longo do tempo (reconstituído de `as_target` via `parsed`)
- **Incidência de flags por exercício por sessão** — a métrica que fecha o loop de correção técnica
- RPE médio (4 semanas)

## Rodar local

```bash
npm install
npm run dev            # http://localhost:3000
```

```bash
npm run build          # valida plan.json + build de produção
npm test               # testes unitários (Vitest)
npm run validate:plan  # valida o plano contra o schema Zod
```

## Estrutura

```
app/                  # rotas: / (treino), historico, metricas, config
components/session/    # ExerciseCard, Stepper, FlagChips, RpeSheet, DayPills, SessionRunner
components/metrics/     # StatTile, Sparkline, FlagIncidenceRow
components/ui/         # BottomNav, PageHeader, SwUpdater, icons
lib/db/               # schema Dexie, repositories/, queries/, backup
lib/domain/           # parseTarget, volume
lib/plan/             # plan.json (fonte de verdade), schema Zod, loader
scripts/              # validate-plan, generate-icons
```

## Roadmap (v2)

Fora do escopo do v1, por decisão consciente: geração de treino/IA, edição do plano no app, timer de descanso, multi-usuário, sync real. As convenções acima (UUID, tombstones, `updated_at`) já deixam o caminho aberto para sync local-first.

---

Projeto pessoal. Documentação de produto em [`PRD-calistenia-tracker-v1.md`](PRD-calistenia-tracker-v1.md), plano de execução em [`PLANO_IMPLEMENTACAO.md`](PLANO_IMPLEMENTACAO.md) e progresso em [`ACOMPANHAMENTO.md`](ACOMPANHAMENTO.md).
