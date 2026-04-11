// =============================================================
// Utilitários de Notificação — notification-service
// Helpers para construir e enviar notificações
// =============================================================

const { v4: uuidv4 } = require("uuid");

/**
 * Constrói payload FCM com título, corpo e dados extras
 * @param {Object} params
 * @returns {Object}
 */
function construirPayloadFCM(params) {
  const {
    titulo,
    corpo,
    tipo,
    dados_extra = {},
    fcmToken,
  } = params;

  return {
    token: fcmToken,
    notification: {
      title: titulo,
      body: corpo,
    },
    data: {
      tipo: tipo || "system",
      timestamp: new Date().toISOString(),
      ...dados_extra,
    },
    webpush: {
      fcmOptions: {
        link: "/", // URL para abrir ao clicar
      },
      notification: {
        icon: "/favicon.svg",
        badge: "/favicon.svg",
      },
    },
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          "content-available": 1,
        },
      },
    },
  };
}

/**
 * Valida se os dados de notificação estão completos
 * @param {Object} dados
 * @returns {Object} { válido: boolean, erros: [] }
 */
function validarDadosNotificacao(dados) {
  const erros = [];

  if (!dados.usuario_id) {
    erros.push("usuario_id é obrigatório");
  }
  if (!dados.titulo || dados.titulo.trim().length === 0) {
    erros.push("titulo é obrigatório e não pode estar vazio");
  }
  if (!dados.corpo || dados.corpo.trim().length === 0) {
    erros.push("corpo é obrigatório e não pode estar vazio");
  }
  if (!["contribute", "event", "announcement", "payment", "system"].includes(dados.tipo)) {
    erros.push("tipo deve ser: contribute, event, announcement, payment ou system");
  }

  return {
    válido: erros.length === 0,
    erros,
  };
}

/**
 * Gera ID único para rastreamento de notificação
 * @returns {string}
 */
function gerarIdNotificacao() {
  return `notif-${uuidv4()}`;
}

module.exports = {
  construirPayloadFCM,
  validarDadosNotificacao,
  gerarIdNotificacao,
};
