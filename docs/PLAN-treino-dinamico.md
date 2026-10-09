# PLAN — Treino dinâmico: série extra, exercício adicionado e sinal de progressão confiável

Status: **implementado** (v1.8). Este documento registra o porquê das decisões, não o passo a passo.

## Contexto

Duas demandas de produto e um bug de confiança que apareceu no caminho.

1. **Série extra.** Fiz as 3 séries de pull-up e estou disposto a fazer mais uma. Tem que ser registrada como extra e contar nas métricas.
2. **Exercício adicionado no meio do treino.** Escolher de uma base (calistenia + básicos), com busca, grupos e skills, criar se não existir, e contar nas métricas.
3. **Sinal de progressão e recorde usavam exercício antigo ou fora de contexto.** A causa era estrutural, e foi tratada primeiro porque as duas features dependiam dela.

## A causa raiz: o log não guardava o contexto

Nome, alvo e `parsed` de um exercício eram sempre relidos do **plano vigente** (`getExerciseInDay(weekday, id)`). Consequências:

- Trocar o plano ou subir um alvo reescrevia o passado: um "como previsto" antigo virava outro volume, e recordes inflavam ou sumiam.
- Exercício fora do plano (o caso do exercício adicionado) ficava com `parsed = null`, volume 0 e sumia de métricas e histórico.

**Decisão:** cada `ExerciseLog` grava um `snapshot` (`name`, `target`, `parsed`) no primeiro registro, e todas as leituras passam por um único `resolveLogExercise` (`lib/plan/resolve.ts`): snapshot, depois plano do dia, depois plano em qualquer dia, depois nada.

- O snapshot original **nunca é sobrescrito** ao regravar.
- Logs anteriores ao snapshot continuam lendo o plano vigente. **Não há backfill**: o alvo real de um plano antigo se perdeu, então qualquer reconstrução seria chute. O histórico velho segue impreciso; o novo fica correto.

## Bugs do sinal de progressão (todos verificados no código)

| # | Problema | Correção |
|---|---|---|
| 1 | O aviso mostrava o nome da escada canônica ("Bulgarian Split Squat") para o seu pistol squat | Mostra o nome do exercício do **plano**; o degrau da escada vira legenda |
| 2 | 9 de 16 mapeamentos apontavam para exercícios que já não existiam no plano | Vínculo passa a viver no plano (`skill_ref`) |
| 3 | Critério da escada (3×10) inalcançável com o alvo do plano (3×6): três treinos corretos geravam "considere um passo atrás" | Regress só conta **falha real**: abaixo do alvo do plano ou execução suja |
| 4 | RIR começava em 0 e passava o critério `rir ≤ 2` sem ninguém tocar | RIR saiu da UI; sem RIR, o critério avalia só reps e forma |
| 5 | O aviso nunca calava (o nível vem do plano, nada muda ao "subir") | Botão **dispensar** reinicia a contagem |
| 6 | Sessão abandonada/apagada contava; o motor genérico ignorava a sessão em andamento | Conta `completed` + `in_progress`; ignora `abandoned` e apagadas |

### `skill_ref`

Campo opcional por exercício do plano: `{ skill_id, level }`.

- **Ausente:** cai no mapeamento legado por id (`LEVEL_EXERCISE` em `lib/plan/skills.ts`).
- **`null`:** decisão explícita de que o exercício **não é** degrau da escada. Usado no plano bundlado para `legs-pistol-split-squat`, `hs-frog-to-hs-negativa` e `hs-kickup-controlado`.
- **Objeto:** o nível declarado. É validado contra `progressions.json` (Zod no app e no `scripts/validate-plan.mjs`).

O prompt da IA (`lib/plan/aiSchema.ts`) ensina o campo com a lista real de skills e níveis, gerada do `progressions.json`.

### Logs "vivos"

`getSkillLogs` (`lib/db/queries/skillProgression.ts`) é o filtro único: sessão existente, não apagada, `completed` ou `in_progress`; e o plano vigente ainda vincula aquele exercício àquela skill/nível. O export pra IA aplica ainda uma janela de 60 dias.

### Dispensar o aviso

`lib/utils/progressionAck.ts`, em `localStorage`. Guarda o instante da dispensa; o motor só considera registros **posteriores**. Fica **por aparelho** e não entra no backup.

## Série extra

`ExerciseLog.extra_sets?: number[] | null`, campo **separado** das séries planejadas.

