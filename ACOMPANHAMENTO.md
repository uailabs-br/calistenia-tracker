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

> **Estado atual (2026-07-28, v1.6):** app **em produção no Vercel**
> (`calistenia-tracker.vercel.app`). Sobre a base v1, seis levas de melhorias de
> produto: v1.1 (seletor de treino, IDs por movimento), v1.2 (reset de dados,
> animações de página), v1.3 (feedback semanal, perfil, instalação em config,
> polimento do loop de treino), v1.4 (Plano V2: confiança + hábito + skill map;
> redesign do mapa de skills como catálogo canônico de 15 skills; ajuste manual de
> nível; histórico semanal realocado para o Histórico), v1.5 (timer minimizável,
> resumo de fim de treino, polimento de home/constância, microcopy das flags, fix de
> `reloadOnOnline`) e **v1.6** (treino avulso: registra treino fora do programa —
> hoje, ontem ou anteontem — sem perder streak/histórico). Typecheck limpo, 76
> testes passando. Falta a Etapa 7 (uso real na semana).

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
- [x] Deploy no Vercel funcionando (`calistenia-tracker.vercel.app`) — CI por push na `main`
- [ ] Instalação testada em iOS e Android reais (Etapa 7)

> **Nota de deploy:** o Vercel roda `npm ci`, que **exige `package-lock.json` em
> sincronia** com o `package.json`. Bump de versão manual sem atualizar o lock faz
> o build falhar. Ao mudar a versão, rodar `npm install --package-lock-only` e
> commitar o lock junto.

---

## Log de progresso

- **2026-07-13** — Documento criado. Etapa 0 confirmada concluída (`plan.json` revisado). Início da Etapa 1.
- **2026-07-13** — Etapas 1–6 implementadas. Build de produção OK, 18 testes passando, validador de plano falha em plano corrompido (exit 1). Fluxo de sessão dirigido em Chrome headless: Começar → registrar → auto-avanço → última performance ("como previsto") funcionando. Itens dependentes de device real (install/offline, wake lock iOS, ≥3 sessões p/ flags) marcados `[~]` para a Etapa 7. Próximo: deploy no Vercel.
- **2026-07-13 (ajuste)** — Dois pedidos do usuário:
  1. **IDs de exercício iguais entre dias** — unificados `mu-false-grip-hang` (Seg+Qui), `hs-frog-to-hs-negativa` (Ter+Sex), `hs-kickup-livre` (Ter+Qua). Regra de unicidade mudou para *única por dia, repetível entre dias*. Última performance e incidência de flags agora são **centradas no movimento** (histórico agrega entre dias). Volume usa o `parsed` do dia da sessão (alvo pode diferir, ex. frog-to-hs 5 rep vs 3). *Nota: "Kick-up controlado" (Sex) ficou com ID próprio por ser cue distinto — dizer se quer unificar.*
  2. **Selecionar qualquer template de treino** — cada "dia" virou template selecionável (`DayPills`); dá pra fazer o treino de terça numa segunda. A sessão grava o template escolhido (`weekday`) + a data real. Sessão ativa passou a usar o `weekday` da própria sessão (bug corrigido). Verificado em headless: escolher "Ter" na segunda gravou `weekday:2` com `date` de hoje. 19 testes passando (novo teste cross-day), build OK. Desativado o overlay de dev do Next que cobria a navegação.
