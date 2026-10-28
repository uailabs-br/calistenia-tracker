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

> **Atualização (pós-v1.8, 2026-10-28, advanced tuck e skin the cat contam na escada — 638 testes):**
> a troca de domínio pro Gravks abriu o app com o banco vazio (IndexedDB é por origem) e o
> histórico foi reconstruído fora do app, a partir do backup de 12/10 e do export pra IA. Ao
> conferir as escadas, o nível 2 do front lever e o 1 do back lever não tinham exercício em
> `LEVEL_EXERCISE`, então treino feito nesses degraus nunca virava conquista e a posição
> parava no advanced tuck. Ligados a `fl-adv-tuck-hold` e `skin-the-cat`, os ids do catálogo.
> O script `merge-exercise-ids.mjs` rodou no backup reconstruído.
>
> **Atualização (pós-v1.8, 2026-10-27, marca Gravks: ícone e abertura — 637 testes):**
> o app vai se chamar Gravks. Símbolo escolhido numa página de opções (artifact
> `M62t5r2wxhZP8fuWMDC7pN`): um A sem barra reta, com barra em V e pernas que afinam do pé até
> o topo, aberto a 62°. Os quatro PNGs de `public/icons` trocaram a barra de pull-up por ele,
> e o maskable tem o A menor, pra caber no corte do Android. Abertura aprovada em protótipo (artifact
> `TcKr5Q9w8ecGY96ZsVKAL3`): o contorno do A se desenha, enche, a barra aparece, o nome
> GRAVKS sobe e tudo fica 1 s parado antes de sumir. Só no carregamento da página (o layout
> não remonta entre rotas), nunca na landing, e um toque pula. Descartados no protótipo: A
> que salta "contra a gravidade", A crescendo do chão e slogan embaixo do nome. Nome trocado
> pra Gravks em `APP_NAME`, manifest, `package.json` e README. A aba ganhou um `favicon.svg`
> com o A ocupando o quadrado. O PNG de 192 tem a margem do ícone de app e fica ilegível a 16px.
> Ficam de propósito com o nome velho o banco Dexie (`calistenia-tracker`: renomear abriria
> um banco vazio) e o formato do backup (os arquivos antigos deixariam de importar).

> **Atualização (pós-v1.8, 2026-10-27, recorde suave e começo direto — 637 testes):**
> aprovado em protótipo clicável (artifact `9NDQUYnthJrZMTbVqs2gc1`). A tela de recorde perdeu
> o flash claro e os cortes secos (no celular parecia bug): entra por opacidade, com brilho
> dourado, e o número conta do recorde anterior até o novo (`countAt`, como no resumo). A cena
> de nível concluído foi pro mesmo estilo, na cor do treino. "Começar treino" da home pula a
> prévia: vai pra `/treino/[id]?start=x,y`, que cria a sessão e abre o carregamento a partir
> do botão. A prévia segue pra quem entra pela aba Treino ou pela lista "Depois". Descartados
> no protótipo: recorde dentro do timer de descanso e faixa no topo. No fim do treino, o botão
> "Voltar pro início"/"Continuar" ficou preso embaixo; só o conteúdo rola.
> O começo automático (`?start=`/`?ex=`) decide uma vez só, no carregamento: com outra sessão
> em andamento, o pedido ficava pendente e criava uma sessão nova quando aquela terminava.
> Sem objetivo em jogo, a tela de carregamento ficava só com o título: agora mostra o foco do
> treino (categorias com ≥ 1/4 das séries, pelo catálogo; fora dele, o `skill_ref` e depois a
> skill do treino; some se menos da metade das séries tiver categoria) e a última vez daquele
> treino (quando, minutos, reps, esforço). Descartados no protótipo: lista de exercícios
> (repetia o treino) e séries por músculo (o MU contava cheio pra peito e tríceps).

> **Atualização (pós-v1.8, 2026-10-27, histórico de semanas — 629 testes):**
> as semanas fechadas de Evolução → Histórico seguem o resumo novo: período, tira de dias,
> número contra a meta da constância e os mesmos destaques. Saíram a frase motivacional e os
> textos antigos (`buildWeekReviewTexts`, com os testes dela). Recordes e níveis do histórico
> são refeitos uma vez pra todas as semanas, não uma por semana.

> **Atualização (pós-v1.8, 2026-10-27, semana passada — 633 testes):**
> aprovado em protótipo clicável (artifact `89ZGUBgmhoWeq725tLPCPd`, versão enxuta). O resumo
> da semana virou card com o número contra a meta, os dias e chips de recorde/nível/volume;
> "Ver a semana passada" abre a tela cheia, que cabe sem rolar, com o botão "Começar nova
> semana" sempre à vista. Sai a frase motivacional; entram até três destaques (nível
> concluído, recordes, o que ficou pra trás) e o próximo treino com o objetivo em jogo. O card
> some ao tocar no botão ou ao concluir o 1º treino da semana. A meta passou a ser a mesma da
> constância (a do perfil), não o nº de treinos do plano. Nada novo no banco: recordes e
> níveis concluídos são refeitos dos logs.

