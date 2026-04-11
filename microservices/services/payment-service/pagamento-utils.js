const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const TIPOS_PAGAMENTO = {
  pix_qr_code: { metodo: "pix", taxaPercentual: 0 },
  pix_copia_cola: { metodo: "pix", taxaPercentual: 0 },
  cartao_credito: { metodo: "cartao", taxaPercentual: 0.0399 },
};

const STATUS_MAP = {
  approved: "confirmado",
  rejected: "recusado",
  cancelled: "recusado",
  refunded: "recusado",
  charged_back: "recusado",
  pending: "pendente_confirmacao",
  in_process: "pendente_confirmacao",
  in_mediation: "pendente_confirmacao",
};

function normalizarValor(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return NaN;
  return Math.round(numero * 100) / 100;
}

function validarCriacaoPreferencia(payload) {
  const erros = [];
  const valor = normalizarValor(payload && payload.valor);
  const tipo = payload && payload.tipo;

  if (!Number.isFinite(valor) || valor <= 0) {
    erros.push("valor deve ser maior que zero");
  }

  if (!TIPOS_PAGAMENTO[tipo]) {
    erros.push("tipo de pagamento inválido");
  }

  if (payload && payload.descricao && String(payload.descricao).trim().length > 120) {
    erros.push("descricao deve ter no máximo 120 caracteres");
  }

  return {
    valido: erros.length === 0,
    erros,
    valor,
  };
}

function montarPreferenceBody({ valor, tipo, descricao, usuario, notificationUrl, externalReference }) {
  const body = {
    items: [
      {
        id: "contribuicao-online",
        title: descricao || "Contribuição CongregaFiel",
        quantity: 1,
        currency_id: "BRL",
        unit_price: normalizarValor(valor),
      },
    ],
    payer: {
      email: usuario && usuario.email ? usuario.email : undefined,
    },
    external_reference: externalReference || (usuario ? usuario.id : undefined),
    statement_descriptor: "CONGREGAFIEL",
    notification_url: notificationUrl,
    metadata: {
      usuario_id: usuario ? usuario.id : undefined,
      tipo_pagamento: tipo,
    },
  };

  if (tipo === "cartao_credito") {
    body.payment_methods = {
      excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
    };
  } else {
    body.payment_methods = {
      default_payment_method_id: "pix",
      installments: 1,
      excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }],
    };
  }

  return body;
}

function extrairDadosCheckout(preference, tipo, valor) {
  const dados = {
    preference_id: preference.id,
    tipo,
    valor: normalizarValor(valor),
  };

  const qr = preference.point_of_interaction
    && preference.point_of_interaction.transaction_data;

  if (tipo !== "cartao_credito") {
    dados.qr_code = qr && qr.qr_code_base64 ? qr.qr_code_base64 : null;
    dados.qr_data = qr && qr.qr_code ? qr.qr_code : null;
    if (!dados.qr_data && preference.init_point) {
      dados.checkout_url = preference.init_point;
    }
  } else {
    dados.checkout_url = preference.sandbox_init_point || preference.init_point || null;
  }

  return dados;
}

function resolverUsuarioAutenticado(req) {
  if (req.usuario && req.usuario.id) {
    return req.usuario;
  }

  const usuarioHeader = req.headers["x-usuario-id"];
  if (usuarioHeader) {
    return {
      id: usuarioHeader,
      email: req.headers["x-usuario-email"] || null,
      role: req.headers["x-usuario-role"] || null,
    };
  }

  const secret = process.env.SUPABASE_JWT_SECRET;
  const authHeader = req.headers.authorization;
  if (!secret || !authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
    return {
      id: payload.sub,
      email: payload.email || null,
      role: payload.role || null,
    };
  } catch (erro) {
    return null;
  }
}

function exigirUsuario(req, res, next) {
  const usuario = resolverUsuarioAutenticado(req);
  if (!usuario || !usuario.id) {
    return res.status(401).json({ erro: "Usuário não autenticado" });
  }

  req.usuario = usuario;
  return next();
}

function validarAssinaturaMercadoPago(req, tokenEsperado) {
  if (!tokenEsperado) {
    return true;
  }

  const assinatura = req.headers["x-webhook-token"] || req.headers["x-signature"];
  if (!assinatura) {
    return false;
  }

  const assinaturaTexto = Array.isArray(assinatura) ? assinatura[0] : assinatura;
  if (assinaturaTexto === tokenEsperado) {
    return true;
  }

  const hmac = crypto
    .createHmac("sha256", tokenEsperado)
    .update(JSON.stringify(req.body || {}))
    .digest("hex");

  return assinaturaTexto.includes(hmac) || assinaturaTexto.includes(tokenEsperado);
}

function mapearStatusMercadoPago(status) {
  return STATUS_MAP[status] || "pendente";
}

function obterMetodoContribuicao(tipo) {
  return TIPOS_PAGAMENTO[tipo] ? TIPOS_PAGAMENTO[tipo].metodo : "outro";
}

function calcularTaxa(valor, tipo) {
  const configuracao = TIPOS_PAGAMENTO[tipo];
  if (!configuracao) return 0;
  return Math.round(normalizarValor(valor) * configuracao.taxaPercentual * 100) / 100;
}

