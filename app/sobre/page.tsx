import type { Metadata } from "next";
import { APP_NAME, CONTACT_LABEL, CONTACT_URL } from "@/lib/appInfo";
import { TypedHeadline } from "@/components/landing/TypedHeadline";
import { OneTapDemo } from "@/components/landing/OneTapDemo";
import { ProofTiles } from "@/components/landing/ProofTiles";
import { LevelShowcase } from "@/components/landing/LevelShowcase";
import { LadderPreview } from "@/components/landing/LadderPreview";
import { SignalCard } from "@/components/landing/SignalCard";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { PrivacyPolicy } from "@/components/landing/PrivacyPolicy";
import { LandingCta } from "@/components/landing/LandingCta";
import { accentVars, DEFAULT_ACCENT } from "@/components/ui/accent";

/**
 * Primeiro contato de quem nunca abriu o app. É a única página do projeto que
 * não deriva do plano, e por isso a única que pode ser estática de verdade:
 * nada de `loadPlan()` aqui (regra 10) e nada de Dexie.
 *
 * O ritmo é alternado de propósito — bloco de texto curto, bloco de app — porque
 * a primeira versão virou textão. Quem carrega o argumento é a interface: o
 * cartão tocável, a escada, o sinal de progressão. O texto só amarra. A abertura
 * fica só com título e botão: o cartão ao lado dela poluía o primeiro olhar, e
 * desceu pra seção que fala do registro.
 */
export const metadata: Metadata = {
  title: `${APP_NAME} — treino de calistenia com plano e registro`,
  description:
    "Registre seus treinos de calistenia com um toque por série, acompanhe as progressões de cada movimento e veja sua evolução. Funciona sem internet.",
};

export default function SobrePage() {
  return (
    <div className="w-full" style={accentVars(DEFAULT_ACCENT)}>
      {/* ── Abertura ─────────────────────────────────────────────────── */}
      <header className="relative flex min-h-[85svh] items-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72"
          style={{
            background:
              "radial-gradient(70% 100% at 50% 0%, color-mix(in oklab, var(--ac) 20%, transparent), transparent)",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-5xl gap-8 px-4 sm:px-6 py-10 lg:py-16">
          <div>
            <p className="font-mono text-xs text-muted">{APP_NAME}</p>
            <TypedHeadline />
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
              Plano, registro e progressão de treino personalizados. É o que eu uso para evoluir na calistenia.
            </p>
          </div>

          <div className="lg:max-w-xs">
            <LandingCta />
          </div>
        </div>
      </header>

      {/* ── Durante o treino ─────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-center lg:gap-14">
            <div>
              <h2 className="display max-w-lg text-2xl leading-tight sm:text-3xl">
                Saiba o que treinar, sem complicação
              </h2>
              <p className="mt-3 max-w-lg leading-relaxed text-muted">
                Um toque pra começar, um toque por série.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm lg:max-w-none">
              <OneTapDemo />
            </div>
          </div>
          <div className="mt-8">
            <ProofTiles />
          </div>
        </div>
      </section>

      {/* ── Nível ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid gap-8 sm:grid-cols-2 sm:items-center sm:gap-12">
          <div>
            <h2 className="display text-2xl leading-tight sm:text-3xl">
              Do iniciante ao avançado
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Já segue um programa de treinamento? Sobe ele aqui. Ainda não tem? O Gravks monta um personalizado, a
              partir do seu nível e do que você tem pra treinar.
            </p>
          </div>
          <LevelShowcase />
        </div>
      </section>

      {/* ── Progressão ───────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
          <h2 className="display max-w-lg text-2xl leading-tight sm:text-3xl">
            A evolução vem em níveis e o Gravks te guia nessa jornada
          </h2>

          <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-10">
            <div>
              <p className="leading-relaxed text-muted">
                Cada movimento tem uma sequência de progressões. O Gravks traz 16 delas e marca onde
                você está em cada uma, conforme você treina e registra.
              </p>
              <div className="mt-5">
                <LadderPreview />
              </div>
            </div>

            <div>
              <p className="leading-relaxed text-muted">
                Bateu a meta definida? Ele avisa que dá
                pra subir de nível. O que trava a maioria não é força, é técnica e progressão.
              </p>
              <div className="mt-5">
                <SignalCard />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Resto do app ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="display text-2xl leading-tight sm:text-3xl">
          O que mais você vai ver no app
        </h2>
        <div className="mt-8">
          <FeatureGrid />
        </div>
      </section>

      {/* ── Quem fez / não é empresa ─────────────────────────────────── */}
      <section className="border-t border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid gap-8 sm:grid-cols-2 sm:gap-12">
            <div>
              <h2 className="display text-2xl leading-tight sm:text-3xl">Quem fez isso</h2>
              <p className="mt-4 leading-relaxed text-muted">
                Treino calistenia por conta própria desde o começo de 2024 e estudei muitos
                atletas de elite pra aprender execuções e progressões. Sou engenheiro e construí o Gravks para me ajudar a organizar os treinos e desenvolver movimentos avançados da calistenia.
              </p>
            </div>

            <div>
              <h2 className="display text-2xl leading-tight sm:text-3xl">
                Esse é um projeto sem fins lucrativos
              </h2>
              <p className="mt-4 leading-relaxed text-muted">
                Comecei em julho de 2026 e estou sempre atualizando o app. É de graça e sem
                anúncio. Meu objetivo é ajudar mais pessoas a progredir (se um dia tiver plano pago, é pra pagar o servidor). Se sentir falta
                de alguma coisa,{" "}
                {CONTACT_URL ? (
                  <a
                    href={CONTACT_URL}
                    className="text-ac underline underline-offset-4"
                  >
                    {CONTACT_LABEL}
                  </a>
                ) : (
                  "me manda"
                )}
                .
              </p>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <LandingCta />
          </div>

          <PrivacyPolicy accent={DEFAULT_ACCENT} />

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
