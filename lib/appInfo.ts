/**
 * Nome e contato do app num lugar só. O layout e a página /sobre leem daqui,
 * então trocar o nome é uma linha — não uma caçada por string repetida.
 */
export const APP_NAME = "Gravks";

/**
 * Canal pra quem quer mandar feedback. `null` enquanto não houver um: a página
 * /sobre esconde o link e mantém o texto, em vez de prometer um destino morto.
 */
export const CONTACT_URL: string | null = null;
export const CONTACT_LABEL = "me manda uma mensagem";
