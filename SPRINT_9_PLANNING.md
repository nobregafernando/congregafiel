# Sprint 9 - Plano de Execução: Autenticação na Borda + PWA

**Data:** 11 de abril de 2026  
**Responsáveis:** João Pedro, Gabriel  
**Período:** Semana 5-6  
**Entregável:** v9.0.0-RC1

---

## 📋 Sumário Executivo

Sprint 9 centraliza a autenticação em JWT na API Gateway (ponto único) e implementa PWA com offline support. Quebrada em **6 tasks principais** com 18 subtarefas.

### Objetivos
1. ✅ JWT validado centralmente no Gateway (não em cada microserviço)
2. ✅ Token blacklist para logout/revogação imediata
3. ✅ Service Worker com cache strategies
4. ✅ PWA instalável offline com manifest.json

### Métricas
- **Testes**: 12+ novos (total passando ~103)
- **Cobertura**: Manter ≥85%
- **Lighthouse**: ≥90 (Performance + Accessibility)
- **Versão**: v9.0.0-RC1

---

## 🎯 Task Breakdown

### **Task 1: Centralizar JWT na API Gateway** (6-8h)

#### Objetivo
Mover validação JWT do middleware local para o Gateway, garantindo:
- ✅ Validação uniforme para TODOS os microserviços
- ✅ Token rejeitado globalmente se na blacklist
- ✅ Refresh token flow centralizado

#### Subtasks

**1.1 - Criar middleware JWT centralizado do Gateway** (2h)
- **Status**: `not-started`
- **Arquivo**: `microservices/api-gateway/middlewares/jwt-gateway.js` (novo)
- **O que fazer**:
  - Copiar lógica de `api-express/middlewares/jwt.js`
  - **Adicionar verificação de blacklist**: consultar Supabase antes de aceitar
  - Decodificar JWT com SUPABASE_JWT_SECRET
  - Anexar `req.usuario` com payload decodificado
  - Retornar 401 se token inválido ou revogado
  
**Código esperado**:
```javascript
const verificarJwtGateway = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ erro: "Token não fornecido" });
  
  try {
    // 1. Validar assinatura
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    
    // 2. Verificar blacklist no Supabase
    const { data: estaRevogado } = await supabase
      .from("token_blacklist")
      .select("*")
      .eq("token_jti", payload.jti)
      .single();
    
    if (estaRevogado) {
      return res.status(401).json({ erro: "Token revogado" });
    }
    
    req.usuario = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    res.status(401).json({ erro: "Token inválido" });
  }
};
```

**Validação**: ✅ Middleware exporta função, sem erros de syntax

---

**1.2 - Integrar JWT no gateway.js (aplicar em rotas protegidas)** (1.5h)
- **Status**: `not-started`
- **Arquivo**: `microservices/api-gateway/gateway.js`
- **O que fazer**:
  - Importar `verificarJwtGateway` 
  - Aplicar ANTES do proxy em rotas protegidas:
    - `/api/membros` → JWT obrigatório
    - `/api/eventos` → JWT obrigatório
    - `/api/contribuicoes` → JWT obrigatório
    - `/api/comunicados` → JWT obrigatório
    - `/api/pedidos-oracao` → JWT obrigatório
  - Deixar públicas:
    - `/api/auth/login` 
    - `/api/auth/cadastro`
    - `/api/igrejas/publicas`

**Padrão esperado**:
```javascript
app.use("/api/membros", verificarJwtGateway, criarProxy(SERVICOS.members));
app.use("/api/eventos", verificarJwtGateway, criarProxy(SERVICOS.events));
```

**Validação**: ✅ Gateway inicia sem erros, rota /health funciona

---

**1.3 - Atualizar auth-service para usar blacklist no logout** (1.5h)
- **Status**: `not-started`
- **Arquivo**: `microservices/services/auth-service/index.js`
- **O que fazer**:
  - Criar rota `POST /api/auth/logout`
  - Extrair token do header Authorization
  - Decodificar o token para obter `jti` (JWT ID)
  - Inserir na tabela `token_blacklist` do Supabase:
    - token_jti (string, unique)
    - usuario_id (UUID)
    - revogado_em (timestamp)
    - motivo ("logout", "revogacao_admin", etc)
  - Retornar 200 OK

**Rota esperada**:
```javascript
app.post("/api/auth/logout", verificarJwt, async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const decoded = jwt.decode(token);
  
  await supabase
    .from("token_blacklist")
    .insert({
      token_jti: decoded.jti,
      usuario_id: req.usuario.id,
      revogado_em: new Date().toISOString(),
      motivo: "logout"
    });
  
  res.json({ mensagem: "Logout realizado" });
});
```

**Validação**: ✅ Rota POST /api/auth/logout responde 200

---

