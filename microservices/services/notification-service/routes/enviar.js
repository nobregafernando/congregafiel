// =============================================================
// Rota: POST /api/notificacoes
// Envia notificações via FCM para usuários
// =============================================================

const express = require("express");
const admin = require("firebase-admin");
const { supabase } = require("../supabase");
const { validarDadosNotificacao, construirPayloadFCM, gerarIdNotificacao } = require("../notificacao-utils");

const router = express.Router();

/**
 * POST /api/notificacoes
 * Envia notificação para um usuário via FCM
 *
 * Body:
 * {
 *   usuario_id: "uuid",
 *   titulo: "string",
 *   corpo: "string",
 *   tipo: "contribute",
 *   dados_extra: {}
 * }
 */
router.post("/", async (req, res) => {
  const { usuario_id, titulo, corpo, tipo, dados_extra } = req.body;
  const notifId = gerarIdNotificacao();

  try {
    // 1. Validar dados
    const validacao = validarDadosNotificacao({
      usuario_id,
      titulo,
      corpo,
      tipo,
    });

    if (!validacao.válido) {
      return res.status(400).json({
        erro: "Dados de notificação inválidos",
        detalhes: validacao.erros,
        notif_id: notifId,
      });
    }

    // 2. Verificar preferências do usuário
    const { data: preferencia } = await supabase
      .from("notificacao_preferences")
      .select("habilitada")
      .eq("usuario_id", usuario_id)
      .eq("tipo_notificacao", tipo)
      .maybeSingle();

    // Se preferência explícita desabilitada, pular
    if (preferencia && !preferencia.habilitada) {
      return res.status(200).json({
        mensagem: "Notificação respeitada (preferência desabilitada)",
        notif_id: notifId,
      });
    }

    // 3. Buscar tokens FCM do usuário
    const { data: tokens, error: erro_tokens } = await supabase
      .from("usuario_tokens_fcm")
      .select("id, fcm_token, device_type")
      .eq("usuario_id", usuario_id);

    if (erro_tokens || !tokens || tokens.length === 0) {
      return res.status(404).json({
        mensagem: "Usuário sem tokens FCM registrados",
        notif_id: notifId,
      });
    }

    // 4. Enviar para cada dispositivo
    const resultados = [];
    const timing_inicio = Date.now();

    for (const { id: token_id, fcm_token, device_type } of tokens) {
      try {
        const payload = construirPayloadFCM({
          titulo,
          corpo,
          tipo,
          dados_extra,
          fcmToken: fcm_token,
        });

        const messageId = await admin.messaging().send(payload);

        resultados.push({
          token_id,
          device_type,
          fcm_token: fcm_token.substring(0, 20) + "...",
          status: "sucesso",
          message_id: messageId,
        });
      } catch (err) {
        console.error(
          `[notificacoes] Erro ao enviar para token ${token_id}:`,
          err.message
        );

        resultados.push({
          token_id,
          device_type,
          status: "erro",
          erro: err.code || err.message,
        });
      }
    }

    const timing_ms = Date.now() - timing_inicio;

    // 5. Registrar em log
    try {
      await supabase.from("notificacoes_log").insert({
        notif_id: notifId,
        usuario_id,
        titulo,
        corpo,
        tipo,
        total_enviadas: resultados.filter((r) => r.status === "sucesso").length,
        total_erros: resultados.filter((r) => r.status === "erro").length,
        timing_ms,
        criado_em: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[notificacoes] Erro ao logar notificação:", err.message);
    }

    res.json({
      mensagem: "Notificações processadas",
      notif_id: notifId,
      total_enviadas: resultados.filter((r) => r.status === "sucesso").length,
      total_erros: resultados.filter((r) => r.status === "erro").length,
      timing_ms,
      detalhes: resultados,
    });
  } catch (err) {
    console.error("[notificacoes] Erro crítico:", err.message);
    res.status(500).json({
      erro: err.message,
      notif_id: notifId,
    });
  }
});

module.exports = router;
