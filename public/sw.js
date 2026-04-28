const CACHE_NAME = 'kairos-v2'; // Alteramos a versão para forçar atualização
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

// Instalação e ativação imediata
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força o novo SW a assumir o controle imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Assume o controle das abas abertas
  );
});

// Estratégia: Tenta rede primeiro para Scripts/CSS, Cache para o resto
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Para arquivos JS e CSS do Vite (pasta assets), sempre tenta a rede primeiro
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Para o resto, usa cache com fallback para rede
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});