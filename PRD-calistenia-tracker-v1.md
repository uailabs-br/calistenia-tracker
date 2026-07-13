# PRD — Calistenia Tracker (v1)

## 1. Objetivo

App pessoal para registrar execução dos treinos de calistenia durante a sessão, com zero fricção. Não gera treino: consome o plano existente (convertido de `treino-calistenia-jul-2026.html` para JSON) e registra o que foi feito.

## 2. Usuário e contexto de uso

- Um único usuário, mobile, celular na mão entre séries, suado, com pressa.
- Cada interação deve caber em 1 toque. Nada de formulário longo, nada de escrita obrigatória.

## 3. Escopo v1

### Entra

1. **Plano em JSON** como fonte de verdade. O HTML atual é convertido uma vez para `plan.json` (estrutura na seção 5). Sem parser de HTML.
2. **Treino do dia**: o app abre já no dia da semana correto (Seg a Sex). Dia sem plano mostra estado vazio.
3. **Última performance**: abaixo de cada exercício, o que foi registrado na última sessão completada daquele dia de plano.
4. **Registro por exercício com caminho feliz de 1 toque** (seção 6).
5. **Flags qualitativas opcionais por exercício**, colapsadas, sem escrita (seção 7).
6. **Feedback de fim de sessão**: RPE 1-5 + nota opcional.
7. **Métricas simples** derivadas diretamente do log (seção 9).

### Não entra (v1)

- Geração de treino / IA
- Edição do plano dentro do app
- Timer de descanso automático (avaliar em v2)
- Multi-usuário, login, sync
- Vídeo, foto, gravação de simetria
- Flags por série (só por exercício, trade-off consciente pela fluidez)

## 4. Fluxos

### Iniciar treino

Abrir app → tela já é o treino de hoje → toque em "Começar". Sem seleção, sem menu.

### Durante o treino

Lista de exercícios em cards. Card ativo expandido, resto colapsado. Ao completar um exercício, colapsa e abre o próximo automaticamente.

**Caminho feliz (1 toque):**

```
Toes to bar                    3 × 8
última: como previsto · 09/07
────────────────────────────────
[ ✓ fiz como previsto ]   [ajustar]
▸ como foi? (opcional)
```

**Ajustar (expande steppers por série):**

```
Puxada explosiva               4 × 4
última: 4/4/4/3 · 06/07
────────────────────────────────
[ 1 ]  −  4  +   ✓
[ 2 ]  −  4  +   ✓
[ 3 ]  −  3  +   ✓
[ 4 ]  −  3  +   ✓
▸ como foi? (opcional)
```

- Stepper pré-preenchido com o alvo.
- Exercícios com volume não numérico ("10-12 tentativas") têm apenas o check único.
- Swipe ou long-press para pular exercício (registra como `skipped`, permanece no histórico).

### Flags qualitativas (colapsadas por padrão)

```
▾ como foi?
  [altura no esterno] [kip apareceu] [grip soltou]
```

- Chips de toque, multi-seleção, zero escrita.
- Flags definidas no `plan.json` por exercício (2-4 por exercício, derivadas das observações do plano). Exercício sem flags relevantes não mostra a seção.
- Ignorar não custa nada: seção colapsada não bloqueia o fluxo.

### Finalizar

Botão "Finalizar" sempre visível. Se sobrou exercício não marcado, confirma uma vez → tela de RPE (5 botões grandes, rótulos de "leve" a "no limite") → nota opcional → salvo.

## 5. Modelo de dados

```
Plan
  id, name, source, imported_at
  Day: weekday, title, skill, duration, warmup, tip
    Block: label, is_skill
      Exercise:
        id, name
        target_sets, target_reps (string livre: "4 × 4", "2 × 20s")
        parsed: { sets, target, unit ("reps"|"seconds"|"attempts"), per_side } | null
        obs, rest
        flags: string[]        // ex: ["chicken wing", "grip soltou"]

Session
  id, plan_day_id, date
  status: in_progress | completed | abandoned
  started_at, ended_at
  rpe: 1-5
  note?: string

ExerciseLog
  id, session_id, exercise_id
  as_target: bool              // true = check único no alvo
  sets: [{ index, value }]?    // presente só se ajustou
  flags_selected: string[]
  skipped: bool
```

Regras:

- `parsed = null` → exercício só tem check único (sem stepper).
- `as_target = true` equivale a todas as séries no alvo; volume é reconstituído a partir de `parsed` na hora de exibir e calcular métricas.

## 6. Última performance

Buscar a última `Session` com `status = completed` daquele `plan_day_id`. Para cada exercício:

- `as_target` → "como previsto · data"
- Com `sets` → valores por série + data (ex: "4/4/4/3 · 06/07")
- `skipped` → "pulado · data"
- Sem histórico → "primeira vez"

Isso fecha o loop com os critérios de progressão do plano: "por 2 sessões" fica verificável olhando as duas últimas sessões do dia.

## 7. Flags qualitativas

- Fonte: campo `flags` no `plan.json`, gerado junto com a conversão do HTML (Claude gera a proposta a partir das observações de cada exercício; usuário revisa antes de virar briefing).
- Semântica: flag marcada = o padrão ocorreu naquela sessão. Granularidade por exercício, não por série.
- Exemplos derivados do plano atual: "chicken wing" (negativa transição, jumping MU), "grip soltou" (false grip pull-up), "pausa 1s no topo" (jumping MU), "sem parede estabilizou" (kick-up livre).

## 8. Feedback de sessão

- RPE 1-5, obrigatório ao finalizar, 5 botões grandes.
- Nota livre opcional (campo único, sem obrigação).
- RPE mede esforço da sessão; qualidade técnica fica nas flags por exercício. Os dois não se misturam.

## 9. Métricas (v1)

Só o que sai direto do log, sem índice inventado:

- Dias treinados: total e últimos 30 dias
- Streak atual e maior streak
- Aderência por dia da semana (%)
- Por exercício: reps totais por sessão ao longo do tempo (gráfico simples)
- **Incidência de flags por exercício ao longo das sessões** (ex: "chicken wing na negativa: 3/3 → 1/3 → 0/3") — métrica principal do ciclo atual
- RPE médio (últimas 4 semanas)

## 10. Requisitos não funcionais

- **Offline-first.** Escrita local; sync fora do escopo v1.
- Wake lock durante sessão ativa (tela não apaga).
- Alvo de toque mínimo 44px; steppers e chips grandes.
- Estado da sessão sobrevive a fechar o app no meio (retoma `in_progress`).
- Tema escuro, mesma paleta do plano HTML.

## 11. Métrica de sucesso

- ≥90% das sessões realizadas são registradas durante o treino (não depois).
- Tempo de registro por exercício < 10s no caminho feliz.
- Flags usadas em pelo menos os exercícios críticos de MU (se ninguém marca flag nunca, a feature falhou ou as flags estão erradas).

## 12. Próximos passos

1. Claude gera `plan.json` a partir do HTML atual, com `flags` propostas por exercício.
2. Usuário revisa flags e estrutura.
3. Briefing para Claude Code com este PRD + `plan.json` como anexos.
