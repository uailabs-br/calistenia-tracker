import { planSchema, type Plan } from "./schema";
import { PLAN_OVERRIDE_KEY } from "./loader";
import { convertLegacyPlan, isLegacyPlan } from "./legacyPlan";
import { markPlanApplied } from "@/lib/utils/planSwap";

export interface PlanSummary {
  name: string;
  version: number;
  workouts: number;
  exercises: number;
}

/**
 * Por que a resposta foi recusada. A tela usa pra dizer UMA frase em linguagem
 * comum e montar o pedido de correção (`aiFixPrompt.ts`); `errors` segue sendo o
 * detalhe técnico, que fica escondido.
 */
export type ParseFailReason = "no-json" | "cut" | "invalid-json" | "schema";

export type ParsePlanResult =
  | { ok: true; plan: Plan; summary: PlanSummary }
  | { ok: false; reason: ParseFailReason; errors: string[] };

/**
 * Isola o JSON no meio do que a IA respondeu. O prompt pede só o objeto, mas na
 * prática vem "Aqui está o plano ajustado:" antes, um parágrafo de explicação
 * depois, ou os dois. Ordem: cerca de código em QUALQUER posição (antes só
 * valia quando a cerca era o texto inteiro, que é justo o caso que não
 * acontece), senão do primeiro "{" ao último "}".
 */
function extractJsonObject(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

/**
 * Tira o que a IA escreve junto do JSON e o `JSON.parse` não aceita: comentário
 * `//` e `/* *\/`, e vírgula sobrando antes de `}`/`]`. O esquema no prompt é
 * anotado com `//`, então a IA copiar essa forma é falha previsível — tolerar
 * é mais barato que pedir pra pessoa editar o JSON na mão.
 *
 * Varre caractere a caractere respeitando string literal: `obs` com "90°, // e
 * desce" ou uma URL `https://…` não podem ser mutilados. Devolve também quantas
 * chaves ficaram abertas, que é como se reconhece resposta cortada no meio.
 */
const JSON_ESCAPES = '"\\/bfnrtu';

function normalizeAiJson(src: string): { text: string; unclosed: number } {
  let out = "";
  let inString = false;
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inString) {
      if (c === "\\") {
        const next = src[i + 1] ?? "";
        // Escape que o JSON não conhece (`\~`, `\*`, `\_`…): a IA escapa
        // markdown dentro da string, e o `~` vem do próprio exemplo do prompt
        // ("~32 min"). Em JSON válido isso já seria erro, então tirar a barra
        // só conserta — nunca corrompe conteúdo legítimo.
        out += JSON_ESCAPES.includes(next) ? c + next : next;
        i++;
        continue;
      }
      out += c;
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i++;
      continue;
    }
    if (c === "{" || c === "[") depth++;
    if (c === "}" || c === "]") {
      depth--;
      // vírgula sobrando antes do fechamento (só fora de string)
      const trimmed = out.replace(/\s+$/, "");
      out = trimmed.endsWith(",") ? trimmed.slice(0, -1) : out;
    }
    out += c;
  }
  return { text: out, unclosed: Math.max(0, depth) };
}

/**
 * Mensagem de erro que diz o que fazer. "Não é JSON válido" sozinho deixa a
 * pessoa sem saída: resposta cortada (limite de saída do modelo) e resposta
 * suja pedem ações diferentes.
 */
function parseErrorMessage(raw: string, unclosed: number, err: unknown): string {
  if (unclosed > 0) {
    return (
      `A resposta parece cortada no meio — ${unclosed} chave(s) abertas sem fechar. ` +
      "Pede pra IA reenviar só o JSON; se cortar de novo, pede o plano com menos treinos por vez."
    );
  }
  const pos = Number(/position (\d+)/.exec(String((err as Error)?.message))?.[1]);
  const perto = Number.isFinite(pos)
    ? ` Perto de: …${raw.slice(Math.max(0, pos - 40), pos + 40).replace(/\s+/g, " ")}…`
    : "";
  return `Não parece ser um JSON válido — confira se copiou a resposta inteira.${perto}`;
}

export function summarize(plan: Plan): PlanSummary {
  const exercises = plan.workouts.reduce(
    (n, w) => n + w.blocks.reduce((m, b) => m + b.exercises.length, 0),
    0
  );
  return { name: plan.name, version: plan.version, workouts: plan.workouts.length, exercises };
}

/** Valida o JSON de um treino colado pelo usuário contra o mesmo schema do build. */
export function parsePlanInput(raw: string): ParsePlanResult {
  const extracted = extractJsonObject(raw);
  if (!extracted) {
    return {
      ok: false,
      reason: "no-json",
      errors: [
        "Não achei nenhum JSON na resposta — copia a resposta da IA inteira, com as chaves { } incluídas.",
      ],
    };
  }
  const { text, unclosed } = normalizeAiJson(extracted);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      reason: unclosed > 0 ? "cut" : "invalid-json",
      errors: [parseErrorMessage(text, unclosed, err)],
    };
  }

  // Plano no formato antigo (agenda por dia da semana) é convertido, não recusado.
  const result = planSchema.safeParse(isLegacyPlan(json) ? convertLegacyPlan(json) : json);
  if (!result.success) {
    return {
      ok: false,
      reason: "schema",
      errors: result.error.issues.map(
        (issue) => `${issue.path.join(".") || "(raiz)"}: ${issue.message}`
      ),
    };
  }

  return { ok: true, plan: result.data, summary: summarize(result.data) };
}

/**
 * Voltar ao plano padrão foi escolha explícita. Sem este registro, o PlanBoot
 * (lib/plan/boot.ts) reaplicaria o plano do histórico no boot seguinte e o botão
 * "Restaurar plano padrão" não faria nada. Aplicar um plano apaga o registro.
 */
const RECOVERY_OPT_OUT_KEY = "calistenia:plan-recovery-off";

/**
 * `recovered`: o PlanBoot reaplicando o plano do histórico num aparelho que o
 * perdeu. Não é uma troca — se carimbasse, o aviso de "já deu um ciclo desde a
 * última troca" reiniciaria a cada recuperação.
 */
export function applyPlan(plan: Plan, opts: { recovered?: boolean } = {}): void {
  localStorage.setItem(PLAN_OVERRIDE_KEY, JSON.stringify(plan));
  localStorage.removeItem(RECOVERY_OPT_OUT_KEY);
  if (!opts.recovered) markPlanApplied();
}

export function clearPlanOverride(): void {
  localStorage.removeItem(PLAN_OVERRIDE_KEY);
  localStorage.setItem(RECOVERY_OPT_OUT_KEY, "1");
  markPlanApplied();
}

export function hasRecoveryOptOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(RECOVERY_OPT_OUT_KEY) !== null;
  } catch {
    return false;
  }
}

export function hasPlanOverride(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PLAN_OVERRIDE_KEY) !== null;
}
