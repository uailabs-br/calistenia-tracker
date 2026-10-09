# PLAN — Sync e identidade: o backend que torna métrica uma query

Registro datado (2026-10-09). Decisão e alternativa descartada, não o passo a passo.

**Estado:** proposto, não implementado. Alvo: v2.0. Revisa regras do
[CLAUDE.md](../CLAUDE.md) — ver seção final.

## Problema

A pergunta que abriu isto foi operacional: **abrindo o app pro público, como medir downloads,
usuários ativos e treinos criados?** A resposta honesta é que hoje não há como medir nada, por
três motivos que se somam:

1. **O dado nunca sai do aparelho.** Sessão, log, PR — tudo em IndexedDB.
2. **PWA não tem contador de download.** Não há loja no meio; "instalação" é um evento que só
   o client vê, e o iOS nem dispara `beforeinstallprompt`.
3. **O Serwist sabota log de servidor.** Depois da primeira visita o SW serve do cache. Alguém
   que treine 5×/semana por três meses pode não gerar **nenhum** request novo — pageview de
   servidor subcontaria usuário ativo de forma brutal, o inverso de um site normal.

A primeira saída desenhada foi telemetria anônima: `anon_id` em localStorage e um heartbeat
diário com contadores agregados. **Foi descartada** — ver alternativas. O resumo é que ela
custa um sistema inteiro para entregar dado estruturalmente ruim, e morre quando houver
identidade de verdade.

## Decisão

**Não existe camada de telemetria. Identidade + sync são o sistema de métricas.**

Com as três tabelas espelhadas no Postgres, "treinos criados" é `count(*) from sessions` e
retenção é uma query sobre dado real. Nenhuma métrica é instrumentada: todas são consultadas
de dado que existe por razão de **produto** (durabilidade, segundo aparelho, push com gatilho
real). Isso é o ponto central da decisão — a métrica deixa de ser feature e vira efeito
colateral.

### Identidade: anônima por padrão, conta quando o usuário quiser

`signInAnonymously()` cria uma `auth.users` real no primeiro open: zero fricção, nenhuma tela
de login, RLS funcionando desde o primeiro treino. Quando a pessoa quiser backup na nuvem ou
segundo aparelho, `updateUser({ email })` **anexa uma identidade à mesma `user_id`** — a
Supabase passa a tratar o usuário como permanente e o histórico inteiro vem junto, porque o id
não muda.

É o mesmo custo de UX do `anon_id` fabricado, com identidade durável, RLS de verdade e caminho
de conversão. O `anon_id` não tinha nenhum dos três.

**O app nunca espera a rede.** Se o primeiro open for offline, `signInAnonymously()` falha; o
app grava local sem `user_id` e estampa na primeira autenticação que der certo. A regra 1 (banco
é a fonte de verdade da sessão) continua valendo sem emenda — ela é o que torna isso possível.

### Servidor: três tabelas espelhadas, uma policy cada

`sessions`, `exercise_logs`, `custom_exercises` com `user_id uuid references auth.users` e RLS
`user_id = auth.uid()`. Consequência boa: **o client fala com o Supabase direto com a anon key.**
Toda a tubulação de `service_role` atrás de uma route no Vercel só era necessária porque não
havia identidade — a arquitetura final tem *menos* peças que a telemetria teria.

Cliente `@supabase/supabase-js` (PostgREST sobre HTTP), não conexão `pg` direta: serverless com
pool de conexão é dor que não precisa existir.

**Chave primária composta `(user_id, id)`**, não `id` sozinho — ver merge de contas.

### Sync: last-write-wins próprio, não biblioteca

O dado é log append-mostly de **uma** pessoa. Ninguém edita a mesma série em dois aparelhos ao
mesmo tempo: a superfície de conflito é praticamente nula. LWW por linha com `updated_at`
resolve todos os casos reais em ~250 linhas — puxa o que mudou desde `last_pulled_at`, empurra
as linhas `dirty`, maior `updated_at` ganha.

PowerSync, ElectricSQL, Replicache e Zero existem para **edição concorrente multi-usuário**.
Adotar qualquer um significaria trocar o Dexie — rewrite grande para resolver um problema que
este app não tem.

## O que já está pago, e o que falta

A regra 3 do CLAUDE.md — UUID v4 no client, `updated_at`, soft delete via `deleted_at` — foi
escrita para este momento, com a justificativa explícita de *"deixar o caminho aberto pra sync
local-first no v2 sem pagar o custo agora"*. As três tabelas de
[`lib/db/schema.ts`](../lib/db/schema.ts) cumprem. **A parte caríssima de sync está pronta:** id
gerado no client (sem autoincrement, sem colisão entre aparelhos), delete que não apaga (um
delete propaga como dado, não como ausência) e timestamp de mutação em toda linha. O modelo de
dados não será reescrito.

Falta pouco, e é concreto:

