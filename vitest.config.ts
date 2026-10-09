import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// O plano bundlado é o genérico (iniciante-com-barra), mas os testes de skill_ref,
// progressão e catálogo foram escritos contra o plano pessoal, cujas declarações
// (inclusive `skill_ref: null`) têm precedência sobre o mapeamento legado. Aponta
// as duas formas de import do plan.json pra ele. Quem precisa do arquivo bundlado
// de verdade (test/seeds.test.ts) lê do disco, sem passar por aqui.
const pessoal = resolve(__dirname, "lib/plan/plans/pessoal-mu-hs-fl.json");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^\.\/plan\.json$/, replacement: pessoal },
      { find: /^@\/lib\/plan\/plan\.json$/, replacement: pessoal },
      { find: "@", replacement: resolve(__dirname, ".") },
    ],
  },
  test: {
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.ts"],
  },
});
