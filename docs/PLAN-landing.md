# PLAN — Página de boas-vindas (`/sobre`)

## Contexto
Até a v1.8 o app não tinha primeiro contato: `PlanBoot` mandava quem chegava sem rastro de
uso direto pro `/onboarding`, que abre perguntando equipamento, nível, objetivo e lesões.
A pessoa respondia antes de saber o que o app é e por que valeria a pena. Com o app aberto
pra terceiros (planos-semente, criador com IA), esse é o buraco mais caro que sobrou.

O pedido veio com um eixo de posicionamento: tratar o projeto como **comunidade**, uma
ferramenta em aprimoramento feita por quem treina. Isso colidia com um guard-rail já
registrado (`IDEAS.md`: social/feed/comunidade fora de escopo, `CLAUDE.md` idem).

## Decisão

**Comunidade no projeto, não dentro do app.** A página promete o que o projeto entrega de
fato — feedback de quem usa virando feature, mudança frequente, autor identificável — e não
promete feed, ranking ou perfil. Nenhum guard-rail reaberto; o custo é um canal de contato.

**Rota própria (`/sobre`), só pro estreante.** O `start_url` do manifest continua `/`: se a
landing fosse a home, quem instalou o PWA veria a apresentação a cada abertura. `PlanBoot`
passa a decidir entre `/sobre` e `/onboarding` pela marca `calistenia:landing-seen`
(`lib/utils/landing.ts`), gravada quando a pessoa usa uma das saídas da página. O
`resetAll` apaga essa marca junto com as outras: "começar do zero" traz a primeira visita
de volta.

**A única página estática do projeto.** Nada aqui deriva de `plan.json` — que vem do
localStorage e quebraria a hidratação (regra 10) — nem do Dexie. Em troca ela prerenderiza
inteira (110 kB de first load contra 182 kB da home) e é a única superfície do app que um
buscador consegue ler.

**O herói é o cartão de sessão de verdade, tocável** (`components/landing/OneTapDemo.tsx`),
com o conteúdo escrito à mão. A promessa principal é "um toque por série": tocar prova em
dois segundos o que um parágrafo não convence. Um único movimento não pedido — se a pessoa
não toca em 3,5s, o primeiro cartão se registra sozinho, uma vez, e nunca sob
`prefers-reduced-motion`. O segundo elemento visual é um trecho da escada do pull-up com a
posição marcada (`LadderPreview`), porque "evolução em degraus" se vê melhor do que se lê.

**Chrome fora.** `isChromeless` (`lib/utils/routes.ts`) virou o único lugar que decide onde
a `BottomNav` não aparece e onde o `main` muda de medida; antes a regra estava duplicada em
`AppMain` e `BottomNav`, cada uma com seu `startsWith("/onboarding")`. A landing também não
herda o `max-w-md` do app: 448px é coluna de uso, não de leitura.

## Alternativas descartadas

**Landing na `/`, com o app atrás de um CTA.** Mais convencional e indexável, mas penaliza
justamente quem já usa: o PWA instalado abre em `start_url`, e a pessoa pagaria um toque
por treino pra ver uma apresentação que já leu. Rejeitada por isso.

**Comunidade de verdade (perfis, feed, comparação).** É a alavanca de retenção mais
comprovada do mercado e está no `IDEAS.md` como reabertura possível — mas transformar a
tese do app numa landing seria decidir a feature mais cara do projeto pela ordem inversa.

**Seção de preço explicando os planos pagos futuros.** O objetivo declarado era
transparência sobre não ser negócio, não vender. Seção de preço de produto que não existe
cria objeção antes de existir valor; virou uma linha na última seção.

**Copy em terceira pessoa, estilo página de produto.** Descartada na revisão com o autor: a
história pessoal (treina sozinho desde 2024, escreveu a ferramenta que queria ter) é o único
diferencial que nenhum concorrente copia. O texto final está em `docs/landing-copy.md`, que
é a fonte editável — a página foi escrita a partir dele.

