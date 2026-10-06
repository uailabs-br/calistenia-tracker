# PLAN — Treinos A/B/C/D/E em vez de dias da semana

Status: **implementado e publicado** (`main`, commit `7776ac4`). Este documento registra as decisões e o que mudou em relação ao proposto. Depois dele vieram: frequência por treino, calendário de constância e a remoção das datas do gráfico.

## Contexto

Hoje o plano é uma agenda semanal: cada treino *é* um dia (`weekday: 1` = Seg). Isso amarra três coisas que deveriam ser independentes:

- **identidade do treino** (qual template é esse),
- **ordem** (qual vem depois),
- **quando foi feito** (a data real da sessão).

Consequências práticas: o plano não pode ter mais de 7 treinos, não pode ter dois treinos no mesmo dia, e quem treina 3× numa semana e 5× na outra aparece como "não aderente" a dias que nunca prometeu cumprir.

O destino: treinos identificados por letra (A, B, C, D, E…), em **sequência cíclica**, sem limite de quantidade, com a meta medida em **quantidade de treinos por semana**.

## Decisões

| # | Decisão |
|---|---|
| 1 | `weekday` sai do plano e da sessão. A identidade do treino passa a ser `id` (string estável: "A", "B", …); `label` segue sendo só exibição. |
| 2 | A **ordem do array** `workouts[]` é a sequência. O `id` não codifica ordem — renomear "B" para "Pull" não muda a fila. |
| 3 | Próximo treino = o **seguinte ao último concluído**, cíclico. Treino avulso (`freeform`) não anda a fila. |
| 4 | Sem limite de treinos no plano (hoje o schema trava em 0–6). |
| 5 | A meta semanal passa a contar **sessões concluídas**, não dias distintos. |
| 6 | Histórico migra: toda sessão antiga ganha o `workout_id` correspondente ao `weekday` que tinha. |

## O `weekday` da sessão já está meio abandonado

Vale registrar, porque simplifica a migração: `Session.weekday` hoje significa **duas coisas diferentes**.

