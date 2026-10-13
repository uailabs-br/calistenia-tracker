import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, CacheableResponsePlugin, ExpirationPlugin, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false, // controlado por prompt de reload no cliente
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Demonstração dos exercícios (lib/plan/media.ts): sob demanda, nunca no
    // precache — o app instalado não engorda. O teto mantém o custo limitado
    // (~15 KB por imagem). Só resposta CORS 200: opaca é contada com padding.
    {
      matcher: ({ url }) => url.hostname === "exercise-dataset.com",
      handler: new CacheFirst({
        cacheName: "exercise-media",
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 120,
            maxAgeSeconds: 60 * 60 * 24 * 180,
            maxAgeFrom: "last-used",
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

// O cliente envia esta mensagem quando o usuário aceita atualizar.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

serwist.addEventListeners();
