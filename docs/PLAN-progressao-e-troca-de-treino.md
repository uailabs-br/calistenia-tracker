# PLAN — Progressão visível, troca de treino e entrada de plano

Status: **implementado** (2026-10-22, 480 testes). Sai de sete itens do [IDEAS.md](IDEAS.md)
escritos pelo autor; este documento é a leitura deles contra o código, as decisões que a
implementação exigiu e a ordem de execução.

## O que mudou em relação ao proposto

| Proposto | Implementado | Por quê |
|---|---|---|
| Fase 4 (aviso na home) antes da 5 (preview) | **Preview primeiro**, aviso depois | O aviso leva a `/config/plano`; sem o preview ele empurraria a pessoa a aplicar JSON no escuro |
| `hitTarget` passa a usar o piso do texto em todo intervalo | Só quando `parsed` é `null` (`targetValue` em `parseTarget.ts`) | No plano pessoal `parsed` de intervalo já traz o **teto**; mexer nesse ramo mudaria vereditos já dados. O buraco real era só `parsed: null` |
| Aviso de troca contava só "ready" não dispensado | Conta `ready` **ignorando a dispensa por exercício** | Quem dispensa o "pronto pra subir" no fim da sessão está dizendo "já vi"; se isso valesse, o aviso da home nunca dispararia pra ele. A dispensa do próprio aviso é por conjunto de ids |
| Dispensa do aviso volta se o conjunto mudar | Volta só se aparecer id **novo** | Conjunto que encolhe não reavisa |
| Conversor também no onboarding | **Só em Ajustes** (`/config/plano`) | Decisão em aberto; ficou o caminho conservador até haver teste do fluxo real com a IA |
| Teto do intervalo só nos exercícios sem `skill_ref` | **Em todo intervalo** | Era a opção recomendada; o critério do degrau continua sendo avaliado por `parsed`/piso |
| Texto de privacidade "dados usados pra aprimorar o app" | "Nada sai do aparelho"; aprimoramento vira promessa futura com aviso | Não existe coleta; afirmá-la descreveria o que não acontece. Revisar se a sync ([PLAN-sync-e-auth.md](PLAN-sync-e-auth.md)) ou analytics entrarem |
| — | `applyPlan(plan, { recovered })` | O `PlanBoot` reaplica o plano do histórico; sem a exceção ele zeraria o relógio de "um ciclo desde a última troca" a cada recuperação |

Onde está cada coisa: `lib/domain/progressionState.ts` (máquina de estados única),
`lib/db/queries/progressionMap.ts` + `app/progressao/`, `lib/domain/planSwap.ts` +
`components/home/PlanSwapCard.tsx`, `lib/plan/diffPlan.ts` + `components/plan/PlanPreview.tsx`,
`lib/plan/aiConvertPrompt.ts`, `components/ui/DuotoneImage.tsx`,
`components/landing/PrivacyPolicy.tsx`. Dexie continua na v5.

Os sete itens não são sete features. São dois arcos e três ajustes:

| | Item | Arco |
|---|---|---|
| 1 | Área consultável de progressão ("mapa de progressão") | **A — progressão visível** |
| 2 | Sinal na home de "hora de trocar de treino" + atalho pro pedido à IA | **A** |
| 3 | Preview do treino antes de aplicar | **B — entrada de plano** |
| 4 | Importar o treino que a pessoa já tem, estruturado por IA | **B** |
| 5 | Marcador de reps abrindo na faixa alta | ajuste |
| 6 | Ilustrações dos exercícios na paleta do app | ajuste |
| 7 | Política de privacidade colapsada no fim do `/sobre` | ajuste |

---

## Arco A — a progressão só existe por 10 segundos

### Onde o app está hoje

O motor existe e é bom. O que falta é lugar pra ele.

- `ProgressionNudge` ([components/session/ProgressionNudge.tsx](../components/session/ProgressionNudge.tsx))
  roda **dentro da sessão**, sobre os exercícios **daquele treino**, e unifica os dois motores:
  o estruturado (`getSkillState`, critério numérico do degrau) e o genérico
  (`getProgressionReady`, "bateu o alvo 2 sessões seguidas e limpo").
