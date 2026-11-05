import type { Metadata } from "next";
import { APP_NAME, CONTACT_EMAIL, CONTACT_URL } from "@/lib/appInfo";
import { OneTapDemo } from "@/components/landing/OneTapDemo";
import { LadderPreview } from "@/components/landing/LadderPreview";
import { SignalCard } from "@/components/landing/SignalCard";
import { Faq } from "@/components/landing/Faq";
import { PrivacyPolicy } from "@/components/landing/PrivacyPolicy";
import { LandingCta } from "@/components/landing/LandingCta";
import { SKILL_COUNT } from "@/components/landing/content";
import { accentVars, DEFAULT_ACCENT } from "@/components/ui/accent";

/**
 * Primeiro contato de quem nunca abriu o app. É a única página do projeto que
 * não deriva do plano, e por isso a única que pode ser estática de verdade:
 * nada de `loadPlan()` aqui (regra 10) e nada de Dexie.
 *
 * Fala com quem já treina e quer sair do básico, não com quem nunca treinou:
 * demo com treino intermediário, níveis e meta antes de tudo. Texto curto e em
 * primeira pessoa, decidido no protótipo (texto em docs/landing-copy.md). Na
 * página, o produto é "o Gravks", com habilidades, progressões e níveis.
 */
export const metadata: Metadata = {
  title: `${APP_NAME}: seu assistente de treino de calistenia`,
  description:
    "Saiba o que treinar e quando subir de nível. Plano pro seu nível, grátis e sem anúncio.",
};

const H2 = "display text-2xl leading-tight sm:text-3xl";
const LEDE = "mt-3 max-w-lg leading-relaxed text-muted";

export default function SobrePage() {
  return (
    <div className="w-full" style={accentVars(DEFAULT_ACCENT)}>
      {/* ── Abertura: a tela inteira ─────────────────────────────────── */}
      <header className="relative flex min-h-svh items-end overflow-hidden md:items-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72"
          style={{
            background:
              "radial-gradient(70% 100% at 50% 0%, color-mix(in oklab, var(--ac) 20%, transparent), transparent)",
          }}
        />
        {/* Duas fotos porque nenhuma serve nas duas telas: a parada de mão no celular
            jogava o tronco pra trás do botão. Com <picture>, cada aparelho baixa só a sua. */}
        <picture>
          <source media="(min-width: 768px)" srcSet="/landing/hero-parada-de-mao.webp" width={365} height={693} />
          <img
            src="/landing/hero-barra.webp"
            alt=""
            width={1000}
            height={1333}
            fetchPriority="high"
            className="landing-photo"
          />
        </picture>
        <div aria-hidden className="landing-photo-scrim" />
        <div className="landing-photo-text relative mx-auto grid w-full max-w-5xl gap-8 px-4 sm:px-6 py-10 lg:py-16">
          <div>
            <h1 className="display max-w-md text-4xl leading-[1.05] sm:text-5xl">
              Saiba o que treinar e quando subir de nível
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
              O {APP_NAME} personaliza seu treino e te acompanha até você bater sua meta. É o que eu uso pra
              evoluir na calistenia.
            </p>
          </div>

          <div className="md:max-w-xs">
            <LandingCta />
          </div>
        </div>
      </header>

      {/* ── Níveis ───────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 py-12 sm:grid-cols-2 sm:items-center sm:gap-12 sm:py-16">
          <div>
            <h2 className={H2}>Um nível de cada vez</h2>
            <p className={LEDE}>
              Cada habilidade é dividida em níveis, e cada nível tem uma meta clara. Bateu a meta, você sobe.
            </p>
            <p className="mt-3 text-sm text-muted">
              Barra fixa é só um exemplo. São {SKILL_COUNT} habilidades, da flexão à planche.
            </p>
          </div>
          <LadderPreview />
        </div>
      </section>

      {/* ── Aviso ────────────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 py-12 sm:grid-cols-2 sm:items-center sm:gap-12 sm:py-16">
        <div>
          <h2 className={H2}>Bateu a meta? O {APP_NAME} avisa</h2>
          <p className={LEDE}>Ele olha o que você registrou e te diz a hora de subir.</p>
        </div>
        <SignalCard />
      </section>

      {/* ── Demonstração ─────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 py-12 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-center lg:gap-14 sm:py-16">
          <div>
            <h2 className={H2}>Testa um treino aí</h2>
            <p className={LEDE}>Um toque por série. O descanso começa sozinho e sua última vez fica no cartão.</p>
          </div>
          <div className="mx-auto w-full max-w-sm lg:max-w-none">
            <OneTapDemo />
          </div>
        </div>
      </section>

      {/* ── Programa próprio ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
        <h2 className={H2}>Já segue um programa? Traz ele</h2>
        <p className={LEDE}>
          O {APP_NAME} te guia pra colocar seu programa aqui. Não tem? Ele te passa um pro seu nível.
        </p>
      </section>

      {/* ── Quem fez e perguntas ─────────────────────────────────────── */}
      <section className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid gap-6 sm:grid-cols-[15rem_1fr] sm:items-center sm:gap-8">
            {/* Preto e branco de propósito, pra conversar com o tema escuro da página. */}
            <img
              src="/landing/quem-fez.webp"
              alt={`O autor do ${APP_NAME} fazendo parada de mão na praia`}
              width={720}
              height={991}
              loading="lazy"
              className="aspect-[4/5] w-full rounded-card object-cover"
            />
            <div>
              <h2 className={H2}>Quem fez</h2>
              <p className="mt-3 leading-relaxed text-muted">
                Treino calistenia por conta própria desde o começo de 2024 e estudei muitos atletas de elite pra
                aprender execuções e progressões. Atualmente meu foco é muscle-up, parada de mão e front lever.
                Sou engenheiro e criei o {APP_NAME} em 2026 pra me ajudar a organizar meus treinos e progredir
                com consistência. Sigo usando e atualizando. Sentiu falta de algo? Me manda um e-mail:{" "}
                {CONTACT_URL ? (
                  <a href={CONTACT_URL} className="text-ac underline underline-offset-4">
                    {CONTACT_EMAIL}
                  </a>
                ) : (
                  CONTACT_EMAIL
                )}
              </p>
            </div>
          </div>

          <h2 className={`${H2} mt-14`}>Perguntas</h2>
          <Faq />

          <div className="mt-12">
            <LandingCta />
          </div>

          <PrivacyPolicy accent="var(--ac)" />

          <p className="mt-10 text-center font-mono text-2xs text-muted">
            Ilustrações dos exercícios por{" "}
            <a
              href="https://repdb.co"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              RepDB
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
