# Tema futurista (2026-10-30)

Origem: pesquisa de referências de interface high tech (telas de Oblivion, FUI de cinema,
Arknights: Endfield, Nothing OS, conceitos de app fitness neon) e um protótipo com três
superfícies: vidro, industrial e linha fina. Aprovado no **vidro**, com **uma cor pra todos
os treinos** e **varredura ao abrir**. Ele também pediu o timer de descanso e o card de
constância no desenho do protótipo, e as cores recolhidas em Ajustes.

## Decisão

**Mesmo caminho do tático: só CSS sobre atributos do `<html>`.** `data-theme="futurista"` e
`data-tone` (ciano, lilás, limão, laranja, gelo), marcados pelo boot script antes da
primeira pintura. O tom do futurista é um campo próprio (`futureTone`): cada estilo lembra a
sua cor, e voltar pro tático não traz um tom que ele não tem.

**Constância e descanso mudam de desenho, não só de cor.** Os componentes renderizam as duas
versões e o CSS do tema escolhe qual aparece (`consistency-*`, `rest-*`). O
`ConsistencyCard` leva o `SegmentGauge` (um segmento por treino da meta, régua dos dias por
fora) escondido ao lado do `ProgressRing`; o `RestTimer` leva a régua de 60 marcas escondida
e o futurista some com o líquido. O HTML estático é o mesmo em todos os temas (regra 10).

*Descartado:* ler o tema em JS e trocar o componente. Precisaria esperar o mount pra saber o
tema, e o card piscaria do anel pro medidor a cada abertura da home.

**Vidro sem desfoque nos cards.** O fundo atrás é um degradê liso no `<html>`, então card
translúcido sem `backdrop-filter` fica igual a olho nu e não pesa no celular com o timer
rodando. O desfoque fica onde já existia (barra de baixo, fundo do descanso).

**Varredura em CSS.** No futurista, o `.anim-page` deixa de subir e cada bloco da tela entra
recortado de cima pra baixo, em cascata. Com `backwards`, o recorte sai ao terminar; com
`both`, ele cortaria a sombra do botão e a onda dele.

## Do protótipo pro app

- Fonte: Chakra Petch (a padrão do protótipo), carregada sem preload: quem não usa o tema
  não baixa.
- Caixa alta só em `h1`/`h2`. Em caixa alta a Chakra cortava o nome do exercício ("KICK-UP
  LIV…"), então o `h3` fica em caixa normal e quebra linha em vez de cortar.
- Os rótulos de HUD do protótipo que não existem no app (semana do ano, "1 de 5") ficaram de
  fora; o card de constância ganhou "faltam N treinos pra fechar a semana", que é dado real.
- O sucesso (`--color-success`) vira a cor ativa, como no tático.