- `plannedSets` = o que o plano pedia; `extraSets` = o que foi além; `effectiveSets` = os dois.
- **Conta em** volume, recorde, última performance, histórico e export.
- **Não conta na progressão** (`hitTarget` usa só `plannedSets`). Uma 4ª série cansada não pode reprovar um treino que cumpriu o plano. É decisão de produto; inverter é trocar uma chamada.
- O export pra IA traz `extra_sets` separado de `performed`. Sem isso a IA leria 4×6 onde o plano dizia 3×6. Série extra recorrente é sinal de que o plano está leve.

**UI:** "+ extra" no cartão fechado, "Série extra" no aberto, e no modo **Ajustar** dá pra somar/remover séries. No Ajustar, séries além do número planejado ganham a etiqueta "extra" e são gravadas como extras. Exercício adicionado não tem plano, então toda série é "planejada".

## Exercício adicionado

- **Catálogo** estático em `lib/plan/catalog.json` (120 exercícios), validado no build. Campos: grupo (Puxar, Empurrar, Core, Pernas), músculos, skill, equipamento, unidade, padrão de séries × alvo, descanso, e alternativas `easier`/`harder`.
- **Criados pelo usuário:** tabela Dexie `customExercises` (v4), id `custom-<uuid>`.
- **`Session.added_exercises`:** ids acrescentados, na ordem, o que permite retomar o treino.
- **Resolução:** `resolveAddedExercise` = catálogo, depois criado, depois snapshot do log (exercício criado que foi apagado continua legível no histórico).
- **UX:** um toque adiciona, sem confirmação; o exercício abre já em "Ajustar" (semeado pela última performance) e dá pra remover se ainda não foi registrado. Sem resultado na busca, "Criar" com nome, tipo (reps/tempo), grupo e por lado.
- **Histórico:** seção "Adicionados ao treino"; logs de plano anterior aparecem em "Fora do plano atual".

### Regras do catálogo

- Os **ids são estáveis para sempre**: o histórico segue o id. Nunca renomear, só adicionar.
- Onde o movimento já existe no plano ou na escada, o id é o mesmo (ex.: `pull-up-peso-morto`, `row-inverso-barra-baixa`, `mu-puxada-explosiva`). Assim o histórico e o motor de progressão continuam.
- Se o id tem mapeamento de skill, a unidade tem que casar com o tipo de critério (reps, segundos, tentativas). Há teste para isso.
- Alternativas não são recíprocas de propósito: `harder` pode pular degrau.

## Fora do escopo (decidido)

- Backfill do snapshot em logs antigos.
- Renomear exercício criado (apaga e recria; o histórico mantém o nome de quando foi feito).
- Adicionar exercícios em treino **avulso** (o picker é reutilizável, então é o próximo passo natural).
- Exigir número mínimo de séries no motor **genérico** de progressão: hoje, feito 2 de 3 séries no alvo ainda conta como "bateu". O motor estruturado já exige o mínimo do critério.
- Flags qualitativas para exercícios adicionados (o catálogo não define flags).

## Riscos conhecidos

- O delta semanal de volume infla com extras (coerente com "conta normalmente", mas o card de feedback fica mais otimista).
- Um id do catálogo diferente do id do plano quebra a continuidade do histórico daquele movimento. Sem match fuzzy.
- A dispensa do aviso vive só no aparelho.

## Onde está no código

| Assunto | Arquivos |
|---|---|
| Snapshot e resolver | `lib/plan/resolve.ts`, `lib/db/schema.ts` |
| Motor de progressão | `lib/db/queries/skillProgression.ts`, `lib/db/queries/progressionReady.ts`, `lib/plan/skills.ts` |
| Dispensa do aviso | `lib/utils/progressionAck.ts`, `components/session/ProgressionNudge.tsx` |
| Série extra | `lib/domain/volume.ts`, `lib/db/repositories/logs.ts`, `components/session/ExerciseCard.tsx` |
| Catálogo | `lib/plan/catalog.json`, `lib/plan/catalog.ts`, `lib/plan/addedExercises.ts` |
| Exercício adicionado | `components/session/AddExerciseSheet.tsx`, `lib/db/repositories/{sessions,customExercises}.ts`, `lib/db/queries/recentExercises.ts` |
| Gerenciar criados | `components/config/CustomExercisesCard.tsx` |
| Testes | `test/{snapshot,progressionFixes,extraSets,catalog,addedExercises,recentExercises}.test.ts` |
