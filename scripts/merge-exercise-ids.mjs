// Junta no histórico ids diferentes do MESMO movimento (a IA inventou um id pra
// algo que o catálogo já tinha). Lê um backup exportado pelo app (Ajustes →
// Seus dados → Fazer backup), troca os ids e grava um backup novo pra importar de volta.
//
//   node scripts/merge-exercise-ids.mjs backup.json            # pares padrão
//   node scripts/merge-exercise-ids.mjs backup.json velho=novo # pares próprios
//
// Por que backup e não migração do Dexie: os pares são do histórico de UMA
// pessoa, não do app — uma tabela de alias no código valeria pra todo mundo e
// ficaria lá pra sempre. O import do app é merge por updated_at, então basta
// carimbar agora nos registros trocados pra eles vencerem os locais.
//
// O que NÃO muda: o snapshot (nome e alvo do dia continuam os de quando foi
// feito, regra 5) e os campos de skill. Log gravado sem skill continua sem — dá
// pra recalcular o critério de um log antigo, mas não o placar de tentativas que
// ele nunca registrou.
import { readFileSync, writeFileSync } from "node:fs";

const DEFAULT_PAIRS = {
  "mu-false-grip-pull-up": "mu-false-grip-pullup",
  "mu-jumping-mu": "mu-jumping-barra-baixa",
  "legs-pistol-squat": "legs-pistol-split-squat",
  "pull-dumbbell-row": "remada-halter",
  "core-hanging-knee-raise": "hanging-knee-raise",
};

const [input, ...pairArgs] = process.argv.slice(2);
if (!input) {
  console.error("uso: node scripts/merge-exercise-ids.mjs <backup.json> [velho=novo ...]");
  process.exit(1);
}
const pairs = pairArgs.length
  ? Object.fromEntries(pairArgs.map((p) => p.split("=")))
  : DEFAULT_PAIRS;

const backup = JSON.parse(readFileSync(input, "utf8"));
if (backup.format !== "calistenia-tracker-backup") {
  console.error("Não parece um backup do app (campo format).");
  process.exit(1);
}

const now = Date.now();
const live = backup.exerciseLogs.filter((l) => !l.deleted_at);
const taken = new Set(live.map((l) => `${l.session_id}|${l.exercise_id}`));
const count = Object.fromEntries(Object.keys(pairs).map((k) => [k, 0]));
const collisions = [];

for (const log of backup.exerciseLogs) {
  const to = pairs[log.exercise_id];
  if (!to) continue;
  // O app guarda um log vivo por (sessão, exercício): se a sessão já tem o id
  // novo, trocar criaria dois. Raro (os dois ids no mesmo treino) e ambíguo —
  // fica como está, pra decidir na mão.
  if (!log.deleted_at && taken.has(`${log.session_id}|${to}`)) {
    collisions.push(`${log.session_id}: ${log.exercise_id} e ${to} na mesma sessão`);
    continue;
  }
  count[log.exercise_id] += 1;
  log.exercise_id = to;
  log.updated_at = now;
}

let sessionsTouched = 0;
for (const s of backup.sessions) {
  if (!s.added_exercises?.some((id) => pairs[id])) continue;
  s.added_exercises = [...new Set(s.added_exercises.map((id) => pairs[id] ?? id))];
  s.updated_at = now;
  sessionsTouched += 1;
}

// A ordem do front lever mudou (One Leg virou 3, Straddle virou 4): log gravado
// num desses níveis antes da troca passa a significar o outro degrau.
const flSwapped = live.filter(
  (l) => l.skill_id === "front_lever" && (l.level_at_time === 3 || l.level_at_time === 4)
);

const output = input.replace(/\.json$/, "") + "-ids-unificados.json";
writeFileSync(output, JSON.stringify(backup));

for (const [from, n] of Object.entries(count)) console.log(`${from} → ${pairs[from]}: ${n} registros`);
if (sessionsTouched) console.log(`${sessionsTouched} sessões com exercício acrescentado atualizadas`);
for (const c of collisions) console.log(`não trocado (colisão): ${c}`);
if (flSwapped.length) {
  console.log(
    `atenção: ${flSwapped.length} registro(s) de front lever nos níveis 3/4, gravados antes da troca de ordem`
  );
}
console.log(`\ngravado em ${output} — importe em Ajustes → Seus dados → Restaurar backup.`);