- "dispensar" grava em `progressionAck` e o motor passa a só considerar registros posteriores —
  o aviso nunca volta sozinho.
- `/skills` mostra a **escada canônica** e a posição por skill, derivada de
  `getFirstCleanSuccess` + ajuste manual. Não mostra estado do motor, nem o plano vigente.
- `exportForAI` já monta `progressao[]` (`ready`/`regress`/`stale`/`tracking` por skill) — mas
  só pra colar na IA. A pessoa nunca vê isso.

Ou seja: o app sabe o que a tela não conta. Fechou a sessão, acabou.

### Decisões

**A1 — o mapa é do plano, não do catálogo.** Uma linha por exercício do **plano vigente**:
nome, treino (letra), alvo, última performance, quantas sessões seguidas no alvo, estado, e —
quando o exercício é degrau de skill — o critério do degrau e link pra `/skills/[skill]`.
`/skills` continua respondendo "como é a escada do muscle-up"; o mapa responde "no treino que eu
faço hoje, o que está pronto". São perguntas diferentes e as duas telas ficam.

**A2 — a máquina de estados sai pra `lib/domain/`.** Extrair de
[lib/db/queries/skillProgression.ts](../lib/db/queries/skillProgression.ts) a parte pura
(streak positivo ≥ `sessions_required` → `ready`; 3 falhas reais seguidas → `regress`;
8+ sessões sem decisão → `stale`; resto → `tracking`) pra `lib/domain/progressionState.ts`, e
fazer `getSkillState` **e** o mapa chamarem a mesma função. Se o mapa reimplementar isso, a home
passa a discordar do fim da sessão — e o usuário não tem como saber qual das duas mentiu.

**A3 — uma query, uma passada no banco.** `lib/db/queries/progressionMap.ts` carrega sessões +
logs **uma vez** e agrega por `exercise_id`. Hoje `ProgressionNudge` varre a tabela de sessões
por exercício (ok em 6 exercícios de um treino, inviável no plano inteiro). Alvo sempre por
`resolveLogExercise` — regra 5, o passado é o snapshot, não o plano de agora.

**A4 — sinal dispensado aparece como dispensado, não desaparece.** A dispensa existe pra não
repetir o aviso durante a sessão. Numa tela que se consulta, esconder é perder o dado: a linha
mostra "pronto · dispensado em 12/10" e permite reativar.

**Rota e entrada:** `/progressao`, com entrada em Evolução (ao lado de "Skills · progressões") e
no cartão da home. `BottomNav` **fica com 4 abas** — a quinta transformaria a nav em menu.
A página deriva do plano, então passa por `usePlanReady` (regra 10).

### Item 2 — o sinal de trocar de treino

O gatilho é a decisão de produto aqui, porque "hora de trocar" não existe nos dados: existe
"vários degraus prontos ao mesmo tempo", que é a mesma coisa dita em linguagem de motor.

**Proposta:** avisa quando **≥ 2 exercícios de skill do plano estão `ready`** (ou ≥ metade dos
exercícios com `skill_ref`, o que for menor) **e** já houve pelo menos um ciclo completo do plano
desde a última troca. O piso de um ciclo evita o aviso na primeira semana, quando dois degraus
fáceis prontos não significam plano vencido.

**`applyPlan` passa a gravar `calistenia:plan-applied-at`** (localStorage, sem migração). Sem
isso, "desde a última troca" só daria pra inferir de `plan_day_id`, que mantém o mesmo `plan.id`
entre versões **de propósito** (o prompt manda preservar o id) — então não distingue ajuste de
troca.

**Dispensa com assinatura.** A chave de ack guarda *quais* ids estavam prontos quando a pessoa
dispensou. Se amanhã um terceiro degrau ficar pronto, o conjunto mudou e o aviso volta. Sem isso,
"dispensar" mata o aviso pra sempre — que é exatamente o que aconteceu com o lembrete de push.

