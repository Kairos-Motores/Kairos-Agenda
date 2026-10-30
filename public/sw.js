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
  let data = { title: 'Kairós Agenda', body: 'Você tem uma nova notificação!' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Kairós Agenda', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'Nova atualização no Kairós Agenda.',
    icon: '/icon-512.jpg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    tag: data.tag || `kairos-${Date.now()}`,
    renotify: true,
    requireInteraction: false,
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Kairós Agenda', options)
  );
});

// 2. Ouvir o clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});