> **Atualização (pós-v1.8, 2026-10-27, revisão das escadas e contagem — 623 testes):**
> revisão das 17 escadas contra o Overcoming Gravity 2: L-sit 4, muscle-up 6, dips 5, pull-up 5
> e handstand 7–8 trocados; degraus novos no push-up e no back lever; frog stand das sementes
> no press de braço flexionado. Front lever ficou como estava, por escolha. Os números da home
> e de Evolução contam só na primeira vez que a tela abre desde que o app carregou. Ver
> [PLAN-revisao-escadas.md](PLAN-revisao-escadas.md).

> **Atualização (pós-v1.8, 2026-10-27, escadas v3.1 — 618 testes):**
> skill nova `bent_arm_press` ("Push to Handstand", braço flexionado: frog stand → negativa
> → frog press → headstand → L-sit → tiger bend → HS-elbow lever-HS), da coluna de press de
> braço flexionado do Overcoming Gravity 2 e do Lost Art of Hand Balancing. `press_handstand`
> virou só braço estendido e seguiu a coluna do OG2 (o tuck press saiu: de braço estendido é
> mais difícil que o straddle). Mapeamentos: MU completo → muscle-up 5, HSPU negativa →
> HSPU 3, toe-pull → handstand 4, negativa do frog → press de braço flexionado 2 (também
> no plano pessoal). Cinco exercícios novos no catálogo, nenhum id mudou.

> **Atualização (pós-v1.8, 2026-10-27, campanha — 614 testes):**
> aprovada em protótipo clicável. Os objetivos de "Meus objetivos" viraram a campanha: tela
> de carregamento ao começar o treino (escada do nível, o que está em jogo, dica de forma),
> uma linha por objetivo no card do próximo treino, bloco de objetivos no fim do treino e
> cena de "nível concluído" depois de "Continuar". Sem dado novo. `fl-single-leg-hold`
> mapeado ao nível 3 do front lever. Conquista e recorde da home diminuíram. Ver
> [PLAN-campanha.md](PLAN-campanha.md).

> **Atualização (pós-v1.8, 2026-10-26, tema tático — 594 testes):**
> aprovado em protótipo clicável (tático, corrida e GTA; ficou o tático). Ajustes ganhou
> "Aparência": estilo padrão ou tático e, no tático, cinco cores (verde, ciano, âmbar, oliva,
> branco gelo) e scanlines desligáveis. Todos os treinos ficam na cor escolhida. O padrão
> não mudou. Ver [PLAN-tema-tatico.md](PLAN-tema-tatico.md).

> **Atualização (pós-v1.8, 2026-10-26, sementes de iniciante — 580 testes):**
> scapular pull saiu da escada (é acessório do nível 1 do pull-up, com alvo em reps num
> critério de hold: o degrau nunca fechava). Alvos em reps a até 3 do critério subiram até
> ele, pra semente sozinha conseguir dar "pronto pra subir": row inverso 8 → 10, flexão
> inclinada 10 → 12, agachamento 12 → 15. Holds e flexão com joelhos (8 de 12) ficaram:
> distância grande demais pra quem está começando. Teste novo trava alvo na unidade errada
> em semente.

> **Atualização (pós-v1.8, 2026-10-26, loading e conquistas — 577 testes):**
> aprovados em protótipo clicável. Card de conquistas na home, abaixo da constância: o selo
> mais difícil já ganho e o último recorde, contando ao abrir. Home e tela de treino com
> skeleton só depois de 200 ms (a de treino deixou de piscar da prévia pro runner); pedido pra
> IA com a etapa em curso e o resumo do que foi copiado; "plano trocado" agora aparece na
> home depois do recarregamento. Ver
> [PLAN-revisao-motor-e-export.md](PLAN-revisao-motor-e-export.md).

> **Atualização (pós-v1.8, 2026-10-26, motor, export e duração — 565 testes):**
> revisão de uma lista de 12 problemas, conferida no código; decisões em
> [PLAN-revisao-motor-e-export.md](PLAN-revisao-motor-e-export.md). Tentativas pararam de
> gerar `regress` falso; sessão de manutenção virou voto neutro; front lever com One Leg
> antes de Straddle. Importação avisa unidade errada, salto de nível e id reinventado
> (inclusive o que já está no plano). Export ganhou degraus fora do equipamento,
> frequência observada, acrescentados recorrentes e pulos seguidos. Duração passou a contar
> alvo em intervalo, por lado, aquecimento e troca, calibrada pelo tempo real.
> `scripts/merge-exercise-ids.mjs` junta ids duplicados num backup. **Pendente:** rodar o
> script no backup real; scapular pull das sementes iniciante (alvo em reps num degrau de
> hold) segue como está; loading e card de conquistas foram pro protótipo (entregues na entrada acima).

> **Atualização (pós-v1.8, 2026-10-24, inconsistências visuais — 536 testes):**
> as cinco inconsistências que a migração do design system tinha deixado de lado, aprovadas
> em protótipo clicável: botão principal sempre com gradiente (`btn-solid` saiu), escala de
> display com nome (`text-display-sm` … `text-display-hero`; só o título do fim de treino
> mudou, 38 → 34px), campo do fluxo com IA no padrão `field`, tint do mapa de skills por
> `color-mix` e heatmap derivado do `DEFAULT_ACCENT`. Ver [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).

