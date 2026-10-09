# PLAN — Prompt da IA: de contrato de formato a briefing de coach

Registro datado (2026-10-09). Decisão e alternativa descartada, não o passo a passo.

**Estado:** implementado. 416 testes.

## Problema

O pedido que o app copia era `persona + AI_SCHEMA_PROMPT + JSON`, e o `AI_SCHEMA_PROMPT`
descrevia **forma**, não **decisão**. Três consequências, em ordem de gravidade:

1. **O contrato estava incompleto e o import falhava.** O prompt documentava
   `workouts > blocks > exercises`, mas nunca os campos de topo que o `planSchema` exige
   (`id`, `version`, `name`, `source`, `imported_at`). Uma resposta tecnicamente boa era
   recusada pela validação, e o atleta via um erro de campo faltando sem saber o que pedir.
2. **O prompt não dizia o que os dados significam.** A IA recebia `equipamento: "casa_barra"`,
   `objetivo: "forca"`, `sinal: "regress"` e `limitacoes: ["ombro"]` crus. Sem legenda,
   `regress` virava palpite em vez do gatilho real (3 sessões seguidas sem bater o alvo), e
   `limitacoes` passava batido — justamente o campo que o export marca como *"nenhum
   exercício foi tirado por isso"*.
3. **Faltavam os números que o motor de progressão verifica.** As escadas iam só como
   `nível=nome`. Sem o critério de cada degrau (`3×8 reps · 2 sessões`), a IA escrevia alvo
   abaixo do critério: o atleta cumpria o plano para sempre e nunca ficava `ready`. Duas
   armadilhas de runtime tinham o mesmo efeito silencioso — `rest: "descanso 2 min"` liga um
   cronômetro de **2 segundos** (`parseRestSeconds` lê o maior número como segundos), e
   `parsed: null` num exercício com `skill_ref` faz o motor nunca reconhecer o alvo batido,
   o que depois de 3 sessões vira sinal **falso** de regressão (`isRealFailure`).

## Decisão

**Dois módulos, dois motivos de mudança.**

- `lib/plan/aiSchema.ts` — **contrato de saída**: o que o app aceita. Muda quando
  `schema.ts` muda. Ganhou o objeto de topo do plano, as regras de alvo/descanso/identidade,
  os rótulos de `workout.skill` que de fato resolvem para skill canônica (agora gerados de
  `WORKOUT_SKILL_LABELS`, não escritos à mão — a lista no prompt já estava desatualizada,
  sem os rótulos das sementes), as escadas **com o critério numérico de cada degrau** e a
  lista de ids que o app já conhece.
- `lib/plan/aiPrompt.ts` — **briefing de coach**: papel, legenda dos dados e método
  (15 regras: um degrau por vez, pré-requisito antes de vontade, equipamento como limite
  rígido, frequência por padrão de movimento, skill com sistema nervoso fresco, sobrecarga
  dentro do degrau antes de trocar de degrau, deload, continuidade de ids…). Muda quando o
  método de treino muda. `buildAiPrompt` monta a ordem final.

**Ordem do prompt:** papel → tarefa → legenda → método → contrato → checklist → dados.
Os dados vão por último e o checklist imediatamente antes deles, que é a última instrução
lida antes da resposta. A `persona` deixou de abrir o prompt e virou a seção
*Prioridades declaradas pelo atleta*, depois do método.

**O critério numérico de cada degrau vem de `formatCriteria`**, a mesma função que a UI usa
para mostrar o critério ao atleta. Custa um import de `skills.ts` em `aiSchema.ts` (que
arrasta o loader do plano) e evita que o texto do critério divirja entre a tela e o prompt.

## Alternativas descartadas