**CTA:** "Pedir o próximo ciclo à IA" → `/config/plano` (passo 1, copiar pedido) e um link
secundário "ver o que está pronto" → `/progressao`. O cartão não gera nada: a IA é externa.

---

## Arco B — entrar com um treino

### Item 3 — preview antes de aplicar

Hoje `parsePlanInput` valida e o `ConfirmDialog` informa nome, nº de treinos, nº de exercícios e
versão ([app/config/plano/page.tsx](../app/config/plano/page.tsx)). Para um JSON de 400 linhas,
isso não é informação suficiente pra decidir: a pessoa aplica no escuro e descobre o treino na
próxima sessão.

**Decisão:** `lib/plan/diffPlan.ts`, puro e testável, compara o plano candidato com o vigente
**por id de exercício** e devolve, por treino: **entram**, **saem**, **continuam** (com alvo
igual ou alterado). Mais os avisos que o schema Zod não pega e que o prompt tenta evitar:

- exercício com `skill_ref` e `parsed: null` (o motor nunca reconhece alvo batido → 3 sessões
  viram sinal falso de regressão);
- alvo que não alcança o critério do degrau (trava o atleta no mesmo nível pra sempre);
- `rest` com número implausível (o `parseRestSeconds` lê o maior número como **segundos**);
- id novo pra movimento que já existe no catálogo (começa o histórico do zero).

A tela de preview substitui o `ConfirmDialog` **nos dois caminhos** — resposta da IA e plano
pronto (semente), porque semente também é troca de plano.

**Guard-rail:** o preview é **leitura**. Botão "Aplicar" e "Cancelar", nada de editar exercício
ali — editor visual de plano está fora de escopo ([IDEAS.md](IDEAS.md)).

### Item 4 — o treino que a pessoa já tem

A `/sobre` já promete: *"Já segue um programa? Sobe ele aqui."* O app não entrega isso hoje —
quem tem plano próprio só consegue entrar se ele já estiver no JSON do app.

**Decisão: um segundo prompt, o conversor** (`lib/plan/aiConvertPrompt.ts`), e nenhum motor novo.
Ele reusa `AI_SCHEMA_PROMPT` (contrato de saída) e **não** usa o `AI_COACH_BRIEF`: o papel aqui é
transcrever, não prescrever. Regras próprias, curtas:

- preserve o treino da pessoa — não "melhore", não troque exercício, não mude volume;
- use os ids do catálogo quando for o mesmo movimento (é o que liga o histórico);
- alvo em "N × M" e descanso em segundos, como o app lê;
- `skill_ref` só quando o exercício **for** degrau de uma escada; na dúvida, omita;
- o que a pessoa não disse (descanso, obs), você infere e marca como inferido.

**Fluxo:** campo "cole ou descreva seu treino" → o app copia o prompt **já com esse texto
embutido** → cola na IA → cola o JSON de volta no campo de aplicar → preview (item 3) → aplicar.
Nenhuma chamada de rede, nenhuma chave de API: a IA segue externa.

**Entradas:** `/config/plano`, como passo "Já tenho um treino" acima de "comece de um treino
pronto". No onboarding, decisão em aberto (ver abaixo).

---

## Ajustes

### Item 5 — marcador de reps na faixa alta

Hoje todo alvo em intervalo resolve pelo **piso**: `parseTargetText` devolve `low`,
`targetSets`/`adjustSets` repetem o piso, e o stepper de "3 × 6-8" abre em 6
([lib/domain/parseTarget.ts](../lib/domain/parseTarget.ts)).

**Decisão: separar critério de semente de UI.** `targetSets` (piso) **não muda** — é o que
reconstitui "fiz como previsto" na leitura do passado; mexer nele reescreve histórico (PR infla,
volume muda), que é a regra 5 em ação. O que muda é `adjustSets`: abre no **teto** do intervalo
("3 × 6-8" → `[8,8,8]`). Alvo fixo continua igual.

