# Backlog & Ideias — Treinei

> **ONLY IDEAS — DO NOT IMPLEMENT YET.** Registro para priorização.
> Os itens **já entregues** (v1.1–v1.4) foram removidos daqui — o registro do que foi
> implementado vive em [ACOMPANHAMENTO.md](ACOMPANHAMENTO.md) e
> [PLANO_IMPLEMENTACAO_V2.md](PLANO_IMPLEMENTACAO_V2.md). Aqui fica só o que está
> **pendente ou em aberto**.

---

## Ideias
- quero poder sair do timer ao clicar fora do timer. ele deve ficar visivel na parte superior ou inferior do app. ao clicar nele, ele volta a ser tela cheia. isso é para possibilitar o usuário a navegar no app enquanto espera o descanso
- o feedback de novo recorde aparece muito rapido, mal da tempo de ver. repensar como mostrar isso pro usuario. sugestão: deixar mais tempo na tela e fixar um trofeuzinho no card de exercício.
- adicione um icone de foguinho no card de constancia na home, como era no passado. aumente o tamanho do numero de vezes que treinei. ex.: 3/5 (o 3 deve ser um pouco maior que o 5). reveja o subtitulo do card tambem, nao faz muito sentido (comece sua sequencia)
- 
- rever se o app está realmente funcionando offline. tive alguns problemas quando fiquei sem sinal de internet, nao me parece que está funcionando bem.
- repensar as flags, nao estou achando um bom feedback, nao retrata com precisao o que rolou no treino

---

## 🎯 Pendências

| # | Item | Fase | Valor | Esforço | Status |
|---|------|------|-------|---------|--------|
| 5.1 | Notificação/lembrete de treino (push, tom leve) | 4 · Retenção | Médio-Alto | Médio | ◑ parcial — UI/copy/permissão prontos; falta entrega em background |
| 7.3 | Referência técnica visual (cues estruturados, sem vídeo) | 5 · Polish | Médio | Baixo/Médio | ⏳ conteúdo/curadoria |
| — | Checkpoint do spike: validar "o mapa é viciante" com uso real | 7 · Validação | — | — | ⏳ depende de uso na semana |

---

## 💡 Detalhe dos pendentes

### [5.1] Notificação/lembrete de treino
Lembrete configurado pelo usuário da hora do treino: push com tom leve (sem ser forçado),
variações ao longo da semana.
- **Feito:** seção em Config (`ReminderSettings`), copy determinística por dia (`reminderCopy.ts`),
  pedido de permissão, preferências em `profile.ts`.
- **Falta (R4):** entrega em background **confiável** — push em iOS PWA é o ponto de risco.
  Validar permissão/entrega por plataforma cedo e degradar para sem-push sem quebrar.

### [7.3] Referência técnica visual (cues estruturados)
Sem vídeo (protege o offline-first). Estruturar `obs`/`tip` como cues; no máximo uma
imagem/GIF leve por movimento-chave. Custo real = conteúdo/curadoria, não código.

### Checkpoint do spike do mapa de skills
O mapa de skills foi entregue na v1.4 (catálogo canônico de 15 skills). Falta a validação
que justificava o spike: confirmar, com uso real, que acompanhar o mapa **retém/vicia**.
Se confirmar, vale investir em cues (7.3) e em ligar mais níveis a exercícios do plano
(`LEVEL_EXERCISE`) para melhorar a detecção automática de posição.

---

## ❓ Decisões de produto em aberto
- **[Q2] Faz sentido os treinos terem dias fixos?** — decisão de modelo; impacta a meta
  semanal e a aderência por dia.
- **Qualidade de execução vs. RPE/notas** — *ADIADO*: decidido não mexer em RPE/notas por
  ora, nem agrupar "como foi" + notas. O badge de "técnica" fica bloqueado até existir
  captura de qualidade de execução. Sequência de gamificação planejada: streak → força
  (por recorde pessoal) → técnica.

---

## 🛡️ Guard-rails — o que NÃO copiar (proteger a tese)
- **Geração de treino / IA adaptativa** (Freeletics/Fitbod) — quebra o "consumo um plano fixo".
- **Social/feed/comunidade** (Madbarz/Hevy) — é app pessoal. É a alavanca nº1 de retenção
  comprovada (competição/accountability), mas hoje **fora de escopo** por decisão de produto;
  reabrir só se/quando a fase social entrar.
- **Biblioteca gigante de exercícios** — o diferencial é profundidade no plano, não amplitude.
- **Multi-usuário/login/sync na nuvem** — export/import JSON já resolve durabilidade sem trair
  o offline-first.

**Fio condutor:** execução limpa (as flags) é o guard-rail que premia *melhor*, não *mais* —
território que Hevy/Strava não alcançam.