| O quê | Por quê |
|---|---|
| Flag `dirty` indexada nas 3 tabelas | Saber quem mudou desde o último push. A **regra 2** (toda escrita passa por repository) paga aqui: existe um único ponto para marcar `dirty = 1` |
| Tabela `meta` chave-valor | Guardar `last_pulled_at` e o `user_id` corrente |
| Dexie **v6** com `.upgrade()` de verdade | Campo indexado exige migração (regra 7). **Toda linha existente entra como `dirty = 1`** |

O `.upgrade()` marcando o acervo como `dirty` é o detalhe que, errado, faz a pessoa perder meses
de treino em silêncio: sem isso, o histórico anterior ao sync **nunca sobe**, e o primeiro pull
num aparelho novo parece "começar do zero".

## Merge de contas: a parte difícil

Cenário real e comum: a pessoa instala no celular (anônimo A), instala no tablet (anônimo B), e
depois liga os dois ao mesmo e-mail. A documentação da Supabase é direta: se o e-mail já
pertence a outra conta, `updateUser` **falha**, e reatribuir as linhas é responsabilidade da
aplicação.

Aqui a regra 3 paga de novo. Como todo `id` é **UUID v4 gerado no client**, não existe colisão
entre aparelhos: o merge é reatribuição de `user_id`, não reconciliação de chave. Duas sessões
na mesma data vindas de dois aparelhos não são conflito — são dado real, e o app já sabe
mostrar duas sessões no mesmo dia.

**A exceção que justifica a PK composta:** se o aparelho B foi restaurado do backup JSON do
aparelho A ([`lib/db/backup.ts`](../lib/db/backup.ts) preserva os ids, porque é backup), as duas
contas anônimas carregam **as mesmas linhas**. Com PK `id` sozinho, o segundo aparelho nunca
conseguiria subir (RLS bloqueia linha de outro dono, e o sync falharia calado). Com
`(user_id, id)` cada conta tem sua cópia, e o merge é `insert … select … on conflict do nothing`
seguido de `delete` da origem — a duplicata é absorvida em vez de virar erro.

## Alternativas descartadas

| Alternativa | Por quê não |
|---|---|
| **Telemetria anônima com heartbeat** (`anon_id` + contadores) | Limpar dados do navegador conta como usuário novo → retenção mentirosa; celular + tablet = 2 "usuários"; não dá pra falar com ninguém nem recuperar histórico de ninguém. E é ~1 dia de código que se deleta quando entra auth |
| Analytics de evento (Plausible/Umami/PostHog) | Evento disparado na academia sem sinal **se perde**. Fila offline no Dexie = tabela, repository, migração e teste de flush — trabalho real por dado pior que uma query |
| Só a tag de analytics, sem backend | Mede aquisição, não uso. Serve pra lançar esta semana (ver sequência), não como resposta à pergunta |
| **Upstash Redis** (o desenho original do [5.1]) | Resolve bem "guardar subscription por endpoint"; resolve mal "retenção por coorte semanal" — viraria scan de chaves e agregação em JS. Postgres responde isso em uma query |
| GitHub Actions como cron (idem [5.1]) | O risco já estava anotado lá: **desliga sozinho em repo com 60+ dias sem commit** — o push morreria calado. `pg_cron` vive ao lado do dado, sem secret trafegando e sem decaimento |
| Login obrigatório na entrada | Mata o onboarding e o offline-first de uma vez, pra ganhar o que o auth anônimo já dá |
| PowerSync / ElectricSQL / Replicache / Zero | Resolvem edição concorrente multi-usuário, que não existe aqui; custariam trocar o Dexie |
| CRDT / vector clock por linha | Mesma coisa: paga-se complexidade por conflito que um usuário só não produz |
| Sync como "backup na nuvem" (upload do JSON inteiro) | Simples e errado: último aparelho a subir apaga o outro. O `updated_at` por linha já existe — usar o arquivo inteiro como unidade joga isso no lixo |
| Dashboard de métricas no app | Query no SQL Editor resolve até alguns milhares de usuários. Admin UI é o jeito clássico de gastar uma semana pra olhar oito números |

## Riscos e armadilhas (verificados na doc da Supabase)

| Item | O que fazer |
|---|---|
| **Linking manual vem desligado** | `updateUser({ email })` numa conta anônima exige *Enable Manual Linking* nas configurações de auth. Sem isso a conversão não funciona |
| **Template de e-mail quebra** | `{{ .Email }}` chega **vazio** ao linkar e-mail em usuário anônimo. O template de confirmação precisa não depender dessa variável |
| **Endpoint anônimo é abusável** | A doc avisa que dá pra inflar o banco chamando `signInAnonymously` em massa. Ligar CAPTCHA invisível ou Turnstile; o rate limit por IP (30/h) é ajustável no dashboard |
| **Não há limpeza automática de anônimos** | A sugestão oficial é SQL manual, e o exemplo filtra por **data de criação** — o que apagaria usuário ativo. Filtrar por inatividade (`last_seen`), e com `on delete cascade` nas três tabelas |
| **MAU** | Free tier inclui 50.000 MAU. A doc não diz explicitamente se anônimo conta; como a sessão emite token, provavelmente conta. Irrelevante na escala desta fase, mas confirmar antes de crescer |
| **Claim `is_anonymous`** | É o que distingue os dois tipos em RLS. Não confirmei na doc que ele vira `false` depois do link — **testar em projeto de teste** antes de escrever policy que dependa disso |
| **Perda silenciosa de dado** | O pior modo de falha de sync. Dois mitigadores já existem: o `backup.ts` como rede (exportar antes do primeiro sync) e o soft delete, que faz sync ruim não apagar nada de verdade |