## Revisão: ritmo e imagem

A primeira versão virou textão — sete seções de prosa empilhadas, todas com o mesmo
compasso. A correção não foi escrever melhor, foi **transferir o argumento pra interface**:
o texto caiu quase pela metade e cada bloco agora alterna uma frase curta com um pedaço do
app de verdade (cartão tocável, três tiles de promessa, escada de progressão, sinal de subir
de nível, grid de features com ícone). Bandas de `bg-surface` em largura total quebram a
coluna e dão respiro entre os blocos.

**Imagem gerada por IA, descartada.** Testei um herói gerado (silhueta em front lever,
preto com contraluz violeta). Duas razões pra não usar: o retorno veio como preview de
199×112, e o resultado é o clichê visual mais reconhecível de página feita por IA — fundo
quase preto com um acento neon. A página já é escura; mais um degradê não informa nada.

**Ilustrações do RepDB em duotone.** São cartoon em fundo azul claro e o dataset não tem
versão com transparência (só `images/flat/`, opaco — conferido no host). Em vez de descartar
ou de modificar e republicar o arquivo (que a licença proíbe), o tratamento é CSS puro:
`grayscale(1) invert(1)` joga o fundo pro preto e a figura pro claro, e um overlay do accent
em `mix-blend-multiply` pinta o que sobrou. O resultado lê como se não houvesse fundo e fica
na paleta do app. Entram em dois quadrados (remada invertida / front lever) que mostram os
extremos que o app atende, com o crédito exigido pela licença no rodapé. Fora disso, a
imagem da página é a própria interface, que é escura, autoral e não custa rede.

## Posicionamento: calistenia é o nicho de entrada, não o teto

O título fixo prometia calistenia e só calistenia. O app, na prática, registra treino livre
de qualquer tipo — e o próprio onboarding já pergunta objetivo entre força, resistência,
skills e **mobilidade** (`Goal` em `lib/domain/onboarding.ts`), que vai pro prompt da IA que
escreve o plano. O título virou rotativo ("Desbloqueie a força / a mobilidade / o equilíbrio
do seu corpo") pra abrir a porta sem mentir: cada palavra tem lastro — força e skills nas
escadas, equilíbrio no handstand, mobilidade no objetivo declarado que molda o plano gerado.

O subtítulo continua ancorando em calistenia, de propósito: título largo atrai, subtítulo
específico qualifica. Trocar a lista de palavras é uma linha em `TypedHeadline.tsx`.

A animação é digitada em vez de um fade porque precisa ficar claro que as palavras são
**alternativas**, não uma lista decorativa. Ela só roda depois do mount (o primeiro render
mostra a palavra inteira, então a hidratação não vê diferença), nunca sob
`prefers-reduced-motion`, e o título completo vai num `sr-only` — ninguém deveria ouvir uma
frase se remontando letra por letra.

## Pendências assumidas

- **Canal de contato** (`CONTACT_URL` em `lib/appInfo.ts`) está `null`: a frase "me manda"
  renderiza sem link até alguém definir o destino. É uma linha.
- **Nome do app**: a página usa `APP_NAME` de `lib/appInfo.ts` ("Calistenia Tracker", o que
  o manifest já dizia). O `IDEAS.md` chama o projeto de "Treinei"; quando a escolha for
  feita, muda num lugar só. A decisão ficou mais pesada com o título rotativo: um nome com
  "Calistenia" dentro contradiz a porta que a página abriu pra quem quer só mobilidade.
- **Foto do autor**: a seção "Quem fez isso" ganharia muito com uma foto real de treino —
  é o único lugar da página onde fotografia resolveria algo que a interface não resolve.
  Não existe asset no repo; quando existir, é um `<figure>` ao lado do parágrafo.
- **"Ver o app primeiro"** funciona na carga atual, mas quem recarregar sem ter plano nem
  histórico volta pro `/onboarding` — comportamento que já existia antes desta página.
