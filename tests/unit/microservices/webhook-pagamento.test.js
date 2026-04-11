const {
  mapearStatusMercadoPago,
  processarWebhookPagamento,
  resumirPagamentos,
  validarAssinaturaMercadoPago,
} = require("../../../microservices/services/payment-service/pagamento-utils");

function criarSupabaseWebhookMock() {
  const updateSelect = vi.fn().mockResolvedValue({ data: [{ id: "aberto-1" }], error: null });
  const updateEq = vi.fn(() => ({ select: updateSelect }));
  const update = vi.fn(() => ({ eq: updateEq }));

  const contribuicaoSingle = vi.fn().mockResolvedValue({ data: { id: "contrib-1" }, error: null });
  const contribuicaoSelect = vi.fn(() => ({ single: contribuicaoSingle }));
  const contribuicaoInsert = vi.fn(() => ({ select: contribuicaoSelect }));

  const logInsert = vi.fn().mockResolvedValue({ error: null });

  const tabelas = {
    pagamentos_abertos: { update },
    contribuicoes: { insert: contribuicaoInsert },
    pagamentos_log: { insert: logInsert },
  };

  return {
    supabase: {
      from: vi.fn((tabela) => tabelas[tabela]),
    },
    mocks: {
      update,
      updateEq,
      updateSelect,
      contribuicaoInsert,
      contribuicaoSelect,
      contribuicaoSingle,
      logInsert,
    },
  };
}

describe("payment-service — webhook Mercado Pago", () => {
  it("T1: valida assinatura exata do webhook", () => {
    const req = {
      headers: { "x-webhook-token": "segredo-webhook" },
      body: { id: "123" },
    };

    expect(validarAssinaturaMercadoPago(req, "segredo-webhook")).toBe(true);
  });

  it("T2: rejeita assinatura inválida", () => {
    const req = {
      headers: { "x-signature": "sha256=errada" },
      body: { id: "123" },
    };

    expect(validarAssinaturaMercadoPago(req, "segredo-webhook")).toBe(false);
  });

  it("T3: status approved gera contribuição e notificação", async () => {
    const { supabase, mocks } = criarSupabaseWebhookMock();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const resultado = await processarWebhookPagamento({
      payment: {
        id: "mp-1",
        status: "approved",
        transaction_amount: 120.5,
        external_reference: "user-123",
        payment_method_id: "pix",
        metadata: { tipo_pagamento: "pix_qr_code" },
      },
      supabase,
      notificationServiceUrl: "http://localhost:4009",
      internalServiceToken: "interno",
      fetchImpl,
    });

    expect(resultado.status).toBe("confirmado");
    expect(mocks.contribuicaoInsert).toHaveBeenCalledWith(expect.objectContaining({
      usuario_id: "user-123",
      metodo_pagamento: "mercado_pago",
      referencia_externa: "mp-1",
      status: "confirmado",
    }));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("T4: status rejected não gera contribuição e registra log", async () => {
    const { supabase, mocks } = criarSupabaseWebhookMock();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const resultado = await processarWebhookPagamento({
      payment: {
        id: "mp-2",
        status: "rejected",
        status_detail: "cc_rejected_bad_filled_card_number",
        transaction_amount: 90,
        external_reference: "user-456",
        payment_method_id: "master",
      },
      supabase,
      notificationServiceUrl: "http://localhost:4009",
      internalServiceToken: "interno",
      fetchImpl,
    });

    expect(resultado.status).toBe("recusado");
    expect(mocks.contribuicaoInsert).not.toHaveBeenCalled();
    expect(mocks.logInsert).toHaveBeenCalledWith(expect.objectContaining({
      status: "recusado",
      referencia_mp: "mp-2",
    }));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("T5: status pending vira pendente_confirmacao", () => {
    expect(mapearStatusMercadoPago("pending")).toBe("pendente_confirmacao");
    expect(mapearStatusMercadoPago("in_process")).toBe("pendente_confirmacao");
  });

  it("T6: resumo agrega totais por status e método", () => {
    const resumo = resumirPagamentos([
      { valor: 100, tipo: "pix_qr_code", status: "confirmado" },
      { valor: 200, tipo: "cartao_credito", status: "confirmado" },
      { valor: 80, tipo: "cartao_credito", status: "recusado" },
      { valor: 50, tipo: "pix_qr_code", status: "pendente_confirmacao" },
    ], "2026-04");

    expect(resumo.total_recebido).toBe(300);
    expect(resumo.total_pendente).toBe(50);
    expect(resumo.total_recusado).toBe(80);
    expect(resumo.total_pix).toBe(100);
    expect(resumo.total_cartao).toBe(200);
    expect(resumo.taxa_cobrada).toBeCloseTo(7.98, 2);
    expect(resumo.liquido_recebido).toBeCloseTo(292.02, 2);
  });
});
