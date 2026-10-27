# Campanha: o treino como missão

> 2026-10-27 · pós-v1.8 · aprovado em protótipo clicável (artifact `6UUwf7V8AC6a2Eo34Duq8B`)

## O que é

Uma camada de apresentação que liga cada treino ao objetivo da pessoa, com cara de jogo de
campanha: tela de carregamento ao começar, os objetivos andando no fim e uma cena quando um
nível fecha.

- **Campanha = objetivo**: as skills de Treino → Meus objetivos (`calistenia:ai-goals`), que
  até aqui só alimentavam o prompt da IA.
- **Fase = nível** da escada em `progressions.json`, o que o plano treina via
  `exerciseSkillMapping`.
- **Andamento** = sessões seguidas no critério (`positiveStreak` dos votos), as mesmas que o
  aviso de progressão usa.

## Decisões

**Nenhum dado novo.** Sem tabela, campo, migração, ponto, XP ou estrela. Tudo sai de
`skillLogsFrom` + `skillVotes` (`lib/db/queries/campaign.ts`), então campanha, aviso de
progressão e mapa nunca discordam. A lógica pura (ordem, resultado da sessão, textos) está em
`lib/domain/campaign.ts`.

**Tela de carregamento só ao começar pelo botão.** Retomada e deep-link (`?ex=`) vão direto: a
retomada instantânea é a regra 1. Um toque em qualquer lugar fecha; a sessão já está criada
por baixo.

**Mais de um objetivo no treino:** o mais perto de fechar ganha a escada; os outros vão
compactos em "Também avança hoje". Objetivo que o treino não toca **não aparece** em lugar
nenhum.

**A cena de nível concluído espera "Continuar".** Na v1 do protótipo ela abria sozinha ~1s
depois da barra encher e confundia. Dois níveis no mesmo treino: uma cena por vez. "Ajustar
plano agora" leva ao fluxo da IA (`/config/plano?modo=novo`), o mesmo do aviso de troca.

**O bloco de objetivos substitui o "subir de nível"** daquela skill no fim do treino
(`ProgressionNudge` recebe `excludeSkills`): os dois diziam a mesma coisa.

**Nomes no tom normal: objetivo e nível**, os que o app já usa. O vocabulário de jogo
(missão, campanha, fase) ficou no protótipo, sem decisão de onde entra.

**`fl-single-leg-hold` virou o nível 3 do front lever** em `LEVEL_EXERCISE`. Sem ele o
objetivo de front lever do plano pessoal nunca andaria. Logs antigos desse exercício não têm
`skill_id`, então a sequência começa do zero.

## Descartado

- **Estrelas por sessão** (terminou / bateu o plano / limpo): número novo, e quem esquece de
  marcar flag ganharia três de graça.
- **XP ou nível de atleta**: contradiz a decisão dos selos (cada um mapeia um fato) e premia
  *mais*, não *melhor*.
- **Cartão da missão dentro do treino** em vez da tela cheia: ficou como opção no protótipo;
  ele preferiu a tela de carregamento.
