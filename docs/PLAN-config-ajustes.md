# PLAN — Config vira "Ajustes" (lista agrupada, subtelas e termos de calistenia)

Registro datado (2026-10-09). Decisão e alternativa descartada, não o passo a passo.

**Estado:** implementado; em refinamento a partir do teste manual do autor (ajustes de
copy e de espaçamento entram como correções, sem mudar a decisão abaixo).

## Problema

A tela tinha sete cards irmãos, quase todos colapsados: uma parede de linhas fechadas sem
hierarquia, em que toda tarefa custava dois toques (abrir + agir). "Criar treino com IA"
misturava quatro tarefas num card só; exportar e importar eram dois cards distantes pro
mesmo ciclo; o feedback de backup aparecia longe do botão; ações assíncronas não tinham
estado de "trabalhando"; e o vocabulário era de dev (prompt, JSON, onboarding, deletar).

## Decisão

- **Lista agrupada estilo iOS Settings** (`SettingsGroup` + `SettingsRow`): seção com
  rótulo, linhas com ícone líder, explicação longa no rodapé do grupo. Cinco blocos:
  Perfil · Treino · Lembrete · Dados · (apagar, isolado no fim).
- **Profundidade vira subtela**, no padrão que `/config/persona` já tinha:
  `/config/plano` (pedir à IA, aplicar resposta, treinos prontos, voltar ao original) e
  `/config/exercicios`. A tela-mãe fica só com o que muda raramente e vale pro app todo.
- **Feedback local**: sem o banner `msg` global; resultado em toast, erro de restaurar no
  rodapé do grupo Dados, spinner na própria linha que está trabalhando.
- **Apagar tudo oferece "Fazer backup antes"** dentro do próprio diálogo (em vez de só avisar).
- **Vocabulário**: Config → Ajustes (rota segue `/config`); prompt → "pedido pra IA";
  JSON → "resposta da IA"; onboarding → "perguntas iniciais"; exportar/importar histórico →
  "fazer/restaurar backup"; deletar → apagar; "plano padrão" → "treino original do app".
- Meta semanal virou stepper (1–14) em vez de `<input type=number>`, que aceitava valor inválido.
- Haptics curtos (`lib/utils/haptics.ts`) em confirmações; no-op sem a API ou com
  "reduzir movimento".

## Alternativa descartada

**Manter os cards colapsáveis e só reescrever os textos.** Resolveria o vocabulário, não a
arquitetura: continuaria sem hierarquia, com dois toques por tarefa e o card-monstro de IA.
Disclosure animado só faz sentido pra conteúdo secundário; aqui quase tudo é primário.

Também descartada a paleta/fonte sugerida pela skill de UX (Barlow, dourado): o app já tem
identidade própria (DM Sans/Mono, accent do dia); consistência pesa mais que variedade.

## Consequências

- `CollapsibleCard` deixou de ser usado em Ajustes (segue no repo; sem outros usos conhecidos
  pode ser removido num próximo passe).
- Os testes rodam em ambiente `node` sem testing-library, então só a lógica pura
  (`haptic`) tem teste; a UI foi validada por build + screenshot.
- Textos que citavam "Config" (nav, `PlanBoot`, onboarding) foram atualizados; docs antigos
  seguem como registro e continuam dizendo "Config".