**1.4 - Criar testes para JWT centralizado** (2h)
- **Status**: `not-started`
- **Arquivo**: `tests/unit/api-express/gateway-jwt.test.js` (novo)
- **O que fazer**:
  - T1: Token válido aceito → req.usuario setado
  - T2: Token inválido rejeitado → 401
  - T3: Token revogado rejeitado → 401
  - T4: Token expirado rejeitado → 401
  - T5: Header Authorization faltante → 401
  - T6: Bearer malformado → 401
  - T7: POST /api/auth/logout insere na blacklist
  - T8: Logout remove acesso com mesmo token

**Validação**: ✅ `npm test -- gateway-jwt.test.js` = 8/8 passando

---

### **Task 2: Implementar Token Blacklist (Supabase)** (4-5h)

#### Objetivo
Criar estrutura de dados de revogação imediata de tokens com validação no Gateway.

#### Subtasks

**2.1 - Criar tabela token_blacklist no Supabase** (1h)
- **Status**: `not-started`
- **Arquivo**: `database/migrations/create-token-blacklist.sql` (novo)
- **Schema**:
```sql
CREATE TABLE token_blacklist (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  token_jti TEXT UNIQUE NOT NULL,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  revogado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  motivo TEXT CHECK (motivo IN ('logout', 'revogacao_admin', 'senha_alterada', 'expiracao_forcada')),
  expira_em TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_blacklist_jti ON token_blacklist(token_jti);
CREATE INDEX idx_token_blacklist_usuario ON token_blacklist(usuario_id);
CREATE INDEX idx_token_blacklist_revogado ON token_blacklist(revogado_em);
```

**Validação**: ✅ Tabela `token_blacklist` criada, índices ativos

---

**2.2 - Implementar políticas RLS (Row Level Security)** (1.5h)
- **Status**: `not-started`
- **Arquivo**: `database/migrations/rls-token-blacklist.sql` (novo)
- **Políticas**:
  - SELECT: Admin pode ler toda blacklist; usuarios comuns veem só their own
  - INSERT: Apenas auth-service pode inserir
  - DELETE: Apenas admin pode deletar (ou trigger automático expiracao_em)

```sql
ALTER TABLE token_blacklist ENABLE ROW LEVEL SECURITY;

-- Admin pode ler tudo
CREATE POLICY "admin_select_blacklist" ON token_blacklist
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Usuario comum vê just their tokens
CREATE POLICY "user_select_own_blacklist" ON token_blacklist
  FOR SELECT USING (usuario_id = auth.uid());

-- Apenas auth-service insere (verificar via auth context)
CREATE POLICY "insert_blacklist" ON token_blacklist
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'auth-service'));

-- Limpeza automática de tokens expirados via cron
CREATE OR REPLACE FUNCTION limpar_tokens_expirados()
RETURNS void AS $$
BEGIN
  DELETE FROM token_blacklist WHERE expira_em < NOW();
END;
$$ LANGUAGE plpgsql;
```

**Validação**: ✅ RLS policies criadas, SELECT funciona auth-aware

---

**2.3 - Integrar Supabase client no gateway** (1h)
- **Status**: `not-started`
- **Arquivo**: `microservices/api-gateway/supabase-client.js` (novo)
- **O que fazer**:
  - Criar exports para: createClient, verificarRevogacao
  - Usar SUPABASE_URL + SUPABASE_SERVICE_KEY (em env)
  - Implementar cache em memória (5 min TTL) para blacklist → performance

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Cache em memória (token_jti → isRevogado)
const CACHE_REVOGACAO = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function verificarRevogacao(tokenJti) {
  // Verificar cache
  const cached = CACHE_REVOGACAO.get(tokenJti);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.revogado;
  }

  // Consultar BD
  const { data } = await supabase
    .from('token_blacklist')
    .select('token_jti')
    .eq('token_jti', tokenJti)
    .single();

  const revogado = !!data;
  CACHE_REVOGACAO.set(tokenJti, { revogado, timestamp: Date.now() });
  return revogado;
}