**Achado que vale mais que o item:** em alvo com intervalo, `parsed` é `null` por contrato, então
`hitTarget` recebe `target: null` e devolve **false pra qualquer registro ajustado** — só "fiz
como previsto" conta pra progressão. Hoje isso quase não aparece porque o stepper abre no piso
(quem bateu o piso toca "como previsto"). Com a semente no teto, ajustar vira o caminho normal e
o sinal de progressão **sumiria** justo pra quem está progredindo. Correção no mesmo item:
`hitTarget` usa o piso do texto (`parseTargetText`) quando `parsed` é null.

Testes: `test/domain.test.ts` (as expectativas de intervalo, linhas 29-44) e
`test/progressionReady.test.ts` (caso novo: alvo em intervalo, registro ajustado no teto → pronto).

### Item 6 — ilustrações na paleta

[components/landing/LevelShowcase.tsx](../components/landing/LevelShowcase.tsx) já resolveu o
problema: o arquivo do RepDB é opaco com fundo azul claro, e o duotone em CSS puro
(`grayscale(1) invert(1) brightness(1.08)` + overlay do accent em `mix-blend-multiply`) joga o
fundo pro escuro e pinta a figura na cor do app, sem modificar nem republicar imagem.

**Decisão:** extrair esse tratamento pra um lugar só (classe utilitária no `globals.css` + um
componente fino, ex. `components/ui/DuotoneImage.tsx`) e usar em `ExerciseMedia`, tingindo com o
**accent do treino**. `LevelShowcase` passa a consumir o mesmo componente, pra não existirem duas
cópias do filtro.

**Ponto de atenção:** no "como executar" são duas poses pequenas lado a lado, com detalhe fino
(pegada, ângulo do punho). Se o invert matar a legibilidade de alguma ilustração, o ajuste é
baixar a opacidade do overlay — não desistir do duotone, porque a imagem crua com fundo claro é
pior.

### Item 7 — política de privacidade

**Onde:** fim da `/sobre`, colapsada, em `<details>` nativo — não em `CollapsibleCard`. A
`/sobre` é a única página do projeto que não deriva do plano nem do Dexie, e por isso a única
prerenderizada de verdade (110 kB contra 182 kB da home); não vale trocar isso por um componente
cliente só pra abrir uma seção.

**Uma ressalva sobre o texto pedido.** "Os dados são usados apenas para aprimoramento do app"
descreveria uma coleta que **não existe**: não há backend, não há conta, não há analytics, e a
única requisição externa do app é buscar as ilustrações em `exercise-dataset.com`. Escrever isso
promete um tratamento que não acontece — e, se a sync do [PLAN-sync-e-auth.md](PLAN-sync-e-auth.md)
entrar um dia, é aí que o texto muda. A verdade é mais forte que a fórmula: **"seus treinos ficam
no seu aparelho"**.

Itens que a seção cobre, em linguagem simples e uma ou duas linhas cada:

1. que dado existe — treinos, nome, preferências — e onde fica: IndexedDB, neste aparelho;
2. não há conta, servidor, anúncio nem venda de dado;
3. a única requisição externa: as ilustrações dos exercícios (o host vê IP e navegador, como
   qualquer imagem na web);
4. **o fluxo de IA** — o pedido que você copia leva seu histórico, e o que acontece com ele
   depende da IA onde você colar. É o ponto de privacidade mais relevante do app e não está
   escrito em lugar nenhum hoje;
5. backup é arquivo que você baixa e guarda;
6. como apagar tudo: Ajustes → deletar dados, ou desinstalar o app;
7. menores de idade e orientação de treino (não é prescrição médica);
8. aceite pelo uso, e mudanças ficam datadas aqui;
9. contato (`CONTACT_URL` — hoje `null`, então o texto não promete canal que não existe).

---

## Ordem de execução

Cada fase fecha com os três gates (`npm test`, `npx tsc --noEmit`, `npm run validate:plan`) e
entrada nova no topo do [ACOMPANHAMENTO.md](ACOMPANHAMENTO.md) com versão e contagem de testes.
**Nenhum item pede campo novo no Dexie: o banco fica na v5 nas cinco fases.** O único estado novo
é localStorage (`plan-applied-at`, ack da troca).

