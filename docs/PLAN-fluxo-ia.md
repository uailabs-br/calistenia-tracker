# PLAN — Fluxo de treino com IA, um passo por tela

Status: **implementado** (2026-10-23, 490 testes). Ainda sem teste com uma IA real nem em
celular.

## O que mudou em relação ao proposto

| Proposto | Implementado | Por quê |
|---|---|---|
| Passo guardado só no localStorage | Passo **na URL** (`?modo=novo&passo=colar`) + `pushState` por avanço | Revisão de UX: sem entrada no histórico, o voltar do Android sai do fluxo inteiro em vez de recuar um passo |
| — | Toda entrada preserva o estado do Next (`__NA`) e a da retomada é escrita fora do mount | Entrada sem `__NA` faz o roteador recarregar a página no voltar; com a retomada, isso prendia a pessoa no "colar" |
| Caixa "ou cole aqui…" com placeholder | Rótulo visível "Ou cole aqui"; colar **substitui** o conteúdo | Campo só com placeholder some ao digitar. Substituir evita a resposta corrigida grudar na anterior |
| Atalhos com logo das IAs | Só o nome + ícone de link externo | Logo de marca errado é pior que nenhum |
| Aplicar volta pra Ajustes | Aplicar vai pra **home** | Quem entra pelo aviso da home quer ver o treino novo lá |
| "Meus objetivos" sai de Ajustes? | **Fica nos dois lugares** (decisão do autor) | Mesmo componente (`GoalPicker`), mesma chave no localStorage |

Onde está: `app/config/plano/page.tsx` (estado e histórico), `components/plan/AiFlowSteps.tsx`
(telas), `components/plan/GoalPicker.tsx`, `lib/utils/aiFlow.ts` (retomada, 24h),
`lib/plan/aiFixPrompt.ts` (pedido de correção), `reason` em `parsePlanInput`.

---

O texto abaixo é a proposta como foi escrita.

## O problema

Tudo acontece numa página só ([app/config/plano/page.tsx](../app/config/plano/page.tsx)),
e ela mostra os cinco caminhos de uma vez:

| # | O que está na tela | O que atrapalha |
|---|---|---|
| 1 | Parágrafo de abertura explicando o mecanismo inteiro | A pessoa lê como funciona antes de saber o que vai fazer |
| 2 | "1 · Pedir à IA" com objetivos + copiar | "Meus objetivos" leva pra outra página; não fica claro se é obrigatório |
| 3 | "Ou: já tenho um treino" com textarea + copiar | Fica **entre** o passo 1 e o 2, então a numeração quebra. Parece um passo 1,5 |
| 4 | "2 · Aplicar a resposta" com textarea | Aparece antes de existir resposta. Primeiro contato: "por que tem uma caixa aqui?" |
| 5 | Treinos prontos + "Voltar ao original" | Terceiro e quarto caminho no fim da mesma rolagem |

Problemas que não são de layout:

- **Os botões principais parecem linha de configuração.** "Copiar pedido" e "Aplicar" são
  `SettingsRow`, com o mesmo peso de "Meus objetivos". Nada diz qual é a ação da tela.
- **Depois de copiar, o app não diz o que fazer.** Sai um toast e só. Falta "agora abre a IA"
  e um jeito de chegar lá.
- **Voltar da IA perde o lugar.** A pessoa sai do app pra colar no ChatGPT e volta. No iOS
  o PWA costuma ser recarregado nessa troca: o texto do "já tenho um treino" some
  (`useState`) e ela cai no topo da página, sem saber que agora é o passo 2.
- **Colar um JSON enorme no celular é chato.** Segurar, esperar o menu, colar, rolar até o
  botão "Aplicar".
- **O erro fala com programador.** A validação mostra `workouts.0.blocks.1.exercises.2.target:
  Required`. A pessoa não tem o que fazer com isso, e a solução real é pedir pra IA corrigir.
- **O preview tem jargão.** "v3", "movimentos inéditos", "os movimentos com o mesmo id
  seguem de onde pararam".
- **Toda entrada cai na mesma tela.** O aviso da home ("Pedir o próximo treino à IA") já
  sabe a intenção, mas a pessoa ainda tem que achar o caminho certo no meio dos outros.

## A proposta

Trocar a página por um fluxo em passos: **uma pergunta por tela, um botão principal por
tela**. Os caminhos passam a ser escolhidos no início, e o "colar resposta → preview" é
compartilhado.

```
                ┌─ Criar novo ──→ Objetivos ─┐
Escolha ────────┤                            ├→ Copiar e abrir IA → Colar resposta → Preview
                ├─ Trazer o meu → Escrever ──┘
                └─ Pronto ──────────────────────────────────────────────────────────→ Preview
```

### Tela 0 — Escolha

Três cartões grandes, sem parágrafo de abertura. "Voltar ao treino original" sai daqui e
vai pra Ajustes, que é onde a pessoa procura quando quer desfazer.

