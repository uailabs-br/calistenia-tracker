# Plano — Navegação, Ajustes e Feedback

> Status: **implementado** (2026-10-23, 505 testes), com a aba **Treino** no lugar de Skills. Ver "O que mudou em relação ao
> proposto" no fim. Cobre quatro itens do backlog:
> refazer Ajustes, Histórico dentro de Evolução, o que ocupa a aba que sobra, e um canal
> de feedback.

---

## Diagnóstico

**Nav hoje:** Início · Histórico · Evolução · Ajustes.
- O Histórico é só leitura (`/historico/[id]` não edita nem apaga nada). A pessoa abre pra
  conferir, não pra fazer algo, e isso não justifica uma aba.
- `/progressao` e `/skills` não acendem aba nenhuma: o `active` do `BottomNav` compara só o
  prefixo do próprio href. Hoje é bug; depois da mudança vai ser mais comum.
- Progressão é a tela com mais ação (o que subir, o que regredir, pedir o próximo ciclo) e
  fica a dois toques, escondida em Evolução atrás de uma linha.

**Ajustes hoje:** cerca de 14 linhas em 5 grupos, misturando coisas de frequência e peso
bem diferentes.
- "Perfil" junta nome e meta com "Nível e equipamento", que na prática é configuração do treino.
- "Montar treino com IA", a ação mais importante da tela, aparece como só mais uma linha.
- **Lembrete:** tem toggle e horário, mas não dispara nada (ver 5.1 no IDEAS). É a parte
  mais confusa da tela, porque promete uma coisa que não acontece.
- "Instalar o app" está dentro de "Dados".
- Não aparece qual é o plano em vigor: ele só está no rodapé, em letra miúda.
- O arquivo tem 402 linhas, com a lógica de backup e de instalação dentro da página.

---

## 1. Nav: Histórico vira parte de Evolução

**Decisão:** sai a aba. Evolução ganha, no topo, um bloco de atalhos: **Histórico** (com
"N treinos · último em dd/mm"), e Progressão logo abaixo.
- As URLs ficam iguais (`/historico`, `/historico/[id]`): links antigos e o voltar continuam
  funcionando. Só o `BackLink` passa a mostrar Evolução.
- `BottomNav` passa a ter `match: string[]` por item (Evolução = `/metricas`, `/historico`;
  a nova aba = suas rotas). Assim o bug do active some junto.
- Teste: a função de match vai pra `lib/utils/routes.ts` (pura) e ganha teste.

**Descartado:** levar o Histórico pra dentro da página de Evolução, como uma aba interna ou
uma lista no fim. Ia deixar mais longa uma página que já tem 6 seções, e o histórico em
lista agrupada por semana funciona melhor numa tela própria.

## 2. O que ocupa a aba

**Recomendação: aba "Skills"**, só com o mapa de progressões (`/skills`).
- "Progressão" e "Evolução" são quase sinônimos: com duas abas assim, a pessoa teria que
  adivinhar qual é qual. Uma aba que precisa de explicação já falhou.
- `/progressao` continua dentro de Evolução, como primeiro atalho, ao lado do Histórico.
  Ela olha o que você já fez pra decidir o próximo passo, e isso combina com Evolução. A
  parte que pede ação já chega por outro caminho: o aviso no fim da sessão e o
  `PlanSwapCard` na home.
- Skills é um nome concreto e não se confunde com nenhuma outra aba. Também serve de teste
  pro checkpoint do IDEAS ("o mapa é viciante"): com aba própria, dá pra saber se a pessoa
  volta ao mapa sem precisar de empurrão.
- Abas: **Início** (hoje) · **Skills** (onde estou nas habilidades) · **Evolução**
  (números, progressão do treino, histórico) · **Ajustes**.

**Alternativas avaliadas:**
- *Aba "Progressão" juntando `/progressao` e `/skills`:* descartada pelo nome, que colide
  com Evolução. Pôr os exercícios de suporte embaixo de "Skills" também não funciona,
  porque remada australiana não é skill.
- *Aba "Treino/Plano"* (A, B, C… inteiro): o `UpNext` da home já mostra a fila. O plano
  completo é consulta rara, ou seja, cairia no mesmo problema do Histórico.
- *Ficar com 3 abas:* funciona e é o mais simples. Vale como fallback se a aba Skills
  não pegar no uso real.

## 3. Ajustes por intenção