> **Atualização (pós-v1.8, 2026-10-24, design system e limpeza — 536 testes):**
> revisão do código inteiro, sem mudança visual (screenshot antes/depois de 37 telas e
> estados, idêntico pixel a pixel). **Design system** documentado em
> [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md): tokens novos (`text-2xs`/`3xs`/`md`, `text-ac`/`bg-ac`
> /`border-ac`), utilitários (`card`, `eyebrow`, `field`, `toggle`, `option`, `btn-solid`,
> `btn-outline`, `btn-neutral`, `btn-danger`, `btn-inverse`), `Dialog`/`Sheet` em
> `components/ui/Modal.tsx` (os cinco overlays repetiam portal, foco e arrasto à mão) e
> `accentVars`/`DEFAULT_ACCENT`/`CATEGORY_ACCENT` em `components/ui/accent.ts`. A cor do treino
> passou a ser herdada pelo `--ac`; seis componentes de sessão deixaram de receber `accent`.
> **Limpeza:** as telas pararam de ler o Dexie direto (regra 2; `lib/db/queries/sessions.ts`,
> que também concentra o filtro de `deleted_at` usado por métricas, semana e exportação pra
> IA); lógica de recorde triplicada no `SessionRunner` virou uma; `summarize` duplicado
> (card e histórico) virou `summarizeLog`; posição de skill `max(logs, manual)` virou
> `displayedPosition`; lista de categorias única (`SKILL_CATEGORIES`, também nos `z.enum`);
> ramo morto no "Ajustar" do card removido; `CollapsibleCard` (sem uso) apagado; `icons.tsx`
> de 357 pra 132 linhas.

> **Atualização (pós-v1.8, 2026-10-24, tela de fim de treino — 524 testes):**
> o fechamento do treino virou tela cheia (`SessionSummary`), com os números contando rápido
> e assentando (`lib/domain/timeline.ts` + `useTimeline`; com "reduzir movimento" já nascem
> prontos): reps do treino em destaque, comparação com a última vez da mesma letra
> (`getPreviousRepsVolume`, lida pelo snapshot), minutos, exercícios e séries planejadas
> (extras à parte, `plannedSetsCount`). Treino sem reps põe os minutos em destaque. Recorde
> sobe do valor anterior ao novo. Os sinais de progressão saíram da lista do treino e entram
> por último nessa tela, uma linha por sinal (status curto; motivo e "dispensar" no toque).
> Saiu a frase motivacional sorteada. Decidido em protótipo clicável; a seção de semana do
> protótipo foi descartada por ele.

> **Atualização (pós-v1.8, 2026-10-24, "como foi?" depois do exercício e sem glow — 518 testes):**
> "como foi?" e nota saíram do card durante as séries. Quando o exercício fecha pela
> primeira vez, abre um sheet com as marcações, a nota, "Concluir exercício" e "desfazer
> registro" (`ExerciseFeedbackSheet`); depois vem o descanso de sempre, já descontado o tempo
> no sheet. Recorde passou a ser checado depois do sheet, porque só vale com execução limpa;
> flag negativa ali tira também o troféu festejado numa série. Gravação em `setLogFeedback`
> (repositório de logs), que reavalia o `form_ok` e o critério do motor. No card, as flags e a
> nota só aparecem pra corrigir um exercício já feito, e o card acompanha o banco nelas. Isso
> resolve as flags marcadas antes de fechar que se perdiam ao finalizar com exercício pela
> metade. Card pendente fechado perdeu o alvo repetido embaixo do nome. O brilho (glow) saiu
> dos botões e elementos (`btn-primary`, `btn-secondary`, `glow`, dias da semana, heatmap);
> o anel do cronômetro ficou como estava. Decidido em protótipo clicável, sem PLAN próprio.

> **Atualização (pós-v1.8, 2026-10-23, treino série a série e card novo — 515 testes):**
> o card de exercício registra **série a série**: quadradinhos com o alvo, stepper grande, e
> "Registrar série N" já abre o descanso. A série parcial fica em `Session.partial_sets`
> (opcional, sem índice, sem migração) e o log só nasce quando o exercício fecha, no mesmo
> formato de antes (`recordFromSets`). Recorde aparece na própria série, numa tela cheia
> brutalista (`PRMoment`, preto e branco, 7s na tela). O cronômetro virou um disco que enche
> de líquido e fica verde com check no fim. Botões − e + afundam como tecla e o número rola
> (`btn-key`, `RollingNumber`); o card dá um tranco ao registrar. "Etapa" virou **nível** e
> "pronto pra subir" virou "pronto pra subir de nível" nos textos. Ver
> [PLAN-serie-a-serie.md](PLAN-serie-a-serie.md).