function resumirPagamentos(pagamentos, periodo) {
  const totais = pagamentos.reduce((acc, pagamento) => {
    const valor = normalizarValor(pagamento.valor);
    const status = pagamento.status || "pendente";

    if (status === "confirmado") acc.total_recebido += valor;
    if (status === "pendente" || status === "pendente_confirmacao") acc.total_pendente += valor;
    if (status === "recusado") acc.total_recusado += valor;

    if (obterMetodoContribuicao(pagamento.tipo) === "pix") {
      acc.total_pix += status === "confirmado" ? valor : 0;
    }

    if (obterMetodoContribuicao(pagamento.tipo) === "cartao") {
      acc.total_cartao += status === "confirmado" ? valor : 0;
      acc.taxa_cobrada += status === "confirmado" ? calcularTaxa(valor, pagamento.tipo) : 0;
    }

    return acc;
  }, {
    total_recebido: 0,
    total_pendente: 0,
    total_recusado: 0,
    total_pix: 0,
    total_cartao: 0,
    taxa_cobrada: 0,
  });

  totais.total_recebido = normalizarValor(totais.total_recebido);
  totais.total_pendente = normalizarValor(totais.total_pendente);
  totais.total_recusado = normalizarValor(totais.total_recusado);
  totais.total_pix = normalizarValor(totais.total_pix);
  totais.total_cartao = normalizarValor(totais.total_cartao);
  totais.taxa_cobrada = normalizarValor(totais.taxa_cobrada);

  return {
    periodo,
    ...totais,
    liquido_recebido: normalizarValor(totais.total_recebido - totais.taxa_cobrada),
    pagamentos,
  };
}

async function registrarPagamentoAberto(supabase, pagamento) {
  if (!supabase) {
    return pagamento;
  }

  const { data, error } = await supabase
    .from("pagamentos_abertos")
    .insert(pagamento)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function atualizarPagamentoAberto(supabase, referencia, payload) {
  if (!supabase) {
    return payload;
  }

  let query = supabase
    .from("pagamentos_abertos")
    .update({
      ...payload,
      atualizado_em: new Date().toISOString(),
    });

  query = referencia.paymentId
    ? query.eq("mercado_pago_payment_id", referencia.paymentId)
    : query.eq("mercado_pago_preference_id", referencia.preferenceId);

  const { data, error } = await query.select();
  if (error) throw new Error(error.message);
  return data;
}

async function inserirContribuicao(supabase, payload) {
  if (!supabase) {
    return payload;
  }

  const { data, error } = await supabase
    .from("contribuicoes")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function inserirLogPagamento(supabase, payload) {
  if (!supabase) {
    return payload;
  }

  const { error } = await supabase
    .from("pagamentos_log")
    .insert(payload);

  if (error) throw new Error(error.message);
  return payload;
}

async function enviarNotificacaoPagamento(urlBase, tokenInterno, body, fetchImpl) {
  if (!urlBase || !fetchImpl) {
    return null;
  }

  return fetchImpl(`${urlBase}/api/notificacoes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(tokenInterno ? { Authorization: `Bearer ${tokenInterno}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function processarWebhookPagamento({
  payment,
  supabase,
  notificationServiceUrl,
  internalServiceToken,
  fetchImpl,
}) {
  const tipo = payment.metadata && payment.metadata.tipo_pagamento
    ? payment.metadata.tipo_pagamento
    : (payment.payment_method_id === "pix" ? "pix_qr_code" : "cartao_credito");
  const novoStatus = mapearStatusMercadoPago(payment.status);

  await atualizarPagamentoAberto(supabase, {
    paymentId: String(payment.id),
    preferenceId: payment.order && payment.order.id ? String(payment.order.id) : null,
  }, {
    status: novoStatus,
    mercado_pago_payment_id: String(payment.id),
  });

  if (novoStatus === "confirmado") {
    await inserirContribuicao(supabase, {
      usuario_id: payment.external_reference || (payment.metadata && payment.metadata.usuario_id) || null,
      valor: normalizarValor(payment.transaction_amount),
      tipo: obterMetodoContribuicao(tipo),
      metodo_pagamento: "mercado_pago",
      referencia_externa: String(payment.id),
      status: "confirmado",
      recebido_em: new Date().toISOString(),
      criado_em: new Date().toISOString(),
    });
  }

  await inserirLogPagamento(supabase, {
    usuario_id: payment.external_reference || (payment.metadata && payment.metadata.usuario_id) || null,
    valor: normalizarValor(payment.transaction_amount),
    tipo,
    metodo_pagamento: "mercado_pago",
    status: novoStatus,
    referencia_mp: String(payment.id),
    erro_msg: novoStatus === "recusado" ? payment.status_detail || null : null,
    criado_em: new Date().toISOString(),
  });

  if (novoStatus === "confirmado" || novoStatus === "recusado") {
    const corpo = novoStatus === "confirmado"
      ? `Sua contribuição de R$ ${normalizarValor(payment.transaction_amount).toFixed(2)} foi confirmada.`
      : "Seu pagamento foi recusado. Tente novamente.";

    await enviarNotificacaoPagamento(
      notificationServiceUrl,
      internalServiceToken,
      {
        usuario_id: payment.external_reference || (payment.metadata && payment.metadata.usuario_id) || null,
        titulo: novoStatus === "confirmado" ? "Pagamento confirmado" : "Pagamento recusado",
        corpo,
        tipo: "payment",
        dados_extra: {
          referencia_externa: String(payment.id),
          status: novoStatus,
        },
      },
      fetchImpl
    );
  }

  return {
    status: novoStatus,
    tipo,
  };
}

module.exports = {
  TIPOS_PAGAMENTO,
  exigirUsuario,
  extrairDadosCheckout,
  mapearStatusMercadoPago,
  montarPreferenceBody,
  normalizarValor,
  obterMetodoContribuicao,
  processarWebhookPagamento,
  registrarPagamentoAberto,
  resumirPagamentos,
  resolverUsuarioAutenticado,
  validarAssinaturaMercadoPago,
  validarCriacaoPreferencia,
};