module.exports = { supabase, verificarRevogacao };
```

**Validação**: ✅ Cliente Supabase conecta, cache funciona

---

**2.4 - Testes da blacklist** (1.5h)
- **Status**: `not-started`
- **Arquivo**: `tests/unit/database/token-blacklist.test.js` (novo)
- **Testes**:
  - T1: Inserir token na blacklist → sucesso
  - T2: Verificar token revogado → retorna true
  - T3: Verificar token válido → retorna false
  - T4: Cache TTL funciona (5 sec test)
  - T5: Tokens expirados limpam automaticamente
  - T6: RLS previne SELECT não-autorizado

**Validação**: ✅ `npm test -- token-blacklist.test.js` = 6/6 passando

---

### **Task 3: Criar Service Worker + manifest.json** (8-10h)

#### Objetivo
PWA base com offline support, instalação mobile e cache strategies.

#### Subtasks

**3.1 - Criar manifest.json** (1h)
- **Status**: `not-started`
- **Arquivo**: `public/manifest.json` (novo)
- **Conteúdo**:
```json
{
  "name": "CongregaFiel - Gerenciamento Eclesial",
  "short_name": "CongregaFiel",
  "description": "Plataforma para gerenciamento de igrejas evangélicas",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#6366f1",
  "background_color": "#ffffff",
  "categories": ["productivity", "business"],
  "icons": [
    {
      "src": "/icons/favicon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/favicon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/favicon-maskable-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/dashboard-mobile.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshots/dashboard-desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  "shortcuts": [
    {
      "name": "Painel Administrativa",
      "short_name": "Painel",
      "description": "Acessar painel administrativo",
      "url": "/igreja/painel?utm_source=pwa",
      "icons": [{ "src": "/icons/shortcut-painel.png", "sizes": "192x192" }]
    }
  ]
}
```

**Validação**: ✅ manifest.json valid JSON, referenciado no index.html

---

**3.2 - Criar Service Worker básico** (2.5h)
- **Status**: `not-started`
- **Arquivo**: `public/sw.js` (novo)
- **Features**:
  - Cache strategies: Cache-First, Network-First, Stale-While-Revalidate
  - Offline fallback page
  - Precache assets estáticos (CSS, JS, HTML)
  - Sync background (POST offline depois volta conexão)

**Código estrutura**:
```javascript
const CACHE_VERSION = 'v9.0.0';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;

const ASSETS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/index.css',
  '/index.js',
  '/autenticacao/login.html',
  '/autenticacao/login.css',
  '/autenticacao/criar-conta.html',
  // ... mais assets
];

// ========== INSTALL: Precache assets ==========
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => 
      cache.addAll(ASSETS_TO_PRECACHE)
    )
  );
  self.skipWaiting();
});

// ========== ACTIVATE: Cleanup old caches ==========
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => 
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_STATIC && name !== CACHE_DYNAMIC)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// ========== FETCH: Cache strategies ==========
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, chrome extensions, etc
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // API calls: Network-First (try network, fallback cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Clone e armazenar
          if (response.status === 200) {
            caches.open(CACHE_DYNAMIC).then(cache =>
              cache.put(request, response.clone())
            );
          }
          return response;
        })
        .catch(() => 
          caches.match(request).then(cached =>
            cached || new Response(JSON.stringify({ offline: true }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            })
          )
        )
    );
    return;
  }

  // Static assets: Cache-First
  if (/\.(css|js|png|jpg|svg|woff2)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached =>
        cached || fetch(request).then(response => {
          if (response.status === 200) {
            caches.open(CACHE_DYNAMIC).then(cache =>
              cache.put(request, response.clone())
            );
          }
          return response;
        })
      )
    );
    return;
  }

  // HTML pages: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        if (response.status === 200) {
          caches.open(CACHE_DYNAMIC).then(cache =>
            cache.put(request, response.clone())
          );
        }
        return response;
      });
      return cached || fetchPromise;
    })
  );
});

// ========== Background Sync (opcional Sprint 10) ==========
self.addEventListener('sync', event => {
  if (event.tag === 'sync-pedidos-oracao') {
    event.waitUntil(sincronizarPedidosOracao());
  }
});
```

**Validação**: ✅ SW registra sem errors, install event dispara

---

**3.3 - Registrar Service Worker no index.html + index.js** (1.5h)
- **Status**: `not-started`
- **Alterações**:

  **index.html**:
  ```html
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#6366f1">
  <meta name="apple-touch-icon" href="/icons/favicon-192.png">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- ... resto do head ... -->
  ```

  **index.js** (adicionar ao topo):
  ```javascript
  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('✅ Service Worker registrado:', registration.scope);
          
          // Verificar updates
          setInterval(() => registration.update(), 60000); // 60s
        })
        .catch(err => console.error('❌ SW registration failed:', err));
    });
    
    // Handle SW updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker atualizado');
      mostrarNotificacaoAtualizacao();
    });
  }
  
  function mostrarNotificacaoAtualizacao() {
    const toast = document.getElementById('toast');
    toast.textContent = 'Nova versão disponível. Recarregue para atualizar.';
    toast.classList.add('show');
  }
  ```

**Validação**: ✅ SW registra com sucesso no Chrome DevTools

---

**3.4 - Criar offline fallback page** (1h)
- **Status**: `not-started`
- **Arquivo**: `public/offline.html` (novo)
- **Conteúdo**:
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Modo Offline - CongregaFiel</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    h1 { color: #333; margin: 0 0 0.5rem; }
    p { color: #666; line-height: 1.6; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>Modo Offline</h1>
    <p>Você está sem conexão. Verifique sua internet e tente novamente.</p>
    <p>Alguns dados em cache podem estar disponíveis. Recarregue a página quando conectado.</p>
  </div>
</body>
</html>
```

