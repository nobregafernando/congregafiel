// =============================================================
// Rota: GET /api/notificacoes/:id (status de notificação)
// =============================================================

const express = require("express");
const { supabase } = require("../supabase");

const router = express.Router();

/**
 * GET /api/notificacoes/:id
 * Retorna status de uma notificação
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("notificacoes_log")
      .select("*")
      .eq("notif_id", id)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({
        erro: "Notificação não encontrada",
        notif_id: id,
      });
    }

    res.json({
      notificacao: data,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
