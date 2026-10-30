# CLAUDE.md

PWA offline-first pra registrar treinos de calistenia **durante a sessão**. Projeto pessoal,
um único usuário, sem backend, sem login, sem variáveis de ambiente — roda 100% no cliente.
Next.js 15 (App Router) como host de SPA, TypeScript strict, Dexie (IndexedDB), Tailwind v4,
Serwist (PWA), Zod. Visão geral em [README.md](README.md); documentação em [docs/](docs/README.md).

## Comandos

```bash
npm run dev            # http://localhost:3000
npm test               # Vitest — o gate principal
npx tsc --noEmit       # typecheck (strict)
npm run validate:plan  # valida plan.json + catalog.json contra o schema Zod
npm run build          # valida o plano e depois builda (falha se o plano estiver inválido)
```

`npm run lint` não funciona: não há config de ESLint no repo.

## Regras que não se quebram

Essas não são preferências de estilo — quebrar qualquer uma causa bug de dado ou perda de histórico.

**1. O banco é a única fonte de verdade do estado da sessão.** Nada de estado de treino em
memória do React. É isso que faz a retomada funcionar (fechar o app no meio e voltar ao ponto
exato). Estado efêmero de UI em `useState`; estado de sessão sempre no Dexie.

**2. Componente nunca fala com o Dexie direto.**
- Leitura reativa: `useLiveQuery` sobre funções de `lib/db/queries/*`.
- **Toda** escrita passa por `lib/db/repositories/*` (`sessions`, `logs`, `customExercises`).

**3. Em toda escrita:** `id` = UUID v4 gerado no client (`lib/utils/id.ts`) — nunca
autoincrement; `updated_at` atualizado; e **soft delete** via `deleted_at` — nunca delete
físico. Isso deixa o caminho aberto pra sync local-first no v2 sem pagar o custo agora, e toda
query precisa filtrar `deleted_at`.

**4. IDs de exercício são slugs estáveis** (`mu-puxada-explosiva`), compartilhados entre
treinos. É o que preserva o histórico de um *movimento* entre ciclos. **Ids do catálogo
(`lib/plan/catalog.json`) são estáveis pra sempre: nunca renomear, só adicionar.** Exercício
criado pelo usuário usa prefixo `custom-` + UUID, pra nunca colidir com catálogo ou plano.

**5. O log guarda o contexto do momento.** Cada `ExerciseLog` grava um `snapshot` (nome, alvo,
`parsed`). Toda leitura passa por `resolveLogExercise` (`lib/plan/resolve.ts`). Sem isso,
mudar o plano reescreve o passado: PRs inflam, `as_target` vira outro volume, nomes somem.
Se for ler um exercício de um log, use o resolver — não re-derive do plano vigente.

**6. Treinos são identificados por letra** (A, B, C…), não por dia da semana. A ordem do plano
*é* a sequência: o próximo é o seguinte ao último concluído, em ciclo, sem limite de treinos.
Não existe `weekday` no modelo nem "dia de folga". Onde `weekday` ainda aparece, é legado:
conversão de plano e backup antigos no código, registro histórico nos docs (ver
[docs/README.md](docs/README.md)).

**7. Migração de Dexie é append-only** (versão atual em `lib/db/schema.ts`). Campo opcional sem
índice não precisa de `.upgrade()` (IndexedDB não indexa `undefined`); campo indexado ou
renomeado precisa, e precisa de teste em `test/migration.test.ts`. Nunca editar uma `version()`
já publicada.

**8. Série extra conta em volume e recorde, mas não na progressão.** Deliberado: uma série
cansada a mais não deve reprovar um treino que cumpriu o plano.

**9. O `plan.json` bundlado é o plano genérico (`iniciante-com-barra`), não o do autor.** O plano
pessoal está em `lib/plan/plans/` e as sementes em `lib/plan/seeds/`; `PlanBoot` reaplica o plano
certo lendo o `plan_day_id` do histórico. Duas armadilhas: o `vitest.config.ts` **aponta
`plan.json` pro plano pessoal** (os testes de skill e o `PLAN_SKILL_REFS` dependem das
declarações de `skill_ref` dele), então `test/seeds.test.ts` lê o bundlado do disco; e a posição
de skill é `max(logs, manual)`, então um palpite alto do onboarding **não se corrige sozinho**:
na dúvida, grave a menor etapa.

