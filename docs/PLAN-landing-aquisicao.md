# PLAN — Landing pra aquisição

Status: implementado em 2026-11-05, sem teste em celular. Protótipo:
`YUKVtFK3R7NreNegJsZb4h` (claude.ai/artifact). Texto em `docs/landing-copy.md`. Análise de origem em
`gravks_estrategia_gtm_aquisicao.md` e `gravks_direcao_marketing_v2.md` (raiz, fora do git).

## Decisões

**Fala com quem já treina e quer sair do básico.** O doc de GTM juntava iniciante e intermediário;
o autor escolheu o meio do caminho. Por isso a demo é o Treino A do plano intermediário com barra,
e as perguntas tratam de "já treino, começo do zero?" e de quem passou do intermediário.

**Promessa no título: o que treinar e quando subir de nível.** É o que separa o Gravks de um
registro de treino. O título digitado ("Desbloqueie a força…") saiu: era abstrato e passava por um
instante sem a palavra do meio.

**Uma seção pra ideia de nível, com três linhas.** Feito, atual com a meta e "1 de 2 treinos",
próximo. A versão com abas e a progressão inteira confundia: muito nome e nada dizendo o que fazer.

**O que a página copia do app fica em `components/landing/content.ts`, com teste.** A página é
estática (regra 10) e já mostrou um nível inventado e "16 sequências" quando eram 17.

**Canal de contato é e-mail, por enquanto.** `CONTACT_URL` deixou de ser `null`, o que liga também o
convite de feedback da home, "Mandar feedback" em Ajustes e o item de feedback da política.

## Alternativas descartadas

**Aberturas com pergunta** ("Quantas barras você faz?", contador, "Qual movimento você quer?").
Mais personalidade e mais tráfego de vídeo, mas falam só com quem quer barra ou pedem um toque
antes da promessa.

**Progressão com abas por habilidade.** Mostrava variedade, mas devolvia a página à exploração
antes de explicar o mecanismo.

**Texto pequeno "Gravks, seu assistente de treino" acima do título.** O autor achou que poluía.
