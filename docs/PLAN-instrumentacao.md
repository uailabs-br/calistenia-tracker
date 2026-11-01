# PLAN — Instrumentação do MVP: medir uso sem tirar o treino do aparelho

Registro datado (2026-10-31). Decisão e alternativa descartada, não o passo a passo.

**Estado:** proposto, não implementado. **Revisa em parte o
[PLAN-sync-e-auth.md](PLAN-sync-e-auth.md)** (2026-10-09), que decidiu "não existe camada de
telemetria". A seção 2 diz o que muda e o que continua valendo.

## 1. Problema

O app vai ser testado com gente de fora, e hoje não dá pra saber nada do uso. O Vercel Analytics
(instalado em 2026-10-31, ainda sem commit) mede aquisição: quem visita, de onde vem, qual página
abre. Não responde as três perguntas que decidem o próximo passo:

1. **Ativação:** quem abre o app chega a terminar o primeiro treino? Onde larga?
2. **Retenção:** quem terminou o primeiro volta pro segundo e pro terceiro? Em quanto tempo?
3. **O diferencial é usado?** Exportar contexto pra IA e importar o plano de volta.

Resposta de agora pra essas três. O resto (tema, aba mais vista, tempo de tela) não muda nenhuma
decisão nesta fase e fica de fora.

## 2. O que muda em relação ao PLAN-sync-e-auth

Aquele plano descartou evento de uso com quatro argumentos. Revistos um a um:

| Argumento de 09/10 | Hoje |
|---|---|
| Evento disparado sem sinal se perde | Continua verdade se for mandado na hora. A saída é guardar e mandar depois com o horário original, como faz o módulo offline do Workbox pro Google Analytics. Não pede tabela no Dexie: uma fila no `localStorage` basta, porque perder evento de uso quando a pessoa limpa os dados não custa nada a ela (seção 4) |
| Fila no Dexie = tabela, repository, migração, teste | Vale pro Dexie, não pra fila no `localStorage`. Evento de uso não é estado de sessão, então as regras 1 e 2 não se aplicam a ele |
| `anon_id` mente na retenção: limpar dados vira usuário novo, dois aparelhos viram dois | **Continua verdade, e vale igual pro auth anônimo do Supabase até a pessoa ligar um e-mail.** Não é defeito só da telemetria. A propriedade `n_concluidos` (seção 3) mostra quando um id "novo" já tem histórico |
| É código que se deleta quando entra auth | **Só metade.** Os eventos de treino viram query quando houver sync. Mas o comportamento (onde a pessoa larga no onboarding, se usa a IA, se descarta treino) não está em nenhuma das três tabelas espelhadas. Esse pedaço não tem outro lugar pra existir. O `anon_id` também não se perde: vira o `$anon_distinct_id` na hora de identificar (seção 6) |

**O que continua valendo:** métrica de resultado (treinos feitos, retenção por coorte) é melhor
como query sobre dado real, quando esse dado existir. Esta camada não substitui o sync, só cobre o
intervalo até ele e o que ele nunca vai cobrir. A v2.0 leva de 1 a 2 semanas e muda os guard-rails
do produto; com os dados do MVP, essa decisão fica melhor informada.

## 3. Decisão

Dois instrumentos, cada um no que faz bem:

- **Vercel Analytics:** visitas e aquisição, como já está.
- **PostHog Cloud (região UE):** de 7 a 10 eventos de comportamento, com funil e retenção por
  pessoa. O plano grátis cobre 1 milhão de eventos por mês; nesta fase devem ser poucos milhares.

Sem o SDK do PostHog: os eventos vão por um `fetch` direto pro endpoint de lote. Motivos:

- o SDK liga autocaptura e gravação de sessão, o contrário da promessa de privacidade;
- pesa no bundle de um PWA offline;
- não guarda fila offline do jeito que este app precisa.

Pra este volume, a parte nossa fica em torno de 80 linhas.

### Os eventos

Nome em `objeto_ação`, snake_case, particípio, que é a convenção mais usada em tracking plan. Em
pt-BR, como o resto do código.

