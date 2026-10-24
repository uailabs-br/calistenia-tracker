import progressionsData from "./progressions.json";
import catalogData from "./catalog.json";
import { getCriteria, formatCriteria, SKILL_CATEGORIES, WORKOUT_SKILL_LABELS } from "./skills";

/** Chaves técnicas de equipamento das escadas → pt-BR, pra IA ler sem decodificar. */
const EQUIPMENT_PT: Record<string, string> = {
  pull_up_bar: "barra fixa",
  parallel_bars: "paralelas",
  parallettes: "parallettes",
  bench: "banco",
  vertical_pole: "poste vertical",
};

const GROUP_PT: Record<string, string> = {
  pull: "puxar",
  push: "empurrar",
  core: "core",
  legs: "pernas",
};

interface RawLadderSkill {
  id: string;
  name: string;
  group: string;
  equipment_required: string[];
  prerequisites?: { skill_id: string; min_level: number }[];
  progressions: { level: number; name: string }[];
}

/**
 * Escadas canônicas geradas do catálogo, pra IA não inventar ids/níveis.
 *
 * Cada degrau leva o critério NUMÉRICO que o motor de progressão verifica (o
 * mesmo texto que a UI mostra): sem ele a IA escreve alvo abaixo do critério e o
 * atleta nunca fica "pronto pra subir" — treina bem e o app não reage.
 * Equipamento e pré-requisito evitam a prescrição impossível (front lever pra
 * quem não tem barra, ou pra quem ainda não tem pull-up).
 */
const SKILL_LADDERS = (progressionsData.skills as unknown as RawLadderSkill[])
  .map((s) => {
    const equip =
      s.equipment_required.length > 0
        ? s.equipment_required.map((e) => EQUIPMENT_PT[e] ?? e).join(" + ")
        : "só o chão";
    const prereq =
      s.prerequisites && s.prerequisites.length > 0
        ? ` · só depois de ${s.prerequisites
            .map((p) => `${p.skill_id} nível ${p.min_level}`)
            .join(" e ")}`
        : "";
    const steps = s.progressions
      .map((p) => {
        const criteria = getCriteria(s.id, p.level);
        const target = criteria ? ` → ${formatCriteria(criteria)}` : "";
        return `  ${p.level}=${p.name}${target}`;
      })
      .join("\n");
    return `${s.id} — ${s.name} (${GROUP_PT[s.group] ?? s.group} · ${equip}${prereq})\n${steps}`;
  })
  .join("\n");

interface RawCatalogItem {
  id: string;
  name: string;
  category: string;
}

/**
 * Ids que o app já conhece, por categoria. O histórico agrega por `id`: se a IA
 * batizar o mesmo movimento com outro id, o passado do atleta nele desaparece da
 * leitura. Não é lista fechada — é a lista dos ids que já têm dono.
 */
const CATALOG_IDS = SKILL_CATEGORIES
  .map((cat) => {
    const items = (catalogData as RawCatalogItem[]).filter((e) => e.category === cat);
    return `${cat}:\n${items.map((e) => `  ${e.id} = ${e.name}`).join("\n")}`;
  })
  .join("\n");

/**
 * Contrato de saída: o que o app aceita em `plan.json`. Espelha `schema.ts` — se
 * os campos mudarem lá, muda aqui também. O método de treino (como decidir o que
 * escrever) está em `aiPrompt.ts`; aqui é só forma.
 */