> **Atualização (pós-v1.8, 2026-10-23, navegação, Ajustes e feedback — 505 testes):**
> nav nova: **Início · Treino · Evolução · Ajustes**. O Histórico deixou de ser aba e virou
> atalho em Evolução (que perdeu o card de RPE médio). A aba **Treino** (`/plano`) abre no
> plano em vigor, com os treinos em sequência e o próximo marcado, e reúne Progressão,
> Skills e tudo que muda o treino (IA, objetivos, nível, meus exercícios). Skills chegou a
> ser aba e saiu no mesmo dia: consulta rara. A aba acesa vem de `activeTab()` em
> `lib/utils/routes.ts` (prefixo mais longo), e Histórico, Progressão e Skills passaram a
> acender a aba certa (antes não acendiam nenhuma). Ajustes ficou com Você, Seus dados, App
> e apagar tudo no fim, como composição de `components/config/*`. **O lembrete
> saiu da tela**: nunca disparou notificação (5.1); `ReminderSettings` fica no código.
> Feedback por link pro `CONTACT_URL`, com a mensagem já começada e o contexto visível
> (`lib/domain/feedback.ts`), numa linha em Ajustes e num card raro no pé da home (a partir
> do 5º treino, volta a cada 20). **Ainda sem canal**: com `CONTACT_URL` em `null`, os dois
> ficam escondidos. Na mesma leva, "escada" virou "sequência de progressões" nos textos do
> app. Ver [PLAN-navegacao-ajustes-feedback.md](PLAN-navegacao-ajustes-feedback.md).

> **Atualização (pós-v1.8, 2026-10-23, fluxo de treino com IA em passos — 490 testes):**
> `/config/plano` deixou de mostrar os cinco caminhos de uma vez. Agora é escolha (criar
> novo · trazer o meu · pronto) e três passos com um botão principal cada: objetivos ou
> texto do treino → copiar pedido, com atalhos pra ChatGPT/Claude/Gemini → colar resposta
> (lê a área de transferência e valida sozinho). Erro vira uma frase e um **pedido de
> correção** pra colar na mesma conversa (`aiFixPrompt.ts`); o detalhe técnico fica
> fechado. Passo na URL com `pushState` (o voltar do celular recua um passo) e retomada
> por 24h (`lib/utils/aiFlow.ts`): voltando da IA, abre no colar. "Voltar ao treino
> original" foi pra Ajustes. Preview sem jargão, com contadores e o que continua igual
> fechado. Ver [PLAN-fluxo-ia.md](PLAN-fluxo-ia.md).

> **Atualização (pós-v1.8, 2026-10-22, progressão visível e troca de treino — 482 testes):**
> sete itens do backlog em seis fases, sem migração (Dexie segue na v5). **Mapa de
> progressão** (`/progressao`, entrada em Evolução): estado de cada exercício do plano
> vigente, com a máquina de estados extraída pra `lib/domain/progressionState.ts` — aviso de
> fim de sessão e mapa usam a mesma função, então não discordam. **Aviso na home** quando
> há degraus prontos e um ciclo inteiro desde a última troca (`calistenia:plan-applied-at`),
> com dispensa por conjunto de ids. **Preview da troca** (`diffPlans`): entra/sai/continua por
> treino e avisos que o schema não pega (alvo abaixo do critério do degrau, `skill_ref` sem
> `parsed`, descanso em minutos, id novo pra movimento que já existe). **Conversor**: pedido à
> IA que transcreve o treino que a pessoa já faz (`aiConvertPrompt.ts`), em Ajustes > Montar
> treino. **Faixa alta**: o stepper de "Ajustar" abre no teto do intervalo; `targetSets` segue no
> piso (reescreveria o passado), e `hitTarget` passou a ler o piso do texto quando `parsed` é
> `null` — antes nenhum registro ajustado contava como "bateu o alvo". **Ilustrações** com
> duotone na cor do treino (`DuotoneImage`). **Política de privacidade** colapsada no fim da
> `/sobre` (`<details>`, página segue estática). Decisão e o que mudou em relação ao proposto:
> [PLAN-progressao-e-troca-de-treino.md](PLAN-progressao-e-troca-de-treino.md).

> **Atualização (pós-v1.8, 2026-10-22, página de boas-vindas — 445 testes):** o app ganhou
> primeiro contato. Antes, quem chegava sem rastro de uso caía direto no `/onboarding` e
> respondia equipamento, nível e objetivo sem saber o que o app é. Agora `PlanBoot` manda o
> estreante pra `/sobre` e só depois pro onboarding, decidindo pela marca
> `calistenia:landing-seen` (`lib/utils/landing.ts`, apagada pelo `resetAll`). A página é a
> única do projeto que não deriva do plano nem do Dexie, e por isso a única prerenderizada
> de verdade (110 kB de first load contra 182 kB da home). O herói é o cartão de sessão
> tocável (`components/landing/OneTapDemo.tsx`) e a progressão aparece como um trecho da
> escada do pull-up com a posição marcada (`LadderPreview`). `isChromeless`
> (`lib/utils/routes.ts`) passou a ser o único lugar que decide onde a nav não aparece —
> antes `AppMain` e `BottomNav` repetiam a regra. Texto editável em `docs/landing-copy.md`,
> decisão e alternativas descartadas em [PLAN-landing.md](PLAN-landing.md). Na revisão do
> mesmo dia o texto caiu quase pela metade e o argumento passou pra interface — tiles de
> promessa, escada, sinal de progressão e grid de features, em bandas alternadas; herói
> gerado por IA foi testado e descartado (clichê neon, retorno em 199px). Pendentes por
> decisão do autor: canal de contato (`CONTACT_URL`) e o nome definitivo do app, ambos
> centralizados em `lib/appInfo.ts`.

