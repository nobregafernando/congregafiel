require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { supabase } = require("./supabase");
const { paymentClient, preferenceClient } = require("./mercado-pago-client");
const { criarRouterCriarPreferencia } = require("./routes/criar-preferencia");
const { criarRouterWebhook } = require("./routes/webhook");
const { criarRouterStatus } = require("./routes/status");
const { criarRouterRelatorio } = require("./routes/relatorio");

function criarApp(deps = {}) {
  const app = express();
  const contexto = {
    supabase: deps.supabase !== undefined ? deps.supabase : supabase,
    paymentClient: deps.paymentClient !== undefined ? deps.paymentClient : paymentClient,
    preferenceClient: deps.preferenceClient !== undefined ? deps.preferenceClient : preferenceClient,
    notificationServiceUrl: deps.notificationServiceUrl || process.env.NOTIFICATION_SERVICE_URL,
    paymentServiceUrl: deps.paymentServiceUrl || process.env.PAYMENT_SERVICE_URL || "http://localhost:4008",
    webhookToken: deps.webhookToken || process.env.MERCADO_PAGO_WEBHOOK_TOKEN,
    internalServiceToken: deps.internalServiceToken || process.env.INTERNAL_SERVICE_TOKEN,
    fetchImpl: deps.fetchImpl || (typeof fetch !== "undefined" ? fetch : null),
  };

  app.use(cors());
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      servico: "payment-service",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/health", (_req, res) => {
    res.json({
      servico: "payment-service",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/pagamentos/preferencia", criarRouterCriarPreferencia(contexto));
  app.use("/api/pagamentos/webhook", criarRouterWebhook(contexto));
  app.use("/api/pagamentos", criarRouterStatus(contexto));
  app.use("/api/relatorios", criarRouterRelatorio(contexto));

  app.use((_req, res) => {
    res.status(404).json({ erro: "Rota não encontrada no payment-service" });
  });

  return app;
}

if (require.main === module) {
  const app = criarApp();
  const porta = process.env.PORT || 4008;
  app.listen(porta, () => {
    console.log(`[payment-service] rodando na porta ${porta}`);
  });
}

module.exports = {
  criarApp,
};
