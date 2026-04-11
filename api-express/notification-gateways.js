// =============================================================
// Agregador de Gatilhos — notification-gateways.js
// Centraliza disparo de notificações para 6 eventos principais
// Integra-se com routes existentes em api-express
// =============================================================

const axios = require("axios");

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4009";

/**
 * Envia notificação via notification-service
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
async function dispararNotificacao(payload) {
  try {
    const response = await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notificacoes`, payload, {
      timeout: 5000,
    });
    console.log(`✅ Notificação disparada: ${payload.tipo}`, response.data.notif_id);
    return response.data;
  } catch (erro) {
    console.error(`❌ Erro ao disparar notificação (${payload.tipo}):`, erro.message);
    // Não falhar a operation se notificação falhar
    return { erro: erro.message };
  }
}

/**
 * GATILHO 1: Nova Contribuição Registrada
 * Chamado após POST /api/contribuicoes com sucesso
 */
async function gatilho1_novaContribuicao(contribuicao, membro) {
  const payload = {
    usuario_id: contribuicao.membro_id,
    titulo: "✅ Contribuição Registrada",
    corpo: `Sua contribuição de R$ ${contribuicao.valor.toFixed(2)} foi recebida`,
    tipo: "contribute",
    dados_extra: {
      contribuicao_id: contribuicao.id,
      valor: contribuicao.valor,
      data_contribuicao: contribuicao.data,
    },
  };

  return dispararNotificacao(payload);
}

/**
 * GATILHO 2: Novo Evento Criado
 * Chamado após POST /api/eventos com sucesso
 */
async function gatilho2_novoEvento(evento, igreja) {
  const payload = {
    usuario_id: evento.criado_por, // Para admin que criou
    titulo: "📅 Novo Evento Criado",
    corpo: `${evento.titulo} em ${new Date(evento.data_inicio).toLocaleDateString("pt-BR")}`,
    tipo: "event",
    dados_extra: {
      evento_id: evento.id,
      titulo: evento.titulo,
      data: evento.data_inicio,
    },
  };

  return dispararNotificacao(payload);
}

/**
 * GATILHO 3: Comunicado Postado (BROADCAST)
 * Chamado após POST /api/comunicados com sucesso
 * Envia para TODOS os membros da igreja
 */
async function gatilho3_comunicadoBroadcast(comunicado, membrosIds) {
  // Enviar para cada membro da igreja
  const tarefas = membrosIds.map((usuario_id) => {
    const payload = {
      usuario_id,
      titulo: "📢 Novo Comunicado",
      corpo: comunicado.titulo.substring(0, 80),
      tipo: "announcement",
      dados_extra: {
        comunicado_id: comunicado.id,
        titulo: comunicado.titulo,
      },
    };
    return dispararNotificacao(payload);
  });

  const resultados = await Promise.allSettled(tarefas);
  const sucesso = resultados.filter((r) => r.status === "fulfilled").length;

  console.log(`✅ Broadcast concluído: ${sucesso}/${membrosIds.length} notificações`);
  return { total: membrosIds.length, enviadas: sucesso };
}

/**
 * GATILHO 4: Pedido de Oração Recebido
 * Chamado após POST /api/pedidos-oracao com sucesso
 * Envia para líderes/pastores
 */
async function gatilho4_pedidoOracaoBroadcast(pedido, lideresIds) {
  const tarefas = lideresIds.map((usuario_id) => {
    const payload = {
      usuario_id,
      titulo: "🙏 Novo Pedido de Oração",
      corpo: pedido.titulo.substring(0, 80),
      tipo: "system",
      dados_extra: {
        pedido_id: pedido.id,
        titulo: pedido.titulo,
      },
    };
    return dispararNotificacao(payload);
  });

  const resultados = await Promise.allSettled(tarefas);
  const sucesso = resultados.filter((r) => r.status === "fulfilled").length;

  return { total: lideresIds.length, enviadas: sucesso };
}

/**
 * GATILHO 5: Relatório Financeiro Disponível 
 * ⚠️ CRÍTICO para Sprint 11
 * Chamado após GET /api/relatorios/* (gerar PDF/Excel)
 */
async function gatilho5_relatorioDisponivel(usuario_id, tipoRelatorio) {
  const payload = {
    usuario_id,
    titulo: "📊 Seu Relatório está Pronto",
    corpo: `Relatório de ${tipoRelatorio} gerado com sucesso`,
    tipo: "payment",
    dados_extra: {
      tipo_relatorio: tipoRelatorio,
      criado_em: new Date().toISOString(),
    },
  };

  return dispararNotificacao(payload);
}

/**
 * GATILHO 6: Alerta de Atraso em Contribuições
 * ⚠️ CRÍTICO para Sprint 11 - CRON DIÁRIO (00:00)
 * Busca usuários com contribuições vencidas > 30 dias
 */
async function gatilho6_alertaAtraso(usuarioComAtrasoId, diasAtraso) {
  const payload = {
    usuario_id: usuarioComAtrasoId,
    titulo: "⏰ Contribuição Vencida",
    corpo: `Você tem ${diasAtraso} dias de atraso em suas contribuições`,
    tipo: "payment",
    dados_extra: {
      dias_atraso: diasAtraso,
      alerta_em: new Date().toISOString(),
    },
  };

  return dispararNotificacao(payload);
}

module.exports = {
  dispararNotificacao,
  gatilho1_novaContribuicao,
  gatilho2_novoEvento,
  gatilho3_comunicadoBroadcast,
  gatilho4_pedidoOracaoBroadcast,
  gatilho5_relatorioDisponivel,
  gatilho6_alertaAtraso,
};
