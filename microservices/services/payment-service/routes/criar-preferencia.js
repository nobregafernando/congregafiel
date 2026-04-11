const express = require("express");
const {
  exigirUsuario,
  extrairDadosCheckout,
  montarPreferenceBody,
  registrarPagamentoAberto,
  validarCriacaoPreferencia,
} = require("../pagamento-utils");

function criarHandlerCriarPreferencia(deps = {}) {
  const preferenceClient = deps.preferenceClient;
  const supabase = deps.supabase;
  const paymentServiceUrl = deps.paymentServiceUrl || process.env.PAYMENT_SERVICE_URL || "http://localhost:4008";

  return async function criarPreferencia(req, res) {
    const validacao = validarCriacaoPreferencia(req.body || {});
    if (!validacao.valido) {
      return res.status(400).json({ erro: validacao.erros.join("; ") });
    }

    if (!preferenceClient || typeof preferenceClient.create !== "function") {
      return res.status(503).json({ erro: "Mercado Pago não configurado" });
    }

    const { tipo, descricao } = req.body;

    try {
      const preference = await preferenceClient.create({
        body: montarPreferenceBody({
          valor: validacao.valor,
          tipo,
          descricao,
          usuario: req.usuario,
          notificationUrl: `${paymentServiceUrl}/api/pagamentos/webhook`,
        }),
      });

      await registrarPagamentoAberto(supabase, {
        usuario_id: req.usuario.id,
        valor: validacao.valor,
        tipo,
        mercado_pago_preference_id: String(preference.id),
        status: "pendente",
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      });

      return res.json(extrairDadosCheckout(preference, tipo, validacao.valor));
    } catch (erro) {
      return res.status(500).json({ erro: erro.message || "Erro ao criar preferência" });
    }
  };
}

function criarRouterCriarPreferencia(deps = {}) {
  const router = express.Router();
  router.post("/", exigirUsuario, criarHandlerCriarPreferencia(deps));
  return router;
}

module.exports = {
  criarHandlerCriarPreferencia,
  criarRouterCriarPreferencia,
};
