# Documentação — Calistenia Tracker

Índice dos documentos do projeto. O [`README.md`](../README.md) da raiz é a visão geral
(problema, solução, arquitetura, como rodar); aqui fica o histórico de produto e as decisões.

**Dois tipos de documento, e a diferença importa:**

- **Vivo** — descreve o estado atual. Se divergir do código, o documento está errado e deve ser corrigido.
- **Registro** — congela o que era verdade numa data. Cita arquivos que podem já não existir
  (ex.: `upcoming.ts`, `WeekStrip.tsx`, renomeados na v1.8+). Isso é esperado: **não atualize**,
  ou o log deixa de ser log.

---

## Por onde começar

| Quero… | Leia |
|---|---|
| Entender o produto e por que ele existe | [`PRD-calistenia-tracker-v1.md`](PRD-calistenia-tracker-v1.md) |
| Saber o que está feito e o que falta | [`ACOMPANHAMENTO.md`](ACOMPANHAMENTO.md) |
| Saber o que ainda pode entrar | [`IDEAS.md`](IDEAS.md) |
| Entender por que uma feature é assim | o `PLAN-*.md` da feature (abaixo) |

---

## Documentos

### Vivos

| Documento | O que é |
|---|---|
| [`ACOMPANHAMENTO.md`](ACOMPANHAMENTO.md) | Diário de execução, da v1 à atual. Status geral por etapa no topo, entradas datadas abaixo (mais recente primeiro). **Etapa 7 — validação com 1 semana de uso real — é a única aberta.** As entradas antigas são registro: não reescrever. |
| [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) | Tokens, utilitários (`btn-*`, `card`, `field`, `toggle`…) e componentes de UI, com as regras de uso e as decisões. |
| [`IDEAS.md`](IDEAS.md) | Backlog e decisões em aberto. **Só ideias — nada aqui está aprovado pra implementar.** Pendências hoje: lembrete por push (arquitetura desenhada, implementação adiada), referência técnica visual, e o checkpoint do mapa de skills. Inclui os guard-rails do produto — o que *não* copiar. |

### Registros — planos de execução

| Documento | O que é |
|---|---|
| [`PLANO_IMPLEMENTACAO.md`](PLANO_IMPLEMENTACAO.md) | Plano da v1: stack decidida e as 7 etapas com critérios de aceite. Base do `ACOMPANHAMENTO.md`. |
| [`PLANO_IMPLEMENTACAO_V2.md`](PLANO_IMPLEMENTACAO_V2.md) | Plano V2 (correções, hábito, skill map), derivado do `IDEAS.md`. A tabela de status está congelada em **2026-07-20 (v1.4)** — tudo depois disso está no `ACOMPANHAMENTO.md`. |

### Registros — decisões por feature

Um por feature grande. Registram **o porquê** das decisões, não o passo a passo.
Implementados, salvo onde a coluna disser outra coisa.

| Documento | Entregue em | Decisão central |
|---|---|---|
| [`PLAN-sync-e-auth.md`](PLAN-sync-e-auth.md) | **proposto** (alvo v2.0) | Auth anônimo na Supabase + sync local-first das 3 tabelas. Métrica deixa de ser feature e vira query: o dado sobe por razão de produto (durabilidade, 2º aparelho, gatilho de push real). Descarta telemetria anônima. **Revisa regras do CLAUDE.md** e revoga o guard-rail de sync. |
| [`PLAN-serie-a-serie.md`](PLAN-serie-a-serie.md) | **implementado** | Cada série registrada na hora, e registrar já abre o descanso. A série parcial mora na sessão (`partial_sets`) e o log só nasce quando o exercício fecha, então nenhuma query lê meio exercício. Descarta log parcial no próprio `ExerciseLog`. |
| [`PLAN-navegacao-ajustes-feedback.md`](PLAN-navegacao-ajustes-feedback.md) | **implementado** (canal de feedback pendente) | Histórico sai da nav e vira atalho em Evolução; a aba livre vira **Treino** (plano à vista + progressão + mudar o treino), depois de Skills não se sustentar como aba. Ajustes fica só com pessoa, dados e app, sem o lembrete que não disparava. Feedback por link com contexto visível, sem backend. |
| [`PLAN-progressao-e-troca-de-treino.md`](PLAN-progressao-e-troca-de-treino.md) | **implementado** | Mapa de progressão com uma só máquina de estados, aviso de troca por conjunto de degraus prontos, preview (diff) antes de aplicar plano e conversor do treino que a pessoa já tem. Tem seção com o que mudou em relação ao proposto. |
| [`PLAN-onboarding-e-planos-semente.md`](PLAN-onboarding-e-planos-semente.md) | **implementado** (sementes em rascunho) | Onboarding de 4 perguntas leigas de capacidade (escada de skills invisível) que semeia o mapa de skills e roteia pra um de 3 planos-semente. Destrava o uso por terceiros, inclusive iniciantes. Tem uma seção com o que mudou em relação ao proposto. |
| [`PLAN-config-ajustes.md`](PLAN-config-ajustes.md) | **implementado** (em refinamento) | Menu Config vira "Ajustes": lista agrupada estilo iOS, subtelas pra plano e exercícios, feedback local por linha e vocabulário de calistenia/app. Tem a alternativa descartada (manter cards colapsáveis). |
| [`PLAN-treinos-por-letra.md`](PLAN-treinos-por-letra.md) | v1.8+ (`7776ac4`) | Treinos deixam de ser dias da semana e passam a ser letras (A, B, C…) numa sequência cíclica. Separa identidade, ordem e data. Inclui a migração do histórico (Dexie v5). |
| [`PLAN-treino-dinamico.md`](PLAN-treino-dinamico.md) | v1.8 | Série extra, exercício adicionado no meio do treino e snapshot do exercício em cada log — mudar o plano deixa de reescrever o passado. |
| [`PLAN-treino-avulso.md`](PLAN-treino-avulso.md) | v1.6 | Registrar treino fora do programa como `Session` sem `plan_day_id`, reaproveitando o pipeline de streak. |

### Referência

| Arquivo | O que é |
|---|---|
| [`referencia/treino-calistenia-jul-2026.html`](referencia/treino-calistenia-jul-2026.html) | O plano de treino original, em HTML estático — o artefato que **antecede** o app. Origem do `lib/plan/plan.json` e da paleta dark do projeto. Mantido como referência histórica; não é usado em runtime. |

---

## Convenções

- **Um `PLAN-*.md` por feature grande**, escrito antes de implementar e fechado com o status
  (`implementado`, versão, commit) depois. O que ele registra é a decisão e a alternativa
  descartada — passo a passo detalhado envelhece rápido e não compensa manter.
- **O `ACOMPANHAMENTO.md` é o único lugar com a linha do tempo.** Feature nova: entrada nova
  no topo, com versão e contagem de testes.
- **Item entregue sai do `IDEAS.md`** e vira entrada no `ACOMPANHAMENTO.md`. Decisão resolvida
  sai de "em aberto" e vai pra "Decididas", com link pro plano que a resolveu.