| Alternativa | Por quê não |
|---|---|
| Manter tudo num `AI_SCHEMA_PROMPT` só | Forma e método mudam por motivos diferentes; juntos, a revisão de um reabre o outro |
| Traduzir os tokens (`casa_barra` → "barra em casa") no `exportForAI` | O export é dado estável, consumido por testes e pelo motor; legenda no prompt é mais barata e não mexe no contrato |
| Deixar o papel de coach na `persona` | Instrução de papel competindo com o briefing dilui as duas; a persona passou a ser só o que é do atleta |
| Omitir a lista de ids do catálogo | É o que faz o histórico de um *movimento* sobreviver a um ciclo novo (o histórico agrega por `id`) |
| Mandar as `form_flags` de cada degrau | ~78 listas a mais no prompt; as flags do plano são escritas na voz do atleta, não copiadas do catálogo |
| Validar a resposta da IA contra o critério do degrau no import | Recusaria plano bom por detalhe de método; o lugar de ensinar isso é o prompt, não a validação |
| Filtrar escadas e catálogo pelo equipamento do atleta | Medido: rende 450–800 tokens e só pra quem treina no chão, e exige um mapa de equipamento que o app não tem (o catálogo tem `banco`, `halter`, `argolas`, que nenhum setup declara) — filtro errado tira movimento legítimo |
| Mandar só os ids de catálogo que são degrau de escada | 95 dos 120 itens são degrau: economiza 257 tokens e cria um critério a mais pra manter |

## Arquivos

| Arquivo | O quê |
|---|---|
| `lib/plan/aiPrompt.ts` | **novo** — briefing, checklist e `buildAiPrompt(persona, data)` |
| `lib/plan/aiSchema.ts` | reescrito — contrato completo, escadas com critério, ids conhecidos |
| `lib/plan/skills.ts` | `WORKOUT_SKILL_LABELS` exportado (fonte única dos rótulos válidos) |
| `lib/utils/aiPersona.ts` | `buildPersonaText` virou só o bloco do atleta (vazio quando não há nada) |
| `app/config/plano/page.tsx` | usa `buildAiPrompt` em vez de concatenar à mão |
| `test/aiPrompt.test.ts` | **novo** — 12 testes: ordem das seções, campos de topo, armadilhas de runtime, toda skill/degrau/id presente |
| `test/exportForAI.test.ts` | asserções de persona atualizadas |

## Tamanho (medido)

Instrução: ~6,2k tokens fixos — 3,3k de briefing/contrato e 2,9k das duas listas geradas
(escadas 1,6k, ids conhecidos 1,3k). Nenhum corte dentro disso rende mais que ~800 tokens,
e cada um pede um filtro que pode errar (ver alternativas descartadas).

O que cresce é o **dado**: ~350 tokens por treino registrado, sem limite. Daí a
serialização seletiva em `serializeData` — `plano_atual` indentado (a IA edita campo a
campo), `sessions` e `progressao` compactos (leitura em bloco). A indentação do histórico
era mais da metade do payload:

| Histórico | Antes | Depois |
|---|---|---|
| sem sessões | ~6,5k tk | ~6,1k tk |
| 20 sessões | ~13,8k tk | ~9,1k tk |
| 60 sessões | ~28,6k tk | ~15,2k tk |

## Janela do histórico (segunda decisão desta entrega)

O export mandava todo treino concluído, para sempre — crescimento sem teto, e a partir de
umas 60 sessões a decisão se perde num muro de JSON repetitivo. Agora `buildHistory` dá
duas resoluções: a janela em detalhe, o resto resumido por movimento.

**A janela é em sessões de plano, não em dias.** O que decide o próximo ciclo é quantas
vezes a IA vê cada movimento, e um exercício mora num treino só: num plano de 5 treinos ele
volta a cada 5 sessões. Resolução (ocorrências do mesmo exercício dentro da janela):

| | 30 dias | 60 dias | 6 voltas do ciclo |
|---|---|---|---|
| 5 treinos, 3×/sem | 2,6 | 5,1 | **6** |
| 3 treinos, 3×/sem | 4,3 | 8,6 | **6** |
| 5 treinos, 2×/sem | 1,7 | 3,4 | **6** |

