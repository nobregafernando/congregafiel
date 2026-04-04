// =============================================================
// CongregaFiel - API Gateway (Express.js)
// Ponto unico de entrada do frontend para autenticacao e backend core.
// Aplica CORS, rate-limit, request-id, logging, JWT e circuit breaker.
// =============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const rateLimit = require("express-rate-limit");

const requestId = require("./middlewares/request-id");
const logger = require("./middlewares/logger");
const verificarJwt = require("./middlewares/jwt");
const { circuitBreaker, circuitBreakerMiddleware } = require("./middlewares/circuit-breaker");

const app = express();
const PORTA = process.env.PORT || 3000;

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4001";

app.use(requestId);
app.use(logger);
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
}));
app.use(express.json());

const limiteGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas requisicoes. Tente novamente em alguns minutos." },
});
app.use(limiteGlobal);

const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas de autenticacao. Aguarde 15 minutos." },
});

async function consultarStatus(url, rota = "/") {
  try {
    const resposta = await fetch(url + rota);
    return resposta.ok ? "ok" : "erro";
  } catch {
    return "indisponivel";
  }
}

app.get("/health", async (_req, res) => {
  const [fastapiStatus, authStatus] = await Promise.all([
    consultarStatus(FASTAPI_URL, "/"),
    consultarStatus(AUTH_SERVICE_URL, "/health"),
  ]);

  res.json({
    servico: "api-gateway",
    status: "ok",
    versao: "3.0.0",
    backends: {
      core: { url: FASTAPI_URL, status: fastapiStatus },
      auth: { url: AUTH_SERVICE_URL, status: authStatus },
    },
    circuito: circuitBreaker.status(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.json({
    nome: "CongregaFiel API Gateway",
    versao: "3.0.0",
    descricao: "Gateway unificado para os servicos de autenticacao e backend core.",
    backends: {
      auth: AUTH_SERVICE_URL,
      core: FASTAPI_URL,
    },
    rotas: {
      health: "/health",
      autenticacao: "/api/auth/*",
      igrejas_publicas: "/api/igrejas/publicas",
      igrejas: "/api/igrejas/*",
      membros: "/api/membros/*",
      eventos: "/api/eventos/*",
      contribuicoes: "/api/contribuicoes/*",
      comunicados: "/api/comunicados/*",
      pedidos_oracao: "/api/pedidos-oracao/*",
    },
  });
});

function criarProxy(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        if (req.requestId) {
          proxyReq.setHeader("X-Request-Id", req.requestId);
        }
      },
      proxyRes: () => {
        circuitBreaker.registrarSucesso();
      },
      error: (err, _req, res) => {
        circuitBreaker.registrarFalha();
        console.error(`[gateway] Erro ao conectar em ${target}: ${err.message}`);
        if (!res.headersSent) {
          res.status(502).json({
            erro: "Backend temporariamente indisponivel",
            detalhe: process.env.NODE_ENV === "development" ? err.message : undefined,
          });
        }
      },
    },
  });
}

app.use("/api/auth", limiteAuth, circuitBreakerMiddleware, criarProxy(AUTH_SERVICE_URL));
app.get("/api/igrejas/publicas", circuitBreakerMiddleware, criarProxy(FASTAPI_URL));

app.use("/api/igrejas", verificarJwt, circuitBreakerMiddleware, criarProxy(FASTAPI_URL));
app.use("/api/membros", verificarJwt, circuitBreakerMiddleware, criarProxy(FASTAPI_URL));
app.use("/api/eventos", verificarJwt, circuitBreakerMiddleware, criarProxy(FASTAPI_URL));
app.use("/api/contribuicoes", verificarJwt, circuitBreakerMiddleware, criarProxy(FASTAPI_URL));
app.use("/api/comunicados", verificarJwt, circuitBreakerMiddleware, criarProxy(FASTAPI_URL));
app.use("/api/pedidos-oracao", verificarJwt, circuitBreakerMiddleware, criarProxy(FASTAPI_URL));

app.use((_req, res) => {
  res.status(404).json({ erro: "Rota nao encontrada no gateway" });
});

app.use((err, _req, res, _next) => {
  console.error("[gateway] Erro nao tratado:", err.message);
  res.status(500).json({
    erro: "Erro interno do gateway",
    detalhe: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

if (process.env.VERCEL !== "1") {
  app.listen(PORTA, () => {
    console.log(`API Gateway rodando na porta ${PORTA}`);
    console.log(`Auth Service -> ${AUTH_SERVICE_URL}`);
    console.log(`Core Service -> ${FASTAPI_URL}`);
  });
}

module.exports = app;
