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

/**
 * Primeiro contato de quem nunca abriu o app. É a única página do projeto que
 * não deriva do plano, e por isso a única que pode ser estática de verdade:
 * nada de `loadPlan()` aqui (regra 10) e nada de Dexie.
 *
 * O ritmo é alternado de propósito — bloco de texto curto, bloco de app — porque
 * a primeira versão virou textão. Quem carrega o argumento é a interface: o
 * cartão tocável, a escada, o sinal de progressão. O texto só amarra.
 */
export const metadata: Metadata = {
  title: `${APP_NAME} — treino de calistenia com plano e registro`,
  description:
    "Registre seus treinos de calistenia com um toque por série, acompanhe as progressões de cada movimento e veja sua evolução. Funciona sem internet.",
};

const ACCENT = "#8174e8";

export default function SobrePage() {
  return (
    <div className="w-full" style={{ "--ac": ACCENT } as React.CSSProperties}>
      {/* ── Abertura ─────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72"
          style={{
            background:
              "radial-gradient(70% 100% at 50% 0%, color-mix(in oklab, var(--ac) 20%, transparent), transparent)",
          }}
        />
        <div className="relative mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 pt-10 pb-12 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-start lg:gap-14 lg:pt-20 lg:pb-16">
          <div className="lg:col-start-1 lg:row-start-1">
            <p className="font-mono text-xs text-muted">{APP_NAME}</p>
            <TypedHeadline />
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
              Plano, registro e progressão no mesmo app. É o que eu uso para evoluir na calistenia.
            </p>
          </div>

          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <OneTapDemo />
          </div>

          <div className="lg:col-start-1 lg:row-start-2 lg:max-w-xs">
            <LandingCta />
          </div>
        </div>
      </header>

      {/* ── Durante o treino ─────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-12">
          <h2 className="display max-w-lg text-2xl leading-tight sm:text-3xl">
            O treino do dia te espera na tela inicial
          </h2>
          <p className="mt-3 max-w-lg leading-relaxed text-muted">
            Um toque pra começar, um toque por série. Sem teclado, sem formulário.
          </p>
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
              Já segue um programa? Sobe ele aqui. Ainda não tem? O app monta um com IA, a
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
            A evolução vem em níveis, e o app sabe em qual você está
          </h2>

          <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-10">
            <div>
              <p className="leading-relaxed text-muted">
                Cada movimento tem uma sequência de progressões. O app traz 16 delas e marca onde
                você está em cada uma, conforme você registra.
              </p>
              <div className="mt-5">
                <LadderPreview />
              </div>
            </div>

            <div>
              <p className="leading-relaxed text-muted">
                Bateu o alvo duas sessões seguidas, com execução limpa? Ele avisa que dá
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
                Treino calistenia por conta própria desde o começo de 2024 e estudei muito
                atleta de elite pra aprender execução e progressão. Sou engenheiro, há 10
                anos na área de tecnologia, e usei IA pra construir a ferramenta que eu
                queria ter.
              </p>
            </div>

            <div>
              <h2 className="display text-2xl leading-tight sm:text-3xl">
                Isso aqui não é empresa
              </h2>
              <p className="mt-4 leading-relaxed text-muted">
                Comecei em julho de 2026 e mudo o app quase toda semana. É de graça e sem
                anúncio — se um dia tiver plano pago, é pra pagar o servidor. Sentiu falta
                de alguma coisa,{" "}
                {CONTACT_URL ? (
                  <a
                    href={CONTACT_URL}
                    className="underline underline-offset-4"
                    style={{ color: ACCENT }}
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

          <PrivacyPolicy accent={ACCENT} />

          <p className="mt-10 text-center font-mono text-[11px] text-muted">
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
