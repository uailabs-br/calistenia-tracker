import type { ParseFailReason } from "./importPlan";

/**
 * Pedido de correção: vai pra MESMA conversa em que a IA respondeu, então não
 * repete o contrato de saída — ela já tem. A pessoa não precisa entender o que
 * deu errado no JSON; é mais barato a IA consertar do que ela editar à mão.
 */
const WHY: Record<ParseFailReason, string> = {
  "no-json": "O app não encontrou o JSON do plano na sua resposta.",
  cut: "Sua resposta veio cortada no meio: o JSON termina antes de fechar.",
  "invalid-json": "O JSON da sua resposta não é válido.",
  schema: "O app recusou o plano por estes motivos:",
};

/** Teto de erros listados: a validação pode gerar dezenas, e a IA só precisa do padrão. */
const MAX_ERRORS = 12;

export function buildFixPrompt(reason: ParseFailReason, errors: string[]): string {
  const lines = [WHY[reason]];
  if (reason === "schema") {
    const shown = errors.slice(0, MAX_ERRORS);
    lines.push(...shown.map((e) => `- ${e}`));
    if (errors.length > shown.length) {
      lines.push(`- e mais ${errors.length - shown.length} do mesmo tipo`);
    }
  }
  lines.push("");
  if (reason === "cut") {
    lines.push(
      "Reenvie o plano COMPLETO, em JSON compacto numa linha só, sem indentação. " +
        "Se ainda não couber, encurte os textos de `obs` e `tip`, mas não tire exercício."
    );
  } else {
    lines.push(
      "Corrija e reenvie o plano COMPLETO, seguindo o CONTRATO DE SAÍDA do primeiro pedido. " +
        "Só o JSON compacto: nada antes nem depois, sem cerca de código, sem comentário."
    );
  }
  return lines.join("\n");
}
