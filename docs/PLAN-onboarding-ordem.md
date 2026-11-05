# PLAN — Ordem do onboarding

Status: implementado em 2026-11-04, sem teste em celular. Protótipo:
`1EFMwaBrxLE5sniZoHtxtb` (claude.ai/artifact).

## Decisões

**A ordem vai do que a pessoa quer ao que ela tem.** Objetivo, lugar, equipamento, foco, nível,
tela parcial, dor, dias, nome, tela final. Antes abria com a lista de equipamentos, a tela mais
trabalhosa. O foco fica depois do equipamento porque as habilidades dependem dele.

**A tela parcial mostra o treino, não só avisa que falta pouco.** O plano sai de equipamento +
nível (`suggestSeed`), então logo depois do nível o "Já tenho quase tudo" já é verdade e dá pra
mostrar o Treino A de verdade. Dor, dias e nome não mudam esse treino.

**Tela final com o caminho, não com o treino de novo.** Foto, a escada real da skill (de onde a
pessoa começa até 3 etapas à frente) e um botão que abre a sessão direto, sem passar pela home.
"Treinar depois" vai pra home e não abre agenda. A previsão é a do caminho feliz (`earliestStepWeek`)
e fala da primeira etapa, nunca do destino: dizer "em 2 semanas você chega lá" ao lado de
"sua primeira barra" seria falso.

**Toque único avança sozinho.** Objetivo, lugar, nível e "Nada por enquanto", depois de 220 ms pra
marcação aparecer. Nessas telas nada vem marcado e não há Continuar. O foco vai pro título da tela
nova, senão leitor de tela e teclado ficam presos num botão que sumiu.

**Rascunho das respostas.** Antes, fechar o app no meio perdia tudo. O rascunho fica no localStorage,
é validado na leitura e sai ao gravar. Só na primeira vez: quem refaz parte das respostas gravadas.

**Refazer fica na ordem antiga.** Quem refaz veio ajustar uma resposta, e o resumo completo é o
que interessa pra ele.

**Fotos fora do precache** (`globPublicPatterns`): só quem chega na tela final baixa a sua. Sem
internet nessa tela, a escada aparece sem foto.

## Alternativas descartadas

**Cortar foco, dor e dias do onboarding.** Eles não mudam o primeiro treino, e tirá-los deixaria o
fluxo em cerca de 5 telas. O autor manteve: quer essas respostas pra avaliar o perfil de quem entra,
quando houver banco.

**Prometer resultado no corpo ("em 8 semanas...").** Sem dado que sustente.

**Tela de "montando seu plano".** O plano já está pronto; a espera seria encenação.

## Riscos

- "Na dúvida, escolha o menor" saiu a pedido do autor, e um nível alto não se corrige sozinho
  (posição = `max(logs, manual)`). O que sobra de proteção: "Você começa aqui" na tela final, com
  Voltar e a revisão das respostas.
- "O treino não muda" saiu do texto de dor: quem marca ombro pode achar que o treino de hoje já foi
  adaptado.
- O app não mede abandono por tela, então a nova ordem não tem como provar ganho.
