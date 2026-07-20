# Plano de Implementação V2 — Correções, Hábito & Skill Map

Deriva de [IDEAS.md → 🎯 Prioridades](IDEAS.md#-prioridades). Complementa o
[PLANO_IMPLEMENTACAO.md](PLANO_IMPLEMENTACAO.md) (v1). Mantém as convenções v1: UUID, `updated_at`,
soft delete, repositório (`lib/db/repositories/*`) para escrita, queries nomeadas (`lib/db/queries/*`),
IDs de exercício estáveis, `plan.json` validado em build (`scripts/validate-plan.mjs`).

**Como ler:** ordem = Fases 0→3 + trilha paralela `∥` (ganhos baratos, sem dependência de plano).
Cada item traz **Técnico**, **Definition of Done (DoD)** e **Teste**. Profundidade é proporcional à
prioridade: Fases 0–2 e `∥` detalhadas; 3–5 mais enxutas (re-detalhar ao pegar).

---

## Status de implementação (2026-07-19)

Legenda: ✅ feito e coberto por teste/validador · ◑ parcial · ⏳ pendente · 🔒 gated (aguarda checkpoint do spike).

| Item | Status | Onde |
|---|---|---|
| 0.1 Check falso em Próximos treinos | ✅ | `lib/domain/upcoming.ts`, `WeekStrip.tsx`, `test/upcoming.test.ts` |
| 0.2 Aderência por dia executado | ✅ | `lib/db/queries/metrics.ts`, `test/overview.test.ts` |
| 0.3 Tempo sugerido estimado | ✅ | `lib/domain/estimateDuration.ts`, `test/estimateDuration.test.ts` |
| 1.1 Regra de execução limpa (decisão) | ✅ | refletida em `neg_flags` + guard-rails 4.1/3.1/7.2a |
| 7.1a `neg_flags` do MU + validador | ✅ | `plan.json`, `schema.ts`, `validate-plan.mjs` |
| 4.1 Progressão "pronto pra subir" | ✅ | `lib/db/queries/progressionReady.ts`, `ProgressionNudge.tsx`, `test/progressionReady.test.ts` |
| 7.2a Mapa read-only da skill | ✅ | `app/skills/[weekday]`, `lib/domain/skillMap.ts`, `test/skillMap.test.ts` |
| 2.1 Anel da meta semanal | ✅ | `ProgressRing.tsx`, `ConsistencyCard.tsx`, override em Config |
| 2.2 Streak por meta + freeze | ✅ | `lib/domain/streak.ts`, `metrics.ts`, `test/streak.test.ts` |
| 3.1 PR no registro | ✅ | `lib/db/queries/pr.ts`, `SessionRunner.tsx`, `test/pr.test.ts` |
| 3.2 Isometrias (melhor hold) | ✅ | `getBestHold`, Métricas, `test/bestHold.test.ts` |
| 5.2 Histórico semanal consultável | ✅ | `getWeekReview(monday)`/`getWeekHistory`, Métricas, `test/weekReview.test.ts` |
| 6.2 Timer de descanso (pulse 5s) | ✅ | `RestTimer.tsx` (som/centro já existiam) |
| 6.3 Dialogs via portal | ✅ | `components/ui/Portal.tsx` + Confirm/Rpe/RestTimer |
| 6.5 Scroll dos dias sem barra | ✅ | `.no-scrollbar`, `DayPills.tsx` |
| 6.1 Badges | ✅ | `lib/domain/badges.ts`, `getBadges`, `components/metrics/Badges.tsx`, `test/badges.test.ts` |
| 6.4 Instalar cross-browser | ✅ | já atendido por `installPrompt.ts` + `InstallPrompt.tsx` + Config (prompt/iOS/manual) |
| 5.1 Lembrete (copy + permissão) | ◑ | `reminderCopy.ts` (+teste), `ReminderSettings.tsx`, prefs em `profile.ts`. **Falta:** entrega em background confiável (R4) |
| 7.2a checkpoint do spike | ⏳ | validar hipótese "mapa é viciante" com uso real |
| 7.1 / 7.2 Rollout demais skills | 🔒 | só após o checkpoint (custo = curadoria) |
| 7.3 Referência técnica (cues) | ⏳ | conteúdo/visual, sem deliverable de código claro |

---

## Fundações compartilhadas (fazer uma vez, habilita vários itens)

- **Sem migração de banco.** Quase tudo é derivável de `Session`/`ExerciseLog`; o novo mora em
  `lib/db/queries/*`. Preserva compat. de backup (v1).
- **`neg_flags` no `plan.json` [decisão 1.1 — aditivo, não-quebra].** Estender `exerciseSchema`
  ([lib/plan/schema.ts:17](lib/plan/schema.ts#L17)) com `neg_flags: z.array(z.string()).optional()` —
  lista de *labels* de flag que contam como execução **suja**. `flags_selected` (log) continua string[].
  Execução limpa de um log = `flags_selected` não intersecta `neg_flags` do exercício.
  - _Alternativa avaliada:_ trocar `flags: string[]` por `{label, quality}[]` — mais expressivo, mas
    quebra render de flags e o backup. Descartado por custo/risco. **Trade-off:** `neg_flags` duplica o
    label; mitigado por um check no validador (todo `neg_flags` existe em `flags`).
- **Skill goal já é representável.** O item de `day.progression` com `exercise_id: null` + `label` já é
  a skill final (ex.: "MU completo"). Não precisa de `skill_goal` novo para o spike.
- **Gatilho de avaliação = virada de semana.** Reusar o hook do `WeekReviewCard`
  ([components/home/WeekReviewCard.tsx:19](components/home/WeekReviewCard.tsx#L19)) para consolidar
  streak/badges sem interromper o treino.

---

## Fase 0 · Confiança (bugs de dado — fazer já)

### 0.1 — Check falso "feito" em Próximos treinos
**Técnico:** em [WeekStrip.tsx:41](components/home/WeekStrip.tsx#L41) `done` vem de
`doneWeekdays` (dias feitos **na semana corrente**). Como `upcoming` lista **ocorrências futuras** por
distância, o treino de segunda já feito reaparece como "próxima segunda" com check indevido. Ocorrência
futura nunca está concluída → remover o ramo `done` do `WeekStrip` (sempre mostrar `d.label`/`duration`),
ou só marcar concluído se a ocorrência cai **antes de hoje na mesma semana** (não é o caso aqui, pois
`dist !== 0` já exclui hoje e olha pra frente).
**DoD:** nenhum item de "Próximos treinos" exibe check/"concluído"; um dia feito hoje deixa de aparecer
marcado como próximo. Sem regressão no mini-calendário do `ConsistencyCard` (esse usa dia executado, ok).
**Teste:** unit em util de "upcoming" (extrair de `WeekStrip` p/ testável): com sessão de segunda feita e
`today=quarta`, a próxima segunda vem `done:false`. Manual: fazer treino, conferir a lista.

### 0.2 — Aderência por dia usa dia executado, não o sugerido
**Técnico:** [metrics.ts:96](lib/db/queries/metrics.ts#L96) conta `sessions.filter(s => s.weekday === d.weekday)`
— `s.weekday` é o dia **do plano** (sugerido). Trocar por dia **executado**:
`weekdayOf(new Date(s.date + "T00:00:00"))` (mesmo cálculo que `getWeekStatus` já usa em
[metrics.ts:236](lib/db/queries/metrics.ts#L236)). **Decisão aberta:** agrupar por dia-calendário do
plano (rótulos Seg…Dom) atribuindo a sessão ao weekday real — default recomendado; documenta que treino
adiantado conta no dia em que foi feito.
**DoD:** treino de terça feito na segunda soma na barra de **segunda**, não na de terça. `pct` continua
capado em 100.
**Teste:** unit em `getOverview` com sessão `weekday=2` (plano) e `date` numa segunda → `adherenceByWeekday`
credita a segunda. `fake-indexeddb` (padrão dos testes de repo).

### 0.3 — Tempo sugerido do treino
**Técnico:** hoje `day.duration` é texto livre. Criar `estimateDurationSeconds(day)` em
`lib/domain/` somando por exercício: `sets * TRABALHO_POR_SERIE[unit]` + `(sets-1) * rest` +
`rest` entre exercícios. `rest` via `parseRestSeconds` ([parseTarget.ts:47](lib/domain/parseTarget.ts#L47)),
já existente. `TRABALHO_POR_SERIE`: `seconds`→`target`; `reps`→~3s/rep; `attempts`→~20s (constantes
comentadas, "para fins de teste" como a nota pede). Exibir `~Xmin` calculado; manter o texto do plano só
como fallback quando `parsed` faltar.
**DoD:** duração exibida bate com a soma (±1min) para ao menos 2 dias reais; dia sem `parsed` cai no
fallback sem quebrar.
**Teste:** unit determinístico de `estimateDurationSeconds` com um dia sintético (valores fixos → total
esperado).

---

## Fase 1 · Destravar (custo ~zero)

### 1.1 — Regra de "execução limpa" [DECISÃO, não código]
**Decidir e documentar** (vira o guard-rail de 3.1/4.1/6.1):
- **Regra:** um log conta como **limpo** quando **nenhuma flag negativa** (`neg_flags`) foi marcada.
  Binário, casa com o modelo (flags são por-exercício, não por-rep).
- **Guia de UX (quando marcar a flag negativa):** marcar quando a falha apareceu na **maioria** das reps
  (heurística ≥ ~⅓). "10 kick-up certos + 1 errado" → **não** marca "passou do ponto". Texto entra como
  microcopy/ajuda perto das flags.
**DoD:** regra escrita no topo deste plano e refletida no preenchimento de `neg_flags` do `plan.json`.
**Teste:** N/A (decisão) — validado indiretamente pelos testes de 3.1/4.1.

---

## Fase 2 · Spike do Skill Map (1 skill, valida a hipótese "viciante")

> Escolher **1 skill** para o corte fino. Recomendo **Muscle Up** (já tem `progression` rica no
> `plan.json`, 4 passos incluindo goal `exercise_id:null`). Só depois do spike validar → Fase 3.

### 7.1a — Enriquecer `plan.json` de 1 skill + `neg_flags`
**Técnico:** para a skill escolhida, garantir a cadeia em `day.progression` (já existe p/ MU) e preencher
`neg_flags` nos exercícios dessa skill (ex.: `mu-puxada-explosiva` → `["parou no queixo","kip apareceu"]`).
Atualizar `scripts/validate-plan.mjs` para checar que todo `neg_flags[i]` ∈ `flags`.
**DoD:** `npm run validate:plan` passa; MU tem cadeia + `neg_flags` coerentes.
**Teste:** rodar o validador (build gate). Caso negativo: `neg_flags` com label inexistente → validador
falha.

### 4.1 — Progressão A: "pronto pra subir de nível" (genérica)
**Técnico:** nova query `getProgressionReady(exerciseId)` em `lib/db/queries/`, prima de
[lastPerformance.ts](lib/db/queries/lastPerformance.ts): pega as últimas **N=2** sessões `completed` do
movimento (ignora `skipped`); "bateu" = `as_target` **ou** todas as séries `≥ target`
(via `effectiveSets`/`parsed`); "limpo" = sem interseção com `neg_flags`. Se N consecutivas bateram limpo →
retorna nudge. UI: **não** interrompe no meio — card no fim da sessão (`SessionRunner`) ou no
`WeekReviewCard`. Ação por ora informacional (v1 não edita plano).
**DoD:** com 2 sessões no alvo e limpas → nudge aparece; 1 série abaixo do alvo **ou** flag negativa →
não aparece.
**Teste:** unit de `getProgressionReady` cobrindo: 2× limpo no alvo (ready); 2× no alvo com 1 flag neg
(not ready); 1× no alvo (not ready); `per_side`/`as_target`.

### 7.2a — Mapa read-only da skill do spike
**Técnico:** nova tela/rota (ex.: `app/skills/[skill]` ou seção em Métricas) que renderiza
`day.progression` da skill como fases verticais. "Onde estou" = maior passo cuja `exercise_id` já foi
registrado com sucesso limpo (reusa a lógica de 4.1) — passos anteriores = concluídos, atual = em foco,
seguintes = bloqueados. Goal (`exercise_id:null`) é a fase final. Registrar data do 1º sucesso por passo
em `localStorage` (chave versionada) — barato, habilita retrospectiva futura.
**DoD:** mapa mostra os 4 passos do MU, com a posição do usuário derivada dos logs; muda ao registrar o
próximo passo limpo.
**Teste:** unit da função "posição na cadeia" (logs sintéticos → índice esperado). Manual: percorrer com
dados semeados. **Checkpoint do spike:** decidir se a hipótese "viciante" se sustenta antes da Fase 3.

---

## Fase 3 · Rollout do Skill Map (só se o spike confirmar)

### 7.1 — Enriquecer as demais skills + Progressão B (cadeia)
**Técnico:** preencher `progression` + `neg_flags` para todas as skills do plano. Progressão B usa
`criteria`/`proximo` da cadeia para o nudge específico ("de false-grip hang → pull-up"). **Custo real =
curadoria de conteúdo** (humano), não código. **DoD:** validador passa p/ todas as skills; nudge cita o
próximo passo nomeado. **Teste:** validador + unit de B (mapeia passo atual→próximo).

### 7.2 — Mapa completo (todas as skills)
**Técnico:** generalizar 7.2a para lista de skills (índice → mapa por skill). **DoD:** cada skill do plano
tem mapa navegável. **Teste:** smoke de render por skill.

---

## ∥ Ganhos baratos de hábito (rodar em paralelo desde já — sem dependência de plano)

### 2.1 — Meta semanal única (o "anel")
**Técnico:** dado já existe — `getWeekStatus` retorna `done`/`planTotal`
([metrics.ts:226](lib/db/queries/metrics.ts#L226)), contando dias distintos. Trocar o número do
`ConsistencyCard` ([ConsistencyCard.tsx:30](components/home/ConsistencyCard.tsx#L30)) por **anel de
progresso SVG** (`done/planTotal`), inequívoco ("3/5"). `planTotal` default = `plan.days.length`; permitir
override em Config (persistir em `localStorage`/profile). Micro-celebração ao fechar (alimenta 2.2).
**Design (racional):** um alvo, não painel (lição Apple Rings) — evita competir com as demais métricas.
**DoD:** anel reflete sessões de `plan_day_id` **distintos** na semana; repetir treino não passa de 100%.
**Teste:** unit de `getWeekStatus` (2 sessões mesmo dia = `done:1`); snapshot do anel em 0/parcial/cheio.

### 2.2 — Streak semanal com freeze
**Técnico:** hoje `currentStreak` conta "≥1 treino/semana"
([metrics.ts:55](lib/db/queries/metrics.ts#L55)). Mudar unidade para **atingiu a meta semanal** (2.1);
semana corrente fica **pendente** (não quebra antes de terminar). Freeze **determinístico** (sem estado
no banco): +1 proteção a cada 4 semanas cumpridas, teto 2; semana falha consome proteção e preserva a
streak (não incrementa). **DoD:** meta batida estende streak; semana falha com proteção mantém; sem
proteção quebra; corrente nunca quebra no meio. **Teste:** unit sobre histórico sintético de semanas
(cheia/falha/protegida) — casos de fronteira do freeze.

### 3.1 — PR (recorde) no momento do registro
**Técnico:** ao concluir um exercício no `SessionRunner`, `computePR(exerciseId, log)`: reconstrói o valor
(`effectiveSets`/`parsed`) e compara com logs anteriores do `exercise_id`. `reps`→PR de série e/ou volume;
`seconds`→**maior hold único** (métrica-rainha das isometrias); `attempts`→sem PR. PR só se **limpo**
(sem `neg_flags`). Bordas: 1ª vez ≠ PR; empate ≠ PR; `per_side` compara por lado; `as_target` só é PR se
alvo > melhor anterior. UI: `useToast({variant:"success"})`
([Toast.tsx:133](components/ui/Toast.tsx#L133)) "🏆 Novo recorde — 18s de parada de mão"; flag negativa →
sem PR. **DoD:** superar melhor histórico limpo dispara toast 1×; empate/suja/1ª vez não disparam.
**Teste:** unit de `computePR` por unidade + bordas (empate, per_side, as_target, suja).

### 3.2 — Isometrias como métrica de 1ª classe (melhor hold)
**Técnico:** `getBestHold(exerciseId)` para `parsed.unit === "seconds"`: máximo `set.value` (não soma) ao
longo das sessões. Gráfico "melhor hold no tempo" (reusa `Sparkline`/`StatTile` em Métricas), separado do
volume. **DoD:** exercício de segundos mostra evolução do maior hold; exercício de reps não oferece a
métrica. **Teste:** unit de `getBestHold` (séries [8,10,6] → 10; progressão 8→12→18).

---

## Fase 4 · Retenção ativa e consulta

### 5.1 — Notificação/lembrete de treino
**Técnico:** push local via Service Worker (Serwist já no projeto) + `Notification`/`showTrigger` ou
agendamento no SW; hora configurável em Config; variações de copy (tom leve) sorteadas por dia
(determinístico por data). **Risco:** permissão e confiabilidade de push em iOS PWA — validar cedo.
**DoD:** usuário define horário, recebe lembrete no dia de treino, sem push em folga. **Teste:** unit do
seletor de copy (determinístico); manual de permissão/entrega por plataforma.

### 5.2 — Histórico semanal consultável (Opção A)
**Técnico:** reaproveita `getWeekReview` ([weekReview.ts:32](lib/db/queries/weekReview.ts#L32))
generalizando para semanas passadas (parametrizar a segunda-base). Nova seção em Métricas listando
resumos; o card da home vira só o "empurrão". **DoD:** resumo de qualquer semana com treino é consultável
após dispensar o card. **Teste:** unit de `getWeekReview(monday)` para semana arbitrária.

---

## Fase 5 · Camada fina e polimento

### 6.1 — Badges (camada fina)
Derivado dos logs; famílias **consistência** (deriva de 2.2), **jornada** (10/50/100 sessões, 1º dia de
skill, "primeiro muscle-up" via goal limpo), **técnica** (incidência de flag negativa de um movimento cai
a zero por ≥3 sessões — reusa `FlagIncidenceRow`/`getFlagIncidence`). "Novas?" via `Set` em `localStorage`.
Zero pontos/moeda. **DoD:** selo mapeia 1:1 a fato do log; seção "Conquistas" (ganhas/bloqueadas).
**Teste:** unit por família (limiar exato dispara/não dispara).

### 6.2 — Refinamento do timer de descanso
Timer no **centro da tela** independente do scroll (overlay/portal), maior; `pulse` nos últimos 5s; som de
fim (asset leve, respeitando mudo/silent). **DoD:** visível centralizado durante todo o descanso; pulse e
som nos 5s finais. **Teste:** manual + unit da lógica de "últimos 5s".

### 6.3 — Padronizar dialogs (centro + foco) via portal
**Técnico:** `ConfirmDialog` já centraliza e gerencia foco, mas `position:fixed` é quebrado por ancestral
com `transform` (ex.: `PageTransition`). Fix: renderizar o overlay via `createPortal(document.body)` no
`ConfirmDialog` (e aplicar o mesmo a `RpeSheet`/`RestTimer`). **DoD:** dialog de sair sem salvar centraliza
no celular mesmo dentro de página com transição; foco inicial no dialog; ESC/backdrop fecham. **Teste:**
manual em device/emulador dentro de uma transição de página; verificar foco.

### 6.4 — Botão de baixar cross-browser
Instalação real onde a plataforma permite (`beforeinstallprompt`); Safari/iOS → instruções (não há API).
Detectar plataforma em `lib/utils/installPrompt.ts`. **DoD:** Chrome/Android instala via botão; iOS mostra
guia. **Teste:** manual por navegador.

### 6.5 — Scroll dos dias sem barra + altura dos cards
CSS: `scrollbar-width:none` + `::-webkit-scrollbar{display:none}` mantendo o scroll; aumentar altura dos
cards. **DoD:** sem barra visível, scroll funciona, cards maiores. **Teste:** visual.

### 7.3 — Referência técnica visual (cues estruturados)
Sem vídeo (protege offline-first). Estruturar `obs`/`tip` como cues; no máximo imagem/GIF leve por
movimento-chave. **DoD:** movimento-chave mostra cues estruturados. **Teste:** visual.

---

## Riscos

| # | Risco | Mitigação |
|---|-------|-----------|
| R1 | **Curadoria do `plan.json`** (Fase 3) mais cara que o previsto | Spike de 1 skill (Fase 2) valida antes de pagar o custo total |
| R2 | Hipótese "mapa é viciante" não se confirma | Checkpoint ao fim da Fase 2; `∥` entrega retenção independente disso |
| R3 | `neg_flags` diverge dos `flags` (label duplicado) | Check no `validate-plan.mjs` (todo `neg_flags` ∈ `flags`) — gate de build |
| R4 | Push em iOS PWA pouco confiável (5.1) | Validar permissão/entrega cedo; degradar p/ sem-push sem quebrar |
| R5 | Regra "limpo" binária esconde melhora parcial | Guia de UX de quando marcar flag; revisitar se dado mostrar ruído |

## Milestones (= Fases)

1. ✅ **M0 · Confiança** — 0.1, 0.2, 0.3. Sem dependência; entra já. _Risco #1 no M2, não aqui._
2. ✅ **M1 · Destravar** — 1.1 (decisão) + `neg_flags` da skill do spike.
3. ✅ **M2 · Spike do mapa** — 7.1a → 4.1 → 7.2a. **Código pronto; falta o checkpoint da hipótese (R1/R2) com uso real.**
4. ✅ **M∥ · Ganhos baratos** — 2.1, 2.2, 3.1, 3.2. Em paralelo desde o M0.
5. 🔒 **M3 · Rollout mapa** — 7.1, 7.2 (só se M2 confirmar).
6. ◑ **M4/M5 · Retenção + polish** — 5.2, 6.1, 6.2, 6.3, 6.4, 6.5 ✅; 5.1 parcial (◑, falta background); 7.3 pendente (conteúdo).
