# Calistenia Tracker

App pessoal (PWA) para registrar treinos de calistenia durante a sessão, com
zero fricção. Consome um plano em JSON e registra o que foi feito — não gera
treino. Offline-first, um toque por exercício.

Baseado em [`PRD-calistenia-tracker-v1.md`](PRD-calistenia-tracker-v1.md) e
[`PLANO_IMPLEMENTACAO.md`](PLANO_IMPLEMENTACAO.md). Progresso em
[`ACOMPANHAMENTO.md`](ACOMPANHAMENTO.md).

## Stack

Next.js 15 (App Router) · TypeScript strict · Tailwind v4 · Dexie.js
(IndexedDB) · Serwist (PWA) · Zod.

## Rodar local

```bash
npm install
npm run dev          # http://localhost:3000
```

## Comandos

```bash
npm run dev            # dev server
npm run build          # valida plan.json + build de produção
npm start              # servir o build de produção
npm test               # testes unitários (Vitest)
npm run validate:plan  # valida lib/plan/plan.json contra o schema Zod
```

## Estrutura

```
app/                     # rotas: / (hoje), historico, metricas, config
components/session/       # ExerciseCard, Stepper, FlagChips, RpeSheet, SessionRunner
components/metrics/        # StatTile, Sparkline, FlagIncidenceRow
components/ui/            # BottomNav, PageHeader, SwUpdater, icons
lib/db/                  # schema Dexie, repositories/, queries/, backup
lib/domain/              # parseTarget, volume
lib/plan/                # plan.json (fonte de verdade), schema Zod, loader
scripts/                 # validate-plan, generate-icons
```

O plano é **bundlado** (não vai pro banco) e validado em build — o build falha
se `lib/plan/plan.json` estiver inválido.

## Convenções (v2-ready)

UUID v4 no client · `updated_at` em toda escrita · soft delete (`deleted_at`) ·
componente nunca chama Dexie direto (só `lib/db/repositories/*`) · IDs de
exercício = slug estável (preserva histórico entre versões do plano).

## Deploy (Vercel)

```bash
npm i -g vercel   # se ainda não tiver
vercel            # primeira vez: segue o wizard, conecta o projeto
vercel --prod     # deploy de produção
```

Nada de env vars ou banco no servidor: tudo roda no client (IndexedDB). Depois
de publicado, abra no iPhone/Android e "Adicionar à tela de início" para instalar
como app.
