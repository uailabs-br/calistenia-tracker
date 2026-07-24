import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Prompt-based update: novo SW espera até o app pedir skipWaiting
  // (fluxo já implementado em SwUpdater.tsx). reloadOnOnline desligado:
  // ele recarrega a página inteira a cada evento "online" do navegador,
  // mesmo sem SW novo — em sinal instável isso derruba sessão em
  // andamento e passa a impressão de o app ter travado/reiniciado.
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // esconde o overlay de dev do Next (cobria a navegação inferior no mobile)
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            // desabilita APIs sensíveis; wake lock (screen) segue permitido por padrão
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
