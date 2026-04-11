// =============================================================
// notification-service — Microserviço de Notificações Push
// Responsável por enviar notificações FCM e gerenciar preferências
// Porta padrão: 4009
// =============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const { supabase } = require("./supabase");
const { inicializarFirebaseAdmin } = require("./firebase-admin-config");
const { validarDadosNotificacao, gerarIdNotificacao } = require("./notificacao-utils");

const app = express();
const PORTA = process.env.PORT || 4009;

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar Firebase Admin
inicializarFirebaseAdmin();

// -------------------------------------------------------
// Health Check
// -------------------------------------------------------
app.get("/health", (req, res) => {
  res.json({
    servico: "notification-service",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------
// Routes
// -------------------------------------------------------
app.use("/api/notificacoes", require("./routes/enviar"));
app.use("/api/notificacoes", require("./routes/status"));
app.use("/api/notification-preferences", require("./routes/preferences"));

// -------------------------------------------------------
// 404 Handler
// -------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada no notification-service" });
});

// -------------------------------------------------------
// Error Handler
// -------------------------------------------------------
app.use((err, req, res, next) => {
  console.error("[notification-service] Erro:", err);
  res.status(500).json({
    erro: "Erro interno do servidor",
    detalhe: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// -------------------------------------------------------
// Iniciar servidor
// -------------------------------------------------------
app.listen(PORTA, () => {
  console.log(`[notification-service] 🔔 rodando na porta ${PORTA}`);
  console.log(`[notification-service] Health check disponível em http://localhost:${PORTA}/health`);
});

module.exports = app;
