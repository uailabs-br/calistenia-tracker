# Plano de Implementação — Calistenia Tracker v1

Complementa o PRD v1. Incorpora as revisões técnicas acordadas: backup como requisito, versionamento do plano, Dexie como fonte única de verdade, instrumentação de tempo de registro.

Formato pensado para execução via Claude Code: cada etapa tem escopo fechado, entregas e critérios de aceite verificáveis. Uma etapa por sessão de trabalho.

---

## Stack (decidido)

| Camada | Escolha | Nota |
|---|---|---|
| Framework | Next.js 15 (App Router) | Usado como host estático de SPA. Sem SSR, sem RSC no caminho crítico. Decisão consciente por relevância de portfólio e possibilidade de servidor no v2 |
| Linguagem | TypeScript strict | |
| Persistência | Dexie.js (IndexedDB) | Fonte única de verdade. Reatividade via `useLiveQuery` (dexie-react-hooks) |
| Estado | `useState` local para UI efêmera | Sem Zustand. Estado de sessão vive no banco |
| UI | Tailwind v4 + shadcn seletivo | Só Dialog/Drawer. Paleta do plano HTML atual |
| PWA | Serwist | Instalável, offline, cache do app shell |
| Validação | Zod | `plan.json` validado em build/dev, não em runtime |
| Gráficos | SVG próprio ou lib mínima | Sem Recharts. Bundle é feature em PWA offline |

## Convenções obrigatórias (todas as etapas)

Preparam o v2 (sync/local-first) sem pagar o custo agora:

1. **IDs**: UUID v4 gerado no client. Nunca autoincrement.
2. **`updated_at`** em todo registro, atualizado em toda escrita.
3. **Soft delete**: registros ganham `deleted_at` (tombstone). Nunca delete físico.
4. **Camada de repositório**: componente nunca chama Dexie direto. Toda escrita passa por `lib/db/repositories/*`. `useLiveQuery` pode ler direto para reatividade, mas queries nomeadas ficam em `lib/db/queries/*`.
5. **IDs de exercício estáveis**: slug semântico (`mu-puxada-explosiva`), mantido entre versões do plano enquanto o exercício existir. Isso é o que preserva o histórico entre ciclos.

## Estrutura de pastas

```
/app
  layout.tsx
  page.tsx                  # treino de hoje
  historico/page.tsx
  metricas/page.tsx
  config/page.tsx           # export/import/backup
/lib
  db/
    schema.ts               # Dexie tables
    repositories/           # sessions.ts, logs.ts
    queries/                # lastPerformance.ts, metrics.ts
  domain/
    parseTarget.ts          # "4 × 4" → { sets, target, unit }
    volume.ts               # reconstituir volume de as_target
  plan/
    plan.json
    schema.ts               # Zod
    loader.ts
/components
  session/
  metrics/
  ui/
```

---

## Etapa 0 — Dados antes de código

**Objetivo:** `plan.json` como fonte de verdade revisada. Nenhum código de app antes disso, porque o modelo de dados depende do formato final.

Entregas:

- `plan.json` gerado a partir de `treino-calistenia-jul-2026.html` com:
  - `version: 1` e `imported_at` no root
  - IDs de exercício como slug estável
  - `parsed` preenchido onde o volume é numérico, `null` onde não é ("10-12 tentativas")
  - `flags` propostas por exercício (2 a 4, derivadas das observações do plano)
- `schema.ts` (Zod) espelhando o PRD seção 5
- Documento curto de decisão: regra de estabilidade de IDs entre versões (o que mantém ID, o que gera ID novo)

Aceite:

- [ ] `plan.json` valida contra o schema
- [ ] Revisão manual das flags feita pelo usuário (gate humano, não pula)
- [ ] Todos os 4 dias de treino + dia de prática representados

## Etapa 1 — Fundação

**Objetivo:** projeto de pé, banco funcionando, PWA instalável vazia.

Entregas:

- Next.js 15 + TS strict + Tailwind v4, deploy no Vercel funcionando
- Dexie schema: `sessions`, `exerciseLogs` (plano não vai pro banco, é bundlado)
- Repositórios com as convenções (UUID, `updated_at`, tombstone)
- Serwist configurado: manifest, ícones, app shell cacheado
- Validação do `plan.json` rodando em build (falha o build se inválido)

Aceite:

- [ ] App instala na home screen do iOS e Android e abre offline
- [ ] Escrita e leitura no Dexie funcionando via repositório, com teste unitário dos repositórios
- [ ] Build falha se `plan.json` for corrompido de propósito

## Etapa 2 — Treino do dia

**Objetivo:** abrir o app e ver o treino de hoje, sem interação de registro ainda.

Entregas:

- `page.tsx` resolve o dia da semana e renderiza o dia do plano (ou estado vazio)
- Cards de exercício com nome, alvo, observação, descanso, agrupados por bloco
- Header do dia: título, skill, duração, aquecimento, tip

Aceite:

- [ ] Abrir o app numa segunda mostra o treino de MU sem nenhum toque
- [ ] Sábado/domingo mostram estado vazio decente
- [ ] Visual coerente com a paleta do plano HTML (cores por dia)

## Etapa 3 — Registro de sessão (núcleo do app)

