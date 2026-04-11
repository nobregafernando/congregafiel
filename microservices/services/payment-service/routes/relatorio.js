const express = require("express");
const { exigirUsuario, resumirPagamentos } = require("../pagamento-utils");

function proximoMes(periodo) {
  const [ano, mes] = periodo.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes, 1));
  return data.toISOString().slice(0, 7);
}

function criarHandlerRelatorio(deps = {}) {
  const supabase = deps.supabase;

  return async function obterRelatorio(req, res) {
    if (!supabase) {
      return res.status(503).json({ erro: "Supabase não configurado" });
    }

    const periodo = req.query.mes || new Date().toISOString().slice(0, 7);
    const statusFiltro = req.query.status;

    try {
      let query = supabase
        .from("pagamentos_abertos")
        .select("*")
        .eq("usuario_id", req.usuario.id)
        .gte("criado_em", `${periodo}-01T00:00:00.000Z`)
        .lt("criado_em", `${proximoMes(periodo)}-01T00:00:00.000Z`)
        .order("criado_em", { ascending: false });

      if (statusFiltro) {
        query = query.eq("status", statusFiltro);
      }

      const { data, error } = await query;
      if (error) {
        return res.status(500).json({ erro: error.message });
      }

      return res.json(resumirPagamentos(data || [], periodo));
    } catch (erro) {
      return res.status(500).json({ erro: erro.message || "Erro ao gerar relatório" });
    }
  };
}

function criarRouterRelatorio(deps = {}) {
  const router = express.Router();
  router.get("/pagamentos", exigirUsuario, criarHandlerRelatorio(deps));
  return router;
}

module.exports = {
  criarHandlerRelatorio,
  criarRouterRelatorio,
  proximoMes,
};
