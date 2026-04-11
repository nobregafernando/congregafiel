// =============================================================
// CongregaFiel — API Gateway
// Ponto único de entrada. Roteia para os microserviços,
// aplica rate-limit, CORS e validação de JWT.
// =============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const rateLimit = require("express-rate-limit");
const verificarJwtGateway = require("./middlewares/jwt-gateway");

const app = express();
const PORTA = process.env.PORT || 4000;

// -------------------------------------------------------
// Endereços dos microserviços (via env ou padrão local)
// -------------------------------------------------------
const SERVICOS = {
  auth:          process.env.AUTH_SERVICE_URL          || "http://localhost:4001",
  members:       process.env.MEMBERS_SERVICE_URL       || "http://localhost:4002",
  churches:      process.env.CHURCHES_SERVICE_URL      || "http://localhost:4003",
  events:        process.env.EVENTS_SERVICE_URL        || "http://localhost:4004",
  finance:       process.env.FINANCE_SERVICE_URL       || "http://localhost:4005",
  announcements: process.env.ANNOUNCEMENTS_SERVICE_URL || "http://localhost:4006",
  prayers:       process.env.PRAYERS_SERVICE_URL       || "http://localhost:4007",
  payments:      process.env.PAYMENT_SERVICE_URL       || "http://localhost:4008",
};

// -------------------------------------------------------
// Middlewares globais
// -------------------------------------------------------
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// Rate-limit global: 200 req / 15min por IP
const limiteGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas requisições. Tente novamente em alguns minutos." },
});
app.use(limiteGlobal);

// Rate-limit mais restrito para rotas de autenticação
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: "Muitas tentativas de autenticação. Aguarde 15 minutos." },
});

// -------------------------------------------------------
// Middleware de logging
// -------------------------------------------------------
app.use((req, _res, next) => {
  const agora = new Date().toISOString();
  console.log(`[${agora}] ${req.method} ${req.originalUrl}`);
  next();
});

// -------------------------------------------------------
// Health-check do próprio gateway
// -------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({
    servico: "api-gateway",
    status: "ok",
    versao: "1.0.0",
    timestamp: new Date().toISOString(),
    microservicos: SERVICOS,
  });
});

// -------------------------------------------------------
// Rota raiz — informações da API
// -------------------------------------------------------
app.get("/", (_req, res) => {
  res.json({
    nome: "CongregaFiel API Gateway",
    versao: "1.0.0",
    rotas: {
      autenticacao:   "/api/auth/*",
      igrejas:        "/api/igrejas/*",
      membros:        "/api/membros/*",
      eventos:        "/api/eventos/*",
      contribuicoes:  "/api/contribuicoes/*",
      pagamentos:     "/api/pagamentos/*",
      comunicados:    "/api/comunicados/*",
      pedidos_oracao: "/api/pedidos-oracao/*",
      relatorios_pagamentos: "/api/relatorios/pagamentos",
    },
  });
});

// -------------------------------------------------------
// Opções de proxy compartilhadas
// -------------------------------------------------------
function criarProxy(alvo, opcoes = {}) {
  return createProxyMiddleware({
    target: alvo,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      if (req.usuario) {
        proxyReq.setHeader("x-usuario-id", req.usuario.id || "");
        proxyReq.setHeader("x-usuario-email", req.usuario.email || "");
        proxyReq.setHeader("x-usuario-role", req.usuario.role || "");
      }

      if (typeof opcoes.onProxyReq === "function") {
        opcoes.onProxyReq(proxyReq, req);
      }
    },
    on: {
      error: (err, _req, res) => {
        console.error(`[Gateway] Erro ao conectar em ${alvo}: ${err.message}`);
        res.status(502).json({
          erro: "Serviço temporariamente indisponível",
          detalhe: process.env.NODE_ENV === "development" ? err.message : undefined,
        });
      },
    },
    ...opcoes,
  });
}

// -------------------------------------------------------
// Roteamento para microserviços
// -------------------------------------------------------

// AUTH — sem JWT obrigatório (login e cadastro são públicos)
app.use(
  "/api/auth",
  limiteAuth,
  criarProxy(SERVICOS.auth)
);

// IGREJAS — inclui rota pública /api/igrejas/publicas
app.use(
  "/api/igrejas",
  criarProxy(SERVICOS.churches)
);

// MEMBROS — JWT obrigatório
app.use(
  "/api/membros",
  verificarJwtGateway,
  criarProxy(SERVICOS.members)
);

// EVENTOS — JWT obrigatório
app.use(
  "/api/eventos",
  verificarJwtGateway,
  criarProxy(SERVICOS.events)
);

// CONTRIBUIÇÕES (financeiro) — JWT obrigatório
app.use(
  "/api/contribuicoes",
  verificarJwtGateway,
  criarProxy(SERVICOS.finance)
);

// PAGAMENTOS ONLINE — JWT obrigatório
app.use(
  "/api/pagamentos",
  verificarJwtGateway,
  criarProxy(SERVICOS.payments)
);

// RELATÓRIO DE PAGAMENTOS — JWT obrigatório
app.use(
  "/api/relatorios/pagamentos",
  verificarJwtGateway,
  criarProxy(SERVICOS.payments)
);

// COMUNICADOS — JWT obrigatório
app.use(
  "/api/comunicados",
  verificarJwtGateway,
  criarProxy(SERVICOS.announcements)
);

// PEDIDOS DE ORAÇÃO — JWT obrigatório
app.use(
  "/api/pedidos-oracao",
  verificarJwtGateway,
  criarProxy(SERVICOS.prayers)
);

// -------------------------------------------------------
// Rota não encontrada
// -------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada no gateway" });
});

// -------------------------------------------------------
// Iniciar servidor
// -------------------------------------------------------
app.listen(PORTA, () => {
  console.log(`\n🚀 API Gateway rodando na porta ${PORTA}`);
  console.log("Microserviços registrados:");
  Object.entries(SERVICOS).forEach(([nome, url]) => {
    console.log(`  ${nome.padEnd(14)} → ${url}`);
  });
  console.log("");
});

module.exports = app;
