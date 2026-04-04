function montarAtualizacaoPedidoOracao(payload, nowIso = new Date().toISOString()) {
  const { pedido, status, resposta, respondido_por } = payload || {};
  const atualizacao = {};

  if (pedido !== undefined) atualizacao.pedido = pedido;
  if (status !== undefined) atualizacao.status = status;
  if (resposta !== undefined) atualizacao.resposta = resposta;
  if (respondido_por !== undefined) atualizacao.respondido_por = respondido_por;
  if (resposta !== undefined || status === "respondido") {
    atualizacao.respondido_em = nowIso;
  }

  return atualizacao;
}

module.exports = { montarAtualizacaoPedidoOracao };