**Objetivo:** o fluxo completo de treinar registrando. É a etapa mais longa e a única que não pode ser medíocre.

Entregas:

- "Começar" cria `Session(in_progress)` no banco imediatamente
- Card ativo expandido, demais colapsados; completar um exercício colapsa e abre o próximo
- Caminho feliz: `[✓ fiz como previsto]` em 1 toque grava `as_target: true`
- "Ajustar": steppers por série pré-preenchidos com o alvo; exercícios com `parsed: null` só têm check único
- Flags: seção colapsada `▸ como foi?`, chips multi-seleção, sem escrita
- Skip por long-press, grava `skipped: true`
- Finalizar: confirmação se sobrou exercício → RPE obrigatório (5 botões) → nota opcional → `completed`
- **Retomada**: fechar e reabrir o app com sessão `in_progress` volta exatamente onde parou (estado vem do banco, não de memória)
- **Wake lock** durante sessão ativa, com re-aquisição em `visibilitychange` (sem isso não funciona no uso real do iOS)
- **Instrumentação**: `logged_at` em cada `ExerciseLog`, `started_at`/`ended_at` na sessão. É o que torna a métrica de sucesso "< 10s por registro" verificável em vez de chute

Aceite:

- [ ] Sessão completa registrável só com toques (zero teclado no caminho feliz)
- [ ] Matar o app no meio da sessão e reabrir retoma o estado exato
- [ ] Tela não apaga durante sessão, inclusive depois de alternar apps no iOS
- [ ] Alvos de toque ≥ 44px em tudo

## Etapa 4 — Última performance

**Objetivo:** fechar o loop com os critérios de progressão do plano.

Entregas:

- Query: última `Session(completed)` do mesmo `plan_day_id`, lookup por `exercise_id`
- Render por caso: "como previsto · 09/07", "4/4/4/3 · 06/07", "pulado · 06/07", "primeira vez"
- Tolerante a exercício sem histórico e a plano com exercício novo

Aceite:

- [ ] Cada exercício mostra a última performance correta na sessão seguinte
- [ ] Exercício novo no plano não quebra nada

## Etapa 5 — Métricas

**Objetivo:** só o que sai direto do log (PRD seção 9).

Entregas:

- Dias treinados (total, 30 dias), streak atual e maior
- Aderência por dia da semana
- Volume por exercício ao longo do tempo (reconstituindo `as_target` via `parsed`)
- **Incidência de flags por exercício por sessão** (métrica principal: "chicken wing: 3/3 → 1/3 → 0/3")
- RPE médio (4 semanas)
- Gráficos em SVG próprio, sem lib pesada

Aceite:

- [ ] Incidência de flags legível e correta com dados reais de pelo menos 3 sessões
- [ ] Nenhum número derivado de heurística inventada; tudo rastreável ao log

## Etapa 6 — Durabilidade

**Objetivo:** eliminar o risco de perda de histórico. Requisito, não nice-to-have: IndexedDB no iOS pode ser removido sob pressão de storage, e o valor do app é o acumulado.

Entregas:

- Export JSON completo (sessions + logs + versão do plano) via Web Share / download
- Import com validação Zod e merge por UUID (não sobrescreve cegamente)
- Lembrete de export se o último foi há mais de N sessões
- Opcional se couber: endpoint mínimo no Vercel (Blob/KV) recebendo o dump. Backup burro, não sync

Aceite:

- [ ] Ciclo completo: exportar, limpar dados do site, importar, histórico intacto
- [ ] Import de arquivo corrompido falha com mensagem clara, sem tocar no banco

## Etapa 7 — Validação real

**Objetivo:** uma semana de uso real antes de considerar o v1 fechado.

- Usar em todas as sessões da semana, registrando durante o treino
- Medir com a instrumentação: tempo por registro no caminho feliz, % de sessões registradas ao vivo
- Verificar a métrica de falha das flags: se nenhum chip foi tocado nos exercícios críticos de MU, as flags estão erradas ou mal posicionadas; revisar antes de qualquer feature nova
- Lista de fricções observadas → decide o que entra num ciclo curto de ajuste

---

## Ordem e dependências

```
0 → 1 → 2 → 3 → 4 → 5
              ↘ 6 (pode paralelo a 4/5)
                     → 7
```

Etapas 0 a 3 são o produto. 4 e 5 são o valor analítico. 6 é seguro. Se precisar cortar algo por tempo, corta 5 parcialmente (deixa só incidência de flags), nunca 6.

## Fora de escopo (reafirmando)

Geração de treino/IA, edição do plano no app, timer de descanso, multi-usuário, sync real, vídeo. Qualquer um desses aparecendo no meio de uma etapa é scope creep e volta pro backlog do v2.

## Riscos conhecidos

| Risco | Mitigação |
|---|---|
| Eviction de IndexedDB no iOS | Etapa 6 + `navigator.storage.persist()` como best effort |
| Wake lock solto ao trocar de app | Re-aquisição em `visibilitychange`, testado em iOS real |
| Plano muda e órfã o histórico | IDs estáveis (etapa 0) + `version` no plano |
| Flags mal calibradas | Gate humano na etapa 0 + verificação na etapa 7 |
| Serwist/cache servindo versão velha | Estratégia de update do SW definida na etapa 1 (skipWaiting + prompt de reload) |
