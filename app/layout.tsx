import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/ui/BottomNav";
import { SwUpdater } from "@/components/ui/SwUpdater";
import { PageTransition } from "@/components/ui/PageTransition";
import { ToastProvider } from "@/components/ui/Toast";
import { PlanBoot } from "@/components/ui/PlanBoot";
import { AppMain } from "@/components/ui/AppMain";

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

const APP_NAME = "Calistenia Tracker";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Registro de treino de calistenia (MU + HS)",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0e0f",
  width: "device-width",
  initialScale: 1,
  // zoom liberado (WCAG 1.4.4). Inputs usam 16px p/ evitar auto-zoom do iOS.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${dmSans.variable} ${dmMono.variable} ${barlow.variable}`}>
      <body>
        <ToastProvider>
          <SwUpdater />
          <PlanBoot />
          <AppMain>
            <PageTransition>{children}</PageTransition>
          </AppMain>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