- Em `createSession` ([sessions.ts:8](lib/db/repositories/sessions.ts#L8)) é o **template escolhido** — pode ser o treino de terça feito numa segunda (o `DayPills` existe exatamente pra isso).
- Em `createFreeformSession` ([sessions.ts:50](lib/db/repositories/sessions.ts#L50)) é o **dia real do calendário**.

Por isso `getOverview` e `getWeekStatus` **já ignoram** `s.weekday` e recalculam o dia a partir de `s.date` ([metrics.ts:104](lib/db/queries/metrics.ts#L104), [metrics.ts:294](lib/db/queries/metrics.ts#L294)). Ou seja: o campo só é usado de fato como chave de template, em `resolveLogExercise`. Trocá-lo por `workout_id` não perde informação — o dia real continua derivável de `date` via `weekdayOf()`.

## Modelo novo

### Plano

```jsonc
{
  "id": "plan-calistenia-ago-2026",
  "version": 2,
  "workouts": [                 // era "days" — a ORDEM é a sequência
    {
      "id": "A",                // chave estável, única no plano (era "weekday": 1)
      "label": "A",             // exibição (era "Seg")
      "title": "MU + Puxar",
      // resto idêntico: skill, duration, accent, accent_bg, is_practice,
      //                 warmup, tip, blocks[], progression[]
    }
  ]
}
```

`is_practice` continua existindo (o treino C é "Prática — HS"). O que some é o conceito de **folga**: sem dia fixo, descanso é simplesmente não abrir o app — não é um estado de tela.

### Sessão

```ts
interface Session {
  workout_id: string | null;  // era `weekday: number`; null em freeform
  plan_day_id: string | null; // passa a ser `${plan.id}:${workout_id}`
  date: string;               // única fonte de "quando" — inalterado
  // ...
}
```

## Migração — três frentes

O risco real do projeto está aqui. São três lugares guardando o formato antigo, e eles precisam concordar na mesma tabela de conversão.

**1. Dexie (`version(5)`)** — mapeia `weekday` → `workout_id` em toda sessão existente.

**2. Plano importado no `localStorage`** ([PLAN_OVERRIDE_KEY](lib/plan/loader.ts#L5)) — está no formato antigo. Sem conversão, o `safeParse` falha em silêncio e o `loadPlan()` cai no plano bundlado: **o usuário perde o plano que importou, sem aviso**. É a pior falha possível dessa mudança.

**3. Backup JSON** exportado antes da mudança — `sessionSchema.weekday` é obrigatório ([backup.ts:49](lib/db/backup.ts#L49)).

### A tabela de conversão não pode ser global

O plano bundlado usa weekdays 1–5, então o mapa é `{1:A, 2:B, 3:C, 4:D, 5:E}`. Mas quem importou um plano próprio pode ter, digamos, `{2, 4, 6}` — e nesse aparelho a conversão correta é `{2:A, 4:B, 6:C}`. Usar o mapa bundlado ali aponta o histórico para o treino errado.

**Regra:** a conversão é sempre "ordena os dias por `weekday` crescente e atribui A, B, C… nessa ordem", aplicada ao **plano efetivo daquele aparelho**. Uma função só, em `lib/plan/legacyPlan.ts`, usada pelos três consumidores. O `upgrade` do Dexie roda no browser, então consegue ler o `localStorage` e usar o mesmo plano efetivo.

Sessão cujo `weekday` não existe no mapa (plano trocado no meio do caminho) vira `workout_id = "legacy-{weekday}"`. Ela continua contando em todas as métricas (que agora são por quantidade) e o `snapshot` dos logs já preserva nome e alvo — só não casa com nenhum treino do plano atual, que é a verdade.

## Fases

### Fase 1 — Contrato do plano
- [lib/plan/schema.ts](lib/plan/schema.ts): `daySchema` → `workoutSchema`; `weekday` sai, entra `id: z.string().min(1)`; `planSchema.days` → `workouts`; `superRefine` ganha "id de treino duplicado no plano".
- [lib/plan/plan.json](lib/plan/plan.json): 5 dias → A–E, `label` "A"–"E".
- [scripts/validate-plan.mjs](scripts/validate-plan.mjs): a cópia do schema (linha ~88) acompanha; mensagens falam "treinos".
- [lib/plan/loader.ts](lib/plan/loader.ts): `getDayByWeekday` → `getWorkoutById`, `getExerciseInDay(weekday, id)` → `getExerciseInWorkout(workoutId, id)`, `planDayId(weekday)` → `planDayId(workoutId)`.
- Renome de tipo `PlanDay` → `Workout` e `plan.days` → `plan.workouts`: mecânico, pega [DayHeader](components/session/DayHeader.tsx), [SessionRunner](components/session/SessionRunner.tsx), [ProgressionNudge](components/session/ProgressionNudge.tsx), [estimateDuration](lib/domain/estimateDuration.ts), [skills.ts:200](lib/plan/skills.ts#L200), [importPlan.ts](lib/plan/importPlan.ts), [config/page.tsx](app/config/page.tsx).

O rename vale a pena agora: deixar `plan.days` no código depois de tirar o conceito de dia é garantir confusão daqui a três meses. O `tsc` acha tudo.

### Fase 2 — Compatibilidade do plano legado
- **Novo** `lib/plan/legacyPlan.ts`: detecta `days[].weekday`, converte e devolve `{ plan, weekdayToId }`.
- [loader.ts](lib/plan/loader.ts#L14): aplica no override antes do `safeParse`.
- [importPlan.ts](lib/plan/importPlan.ts): aplica também — JSON antigo gerado por IA continua importando.

### Fase 3 — Banco
- [lib/db/schema.ts](lib/db/schema.ts): `Session.workout_id`, `weekday` sai; `version(5)` com índice `workout_id` e `.upgrade()` conforme acima.
- [sessions.ts](lib/db/repositories/sessions.ts): `createSession(workoutId: string)`; `createFreeformSession` para de calcular weekday.
- [backup.ts](lib/db/backup.ts#L46): `weekday` opcional + `workout_id` opcional, normalizados após o parse pela mesma tabela. `BACKUP_VERSION` → 2 (continua lendo v1).

### Fase 4 — Queries
- [resolve.ts](lib/plan/resolve.ts#L23): assinatura vira `(log, workoutId: string | null)`. Oito chamadores: [metrics.ts:196 e :219](lib/db/queries/metrics.ts#L196), [pr.ts:56](lib/db/queries/pr.ts#L56), [skillProgress.ts:26](lib/db/queries/skillProgress.ts#L26), [skillProgression.ts:98](lib/db/queries/skillProgression.ts#L98), [progressionReady.ts:59](lib/db/queries/progressionReady.ts#L59), [weekReview.ts:68](lib/db/queries/weekReview.ts#L68), [exportForAI.ts:66](lib/plan/exportForAI.ts#L66), [historico/[id]:77](app/historico/[id]/page.tsx#L77).
- [metrics.ts](lib/db/queries/metrics.ts):
  - `Overview.adherenceByWeekday` → `balanceByWorkout`: `{ id, label, title, count, lastDate }`, barra relativa ao treino mais feito. Responde "faz tempo que não faço o D", que é a pergunta que sobra sem dia fixo.
  - `getOverview`: a meta da semana passa a somar **sessões**, não weekdays distintos ([metrics.ts:52-56](lib/db/queries/metrics.ts#L52)).
  - `getWeekStatus`: `done` = sessões concluídas na semana; `WeekDayStatus.isPlanDay` some (não existe mais "dia de plano"). Os 7 pontinhos ficam, puramente descritivos: "quando você treinou".
- [profile.ts](lib/utils/profile.ts#L20): `getWeekGoal` aceita 1–14 (o teto 7 era o teto de dias).
- [weekReview.ts:100](lib/db/queries/weekReview.ts#L100): `planTotal` → `plan.workouts.length`.

### Fase 5 — A fila
- **Novo** `lib/domain/nextWorkout.ts`, substitui [upcoming.ts](lib/domain/upcoming.ts):

```
nextWorkout(lastId, workouts):
  i = índice de lastId em workouts
  i < 0  → workouts[0]        // nunca treinou, ou o treino saiu do plano
  senão  → workouts[(i+1) % workouts.length]

queueFrom(lastId, workouts) → a fila a partir do próximo, na ordem
```

- **Novo** `getLastPlanWorkoutId()`: `workout_id` da sessão `completed` com `source === "plan"` de `started_at` mais recente.
- Sessão `in_progress` não anda a fila — o `ResumeBanner` já cobre esse estado.
- "Treinar de novo" o mesmo treino anda a fila normalmente (o último concluído passa a ser ele). É autocorretivo: treinar fora de ordem reancora a sequência em vez de brigar com ela.

### Fase 6 — UI
- `app/treino/[weekday]/` → `app/treino/[id]/`. Link antigo (`/treino/1`) não quebra: `id` casa com "1", não acha no plano e cai no primeiro treino — que é o fallback que [a página já tem](app/treino/[weekday]/page.tsx#L30).
- `TodayCard` → `NextWorkoutCard`: o ramo "Folga hoje" ([TodayCard.tsx:29](components/home/TodayCard.tsx#L29)) é deletado; `day: PlanDay | null` vira `workout: Workout` (nunca null). Concluir um treino faz o card avançar para o próximo, com a confirmação de "concluído hoje" como estado secundário.
- `WeekStrip` → `UpNext`: consome `queueFrom`, mesmo visual.
- `DayPills` → `WorkoutPills`: prop `today` vira `nextId` ("· próximo" no lugar de "· hoje").
- [ConsistencyCard](components/home/ConsistencyCard.tsx): sai o estilo `isPlanDay`; o anel passa a ser contagem de sessões.
- [app/page.tsx](app/page.tsx), [ResumeBanner](components/home/ResumeBanner.tsx), [historico](app/historico/page.tsx), [historico/[id]](app/historico/[id]/page.tsx).
- [app/metricas/page.tsx:75](app/metricas/page.tsx#L75): "Aderência por dia" → "Equilíbrio entre treinos".
- [app/config/page.tsx:245](app/config/page.tsx#L245): `max` da meta semanal sai de 7.

### Fase 7 — IA e documentação
- [lib/plan/aiSchema.ts](lib/plan/aiSchema.ts#L23): o bloco `weekday`/`label` vira `id`/`label`. Regras novas no prompt:
  - `id` único no plano; **a ordem do array `workouts[]` é a sequência de treino**;
  - sem limite de treinos — 3, 5 ou 8, o que fizer sentido para o objetivo;
  - ao ajustar um plano existente, **preservar os `id` dos treinos** (o histórico aponta para eles);
  - some a instrução "1=Seg … 0=Dom não usado".
- [exportForAI.ts:89](lib/plan/exportForAI.ts#L89): `day: "Seg — MU + Puxar"` → `workout: "A — MU + Puxar"`; fallback `dia ${weekday}` → o `workout_id` guardado, ou `"avulso"`. O `plano_atual` já vai inteiro no export, então a IA vê o formato novo sem mais nada.
- README (roadmap), PRD seção 5, e este arquivo marcado como implementado.

## Testes

| Arquivo | O quê |
|---|---|
| `test/upcoming.test.ts` → `nextWorkout.test.ts` | reescrito: ciclo, `lastId` inexistente, plano de 1 treino, freeform não anda a fila |
| **novo** `test/legacyPlan.test.ts` | conversão de plano antigo; mapa weekday→id para weekdays não contíguos |
| **novo** `test/migration.test.ts` | upgrade Dexie v4→v5: sessão de plano, freeform, weekday órfão |
| [test/overview.test.ts](test/overview.test.ts) | meta por contagem; `balanceByWorkout` |
| [test/importPlan.test.ts](test/importPlan.test.ts#L13) | fixture nova + caso de JSON legado |
| [test/repositories.test.ts:88](test/repositories.test.ts#L88) | asserção de `weekday` → `workout_id` |
| [test/weekReview.test.ts](test/weekReview.test.ts#L18), [test/exportForAI.test.ts](test/exportForAI.test.ts#L18) | fixtures |

## Riscos

1. **Perder o plano importado na atualização.** Mitigado pela Fase 2, mas é o item que precisa de teste manual real: instalar a versão atual, importar um plano, atualizar, conferir que continua lá.
2. **A migração do Dexie roda uma vez só.** Se o `upgrade` tiver bug, não dá pra repetir — o histórico fica errado em produção. Testar com um banco v4 populado antes de subir.
3. **Contar sessões em vez de dias infla a meta** quando se treina duas vezes no mesmo dia (o botão "Treinar de novo" permite). Aceito: foi o que você pediu, e um segundo treino real é um treino real. Se incomodar, o conserto é um `Math.min` por data em um lugar só.
4. **A streak muda de valor** para quem já usa, porque a unidade da meta mudou. Vale um aviso no release ou uma linha no card.

## Em aberto

- `label` continua existindo separado do `id`? Proposta: sim — `id` estável para o histórico, `label` livre para a IA escrever "A · Push" se quiser. Custo zero.
- O `plan_day_id` virou redundante com o `workout_id`. Proposta: manter (está indexado e nos backups), só mudando o conteúdo. Remover não paga o custo de compatibilidade.

## Como ficou (desvios do proposto)

- **Plano bundlado** agora é `version: 2`, com `workouts` A–E e `label` = letra.
- **Conversão do formato antigo** em um único módulo, [lib/plan/legacyPlan.ts](lib/plan/legacyPlan.ts): ordena por weekday e atribui letras. Usada no carregamento do override, na importação de JSON colado e na migração do Dexie. Testada em [test/legacyPlan.test.ts](test/legacyPlan.test.ts).
- **Dexie v5** ([lib/db/schema.ts](lib/db/schema.ts)): `weekday` vira `workout_id`; sessão avulsa fica `null`; `plan_day_id` troca só o sufixo. Weekday sem treino correspondente vira `legacy-N` (não some, não casa com treino errado). Testada com um banco v4 real em [test/migration.test.ts](test/migration.test.ts).
- **Backup** versão 2; backups v1 são normalizados na importação.
- **Fila**: [lib/domain/nextWorkout.ts](lib/domain/nextWorkout.ts). Avulso não anda a fila. Treino fora de ordem reancora a sequência.
- **Home**: `NextWorkoutCard` (o próximo, com um aviso discreto "Hoje já concluído: A") e `UpNext` ("Depois", o resto do ciclo). Sem estado de "folga".
- **Meta semanal**: conta sessões concluídas (plano + avulso). Teto subiu de 7 para 14.
- **Métricas**: "Aderência por dia" virou "Equilíbrio entre treinos" (contagem por treino e última data). A faixa de 7 dias continua, só como calendário.
- **Revisão semanal**: `daysDone` virou `sessionsDone`.
- **Prompt da IA**: ensina `id`, ordem do array como sequência, sem limite, e preservação de ids ao ajustar.
- **Rota**: `/treino/[id]`. Link antigo `/treino/1` cai no primeiro treino do plano.

## Pendente fora deste escopo

- Textos de conteúdo do plano (`tip`, `progression.criteria`, `obs`) ainda citam "segunda", "terça" etc. Estão no `plan.json` e são conteúdo do programa, não estrutura. Reescrever é decisão de conteúdo.