export const AI_SCHEMA_PROMPT = `# CONTRATO DE SAÍDA — plan.json

Estrutura: plan > workouts[] > blocks[] > exercises[]. Todo objeto é "strict":
campo extra é erro de validação e o app recusa o plano inteiro.

## Plano (objeto de topo — OBRIGATÓRIO, é o que o app valida primeiro)
{
  "id": "ciclo-mu-2026-10",   // kebab-case. Ajuste de um plano existente MANTÉM o id do plano_atual
  "version": 2,                // inteiro > 0. Ajuste = version do plano_atual + 1
  "name": "Muscle-up + Handstand — ciclo 2",  // nome curto que o atleta vê
  "source": "claude-2026-10",  // texto livre: quem gerou
  "imported_at": "2026-10-09", // AAAA-MM-DD
  "workouts": [ ...ver Workout... ]   // mínimo 1
}

## Workout (um treino do plano)
{
  "id": "A",               // identidade estável do treino: letra ou código curto, ÚNICO no plano
  "label": "A",            // rótulo exibido (normalmente igual ao id)
  "title": "Muscle Up",    // título curto do treino
  "skill": "Muscle Up",    // texto livre, MAS só estes rótulos resolvem pra skill canônica
                           // (usados pelo mapa de skills e pelos avisos de progressão):
                           //   ${WORKOUT_SKILL_LABELS.map((l) => `"${l}"`).join(" | ")}
                           // qualquer outro texto é só exibição (use "Folga" pra treino de prática/descanso)
  "duration": "32 min",    // texto livre; o app recalcula pelas séries e descansos quando dá
  "accent": "#8174E8",     // hex 6 dígitos — cor de destaque do treino
  "accent_bg": "#1D1B2B",  // hex 6 dígitos — fundo combinando (a UI é escura: use valor bem escuro)
  "is_practice": false,    // true = treino de prática (técnica), não de força
  "warmup": "texto livre do aquecimento",
  "tip": "texto livre — dica/contexto do treino",
  "blocks": [ ...ver Block... ],       // mínimo 1
  "progression": [ ...ver Progression... ]
}

## Block (grupo de exercícios dentro do treino)
{
  "label": "Skill — Componentes do MU · 16 min",
  "is_skill": true,        // true = bloco de skill/técnica, false = suporte/acessório
  "exercises": [ ...ver Exercise... ]  // mínimo 1
}

## Exercise
{
  "id": "mu-puxada-explosiva",  // kebab-case, prefixo = skill (mu-, hs-, fl-, core-, legs-, row-, pull-up-, push-up-)
                                  // ÚNICO dentro do treino; o MESMO movimento usa o MESMO id entre treinos
                                  // (o histórico e as flags agregam por id)
  "name": "Puxada explosiva",
  "target": "4 × 4",             // ver REGRAS DE ALVO abaixo — não é texto livre de verdade
  "parsed": {                    // null quando o alvo é intervalo ou não tem número limpo
    "sets": 4,
    "target": 4,
    "unit": "reps",              // "reps" | "seconds" | "attempts"
    "per_side": false            // true se o alvo é POR LADO (unilateral)
  },
  "obs": "segure o corpo em linha reta",  // UMA frase, até ~100 caracteres: o detalhe de execução que decide a série
  "rest": "descanso 120s",       // ver REGRAS DE DESCANSO abaixo
  "flags": ["chegou no esterno", "parou no queixo", "kip apareceu"],
  // ↑ tags que o atleta marca no fim da série. 2 a 4, curtas, na voz dele, e
  //   VERIFICÁVEIS olhando a série (não "senti forte"). Inclua ao menos uma
  //   positiva (o acerto técnico do degrau) e uma negativa (a falha típica).
  "neg_flags": ["parou no queixo", "kip apareceu"],
  // ↑ OPCIONAL — subconjunto EXATO de \`flags\` (string idêntica) que conta como
  //   execução suja. É o que o motor usa pra não promover técnica ruim.
  "skill_ref": { "skill_id": "muscle_up", "level": 3 }
  // ↑ OPCIONAL — só se este exercício FOR o degrau da sequência de progressão de uma skill.
  //   Use null quando NÃO for degrau nenhum (evita atrelar ao degrau errado).
  //   Omita se não tiver certeza. Só vale skill_id/level que existam nas sequências de progressão.
}

## Progression (fim do treino — o que evolui e quando)
{
  "exercise_id": "mu-puxada-explosiva",  // id de um exercício DESTE treino, ou null
  "label": "MU completo (barra alta)",   // OBRIGATÓRIO se exercise_id for null (marco sem exercício)
  "criteria": "texto livre — quando e como progredir esse exercício/marco"
}

## REGRAS DE ALVO (\`target\` e \`parsed\`)
O app lê sets e o PISO do alvo do TEXTO de \`target\` em runtime — é ele que
monta os contadores da tela de treino. Então:
- Escreva sempre no formato "N × M": "3 × 8" · "3 × 20s" · "4 × 6-8/lado" · "5 × 3 tentativas".
- Alvo em prosa ("8-10 entradas") perde o contador: o app lê 1 série de 8.
- Intervalo ("6-8", "8-10s") → \`parsed\` é SEMPRE null, mesmo que dê pra estimar
  o teto. O app usa o piso que está no texto.
- Alvo fixo → \`parsed\` preenchido, \`parsed.target\` igual ao número do texto.
- Exercício com \`skill_ref\` usa alvo FIXO (nunca intervalo). Com \`parsed\` null o
  motor não consegue dizer que o alvo foi batido, e 3 sessões assim viram sinal
  falso de regressão.
- O alvo de um exercício com \`skill_ref\` tem que ALCANÇAR o critério do degrau
  (lista de sequências de progressão abaixo). Alvo menor que o critério trava o atleta: ele cumpre
  o plano pra sempre e nunca fica "pronto pra subir".

## REGRAS DE TEXTO DENTRO DO JSON
Os campos de texto (\`obs\`, \`tip\`, \`warmup\`, \`criteria\`, \`name\`…) são string JSON
pura, não markdown. NÃO escape caractere de markdown dentro delas: \`\\~\`, \`\\*\`,
\`\\_\`, \`\\#\` não são escapes válidos em JSON e fazem o app recusar o plano
inteiro. Escreva \`"~38 min"\`, não \`"\\~38 min"\`. Só os escapes do JSON valem
(\`\\"\`, \`\\\\\`, \`\\n\`).

## REGRAS DE TAMANHO DO TEXTO
O atleta lê isso no meio do treino, no celular, e a \`obs\` fica recolhida num
"como executar". Curto vale mais que completo:
- \`obs\`: UMA frase, até ~100 caracteres. O único detalhe que decide a série.
  Sem teoria, sem repetir o nome do exercício nem o alvo, sem lista de dicas.
- \`tip\`: até 2 frases. \`warmup\`: uma linha. \`criteria\`: uma frase.

## REGRAS DE DESCANSO (\`rest\`)
O app extrai o maior número do texto e trata como SEGUNDOS, pro cronômetro.
- Sempre em segundos: "descanso 120s", "descanso 90s", "30-45s entre tentativas".
- NUNCA em minutos: "descanso 2 min" liga um cronômetro de 2 segundos.

## REGRAS DE IDENTIDADE (o que preserva o histórico)
- Ao ajustar um plano existente, PRESERVE o \`id\` de cada treino que continua
  existindo: o histórico aponta pra ele. Id novo só pra treino novo.
- PRESERVE o \`id\` de cada exercício que continua existindo, mesmo mudando alvo,
  obs, descanso ou bloco. Mudar o id é começar o histórico daquele movimento de zero.
- PRESERVE o \`skill_ref\` dos exercícios que você não mudou.
- Movimento novo que já existe na lista de ids conhecidos abaixo: use o id dela.
- \`exercise_id\` duplicado dentro do MESMO treino é erro de validação.
- Se \`neg_flags\` existir, cada item TEM que estar também em \`flags\`.
- \`skill_ref\` não-null: skill_id e level TÊM que existir nas sequências de progressão abaixo.
- Cores accent/accent_bg sempre hex de 6 dígitos com #.

## SEM DIA DA SEMANA
Não existe weekday, nem "Seg/Ter/…", nem "dia" como estrutura. A ORDEM do array
\`workouts[]\` É a sequência: o app mostra como próximo o seguinte ao último
concluído, em ciclo (A → B → C → A…). Não há limite de treinos — 2, 3, 5 ou 8, o
que fizer sentido pro objetivo.

## SEQUÊNCIAS DE PROGRESSÃO DE SKILL — ids, níveis e o critério que o app verifica
Formato: \`nível=nome do degrau → critério que o motor checa\`.
${SKILL_LADDERS}

## IDS JÁ CONHECIDOS PELO APP (use estes quando o movimento for um deles)
${CATALOG_IDS}
`;