- **2026-07-14** — Rodada de polimento de UX e acessibilidade (pós-v1):
  - **Home reformulada** — painel com saudação por horário (`HomeGreeting`), banner de retomada (`ResumeBanner`), card do treino de hoje com CTA de 1 toque e lista expansível (`TodayCard`), constância com mini-calendário da semana (`ConsistencyCard`), próximos treinos (`WeekStrip`) e métricas-resumo com sparkline de evolução (`HomeMetrics`).
  - **Timer de descanso** (`RestTimer`) — countdown por relógio de parede (robusto a throttling de aba), centralizado na tela sobre overlay escurecido, com foco no card ao iniciar, +15s, pular e feedback tátil/sonoro ao terminar. Descanso automático pós-registro (duração extraída do plano via `parseRestSeconds`).
  - **Notas por exercício** (`ExerciseNote`) — campo curto opcional, colapsado por padrão, persistido no blur. Novo campo `note` em `ExerciseLog` (backup mantém compatibilidade com defaults).
  - **Toasts** (`ToastProvider`/`useToast`) — feedback efêmero de registro/erro com ação "Desfazer" no registro de série.
  - **Instalação PWA** (`InstallPrompt`) — nudge de "adicionar à tela inicial" (Android via `beforeinstallprompt`, iOS com instrução), mitigando limpeza de IndexedDB.
  - **Streak semanal** — `currentStreak`/`longestStreak` passaram de dias para **semanas** consecutivas (um plano Seg–Sex não zera mais todo fim de semana). Novo `getWeekStatus` (estado da semana p/ a home) e `getHeroEvolution` (exercício-destaque + tendência).
  - **Acessibilidade** — hook `useModalA11y` (scroll-lock, focus-trap, Esc, restauração de foco) aplicado a `RestTimer`, `RpeSheet` e `ConfirmDialog`; zoom liberado no viewport (WCAG 1.4.4). `RpeSheet` com drag-to-dismiss.
  - **Robustez** — `app/error.tsx` (error boundary de rota), skeletons de carregamento (histórico/métricas), `SwUpdater` limpa SW órfão em dev (evita `ChunkLoadError`), `Stepper` com press-and-hold.
  - **Limpeza nesta revisão** — `useModalA11y` agora estabiliza `onClose` via ref e roda o setup só na montagem (sem re-travar scroll/re-roubar foco em re-render); `mondayKey` duplicado removido de `metrics.ts` em favor de `weekStartKey` compartilhado; `RestTimer` simplificado; comentário de `longDate` corrigido. Typecheck limpo, 19 testes passando, rotas servindo 200 em dev.
- **2026-07-16** — **v1.3: feedback semanal, perfil, instalação em config e polimento do loop de treino.** Priorização feita a partir do `IDEAS.md` (avaliação produto + técnico) antes de implementar. Etapas 1–2 do plano de melhorias:
  - **Feedback semanal (MVP)** — novo card na home (`WeekReviewCard`) que aparece **na primeira abertura de cada semana nova**, resumindo a semana anterior: treinos feitos vs. plano, delta de volume vs. a semana retrasada, RPE médio, e blocos "o que foi bom" / "a melhorar". Frase de motivação **contextual aos dados** (9 frases em 3 baldes — semana cheia / volume subindo / parcial), determinística por semana. Query pura (`getWeekReview` + `buildWeekReviewTexts` em `lib/db/queries/weekReview.ts`) sobre dados existentes — **sem mudança de schema**; dispensa via `localStorage` até a próxima virada. 9 testes novos.
  - **Perfil** — nome editável em Config (`lib/utils/profile.ts`, localStorage) usado na saudação da home ("Boa noite, Ruan"). Fora do backup (trivial de redigitar).
  - **Instalação PWA em Config** — `beforeinstallprompt` movido para um **singleton** (`lib/utils/installPrompt.ts`) capturado no import do módulo (o evento só dispara uma vez por load), compartilhado entre o nudge da home e a nova seção "Instalar app" em Config. Recupera o caminho de instalação depois de dispensar o nudge (mitigação real contra limpeza de IndexedDB no iOS). `InstallPrompt` refatorado para consumir o singleton.
  - **Loop de treino** — timer de descanso com botões **−5s/+5s** (clamp em zero) e **anel contínuo** por relógio de parede em precisão de ms (tick 100ms, sem degraus de 1s); stepper de segundos em **passo de 1s** (precisão para isometrias); RPE (`RpeSheet`) com **carinhas SVG de esforço** no estilo dos ícones do app; `TodayCard` com CTA "Começar treino" e, após concluir, estado **"✓ Treino concluído"** com "Treinar de novo" como link discreto (sessão ativa mantém "Continuar treino" como prioridade).
  - **Config** — rodapé mostra a **versão do app** lida do `package.json` (v1.3); linha "Sessões concluídas" removida (a contagem interna segue, pois alimenta o aviso de backup pendente).
  - **Infra** — helper `shiftDays` extraído para `date.ts`. Bump para `1.3.0` no `package.json`; **primeiro deploy falhou** por `package-lock.json` dessincronizado (`npm ci` do Vercel rejeita) — corrigido com `npm install --package-lock-only`. Deploy de produção OK, 28 testes passando, typecheck limpo.
  - **Decisões de produto adiadas** (pedido do usuário): não substituir RPE por qualidade de execução nem agrupar notas por ora; badge de "técnica" fica bloqueado até existir captura de qualidade. Sequência de gamificação planejada: streak → força (por recorde pessoal, não semana-a-semana) → técnica.
