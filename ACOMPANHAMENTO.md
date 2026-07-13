# Acompanhamento de Desenvolvimento — Calistenia Tracker v1

Documento vivo de execução. Baseado no `PRD-calistenia-tracker-v1.md` e no `PLANO_IMPLEMENTACAO.md`.
Cada etapa fecha quando **todos** os itens de aceite estão marcados.

**Legenda:** `[ ]` pendente · `[~]` em andamento · `[x]` concluído

---

## Status geral

| Etapa | Descrição | Status |
|---|---|---|
| 0 | Dados antes de código (`plan.json` + schema) | `[x]` |
| 1 | Fundação (Next.js, Dexie, PWA) | `[x]` |
| 2 | Treino do dia | `[x]` |
| 3 | Registro de sessão (núcleo) | `[x]` |
| 4 | Última performance | `[x]` |
| 5 | Métricas | `[x]` |
| 6 | Durabilidade (backup) | `[x]` |
| 7 | Validação real (1 semana de uso) | `[ ]` ← **você** |

> **Estado atual (2026-07-13):** app completo e rodando local. Build de produção
> OK, 18 testes passando, fluxo de sessão validado em browser real (Começar →
> registrar → auto-avanço → última performance). Falta só o deploy no Vercel e a
> Etapa 7 (uso real na semana).

---

## Decisões técnicas travadas

- **Stack:** Next.js 15 (App Router, export estático), TypeScript strict, Tailwind v4, Dexie.js (IndexedDB), Serwist (PWA), Zod.
- **Paleta:** dark, do plano HTML — `--bg #0E0E0F`, `--surface #181819`, `--surface2 #222224`, `--border #2A2A2D`, `--text #F0EFE8`, `--muted #7A7A82`. Accent por dia vem do `plan.json`.
- **Fontes:** DM Sans (corpo) + DM Mono (números/labels).
- **Convenções obrigatórias:** UUID v4 no client · `updated_at` em toda escrita · soft delete (`deleted_at`) · camada de repositório (componente nunca chama Dexie direto) · IDs de exercício = slug estável.
- **UX:** touch ≥ 44px, ícones SVG (não emoji), transições 150-300ms, `prefers-reduced-motion` respeitado.

---

## Etapa 0 — Dados antes de código `[x]`

- [x] `plan.json` gerado do HTML com `version`, `imported_at`, IDs slug, `parsed`, `flags`
- [x] Todos os 4 dias de treino + dia de prática representados
- [x] Revisão manual das flags feita pelo usuário *(gate humano — confirmado)*
- [x] `schema.ts` (Zod) espelhando o PRD seção 5 → **entra na Etapa 1**

---

## Etapa 1 — Fundação `[x]`

### Entregas
- [x] Next.js 15 + TS strict + Tailwind v4 configurados
- [x] Paleta e fontes aplicadas no tema base
- [x] Dexie schema: `sessions`, `exerciseLogs`
- [x] Repositórios com convenções (UUID, `updated_at`, tombstone) em `lib/db/repositories/*`
- [x] Loader + schema Zod do `plan.json` (`lib/plan/`)
- [x] Validação do `plan.json` rodando no build (falha se inválido)
- [x] Serwist: manifest, ícones, app shell cacheado, estratégia de update do SW
- [x] Layout base + navegação (Hoje / Histórico / Métricas / Config)

### Aceite
- [x] `npm run dev` sobe o app sem erro
- [x] `npm run build` passa; falha se `plan.json` for corrompido de propósito
- [x] Escrita e leitura no Dexie funcionando via repositório
- [~] App instalável (manifest + SW válidos e servidos ✓) — *instalar/offline em device real pendente (Etapa 7)*
- [x] Teste unitário dos repositórios / parseTarget passando

---

## Etapa 2 — Treino do dia `[x]`

### Entregas
- [x] `page.tsx` resolve o dia da semana e renderiza o dia do plano
- [x] Estado vazio decente para Sáb/Dom
- [x] Cards de exercício: nome, alvo, obs, descanso, agrupados por bloco
- [x] Header do dia: título, skill, duração, aquecimento, tip
- [x] Cor de accent por dia aplicada

### Aceite
- [x] Abrir numa segunda mostra o treino de MU sem nenhum toque
- [x] Sáb/Dom mostram estado vazio decente
- [x] Visual coerente com a paleta do plano HTML (cores por dia)

---

## Etapa 3 — Registro de sessão (núcleo) `[x]`

### Entregas
- [x] "Começar" cria `Session(in_progress)` no banco imediatamente
- [x] Card ativo expandido, demais colapsados; completar colapsa e abre o próximo
- [x] Caminho feliz: `[✓ fiz como previsto]` grava `as_target: true` em 1 toque
- [x] "Ajustar": steppers por série pré-preenchidos com o alvo
- [x] Exercícios com `parsed: null` só têm check único
- [x] Flags: seção colapsada `▸ como foi?`, chips multi-seleção, sem escrita
- [x] Skip por long-press → `skipped: true`, permanece no histórico
- [x] Finalizar: confirmação se sobrou exercício → RPE obrigatório (5 botões) → nota opcional → `completed`
- [x] Retomada: reabrir com sessão `in_progress` volta ao estado exato (do banco)
- [x] Wake lock durante sessão, re-aquisição em `visibilitychange`
- [x] Instrumentação: `logged_at` por log, `started_at`/`ended_at` na sessão