> **Atualização (pós-v1.8, 2026-10-12, ajustes de uso real — 439 testes):** seis ajustes
> vindos do primeiro treino completo com o app. **(1) Contagem de reps** — o tile "reps
> totais" do fechamento descartava em silêncio todo exercício com `parsed: null`, que é
> *obrigatório* pra alvo em intervalo ("3 × 8-10") no contrato da IA; um treino de 70 reps
> mostrava 16. A unidade e o "por lado" agora saem do texto do alvo quando falta `parsed`
> (`unitOf`/`perSideOf`), a soma virou função pura (`repsVolume`) e lê cada exercício pelo
> resolver (snapshot do log), não pelo plano vigente. Mesma raiz em `getLoggedExercises`
> (isometria em intervalo caía no gráfico de volume) e em `totalVolume` (alvo "/lado" sem
> `parsed` não dobrava). Nenhum dado gravado mudou, só a leitura. **(2)** Coach marks do
> card removidos (poluíam o cartão); `CoachMark`, `coachMarks.ts` e o teste saíram.
> **(3)** `obs` do exercício ficou colapsada ("como executar"), no card e na prévia do
> treino, reusando `CollapsibleTip` com prop `label`. **(4)** Card "Crie seu primeiro treino
> com IA" na home (`PlanBuilderCard`), só enquanto o plano em uso é uma semente
> (`isSeedPlanId`) e fora de sessão; sobe acima do próximo treino quando não há sessão feita.
> **(5)** Prompt da IA pede `obs` de uma frase (~100 caracteres) e `tip` de até 2; *sem*
> `max()` no Zod — recusar o plano inteiro por texto longo seria falha dura pra problema
> cosmético. **(6)** Demonstração visual por exercício: duas poses do RepDB (início → topo)
> dentro do "como executar", carregadas só ao abrir e guardadas no cache do SW
> (`CacheFirst`, teto de 120 entradas). 56 ids do catálogo mapeados; imagem fora do
> repo. Decisão e alternativas em [PLAN-midia-exercicios.md](PLAN-midia-exercicios.md).

> **Atualização (pós-v1.8, branch `onboarding-nivel-e-ux`, 2026-10-09, 7ª leva):**
> revisão do **prompt de "Montar treino com IA"**, que era contrato de formato e virou
> briefing de coach. Três buracos fechados: os campos de topo do plano (`id`, `version`,
> `name`, `source`, `imported_at`) nunca estavam documentados — resposta boa era recusada
> na validação; os tokens do export (`casa_barra`, `forca`, `regress`, `limitacoes`) iam
> crus, sem legenda nem a ação que cada sinal exige; e as escadas iam sem o critério
> numérico de cada degrau, então a IA escrevia alvo abaixo do critério e o atleta nunca
> ficava `ready`. Agora o prompt leva o critério de cada degrau (de `formatCriteria`, o
> mesmo texto da UI), equipamento e pré-requisito por skill, os ids que o app já conhece,
> as duas armadilhas de runtime (`rest` em minutos vira segundos; `parsed: null` com
> `skill_ref` vira sinal falso de regressão) e 15 regras de método. Novo
> `lib/plan/aiPrompt.ts` (briefing + `buildAiPrompt`) separado de `aiSchema.ts` (formato).
> Medido o tamanho em seguida: a instrução são ~6,2k tokens fixos e não tem corte que renda
> (os candidatos dão 250–800 tokens e pedem filtro que erra); o que cresce é o dado. Daí
> duas mudanças no payload: **serialização seletiva** (plano indentado, porque a IA edita
> campo a campo; histórico compacto, porque é leitura em bloco) e **janela de detalhe no
> `sessions`**, que não existia — o export mandava todo treino concluído, pra sempre. A
> janela é em **sessões de plano, não em dias** (`detailWindow = max(18, 6 × treinos)`):
> o que importa é quantas vezes a IA vê cada movimento, e 30 dias num plano de 5 treinos dá
> 2,6 passadas, abaixo das 3 seguidas que o motor usa pra decidir regressão; janela em dias
> também zera o histórico de quem parou cinco semanas. Sessão avulsa não consome janela. O
> que fica atrás vira `historico_anterior`, resumido por movimento com `desde`/`ate`/
> `sessoes`/`melhor_serie` — `desde` é o que deixa a IA ver estagnação longa. Com 60 treinos
> registrados: ~28,6k → ~17,4k tokens, e agora com teto (200 treinos seguem ~17k).
> No primeiro teste real a resposta da IA foi recusada por "JSON inválido": o
> `stripCodeFences` só aceitava cerca de código que fosse o texto inteiro, e a resposta vem
> com prosa em volta. A importação passou a isolar o JSON (cerca em qualquer posição, ou do
> 1º `{` ao último `}`), a tolerar comentário `//` e vírgula sobrando — varrendo com
> consciência de string, pra não mutilar URL nem `obs` — e a distinguir **resposta cortada**
> (chaves abertas) de JSON sujo, com o trecho do erro na mensagem. No prompt: proibição de
> texto em volta e pedido de JSON compacto (saída de ~7,0k → ~4,2k tokens, que é o que faz
> caber no limite do chat). No segundo teste real a falha foi outra: a IA devolveu
> `"duration":"\~38 min"` — escape de markdown, que o JSON não aceita, e o `~` vinha do
> exemplo do próprio prompt. O parser passou a tolerar escape inválido (tirar a barra só
> conserta: em JSON válido aquilo já era erro), o exemplo perdeu o `~` e o contrato ganhou
> uma seção dizendo que campo de texto é string JSON, não markdown.
> Ver [PLAN-prompt-ia.md](PLAN-prompt-ia.md). 432 testes.

