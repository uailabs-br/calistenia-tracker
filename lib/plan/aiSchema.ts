import progressionsData from "./progressions.json";

/** Escadas canônicas (id: nível=nome | ...) geradas do catálogo, pra IA não inventar ids/níveis. */
const SKILL_LADDERS = (
  progressionsData.skills as { id: string; progressions: { level: number; name: string }[] }[]
)
  .map((s) => `- ${s.id}: ${s.progressions.map((p) => `${p.level}=${p.name}`).join(" | ")}`)
  .join("\n");

/**
 * Prompt pronto pra colar numa LLM (Claude etc.) pra gerar/ajustar os treinos de
 * treino no formato que o app espera. Espelha `schema.ts` — se os campos do
 * plan.json mudarem, atualiza aqui também.
 */
export const AI_SCHEMA_PROMPT = `Vou te descrever um treino de calistenia. Formata a resposta EXATAMENTE no esquema JSON abaixo (é o formato que o app usa pra plan.json). Devolve só o JSON, sem explicação.

ESQUEMA DE TREINO — plan.json (calistenia app)

Estrutura: plan > workouts[] > blocks[] > exercises[]

## Workout (um treino do plano)
{
  "id": "A",               // identidade estável do treino: letra ou código curto, ÚNICO no plano
  "label": "A",            // rótulo exibido (normalmente igual ao id)
  "title": "Muscle Up",    // título curto do treino
  "skill": "Muscle Up",    // nome livre, mas se mapear pra uma skill canônica use:
                           //   "Muscle Up" | "MU" | "HS / Frog to HS" | "Frog to HS"
                           //   (ou "Folga" para treinos de prática/descanso)
  "duration": "~32 min",   // texto livre
  "accent": "#A89CFF",     // hex 6 dígitos — cor de destaque do treino
  "accent_bg": "#1E1B35",  // hex 6 dígitos — fundo combinando (mais escuro)
  "is_practice": false,    // true = treino de prática (técnica), não de força
  "warmup": "texto livre do aquecimento",
  "tip": "texto livre — dica/contexto do treino",
  "blocks": [ ...ver Block... ],
  "progression": [ ...ver Progression... ]
}

## Block (grupo de exercícios dentro do treino)
{
  "label": "Skill — Componentes do MU · 16 min",
  "is_skill": true,        // true = bloco de skill/técnica, false = bloco de suporte/acessório
  "exercises": [ ...ver Exercise... ]  // mínimo 1
}

## Exercise
{
  "id": "mu-puxada-explosiva",  // kebab-case, prefixo = skill (mu-, hs-, core-, legs-, row-, pull-up-, push-up-)
                                  // ÚNICO dentro do treino; pode repetir entre treinos (histórico agrega por id)
  "name": "Puxada explosiva",
  "target": "4 × 4",             // texto livre exibido (ex: "4 × 4", "2 × 20s", "8-10 entradas")
  "parsed": {                    // null se o target não for sets×alvo parseável (ex: ranges tipo "8-10 entradas")
    "sets": 4,
    "target": 4,
    "unit": "reps",              // "reps" | "seconds" | "attempts"
    "per_side": false            // true se o alvo é POR LADO (unilateral)
  },
  "obs": "instrução técnica de execução — o que prestar atenção",
  "rest": "descanso 120s",       // texto livre
  "flags": ["chegou no esterno", "parou no queixo", "kip apareceu"],
  // ↑ tags de observação pós-set que o usuário marca durante o treino (2-4 flags típico)
  "neg_flags": ["parou no queixo", "kip apareceu"],
  // ↑ OPCIONAL — subconjunto de \`flags\` que conta como execução "suja"/falha
  //   (usado pro motor de progressão saber se a tentativa foi limpa)
  "skill_ref": { "skill_id": "muscle_up", "level": 3 }
  // ↑ OPCIONAL — só se este exercício FOR o degrau da escada de uma skill (lista abaixo).
  //   O app avalia o critério daquele degrau (reps × RIR, hold limpo, tentativas) pra sugerir
  //   subir/descer. Use null quando NÃO for nenhum degrau (evita atrelar o exercício ao degrau errado).
  //   Omita se não tiver certeza. Só vale skill_id/level que existam na lista.
}

## Progression (fim do treino — o que evolui e quando)
{
  "exercise_id": "mu-puxada-explosiva",  // aponta pro id de um exercício do treino, OU null
  "label": "MU completo (barra alta)",   // OBRIGATÓRIO se exercise_id for null (marco sem exercício associado)
  "criteria": "texto livre — quando e como progredir esse exercício/marco"
}

## Skills e degraus válidos pra skill_ref (id: nível=nome)
${SKILL_LADDERS}

REGRAS IMPORTANTES:
- Todo objeto é "strict": não pode ter campos extras além dos listados.
- NÃO existe dia da semana. Não use weekday, nem "Seg/Ter/…", nem "dia" como estrutura.
- A ORDEM do array workouts[] é a sequência de treino: o app mostra o próximo como o
  seguinte ao último concluído, em volta do ciclo (A → B → C → A…).
- Não há limite de treinos: 2, 3, 5 ou 8, o que fizer sentido pro objetivo.
- id de treino ÚNICO no plano. Ao ajustar um plano existente, PRESERVE o id de cada treino
  que continua existindo: o histórico aponta pra ele. Crie id novo só pra treino novo.
- exercise_id duplicado dentro do MESMO treino é erro de validação.
- Se \`neg_flags\` existir, cada item dele TEM que estar também em \`flags\`.
- \`parsed\` só é preenchido quando dá pra extrair sets/target/unit numéricos limpos do \`target\`;
  senão usa null (ex.: "8-10 entradas" vira parsed: null).
- Se o alvo de reps/segundos for um INTERVALO (ex.: "6-8", "8-10s"), \`parsed\` é SEMPRE null —
  mesmo que dê pra estimar um teto (ex.: "3 × 6-8/lado" NÃO vira {sets:3, target:8, ...}).
  O app extrai sets e o piso do intervalo direto do texto de \`target\` em runtime.
- Se \`skill_ref\` existir e não for null, skill_id e level TÊM que existir na lista de degraus acima.
- Ao editar um plano existente, PRESERVE o \`skill_ref\` dos exercícios que você não mudou.
- Cores accent/accent_bg sempre hex de 6 dígitos, minúsculo ou maiúsculo, com #.

Meu treino:
`;