```
┌──────────────────────────────────┐
│ ← Treino com IA                  │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ✦  Criar um treino novo      │ │
│ │    A IA monta a partir do    │ │
│ │    que você já treinou       │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ ✎  Trazer o treino que faço  │ │
│ │    Você escreve, a IA só     │ │
│ │    passa pro formato do app  │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │
│ │ ☰  Escolher um pronto        │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### Passo 1 — Objetivos (só no "Criar novo")

Os chips de [app/config/persona/page.tsx](../app/config/persona/page.tsx) vêm pra dentro do
fluxo (vira um componente, e a página de Ajustes reusa o mesmo). "Algo mais?" fica fechado.
O botão diz que dá pra seguir sem marcar nada.

```
┌──────────────────────────────────┐
│ ← Passo 1 de 3          ● ○ ○    │
│                                  │
│ O que você quer treinar agora?   │
│                                  │
│ PUXAR                            │
│ (Muscle-up) (Front lever) …      │
│ EMPURRAR                         │
│ (Parada de mão) (Paralela) …     │
│                                  │
│ + Lesão, equipamento, outra coisa│
│                                  │
│ [         Continuar          ]   │
│      (ou "Pular" se vazio)       │
└──────────────────────────────────┘
```

No "Trazer o meu", o passo 1 é a caixa de texto do treino, com o mesmo botão embaixo.

### Passo 2 — Copiar e abrir a IA

Um botão grande. Depois do toque ele vira "Copiado ✓" e aparecem os atalhos pra abrir a IA
(link comum, abre em outra aba ou no app instalado). O passo seguinte só aparece depois de
copiar, então a pessoa nunca vê uma caixa vazia sem motivo.

```
┌──────────────────────────────────┐
│ ← Passo 2 de 3          ● ● ○    │
│                                  │
│ Copie o pedido e cole na IA      │
│                                  │
│ [     ⧉  Copiar pedido       ]   │
│                                  │
│ ── depois de copiar ──────────── │
│ ✓ Copiado. Agora abra uma IA:    │
│ [ChatGPT] [Claude] [Gemini]      │
│                                  │
│ [   Já tenho a resposta  →   ]   │
└──────────────────────────────────┘
```

### Passo 3 — Colar a resposta

Botão "Colar" que lê a área de transferência (`navigator.clipboard.readText`). Se o navegador
não deixar, a caixa de texto continua lá. **Colou, validou**: sem botão "Aplicar"
intermediário, vai direto pro preview.

```
┌──────────────────────────────────┐
│ ← Passo 3 de 3          ● ● ●    │
│                                  │
│ Traga a resposta da IA           │
│                                  │
│ [      ⎘  Colar resposta     ]   │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ou cole aqui…                │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

Se der erro, uma frase só e uma saída:

```
│ A resposta veio incompleta.      │
│                                  │
│ [ Copiar pedido de correção ]    │  ← manda os erros pra IA consertar
│                                  │
│ ▸ detalhes técnicos              │  ← o texto de hoje, fechado
```

O "pedido de correção" é um prompt curto: "o app recusou o JSON por estes motivos: …
reenvie o plano completo corrigido". É mais fácil a IA consertar que a pessoa.

### Preview

O [PlanPreview](../components/plan/PlanPreview.tsx) já faz o trabalho certo. Só limpar:

- Cabeçalho: "3 treinos · 18 exercícios". Sai o "v3".
- Resumo em três contadores visuais (entram / saem / mudam) em vez da frase com pontos.
- "Continuam" fechado por padrão: o que interessa é o que muda.
- "Os movimentos com o mesmo id seguem de onde pararam" vira "Seu histórico continua.
  Exercício que já existia segue de onde parou."
- Os avisos amarelos ficam, mas só o primeiro aberto se houver vários.

## O que não é de tela

- **Lembrar onde parou.** Passo atual, caminho escolhido e o texto do "trazer o meu" ficam
  no `localStorage` (com try/catch, expira em 24h). Voltando da IA, o app abre direto no
  passo 3. É estado de UI, não de sessão de treino, então não fere a regra 1.
- **Entrada já sabe a intenção.** `/config/plano?modo=novo` pula a tela 0. O aviso da home
  e o link da Progressão usam isso. O cartão da home pra quem tem plano pronto continua
  caindo na escolha.
- **Ajustes.** "Montar treino com IA" continua; "Voltar ao treino original" vem pra cá
  (só quando há plano aplicado). "Meus objetivos" pode sair da lista, já que agora mora no
  fluxo. **Decisão sua.**

## Descartado

- **Abas no topo (Novo / Meu / Pronto) numa página só.** Menos código, mas mantém as
  caixas de texto todas na tela e não resolve o "voltar da IA".
- **Botão "Compartilhar com a IA" (Web Share API) em vez de copiar.** Só abre o app da IA
  se ele aceitar texto compartilhado, e o comportamento varia muito. Fica como extra
  depois, se o copiar ainda der atrito.
- **Pular o preview quando nada muda.** O preview é o único lugar em que a pessoa vê o que
  a IA fez; tirar ele de vez em quando confunde mais que ajuda.

## Perguntas abertas

1. Os atalhos pra ChatGPT / Claude / Gemini: quer os três, ou um só ("Abrir a IA")?
2. "Meus objetivos" sai de Ajustes ou fica nos dois lugares?
3. Você já rodou o "trazer o meu" numa conversa real? Se sim, onde travou?
