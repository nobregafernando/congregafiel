const express = require("express");
const {
  processarWebhookPagamento,
  validarAssinaturaMercadoPago,
} = require("../pagamento-utils");

function criarHandlerWebhook(deps = {}) {
  const paymentClient = deps.paymentClient;
  const supabase = deps.supabase;
  const fetchImpl = deps.fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  const webhookToken = deps.webhookToken || process.env.MERCADO_PAGO_WEBHOOK_TOKEN;
  const notificationServiceUrl = deps.notificationServiceUrl || process.env.NOTIFICATION_SERVICE_URL;
  const internalServiceToken = deps.internalServiceToken || process.env.INTERNAL_SERVICE_TOKEN;

  return async function webhook(req, res) {
    if (!validarAssinaturaMercadoPago(req, webhookToken)) {
      return res.status(401).json({ erro: "Assinatura inválida" });
    }

    if (!paymentClient || typeof paymentClient.get !== "function") {
      return res.status(503).json({ erro: "Mercado Pago não configurado" });
    }

    const paymentId = (req.body && req.body.data && req.body.data.id) || req.body.id;
    if (!paymentId) {
      return res.status(400).json({ erro: "Webhook sem identificador de pagamento" });
    }

    try {
      const payment = await paymentClient.get({ id: paymentId });
      await processarWebhookPagamento({
        payment,
        supabase,
        notificationServiceUrl,
        internalServiceToken,
        fetchImpl,
      });

      return res.json({ mensagem: "OK" });
    } catch (erro) {
      return res.status(500).json({ erro: erro.message || "Erro ao processar webhook" });
    }
  };
}

function criarRouterWebhook(deps = {}) {
  const router = express.Router();
  router.post("/", criarHandlerWebhook(deps));
  return router;
}

module.exports = {
  criarHandlerWebhook,
  criarRouterWebhook,
};