**10. Nada derivado do plano pode ser renderizado antes do mount.** `loadPlan()` lê o override do
localStorage, que não existe no HTML estático: renderizar nome, número de treinos ou conteúdo do
plano no primeiro render quebra a hidratação (React #418) e repinta a tela. Use
`lib/utils/usePlanReady.ts` ou estado preenchido em `useEffect`.

## Escrever o mínimo

Antes de escrever código, pare no primeiro degrau que resolve por inteiro:

1. Precisa existir? Opção, flexibilidade ou código "pra depois" que ninguém pediu fica de fora;
   diga em uma linha o que deixou.
2. Já existe no repo (query, repositório, componente de `components/ui/`, helper)? Use do jeito
   que o código ao redor usa.
3. A plataforma resolve (input nativo, `Intl`, CSS)? Use, a não ser que exista componente da casa.
4. Uma dependência já instalada resolve? Use. Nunca adicione dependência por poucas linhas.
5. Só então, o mínimo que funciona.

- Mínimo na solução, completo na mudança: quem chama, testes e fixtures que a mudança quebra
  entram junto.
- Bug: antes de editar, procure todo lugar que chama a função e corrija a causa uma vez, no
  código compartilhado.
- Nunca entra no corte: validação de import e backup, tratamento de erro que evita perda de
  dado, acessibilidade e as regras acima.
- Feche cada resposta que mexe em código com uma ou duas linhas: o que ficou de fora ou não foi
  checado, e o risco que importa.
- Parece excesso, mas é de propósito — não corte nem sugira cortar: a camada de repositórios
  (regra 2), UUID/`updated_at`/`deleted_at` (regra 3), o `snapshot` nos logs (regra 5), a
  conversão de `weekday` legado (regra 6), as `version()` antigas do Dexie (regra 7) e o
  `PlanBoot` (regra 9).

## Guard-rails de produto

Fora de escopo **por decisão consciente** — não implemente, nem ofereça como melhoria:
gerar treino dentro do app (a IA é externa: o app exporta contexto e importa o resultado),
editor visual do plano, multi-usuário/login/sync na nuvem, social/feed, biblioteca gigante
de exercícios. Lista completa com os porquês em [docs/IDEAS.md](docs/IDEAS.md).

`docs/IDEAS.md` é backlog: **nada ali está aprovado pra implementar.**

## Convenções de código

- Import alias `@/*` a partir da raiz (ex.: `@/lib/db/schema`).
- Sem estado global (Zustand/Redux) e sem lib de gráficos — SVG próprio em
  `components/metrics/`. Bundle é feature num PWA offline.
- Código e comentários em **pt-BR**, como o resto do repo. Comentário explica *por quê*
  (sobretudo a decisão que não é óbvia), não o quê.
- `lib/domain/` é puro e testável: sem React e sem Dexie em runtime (tipo de
  `lib/db/schema` entra como `import type`, nunca o `db`).
- UI segue o [design system](docs/DESIGN-SYSTEM.md): cor e tamanho saem de token (nada de
  hex ou `text-[11px]` em componente), a cor do treino entra por `accentVars()` no container
  e é herdada (portal não herda), seleção visual vem do `aria-pressed`/`aria-checked`, e todo
  overlay usa `Dialog`/`Sheet` de `components/ui/Modal.tsx`.
- Teste novo junto da feature, em `test/`. Fixtures em `test/fixtures/`.

## Documentação

Feature grande ganha um `docs/PLAN-*.md` com a decisão e a alternativa descartada (não o passo
a passo), e entrada nova no topo do `docs/ACOMPANHAMENTO.md` com versão e contagem de testes.
Item entregue sai do `IDEAS.md`. Documentos antigos são **registro datado**: não atualize, ou
o log deixa de ser log.