| Fase | Entrega | Arquivos principais | Testes |
|---|---|---|---|
| 1 | Item 5 (faixa alta + correção do `hitTarget`) | `lib/domain/parseTarget.ts`, `lib/db/queries/progressionReady.ts` | `domain`, `progressionReady` |
| 2 | Itens 6 e 7 (duotone + privacidade) | `components/ui/DuotoneImage.tsx`, `ExerciseMedia`, `LevelShowcase`, `app/sobre/page.tsx`, `globals.css` | `landing` |
| 3 | Item 1 (mapa de progressão) | `lib/domain/progressionState.ts`, `lib/db/queries/progressionMap.ts`, `app/progressao/page.tsx`, `app/metricas/page.tsx` | `progressionState`, `progressionMap` |
| 4 | Item 2 (sinal de troca na home) | `components/home/PlanSwapCard.tsx`, `lib/utils/planSwapAck.ts`, `lib/plan/importPlan.ts`, `app/page.tsx` | `planSwap` |
| 5 | Item 3 (diff + preview) | `lib/plan/diffPlan.ts`, `components/plan/PlanPreview.tsx`, `app/config/plano/page.tsx` | `diffPlan` |
| 6 | Item 4 (conversor) | `lib/plan/aiConvertPrompt.ts`, `app/config/plano/page.tsx` | `aiConvertPrompt`, fixture de plano convertido |

Fase 1 vem primeiro e sozinha porque mexe no motor de progressão — o resto do arco A lê esse
motor, e é melhor que ele já esteja certo. Fase 2 é independente de tudo. Fase 5 vem antes da 6
porque o conversor **desemboca** no preview: sem ele, a pessoa aplica no escuro um JSON que uma
IA escreveu a partir de texto solto, que é o caso mais arriscado de todos.

## Fora de escopo (confirmando os guard-rails)

- Nenhuma chamada de IA dentro do app, em nenhum dos dois prompts. Nem chave de API, nem proxy.
- O preview não edita plano. Diff e avisos, só.
- O mapa de progressão não prescreve nada: mostra estado e critério, a decisão é da pessoa (ou do
  próximo ciclo pedido à IA).
- Nada de 5ª aba na nav, nada de feed, nada de biblioteca de exercícios.

## Riscos

| Risco | Mitigação |
|---|---|
| Mapa e fim de sessão discordando sobre "pronto" | A2: uma única máquina de estados, em `lib/domain/` |
| `/progressao` lenta com histórico longo | A3: uma passada; medir com o fixture grande antes de fechar a fase |
| Aviso de troca virando ruído | Piso de um ciclo + dispensa por assinatura do conjunto pronto |
| Conversor "melhorando" o treino da pessoa | Regra explícita no prompt + preview mostrando o que entrou |
| Duotone ilegível em alguma ilustração | Opacidade do overlay como escape, decidida olhando no celular |
| Texto de privacidade prometendo o que não existe | Escrever o que é verdade hoje; revisar se/quando a sync entrar |

## Decisões em aberto (registro do que estava aberto; ver "O que mudou" acima)

1. **Nome e lugar do mapa.** `/progressao` fora da nav, com entrada em Evolução e na home
   (recomendado), ou vira 5ª aba? E o nome na tela: "Progressão", "Mapa de progressão", outro?
2. **Gatilho da troca.** ≥ 2 degraus prontos + um ciclo completo (recomendado), ou mais
   conservador (≥ metade dos exercícios de skill), ou nenhum automático — só um botão "quero o
   próximo ciclo" no mapa?
3. **Conversor no onboarding.** Entra na fase 6 como alternativa à semente, ou fica só em Ajustes
   até você testar o fluxo numa conversa real com a IA?
4. **Texto da privacidade.** Confirma a versão "nada sai do seu aparelho" (recomendado) em vez de
   "dados usados para aprimorar o app"? Se você pretende ligar analytics ou sync em breve, o texto
   muda de forma — e aí é melhor escrever já pensando nisso.
5. **Faixa alta.** Teto em todo alvo com intervalo (recomendado), ou só nos exercícios sem
   `skill_ref` (mantendo o piso onde o critério do degrau manda)?
