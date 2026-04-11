// =============================================================
// CongregaFiel — Service Worker
// Offline support, caching strategies e background sync
// =============================================================

const CACHE_NOME_ESTERNO = "congregafiel-v1";
const CACHE_NOME_DINAMICO = "congregafiel-dinamico-v1";
const CACHE_NOME_OFFLINE = "congregafiel-offline-v1";

// Arquivos estáticos a fazer pre-cache (instalação)
const ARQUIVOS_PRECACHE = [
  "/",
  "/index.html",
  "/index.css",
  "/index.js",
  "/favicon.svg",
  "/offline.html",
  "/autenticacao/login.html",
  "/autenticacao/login.css",
  "/autenticacao/login.js",
  "/autenticacao/criar-conta.html",
  "/autenticacao/criar-conta.css",
  "/autenticacao/criar-conta.js",
];

// -------------------------------------------------------
// INSTALL: Criar cache e fazer pre-cache de arquivos
// -------------------------------------------------------
self.addEventListener("install", (event) => {
  console.log("[SW] Install event disparado");

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NOME_ESTERNO);
        
        // Adicionar todos os arquivos ao cache
        await cache.addAll(ARQUIVOS_PRECACHE);
        
        // Forçar o SW ativar imediatamente
        await self.skipWaiting();
        
        console.log("[SW] Pre-cache concluído com sucesso");
      } catch (err) {
        console.error("[SW] Erro durante install:", err);
      }
    })()
  );
});

// -------------------------------------------------------
// ACTIVATE: Limpar caches antigos
// -------------------------------------------------------
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate event disparado");

  event.waitUntil(
    (async () => {
      try {
        const nomesCaches = await caches.keys();
        
        // Deletar caches que não são os ativos
        const deletarCaches = nomesCaches
          .filter(nome =>
            nome !== CACHE_NOME_ESTERNO &&
            nome !== CACHE_NOME_DINAMICO &&
            nome !== CACHE_NOME_OFFLINE
          )
          .map(nome => caches.delete(nome));

        await Promise.all(deletarCaches);
        console.log("[SW] Limpeza de caches antigos concluída");
        
        // Reivindicar todos os clientes
        await self.clients.claim();
      } catch (err) {
        console.error("[SW] Erro durante activate:", err);
      }
    })()
  );
});

// -------------------------------------------------------
// FETCH: Estratégias de cache
// -------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. APIs dinâmicas: Network-First (com fallback cache)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // 2. Arquivos estáticos (.css, .js, imagens, svg): Cache-First
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp")
  ) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // 3. HTML: Stale-While-Revalidate
  if (request.destination === "document" || url.pathname.endsWith(".html")) {
    event.respondWith(staleWhileRevalidateStrategy(request));
    return;
  }

  // Fallback padrão
  event.respondWith(networkFirstStrategy(request));
});

// -------------------------------------------------------
// ESTRATÉGIA 1: Cache-First (melhor para estáticos)
// -------------------------------------------------------
async function cacheFirstStrategy(request) {
  try {
    // Verificar cache primeiro
    const cached = await caches.match(request);
    if (cached) {
      console.log(`[SW] Cache hit: ${request.url}`);
      return cached;
    }

    // Não está em cache, buscar da rede
    const response = await fetch(request);
    
    // Cachear se for sucesso
    if (response.ok) {
      const cache = await caches.open(CACHE_NOME_DINAMICO);
      cache.put(request, response.clone());
    }

    return response;
  } catch (err) {
    console.error(`[SW] Erro em cache-first: ${request.url}`, err);
    // Retornar resposta offline
    return new Response("Conteúdo não disponível offline", { status: 503 });
  }
}

// -------------------------------------------------------
// ESTRATÉGIA 2: Network-First (melhor para APIs)
// -------------------------------------------------------
async function networkFirstStrategy(request) {
  try {
    // Tentar rede primeiro
    const response = await fetch(request);
    
    // Se sucesso, cachear
    if (response.ok) {
      const cache = await caches.open(CACHE_NOME_DINAMICO);
      cache.put(request, response.clone());
    }

    return response;
  } catch (err) {
    // Falhou na rede, usar cache
    console.log(`[SW] Network falhou, usando cache: ${request.url}`);
    
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Nenhum cache disponível
    return new Response(
      JSON.stringify({
        erro: "Offline - dados não disponíveis",
        detalhes: "Verifique sua conexão de internet",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

// -------------------------------------------------------
// ESTRATÉGIA 3: Stale-While-Revalidate (melhor para HTML)
// -------------------------------------------------------
async function staleWhileRevalidateStrategy(request) {
  try {
    // Retornar cache imediatamente se disponível
    const cached = await caches.match(request);
    
    // Revalidar em background
    const responsePromise = fetch(request).then((response) => {
      if (response.ok) {
        const cache = caches.open(CACHE_NOME_ESTERNO);
        cache.then((c) => c.put(request, response.clone()));
      }
      return response;
    });

    // Retornar cache ou aguardar rede
    return cached || responsePromise;
  } catch (err) {
    console.error(`[SW] Erro em stale-while-revalidate:`, err);
    
    const cached = await caches.match(request);
    if (cached) return cached;

    // Retornar página offline como fallback
    return caches.match("/offline.html");
  }
}

// -------------------------------------------------------
// MESSAGE: Comunicação com clientes
// -------------------------------------------------------
self.addEventListener("message", (event) => {
  const { type } = event.data;

  if (type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (type === "CLEAR_CACHE") {
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(nomes.map(nome => caches.delete(nome)));
      event.ports[0].postMessage({ cleared: true });
    })();
  }
});

console.log("[SW] Service Worker registrado e ativo");
