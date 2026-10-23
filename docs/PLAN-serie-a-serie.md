# Plano — Registro série a série

> Status: **implementado** (2026-10-23, 515 testes). Saiu de um protótipo comparando os dois
> modos de card lado a lado, junto com o card novo (stepper grande, quadradinhos das séries),
> o cronômetro de líquido e a tela de recorde brutalista.

---

## Problema

O card registrava o exercício inteiro de uma vez: "Fiz como previsto" ou "Ajustar" com uma
lista de steppers. Quem usa o cronômetro entre as séries já tocava na tela depois de cada
série, só que pra abrir o descanso, e o registro ficava pro fim, de memória.

## Decisão

**Cada série é registrada na hora, e registrar já abre o descanso.** O número de toques é o
mesmo de quem usava o cronômetro entre séries; o que muda é que o toque grava.

- O card mostra os quadradinhos das séries com o alvo e um stepper grande pra série atual.
  "Registrar série N" marca o quadradinho e abre o descanso. Tocar numa série feita corrige.
- Atalhos: "registrar todas como previsto" (o antigo "Fiz como previsto", grava `as_target`)
  e "terminar com N séries" (largou no meio).
- Recorde é detectado na própria série, com a tela cheia na hora. Ao fechar o exercício o
  `computePR` roda de novo, mas não repete a tela se o valor já foi festejado.
- Tentativas (kick-up etc.) seguem no contador: não têm série.

### Onde mora a série parcial

`Session.partial_sets` (`exercise_id → valores`), campo opcional sem índice, então **sem
migração do Dexie** (regra 7). O `ExerciseLog` só nasce quando o exercício fecha, pelo mesmo
`upsertLog` de sempre, com o mesmo formato (`recordFromSets`: tudo exatamente no piso do
alvo vira `as_target`, o resto grava as séries reais).

Assim progressão, recorde, volume, histórico e exportação pra IA continuam lendo só
exercício fechado, sem saber que série parcial existe. A retomada (regra 1) lê a parcial da
sessão e volta na série certa.

Pontas:
- **Desfazer** o fechamento devolve as séries de antes pra parcial.
- **Finalizar o treino** com exercício pela metade grava o que foi feito como registro
  (igual a "terminar com N séries"), sem as flags, que só existem na tela do card.
- **Pular** descarta a parcial (o desfazer devolve).
- Backup exporta e importa o campo.

## Alternativa descartada

**Log parcial no próprio `ExerciseLog`** (gravar o log na 1ª série com uma marca de "em
andamento"). Toda query que conta log como "feito" (progressão, recorde, volume, o índice
do exercício ativo, a contagem da sessão) teria que aprender a ignorar o log incompleto, e
qualquer uma que esquecesse leria meio exercício como exercício inteiro. Guardar a parcial
fora do log mantém essa leitura impossível por construção.

Também ficou de fora manter os dois modos com escolha em Ajustes: dobra o card pra manter, e
a dúvida (mais toques?) se resolve com o uso real do cronômetro entre séries.