| Evento | Onde nasce | Propriedades próprias |
|---|---|---|
| `app_aberto` | uma vez por carregamento do app, não por troca de aba | — |
| `onboarding_concluido` | fim do onboarding | `semente` (id do plano-semente escolhido) |
| `treino_iniciado` | `createSession` | `letra`, `n_concluidos` |
| `treino_concluido` | `completeSession` | `letra`, `n_concluidos`, `duracao_min`, `rpe` |
| `treino_descartado` | `discardSession` | `n_concluidos`, `minutos_ate_descartar` |
| `treino_avulso_registrado` | `createFreeformSession` | `dia_passado` (bool), `n_concluidos` |
| `contexto_exportado` | export pra IA | — |
| `plano_importado` | import do plano | `resultado`: `ok`, `erro_formato` ou `erro_validacao` |
| `backup_exportado` | export do backup | — |

**Os eventos de sessão nascem no repositório**, não no componente. O `createSession` tem duas
chamadas na tela do treino, e o repositório é o único caminho de escrita (regra 2). Além disso, o
restore de backup grava direto com `put` e não passa por ele: histórico restaurado não vira
evento.

`n_concluidos` é o número de treinos concluídos **antes** deste, lido do banco. É o que separa o
primeiro treino do décimo, e o que denuncia um id novo com histórico antigo (backup restaurado,
outro aparelho).

**Propriedades comuns a todo evento:** `app_versao`, `esquema` (versão deste tracking plan,
começa em 1), `aparelho` (iPhone, Android ou computador, o mesmo helper do feedback), `instalado`
(`display-mode: standalone`) e `plano` (`semente:<id>` ou `importado`). O id de plano importado
não vai, porque a IA pode ter escrito qualquer coisa nele.

**O que nunca sai:** nome de exercício, série, rep, carga, nota, persona, metas, nome da pessoa,
conteúdo do plano. Se um evento novo precisar disso, o evento não entra.

## 4. Como o evento chega

- **Identidade:** `anon_id` UUID v4 (`lib/utils/id.ts`) no `localStorage`, criado no primeiro
  `app_aberto`. O backup não leva o `anon_id`: backup é dado de treino, e o `n_concluidos` já cobre
  o caso do aparelho restaurado.
- **Fila:** `track()` só empilha no `localStorage`, de forma síncrona e sem rede. Cada evento
  nasce com `uuid` próprio e `timestamp` em **ISO 8601**, que o PostHog usa pra deduplicar
  reenvios. Um número epoch é aceito com 200, mas o horário vira o de chegada, e aí o treino feito
  offline cai no dia errado. Teto de 500 eventos; acima disso, o mais velho sai.
- **Envio:** no `app_aberto`, no evento `online` e quando a aba fica oculta (`keepalive`). O
  evento só sai da fila depois de um 2xx. Falhou, fica pra próxima.
- **Proxy:** `rewrites` no `next.config.mjs` de `/ingest/*` pro PostHog. Assim o bloqueador de
  anúncio não derruba o evento e o navegador só fala com o próprio domínio. É configuração da
  Vercel, não servidor nosso.
- **Sem variável de ambiente:** a chave de projeto do PostHog é pública por desenho (vai no
  bundle de qualquer jeito) e entra como constante, ao lado do `APP_NAME`. O cabeçalho do
  CLAUDE.md continua verdade.
- **Dev e teste não enviam.** Em `development` o `track()` não faz nada; nos testes, a fila
  existe mas o envio é trocado por um falso.

## 5. Privacidade

A política em `components/landing/PrivacyPolicy.tsx` (renderizada no `/sobre`) diz hoje "não tem
rastreador" e promete que, se o app passar a medir uso, "o aviso entra aqui antes". **O Vercel
Analytics já contradiz esse texto.** Por isso a política nova vai no mesmo commit do Vercel
Analytics, antes do push, e o PostHog só entra depois dela.

**Base legal: legítimo interesse, com transparência e opt-out**, sem banner de consentimento. O
guia da ANPD sobre cookies admite legítimo interesse pra analytics, mas as leituras divergem e o
guia é orientativo, não norma. Um id fixo por aparelho é dado pseudônimo, não anônimo: o texto não
pode dizer "anônimo". Vale uma revisão jurídica antes de abrir pra muita gente; nesta fase, com
testadores convidados, o risco é baixo.

- No PostHog, ligar **"Discard client IP data"** e usar a região UE.
- **Botão em Ajustes, ligado por padrão.** Desligado, ele zera a fila, para o `track()` e também
  corta o Vercel Analytics (pelo `beforeSend` dele, que descarta o evento quando devolve `null`).
  É UI, então passa por protótipo antes.

