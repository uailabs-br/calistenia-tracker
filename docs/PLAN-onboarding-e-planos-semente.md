# PLAN — Onboarding e planos-semente

Status: **proposto, não implementado** (2026-10-08). Primeira entrega do caminho "app testável por
terceiros". Entrega 2 (treino livre) e canal de feedback ficam fora deste plano — ver
[Fora de escopo](#fora-de-escopo).

## Contexto

O app funciona como instrumento pessoal e não existe como produto testável. O motivo é concreto,
não impressão: [app/page.tsx](../app/page.tsx) carrega `plan` direto do `plan.json` bundlado, e esse
plano é **o plano pessoal do autor** — `name: "Calistenia — MU + HS + FL"`,
`source: "conversa-coach-2026-08-23"`, com dicas em segunda pessoa:

> *"MU destravado — agora o objetivo é limpar o padrão. 6×2 com sets que terminam antes do chicken
> wing aparecer."*

Um estranho que abre o app recebe 6×2 de muscle-up completo. Ele não consegue avaliar o que
precisa ser avaliado (o loop de registro de 1 toque, os chips de flag, o timer), porque não executa
o conteúdo. Pra um iniciante é pior: o vocabulário do app (*chicken wing*, RIR, RPE, "fiz como
previsto", alvo que não é recorde) pressupõe repertório que ele não tem.

**Objetivo deste plano:** qualquer pessoa — inclusive iniciante — abre o app, sai em ≤ 90s com um
plano coerente com a capacidade dela e entende as três interações que o app inventou.

**Não-objetivo:** gerar treino dentro do app. A seleção é entre planos escritos à mão; a IA
continua externa.

## Premissa mais arriscada

Que **4 perguntas leigas inferem a etapa de escada com precisão suficiente pra não desmotivar.**
Se a estimativa vier alta, o usuário recebe um treino que não consegue executar e some — o que é
exatamente o erro que o plano pessoal já causa hoje.

Há um detalhe do código que torna esse risco assimétrico, e ele vira **regra de design**. Em
[app/skills/[skill]/page.tsx:69](../app/skills/[skill]/page.tsx#L69):

```ts
const position = manual !== null ? Math.max(logPosition, manual) : logPosition;
```

A posição é o **máximo** entre o que os logs provam e o que foi marcado à mão. Ou seja: um palpite
alto é **grudento** — nenhum treino ruim depois o corrige, só o botão de limpar ajuste manual.
Um palpite baixo, ao contrário, é corrigido sozinho pelo primeiro log limpo.

**Regra: o onboarding sempre erra pra baixo.** Em caso de dúvida entre duas etapas, grava a menor.

## Decisões e alternativas descartadas

| Decisão | Alternativa descartada | Por quê |
|---|---|---|
| **O `plan.json` bundlado passa a ser um plano genérico** (`iniciante-com-barra`). O plano pessoal do autor sai do bundle e vira um plano selecionável como qualquer outro | Manter o plano pessoal como padrão bundlado e as sementes só como override | Default tem que servir o caso comum, e o caso comum passa a ser "um estranho abriu o app". Manter o plano pessoal no bundle significa que todo caminho de degradação (storage limpo, aba privada, aparelho novo) despeja um estranho em 6×2 de muscle-up — que é exatamente o bug que este plano existe pra corrigir |
| **Sem override, o plano é recuperado do histórico** — ver [Recuperação do plano no boot](#recuperação-do-plano-no-boot) | Aceitar que limpar o localStorage degrade pro plano bundlado | Não é preciso aceitar: `plan_day_id` é `${plan.id}:${workout_id}`, então **toda sessão concluída carrega o id do plano que a gerou**. O histórico sabe qual plano era. Isso elimina o único argumento que sustentava manter o plano pessoal no bundle |
| **Onboarding roda só com banco vazio** | Rodar sempre na primeira visita da sessão | O autor tem histórico; não pode ser jogado no onboarding |
| **4 perguntas de capacidade em linguagem leiga**, escada invisível | Mostrar as 82 etapas e deixar o usuário marcar onde está | É o modelo atual da página de skill, e exige saber o que é RIR, reconhecer "Row Australiano" e julgar a própria forma. Iniciante não tem nenhuma das três |
| **Dias/semana só define a meta semanal** | Dias/semana alterar a composição do plano | Semente tem número fixo de treinos e a sequência cicla. Mudar composição por frequência é gerar treino — fora da tese |
| **Nenhuma pergunta demográfica** | Anamnese (gênero, altura, peso, nascimento), como faz o concorrente CALIX | Nada no app lê esses campos: `profile.ts` guarda nome, meta semanal e lembrete; `skillLevel.ts` guarda posição por skill. Seria dado morto, com custo de LGPD de graça |

## Spec de produto

### Quando roda

```
banco sem sessões  E  sem override de plano  E  onboarding não concluído
```

Qualquer uma falsa → não roda. Com sessões no banco, quem resolve o plano é a recuperação por
histórico, não o onboarding. Pular é sempre possível, e **pular aplica a semente padrão**
(`iniciante-com-barra`), que é também o plano bundlado.

### As telas

5 fixas + 2 condicionais ao equipamento (7 no máximo, 5 pra quem treina só com o chão). Todas com default seguro, nenhuma obrigatória, "Voltar"
a partir da segunda. Barra de progresso no topo.

| # | Tela | Pergunta | Opções | Grava |
|---|---|---|---|---|
| 1 | Nome | "Como te chamo?" | texto · "pular" visível | `setProfileName` |
| 2 | Equipamento | "Onde você treina?" | Casa, só o chão · Casa com barra · Praça (barra e paralelas) · Academia | `answers.equipment` |
| 3 | Flexões | "Quantas flexões seguidas você faz, peito chegando perto do chão?" | 0 · 1–5 · 6–15 · 16+ | `push_up` |
| 4 | Barra *(só com barra)* | "Consegue fazer 1 barra, do braço esticado até o queixo passar?" | Nunca tentei · Ainda não · 1–2 · 3–7 · 8+ | `pull_up` |
| 5 | Parada de mão | "Consegue ficar de cabeça pra baixo apoiado na parede?" | Nunca tentei · Alguns segundos · 30s ou mais · Solto, sem parede | `handstand_hold` |
| 6 | Dips *(só com paralelas)* | "Consegue descer e subir apoiado em barras paralelas?" | Nunca tentei · Com os pés no chão · Completo, 1–7 · 8+ | `dips` |
| 7 | Frequência | "Quantos dias por semana você consegue treinar?" | 2 · 3 · 4 · 5 · 6 — default **3** | `setWeekGoal` |

"Nunca tentei" é resposta de primeira classe em todas — não é fracasso, é a etapa 1.

### Mapeamento resposta → escada

O índice gravado é **0-based na posição em foco**, igual ao que
[app/skills/[skill]/page.tsx:73](../app/skills/[skill]/page.tsx#L73) grava hoje
(`setSkillLevel(skill.id, i)`). Como `skills.ts` monta `steps` preservando a ordem de
`progressions[]` e `steps[i].level === i + 1`, vale a identidade:

```
índice em foco = quantidade de etapas que a pessoa já bate
```

| Resposta | Índice | Etapa que entra em foco |
|---|---|---|
| **`push_up`** | | |
| 0 | 0 | Flexão Inclinada |
| 1–5 | 1 | Flexão no Chão |
| 6–15 | 2 | Flexão Diamante |
| 16+ | 3 | Archer Push-up |
| **`pull_up`** | | |
| Nunca tentei | 0 | Dead Hang + Scapular Pull |
| Ainda não | 1 | Row Australiano / Ring Row |
| 1–2 | 3 | Pull-up (Pronado) |
| 3–7 | 4 | Pull-up Pegada Larga |
| 8+ | 5 | Archer Pull-up |
| **`handstand_hold`** | | |
| Nunca tentei | 0 | Wrist Prep + Hollow Body |
| Alguns segundos | 2 | Handstand com Costas à Parede |
| 30s ou mais | 3 | Toe-pull / Heel-pull off the wall |
| Solto | 5 | Handstand Livre (10–30s) |
| **`dips`** | | |
| Nunca tentei | 0 | Support Hold |
| Pés no chão | 1 | Dip Negativo |
| Completo 1–7 | 2 | Dip Completo |
| 8+ | 3 | Ring Dip |

Skills não perguntadas (as outras 12) seguem enchendo por log e por ajuste manual, como já funciona.

### Qual semente é servida

```
sem barra                                    → iniciante-sem-barra
com barra  +  (flexão ≤5  ou  barra "ainda não"/"nunca")  → iniciante-com-barra
com barra  +  flexão ≥6   e   barra ≥1–2  +  paralelas (praça/academia) → intermediario
```

Forte mas só com barra em casa (sem paralelas) fica na de iniciante: a semente `intermediario` usa
paralelas, e a regra é errar pra baixo.

A semente é **sugerida, não imposta**: a última tela mostra qual foi escolhida, o que ela treina, e
um "escolher outro". Decisão sem explicação é decisão que o usuário não confia.

### Os três planos-semente

Conteúdo é **trabalho de curadoria do autor**, não deste plano — aqui ficam só as restrições que
o tornam válido:

| Semente | Equipamento | Público | Alvo |
|---|---|---|---|
| `iniciante-sem-barra` | só `chão`, `parede`, `cadeiras` | 0–5 flexões, sem barra disponível | `push_up` 1–2, `l_sit` 1, `handstand_hold` 1–2, pernas |
| `iniciante-com-barra` | + `barra` | **padrão do bundle e do "pular"** | `pull_up` 1–3, `push_up` 1–2, `handstand_hold` 1–2, core |
| `intermediario` | + `paralelas` | ≥6 flexões e ≥1 barra | `pull_up` 4–5, `dips` 3, `handstand_hold` 3–4, entrada em skill |

Restrições que o validador precisa garantir para cada semente:

- Passa o `planSchema` (ver [lib/plan/schema.ts](../lib/plan/schema.ts)).
- **Todo `exercise.id` existe no `catalog.json`.** Semente não inventa movimento — id de catálogo é
  estável pra sempre, e é isso que preserva histórico entre sementes e entre ciclos.
- Todo exercício só usa `equipment` compatível com a semente (o catálogo tem `equipment` nos 120).
- Todo `skill_ref` aponta pra `skill_id` + `level` existentes (o schema já checa).
- 3 treinos por semente (A, B, C), rotação cíclica.
- **`flags` em linguagem do público.** Iniciante não entende "chicken wing": a semente de
  iniciante carrega vocabulário próprio ("desci pouco", "quadril caiu", "perdi o ritmo"), com os
  negativos em `neg_flags`. Flags são por exercício no plano — **isso não custa código nenhum**.

### Coach marks

Três, na **primeira sessão**, no momento em que cada interação aparece — não carrossel de tutorial
antes (todo mundo pula). Cada um aparece uma vez na vida e é dispensado com um toque.

| id | Onde | O que ensina |
|---|---|---|
| `one-tap` | no 1º `ExerciseCard` expandido | "✓ fiz como previsto" grava a série inteira no alvo do plano — não é "concluir" |
| `flags` | ao abrir os chips pela 1ª vez | Flag não é erro: é sinal de padrão, e a métrica principal do app é ela **caindo** ao longo das sessões |
| `target` | no 1º exercício com alvo numérico | O alvo vem do plano. Parar antes de sujar é a instrução — não é recorde a bater |

## Spec técnica

### Arquivos

| Arquivo | Ação |
|---|---|
| `lib/plan/seeds/iniciante-sem-barra.json` | novo — conteúdo |
| `lib/plan/seeds/iniciante-com-barra.json` | novo — conteúdo. **Vira o `plan.json` bundlado** |
| `lib/plan/seeds/intermediario.json` | novo — conteúdo |
| `lib/plan/plans/pessoal-mu-hs-fl.json` | novo — o `plan.json` atual, movido pra cá sem edição |
| `lib/plan/plan.json` | **substituído** pelo conteúdo de `iniciante-com-barra` |
| `lib/plan/seeds.ts` | novo — registro das sementes (metadados + import dos JSON) |
| `lib/plan/plans.ts` | novo — `getKnownPlan(id)` sobre sementes + pessoal |
| `components/ui/PlanBoot.tsx` | novo — recuperação do plano por histórico |
| `app/layout.tsx` | alterado — monta o `PlanBoot` |
| `vitest.config.ts` | alterado — alias de `lib/plan/plan.json` → `plans/pessoal-mu-hs-fl.json`, ver [Acoplamento dos testes](#acoplamento-dos-testes-ao-plano-bundlado) |
| `lib/domain/onboarding.ts` | novo — **puro**: mapeamento e escolha de semente |
| `lib/utils/onboarding.ts` | novo — persistência das respostas (localStorage) |
| `lib/utils/coachMarks.ts` | novo — quais marks já foram vistos |
| `app/onboarding/page.tsx` | novo — as 7 telas |
| `components/session/CoachMark.tsx` | novo — reaproveita `Portal` + `useModalA11y` |
| `app/page.tsx` | alterado — redireciona pro onboarding quando o gate permite |
| `components/session/SessionRunner.tsx` | alterado — dispara os 3 marks |
| `app/config/page.tsx` | alterado — card "Trocar de plano" lista as sementes; "refazer onboarding" |
| `lib/plan/exportForAI.ts` | alterado — inclui respostas do onboarding no prompt |
| `scripts/validate-plan.mjs` | alterado — valida as sementes também |

### Tipos e funções

```ts
// lib/domain/onboarding.ts — puro, sem Dexie e sem React
export type Equipment = "chao" | "casa_barra" | "praca" | "academia";
export interface OnboardingAnswers {
  equipment: Equipment;
  push_up: "0" | "1-5" | "6-15" | "16+";
  pull_up?: "nunca" | "ainda_nao" | "1-2" | "3-7" | "8+";
  handstand_hold: "nunca" | "segundos" | "30s" | "solto";
  dips?: "nunca" | "pes_chao" | "completo" | "8+";
  days_per_week: number;
}

/** Respostas → { skillId: índice em foco }. Erra pra baixo por regra. */
export function mapAnswersToSkillLevels(a: OnboardingAnswers): Record<string, number>;

/** Respostas → id da semente sugerida. */
export function suggestSeed(a: OnboardingAnswers): SeedId;

/** Gate puro — testável sem navegador. */
export function shouldRunOnboarding(s: {
  hasSessions: boolean;
  hasPlanOverride: boolean;
  onboardingDone: boolean;
}): boolean;
```

```ts
// lib/plan/seeds.ts — `SeedId` e `Equipment` são definidos em lib/domain/onboarding.ts
// (o domínio é puro e não pode importar os JSON das sementes); seeds.ts os reexporta.
export interface Seed {
  id: SeedId;
  name: string;
  summary: string;          // mostrado na última tela
  equipment: Equipment[];   // compatibilidade
  plan: Plan;               // JSON importado, validado em build
}
export const seeds: Seed[];
export function getSeed(id: SeedId): Seed | undefined;
```

### Armazenamento

Segue a convenção de `profile.ts` e `skillLevel.ts`: localStorage, por aparelho, fora do backup
Dexie.

| Chave | Conteúdo |
|---|---|
| `calistenia:onboarding` | `{ done: true, answers: OnboardingAnswers, at: ISO }` |
| `calistenia:coach-marks` | `string[]` dos marks já vistos |
| `calistenia:skill-levels` | **já existe** — recebe o resultado do mapeamento |
| `calistenia:week-goal` | **já existe** — recebe `days_per_week` |
| `calistenia:plan-override` | **já existe** — recebe a semente escolhida |

### Aplicação do plano

Reaproveita o caminho que o importador já usa, sem mecanismo novo:

```ts
applyPlan(getSeed(id)!.plan);   // lib/plan/importPlan.ts
window.location.reload();       // obrigatório — ver abaixo
```

**O reload não é opcional.** `lib/plan/loader.ts` faz `export const plan = loadPlan()` — avaliado
uma única vez no load do módulo. Sem recarregar, o app segue com o plano antigo em memória. É o
mesmo motivo do `window.location.reload()` em
[app/config/page.tsx:201](../app/config/page.tsx#L201).

### Recuperação do plano no boot

O que torna seguro trocar o bundle por um plano genérico. **O histórico sabe qual plano era:**
`Session.plan_day_id` é `${plan.id}:${workout_id}` (ver [lib/plan/loader.ts:111](../lib/plan/loader.ts#L111)),
e a migração Dexie v5 já trata o sufixo como "tudo depois do último `:`".

Regra, uma vez por boot, só quando **não** existe override:

```
última sessão concluída com plan_day_id
  ├─ extrai plan.id (tudo antes do último ":")
  ├─ id == plano carregado  → nada a fazer
  ├─ id conhecido no repo   → applyPlan(esse plano) + reload
  └─ id desconhecido        → mantém o genérico + Toast explicando
sem sessões                 → onboarding
```

```ts
// lib/domain/onboarding.ts — puro
export function planIdFromPlanDayId(planDayId: string): string | null;

// lib/plan/plans.ts
export function getKnownPlan(id: string): Plan | undefined;  // sementes + pessoal
```

Onde roda: `components/ui/PlanBoot.tsx`, montado no `app/layout.tsx` — não em `app/page.tsx`,
porque um tester pode entrar direto em `/historico` ou `/metricas`.

Por que não dentro de `loadPlan()`: ele é **sincrono e de nível de módulo**, e ler o Dexie é
assíncrono. Daí o passo de boot com reload.

**Sem risco de loop:** `applyPlan` grava o override, então no load seguinte `hasPlanOverride()` é
`true` e a recuperação nem é consultada. O reload só acontece quando o id recuperado difere do
plano em memória.

**O que isso faz pelo autor:** no primeiro load depois da atualização, o aparelho dele não tem
override e as sessões apontam pra `plan-calistenia-ago-2026` → o plano pessoal é reaplicado
sozinho, sem ação nenhuma. Mesmo efeito num aparelho novo, depois de restaurar o backup.

**Plano importado que não está no repo** (JSON que veio de uma IA) é o único caso irrecuperável: o
override era a única cópia. Degrada pro genérico e avisa, em vez de fingir que nada aconteceu. O
histórico segue intacto de qualquer forma — `resolveLogExercise` lê o `snapshot` de cada log.

Fluxo completo do fim do onboarding, nesta ordem:

```
1. setProfileName / setWeekGoal
2. mapAnswersToSkillLevels → setSkillLevel por skill
3. grava calistenia:onboarding { done: true, ... }
4. applyPlan(semente)
5. location.reload() → cai na home com plano, meta e mapa de skills já preenchidos
```

Passos 1–3 antes do 4 porque o reload mata o estado do React.

### Acoplamento dos testes ao plano bundlado

Trocar o `plan.json` não é só mover um arquivo. Seis arquivos de teste importam o plano bundlado
(`catalog`, `exportForAI`, `progressionFixes`, `overview`, `repositories`, `skills`), e o
`PLAN_SKILL_REFS` de [lib/plan/skills.ts:197](../lib/plan/skills.ts#L197) é montado **no load do
módulo** a partir de `plan.workouts`. Isso importa porque o `skill_ref` declarado no plano
(inclusive `null`) tem precedência sobre o mapeamento legado: `progressionFixes.test.ts:68-70` espera
`exerciseSkillMapping("legs-pistol-split-squat")` ser `null`, e esse `null` vem do plano pessoal.
Com a semente no bundle, essas declarações somem e o mesmo id cai no `LEVEL_EXERCISE`.

Decisão: **os testes continuam rodando contra o plano pessoal**, via alias no `vitest.config.ts`
(`lib/plan/plan.json` → `lib/plan/plans/pessoal-mu-hs-fl.json`). Zero edição nos 6 arquivos e o
comportamento que eles travam fica intacto. O teste "bundlado == `iniciante-com-barra`" lê o JSON
da semente **direto do disco**, não pelo alias — senão compararia o plano pessoal consigo mesmo.

Alternativa descartada: reescrever os testes contra a semente. Custa edição em 6 arquivos e perde a
cobertura dos casos `skill_ref: null`, que só o plano pessoal exercita.

### Validação em build

`scripts/validate-plan.mjs` passa a iterar `plan.json` **mais** as 3 sementes, e some a checagem
de que todo `exercise.id` existe no `catalog.json`. Build quebra em semente inválida — mesma regra
que já vale pro plano.

### Testes (Definition of Done)

| Teste | Garante |
|---|---|
| `test/onboarding.test.ts` | `mapAnswersToSkillLevels` com as 17 combinações da tabela; e que **nenhuma** resposta produz índice maior que o conservador (regra "erra pra baixo") |
| `test/onboarding.test.ts` | `suggestSeed` nos 3 ramos + nos limites (flexão 6–15 sem barra → sem-barra) |
| `test/onboarding.test.ts` | `shouldRunOnboarding` nas 8 combinações do gate; com sessão no banco → **sempre** false |
| `test/seeds.test.ts` | cada semente passa `planSchema`; todo `exercise.id` existe no catálogo; `equipment` compatível; `neg_flags ⊆ flags`; `skill_ref` válido |
| `test/seeds.test.ts` | ids de treino únicos por semente e 3 treinos em cada |
| `test/seeds.test.ts` | o `plan.json` bundlado é **idêntico** ao `iniciante-com-barra` (trava a decisão de default) |
| `test/planBoot.test.ts` | `planIdFromPlanDayId` com id contendo hífen, sufixo com `:`, string vazia e `null` |
| `test/planBoot.test.ts` | recuperação: sessão apontando pro plano pessoal → reaplica; pro bundlado → não faz nada; pra id desconhecido → mantém genérico; sem sessão → não faz nada |
| `test/planBoot.test.ts` | **não reaplica quando há override** (prova de ausência de loop) |
| manual | iniciante no iPhone: abre, termina o onboarding, faz a 1ª sessão, vê os 3 coach marks uma vez só |

Gates do repo seguem valendo: `npm test`, `npx tsc --noEmit`, `npm run validate:plan`.

## Fora de escopo

- **Treino livre** (sessão vazia construída na hora, com o `AddExerciseSheet`) — entrega 2. Serve o
  usuário experiente que acha a semente apertada; é inútil pro iniciante, que fica paralisado
  diante de 120 exercícios.
- **Canal de feedback** (empacotar o backup + nota e enviar) — entrega separada, e é o que
  transforma o teste em aprendizado. Hoje o app tem zero telemetria.
- **Moedas / revisão de treino por IA.** Hipótese de monetização levantada em 2026-10-08: vender
  moedas trocáveis por revisão de ciclo — que é o loop `exportForAI` → IA → `importPlan` sem o
  copia-e-cola. Compatível com a tese (assíncrono e explícito, não chat dentro da sessão), mas
  arrasta identidade, pagamento e o primeiro componente de servidor. **Não construir antes de
  evidência de retorno.** O que este plano faz por ela é colher, desde já, o que uma revisão
  precisaria: capacidade por skill, equipamento e frequência.
- **Respostas do onboarding no backup Dexie** — ficam locais, como nome e meta.
- Coletar limitações/dores. Só se a revisão por IA for aprovada; hoje seria dado morto.

## Riscos aceitos

- **Palpite alto gruda** (`Math.max`). Mitigado pela regra de errar pra baixo e pelo botão de limpar
  ajuste manual que já existe na página da skill.
- **Plano importado de fora do repo não é recuperável** se o localStorage for limpo — o override era
  a única cópia. Degrada pro genérico com aviso; o histórico fica intacto via `snapshot`. Resolve de
  vez guardando o plano ativo no Dexie em vez do localStorage (Dexie v6) — fora de escopo.
- **A recuperação custa um reload** no primeiro boot de um aparelho sem override. Aceito: acontece
  uma vez, e o alternativa era despejar o usuário num plano errado.
- **Conteúdo das sementes é o gargalo**, não o código. Três programas bons exigem curadoria; mal
  escritos, invalidam o teste inteiro.