### Aceite
- [x] Sessão completa registrável só com toques (zero teclado no caminho feliz)
- [x] Matar o app no meio e reabrir retoma o estado exato *(estado vem do banco; verificado via reload no browser)*
- [~] Tela não apaga durante sessão — *código de wake lock + re-aquisição pronto; confirmar em iOS real (Etapa 7)*
- [x] Alvos de toque ≥ 44px em tudo (utilitário `.tap`)

---

## Etapa 4 — Última performance `[x]`

### Entregas
- [x] Query: última `Session(completed)` do mesmo `plan_day_id`, lookup por `exercise_id`
- [x] Render por caso: "como previsto · data" / "4/4/4/3 · data" / "pulado · data" / "primeira vez"
- [x] Tolerante a exercício sem histórico e a plano com exercício novo

### Aceite
- [x] Cada exercício mostra a última performance correta na sessão seguinte
- [x] Exercício novo no plano não quebra nada

---

## Etapa 5 — Métricas `[x]`

### Entregas
- [x] Dias treinados (total, 30 dias)
- [x] Streak atual e maior streak
- [x] Aderência por dia da semana (%)
- [x] Volume por exercício ao longo do tempo (reconstituindo `as_target` via `parsed`)
- [x] **Incidência de flags por exercício por sessão** (métrica principal)
- [x] RPE médio (4 semanas)
- [x] Gráficos em SVG próprio (sem lib pesada)

### Aceite
- [~] Incidência de flags legível e correta — *lógica pronta e testada; confirmar com ≥ 3 sessões reais (Etapa 7)*
- [x] Nenhum número derivado de heurística inventada; tudo rastreável ao log

---

## Etapa 6 — Durabilidade `[x]`

### Entregas
- [x] Export JSON completo (sessions + logs + versão do plano)
- [x] Import com validação Zod e merge por UUID (não sobrescreve cegamente)
- [x] Lembrete de export se o último foi há mais de N sessões

### Aceite
- [x] Ciclo completo: exportar, limpar dados do site, importar, histórico intacto
- [x] Import de arquivo corrompido falha com mensagem clara, sem tocar no banco

---

## Etapa 7 — Validação real `[ ]`

- [ ] Usar em todas as sessões da semana, registrando durante o treino
- [ ] Medir: tempo por registro no caminho feliz, % de sessões registradas ao vivo
- [ ] Verificar métrica de falha das flags nos exercícios críticos de MU
- [ ] Lista de fricções observadas → ciclo curto de ajuste

---

## Deploy

- [x] Rodando local (`npm run dev`) e validado
- [x] Build de produção OK (`npm run build`)
- [ ] Deploy no Vercel funcionando ← próximo passo
- [ ] Instalação testada em iOS e Android reais (Etapa 7)

---

## Log de progresso

- **2026-07-13** — Documento criado. Etapa 0 confirmada concluída (`plan.json` revisado). Início da Etapa 1.
- **2026-07-13** — Etapas 1–6 implementadas. Build de produção OK, 18 testes passando, validador de plano falha em plano corrompido (exit 1). Fluxo de sessão dirigido em Chrome headless: Começar → registrar → auto-avanço → última performance ("como previsto") funcionando. Itens dependentes de device real (install/offline, wake lock iOS, ≥3 sessões p/ flags) marcados `[~]` para a Etapa 7. Próximo: deploy no Vercel.
- **2026-07-13 (ajuste)** — Dois pedidos do usuário:
  1. **IDs de exercício iguais entre dias** — unificados `mu-false-grip-hang` (Seg+Qui), `hs-frog-to-hs-negativa` (Ter+Sex), `hs-kickup-livre` (Ter+Qua). Regra de unicidade mudou para *única por dia, repetível entre dias*. Última performance e incidência de flags agora são **centradas no movimento** (histórico agrega entre dias). Volume usa o `parsed` do dia da sessão (alvo pode diferir, ex. frog-to-hs 5 rep vs 3). *Nota: "Kick-up controlado" (Sex) ficou com ID próprio por ser cue distinto — dizer se quer unificar.*
  2. **Selecionar qualquer template de treino** — cada "dia" virou template selecionável (`DayPills`); dá pra fazer o treino de terça numa segunda. A sessão grava o template escolhido (`weekday`) + a data real. Sessão ativa passou a usar o `weekday` da própria sessão (bug corrigido). Verificado em headless: escolher "Ter" na segunda gravou `weekday:2` com `date` de hoje. 19 testes passando (novo teste cross-day), build OK. Desativado o overlay de dev do Next que cobria a navegação.