Nova ordem, do mais usado/importante pro mais raro:

1. **Card do treino atual** no topo: nome do plano, versão e nº de treinos (depois do mount,
   regra 10), com o botão principal "Montar novo treino com IA". "Voltar ao treino original"
   vira link secundário dentro do card, e só aparece com override.
2. **Seu treino:** Meus objetivos · Nível e equipamento · Meus exercícios.
3. **Você:** Nome · Meta semanal.
4. **Seus dados:** Fazer backup (com o aviso de pendência) · Restaurar.
5. **App:** Instalar (some quando já está instalado) · **Mandar feedback** · Sobre o app ·
   versão.
6. **Apagar todos os dados**, sozinho no fim, como já está.

- **Lembrete sai da tela** até o 5.1 entregar push de verdade. O código fica (o
  `ReminderSettings` só deixa de ser montado), as preferências ficam no localStorage e
  ninguém perde nada.
- **Tech:** extrair `useBackup()` (export/import/pendência) e `useInstallState()` pra
  `lib/utils/`, e os grupos pra `components/config/*`. A página vira composição. Nenhuma
  mudança de dado nem de Dexie.

**Descartado:** sub-páginas por grupo (Ajustes › Dados › …). São 12 linhas: profundidade a
mais só esconde as coisas. Agrupar e ordenar resolve.

## 4. Feedback

**Pendente:** qual canal. Não tem backend, então o botão abre um destino externo.
`CONTACT_URL` em `lib/appInfo.ts` está `null` aguardando justamente isso.

| Canal | Prós | Contras |
|---|---|---|
| **WhatsApp (`wa.me`) — recomendado** | conversa direta, combina com o tom do app e do público BR | expõe o número |
| E-mail (`mailto:`) | zero infra, o app de mail guarda pra enviar depois se estiver offline | atrito maior, pouca gente usa |
| Formulário (Tally/Google Forms) | estruturado, anônimo | precisa de internet, é mais frio |

- **Contexto pré-preenchido** na mensagem: versão do app, id do plano, nº de treinos e
  aparelho (iOS/Android, instalado ou não). A pessoa vê e edita antes de enviar, nada sai
  sozinho. O montador é uma função pura `buildFeedbackLink()` em `lib/utils/feedback.ts`, com
  teste.
- **Ajustes:** linha fixa no grupo "App".
- **Home:** não pode virar card fixo, porque a home é a tela do treino. Vira um card
  discreto e dispensável que aparece **depois do 5º treino concluído**, nunca durante uma
  sessão e nunca no mesmo dia da revisão semanal. Dispensado, volta só depois de +20 treinos.
  O controle fica no localStorage (é preferência de UI, não estado de sessão).
- Ao definir `CONTACT_URL`, o link em `/sobre` e na política de privacidade aparece sozinho.
  O texto da política precisa mencionar o contexto que vai junto.
- A copy (card da home, linha, mensagem pré-preenchida) vai num `.md` pra revisão antes
  de implementar.

---

## Ordem de entrega

1. **Decisões + copy** (canal de feedback, aba Skills sim/não, texto do card) num `.md`.
2. **Nav** (match de rotas + teste, aba Skills, atalhos Progressão + Histórico em Evolução).
   É pequeno e independente.
3. **Ajustes** (reordenar, extrair os hooks, tirar o lembrete). Já deixa o espaço do feedback.
4. **Feedback** (`buildFeedbackLink` + teste, linha em Ajustes, card na home, política).
5. Docs: entrada no `ACOMPANHAMENTO.md`, os itens saem do `IDEAS.md`, nota no 5.1 dizendo
   que a UI do lembrete foi escondida.

Gates de cada passo: `npm test`, `npx tsc --noEmit`. Sem migração de Dexie em nenhum deles.
Validar no celular: o active da nav, o voltar do Android a partir do histórico, o card de
feedback não aparecer com sessão ativa.

---

## O que mudou em relação ao proposto

