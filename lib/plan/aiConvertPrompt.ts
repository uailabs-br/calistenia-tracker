import { AI_SCHEMA_PROMPT } from "./aiSchema";

/**
 * Pedido de CONVERSÃO: a pessoa já tem um treino (planilha, foto transcrita, texto
 * do personal) e quer que ele entre no app. Papel oposto ao do `AI_COACH_BRIEF`:
 * aqui a IA transcreve, não prescreve. Reusa o contrato de saída
 * (`AI_SCHEMA_PROMPT`) pra o resultado passar pela mesma validação e pelo mesmo
 * preview de qualquer outro plano.
 */
const CONVERT_BRIEF = `# PAPEL
Você é um assistente que TRANSCREVE o treino de calistenia de uma pessoa para o
formato de um aplicativo. Não é coach neste pedido: o treino é dela, e o seu
trabalho é fazê-lo caber no formato sem mudar o que ela faz.

# TAREFA
Leia a seção TREINO DA PESSOA, no fim, e responda com UM único JSON do plano
completo, no formato da seção CONTRATO DE SAÍDA. Nada antes nem depois dele —
sem "Aqui está", sem resumo, sem cerca de código, sem comentário \`//\` dentro do
JSON. Escreva o JSON **compacto**, sem indentação: JSON indentado dobra o tamanho
da resposta e é o que faz o modelo cortar a saída no meio.

# REGRAS DA CONVERSÃO
1. NÃO MELHORE O TREINO. Não troque exercício, não mude séries, repetições nem
   ordem, não acrescente nem remova nada. Se algo parecer errado, transcreva
   igual mesmo assim.
2. CADA TREINO DELA É UM \`workout\`. Mantenha a ordem; use a letra que ela já
   usa (A, B, C…) ou, se ela não deu nome, A, B, C… na ordem em que aparecem.
   \`workouts[]\` é o ciclo: não existe dia da semana no formato.
3. IDS. Se o movimento é um dos IDS JÁ CONHECIDOS PELO APP (lista no contrato),
   use esse id — é o que liga o histórico dela. Se não é, crie um id em
   kebab-case. O mesmo movimento em treinos diferentes usa o MESMO id.
4. ALVO NO FORMATO DO APP. "N × M" (ex: "3 × 8", "4 × 6-8/lado", "3 × 20s"). Se
   ela escreveu "3x8", "3 séries de 8", "8 reps 3 vezes", converta. Se não deu
   número de séries ou repetições, pergunte-se o que ela quis dizer e escolha o
   mais comum para o movimento, sem inflar volume.
5. O QUE ELA NÃO DISSE VOCÊ COMPLETA COM O MÍNIMO: \`rest\` em segundos pelo tipo
   do exercício (força e skill 90-120s, acessório 60s, isometria 45-60s),
   \`flags\` de execução (2 a 4, curtas e verificáveis), \`obs\` de uma frase e
   \`warmup\`/\`tip\` de uma linha. Isso é preenchimento de formato, não opinião
   sobre o treino.
6. \`skill_ref\` SÓ quando o exercício É o degrau de uma sequência de progressão do app e você tem
   certeza. Na dúvida, omita o campo. Um \`skill_ref\` errado faz o app avaliar o
   exercício pelo critério de outro movimento.
7. \`workout.skill\`: use um dos rótulos listados no contrato se o treino gira em
   torno de uma skill delas; senão escreva o foco do treino em texto livre.
8. CORES. Dê a cada treino um par accent/accent_bg diferente, escuros no fundo:
   #8174E8/#1D1B2B · #7FD1AE/#14241E · #F2B366/#2A2014 · #E88FB0/#2A1A21 ·
   #6FB8F2/#14212B.
9. PLANO. \`id\` em kebab-case com o nome dela (ex: "treino-do-joao-2026-10"),
   \`version\` 1, \`source\` "importado-ia", \`imported_at\` com a data de hoje.
`;

const CONVERT_CHECKLIST = `# ANTES DE RESPONDER, CONFIRA
- Só o JSON, parseável, compacto, sem cerca de código e sem comentário \`//\`.
- O JSON fecha todas as chaves. Se a resposta for longa, corte explicação, nunca o
  JSON — plano cortado no meio o app não consegue aplicar.
- Campos de topo presentes: id, version, name, source, imported_at, workouts.
- Mesma quantidade de treinos, exercícios, séries e repetições do TREINO DA PESSOA.
- Todo \`target\` no formato "N × M". Todo \`rest\` em segundos.
- \`parsed\` null em todo alvo com intervalo; preenchido em todo exercício com
  \`skill_ref\`.
- \`neg_flags\` é subconjunto exato de \`flags\`; nenhum id repetido dentro do mesmo
  treino.
`;

/**
 * Prompt de conversão completo, pronto pra colar numa IA externa: papel → regras →
 * contrato de saída → checklist → treino da pessoa. O texto dela vai por ÚLTIMO,
 * junto da data, pelo mesmo motivo do prompt de coach: é o que a IA lê logo antes de
 * responder.
 */
export function buildConvertPrompt(userWorkout: string, today: string): string {
  return [
    CONVERT_BRIEF,
    AI_SCHEMA_PROMPT,
    CONVERT_CHECKLIST,
    `# DATA DE HOJE\n${today}\n`,
    `# TREINO DA PESSOA\n${userWorkout.trim()}\n`,
  ].join("\n");
}
