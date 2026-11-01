# Tema clean (2026-10-31)

Origem: pedido de um estilo "clean e minimalista", com pesquisa de referências antes do
protótipo: Teenage Engineering (monocromático, um controle se destaca e o resto recua), os
dez princípios de Dieter Rams, Things 3 (claro, muito espaço), Linear (navegação que quase
não aparece, filete no lugar de sombra) e o Minlog (app de treino enxuto). Protótipo como 6ª
chave do protótipo de temas, com fundo, estrutura, cor ativa, cor dos treinos, fonte e
descanso.

Aprovado: **fundo papel e grafite** (os dois, escolhidos em Ajustes), **só linhas**, **só
preto**, **uma cor pra todos os treinos**, **Geist** e **descanso em anel fino**.

## Decisão

**Mesmo caminho do tático e do futurista: só CSS sobre atributos do `<html>`.**
`data-theme="clean"` e `data-tone` (`papel` ou `grafite`), num campo próprio (`cleanTone`),
marcados pelo boot script antes da primeira pintura.

**A cor ativa é a tinta do texto.** `--theme-ac` = `--color-text`, então todo destaque que
já passa por `accentVars`/`themedAccent` vira preto no papel e quase branco no grafite, sem
tocar em componente. Só o que se toca pra treinar fica cheio.

**Card vira bloco com um filete em cima, sem fundo e sem recuo.** O conteúdo alinha com o
título da página, como no protótipo. O recuo de Ajustes mora em cada linha (`px-4`), daí o
gancho `settings-card`. A fila horizontal da aba Treino é a exceção (`workout-tile`): cartão
com contorno, como no protótipo.

*Descartado:* os "cards leves" do protótipo (blocos brancos sem borda). Ele escolheu as
linhas.

**Descanso em tela inteira.** O fundo do descanso (`rest-back`) vira a cor da página e o
cartão ocupa a tela: título em cima, anel de 240px em traço de ~2px na tinta, número em peso
200, botões em grade embaixo. No fim aparece "Pronto" (`rest-done`), sem o check.

**Sem animação de entrada de tela e sem a onda do botão.** O pulso dos últimos 5 s do
descanso fica: é aviso, não enfeite.

## Do protótipo pro app

- Fonte: Geist variável, sem preload (só baixa com o tema). Serve de sans, display e "mono":
  o protótipo não tem fonte mono nem caixa alta, então `.uppercase` e os rótulos voltam a
  frase normal no tema.
- Os ±15 s do protótipo seguem ±5 s, como no app. "Próxima: série N" e o nome do exercício
  no topo do descanso ficaram de fora: o `RestTimer` não recebe esse dado.
- Constância: a sequência em texto, "faltam N treinos pra fechar a semana" e a semana em
  pontos. O "2 de 4 nesta semana" do protótipo vinha do anel, que o tema esconde.
- Barra do sistema: no papel o boot script troca a `theme-color` pro papel (Android). No
  iPhone com o app instalado, a barra é `black-translucent`, decidida na abertura: relógio e
  bateria ficam brancos sobre o papel. Pendente de ver no celular.