Com 2–3 passadas a IA não distingue dia ruim de tendência, e fica abaixo do que o próprio
motor usa pra decidir (`REGRESS_STREAK = 3`, `STALE_SESSIONS = 8`). Janela em dias tem
ainda um modo de falha pior: cinco semanas parado e o histórico chega **vazio** — a IA
escreve plano de estreante pra quem treina há um ano. `detailWindow = max(18, 6 × treinos)`
(30 sessões no plano pessoal) normaliza a resolução entre formatos de plano e frequências.

**Sessão avulsa não consome janela.** A janela é definida pelas sessões *de plano*; a avulsa
entra se cair no mesmo período, mas não empurra treino de plano pro resumo — quem registra
muito treino fora do plano perderia justo a passada dos exercícios que a IA vai editar.

**O resumo leva `desde`, e isso não é detalhe.** Com só `ate`/`sessoes`/`melhor_serie`, a IA
não distingue "treina esse movimento há três semanas" de "treina há oito meses e a melhor
série não mudou" — e o segundo caso pede mudar de abordagem, não de degrau.

Efeito medido com 60 treinos registrados no plano pessoal: 30 sessões em detalhe + 19
movimentos resumidos, prompt de ~21,0k → ~17,4k tokens. O ganho real não é a porcentagem
de hoje, é o **teto**: com a janela o prompt para de crescer (200 sessões continuam ~17k);
sem ela, 200 sessões são ~34k tokens.

Dimensionamento revisado antes de implementar: a primeira proposta era `4 × treinos`
(piso 12). Apertar de 30 pra 20 sessões rende ~1,5k tokens — ruído, depois que a
serialização já tinha resolvido o grosso — e todo o risco está no lado de *faltar*
histórico. Ficou no número generoso.

## Tolerância na importação (achado do primeiro teste real)

O primeiro plano gerado com o prompt novo foi recusado com *"Não parece ser um JSON
válido"*. O `stripCodeFences` só reconhecia cerca de código quando ela era o texto
**inteiro** (`^```…```$`) — e a resposta típica é "Aqui está o plano ajustado:" + cerca +
resumo das mudanças, que é justo o caso que a âncora não pega.

Três modos de falha, todos previsíveis, todos agora tolerados em `parsePlanInput`:

| Falha | Antes | Agora |
|---|---|---|
| Prosa antes/depois do JSON | recusa | `extractJsonObject`: cerca em qualquer posição, senão do 1º `{` ao último `}` |
| Comentário `//` ou `/* */` dentro do JSON | recusa | `normalizeAiJson` tira, varrendo com consciência de string (uma URL ou um `obs` com `//` não podem ser mutilados) |
| Vírgula sobrando antes de `}`/`]` | recusa | idem |
| Escape de markdown na string (`\~`, `\*`, `\_`) | recusa | barra removida: escape que o JSON não conhece já seria erro, tirar só conserta |

O comentário é falha previsível porque **o esquema no prompt é anotado com `//`**: a IA
copiar essa forma é imitação, não erro dela. O mesmo vale pro escape de markdown, que foi o
segundo teste real a falhar: a resposta trouxe `"duration":"\~38 min"` — e o `~` veio do
exemplo `"~32 min"` que o próprio prompt dava. O exemplo perdeu o `~`, o contrato ganhou uma
seção dizendo que campo de texto é string JSON e não markdown, e o parser passou a tolerar.

E a mensagem de erro deixou de ser um beco sem saída: resposta cortada no meio (limite de
saída do modelo) agora é reconhecida pela contagem de chaves abertas e dita como tal, e o
JSON inválido mostra o trecho em volta da posição do erro. São ações diferentes — reenviar
vs. conferir o que colou.

Do lado do prompt, duas linhas novas atacam a causa em vez do sintoma: proibição explícita
de texto em volta do JSON, e pedido de **JSON compacto**. Indentar o plano pessoal inteiro
custa ~7,0k tokens de saída contra ~4,2k compacto — é a diferença entre caber e ser cortado
no limite de saída de um chat.

## Em aberto
- As 15 regras de método são curadoria de treino, não código: quem discordar de uma edita
  `AI_COACH_BRIEF`. Nenhum teste prende o conteúdo delas — os testes prendem a estrutura e
  o que vem de `progressions.json`/`catalog.json`.
