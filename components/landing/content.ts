/**
 * Conteúdo da landing que copia dados do app: níveis, critério, treino da demo e
 * contagem de habilidades. Fica escrito à mão porque a página é estática e não
 * carrega catálogo nem plano (regra 10), e fica num .ts à parte pra
 * `test/landingContent.test.ts` conferir contra `progressions.json` e a semente.
 * A página já mostrou um nível inventado e "16 sequências" quando eram 17.
 */

/** Total de habilidades em `lib/plan/progressions.json`. */
export const SKILL_COUNT = 17;

/** Barra fixa, níveis 3 a 5 do pull-up: o do meio é "seu nível". */
export const LADDER = {
  skillId: "pull_up",
  done: "Barra fixa negativa",
  here: "Barra fixa",
  next: "L-sit Pull-up",
  sets: 3,
  reps: 8,
  sessions: 2,
} as const;

/** Primeiro treino de `lib/plan/seeds/intermediario-com-barra.json`. */
export const DEMO_WORKOUT = {
  seedId: "seed-intermediario-com-barra",
  label: "A",
  title: "Puxar + Corpo inteiro",
  estimate: 27,
  /** Duração mostrada no fim da demo: um pouco abaixo da estimativa, como num treino de verdade. */
  minutes: 26,
} as const;

export const DEMO_EXERCISES = [
  { name: "Barra fixa", sets: [8, 8, 8], perSide: false, last: "8, 7, 6" },
  { name: "Flexão diamante", sets: [10, 10, 10], perSide: false, last: "10, 9, 8" },
  { name: "Pistol assistido (com apoio)", sets: [6, 6, 6], perSide: true, last: "6, 6, 5" },
  { name: "Elevação de joelhos na barra", sets: [10, 10, 10], perSide: false, last: "10, 10, 8" },
] as const;

export const FAQ = [
  {
    q: "Preciso baixar alguma coisa?",
    a: "Não. O Gravks abre direto no navegador. Se curtir, adiciona na tela inicial do celular e ele fica com ícone, igual aos outros.",
  },
  {
    q: "É grátis mesmo? Qual a pegadinha?",
    a: "Nenhuma. É grátis, sem anúncio e você nem precisa criar conta. Fiz pra mim e quero que ajude mais gente a progredir.",
  },
  {
    q: "Já treino. Vou ter que começar do zero?",
    a: "Não. Você conta em que nível está e o Gravks segue dali. Se chutar alto demais, dá pra ajustar depois em Nível e equipamento.",
  },
  {
    q: "E se eu não souber fazer um exercício?",
    a: "Todo exercício tem demonstração e dica de execução, pra você não ficar no achismo.",
  },
  {
    q: "Não tenho barra. Serve pra mim?",
    a: "Serve. Tem plano montado sem barra, com flexão, perna e parada de mão. Se arrumar uma barra depois, é só atualizar seu equipamento.",
  },
  {
    q: "Já passei do intermediário. Ainda vale?",
    a: "Vale. Os planos prontos vão até o intermediário, e daí pra frente o Gravks te guia a montar seu treino com IA, a partir do seu histórico.",
  },
  {
    q: "Como o Gravks sabe se fiz direito?",
    a: "No fim de cada exercício você marca se algo saiu errado, e só conta pra subir de nível o que saiu limpo.",
  },
  {
    q: "E se eu trocar de celular?",
    a: "Como não tem conta, seus treinos ficam no celular. Antes de trocar, salva um backup em Ajustes e abre no aparelho novo.",
  },
  {
    q: "De onde vêm as progressões?",
    a: "De referências conhecidas da calistenia, como o livro Overcoming Gravity e a rotina recomendada do r/bodyweightfitness.",
  },
] as const;