**Validação**: ✅ offline.html renderiza corretamente

---

**3.5 - Testes PWA (Service Worker + manifest)** (2h)
- **Status**: `not-started`
- **Arquivo**: `tests/unit/public/pwa.test.js` (novo)
- **Testes**:
  - T1: manifest.json é válido JSON
  - T2: Service Worker instala sem erros
  - T3: Precache assets entra no cache
  - T4: Cache-First strategy funciona (statics)
  - T5: Network-First strategy funciona (APIs)
  - T6: Offline fallback serve 503 com JSON
  - T7: SW activation limpa caches antigos
  - T8: Lighthouse PWA installable = true

**Validação**: ✅ `npm test -- pwa.test.js` = 8/8 passando

---

### **Task 4: Configurar Cache Strategies Offline** (5-6h)

#### Objetivo
Otimizar cache para cada tipo de conteúdo (API, static, HTML pages).

#### [Detalhamento similar às tasks anteriores - para brevidade, resumo]

**Subtasks**:
- 4.1: Cache-First para assets estáticos (2h)
- 4.2: Network-First para APIs (dados variáveis) (1.5h)
- 4.3: Stale-While-Revalidate para conteúdo semi-estático (1h)
- 4.4: Background sync para sincronizar offline actions (1.5h)

---

### **Task 5: Refresh Token Flow** (4-5h)

#### Objetivo
Implementar mecanismo de refresh token para sessões longas sem re-login.

**Subtasks**:
- 5.1: Criar tabela `refresh_tokens` no Supabase (1h)
- 5.2: Endpoint `POST /api/auth/refresh` no auth-service (1.5h)
- 5.3: Interceptor de fetch no frontend para auto-refresh (1.5h)
- 5.4: Testes refresh token flow (1h)

---

### **Task 6: Validação e Testes Finais** (4h)

#### Objetivo
Garantir Sprint 9 atende critérios de aceitação.

**Subtasks**:
- 6.1: JWT centralizado valida em TODAS as rotas (1h)
- 6.2: Logout revoga token imediatamente (1h)
- 6.3: PWA instalável em mobile (1h)
- 6.4: Lighthouse report ≥90 (1h)

---

## ✅ Checklist de Conclusão Sprint 9

### Pre-Deploy
- [ ] Task 1-6 100% completas
- [ ] npm test = 103+ testes passando (91 anterior + 12 novos)
- [ ] Cobertura código ≥85%
- [ ] Lighthouse Performance ≥90
- [ ] Lighthouse Accessibility ≥90
- [ ] Lighthouse PWA ✅ (installable, offline)
- [ ] GitHub commits com mensagens PT-BR
- [ ] Branch `feature/sprint-9-auth-pwa` pronta para merge

### Deploy Staging
- [ ] v9.0.0-RC1 taggeada em git
- [ ] Service Worker registrado no staging
- [ ] JWT validação passando em todas rotas
- [ ] Logout + blacklist funcional
- [ ] "Install app" botão aparece em mobile
- [ ] Offline mode acessível

### Post-Deploy
- [ ] Release notes 9.0.0-RC1 publicada
- [ ] Equipe testou PWA em Chrome + Safari
- [ ] Zero critical bugs encontrados
- [ ] Ready para Sprint 10 (Notificações Push)

---

## 📊 Dependências e Bloqueadores

### Dependências Internas
- Sprint 8 (Relatórios) ✅ Concluída
- Express.js running (`npm start` em api-express)
- FastAPI running (`python api-fastapi/servidor.py`)

### Dependências Externas
- Supabase account com JWT secret configurado
- Firebase Hosting credenciais (para deploy)
- Navegadores modernos (Chrome 51+, Safari 15+, Firefox 44+)

### Possíveis Bloqueadores
- ⚠️ Se SUPABASE_JWT_SECRET não configurado → dev sem JWT (skip validação)
- ⚠️ Se manifest.json falta → PWA não instala
- ⚠️ Se Service Worker quebra → assets offline inacessíveis

---

## 🚀 Próximas Sprints

**Sprint 10 (Notificações Push)** depende de:
- ✅ JWT centralizado (Sprint 9 Task 1)
- ✅ Usuários autenticados com valid tokens

**Sprint 11 (Payment Gateway)** depende de:
- ✅ JWT + refresh token (Sprint 9 Tasks 1+5)

---

**Documento: Sprint 9 Planning** | Última atualização: 11/04/2026  
**Status**: 🟡 Ready para Execução
