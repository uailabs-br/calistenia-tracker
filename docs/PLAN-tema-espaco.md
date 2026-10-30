# Tema espaço (2026-10-30)

Origem: pedido de um estilo "espaço sideral" com navegação imersiva, em que trocar de tela é
andar pra frente ou pra trás no eixo z. Referências: NASA Eyes on the Solar System (tocar
num objeto e a câmera ir até ele), a imagem dos Penhascos Cósmicos do Webb (paleta da
nebulosa), as telas de The Expanse e de The Martian (pouca cor, legível no meio da ação).
Protótipo como 5ª chave do protótipo de temas, com cenário (nebulosa, céu aberto, órbita),
viagem (dobra, deriva, corte), cards (vidro, sólido), cor, cor dos treinos e fonte.

Aprovado: **nebulosa com o roxo do app no lugar do âmbar**, **dobra**, **vidro**, **uma cor
pra todos os treinos**, **Exo 2**, e a constância menor (anel de 84px). Cor não foi
escolhida: ficou o gelo, que era o padrão do protótipo. No mesmo pedido: o descanso do
futurista e do espaço igual aos protótipos, e o fim do descanso sem o botão "ok" em todos os
temas (ele já fecha sozinho em 1,4 s).

## Decisão

**Profundidade por rota, regra pura.** `lib/utils/spaceTravel.ts`: as abas na ordem da nav
são 0 a 3, cada segmento de URL abaixo da aba afunda 0,25 (Histórico atrás de Evolução, um
treino antigo atrás do Histórico) e a sessão é 4, o ponto mais fundo. A viagem dura
520 ms + 90 ms por profundidade, até 820 ms (começar o treino do Início). Dentro da sessão
não há troca de rota, então registrar série nunca espera viagem.

**Primeiro tema que não é só CSS.** Os outros trocam cor e forma dos mesmos componentes.
Aqui entram duas peças em JS, e as duas só leem o tema depois do mount, nunca no render (o
HTML estático segue igual em todos os temas, regra 10):

- `SpaceSky`: nebulosa em CSS e estrelas num canvas fixo atrás de tudo. A nebulosa cresce
  com a profundidade da tela (`--space-d`), então voltar pra uma aba devolve o céu como
  estava. O canvas **só anima durante a viagem**; parado, fica um quadro estático. Acende e
  apaga sozinho quando Ajustes troca o tema (observa o `data-theme` do `<html>`).
- `PageTransition`: a tela velha precisa existir enquanto a nova chega, mas o React a tira
  do DOM na troca. A cópia é tirada na limpeza do ref (React 19 roda a limpeza com o nó
  ainda no lugar) e anima numa camada fixa sem toque; indo, ela passa na frente da câmera,
  voltando, recua atrás da nova. Só no tema espaço e sem "reduzir movimento".

*Descartado:* View Transitions do navegador. O instantâneo da tela velha é tirado depois que
o `startViewTransition` é chamado, e o React já trocou o DOM nesse ponto; segurar o commit
até o instantâneo exigiria mexer na navegação do Next (a integração dele ainda é
experimental). A cópia do DOM funciona igual com link, `router.push` e voltar do navegador.

*Descartado:* céu animando sempre (deriva lenta, como no protótipo). Gasta bateria no meio do
treino e o vidro desfoca por cima a cada quadro.

**O resto vem do futurista.** As regras que valem pros dois (vidro, botão, rótulos,
constância, descanso, nav) usam `:root:is([data-theme="futurista"], [data-theme="espaco"])`;
o bloco do espaço só troca o que é dele: tokens, vidro mais escuro (as estrelas são claras),
pílulas no que se toca, órbita na constância, satélite no descanso, estrelas no calendário
da Evolução e o trilho da nav com o marcador que anda até a aba acesa.

**Cor fixa.** Sem `data-tone` e sem seletor de cor em Ajustes: ninguém pediu, e os tons do
protótipo eram opção, não escolha.

## Descanso igual aos protótipos (futurista e espaço)

Título "Descanso"/"Pronto" em cima, anel de 220px com régua, botões numa grade da largura do
card e, no fim, "OK" na cor sem o arco cheio. O `RestTimer` ganhou `viewBox` pra crescer por
CSS, o satélite e os ganchos (`rest-title`, `rest-ring`, `rest-ok`, `rest-btns`). Ficaram
como no app: ±5 s (o protótipo tinha ±15 s) e a linha "próxima: série N", que pediria passar
a próxima série da sessão pro timer.

## Do protótipo pro app

- Títulos de seção que no app são `h2` simples ("Conquistas", "Equilíbrio entre treinos")
  seguem em caixa normal, como no futurista.
- O mapa da Evolução vira estrelas por CSS sobre o calendário que já existe, sem as linhas
  ligando os dias treinados do protótipo.
- Sem teste em celular: a conferir o peso do vidro sobre o céu e o desfoque da viagem em
  aparelho mais velho.

## Revisão (2026-10-30, noite)

Visto no app, ele não gostou da dobra e trocou pela **deriva**, a segunda opção do
protótipo: 0,45 s em qualquer distância, a tela afunda ou volta de leve (160/380px no eixo
z, contra 560/1500px da dobra), sem desfoque e sem as estrelas virarem riscos; o céu só anda
um pouco. Sai junto o custo do desfoque de 6px na tela inteira durante a viagem.

Os botões de estilo em Ajustes viraram uma grade 2×2: com quatro numa linha, "Futurista"
estourava o botão em tela de 360px.

Na volta, a nav sumia por um instante e a tela desarrumava (só no celular): a tela nova
chega aumentada, fica mais larga que a tela, e o celular alarga o layout pra caber, levando
a nav fixa pra fora da vista. Durante a viagem o `main` ganha `overflow: clip` (classe
`space-traveling` no `<html>`); `clip` e não `hidden`, pra não virar contêiner de
rolagem e não soltar o sticky.
