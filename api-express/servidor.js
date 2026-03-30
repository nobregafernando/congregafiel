// =============================================================
// CongregaFiel — API Gateway (Express.js)
// Ponto único de entrada para o frontend.
// Proxy reverso para o backend FastAPI.
// Aplica CORS, rate-limit, JWT, circuit breaker e logging.
// =============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const rateLimit = require("express-rate-limit");

// Middlewares customizados
const requestId = require("./middlewares/request-id");
const logger = require("./middlewares/logger");
const verificarJwt = require("./middlewares/jwt");
const { circuitBreaker, circuitBreakerMiddleware } = require("./middlewares/circuit-breaker");

const app = express();
const PORTA = process.env.PORT || 3000;

// Endereços dos Microserviços
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4001";

// -------------------- Middlewares Globais --------------------

// Request ID — gerar identificador único por requisição
app.use(requestId);

// Logger — registrar todas as requisições
app.use(logger);

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Rate-limit global: 200 requisições / 15 min por IP
const limiteGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas requisições. Tente novamente em alguns minutos." },
});
app.use(limiteGlobal);

// Rate-limit restrito para rotas de autenticação
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas de autenticação. Aguarde 15 minutos." },
});

// -------------------- Health-check --------------------
app.get("/health", async (_req, res) => {
  let fastapiStatus = "desconhecido";
  let authStatus = "desconhecido";
  
  try {
    const respFastapi = await fetch(FASTAPI_URL + "/");
    fastapiStatus = respFastapi.ok ? "ok" : "erro";
  } catch {
    fastapiStatus = "indisponível";
  }

  try {
    const respAuth = await fetch(AUTH_SERVICE_URL + "/health");
    authStatus = respAuth.ok ? "ok" : "erro";
  } catch {
    authStatus = "indisponível";
  }

  res.json({
    servico: "api-gateway",
    status: "ok",
    versao: "4.0.0",
    backends: {
      core: { url: FASTAPI_URL, status: fastapiStatus },
      auth: { url: AUTH_SERVICE_URL, status: authStatus },
    },
    circuito: circuitBreaker.status(),
    timestamp: new Date().toISOString(),
  });
});

// -------------------- Rota Raiz --------------------
app.get("/", (_req, res) => {
  res.json({
    nome: "CongregaFiel API Gateway",
    versao: "4.0.0",
    descricao: "Gateway unificado para múltiplos microserviços políglotas (Node.js e Python)",
    backends: { FastAPI: FASTAPI_URL, AuthNode: AUTH_SERVICE_URL },
    rotas: {
      health:         "/health",
      autenticacao:   "/api/auth/*       (público)",
      igrejas:        "/api/igrejas/*    (público: /publicas)",
      membros:        "/api/membros/*    (protegido)",
      eventos:        "/api/eventos/*    (protegido)",
      contribuicoes:  "/api/contribuicoes/* (protegido)",
      comunicados:    "/api/comunicados/*   (protegido)",
      pedidos_oracao: "/api/pedidos-oracao/* (protegido)",
    },
  });
});

// -------------------- Proxy para FastAPI --------------------

function criarProxy(opcoes = {}) {
  return createProxyMiddleware({
    target: FASTAPI_URL,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        // Propagar request-id para o backend
        if (req.requestId) {
          proxyReq.setHeader("X-Request-Id", req.requestId);
        }
      },
      proxyRes: () => {
        // Resposta OK do backend → registrar sucesso no circuit breaker
        circuitBreaker.registrarSucesso();
      },
      error: (err, _req, res) => {
        // Falha de conexão → registrar no circuit breaker
        circuitBreaker.registrarFalha();
        console.error(`[Gateway] Erro ao conectar no FastAPI (${FASTAPI_URL}): ${err.message}`);
        if (res && !res.headersSent) {
          res.status(502).json({
            erro: "Backend temporariamente indisponível",
            detalhe: process.env.NODE_ENV === "development" ? err.message : undefined,
          });
        }
      },
    },
    ...opcoes,
  });
}

// ---------- Rotas Públicas (sem JWT) ----------

// Auth — proxy para AUTH_SERVICE_URL (microserviço Node.js)
app.use("/api/auth", limiteAuth, circuitBreakerMiddleware, criarProxy({ target: AUTH_SERVICE_URL }));

// Igrejas públicas (mapa) — proxy para FASTAPI (sem JWT)
app.get("/api/igrejas/publicas", circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));

// ---------- Rotas Protegidas (com JWT) ----------

// As rotas abaixo usam proxy para FASTAPI (microserviço Python)
app.use("/api/igrejas", verificarJwt, circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));
app.use("/api/membros", verificarJwt, circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));
app.use("/api/eventos", verificarJwt, circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));
app.use("/api/contribuicoes", verificarJwt, circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));
app.use("/api/comunicados", verificarJwt, circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));
app.use("/api/pedidos-oracao", verificarJwt, circuitBreakerMiddleware, criarProxy({ target: FASTAPI_URL }));

// -------------------- Rota não encontrada --------------------
app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada no gateway" });
});

// -------------------- Tratamento de Erros Global --------------------
app.use((err, _req, res, _next) => {
  console.error("[Gateway] Erro não tratado:", err.message);
  res.status(500).json({
    erro: "Erro interno do gateway",
    detalhe: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// -------------------- Iniciar Servidor --------------------
if (process.env.VERCEL !== "1") {
  app.listen(PORTA, () => {
    console.log(`\n🚀 API Gateway v4.0.0 rodando na porta ${PORTA}`);
    console.log(`📡 Roteamento de Microserviços:`);
    console.log(`   - Auth Service (Node.js) → ${AUTH_SERVICE_URL}`);
    console.log(`   - Core Service (Python)  → ${FASTAPI_URL}`);
    console.log(`🔒 JWT: ${process.env.SUPABASE_JWT_SECRET ? "ativado" : "desativado (SUPABASE_JWT_SECRET não configurado)"}`);
    console.log(`⚡ Circuit Breaker: limite=${circuitBreaker.limite}, timeout=${circuitBreaker.timeout}ms\n`);
  });
}

module.exports = app;