- **2026-07-19/20** — **v1.4: Plano V2 (confiança, hábito, skill map) + redesign do mapa de skills.** Implementação do `PLANO_IMPLEMENTACAO_V2.md` (tabela de status atualizada lá):
  - **Fase 0 · Confiança** — check falso em "Próximos treinos" (`lib/domain/upcoming.ts`), aderência por **dia executado** (não o sugerido), tempo estimado do treino (`lib/domain/estimateDuration.ts`).
  - **Fases 1–2 · Skill map (spike)** — regra de "execução limpa" via `neg_flags` no `plan.json` + check no validador; `getProgressionReady` ("pronto pra subir de nível"); mapa read-only da skill derivado dos logs.
  - **∥ Hábito** — anel da meta semanal (`ProgressRing`/`ConsistencyCard`), streak por **meta** com freeze determinístico, **PR no registro** (`computePR` + toast), **melhor hold** para isometrias.
  - **Polimento** — badges (famílias jornada/consistência), dialogs via `Portal`, scroll dos dias sem barra, pulse do timer só no número.
  - **Redesign do mapa de skills** — o mapa deixou de ser **por-dia** (descartado pelo usuário: "é o mesmo que olhar histórico") e virou **catálogo canônico de 15 skills** derivado de `lib/plan/progressions.json` (Overcoming Gravity / BWF Wiki / Gymnastic Bodies / GMB), desacoplado do `plan.json`. Índice em `/skills`, escada por skill em `/skills/[skill]`. Cumpre 7.1/7.2 (rollout) por outra via — conteúdo *sourced* em vez de curadoria manual do `plan.json`. Rota `/skills/[weekday]` removida. Rótulo "fora do plano" removido.
  - **Ajuste manual de nível** — toque no **número da progressão** marca "estou aqui"; posição exibida = `max(detecção por logs, ajuste manual)`, salvo em `localStorage` (`lib/utils/skillLevel.ts`). Posição por logs segue via `LEVEL_EXERCISE` (níveis mapeados a exercícios do plano).
  - **Histórico semanal realocado** — saiu das Métricas e virou o cabeçalho de cada semana no **Histórico**; semanas fechadas viram card de resumo com os treinos do dia **recolhíveis dentro do card**; semana corrente fica expandida.
  - **Home** — espaçamento padronizado num container `flex gap-6` (24px), sem margens soltas nos blocos — elimina a classe de bug "card colado" (gaps só existem entre blocos realmente renderizados).
  - **Infra** — bump para `1.4.0` (`package.json` + lock sincronizado). Typecheck limpo, **67 testes** passando; deploy de produção via push na `main` (`983ebcc..6f1b6e1`).