## As métricas, depois disso

Nenhum código. A pergunta original vira:

```sql
select date_trunc('week', u.created_at)::date as coorte,
       count(distinct u.id)                    as usuarios,
       count(distinct s.user_id) filter (
         where s.started_at > now() - interval '7 days'
       )                                        as ativos_7d,
       count(s.id) filter (where s.status = 'completed'
                             and s.deleted_at is null) as treinos
from auth.users u
left join sessions s on s.user_id = u.id
group by 1 order by 1;
```

Instalação (o mais próximo de "download" que um PWA permite) fica como coluna no perfil do
usuário, alimentada por `display-mode: standalone` — é o único sinal que funciona nos dois
sistemas, já que o iOS não dispara `beforeinstallprompt`.

Nota de LGPD: com conta real entra e-mail, que é dado pessoal de verdade — pede política de
privacidade e caminho de exclusão (o `on delete cascade` já serve de mecanismo). Na fase
anônima não há PII.

## Efeito no push ([5.1] do IDEAS)

O [`IDEAS.md`](IDEAS.md) anotou que o gatilho do push precisava de outro critério depois que
`weekday` deixou de existir. Com sync, o servidor sabe quando a pessoa treinou **de verdade**:
`pg_cron` consulta "sem sessão há N dias" sobre dado real, não sobre um contador que o client
mandou. O gatilho fica melhor *por causa* do sync.

Só o VAPID private key continua server-side. Disparo: `pg_cron` → `pg_net` → route no Vercel
com `web-push` em Node. Dá pra fazer em Edge Function, mas aí a assinatura VAPID roda em Deno —
não vale pagar essa incerteza pra economizar um hop.

O `ReminderSettings` hoje pede permissão e salva preferência **sem entregar notificação**
(confirmado em uso real, 2026-07-24). Abrir pro público antes do push é lançar com uma tela de
ajustes que promete e não cumpre — é dívida de produto, não só técnica.

## Sequência

| Quando | O quê | Por quê |
|---|---|---|
| Agora | Vercel Analytics (um import) | Mede aquisição. Não bloqueia o lançamento e não constrói nada que se deleta depois |
| **v2.0** | Auth anônimo + 3 tabelas + RLS + sync LWW + Dexie v6 | Métricas nascem de graça; durabilidade e segundo aparelho são o valor de produto |
| v2.1 | Push com gatilho data-driven | Em cima do sync, não antes |

1–2 semanas de trabalho cuidadoso para a v2.0, não um fim de semana. Precisa de suíte própria:
offline→online, dois aparelhos, delete propagado, merge de contas, e o `.upgrade()` v6 com
acervo existente.

## Regras do CLAUDE.md a revisar

Entregar isto **quebra texto vigente** — registrado aqui para a revisão ser deliberada:

| Regra | Hoje | Depois |
|---|---|---|
| Cabeçalho | "sem backend, sem login, sem variáveis de ambiente — roda 100% no cliente" | Passa a haver backend, login opcional e env vars. "Offline-first" continua verdade; "100% cliente" não |
| Regra 2 | Componente nunca fala com Dexie direto | Mantida e **reforçada**: o repository passa a ser também o ponto onde `dirty` é marcado |
| Regra 3 | Soft delete "deixa o caminho aberto pra sync no v2" | O v2 chegou. A justificativa deixa de ser futura e vira requisito ativo |
| Guard-rail de produto | "Multi-usuário/login/sync na nuvem" fora de escopo | Revogado. O argumento *"export/import JSON já resolve durabilidade"* seguia válido pra durabilidade, mas nunca cobriu segundo aparelho, gatilho de push com dado real nem medição |
| Guard-rail social | Parkado, anotado como alavanca nº1 de retenção | Continua fora de escopo, mas **o auth é o portão dele**: vale desenhar a identidade sabendo disso |

## Em aberto

- **Conversão de conta é opt-in e sem data.** Não há decisão sobre *quando* oferecer "salvar na
  nuvem" — na instalação, depois do primeiro treino, ou só em Ajustes. Afeta a taxa de conversão
  de anônimo→conta, que é o que separa métrica boa de métrica enviesada.
- **Política de retenção de anônimo abandonado** (quantos dias antes de apagar) não definida.
- **`is_anonymous` em RLS** depende do teste descrito acima.
- Se o projeto Supabase será novo ou schema separado num projeto pago existente — muda o risco
  de pausa por inatividade do free tier.
