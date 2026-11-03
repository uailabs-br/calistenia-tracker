import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { DM_Sans, DM_Mono, Barlow_Condensed, Chakra_Petch, Exo_2, Geist } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/ui/BottomNav";
import { SwUpdater } from "@/components/ui/SwUpdater";
import { PageTransition } from "@/components/ui/PageTransition";
import { ToastProvider } from "@/components/ui/Toast";
import { PlanBoot } from "@/components/ui/PlanBoot";
import { AppMain } from "@/components/ui/AppMain";
import { ReloadWait } from "@/components/ui/ReloadWait";
import { Splash } from "@/components/ui/Splash";
import { SpaceSky } from "@/components/ui/SpaceSky";
import { APP_NAME } from "@/lib/appInfo";
import { RELOAD_WAIT_BOOT_SCRIPT } from "@/lib/utils/reloadWait";
import { SPLASH_BOOT_SCRIPT } from "@/lib/utils/splash";
import { BAR_COLOR, THEME_BOOT_SCRIPT } from "@/lib/utils/theme";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

// Display condensada: só títulos de página e números grandes (sessão/timer).
// Dois pesos, pra não pesar no bundle offline.
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

// Display do tema futurista. Sem preload: o arquivo só baixa quando o tema
// está ligado e alguma tela usa a fonte, então o padrão não paga por ela.
const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-chakra",
  display: "swap",
  preload: false,
});

// Display do tema espaço, no mesmo esquema da Chakra: só baixa com o tema ligado.
const exo = Exo_2({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-exo",
  display: "swap",
  preload: false,
});

// Fonte única do tema clean (texto, título e número), no mesmo esquema: só baixa
// com o tema ligado. Variável: um arquivo cobre do 200 do cronômetro ao 600 do título.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Registro de treino de calistenia, com plano e progressão.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  icons: {
    // SVG primeiro: na aba o A precisa encher o quadrado; no PNG de 192 ele tem a
    // margem do ícone de app e some a 16px. O PNG fica pra navegador sem SVG.
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: BAR_COLOR, // = --color-bg (metadata não lê variável CSS); o tema papel troca no boot
  width: "device-width",
  initialScale: 1,
  // zoom liberado (WCAG 1.4.4). Inputs usam 16px p/ evitar auto-zoom do iOS.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: os boot scripts marcam tema, abertura e espera no <html> antes do
    // React, então os atributos dele divergem do HTML estático de propósito (só este nível).
    <html
      lang="pt-BR"
      className={`${dmSans.variable} ${dmMono.variable} ${barlow.variable} ${chakra.variable} ${exo.variable} ${geist.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SPLASH_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: RELOAD_WAIT_BOOT_SCRIPT }} />
      </head>
      <body>
        <SpaceSky />
        <ToastProvider>
          <SwUpdater />
          <PlanBoot />
          <AppMain>
            <PageTransition>{children}</PageTransition>
          </AppMain>
          <BottomNav />
          <Splash />
          <ReloadWait />
        </ToastProvider>
        {/* Só pageview por rota: o treino fica no IndexedDB e nunca sai do aparelho.
            Visita offline não é contada (o envio falha sem rede), então o número fica abaixo do uso real. */}
        <Analytics />
      </body>
    </html>
  );
}
