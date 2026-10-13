/**
 * Demonstração visual de cada movimento: ilustrações do RepDB (repdb.co), pose
 * inicial e pose de pico (uma só em isometrias).
 *
 * As imagens NÃO moram no repo nem no bundle: são buscadas do host do dataset na
 * primeira vez que a pessoa abre "como executar" e ficam no cache do service
 * worker (ver app/sw.ts). A licença gratuita permite uso dentro de aplicativo com
 * crédito (Ajustes > Créditos) e proíbe republicar as imagens como dataset, por
 * isso só o mapa id → arquivo é versionado.
 *
 * Chave = id do catálogo (estável pra sempre). Exercício de plano gerado pela IA
 * com id livre simplesmente não tem mídia; só entra aqui o que é o MESMO
 * movimento (variação parecida mostraria a execução errada).
 */
const MEDIA_HOST = "https://exercise-dataset.com/images/flat/";

const MEDIA: Record<string, string[]> = {
  "dead-hang": ["dead-hang-main.webp"],
  "scapular-pull": ["scapular-pull-ups-start.webp", "scapular-pull-ups-peak.webp"],
  "row-inverso-barra-baixa": ["inverted-row-start.webp", "inverted-row-peak.webp"],
  "pull-up-negativa-lenta": ["negative-pull-ups-start.webp", "negative-pull-ups-peak.webp"],
  "chin-up": ["chin-ups-start.webp", "chin-ups-peak.webp"],
  "pull-up-pegada-larga": ["wide-grip-pull-ups-start.webp", "wide-grip-pull-ups-peak.webp"],
  "pull-up-lastro": ["weighted-pull-up-start.webp", "weighted-pull-up-peak.webp"],
  "archer-pull-up": ["archer-pull-ups-start.webp", "archer-pull-ups-peak.webp"],
  "mu-completo": ["muscle-ups-start.webp", "muscle-ups-peak.webp"],
  "muscle-up-argolas": ["ring-muscle-up-start.webp", "ring-muscle-up-peak.webp"],
  "fl-full-hold": ["front-lever-main.webp"],
  "bl-full-hold": ["back-lever-main.webp"],
  "push-up-inclinada": ["incline-push-ups-start.webp", "incline-push-ups-peak.webp"],
  "push-up-joelhos": ["knee-push-ups-start.webp", "knee-push-ups-peak.webp"],
  "push-up": ["push-up-start.webp", "push-up-peak.webp"],
  "push-up-declinada": ["decline-push-up-start.webp", "decline-push-up-peak.webp"],
  "push-up-diamante": ["diamond-push-ups-start.webp", "diamond-push-ups-peak.webp"],
  "push-up-arqueiro": ["archer-push-ups-start.webp", "archer-push-ups-peak.webp"],
  "pseudo-planche-push-up": ["pseudo-planche-push-ups-start.webp", "pseudo-planche-push-ups-peak.webp"],
  "pike-push-up": ["pike-push-ups-start.webp", "pike-push-ups-peak.webp"],
  "hspu-parede": ["handstand-push-ups-start.webp", "handstand-push-ups-peak.webp"],
  "hspu-livre": ["handstand-push-ups-start.webp", "handstand-push-ups-peak.webp"],
  "dip-banco": ["bench-dips-start.webp", "bench-dips-peak.webp"],
  "dip-paralelas": ["dips-start.webp", "dips-peak.webp"],
  "mu-straight-bar-dip": ["straight-bar-dips-start.webp", "straight-bar-dips-peak.webp"],
  "ring-dip": ["ring-dips-start.webp", "ring-dips-peak.webp"],
  "dip-lastro": ["weighted-dips-start.webp", "weighted-dips-peak.webp"],
  "full-planche": ["planche-main.webp"],
  "hs-livre": ["handstand-hold-main.webp"],
  "hf-full": ["human-flag-main.webp"],
  "plank": ["plank-main.webp"],
  "side-plank": ["side-plank-main.webp"],
  "hollow-hold": ["hollow-body-hold-main.webp"],
  "dead-bug": ["dead-bug-start.webp", "dead-bug-peak.webp"],
  "abdominal-crunch": ["crunches-start.webp", "crunches-peak.webp"],
  "leg-raise-chao": ["lying-leg-raise-start.webp", "lying-leg-raise-peak.webp"],
  "hanging-knee-raise": ["hanging-knee-raise-start.webp", "hanging-knee-raise-peak.webp"],
  "hanging-leg-raise": ["hanging-leg-raise-start.webp", "hanging-leg-raise-peak.webp"],
  "mu-toes-to-bar": ["toes-to-bar-start.webp", "toes-to-bar-peak.webp"],
  "core-l-sit-chao": ["l-sit-main.webp"],
  "core-l-sit-paralelas": ["l-sit-main.webp"],
  "v-sit": ["v-sit-main.webp"],
  "dragon-flag": ["dragon-flag-start.webp", "dragon-flag-peak.webp"],
  "agachamento": ["bodyweight-squat-start.webp", "bodyweight-squat-peak.webp"],
  "agachamento-salto": ["jump-squat-start.webp", "jump-squat-peak.webp"],
  "afundo": ["lunge-start.webp", "lunge-peak.webp"],
  "afundo-caminhando": ["walking-lunge-start.webp", "walking-lunge-peak.webp"],
  "agachamento-bulgaro": ["bulgarian-split-squat-start.webp", "bulgarian-split-squat-peak.webp"],
  "step-up": ["step-ups-start.webp", "step-ups-peak.webp"],
  "cossack-squat": ["cossack-squat-start.webp", "cossack-squat-peak.webp"],
  "wall-sit": ["wall-sit-main.webp"],
  "ponte-gluteo": ["glute-bridge-start.webp", "glute-bridge-peak.webp"],
  "ponte-gluteo-uma-perna": ["single-leg-glute-bridge-start.webp", "single-leg-glute-bridge-peak.webp"],
  "nordic-curl": ["nordic-hamstring-curl-start.webp", "nordic-hamstring-curl-peak.webp"],
  "elevacao-panturrilha": ["bodyweight-calf-raise-start.webp", "bodyweight-calf-raise-peak.webp"],
  "elevacao-panturrilha-unilateral": ["single-leg-calf-raise-start.webp", "single-leg-calf-raise-peak.webp"],
};

/** URLs das poses do exercício, na ordem de exibição, ou null se não há mídia. */
export function getExerciseMedia(exerciseId: string): string[] | null {
  const files = MEDIA[exerciseId];
  return files ? files.map((f) => MEDIA_HOST + f) : null;
}

/** Ids com mídia (usado nos testes pra pegar id de catálogo digitado errado). */
export function mediaExerciseIds(): string[] {
  return Object.keys(MEDIA);
}
