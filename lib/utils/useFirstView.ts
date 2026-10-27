"use client";

import { useEffect, useState } from "react";

/** Telas que já abriram desde que o app carregou. Em memória de propósito: abrir o app de novo zera. */
const seen = new Set<string>();

/**
 * `true` só na primeira vez que a tela monta desde que o app abriu. É o que
 * decide se os números contam: contar toda vez que a pessoa volta pra aba
 * cansava e atrasava a leitura.
 *
 * Marca no efeito, não no inicializador: no StrictMode o inicializador roda duas
 * vezes, e a segunda já veria a tela como vista.
 */
export function useFirstView(key: string): boolean {
  const [first] = useState(() => !seen.has(key));
  useEffect(() => {
    seen.add(key);
  }, [key]);
  return first;
}