- **2026-07-24** — **v1.5: polimento de sessão/home e correção de fluxo de finalização, a partir de pedidos pontuais do usuário.**
  - **Flags** — microcopy "se foi a maioria das reps" em `FlagChips.tsx`: a heurística de quando marcar uma flag negativa já existia só como decisão de planejamento (`PLANO_IMPLEMENTACAO_V2.md` §1.1), nunca tinha chegado na UI. Fix de custo zero, sem mudança de schema. A ideia maior (trocar o binário por um tri-estado de severidade) segue em aberto no `IDEAS.md`.
  - **Timer de descanso** (`RestTimer.tsx`) — toque no fundo escurecido minimiza o timer num pill fixo no topo (countdown continua rodando); toque no pill expande de volta. `useModalA11y` ganhou um parâmetro `active` pra desligar scroll-lock/focus-trap sem desmontar o componente enquanto minimizado.
  - **PR (recorde pessoal)** — troféu (`TrophyIcon`, novo em `icons.tsx`) fica fixo no card do exercício que bateu recorde na sessão (antes só o toast, que sumia); toast de PR com duração maior (6.5s).
  - **`SessionSummary.tsx` (novo)** — tela ao finalizar o treino: nº de exercícios registrados, reps totais (soma só de exercícios em unidade "reps", pra não misturar com holds/tentativas), lista de recordes da sessão (troféu + nome + valor) e uma frase curta — headline fixa quando bate recorde, ou uma de 6 frases de encorajamento (rotação determinística por sessão, sem repetir a cada render) quando não bate. Corrigido no caminho: `app/treino/[weekday]/page.tsx` desmontava o `SessionRunner` assim que a sessão saía de "em andamento" no banco (`completeSession`), derrubando essa tela antes do usuário ver — resolvido avisando o pai *antes* de gravar a conclusão (`onCompleted`), não depois.
  - **Home** — removida a seção "Métricas" (duplicada com `/metricas`) e a query órfã `getHeroEvolution`; `ConsistencyCard` com anel/número maiores (`ProgressRing` ganhou props `size`/`stroke` escaláveis) e subtítulo do estado zero mais motivador ("sua sequência começa aqui 💪").
  - **Offline** — achada a causa provável do travamento relatado pelo usuário: `reloadOnOnline: true` (Serwist, `next.config.mjs`) recarrega a página inteira a cada evento `online` do navegador, mesmo sem atualização pendente — arriscado em sinal instável, já que o app tem fluxo próprio de update via prompt (`SwUpdater.tsx`). Desligado.
  - **Notificação push real (5.1)** — usuário confirmou que o lembrete nunca funcionou (feature sempre foi só UI/permissão, sem entrega). Arquitetura desenhada em modo de planejamento (Web Push/VAPID, Upstash Redis, cron via GitHub Actions dado o plano Hobby do Vercel) e aprovada, mas **implementação adiada** por decisão do usuário — ver detalhe em `IDEAS.md` §5.1.
  - **Infra** — bump para `1.5.0` (`package.json` + lock sincronizado). Typecheck limpo, **67 testes** passando; merge `dev → main` e deploy de produção (`6f1b6e1..c2a6a17`).
- **2026-07-28** — **v1.6: treino avulso (fora do programa).** Feature pedida pelo usuário e
  planejada via skill de produto (`PLAN-treino-avulso.md`) antes de implementar — dor real:
  dias em que o programa não é seguido mas o treino acontece mesmo assim hoje somem do
  histórico e da constância, sem jeito de registrar.
  - **Modelo de dados** — `Session` ganhou `source: "plan" | "freeform"` e `plan_day_id`
    virou opcional (Dexie v2, com migração automática marcando sessões antigas como
    `"plan"`). Treino avulso nasce **já completo** (não passa por `in_progress`) via
    `createFreeformSession(durationMinutes?, daysAgo?)` — duração é uma estimativa opcional
    do usuário, nunca medida ao vivo.
  - **Conta pra constância, mas fica diferenciada** — decisão de produto do usuário:
    `getWeekStatus` ganhou `freeformCount` e a origem por dia (`source`); a semana bate a
    meta contando avulsos, mas o mini-calendário (`ConsistencyCard`) marca o dia com contorno
    tracejado e mostra "X do programa + Y avulso(s)".
  - **CTA na home cobre esquecimento, não só o dia atual** — gap descoberto no teste real
    do próprio usuário: o primeiro recorte só registrava "hoje". Modal ganhou chips
    "Hoje/Ontem/Anteontem" (janela fixa de 2 dias pra trás, decisão deliberada — evita virar
    um editor de data livre); o CTA some só quando os 3 dias já têm algum treino.
  - **Histórico** — sessão avulsa não herda mais título/cor de um dia de plano que não tem
    nada a ver (bug em potencial: `weekday` de hoje podia coincidir com um dia de plano real);
    mostra "Treino avulso" com o badge "Avulso" e sem RPE/lista de exercícios.
  - **Compat** — `lib/db/backup.ts` aceita `plan_day_id` nulo e `source` opcional
    (backups anteriores à feature importam como `"plan"`).
  - **Infra** — bump para `1.6.0` (`package.json` + lock sincronizado). Typecheck limpo,
    **76 testes** passando (13 novos). Validado com Playwright headless contra o dev server:
    fluxo completo CTA → modal → registro → home → histórico → detalhe, incluindo o caso de
    backdating, sem erros de console.