### Rascunho dos textos (edite à vontade)

**Política — "Pra onde eles vão"** (substitui o atual):
> Os treinos, pra lugar nenhum: ficam neste aparelho. O que sai é o uso do app, explicado logo
> abaixo.

**Política — item novo, "O que o app mede":**
> Pra saber onde o app trava, ele conta alguns momentos: abrir o app, terminar o onboarding,
> começar, terminar ou descartar um treino, exportar pra IA, importar um plano e fazer backup.
> Junto vão a versão do app, o tipo de aparelho, quantos treinos você já fez, a duração e o
> esforço que você marcou. Não vai exercício, série, nota, nome nem meta. Cada aparelho ganha um
> código aleatório, sem e-mail nem nome ligado a ele. As visitas às páginas são contadas pela
> Vercel, que hospeda o app; os momentos vão pro PostHog, na União Europeia, que descarta o seu IP.
> Dá pra desligar em Ajustes.

**Política — "Pra que são usados"** (tira a promessa futura, que agora é presente):
> Os treinos, só pra o app funcionar pra você: retomar o treino, mostrar sua evolução e dizer
> quando dá pra progredir. O uso medido, pra decidir o que melhorar. Nada é vendido nem vira
> anúncio.

**Política — "A única conexão externa"** vira **"Conexões externas"** e ganha Vercel e PostHog ao
lado do RepDB.

**Ajustes:**
> **Medir o uso do app**
> Conta momentos como começar e terminar um treino. Nada do treino em si sai do aparelho.

## 6. O caminho até um banco

O formato do evento já é uma linha de tabela: `uuid`, `distinct_id`, `event`, `timestamp`,
`properties` (com `esquema` e `app_versao`). Por isso o destino pode mudar sem reescrever quem
chama `track()`: a troca fica numa função só, a que manda o lote.

| Quando | O quê |
|---|---|
| **Agora** | Vercel (aquisição) + PostHog (comportamento). Funil e retenção pela interface do PostHog; perguntas fora do padrão, pelo SQL dele |
| **v2.0 (sync)** | No primeiro `signInAnonymously` que der certo, manda um `$identify` com `distinct_id = user_id` e `$anon_distinct_id = anon_id`. O PostHog junta o passado e o futuro na mesma pessoa. A partir daí, métrica de resultado é query no Postgres e os eventos de treino podem sair (decidir lá) |
| **Análise a fundo** | Cruzar comportamento com dado de treino ("quem usa a IA treina mais?"). Três saídas, todas possíveis porque o formato já é de tabela: ler o Postgres de dentro do PostHog (data warehouse), exportar os eventos do PostHog pro Postgres, ou mandar o lote direto pra uma tabela `events` no Supabase. Escolher quando a pergunta existir; preço e limite das duas primeiras não foram verificados |

### Regras de evento (entram no CLAUDE.md junto com a implementação)

- **Nome de evento é estável, como id de catálogo (regra 4):** nunca renomear, nunca reaproveitar
  um nome com outro significado. Mudou o sentido, é evento novo; mudou o formato das propriedades,
  sobe o `esquema`.
- **Evento nunca carrega conteúdo de treino**, nem persona, metas ou nome (lista da seção 3).
- **Evento novo entra neste tracking plan primeiro.** O catálogo vive tipado em um arquivo
  (`lib/analytics/events.ts`), e `track()` só aceita o que está nele.

## 7. Alternativas descartadas

| Alternativa | Por quê não |
|---|---|
| Manter 09/10: só Vercel até a v2.0 | O MVP seria testado sem nenhum dado de uso, e o comportamento (onboarding, IA, descarte) ficaria sem medição mesmo depois do sync |
| Eventos customizados da Vercel | Só no plano Pro, e sem funil nem retenção por pessoa, que é a pergunta |
| SDK `posthog-js` | Autocaptura e gravação de sessão contra a promessa, peso no bundle e nenhuma fila offline que sirva aqui. Pra 9 eventos, `fetch` resolve |
| Fila no Dexie | Tabela, repository e migração (regra 7) pra um dado que não é do domínio e cuja perda não custa nada à pessoa |
| Derivar os eventos do banco na abertura (lendo sessões novas) | Cobre treino, mas não export, import nem onboarding: seriam dois mecanismos. A fila cobre todos do mesmo jeito |
| Tabela `events` no Supabase já agora | Antecipa backend, chave e defesa contra abuso, e não tem funil pronto. Fica como uma das saídas da seção 6 |
| Plausible / Umami | Foco em pageview, que a Vercel já faz. Fraco em retenção por pessoa |
| Heartbeat com contadores (o desenho descartado em 09/10) | Contador agregado perde a ordem dos eventos, e funil é ordem |

