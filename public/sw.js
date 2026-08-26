self.addEventListener('install', (event) => {
  // Força o Service Worker recém-instalado a se tornar o ativo
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Faz com que o Service Worker tome controle das abas abertas imediatamente
  event.waitUntil(clients.claim());
  
  // Opcional: Limpa caches antigos de versões anteriores aqui
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});
const CACHE_NAME = 'kairos-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ESTRATÉGIA DE FETCH
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Navegação/HTML: network-first, para nunca prender o usuário numa build antiga
  // (com CACHE_NAME fixo, servir o index.html do cache indefinidamente fazia o app
  // parecer "sem atualizar" mesmo após novos deploys, já que ele referencia os
  // nomes hasheados antigos dos bundles JS/CSS).
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then((response) => response || fetch(event.request)));
});

// ==========================================
// NOVO: SISTEMA DE NOTIFICAÇÕES (PUSH)
// ==========================================

// 1. Ouvir a chegada de uma notificação
self.addEventListener('push', (event) => {
  let data = { title: 'Kairós Agenda', body: 'Você tem um novo compromisso!' };
  
  if (event.data) {
    data = event.data.json();
  }

  const options = {
    body: data.body,
    icon: '/icon-512.jpg', // Usando o ícone definido no seu manifest[cite: 5]
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 2. Ouvir o clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/') // Abre o app ao clicar
  );
});