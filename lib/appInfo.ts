/**
 * Nome e contato do app num lugar só. O layout e a página /sobre leem daqui,
 * então trocar o nome é uma linha — não uma caçada por string repetida.
 */
export const APP_NAME = "Gravks";

/**
 * Canal pra quem quer mandar feedback. Com ele, a home pode convidar pro feedback,
 * Ajustes ganha "Mandar feedback" e a política mostra o item de feedback. `null`
 * desliga tudo isso de volta, sem deixar link morto. O e-mail é provisório
 * (decisão de 05/11/2026): um endereço só do Gravks pode substituir depois.
 */
export const CONTACT_EMAIL = "uailabs.br@gmail.com";
export const CONTACT_URL: string | null = `mailto:${CONTACT_EMAIL}`;
export const CONTACT_LABEL = "me manda uma mensagem";