## 8. Riscos e o que verificar

| Item | O que fazer |
|---|---|
| **Retenção enviesada pra baixo** | Limpar dados, dois aparelhos e o Safari, que apaga o armazenamento de site não instalado depois de 7 dias sem uso: todos viram usuário novo. Ler retenção separando `instalado`, e olhar `n_concluidos` no primeiro evento de cada id |
| **Timestamp** | Mandar ISO 8601, nunca epoch. Testar com um evento feito offline e conferir o horário no PostHog |
| **Deduplicação** | O PostHog deduplica por `uuid` + evento + `distinct_id` + dia, mas "eventualmente". Logo depois de um reenvio, um gráfico pode contar dobrado por um tempo |
| **Campo `uuid` no lote** | A doc recomenda mandar; conferir no primeiro envio que o endpoint de lote aceita no formato usado |
| **Service worker** | O Serwist só intercepta GET por padrão, e o envio é POST. Conferir no build que o `/ingest` não cai em nenhuma rota de cache |
| **Relógio do aparelho errado** | O `timestamp` vem do aparelho. Ver se o PostHog corrige a diferença usando `sent_at`; se não corrigir, aceitar, porque é raro |
| **O painel diz onde, não por quê** | Com dezenas de usuários, o funil aponta o degrau e só a conversa explica. O `CONTACT_URL` em `lib/appInfo.ts` ainda é `null`, então o convite de feedback que já existe está desligado. Ligar um canal junto com isto |

## 9. Em aberto

- **Região do PostHog:** UE por padrão, porque a GDPR protege mais. As duas regiões são
  transferência internacional pela LGPD; confirmar na revisão jurídica.
- **Etapas do onboarding** como eventos próprios (`onboarding_etapa_vista`). Ficam fora da v1; só
  entram se o funil mostrar que a perda está entre `app_aberto` e `onboarding_concluido`.
- **Botão ligado por padrão** depende da leitura de legítimo interesse. Se a revisão jurídica
  pedir consentimento, ele vira pergunta no onboarding.

## Sequência

| Passo | O quê |
|---|---|
| 1 | Política nova (seção 5) no mesmo commit do Vercel Analytics, antes do push |
| 2 | Protótipo do botão em Ajustes |
| 3 | `lib/analytics/` (catálogo, fila, envio), eventos nos repositórios e nas telas, rewrite, constante da chave, `beforeSend` da Vercel, testes da fila (empilha offline, sai só com 2xx, teto, botão desligado zera) |
| 4 | Projeto no PostHog: região UE, IP descartado, um funil e uma retenção salvos |

## Fontes

- PostHog, capture e batch API: <https://posthog.com/docs/api/capture>
- PostHog, eventos históricos e timestamp ISO: <https://posthog.com/docs/migrate>
- Epoch tratado como horário de chegada: <https://dev.to/aleksuix/posthog-capture-treats-an-epoch-timestamp-as-ingestion-time-2bng>
- PostHog, deduplicação por `uuid`: <https://posthog.com/docs/cdp/troubleshooting.md>
- PostHog, proxy com rewrites no Next.js: <https://posthog.com/docs/advanced/proxy/nextjs>
- PostHog, identify e `$anon_distinct_id`: <https://posthog.com/docs/product-analytics/identity-resolution.md>
- PostHog, preços: <https://posthog.com/pricing.md>
- Workbox, fila offline com horário original: <https://developer.chrome.com/docs/workbox/modules/workbox-google-analytics>
- Convenção `objeto_ação`: <https://segment.com/academy/collecting-data/naming-conventions-for-clean-data/>
- Guia da ANPD sobre cookies (leituras secundárias, conferir no original):
  <https://www.machadomeyer.com.br/pt/inteligencia-juridica/publicacoes-ij/direito-digital/anpd-divulga-novo-guia-com-orientacoes-sobre-cookies>,
  <https://www.migalhas.com.br/depeso/376525/as-orientacoes-da-anpd-para-o-uso-de-cookies>
