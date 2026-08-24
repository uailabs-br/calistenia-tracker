/**
 * Prompt pronto pra colar numa LLM (Claude etc.) pra gerar/ajustar um dia de
 * treino no formato que o app espera. Espelha `schema.ts` — se os campos do
 * plan.json mudarem, atualiza aqui também.
 */
export const AI_SCHEMA_PROMPT = `Vou te descrever um treino de calistenia. Formata a resposta EXATAMENTE no esquema JSON abaixo (é o formato que o app usa pra plan.json). Devolve só o JSON, sem explicação.

ESQUEMA DE TREINO — plan.json (calistenia app)

Estrutura: plan > days[] > blocks[] > exercises[]

## Day (um dia de treino)
{
  "weekday": 1-6,          // 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb (0=Dom, não usado hoje)
  "label": "Seg",          // abreviação do dia
  "title": "Muscle Up",    // título curto do dia
  "skill": "Muscle Up",    // nome livre, mas se mapear pra uma skill canônica use:
                           //   "Muscle Up" | "MU" | "HS / Frog to HS" | "Frog to HS"
                           //   (ou "Folga" para dias de prática/descanso)
  "duration": "~32 min",   // texto livre
  "accent": "#A89CFF",     // hex 6 dígitos — cor de destaque do dia
  "accent_bg": "#1E1B35",  // hex 6 dígitos — fundo combinando (mais escuro)
  "is_practice": false,    // true = dia de prática/folga, não treino de força
  "warmup": "texto livre do aquecimento",
  "tip": "texto livre — dica/contexto do dia",
  "blocks": [ ...ver Block... ],
  "progression": [ ...ver Progression... ]
}

## Block (grupo de exercícios dentro do dia)
{
  "label": "Skill — Componentes do MU · 16 min",
  "is_skill": true,        // true = bloco de skill/técnica, false = bloco de suporte/acessório
  "exercises": [ ...ver Exercise... ]  // mínimo 1
}

## Exercise
{
  "id": "mu-puxada-explosiva",  // kebab-case, prefixo = skill (mu-, hs-, core-, legs-, row-, pull-up-, push-up-)
                                  // ÚNICO dentro do dia; pode repetir entre dias (histórico agrega por id)
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
  "neg_flags": ["parou no queixo", "kip apareceu"]
  // ↑ OPCIONAL — subconjunto de \`flags\` que conta como execução "suja"/falha
  //   (usado pro motor de progressão saber se a tentativa foi limpa)
}

## Progression (fim do dia — o que evolui e quando)
{
  "exercise_id": "mu-puxada-explosiva",  // aponta pro id de um exercício do dia, OU null
  "label": "MU completo (barra alta)",   // OBRIGATÓRIO se exercise_id for null (marco sem exercício associado)
  "criteria": "texto livre — quando e como progredir esse exercício/marco"
}

REGRAS IMPORTANTES:
- Todo objeto é "strict": não pode ter campos extras além dos listados.
- exercise_id duplicado dentro do MESMO dia é erro de validação.
- Se \`neg_flags\` existir, cada item dele TEM que estar também em \`flags\`.
- \`parsed\` só é preenchido quando dá pra extrair sets/target/unit numéricos limpos do \`target\`;
  senão usa null (ex.: "8-10 entradas" vira parsed: null).
- Cores accent/accent_bg sempre hex de 6 dígitos, minúsculo ou maiúsculo, com #.

Meu treino:
`;
