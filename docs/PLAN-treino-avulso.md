# PLAN — Registro de treino avulso

## Contexto
Usuário: você mesmo, pratica o programa fixo por dia da semana no app. Outcome: dias em que
você treina mas não segue o plano do dia (ex: treinou em outro lugar, fez algo diferente,
"quebrou" a rotina mas não parou) hoje **não têm como ser registrados** — o dia fica em
branco no histórico e na constância. Evidência: relato direto seu. Premissa mais arriscada:
dá pra tratar esse treino avulso como uma `Session` sem `plan_day_id` reaproveitando o mesmo
pipeline de streak/constância, sem quebrar as telas que hoje assumem que toda `Session` tem
um dia de plano válido por trás.

Isso também toca uma decisão em aberto já registrada em `IDEAS.md` ("[Q2] Faz sentido os
treinos terem dias fixos?") — este plano não resolve o Q2 geral, só cobre o caso pontual do
treino avulso sem reabrir o modelo de dias fixos do plano.

## Direção de design (Bloco A — UI-heavy)

**Fluxo principal:**
1. Na Home (`app/page.tsx`), se o dia ainda não tem nenhuma `Session` completa (nem do
   plano, nem avulsa), aparece um CTA secundário abaixo do `TodayCard`: **"Treinei fora do
   programa hoje"**.
2. Toque abre um form mínimo (modal): campo numérico opcional "quantos minutos, aprox?"
   (placeholder, sem obrigatoriedade) + botão primário "Registrar treino".
3. Ao confirmar, cria e já completa uma `Session` com `source: "freeform"`,
   `plan_day_id: null`, `weekday` = dia real de hoje, `ended_at = now`,
   `started_at = now - duração` (ou `started_at = ended_at` se duração ficou em branco).
4. `TodayCard` passa a mostrar estado "Treino avulso registrado" com ação discreta
   "desfazer".
5. Se já existe uma `Session` completa no dia (do plano ou avulsa), o CTA some — não dá pra
   registrar dois treinos por este atalho no mesmo dia.

**Estados obrigatórios:**
- Vazio (nenhum treino hoje): mostra o CTA.
- Carregando: botão "Registrar" desabilita + spinner durante o submit.
- Erro: falha ao gravar no IndexedDB → toast de erro, form mantém o valor digitado pra
  retry.
- Sucesso: `TodayCard` atualiza pro estado "avulso registrado" sem precisar recarregar a
  página.
- Dados parciais: duração vazia é um input válido, não bloqueia o submit.

**Decisões (Zhuo):**
- CTA some quando já existe sessão completa no dia porque evita duplo-registro confuso na
  constância semanal. Trade-off: quem quiser logar dois treinos no mesmo dia não consegue
  por este fluxo (fica de fora do MVP).
- Duração é opcional porque a dor principal é "não sumir do histórico", não "medir
  performance" do treino avulso. Trade-off: estatísticas de tempo total ficam incompletas
  nos dias sem duração informada.
- Reaproveita a mesma `Session`/pipeline de completion (em vez de tabela nova) porque
  `getOverview`/`getWeekStatus` já agregam por `date` sem exigir plano válido — dá pra herdar
  streak, `WeekStrip` e `ConsistencyCard` de graça. Trade-off: `Session` ganha campo novo
  (`source`) e `plan_day_id` vira opcional, exigindo revisão de todo código que hoje assume
  `plan_day_id` presente (ex: `ExerciseLog`, tela de detalhe de sessão).

## Arquitetura

| Opção | Prós | Contras |
|-------|------|---------|
| **A. Estender `Session`** (campo `source`, `plan_day_id` opcional) | Reaproveita 100% de streak/métricas/soft-delete já testados; menor mudança de superfície | Precisa tornar `plan_day_id` opcional e revisar código que assume presença dele |
| **B. Entidade nova `FreeformLog`** | Não toca no schema de `Session` existente | Duplica agregação de streak (precisa unir 2 tabelas em `getOverview`/`getWeekStatus`); não reaproveita completion flow |

Recomendada: **A**, porque a lógica de constância/streak já é agnóstica a plano (agrega por
`date`) — a mudança mínima é ensinar o resto do app a tolerar `plan_day_id: null`, não
duplicar a agregação em uma segunda tabela.

## Modelo de dados

`Session(id: uuid, plan_day_id: string | null, plan_version, weekday, date, status,
started_at, ended_at, rpe, note, source: "plan" | "freeform" = "plan", updated_at,
deleted_at)`

- `source: "freeform"` → `plan_day_id = null`, sem linhas em `ExerciseLog`.
- Convenções do projeto mantidas: UUID v4 gerado no client, `updated_at` em toda escrita,
  soft delete via `deleted_at`, escrita só via camada de repositório
  (`lib/db/repositories/sessions.ts`).

## Features (ordem de implementação)

| # | Feature | Depende de | Critério de aceite |
|---|---------|-----------|---------------------|
| 1 | Migração: adicionar `source` (default `"plan"` pra linhas existentes) e tornar `plan_day_id` opcional no schema Dexie (`lib/db/schema.ts`), bump de versão | — | Dexie abre sem erro em base já populada; sessões antigas continuam com `source: "plan"` e `plan_day_id` intacto |
| 2 | Repositório `createFreeformSession(date, durationMinutes?)` em `sessions.ts`, cria e já completa a `Session` | 1 | Dado `date` = hoje e `durationMinutes` = 30, gera `Session` `status: "completed"`, `plan_day_id: null`, `ended_at - started_at ≈ 30min` |
| 3 | Ajustar `getOverview`/`getWeekStatus` (`lib/db/queries/metrics.ts`) para não quebrar com `plan_day_id` nulo e expor contagem separada por `source` na semana | 1 | Semana com 3 sessões `plan` + 1 `freeform` cumpre a meta contando as 4; UI consegue ler "3 do programa + 1 avulso" |
| 4 | CTA "Treinei fora do programa hoje" + modal de duração em `app/page.tsx`, chamando o repositório | 2 | Sem treino registrado hoje, CTA aparece; ao confirmar com 45 min, `TodayCard` atualiza pro estado "avulso registrado" sem reload manual |
| 5 | Diferenciação visual nas estatísticas (`WeekStrip`, `ConsistencyCard`): marcador distinto pra dia avulso | 3 | Dia avulso aparece no `WeekStrip` com marcador visualmente diferente de dia do plano |
| 6 | Desfazer registro avulso (reaproveita soft delete) | 2 | Tocar "desfazer" seta `deleted_at`, sessão some das métricas e o CTA volta a aparecer no dia |

## Riscos

1. **[risco #1]** `Session` sem `plan_day_id` pode quebrar telas/queries que hoje assumem
   plano válido por trás de toda sessão (join com `ExerciseLog`, tela de detalhe) →
   **M1 testa isso primeiro**: migração + repositório rodam e os fluxos existentes de sessão
   do plano são exercitados antes de qualquer UI nova ser construída.
2. Separar contagem "programa vs. avulso" na semana pode exigir queries novas em
   `getOverview` → mitigado fazendo só a contagem por `source` na Feature 3, sem reescrever
   a lógica de streak em si.
3. Duração aproximada gera `started_at`/`ended_at` "sintéticos" que podem poluir qualquer
   métrica futura de tempo real treinado → mitigado deixando claro na UI que é "duração
   aproximada, opcional", sem prometer precisão.

## Milestones

- **M1** (~1 sessão de trabalho): migração do schema (`source` + `plan_day_id` opcional) +
  `createFreeformSession`, testado isoladamente (script/console) → testa o risco #1 direto,
  antes de tocar em UI.
- **M2**: CTA + modal de duração na Home, registrando e completando o treino avulso — já
  resolve a dor principal no dia a dia.
- **M3**: diferenciação visual nas estatísticas (`WeekStrip`/`ConsistencyCard` + contagem
  separada) e ação de desfazer — fecha o polimento.

## Fora do plano
- Categorizar tipo de atividade avulsa (corrida, jiu-jitsu etc.) — vira ideia pro backlog se
  fizer falta com uso real.
- Múltiplos treinos avulsos no mesmo dia.
- Editar a duração depois de registrado (só desfazer + registrar de novo).
- Timer ao vivo pro treino avulso (reaproveitar o timer existente do app fica pra v2; MVP
  usa input manual de duração).
- Retroagir mais de 2 dias (janela fixa hoje/ontem/anteontem) — editor de data livre fica de
  fora, viraria um calendário editável genérico em vez de cobrir só o esquecimento realista.

## Adendo (2026-07-28): registrar dia esquecido

Gap descoberto no uso real: o M2 original só registrava "hoje", sem jeito de corrigir um dia
que passou em branco por esquecimento. `createFreeformSession(durationMinutes?, daysAgo?)`
ganhou o parâmetro `daysAgo` (0-2); o modal mostra chips "Hoje/Ontem/Anteontem" pros dias
ainda sem nenhum treino (plano ou avulso), desabilitando implicitamente os já cobertos. O CTA
na home passou a ficar visível mesmo com hoje já concluído, contanto que ontem ou anteontem
estejam em aberto — antes ele desaparecia assim que hoje fosse registrado, escondendo
justamente o caso que motivou este adendo.
