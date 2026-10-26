# Revisão do motor, do export e da duração (2026-10-26)

Origem: uma lista de 12 problemas escrita a partir do export pra IA, conferida item a
item no código. Metade tinha o diagnóstico errado; o que ficou está abaixo, com a decisão
e o que foi descartado.

## Motor de progressão

**Tentativas não regridem mais por ficar abaixo da proporção.** O registro de tentativas
grava o placar (`sets: null`), então `hitTarget` nunca batia e toda sessão abaixo da
proporção virava "falha de verdade": três dias aprendendo o kick-up já davam `regress`.
Agora, em tentativas, falha é zero boas. *Descartado:* comparar com o total de tentativas
que o plano pede — o plano em geral escreve o alvo em outra unidade (ver avisos).

**Sessão que não alcança o critério é neutra.** O mesmo degrau em dois treinos, um de
manutenção com alvo menor, quebrava a sequência positiva do outro. O voto dessa sessão
virou `neutral`: não conta nem quebra o `ready`; falhar no próprio alvo leve continua
contando pra regressão, e ela continua contando pro `stale`. *Descartado:* um campo
`maintenance: true` no plano — mais contrato pra IA preencher, e o caso é derivável do
alvo vs. critério.

**Front lever: One Leg (3) antes de Straddle (4).** Seguro hoje porque nenhuma escada
mapeava FL acima do nível 1; o script de ids avisa se o backup tiver log nesses níveis.

## Importação do plano

Avisos novos no `diffPlan`: unidade do alvo diferente do tipo de critério (o `3 × 15s` num
degrau de tentativas), salto de mais de um nível em relação ao plano atual, e id
reinventado — por separador, prefixo de padrão (só de um lado, senão `pull-up-arqueiro`
casa `push-up-arqueiro`) ou alias do catálogo. Id inventado que **já está** no plano atual
também avisa: antes ele contava como conhecido e passava pra sempre.

**Ids do histórico: script, não migração.** `scripts/merge-exercise-ids.mjs` reescreve um
backup e carimba `updated_at` pra vencer no import. *Descartado:* tabela de alias no app
ou `version()` do Dexie — os pares são do histórico de uma pessoa, e o código ficaria com
eles pra sempre.

## Export pra IA

`fora_do_equipamento` nos sinais (próximo e anterior já pulam o que o equipamento
declarado não comporta), `frequencia_observada` (dias distintos nas últimas 4 semanas,
ou desde o primeiro treino), `acrescentados_recorrentes` e `pulados_seguidos` (3+). Os dois
últimos ficam no export e não viram sugestão no app: editar plano é trabalho da IA
(guard-rail). *Descartado:* "sugerir promover pro plano" dentro do app.

## Duração estimada

A causa principal do erro era o estimador ignorar todo exercício com `parsed: null` — o
formato obrigatório pra alvo em intervalo. Agora lê o texto do alvo, dobra o trabalho por
lado, conta tentativas com descanso entre elas, soma aquecimento e 45s de troca. E calibra:
mediana de real/estimado nos últimos 10 treinos do plano (3+ medidos, sessão entre 10 min
e 3 h, fator entre 0,75 e 1,75). *Descartado:* só ajustar constantes — cada pessoa erra
diferente, e o app já tem o tempo real.

## Loading e conquistas (aprovados em protótipo)

**Carregamento só quando demora.** Home e tela de treino esperam tudo que vão mostrar e só
pintam o skeleton se isso passar de 200 ms (`useDelayedFlag`); o banco é local e quase
sempre responde antes. Na tela de treino isso também tirou o pisca de prévia → runner de
quem volta pra uma sessão em andamento. O pedido pra IA diz a etapa ("lendo 46 treinos…")
só se passar de 300 ms e, depois de copiar, mostra o que foi no pedido. *Descartado:*
etapas na importação — a conferência é síncrona e leva milissegundos; mostrar "conferindo…"
seria atraso inventado.

**O "o que foi feito" de quem recarrega.** Trocar de plano recarrega o app, e o toast morria
junto. Agora vai por `sessionStorage` (`lib/utils/flash.ts`) e aparece na home: "Plano
trocado. O próximo é o treino B."

**Conquistas na home: dois números, não uma lista.** A primeira versão (skills objetivo com
escada, selo e recorde) ficou extensa. Ficou o selo mais difícil já ganho e o último
recorde, em número grande, contando ao abrir; o recorde parte do valor anterior pra o salto
ficar à vista. Entre famílias, "mais difícil" é a data provável de chegar a 3 treinos por
semana (10 treinos < 1 mês < 2 meses < 3 meses < 50 < 100); empate fica com a consistência.
Recorde não é gravado — `getLatestRecord` refaz o histórico na regra do `computePR`.
