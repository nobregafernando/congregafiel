const express = require("express");
const { exigirUsuario } = require("../pagamento-utils");

function criarHandlerStatus(deps = {}) {
  const supabase = deps.supabase;

  return async function obterStatus(req, res) {
    if (!supabase) {
      return res.status(503).json({ erro: "Supabase não configurado" });
    }

    const identificador = req.params.id;

    try {
      const { data, error } = await supabase
        .from("pagamentos_abertos")
        .select("*")
        .or(`mercado_pago_preference_id.eq.${identificador},mercado_pago_payment_id.eq.${identificador}`)
        .eq("usuario_id", req.usuario.id)
        .order("criado_em", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ erro: error.message });
      }

      if (!data) {
        return res.status(404).json({ erro: "Pagamento não encontrado" });
      }

      return res.json({
        id: data.id,
        preference_id: data.mercado_pago_preference_id,
        payment_id: data.mercado_pago_payment_id,
        status: data.status,
        valor: data.valor,
        tipo: data.tipo,
        atualizado_em: data.atualizado_em,
      });
    } catch (erro) {
      return res.status(500).json({ erro: erro.message || "Erro ao buscar pagamento" });
    }
  };
}

function criarRouterStatus(deps = {}) {
  const router = express.Router();
  const handler = criarHandlerStatus(deps);
  router.get("/:id", exigirUsuario, handler);
  router.get("/status/:id", exigirUsuario, handler);
  return router;
}

module.exports = {
  criarHandlerStatus,
  criarRouterStatus,
};
