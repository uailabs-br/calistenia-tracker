import { ChevronDownIcon } from "@/components/ui/icons";
import { CONTACT_LABEL, CONTACT_URL } from "@/lib/appInfo";

/** Data da última revisão do texto. Mexeu no conteúdo, mexe aqui. */
const UPDATED_AT = "23/10/2026";

/**
 * Cada item é uma pergunta que esse tipo de documento precisa responder, em uma
 * ou duas linhas. O texto descreve o que o app faz HOJE: sem servidor, sem conta,
 * sem analytics. Se isso mudar (sync, métrica de uso), este arquivo muda antes do
 * código — prometer coleta que não existe é tão errado quanto esconder a que existe.
 *
 * `<details>` nativo, e não um componente cliente: a /sobre é a única página
 * prerenderizada de verdade e não deve virar cliente só pra abrir uma seção.
 */
const ITEMS: { title: string; body: string }[] = [
  {
    title: "Quais dados existem",
    body: "Seus treinos, séries, notas, nome, metas e preferências. Ficam guardados neste aparelho, no armazenamento do navegador. Não pedimos e-mail, telefone nem conta.",
  },
  {
    title: "Pra onde eles vão",
    body: "Hoje, pra lugar nenhum. O app não tem servidor, não tem anúncio, não tem rastreador e não vende dado de ninguém.",
  },
  {
    title: "Pra que são usados",
    body: "Só pra o app funcionar pra você: retomar o treino, mostrar sua evolução e dizer quando dá pra progredir. Se um dia o app passar a medir o uso pra se aprimorar, será só pra isso, e o aviso entra aqui antes.",
  },
  {
    title: "A única conexão externa",
    body: "As ilustrações dos exercícios vêm do RepDB. Ao carregá-las, esse site enxerga seu IP e seu navegador, como em qualquer imagem na web. Depois de baixadas, ficam no aparelho.",
  },
  {
    title: "Quando você usa uma IA",
    body: "O pedido que o app copia leva o seu histórico de treino. Ele só sai do aparelho se você colar numa IA, e o que ela faz com isso segue a política dela, não esta. Você decide onde colar, ou não colar.",
  },
  // Só existe com canal de contato: o texto descreve o que o app faz hoje.
  ...(CONTACT_URL
    ? [
        {
          title: "Quando você manda feedback",
          body: "A mensagem já vem com a versão do app, o treino em uso, quantos treinos você registrou e o tipo de aparelho. Ela só sai quando você envia, e dá pra apagar qualquer parte antes.",
        },
      ]
    : []),
  {
    title: "Backup",
    body: "É um arquivo que você baixa e guarda onde quiser. O app não envia a lugar nenhum.",
  },
  {
    title: "Como apagar",
    body: "Ajustes > Apagar todos os dados limpa tudo. Desinstalar o app ou limpar os dados do site no navegador também.",
  },
  {
    title: "Saúde e idade",
    body: "O app registra treino, não prescreve nem substitui um profissional. Treine no seu limite. Menores de 18 anos devem usar com o aval de um responsável.",
  },
  {
    title: "Aceite e mudanças",
    body: "Ao baixar e usar o app, você concorda com estes termos. Se eles mudarem, a data abaixo muda.",
  },
];

export function PrivacyPolicy({ accent }: { accent: string }) {
  return (
    <details className="group mx-auto mt-12 max-w-2xl rounded-card border border-border bg-surface/60">
      <summary className="tap flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
        Política de privacidade e termos de uso
        <ChevronDownIcon className="h-4 w-4 shrink-0 -rotate-90 text-muted transition-transform duration-200 group-open:rotate-0" />
      </summary>

      <div className="border-t border-border px-4 pb-5 pt-4">
        <p className="text-sm leading-relaxed text-muted">
          Resumo: seus dados de treino ficam no seu aparelho e não são enviados pra mim.
          Usar o app é concordar com o que está abaixo.
        </p>
        <dl className="mt-4 flex flex-col gap-4">
          {ITEMS.map((item) => (
            <div key={item.title}>
              <dt className="text-sm font-medium" style={{ color: accent }}>
                {item.title}
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">{item.body}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 font-mono text-[11px] text-muted">
          Atualizado em {UPDATED_AT}
          {CONTACT_URL && (
            <>
              {" · "}
              <a href={CONTACT_URL} className="underline underline-offset-4">
                {CONTACT_LABEL}
              </a>
            </>
          )}
        </p>
      </div>
    </details>
  );
}
