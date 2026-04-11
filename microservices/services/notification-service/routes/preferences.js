// =============================================================
// Rota: GET/PUT /api/notification-preferences
// Gerencia preferências de notificação do usuário
// =============================================================

const express = require("express");
const { supabase } = require("../supabase");

const router = express.Router();

/**
 * GET /api/notification-preferences
 * Retorna preferências de notificação do usuário
 * Query param: usuario_id (UUID)
 */
router.get("/", async (req, res) => {
  const { usuario_id } = req.query;

  if (!usuario_id) {
    return res.status(400).json({ erro: "usuario_id é obrigatório" });
  }

  try {
    const { data, error } = await supabase
      .from("notificacao_preferences")
      .select("*")
      .eq("usuario_id", usuario_id);

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    res.json({
      usuario_id,
      preferencias: data || [],
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

/**
 * PUT /api/notification-preferences
 * Atualiza preferências de notificação
 * Body:
 * {
 *   usuario_id: "uuid",
 *   tipo_notificacao: "contribute|event|announcement|payment|system",
 *   habilitada: true/false,
 *   som: true/false,
 *   vibrar: true/false
 * }
 */
router.put("/", async (req, res) => {
  const { usuario_id, tipo_notificacao, habilitada, som, vibrar } = req.body;

  if (!usuario_id || !tipo_notificacao) {
    return res.status(400).json({
      erro: "usuario_id e tipo_notificacao são obrigatórios",
    });
  }

  if (!["contribute", "event", "announcement", "payment", "system"].includes(tipo_notificacao)) {
    return res.status(400).json({
      erro: "tipo_notificacao inválido",
    });
  }

  try {
    const { data, error } = await supabase
      .from("notificacao_preferences")
      .upsert(
        {
          usuario_id,
          tipo_notificacao,
          habilitada: habilitada !== undefined ? habilitada : true,
          som: som !== undefined ? som : true,
          vibrar: vibrar !== undefined ? vibrar : true,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "usuario_id,tipo_notificacao" }
      )
      .select()
      .single();

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    res.json({
      mensagem: "Preferência atualizada com sucesso",
      preferencia: data,
    });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