- **A aba Skills foi trocada por Treino no mesmo dia.** Usando, o autor achou Skills inútil
  como aba: o mapa é consulta rara. É também a primeira resposta ao checkpoint do IDEAS ("o
  mapa é viciante"): no uso do autor, não foi. A aba **Treino** (`/plano`, porque `/treino/[id]`
  é a sessão) abre no plano em vigor — os treinos em sequência, cada um abrindo os exercícios
  com o alvo, o próximo marcado — e embaixo traz Progressão (exercícios e skills) e "Mudar o
  treino" (IA, objetivos, nível e equipamento, meus exercícios, voltar ao original). Com isso:
  - Ajustes ficou só com Você, Seus dados, App e apagar. O card de treino atual saiu.
  - Progressão saiu de Evolução, que ficou com números e o Histórico.
  - `activeTab` passou a escolher o prefixo mais longo: `/config/plano`, `/config/persona` e
    `/config/exercicios` acendem Treino, e o resto de `/config` acende Ajustes. As URLs não mudaram.
  - Voltar dessas telas, e sair do "refazer nível", leva pra Treino. O "Trazer meu plano" do
    onboarding abre direto o fluxo `?modo=meu`.
  - Descartado: aba Treino como lista de links. Montar treino é coisa de semanas em semanas, e
    uma aba só de links repetiria o problema do Histórico. O que segura a aba é o plano à vista.

- **"Sobre o app" não entrou em Ajustes.** `/sobre` é a landing, e o botão dela ("Começar")
  leva ao onboarding. Mandar pra lá quem já usa o app é convite a refazer o onboarding.
- **O card de feedback não olha a revisão semanal.** O `WeekReviewCard` decide sozinho se
  aparece, e coordenar os dois pedia levantar estado. O card ficou no pé da home, abaixo da
  fila, então não disputa com a revisão nem com o treino.
- **O backup não foi pra `lib/utils/`.** A exportação usa o toast, que é componente, então
  virou `components/config/useBackupExport.ts`, compartilhado pela linha de backup e pelo
  "Fazer backup antes" do apagar tudo. `useInstallState` foi pra `lib/utils/` como previsto.
- **A parte pura do feedback** (`buildFeedbackLink`, `shouldPromptFeedback`) foi pra
  `lib/domain/feedback.ts`. Em `lib/utils/feedback.ts` ficou o que lê o aparelho e o
  localStorage, no mesmo desenho do aviso de troca de treino.
- **A página de Ajustes parou de consultar o Dexie direto.** A contagem de treinos virou
  `countCompletedSessions()` em `lib/db/queries/metrics.ts` (regra 2).
- **O `getOverview` ganhou `lastWorkoutDate`**, usado no atalho do Histórico.
- **O canal ainda não existe.** Com `CONTACT_URL` em `null`, a linha de Ajustes e o card da
  home não aparecem. O item de feedback na política de privacidade também só aparece quando
  o canal existir.

## Textos novos

Pra editar à vontade. Cada um está no arquivo indicado.

| Onde | Texto | Arquivo |
|---|---|---|
| Skills, abaixo do título | Onde você está em cada skill. Toque numa pra ver a sequência de progressões. | `app/skills/page.tsx` |
| Treino, rodapé da lista | N treinos em sequência. Depois do último, volta pro primeiro. | `app/plano/page.tsx` |
| Treino, grupo Progressão | Exercícios · Quem já pode subir e quem pede cuidado / Skills · Onde você está em cada sequência de progressões | `app/plano/page.tsx` |
| Treino, grupo Mudar o treino | Montar treino com IA · Criar um novo ou trazer o que você já faz | `app/plano/page.tsx` |
| Treino, card aberto | Começar este treino | `components/plan/WorkoutCard.tsx` |
| Evolução, atalho | Histórico · N treinos · último em dd/mm | `app/metricas/page.tsx` |
| Ajustes, linha | Mandar feedback · Sugestão, problema ou ideia. A mensagem já vai com a versão do app, e você vê tudo antes de enviar. | `components/config/AppSettings.tsx` |
| Home, card | Algo te atrapalhou ou faltou no app? · Me manda uma mensagem. Eu leio tudo e é daí que sai o que muda no app. · Mandar mensagem · Agora não | `components/home/FeedbackCard.tsx` |
| Mensagem pré-preenchida | Oi! Sobre o app: (linhas em branco) — v1.8 · treino {id} · N treinos · Android, instalado | `lib/domain/feedback.ts` |
| Política de privacidade | Quando você manda feedback: A mensagem já vem com a versão do app, o treino em uso, quantos treinos você registrou e o tipo de aparelho. Ela só sai quando você envia, e dá pra apagar qualquer parte antes. | `components/landing/PrivacyPolicy.tsx` |