> **Atualização (pós-v1.8, branch `onboarding-nivel-e-ux`, 2026-10-09, 6ª leva):**
> redesenho do menu **Config → Ajustes**. Lista agrupada estilo iOS (Perfil · Treino ·
> Lembrete · Dados · apagar isolado no fim) com primitivas novas `SettingsGroup`,
> `SettingsRow` e `Switch`; "Criar treino com IA" saiu da tela-mãe pra `/config/plano` e
> "Meus exercícios" virou `/config/exercicios`. Feedback unificado em toast (some o banner
> global), spinner por linha, haptics curtos e "Fazer backup antes" dentro do diálogo de
> apagar tudo. Vocabulário trocado por termos de calistenia/app (ver
> [PLAN-config-ajustes.md](PLAN-config-ajustes.md)). Meta semanal virou stepper. 403 testes.

> **Atualização (pós-v1.8, em `main`, 2026-10-09, 5ª leva):** revisão de UX/UI do
> onboarding (sem mudar o que ele coleta). **Ritmo vertical:** cada tela colava o
> conteúdo no topo com um vazio no rodapé; agora o corpo centra num wrapper
> `my-auto` dentro do scroller — telas curtas ganham ar no centro óptico, o resumo
> (mais cheio) encosta no topo sozinho, e nada corta nem força scroll (continua
> 0px de rolagem no iPhone SE e no piso real de Android, 360×640, em todos os
> caminhos). **Textos de apoio** reescritos com o valor na frente e mais curtos
> (ex.: a tela de objetivo abria com "Não muda o plano agora"; agora abre com "Pra
> onde você quer evoluir primeiro"), e o `daysFeedback` menos genérico. **Grade de
> objetivo:** `gap-2`→`gap-3`, padding maior e `min-h` por card, pra respiro
> horizontal e altura igual entre os quatro. **Tipografia:** títulos 24px semibold
> → 28px bold com `tracking-tight`; subtítulos 14→15px com `leading-relaxed`. Sem
> ícone novo nem lib de cor (SVG próprio é a regra do repo). Pendência conhecida: no
> seletor de plano o "· sugerido" quebra pro fim do título de duas linhas — vira
> selo próprio depois, se valer. 400 testes.

> **Atualização (pós-v1.8, em `main`, 2026-10-09, 4ª leva):** as 3 a 5 perguntas de
> capacidade (flexões seguidas, barras, parada de mão, dips) viraram **uma pergunta
> de nível** — Iniciante / Intermediário / Avançado, com uma frase de contexto em
> cada. Motivo: o fluxo cai pra 7 telas fixas (a barra de progresso não salta mais
> com o equipamento) e o nível é um sinal legível pra IA. **A definição dos níveis
> vem da escada do app (`progressions.json`), não de contagem de repetição:**
> avançado em calistenia é quem *tem* skills (muscle-up estrito, handstand livre,
> straddle planche), e as frases citam os critérios que a escada usa pra dar uma
> etapa por batida (pull-up 3×8, dip completo 3×8, diamante 3×10, handstand na
> parede 30s). Cada nível grava a **faixa baixa** das posições (`LEVEL_POSITIONS`),
> porque `max(logs, manual)` não corrige palpite alto. Respostas no formato antigo
> são migradas na leitura (`levelFromLegacy`: o maior nível que a pessoa alcança em
> *toda* skill perguntada). Alternativa descartada: manter as 4 perguntas como
> refinamento opcional — mais precisão, mas o fluxo longo que o nível veio encurtar.
> **Pendente — decisão sua:** (1) os limiares das três frases são minha leitura das
> escadas e precisam da sua calibração (ficam em `levelOptions`, `questions.ts`);
> (2) a semente `intermediario` prescreve pull-up 4×4, que na escada é a etapa
> *anterior* ao 3×8 — o nome promete mais do que o conteúdo entrega, e não existe
> semente avançada. 400 testes.

> **Atualização (pós-v1.8, em `main`, 2026-10-09, 3ª leva):** o objetivo da 2ª leva
> (por skill: flexão, barra, muscle-up, parada de mão) foi **descartado**: o app tem
> 16 skills e uma lista por skill nunca cobriria todas — quem quer planche não achava
> a opção. Virou foco geral em grade 2×2 (**Força, Resistência, Skills, Mobilidade**),
> independente do equipamento, e vai pro export como `objetivo: "skills"`. A skill
> específica fica em Config → "Meus objetivos" (persona), que já lista todas.
> Alternativa descartada: multi-select de skills no onboarding (repete a persona e
> estoura a tela). 398 testes.

> **Atualização (pós-v1.8, em `main`, 2026-10-09, 2ª leva):** o onboarding passou a
> perguntar **objetivo** (substituído na 3ª leva, acima) e **dor/limitação**. Nenhum dos dois muda o plano sugerido
> (as sementes são generalistas; mudar composição por objetivo seria gerar treino,
> fora da tese) — os dois vão pro `perfil_declarado` do `exportForAI`, que até aqui
> dizia à IA só o que a pessoa *consegue*, nunca o que ela *quer* nem do que
> desviar. Limitação é múltipla escolha e a tela diz na cara que o app não tira
> exercício sozinho. **Saída acima das sementes:** quem responde o máximo em toda
> pergunta feita pro equipamento dela (`aboveTopSeed`) recebe no resumo o aviso de
> que os planos prontos param no intermediário, com atalho "trazer meu plano" que
> grava tudo e cai no import do Config — não existe semente avançada, e escrever
> uma é curadoria, não código. "Bananeira" virou **"parada de mão"** (o termo do
> resto do repo). Telas continuam sem scroll: remedido nos 4 equipamentos × 2
> viewports **também no caminho do máximo**, que é o estado mais cheio do resumo.
> 399 testes.

> **Atualização (pós-v1.8, em `main`, 2026-10-09):** revisão do onboarding depois
> de ler o fluxo inteiro. **Tela de resumo** no fim: mostra a etapa em que cada
> skill foi gravada, a meta semanal e o plano escolhido (com o primeiro treino),
> e é a única chance de corrigir um palpite antes de `max(logs, manual)` colar
> nele — "escolher plano" virou desvio a partir dela, não tela terminal.
> **Nenhuma tela rola:** `h-dvh` com rodapé fixo (medido em Chromium a 375×667 e
> 360×600, nos 4 caminhos de equipamento) e o passo seguinte sempre começa do
> topo; o `pb-24` da nav saiu das rotas sem nav (`AppMain`) e o rodapé passou a
> respeitar a safe area. **Pergunta da parada de mão reescrita** ("consegue fazer
> bananeira na parede?"), com cada opção dizendo subir *e* aguentar. **Corrigido:**
> "Pular" aplicava `iniciante-com-barra` mesmo pra quem tinha acabado de marcar
> "só o chão" — agora respeita o equipamento já respondido (`skipSeed`), e some no
> resumo. 390 testes. **Pendente desta revisão:** pergunta de objetivo (hoje o
> `perfil_declarado` diz à IA o que a pessoa consegue, nunca o que ela quer),
> saída pra quem está acima da semente `intermediario`, e a decisão sobre
> perguntar dor/limitação. *(Os três foram feitos na 2ª leva, acima.)*

> **Atualização (pós-v1.8, em `main`, 2026-10-08):** o app deixou de pressupor
> o autor e passou a poder ser testado por terceiros. O `plan.json` bundlado não
> é mais o plano pessoal (que vive em `lib/plan/plans/` e é reaplicado sozinho
> pelo `PlanBoot`, que acha o plano certo no `plan_day_id` do histórico) e sim o
> `iniciante-com-barra`. **Onboarding** de até 8 telas com perguntas leigas de
> capacidade ("consegue fazer uma barra?"), que semeiam o mapa de skills e
> escolhem uma de três **sementes**; refazível pelo Config. **Dicas de primeiro
> uso** nas três interações que o app inventou (alvo, botão de um toque, chips).
> **Mapa de calor** das métricas realinhado e com profundidade. Corrigida a
> **hidratação** quebrada em Config, Histórico e Treino para quem tem plano
> importado — bug anterior a esta leva. 387 testes. **Pendente:** revisão do
> conteúdo das sementes (são rascunho) e uso real no celular. Decisões, desvios
> e o que ficou de fora em
> [`PLAN-onboarding-e-planos-semente.md`](PLAN-onboarding-e-planos-semente.md).

> **Atualização (pós-v1.8, em `main`):** treinos por letra. O plano deixou de ser uma
> agenda por dia da semana: cada treino tem `id` (A, B, C…) e a ordem do plano é a
> sequência — o próximo é o seguinte ao último concluído, em ciclo, sem limite de
> treinos. Histórico migrado (Dexie v5, `weekday` → `workout_id`) e plano importado no
> formato antigo é convertido ao carregar. Home: próximo treino + "Depois"; avulso não
> anda a fila. Meta semanal conta sessões (teto 14). Métricas: equilíbrio entre treinos
> (frequência por treino) e calendário de constância das últimas 12 semanas (binário:
> treinou / não treinou). Rota `/treino/[id]`. 277 testes. Backup v2. Detalhes em
> [`PLAN-treinos-por-letra.md`](PLAN-treinos-por-letra.md).

> **Atualização (v1.8):** treino dinâmico e sinal de progressão confiável. Série
> extra (conta em volume/recorde, não na progressão), exercício adicionado no meio
> do treino (catálogo de 120 exercícios + criação própria), snapshot do exercício
> em cada log (o passado deixa de mudar quando o plano muda), `skill_ref` no plano,
> regressão só por falha real, "dispensar" no aviso de progressão e RIR removido da
> UI. Dexie v4. 249 testes. Detalhes em [`PLAN-treino-dinamico.md`](PLAN-treino-dinamico.md).

> **Estado anterior (2026-07-28, v1.7):** app **em produção no Vercel**
> (`calistenia-tracker.vercel.app`). Sobre a base v1, sete levas de melhorias de
> produto: v1.1 (seletor de treino, IDs por movimento), v1.2 (reset de dados,
> animações de página), v1.3 (feedback semanal, perfil, instalação em config,
> polimento do loop de treino), v1.4 (Plano V2: confiança + hábito + skill map;
> redesign do mapa de skills como catálogo canônico de 15 skills; ajuste manual de
> nível; histórico semanal realocado para o Histórico), v1.5 (timer minimizável,
> resumo de fim de treino, polimento de home/constância, microcopy das flags, fix de
> `reloadOnOnline`), v1.6 (treino avulso: registra treino fora do programa — hoje,
> ontem ou anteontem — sem perder streak/histórico) e **v1.7** (motor de progressão
> determinístico: critérios estruturados por tipo de movimento — reps×RIR, hold
> limpo, consistência de tentativas — substituindo a regra genérica de "bateu o
> alvo" pros exercícios mapeados a um nível de skill). Typecheck limpo, 105
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
- **2026-07-28 (mesmo dia) — v1.7: motor de progressão determinístico.** Destrava a
  decisão de produto que ficava *ADIADA* desde a v1.3 (`IDEAS.md` — "qualidade de
  execução vs. RPE/notas"): o app passa a saber **por tipo de movimento** se uma
  sessão bateu o critério de progressão, não só "número ≥ alvo". Planejado em
  várias rodadas de revisão de proposta (schema → conteúdo → execução) antes de
  qualquer código, incluindo uma auditoria do catálogo de skills que achou um bug
  real: as escadas foram renumeradas entre a v1 e a v3 do `progressions.json`
  (níveis inseridos/removidos), e trocar o arquivo sem remapear o `LEVEL_EXERCISE`
  teria feito o mapa de skills marcar o degrau errado como concluído em 4 dos 9
  movimentos já mapeados — corrigido antes de virar dado de produção.
  - **Catálogo de skills v3** — `lib/plan/progressions.json` (16 skills, 82 níveis,
    fonte Overcoming Gravity/BWF Wiki/GMB) ganhou critério **estruturado** por
    nível, discriminado em 3 tipos: `reps_rir` (reps + RIR percebido), `hold_clean`
    (segundos sustentados) e `skill_consistency` (proporção de tentativas boas —
    pros movimentos onde o alvo é consistência neural, não força, ex. kick-up de
    handstand). `LEVEL_EXERCISE` remapeado (5 correções) e expandido (4 exercícios
    novos ligados a nível de skill).
  - **`ExerciseLog`** ganhou `skill_id`/`level_at_time`/`criteria_type`/
    `sets_performed`/`criterion_met` (Dexie v3, só índice novo, sem `.upgrade()` —
    logs antigos simplesmente não têm skill mapeado). "Forma limpa" reaproveita as
    flags negativas já existentes (`isClean`) em vez de pedir um toggle novo.
  - **Motor** (`lib/db/queries/skillProgression.ts`) — `evaluateCriterion` (puro,
    por tipo) + `getSkillState` (streak de sessões seguidas batendo o critério →
    `ready`; 3 falhas seguidas → `regress`; 8+ sessões sem decidir → `stale`).
    Aditivo: o motor genérico antigo (`getProgressionReady`, streak de 2 sessões
    no alvo) continua servindo de fallback pros exercícios sem skill mapeado — a
    maioria do plano.
  - **UI de registro** — RIR (0-4, pills) aparece só nos exercícios `reps_rir`;
    contador de tentativas boas/totais **substitui** o fluxo normal só nos
    `skill_consistency` (esses hoje já não tinham alvo numérico parseável, ex.
    "10-12 tentativas" em texto livre); `hold_clean` fica visualmente idêntico a
    antes. Novo aviso `SkillReadyNudge` ao lado do `ProgressionNudge` existente.
  - **Limpeza** — cópias soltas de `plan.json`/`progressions.json` na raiz do
    repo (desatualizadas, uma delas rastreada por engano) removidas; `.gitignore`
    passou a bloquear esse caminho de erro se acontecer de novo.
  - **Infra** — bump para `1.7.0` (`package.json` + lock sincronizado). Typecheck
    limpo, **105 testes** passando (29 novos, incluindo um teste de regressão que
    trava se o `LEVEL_EXERCISE` desalinhar da numeração do catálogo de novo).
    Validado com Playwright headless contra o dev server nas 4 combinações reais
    de tipo de critério + página do mapa de skills, sem erros de console.
