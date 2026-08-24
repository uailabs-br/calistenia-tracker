# Backlog & Ideias — Treinei

> **ONLY IDEAS — DO NOT IMPLEMENT YET.** Registro para priorização.
> Os itens **já entregues** (v1.1–v1.4) foram removidos daqui — o registro do que foi
> implementado vive em [ACOMPANHAMENTO.md](ACOMPANHAMENTO.md) e
> [PLANO_IMPLEMENTACAO_V2.md](PLANO_IMPLEMENTACAO_V2.md). Aqui fica só o que está
> **pendente ou em aberto**.

---

## Ideias
- pensar um forma de incluir fase de deload no treino e como registrar de forma a nao impactar negativamente a analise das metricas: A cada 6 semanas de treino normal, a sétima é de deload: reduz 40% das séries no trabalho de suporte, mantém a frequência semanal e mantém o skill work intacto. O gatilho pode antecipar a semana de deload se houver queda de performance consistente por 2-3 sessões seguidas no mesmo exercício, sem causa óbvia externa. O objetivo é dissipar fadiga acumulada de tecido conjuntivo e do sistema nervoso sem perder frequência de prática nas habilidades

---

## 🎯 Pendências

| # | Item | Fase | Valor | Esforço | Status |
|---|------|------|-------|---------|--------|
| 5.1 | Notificação/lembrete de treino (push, tom leve) | 4 · Retenção | Médio-Alto | Médio | ◑ parcial — UI/copy/permissão prontos; **arquitetura de entrega real desenhada** (ver detalhe abaixo), implementação adiada por decisão do usuário |
| 7.3 | Referência técnica visual (cues estruturados, sem vídeo) | 5 · Polish | Médio | Baixo/Médio | ⏳ conteúdo/curadoria |
| — | Checkpoint do spike: validar "o mapa é viciante" com uso real | 7 · Validação | — | — | ⏳ depende de uso na semana |

---

## 💡 Detalhe dos pendentes

### [5.1] Notificação/lembrete de treino
Lembrete configurado pelo usuário da hora do treino: push com tom leve (sem ser forçado),
variações ao longo da semana.
- **Feito:** seção em Config (`ReminderSettings`), copy determinística por dia (`reminderCopy.ts`),
  pedido de permissão, preferências em `profile.ts`. Confirmado em uso real (2026-07-24) que
  **nada disso entrega notificação de verdade** — não é config de navegador, a feature nunca
  teve mecanismo de disparo (sem listener `push` no SW, sem servidor, sem agendamento).
- **Arquitetura desenhada (2026-07-24), implementação adiada:** Web Push real com VAPID —
  primeiro componente de servidor do projeto (exceção deliberada e escopada ao guard-rail
  "100% cliente"; continua sem login/conta, cada subscription é identificada só pelo
  `endpoint` da própria Push API). Persistência em Upstash Redis (Vercel Marketplace, free
  tier). Como o plano no Vercel é Hobby (Cron nativo só roda 1x/dia), o gatilho periódico
  seria um **GitHub Actions agendado** (grátis, a cada ~10min) chamando um endpoint protegido
  por secret. Reusaria `getDayByWeekday` (sem push em dia de folga) e `reminderCopy.ts`
  (mensagem) sem alterar nenhum dos dois. Riscos aceitos no desenho: push no iOS só funciona
  em PWA instalada (16.4+), GitHub Actions cron é best-effort e desliga sozinho em repositório
  com 60+ dias sem atividade.
- **Falta (R4):** retomar a implementação (rotas de API, service worker, client de subscribe,
  setup manual de VAPID/Upstash/secrets) quando decidido priorizar.

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
