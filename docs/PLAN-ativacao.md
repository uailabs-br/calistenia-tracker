# PLAN — Ativação do estreante

Status: implementado em 2026-10-28, sem teste em celular. Avaliação e protótipo de origem:
doc `6EaiDmbdwCjb12fcKSZM52` e protótipo `8pGNShpt1iwxdneKqoxDGj` (claude.ai/artifact).

## Contexto

A avaliação de ativação achou o caminho até o primeiro treino curto (cerca de 11 toques, sem
cadastro), mas com o que distrai, contradiz e solta a pessoa em volta dele:

- na home, logo depois do onboarding, "Crie seu primeiro treino com IA" vinha acima do treino;
- o carregamento do primeiro treino dizia "Sem objetivo marcado" logo depois de o onboarding
  perguntar o foco;
- nada pedia o próximo treino nem a instalação no fim do primeiro, e quem voltava de uma pausa
  via a mesma home de quem treinou ontem.

## Decisões

**Home do estreante é só o treino.** Com zero treinos concluídos, o card do próximo treino sobe
pro topo ("Seu primeiro treino.") e saem o criador com IA, o "treinei fora do programa" e o
pedido de instalação. Tudo volta depois do primeiro concluído.

**O aviso de objetivo espera o primeiro treino.** Em `MissionIntro`, "Sem objetivo marcado" só
aparece com pelo menos uma sessão concluída.

**Onboarding: todas as perguntas, nome no fim, sem "Pular".** A ordem é equipamento, nível,
dor, foco, dias, nome, resumo. Subtítulo só onde evita erro ou expectativa errada (nível, dor,
foco; no refazer, histórico e troca de plano). O texto mora em `docs/onboarding-copy.md`. Sem
"Pular" não existe mais plano aplicado sem equipamento respondido; `skipSeed` saiu.

**Planos de corpo inteiro.** Quatro sementes novas (iniciante sem/com barra, intermediário sem
barra, intermediário barra sem paralelas), com empurrar, pernas e core em todo treino e puxar
quando há barra: cada grupo 2+ vezes por semana a partir de 2 treinos, o mínimo do position stand
do ACSM de 2026. As divididas de iniciante ficaram `listed: false` (fora das listas, conhecidas
pelo histórico). Sem barra, a puxada vem de dois exercícios novos no catálogo:
`remada-toalha-porta` (equipamento "porta", que todo setup tem) e `puxada-deslizante-chao`.

**Fim do primeiro treino marca o próximo.** Depois do resumo da primeira sessão concluída,
`FirstWorkoutNext` pede dia (sugere um de folga com meta até 3) e hora, e gera um evento `.ics`
com alarme. Depois explica e pede a instalação (iPhone: os dois passos; Android: o prompt
nativo). O dia marcado aparece no card do próximo treino.

**Pergunta por equipamento, não por lugar.** `Equipment` virou a lista do que a pessoa tem
além de chão e porta (parede, barra, paralelas, banco, argolas, paralettes, elástico, peso). O
lugar (casa, praça, academia) só pré-marca a lista, e a pessoa tira o que não tem: uma praça só
com barra agora recebe o intermediário sem paralelas. Respostas gravadas como lugar viram a lista
que o lugar implicava na leitura (`normalizeEquipment`), e o export pra IA manda a lista. Argolas
e paralettes, antes impossíveis de declarar, passam a liberar os degraus que pedem.

**Primeira semana.** Até fazer todos os treinos do plano, ou 7 dias depois do primeiro, a lista
"Sua primeira semana" toma o lugar da constância: "Montar o plano" já vem marcado (progresso
concedido, Nunes e Drèze 2006) e cada treino do plano vira um passo.

**Volta depois de pausa.** Com 7+ dias sem treino, a home mostra "Faz N dias desde o último
treino" e uma meta que ainda cabe na semana, e o botão vira "Voltar com o treino X". Vem do
megaestudo de academias (Milkman et al., Nature 2021): o que mais aumentou a frequência foi não
deixar uma falta virar duas. Na volta, o treino sobe pro topo da home. O treino que encerra a
pausa ganha, no resumo, o momento "De volta", e o selo de mesmo nome entra em Evolução; ele fica
fora do destaque de conquista da home.

## Alternativas descartadas

**Lembrete por notificação no fim do treino.** Era o protótipo. Descartado ao implementar: o
lembrete de Ajustes só guarda a preferência, nada dispara notificação, e sem servidor o PWA não
notifica com o app fechado (ver 5.1 no IDEAS). O evento na agenda entrega o aviso pelo calendário
do celular, sem prometer o que o app não faz.

**Onboarding em 3 telas.** Ficou no protótipo como opção; o autor preferiu manter as perguntas
e só tirar o peso do nome.

**Só a lista, sem atalho de lugar.** Prototipada; descartada porque quem treina em academia
marcaria item por item. **Só o lugar**, como era: o erro da praça sem paralelas.

## Pendências

- Nada visto em celular. O `.ics` foi testado só por download no Chromium; falta ver o
  "Adicionar à agenda" do iPhone e o app de calendário do Android.
- Medir o funil (onboarding → 1º treino → 2º em 7 dias) esbarra na política de privacidade.
- "Ver o app primeiro" ainda mostra o plano embutido (iniciante dividido); quem treinar por ali
  fica nele.
- Os dois exercícios novos não têm ilustração.
